const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.systemConfig.deleteMany({ where: { key: 'PROMPT_CONFIG' } });
  console.log('Cleared prompt config');
}
main().catch(console.error).finally(() => prisma.$disconnect());
