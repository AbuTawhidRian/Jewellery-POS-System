import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const branches = await prisma.branch.findMany({ where: { name: { contains: 'alsema', mode: 'insensitive' } } });
  console.log('Branches:', branches);
  
  const types = await prisma.itemType.findMany({ where: { name: { contains: 'alsema', mode: 'insensitive' } } });
  console.log('ItemTypes:', types);

  const items = await prisma.item.findMany({ where: { type: { contains: 'alsema', mode: 'insensitive' } }, take: 1 });
  console.log('Items:', items);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
