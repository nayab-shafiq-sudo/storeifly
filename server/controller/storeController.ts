import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";
import { findNeonMerchants, findNeonUserByIds, updateNeonUserRole } from "../services/neonUsers.js";

// HELPE TO GENRATE CLEAN SLUGS
const generateSlug = (text:string) => text.toString().toLowerCase().trim().replace(/\s+/g,"-").replace(/[^\w\-]+/g, "").replace(/--+/g, "-");

// CREATE A NEW STORE FOR AUTHENTICATED MERCHANT
export const createStore = async (req:AuthenticatedRequest, res:Response): Promise<void> => {
    try {
        const merchantId = req.user?.id;
        if (!merchantId) {
            res.status(401).json({ success: false, message: "Unauthorized: Please log in to create a store"})
            return;
        }

        // platform Admin accounts cannot create store or become merchants
        if (req.user?.role === "admin") {
            res.status(403).json({ success: false, message: "Forbiden: Platform adnim accounts cannot create store or become merchants"})
            return;
        }

        // check if mechant already has a store
        const existingStore = await prisma.stores.findFirst({
            where: {merchant_id: merchantId}
        })

        if (existingStore) {
            res.status(400).json({ success: false, message: "You already have an existing store", store: existingStore })
            return;
        }

        const { name, slug, description, logo_url, banner_url, currency = "USD", shipping_fee = 0, free_shipping_threshold = 0, hero_style = "hero1", accent_color = "#059669"} = req.body;

        if (!name) {
            res.status(400).json({ success: false, message: "store name is required"})
            return;
        }

        const finalSlug = slug ? generateSlug(slug) : generateSlug(name);

        // check if slug is taken
        const slugCheck = await prisma.stores.findUnique({
            where: {slug: finalSlug},
            select: {id: true}
        })
        if (slugCheck) {
            res.status(400).json({ success: false, message: "Store url slug is already taken. Please choose another"})
            return;
        }

        // crate store
        const newStore = await prisma.stores.create({
            data: {
                merchant_id: merchantId,
                name: name.trim(),
                slug: finalSlug,
                description: description || "",
                logo_url: logo_url || "",
                banner_url: banner_url || "",
                currency,
                status: "active",
                shipping_fee: Number(shipping_fee) || 0,
                free_shipping_threshold: Number(free_shipping_threshold) || 0,
                hero_style: ["hero1", "hero2", "hero3", "hero4"].includes(hero_style) ? hero_style : "hero1" ,
                accent_color: accent_color?.trim() || "#059669"
            }
        })

        // update user role to merchant
        await updateNeonUserRole(merchantId, "merchant");

        res.status(201).json({
            success: true,
            message: "store created successfully",
            store: newStore,
        })

    } catch (error:any) {
        console.error("createdStore error:", error)
        res.status(500).json({ success: false, message: "Failed to create store" })
    }
}

// GET AUTHENTICATED MERCHANT"S STORE
export const getMyStore = async (req:AuthenticatedRequest, res:Response): Promise<void> => {
    try {
        if (req.user?.role === "admin"){
            res.status(403).json({ success:false, message: "Forbidden: Platform admin do not manage merchant stores"})
            return;
        }
        const merchantId = req.user?.id;
        const store = await prisma.stores.findFirst({
            where: {merchant_id: merchantId}
        })

        res.json({ success: true, store: store || null})
    } catch (error:any) {
        console.error("getMyStore error:", error)
        res.status(500).json({ success: false, message: "Failed to get store" })
    }
}

// ONBOARD OR ELEVAE USER TO MERCHANT ROLE
export const onboardMerchant = async (req:AuthenticatedRequest, res:Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
           res.status(401).json({ success: false, message: "Unauthorized" })
           return;
        }
        // platform amdin accounts cannot become merchants
        if (req.user?.role === "admin") {
            res.status(403).json({ success: false, message: "Forbidden: Platform admin accounts cannot become merchants" })
            return;
        }
        await updateNeonUserRole(userId, "merchant");
        const store = await prisma.stores.findFirst({
            where: { merchant_id: userId}
        })

        res.json({
            success: true,
            role: "merchant",
            store: store || null,
        })
    } catch (error:any) {
        console.error("onBoardMerchat error:", error)
        res.status(500).json({ success: false, message: "Failed to onboard merchant" })
    }
}

