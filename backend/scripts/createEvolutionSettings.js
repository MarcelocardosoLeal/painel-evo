const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createEvolutionSettings() {
  try {
    const existing = await prisma.evolutionSettings.findFirst();
    if (existing) {
      console.log('Configurações já existem:', existing);
      return;
    }
    
    const settings = await prisma.evolutionSettings.create({
      data: {
        baseUrl: 'https://evolutionv2.advancedbot.com.br',
        apiKeyGlobal: '0417bf43b0a8669bd6635bcb49d783df'
      }
    });
    
    console.log('Configurações da Evolution API criadas:', settings);
  } catch (error) {
    console.error('Erro ao criar configurações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createEvolutionSettings();