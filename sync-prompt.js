const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.systemConfig.deleteMany({
        where: { key: 'DAILY_NEWS_PROMPT_TEMPLATE' }
    });
    console.log('Database prompt config deleted, will fallback to new default.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
