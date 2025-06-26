const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const https = require('https');

const prisma = new PrismaClient();

// Agente HTTPS para ignorar erros SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function fixMarceloSync() {
  try {
    console.log('🔧 Corrigindo sincronização da instância Marcelo...');
    
    // 1. Buscar configurações da Evolution API
    const config = await prisma.evolutionSettings.findFirst();
    if (!config || !config.baseUrl) {
      console.error('❌ Configurações da Evolution API não encontradas!');
      return;
    }
    
    console.log(`📋 URL da API: ${config.baseUrl}`);
    console.log(`🔑 API Key: ${config.globalApiKey ? '***configurada***' : 'NÃO CONFIGURADA'}`);
    
    if (!config.globalApiKey) {
      console.error('❌ API Key não configurada!');
      return;
    }
    
    // 2. Listar todas as instâncias da Evolution API
    console.log('\n🔍 Buscando instâncias na Evolution API...');
    
    const response = await axios.get(`${config.baseUrl}/instance/fetchInstances`, {
      headers: {
        'apikey': config.globalApiKey,
        'Content-Type': 'application/json'
      },
      httpsAgent,
      timeout: 10000
    });
    
    console.log(`📋 Encontradas ${response.data.length} instâncias na Evolution API:`);
    
    // 3. Analisar cada instância
    response.data.forEach((item, index) => {
      console.log(`\n${index + 1}. Instância:`);
      console.log(`   - ID: ${item.instanceId || 'N/A'}`);
      console.log(`   - Nome: ${item.instanceName || item.instance?.instanceName || 'N/A'}`);
      console.log(`   - Status: ${item.connectionStatus || item.instance?.status || 'N/A'}`);
      console.log(`   - Owner: ${item.instance?.owner || 'N/A'}`);
      console.log(`   - Profile: ${item.instance?.profileName || 'N/A'}`);
      
      // Verificar se é a instância Marcelo
      const instanceName = item.instanceName || item.instance?.instanceName;
      if (instanceName && instanceName.toLowerCase().includes('marcelo')) {
        console.log(`   ⭐ ENCONTRADA INSTÂNCIA MARCELO!`);
      }
    });
    
    // 4. Buscar instância local
    const localInstance = await prisma.instance.findFirst({
      where: { instanceName: 'Marcelo' }
    });
    
    if (localInstance) {
      console.log(`\n📱 Instância local encontrada:`);
      console.log(`   - ID: ${localInstance.id}`);
      console.log(`   - Nome: ${localInstance.instanceName}`);
      console.log(`   - Status: ${localInstance.status}`);
      console.log(`   - Evolution ID: ${localInstance.evolutionInstanceId}`);
    }
    
    // 5. Tentar encontrar uma instância conectada para sincronizar
    const connectedInstance = response.data.find(item => {
      const status = item.connectionStatus || item.instance?.status;
      return status === 'open' || status === 'connected';
    });
    
    if (connectedInstance && localInstance) {
      const instanceName = connectedInstance.instanceName || connectedInstance.instance?.instanceName || connectedInstance.instanceId;
      const status = connectedInstance.connectionStatus || connectedInstance.instance?.status;
      
      console.log(`\n🔄 Atualizando instância local com dados da instância conectada:`);
      console.log(`   - Nome/ID: ${instanceName}`);
      console.log(`   - Status: ${status}`);
      
      await prisma.instance.update({
        where: { id: localInstance.id },
        data: {
          instanceName: instanceName,
          evolutionInstanceId: instanceName,
          status: 'connected'
        }
      });
      
      console.log('✅ Instância atualizada com sucesso!');
    } else {
      console.log('\n⚠️ Nenhuma instância conectada encontrada na Evolution API');
    }
    
    // 6. Verificar resultado final
    const updatedInstance = await prisma.instance.findFirst({
      where: { id: localInstance?.id }
    });
    
    if (updatedInstance) {
      console.log(`\n📋 Status final da instância:`);
      console.log(`   - Nome: ${updatedInstance.instanceName}`);
      console.log(`   - Status: ${updatedInstance.status}`);
      console.log(`   - Evolution ID: ${updatedInstance.evolutionInstanceId}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir sincronização:', error.message);
    if (error.response) {
      console.error('   Resposta da API:', error.response.status, error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixMarceloSync();