const prisma = require('./backend/prisma/db');

async function checkWebhooks() {
  try {
    console.log('🔍 Verificando configuração de webhooks das instâncias...');
    
    const instances = await prisma.instance.findMany();
    
    console.log(`\n📊 Total de instâncias: ${instances.length}`);
    
    instances.forEach((instance, index) => {
      console.log(`\n--- Instância ${index + 1} ---`);
      console.log(`Nome: ${instance.instanceName}`);
      console.log(`ID: ${instance.id}`);
      console.log(`Status: ${instance.status}`);
      console.log(`Webhook URL: ${instance.webhookUrl || 'NÃO CONFIGURADO'}`);
      console.log(`Evolution ID: ${instance.evolutionInstanceId}`);
    });
    
    // Verificar configurações globais da Evolution API
    const evolutionSettings = await prisma.evolutionSettings.findFirst();
    
    console.log('\n🌐 Configurações da Evolution API:');
    if (evolutionSettings) {
      console.log(`Base URL: ${evolutionSettings.baseUrl}`);
      console.log(`API Key: ${evolutionSettings.apiKeyGlobal ? '***configurada***' : 'NÃO CONFIGURADA'}`);
      console.log(`Webhook Secret: ${evolutionSettings.webhookSecret || 'NÃO CONFIGURADO'}`);
    } else {
      console.log('❌ Configurações não encontradas!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar webhooks:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkWebhooks();