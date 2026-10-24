import { prisma } from "../config/prisma.js";

export interface NeonUserRecord {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
    createdAt?: Date | null;
}

export const findNeonUsers = async (filter:{id?: string; email?: string}):Promise<NeonUserRecord | null> =>{
    try {
        if(filter.id){
            const rows = await prisma.$queryRaw<NeonUserRecord[]>`
            SELECT id, name, email, role, "createdAt" as "createdAt"
            FROM neon_auth.user
            WHERE id = ${filter.id}::uuid
            LIMIT 1
            `;

            return rows[0] || null;
        }
        if(filter.email) {
            const rows = await prisma.$queryRaw<NeonUserRecord[]>`
            SELECT id, name, email, role, "createdAt" as "createdAt"
            FROM neon_auth.user
            WHERE LOWER(email) = ${filter.email.trim().toLocaleLowerCase()}
            LIMIT 1
            `;

            return rows[0] || null;
        }
    } catch (err) {
        console.error(err)
    }
    return null;
}


export const updateNeonUserRole = async (userId: string, role:string):Promise<void> => {
    try {
        await prisma.$executeRaw`
        UPDATE neon_auth.user
        SET role = ${role}, "updateAt" = NOW()
        WHERE id = ${userId}::uu AND (role IS NULL OR role != 'admin')
        `;
    } catch (error) {
        console.error(error)
    }
}


export const findNeonUserByIds = async (ids:string[]):Promise<Record<string,NeonUserRecord>> => {
    if (!ids || ids.length === 0) return {};
    try {
        const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
        const rows = await prisma.$queryRaw<NeonUserRecord[]>`
        SELECT id, name, email, role, "createdAt" as "createdAt"
        FROM neon_auth.user
        Where id::text = ANY(${uniqueIds})
        `;

        const map: Record<string, NeonUserRecord> = {}
        for (const row of rows) {
            map[row.id] = row;
        }
        return map
    } catch (error) {
        console.error(error)
        return {}
    }
}

export const findNeonMerchants = async ():Promise<NeonUserRecord[]> => {
    try {
        return await prisma.$queryRaw<NeonUserRecord[]>`
        SELECT id, name, email, role, "createdAt" as "createdAt"
        FROM neon_auth.user
        Where role = 'merchant'
        ORDER BY "createdAt" DESC
        `
    } catch (error) {
        console.error(error)
        return [];
    }
}

export const countNeonMerchants = async ():Promise<number> => {
    try {
        const rows = await prisma.$queryRaw<Array<{count: BigInt}>>`
        SELECT COUNT(*) as count
        FROM neon_auth.user
        WHERE role = 'merchant
        `

        return Number(rows[0]?.count || 0)
    } catch (error) {
        console.error(error)
        return 0;
    }
}