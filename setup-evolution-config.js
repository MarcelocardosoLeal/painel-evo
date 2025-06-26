const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupEvolutionConfig() {
  try {
    console.log('🔧 Configurando Evolution API...');
    
    // Verificar se já existe configuração
    const existing = await prisma.evolutionSettings.findFirst();
    
    if (existing) {
      console.log('✅ Configurações da Evolution API já existem:');
      console.log(`   📍 Base URL: ${existing.baseUrl}`);
      console.log(`   🔑 API Key: ***configurada***`);
      return;
    }
    
    // Criar configuração padrão
    const config = await prisma.evolutionSettings.create({
      data: {
        baseUrl: 'http://localhost:8080',
        apiKeyGlobal: 'B6D711FCDE4D4FD5936544120E713976' // API Key padrão da Evolution
      }
    });
    
    console.log('✅ Configurações da Evolution API criadas com sucesso!');
    console.log(`   📍 Base URL: ${config.baseUrl}`);
    console.log(`   🔑 API Key: ***configurada***`);
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   1. Verifique se a Evolution API está rodando na URL configurada');
    console.log('   2. Confirme se a API Key está correta');
    console.log('   3. Acesse o painel admin para ajustar as configurações se necessário');
    
  } catch (error) {
    console.error('❌ Erro ao configurar Evolution API:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupEvolutionConfig();