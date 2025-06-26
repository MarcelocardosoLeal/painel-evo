const prisma = require('./backend/prisma/db');
const { setupWebhookEvolution } = require('./backend/services/evolutionService');

async function setupWebhooksForInstances() {
  try {
    console.log('🔧 Configurando webhooks para instâncias existentes...');
    
    // Buscar todas as instâncias
    const instances = await prisma.instance.findMany();
    
    if (instances.length === 0) {
      console.log('📭 Nenhuma instância encontrada.');
      return;
    }
    
    // URL do webhook do sistema - precisa ser uma URL pública acessível pela Evolution API
    const webhookUrl = process.env.DEFAULT_WEBHOOK_URL || 'https://webhook.site/unique-id';
    console.log(`🌐 URL do webhook: ${webhookUrl}`);
    console.log(`⚠️  ATENÇÃO: Para webhooks funcionarem, a URL deve ser pública e acessível pela Evolution API`);
    console.log(`⚠️  Se estiver testando localmente, use ngrok ou webhook.site para criar uma URL pública`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const instance of instances) {
      try {
        console.log(`\n🔄 Configurando webhook para: ${instance.instanceName}`);
        
        // Configurar webhook na Evolution API
        const webhookResponse = await setupWebhookEvolution(instance.instanceName, webhookUrl);
        
        if (webhookResponse.error) {
          console.log(`❌ Erro ao configurar webhook: ${webhookResponse.message}`);
          errorCount++;
        } else {
          console.log(`✅ Webhook configurado com sucesso!`);
          
          // Atualizar a instância no banco com a URL do webhook
          await prisma.instance.update({
            where: { id: instance.id },
            data: {
              webhookUrl: webhookUrl,
              updatedAt: new Date()
            }
          });
          
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Erro ao configurar webhook para ${instance.instanceName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Resumo da configuração:`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📱 Total: ${instances.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Webhooks configurados! Agora o sistema receberá notificações automáticas de mudanças de status.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral ao configurar webhooks:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupWebhooksForInstances();