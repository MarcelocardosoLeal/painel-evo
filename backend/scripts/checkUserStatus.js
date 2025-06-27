const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function checkUserStatus() {
  try {
    console.log('🔍 Verificando status do usuário...');
    
    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: {
        email: 'marcelocardosoleal@gmail.com'
      }
    });
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('👤 Usuário no banco de dados:', {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
    // Gerar novo token com as permissões atualizadas
    const newToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        isAdmin: user.isAdmin 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log('🔑 Novo token gerado:', {
      tokenLength: newToken.length,
      payload: jwt.decode(newToken)
    });
    
    console.log('\n📋 INSTRUÇÕES PARA O USUÁRIO:');
    console.log('1. Faça logout do painel');
    console.log('2. Faça login novamente com suas credenciais');
    console.log('3. Isso atualizará o token com as novas permissões de admin');
    console.log('\n✅ Após o login, você poderá salvar as configurações da Evolution API');
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserStatus();