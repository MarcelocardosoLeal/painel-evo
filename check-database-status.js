const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Verificando status das instâncias no banco de dados...');
    
    // Buscar todas as instâncias
    const instances = await prisma.instance.findMany();
    
    console.log('\n📋 Instâncias encontradas no banco:');
    instances.forEach((instance, index) => {
      console.log(`${index + 1}. ID: ${instance.id}`);
      console.log(`   Nome: ${instance.instanceName}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Evolution ID: ${instance.evolutionInstanceId}`);
      console.log(`   QR Code: ${instance.qrCode ? 'Presente' : 'Ausente'}`);
      console.log(`   Criado em: ${instance.createdAt}`);
      console.log(`   Atualizado em: ${instance.updatedAt}`);
      console.log('   ---');
    });
    
    // Verificar configurações da Evolution API
    const evolutionConfig = await prisma.evolutionSettings.findFirst();
    
    console.log('\n⚙️ Configurações Evolution API:');
    if (evolutionConfig) {
      console.log(`   Base URL: ${evolutionConfig.baseUrl}`);
      console.log(`   API Key: ${evolutionConfig.globalApiKey ? '***configurada***' : 'NÃO CONFIGURADA'}`);
      console.log(`   Webhook Secret: ${evolutionConfig.webhookSecret || 'NÃO CONFIGURADO'}`);
    } else {
      console.log('   ❌ Nenhuma configuração encontrada!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();