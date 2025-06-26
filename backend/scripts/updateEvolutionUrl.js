const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateEvolutionUrl() {
  try {
    console.log('🔧 Atualizando URL da Evolution API...');
    
    const result = await prisma.evolutionSettings.updateMany({
      where: {
        baseUrl: 'http://localhost:8080'
      },
      data: {
        baseUrl: 'https://evolutionv2.advancedbot.com.br'
      }
    });
    
    console.log(`✅ ${result.count} configuração(ões) atualizada(s) com sucesso!`);
    
    // Verificar a configuração atual
    const settings = await prisma.evolutionSettings.findMany();
    console.log('\n📋 Configurações atuais:');
    settings.forEach(setting => {
      console.log(`  - User ID: ${setting.userId}, Base URL: ${setting.baseUrl}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEvolutionUrl();