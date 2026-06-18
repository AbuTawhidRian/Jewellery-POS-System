import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeSales() {
  try {
    console.log('Deleting all sales...');
    const result = await prisma.sale.deleteMany({});
    console.log(`Deleted ${result.count} sales.`);

    console.log('Resetting all item statuses to "In Stock"...');
    const itemResult = await prisma.item.updateMany({
      data: {
        status: 'In Stock'
      }
    });
    console.log(`Updated ${itemResult.count} items back to In Stock.`);

  } catch (error) {
    console.error('Error wiping sales:', error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeSales();
