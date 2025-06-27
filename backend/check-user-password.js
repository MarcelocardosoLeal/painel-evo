const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: { isAdmin: true }
    });
    
    console.log('Admin user found:');
    console.log('Email:', user.email);
    console.log('Password (stored):', user.password);
    console.log('Is Admin:', user.isAdmin);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();