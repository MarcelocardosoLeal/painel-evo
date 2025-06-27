const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco de dados.');
      console.log('💡 Você precisa criar um usuário primeiro.');
    } else {
      console.log(`✅ Encontrados ${users.length} usuário(s):`);
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Nome: ${user.name}, Admin: ${user.isAdmin}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();