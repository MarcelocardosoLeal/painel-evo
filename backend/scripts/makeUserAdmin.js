const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeUserAdmin() {
  try {
    console.log('🔧 Tornando usuário administrador...');
    
    const updated = await prisma.user.update({
      where: {
        email: 'marcelocardosoleal@gmail.com'
      },
      data: {
        isAdmin: true
      }
    });
    
    console.log('✅ Usuário atualizado:', {
      email: updated.email,
      isAdmin: updated.isAdmin,
      name: updated.name
    });
    
    // Verificar todos os usuários admin
    const admins = await prisma.user.findMany({
      where: {
        isAdmin: true
      },
      select: {
        email: true,
        name: true,
        isAdmin: true
      }
    });
    
    console.log('📋 Usuários administradores:', admins);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserAdmin();