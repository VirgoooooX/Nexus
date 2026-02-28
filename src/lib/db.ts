import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    console.log('[DEBUG] Initializing Prisma with DATABASE_URL:', process.env.DATABASE_URL);
    const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

    // Safety check: ensure dbUrl is a string
    if (typeof dbUrl !== 'string') {
        throw new Error(`[ERROR] DATABASE_URL is not a string: ${typeof dbUrl}`);
    }

    // PrismaBetterSqlite3 expects a config object: { url: string }
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });

    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
