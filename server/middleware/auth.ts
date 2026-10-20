import { NextFunction, Request } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { findNeonUsers } from "../services/neonUsers.js";
import { prisma } from "../config/prisma.js";
import { Response } from "express";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: "admin" | "merchant" | "customer";
    store_id?: number | null;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}

const NEON_AUTH_BASE_UR = process.env.NEON_AUTH_BASE_UR;
const NEON_AUTH_JWSK_URL = process.env.NEON_AUTH_JWSK_URL;

let neonJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let neonIssuer = "";

try {
    if (NEON_AUTH_JWSK_URL){
        neonJWKS = createRemoteJWKSet(new URL(NEON_AUTH_JWSK_URL))
    }
    if (NEON_AUTH_BASE_UR){
        neonIssuer = new URL(NEON_AUTH_BASE_UR).origin;
    }
} catch (error) {
    console.warn("Neon Auth JWSK initialization warnimg:", error);
}

// VERIFIES AUTHENTICATION TOKEN USING NEON AUTH JWKS (JOSE JWTVERIFY)
export const verifyAuthToken = async (token: string): Promise<AuthUser | null> => {
    if(!token || !neonJWKS || !neonIssuer) return null;

    try {
        const {payload} = await jwtVerify(token, neonJWKS, {issuer: neonIssuer})
        if (!payload || (!payload.sub && !payload.email)){
            return null;
        }
        const userEmail = String(payload.email || "").toLowerCase();
        const userId = String(payload.sub || payload.id || "");

        const u = await findNeonUsers({
            ...(userId? {id: userId} : {}),
            ...(userEmail? {email: userEmail} : {}),
        });

        const efectiveId = u?.id || userId;
        const efectiveName = u?.name || String(payload.name || userEmail.split("@")[0]);
        const efectiveEmail = u?.email || userEmail;
        const store = await prisma.stores.findFirst({where: {merchant_id: efectiveId}})

            let role: "admin" | "merchant" | "customer" = "customer";
            if (u?.role === "admin" || payload.role === "admin" ){
                role = "admin";
            } else if (store || u?.role === "merchant" || payload.role === "merchant") {
                role = "merchant";
            } 
        
            return {
                id: efectiveId,
                name: efectiveName,
                email: efectiveEmail,
                role,
                store_id: role === "admin" ? null : store?.id || null,
            }

    } catch (error) {
        return null;
    }
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")){
        res.status(401).json({success: false, message: "Unauthorized: No token provided"});
        return;
    }

    const token = authHeader.split(" ")[1];
    const user = await verifyAuthToken(token);

    if (!user){
        res.status(401).json({success: false, message: "Unauthorized: Invalid or expire token"});
        return;
    }

    req.user = user;
    next()
}


export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")){
        const token = authHeader.split(" ")[1]
        const user = await verifyAuthToken(token)
        if (user) {
            req.user = user
        }
    }
    next()
}


export const requireRole = (roles: Array<"admin" | "merchant" | "customer">) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void=> {
        if (!req.user || !roles.includes(req.user.role)){
            res.status(403).json({success: false, message: "Forbidden: Access denied"})
            return;
        }
        next()
    }
}