// UPDATE MERCHANT'S STORE SETTING
export const updateMyStore = async (req:AuthenticatedRequest, res:Response):Promise<void> => {
    try {
        if (req.user?.role === "admin") {
            res.status(403).json({ success: false, message: "Forbidden: Platform admin do not manage merchants store"})
            return;
        }

        const merchantId = req.user?.id;
        const store = await prisma.stores.findFirst({
            where: { merchant_id: merchantId}
        })

        if (!store) {
            res.status(404).json({ success: false, message: "Store not found" })
            return
        }

        const { name, description, logo_url, banner_url, currency, shipping_fee, free_shipping_threshold, hero_style, accent_color} = req.body;
        const VALID_HEROS = ["hero1", "hero2", "hero3", "hero4"];

        const update = await prisma.stores.update({
            where: {id: store.id},
            data: {
            ...Object.fromEntries(
                Object.entries({name, description, logo_url, banner_url, currency}).filter(([, v]) => v !== undefined),),
                ...(shipping_fee !== undefined && {shipping_fee: Number(shipping_fee)}),
                ...(free_shipping_threshold !== undefined && { free_shipping_threshold: Number(free_shipping_threshold)}),
                ...(hero_style && VALID_HEROS.includes(hero_style) && {hero_style}),
                ...(accent_color !== undefined && {accent_color: String(accent_color).trim() || "#059669"}),
            }
        })

        res.json({ success: true, message: "Store update successfully", store: update })
    } catch (error:any) {
        console.error("updateMyStore error:", error)
        res.status(500).json({ success: false, message: "Failed to update my Store" })
    }
}

// PLATFORM ADMIN: GET ALL STORES WITH STATS
export const getAllStores = async (req:AuthenticatedRequest, res:Response): Promise<void> => {
    try {
        const storeList = await prisma.stores.findMany({
            include: {
                _count: {select: {products: true, orders: true}},
                orders: {where: {payment_status: "paid"}, select: { total: true}, }
            },
            orderBy: { created_at: "desc" }
        })
        const merchantIds = storeList.map((S)=> S.merchant_id).filter(Boolean) as string[];
        const userMap = await findNeonUserByIds(merchantIds);

        const stores = storeList.map((s)=> {
            const total_revenue = s.orders.reduce((sum, o)=> sum + Number(o.total), 0)
            const merchant = s.merchant_id ? userMap[s.merchant_id] : null;
            const {orders, _count, ...rest} = s;
            return {
                ...rest,
                merchant_name: merchant?.name || "unkonwn",
                merchant_email: merchant?.email || "unknown",
                product_count: _count.products,
                order_count: _count.orders,
                total_revenue,
            }
        })
        res.json({ success: true, stores })

    } catch (error:any) {
        console.error("getAllStores error:", error)
        res.status(500).json({ success: false, message: "Failed to get all Store" })
    }
}

// PLATFORM ADMIN: GET ALL MERCHANTS
export const getAllMerchants = async (_req:AuthenticatedRequest, res:Response): Promise<void> => {
    try {
        const merchantsList = await findNeonMerchants();
        const stores = await prisma.stores.findMany({
            where: {merchant_id: {in: merchantsList.map((m)=> m.id)}},
            select: {id: true, merchant_id: true, name: true, slug: true, status: true }
        })
        const storeMap = new Map<string, (typeof stores)[0]>();

        for (const store of stores) {
            if (store.merchant_id) storeMap.set(store.merchant_id, store);
        }

        const merchants = merchantsList.map((u)=> {
            const store = storeMap.get(u.id) ?? null;
            return {
                ...u,
                store_id: store?.id ?? null,
                store_name: store?.name ?? null,
                store_slug: store?.slug ?? null,
                store_status: store?.status ?? null,
            }
        })

        res.json({ success: true, merchants })
    } catch (error:any) {
        console.error("getAllMerchants error:", error)
        res.status(500).json({ success: false, message: "Failed to get all merchants" })
    }
}

// PLATFORM ADMIN: TOGGLE STORE STATUS (ACTIVE / SUSPENDED)
export const toggleStoreStatus = async (req:AuthenticatedRequest, res:Response): Promise<void> => {
    try {
        const { storeId } = req.params;
        const store = await prisma.stores.findUnique({
            where: {id: Number(storeId) },
        });

        if (!store) {
            res.status(404).json({ success: false, message: "Store not found"})
            return;
        }

        const newStatus = store.status === "active" ? "suspended" : "active"
        const updated = await prisma.stores.update({
            where: {id: Number(storeId)},
            data: {status: newStatus}
        })

        res.json({
            success: true,
            message: `Store has been ${newStatus === "active" ? "activated": "suspended" }`,
            store: updated,
        })
    } catch (error:any) {
        console.error("toggleStoreStatus error:", error)
        res.status(500).json({ success: false, message: "Failed to toggle status" })
    }
}