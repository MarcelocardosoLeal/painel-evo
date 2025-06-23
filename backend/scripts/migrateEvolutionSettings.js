const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateEvolutionSettings() {
  try {
    console.log('Iniciando migração das configurações da Evolution API...');
    
    // Buscar configurações existentes
    const existingSettings = await prisma.evolutionSettings.findMany();
    console.log(`Encontradas ${existingSettings.length} configurações existentes`);
    
    if (existingSettings.length > 0) {
      // Pegar a primeira configuração (assumindo que queremos manter apenas uma global)
      const firstSetting = existingSettings[0];
      console.log('Configuração a ser mantida:', {
        id: firstSetting.id,
        baseUrl: firstSetting.baseUrl,
        hasApiKey: !!firstSetting.apiKeyGlobal
      });
      
      // Deletar todas as outras configurações se houver múltiplas
      if (existingSettings.length > 1) {
        const idsToDelete = existingSettings.slice(1).map(setting => setting.id);
        console.log(`Removendo ${idsToDelete.length} configurações duplicadas...`);
        
        await prisma.evolutionSettings.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        });
        console.log('Configurações duplicadas removidas com sucesso.');
      }
    }
    
    console.log('Migração concluída com sucesso!');
    console.log('Agora você pode aplicar a migração do schema com: npx prisma migrate dev --name make-evolution-settings-global');
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateEvolutionSettings();