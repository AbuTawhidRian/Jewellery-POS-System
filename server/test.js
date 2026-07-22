require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.item.findFirst({ where: { barcode: 'MJ731712608' } });
  console.log(JSON.stringify(item, null, 2));
}

main().finally(() => prisma.$disconnect());
