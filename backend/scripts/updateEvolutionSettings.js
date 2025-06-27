const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateEvolutionSettings() {
  try {
    console.log('🔧 Atualizando configurações da Evolution API...');
    
    const updated = await prisma.evolutionSettings.updateMany({
      data: {
        baseUrl: 'https://evolutionv2.advancedbot.com.br',
        apiKeyGlobal: '0417bf43b0a8669bd6635bcb49d783df'
      }
    });
    
    console.log('✅ Configurações atualizadas:', updated);
    
    // Verificar as configurações atuais
    const current = await prisma.evolutionSettings.findFirst();
    console.log('📋 Configurações atuais:', {
      baseUrl: current?.baseUrl,
      apiKeyExists: !!current?.apiKeyGlobal,
      apiKeyLength: current?.apiKeyGlobal?.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEvolutionSettings();