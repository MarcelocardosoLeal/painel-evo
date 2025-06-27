const prisma = require('../prisma/db');

// @desc    Get Evolution API settings (global)
// @route   GET /api/evolution-settings
// @access  Private
const getEvolutionSettings = async (req, res) => {
  try {
    console.log('Buscando configurações globais da Evolution API');
    
    const settings = await prisma.evolutionSettings.findFirst();

    if (!settings) {
      console.log('Nenhuma configuração global da Evolution API encontrada');
      return res.status(404).json({ 
        message: 'Configurações da API Evolution não encontradas.',
        needsConfiguration: true 
      });
    }

    console.log('Configurações globais encontradas:', {
      hasBaseUrl: !!settings.baseUrl,
      hasApiKey: !!settings.apiKeyGlobal
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Erro ao buscar configurações da API Evolution:', error);
    res.status(500).json({ message: 'Erro do servidor ao buscar configurações.' });
  }
};

// @desc    Create or Update Evolution API settings (global)
// @route   POST /api/evolution-settings
// @access  Private (Admin only)
const upsertEvolutionSettings = async (req, res) => {
  console.log('🔄 [EVOLUTION SETTINGS] Iniciando processo de salvamento');
  console.log('📝 [EVOLUTION SETTINGS] Dados recebidos:', {
    ev_api_url: req.body.ev_api_url ? '***URL_PRESENTE***' : 'VAZIO',
    ev_api_key_global: req.body.ev_api_key_global ? '***CHAVE_PRESENTE***' : 'VAZIO',
    usuario: req.user ? `ID: ${req.user.id}, Admin: ${req.user.isAdmin}` : 'NÃO_AUTENTICADO'
  });
  
  const { ev_api_url, ev_api_key_global } = req.body;

  if (!ev_api_url || !ev_api_key_global) {
    console.log('❌ [EVOLUTION SETTINGS] Validação falhou - campos obrigatórios ausentes');
    return res.status(400).json({ message: 'URL da API Evolution e Chave API Global são obrigatórias.' });
  }

  try {
    console.log('🔍 [EVOLUTION SETTINGS] Buscando configuração existente...');
    // Buscar configuração existente
    const existingSettings = await prisma.evolutionSettings.findFirst();
    console.log('📊 [EVOLUTION SETTINGS] Configuração existente:', existingSettings ? `ID: ${existingSettings.id}` : 'NENHUMA');
    
    let settings;
    if (existingSettings) {
      console.log('🔄 [EVOLUTION SETTINGS] Atualizando configuração existente...');
      // Atualizar configuração existente
      settings = await prisma.evolutionSettings.update({
        where: {
          id: existingSettings.id,
        },
        data: {
          baseUrl: ev_api_url,
          apiKeyGlobal: ev_api_key_global,
        },
      });
      console.log('✅ [EVOLUTION SETTINGS] Configuração atualizada com sucesso');
    } else {
      console.log('🆕 [EVOLUTION SETTINGS] Criando nova configuração...');
      // Criar nova configuração global
      settings = await prisma.evolutionSettings.create({
        data: {
          baseUrl: ev_api_url,
          apiKeyGlobal: ev_api_key_global,
        },
      });
      console.log('✅ [EVOLUTION SETTINGS] Nova configuração criada com sucesso');
    }

    console.log('🎉 [EVOLUTION SETTINGS] Processo concluído - enviando resposta');
    res.status(201).json(settings);
  } catch (error) {
    console.error('💥 [EVOLUTION SETTINGS] Erro ao salvar configurações:', error);
    res.status(500).json({ message: 'Erro do servidor ao salvar configurações.' });
  }
};

module.exports = {
  getEvolutionSettings,
  upsertEvolutionSettings,
};