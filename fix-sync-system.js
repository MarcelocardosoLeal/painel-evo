const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Agente HTTPS para ignorar erros SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Função para fazer requisições HTTP/HTTPS
function makeHttpRequest(baseUrl, path, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      agent: isHttps ? httpsAgent : undefined
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } else {
            console.error(`❌ Erro na API: ${res.statusCode} - ${res.statusMessage}`);
            console.error('Resposta:', data);
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        } catch (error) {
          console.error('❌ Erro ao parsear JSON:', error.message);
          console.error('Resposta bruta:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout na requisição'));
    });
    
    req.end();
  });
}

async function fixSyncSystem() {
  try {
    console.log('🔧 Corrigindo sistema de sincronização de instâncias...');
    
    // 1. Buscar configurações da Evolution API
    const config = await prisma.evolutionSettings.findFirst();
    
    if (!config || !config.baseUrl || !config.apiKeyGlobal) {
      console.error('❌ Configurações da Evolution API não encontradas ou incompletas!');
      console.error('Config atual:', config);
      return;
    }
    
    console.log(`🌐 Base URL: ${config.baseUrl}`);
    console.log(`🔑 API Key: ***configurada***`);
    
    // 2. Buscar instâncias da Evolution API usando https nativo
    console.log('\n🔍 Buscando instâncias na Evolution API...');
    
    const evolutionInstances = await makeHttpRequest(config.baseUrl, '/instance/fetchInstances', config.apiKeyGlobal);
    console.log(`📋 Encontradas ${evolutionInstances.length} instâncias na Evolution API`);
    
    // 3. Listar instâncias da Evolution API
    console.log('\n📊 Instâncias da Evolution API:');
    evolutionInstances.forEach((instance, index) => {
      const instanceName = instance.name || instance.instanceName || instance.profileName || 'Nome não encontrado';
      const status = instance.connectionStatus || instance.status || 'Status não encontrado';
      console.log(`${index + 1}. ${instanceName} (Status: ${status})`);
    });
    
    // 4. Buscar instâncias locais
    const localInstances = await prisma.instance.findMany();
    console.log(`\n📱 Encontradas ${localInstances.length} instâncias locais:`);
    
    localInstances.forEach((local, index) => {
      console.log(`${index + 1}. ${local.instanceName} (Status: ${local.status})`);
    });
    
    // 5. Sincronizar instâncias
    console.log('\n🔄 Iniciando sincronização...');
    
    for (const localInstance of localInstances) {
      console.log(`\n🔍 Verificando instância local: ${localInstance.instanceName}`);
      
      // Buscar correspondência na Evolution API
      const evolutionMatch = evolutionInstances.find(instance => {
        return instance.name === localInstance.instanceName ||
          instance.instanceName === localInstance.instanceName ||
          instance.profileName === localInstance.instanceName ||
          instance.id === localInstance.evolutionInstanceId ||
          instance.instanceId === localInstance.evolutionInstanceId;
      });
      
      if (evolutionMatch) {
        const evolutionStatus = evolutionMatch.connectionStatus || evolutionMatch.status;
        
        // Mapear status da Evolution API para o sistema local
        let localStatus;
        switch (evolutionStatus) {
          case 'open':
            localStatus = 'connected';
            break;
          case 'connecting':
            localStatus = 'connecting';
            break;
          case 'close':
          case 'disconnected':
            localStatus = 'disconnected';
            break;
          default:
            localStatus = 'unknown';
        }
        
        console.log(`   ✅ Encontrada na Evolution API - Status: ${evolutionStatus} → ${localStatus}`);
        
        // Atualizar instância local com todos os dados disponíveis
        const updateData = {
          status: localStatus,
          evolutionInstanceId: evolutionMatch.id || evolutionMatch.instanceId || evolutionMatch.name,
          updatedAt: new Date()
        };
        
        // Adicionar dados opcionais se disponíveis
        if (evolutionMatch.ownerJid) {
          updateData.ownerJid = evolutionMatch.ownerJid;
        }
        if (evolutionMatch.profileName) {
          updateData.profileName = evolutionMatch.profileName;
        }
        if (evolutionMatch.profilePicUrl) {
          updateData.profilePictureUrl = evolutionMatch.profilePicUrl;
        }
        
        await prisma.instance.update({
          where: { id: localInstance.id },
          data: updateData
        });
        
        console.log(`   🔄 Instância atualizada: ${localInstance.instanceName} → ${localStatus}`);
      } else {
        console.log(`   ❌ Não encontrada na Evolution API - Marcando como 'not_found'`);
        
        // Marcar como não encontrada
        await prisma.instance.update({
          where: { id: localInstance.id },
          data: {
            status: 'not_found',
            updatedAt: new Date()
          }
        });
      }
    }
    
    // 6. Verificar resultado final
    console.log('\n📋 Status final das instâncias:');
    const finalInstances = await prisma.instance.findMany();
    finalInstances.forEach((instance, index) => {
      console.log(`${index + 1}. ${instance.instanceName}: ${instance.status}`);
    });
    
    console.log('\n✅ Sincronização concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante sincronização:', error.message);
    if (error.response) {
      console.error('   Resposta da API:', error.response.status, error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixSyncSystem();