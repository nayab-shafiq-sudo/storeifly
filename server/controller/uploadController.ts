import { Request, Response  } from "express";
import cloudinary from "../config/cloudinary.js";


export const optimizeDeliveryUrl = (url:string): string => {
    if(!url || typeof url !== "string" || url.includes('.svg')) return url;
    return url.replace(/\/image\/upload\/(?!f_auto,q_auto\/)/, "/image/upload/f_auto,q_auto/")
}

export function applyCloudinaryTransform(
    url: string,
    action: "recolor" | "bg-removal",
    options: { prompt?: string; toColor?:string; multiple?:boolean } = {},
):string {
    const transform = action === "bg-removal"
    ? "e_background_removal,f_auto,q_auto"
    : `e_gen_recolor:prompt_${encodeURIComponent(options.prompt || "object")};to-color_${(options.toColor || "red").replace("#", "")}${options.multiple ? ";multiple_true" : ""}, f_auto,q_auto`;

    return url.replace("/image/upload/", `/image/upload/${transform}/`)
}

export const uploadToCloudinary = async (
    fileBuffer: Buffer,
    folder: string = 'storeifly',
    options: {mimetype?: string; filename?: string} = {},):Promise<string>=>{
        return new Promise((resolve, reject)=>{
            const isSvg = options.mimetype === "image/svg+xml" || options.filename?.endsWith(".svg");
            const uploadStream = cloudinary.uploader.upload_stream(
                {folder, resource_type: 'image', ...(isSvg ? {format: "svg"} : {})},
                (error, result) => {
                    if(error || !result) reject(error || new Error("Upload failed"));
                    else resolve(isSvg ? result.secure_url : optimizeDeliveryUrl(result.secure_url))
                }
            );
            uploadStream.end(fileBuffer)
        })
    }
// UPLOAD SINGLE IMAGE 
export const uploadSingle = async (req:Request, res:Response):Promise<void> => {
    try {
        if (!req.file){
            res.status(400).json({success: false, message: "No image file provided"})
            return;
        }

        const url = await uploadToCloudinary(req.file.buffer, "storeifly", {
            mimetype: req.file.mimetype,
            filename: req.file.originalname,
        }).catch(()=> `data:${req.file!.mimetype};base64,${req.file!.buffer.toString("base64")}`)

        res.json({success: true, url})
    } catch (error:any) {
        console.log(error?.message)
        res.status(500).json({success: false, message: "Image upload failed"})
    }
}
// UPLOAD MULTIPLE IMAGES IN PARALLEL
export const uploadMultiple = async (req:Request, res:Response):Promise<void> => {
    try {
        const files = (req.files as Express.Multer.File[] || [])
        if (!files.length){
            res.status(400).json({success: false, message: "No image file provided"})
            return;
        }

        const urls = await Promise.all(
            files.map((file)=> uploadToCloudinary(file.buffer, "storeifly", {
                mimetype: file.mimetype,
                filename: file.originalname,
        }).catch(()=> `data:${file!.mimetype};base64,${file!.buffer.toString("base64")}`))
        ) 

        res.json({success: true, urls})
    } catch (error:any) {
        console.log(error?.message)
        res.status(500).json({success: false, message: "Image upload failed"})
    }
}
// AI TRANSFORMATION (GENRATE, RECOLOR & BACKGROUND REMOVAL)
export const aiTransform = async (req:Request, res:Response):Promise<void> => {
    try {
        const {imageUrl, action, prompt, toColor, multiple} = req.body;

        if (!imageUrl) {
            res.status(400).json({success: false, message: "validate imageurl is required"})
            return;
        }

        let baseCloudinaryUrl = imageUrl;
        const cloudName = cloudinary.config().cloud_name;

        // ensure image is hosted on cloudinary
        if (!cloudName || !imageUrl.includes(`res.cloudinary.com/${cloudName}/`)) {
            const uploadResult = await cloudinary.uploader.upload(imageUrl, {
                folder: "storeifly/products",
                resource_type: "image"
            });
            baseCloudinaryUrl = uploadResult.secure_url;
        }

        const transformUrl = applyCloudinaryTransform(baseCloudinaryUrl, action, {prompt, toColor, multiple: Boolean(multiple)})

        res.json({success: true, url: transformUrl, originalUrl: imageUrl, action})

    } catch (error: any) {
        console.log(error?.message)
        res.status(500).json({success: false, message: "Image transformation failed"})
    }
}

const ensureCloudinaryUrl = async (url:string, folder = "storeifly/tryon") :Promise<string> =>{
    const  cloudName = cloudinary.config().cloud_name;
    if (cloudName && url.includes(`res.cloudinary.com/${cloudName}/`)) {
        return url;
    }
    
    const res = await cloudinary.uploader.upload(url, {folder, resource_type: "image"}).catch(()=> null)
    return res?.secure_url || url;

}


export interface GenrateOnModelParams{
    prompt: string;
    productImageUrl: string;
    modelImageUrl: string;
    targetPublicId?: string;
    preference?: string
}

export interface GenrateOnModelResult{
    secureUrl: string;
    publicId: string;
    model?: string;
    limits?: any;
}

export const genrateOnModelImage = async (params: GenrateOnModelParams):Promise<GenrateOnModelResult> => {
    const {cloud_name, api_key, api_secret} = cloudinary.config();
    if (!cloud_name || !api_key || !api_secret){
        throw new Error("cloudinary instance credentials are not configures")
    }

    const targetPublicId = params.targetPublicId?.trim() || `tryOn/model_${Date.now()}`;
    const payload = {
        prompt: params.prompt,
        refrence_images: [
            {source_type: "url", url: params.modelImageUrl},
            {source_type: "url", url: params.productImageUrl}
        ],
        model: {mode: "auto", ...(params.preference ? {prefrence: params.preference }: {})},
        target: {target_type: "managed_asset", public_id: targetPublicId}
    };
    const response = await fetch(`https://api.cloudinary.com/v2/generate/${cloud_name}/image_to_image`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${api_key}:${api_secret}`).toString("base64")}`,
            "content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data: any = await response.json().catch(()=> null);

    if(!response.ok || !data) {
        const err: any = new Error(data?.error?.message || data?.message || `cloudinary Api error (${response.status})`);
        err.status = response.status;
        err.details = data?.error;
        throw err;
    }
    const asset = data?.data?.assets?.[0] || data?.data?.result?.assets?.[0];
    const rawUrl = asset?.storage?.secure_url || asset?.secure_url || data?.secure_url;
    if (!rawUrl) throw new Error("No image URL returned from cloudinary genration");

    return{
        secureUrl: optimizeDeliveryUrl(rawUrl),
        publicId: asset?.storage?.public_id || targetPublicId,
        model: asset?.model,
        limits: data?.limits
    }
}
// CONTROLLER ENDPOINT FOR ON-MODEL CATLOG PHOTOGRAPHY/VIRTUAL TRY-ON
export const aiOnModel = async (req:Request, res:Response):Promise<void> => {
    try {
        const {productImageUrl, modelImageUrl, garmentType, pose, background, customPrompt, preference, targetPublicId } = req.body;

        if (!productImageUrl) {
            res.status(400).json({success: false, message: "productImageUrl is required"})
            return;
        }

        const defaultModel = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"

        const [modelUrl, productUrl] = await Promise.all([
            ensureCloudinaryUrl(modelImageUrl || defaultModel, "storeifly/models"),
            ensureCloudinaryUrl(productImageUrl, "storeifly/products")
        ]);

        const prompt = customPrompt?.trim()
        ? customPrompt.includes("[1]") && customPrompt.includes("[2]") 
            ? customPrompt.trim()
            : `Dress person in [1] in garment from [2], ${customPrompt.trim()}, photorealistic`
        : `Dress person in [1] in ${garmentType || "garment"} from [2], pose ${pose || "confident standing position"}, background ${background || "clean white"}, photorealistic.`

        const result = await genrateOnModelImage({
            prompt,
            modelImageUrl: modelUrl,
            productImageUrl: productUrl,
            targetPublicId,
            preference,
        })

        res.json({
            success: true,
            url: result.secureUrl,
            publicId: result.model,
            prompt,
            modelUrl,
            productUrl,
            lismits: result.limits,
        })

    } catch (error: any) {
        console.log(error?.message)
        res.status(500).json({success: false, message: "Failed to genrate onModel catalog photo"})
    }
}