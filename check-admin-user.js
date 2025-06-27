const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('Verificando usuário admin...');
    
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@painelevo.com.br' },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true
      }
    });
    
    if (adminUser) {
      console.log('Usuário admin encontrado:');
      console.log(JSON.stringify(adminUser, null, 2));
      
      if (!adminUser.isAdmin) {
        console.log('\n⚠️  PROBLEMA: Usuário admin não tem flag isAdmin = true');
        console.log('Atualizando usuário para ser admin...');
        
        const updatedUser = await prisma.user.update({
          where: { email: 'admin@painelevo.com.br' },
          data: { isAdmin: true }
        });
        
        console.log('✅ Usuário atualizado com sucesso!');
        console.log(JSON.stringify(updatedUser, null, 2));
      } else {
        console.log('✅ Usuário admin já tem permissões corretas');
      }
    } else {
      console.log('❌ Usuário admin não encontrado!');
    }
    
    // Verificar configurações da Evolution API
    console.log('\nVerificando configurações da Evolution API...');
    const evolutionSettings = await prisma.evolutionSettings.findMany();
    
    if (evolutionSettings.length === 0) {
      console.log('❌ Nenhuma configuração da Evolution API encontrada');
    } else {
      console.log('✅ Configurações encontradas:');
      evolutionSettings.forEach((setting, index) => {
        console.log(`Configuração ${index + 1}:`, {
          id: setting.id,
          baseUrl: setting.baseUrl,
          hasApiKey: !!setting.apiKeyGlobal,
          createdAt: setting.createdAt
        });
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar usuário admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();