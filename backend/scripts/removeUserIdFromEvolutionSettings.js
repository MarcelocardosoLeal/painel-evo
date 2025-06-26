const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeUserIdFromEvolutionSettings() {
  try {
    console.log('Removendo campo userId da tabela EvolutionSettings...');
    
    // Executar SQL direto para remover a coluna userId
    await prisma.$executeRaw`ALTER TABLE "EvolutionSettings" DROP COLUMN IF EXISTS "userId";`;
    
    console.log('Campo userId removido com sucesso da tabela EvolutionSettings!');
    
    // Verificar se a tabela ainda existe e tem os campos corretos
    const settings = await prisma.evolutionSettings.findMany();
    console.log('Configurações após migração:', settings);
    
  } catch (error) {
    console.error('Erro ao remover campo userId:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeUserIdFromEvolutionSettings();