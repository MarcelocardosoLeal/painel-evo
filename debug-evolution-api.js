const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function debugEvolutionAPI() {
  try {
    // Buscar configurações
    const config = await prisma.evolutionSettings.findFirst();
    
    if (!config || !config.baseUrl || !config.apiKeyGlobal) {
      console.error('❌ Configurações não encontradas');
      return;
    }
    
    console.log('🔍 Fazendo requisição para Evolution API...');
    
    const url = new URL('/instance/fetchInstances', config.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'apikey': config.apiKeyGlobal,
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const instances = JSON.parse(data);
          console.log(`📊 Total de instâncias: ${instances.length}`);
          
          if (instances.length > 0) {
            console.log('\n🔍 Estrutura da primeira instância:');
            console.log(JSON.stringify(instances[0], null, 2));
            
            console.log('\n📋 Lista de todas as instâncias:');
            instances.forEach((instance, index) => {
              console.log(`${index + 1}. Campos disponíveis:`, Object.keys(instance));
              console.log(`   - name: ${instance.name}`);
              console.log(`   - instanceName: ${instance.instanceName}`);
              console.log(`   - profileName: ${instance.profileName}`);
              console.log(`   - id: ${instance.id}`);
              console.log(`   - instanceId: ${instance.instanceId}`);
              console.log(`   - status: ${instance.status}`);
              console.log(`   - connectionStatus: ${instance.connectionStatus}`);
              console.log('');
            });
          }
        } catch (error) {
          console.error('❌ Erro ao parsear JSON:', error.message);
          console.error('Resposta bruta:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.error('❌ Timeout na requisição');
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugEvolutionAPI();