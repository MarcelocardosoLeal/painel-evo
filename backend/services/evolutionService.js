const axios = require('axios');
const https = require('https');
const prisma = require('../prisma/db');

// Estas variáveis devem ser configuradas idealmente através de variáveis de ambiente
// ou de um registro de configuração no banco de dados gerenciado pelo administrador.
// Por agora, vamos usar placeholders ou valores fixos para desenvolvimento.
let EVO_API_URL = process.env.EVO_API_URL || 'http://localhost:8080'; // URL base da Evolution API
let EVO_API_KEY = process.env.EVO_API_KEY; // API Key Global da Evolution API

// Função para buscar as configurações da Evolution API do banco de dados
async function loadEvolutionApiConfig() {
  try {
    const config = await prisma.evolutionSettings.findFirst();
    if (config && config.baseUrl && config.apiKeyGlobal) {
      EVO_API_URL = config.baseUrl;
      EVO_API_KEY = config.apiKeyGlobal;
      console.log('Configurações da Evolution API carregadas do banco de dados.');
    } else {
      console.warn('Configurações da Evolution API não encontradas no banco de dados. Usando valores padrão/ambiente.');
      // Se não houver configuração no DB, garante que a apiKey seja pega do .env se existir
      if(!EVO_API_KEY && process.env.EVO_API_KEY) {
        EVO_API_KEY = process.env.EVO_API_KEY;
      }
      if (!EVO_API_KEY) {
        console.error('ALERTA: API Key da Evolution não configurada. As chamadas para a API falharão.');
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configurações da Evolution API do banco de dados:', error);
    // Continua com valores padrão/ambiente em caso de erro
  }
}

// Carrega as configurações ao iniciar o serviço
loadEvolutionApiConfig();

// Agente HTTPS para ignorar erros SSL (use com cautela, idealmente apenas em desenvolvimento)
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' // Em produção, valide SSL
});

/**
 * Cria uma nova instância na Evolution API.
 * @param {string} instanceName - Nome da instância a ser criada.
 * @param {string} [webhookUrl] - URL de webhook opcional para a instância.
 * @returns {Promise<object>} - Dados da instância criada.
 */
async function createInstanceEvolution(instanceName) { // webhookUrl removido daqui
  // Recarregar configurações antes de criar instância
  await loadEvolutionApiConfig();
  
  if (!EVO_API_KEY) {
    throw new Error('API Key da Evolution não configurada.');
  }
  const endpoint = `${EVO_API_URL}/instance/create`;
  try {
    const response = await axios.post(endpoint, {
      instanceName: instanceName,
      qrcode: true, // Solicita o QR Code na criação
      integration: 'WHATSAPP-BAILEYS' // Adicionado conforme exemplo PHP
    }, {
      headers: {
        'apikey': EVO_API_KEY,
        'Content-Type': 'application/json'
      },
      httpsAgent, // Adicionado para controle de SSL
      timeout: 30000 // Timeout de 30 segundos
    });
    return response.data;
  } catch (error) {
    console.error(`Erro ao criar instância '${instanceName}' na Evolution API:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.message || `Falha ao criar instância na Evolution API: ${error.message}`);
  }
}

// TODO: Implementar funções para interagir com a Evolution API

// Exemplo de função para criar uma instância (adaptar conforme sua API)
/*
async function createInstance(instanceData) {
    try {
        const response = await axios.post(`${EVOLUTION_API_URL}/instance/create`, instanceData, {
            headers: {
                'apikey': EVOLUTION_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Erro ao criar instância na Evolution API:', error.response ? error.response.data : error.message);
        throw error;
    }
}
*/

/**
 * Configura o webhook para uma instância na Evolution API.
 * @param {string} instanceName - Nome da instância.
 * @param {string} webhookUrl - URL do webhook.
 * @returns {Promise<object>} - Resposta da API.
 */
async function setupWebhookEvolution(instanceName, webhookUrl) {
  // Recarregar configurações antes de configurar webhook
  await loadEvolutionApiConfig();
  
  if (!EVO_API_KEY) {
    throw new Error('API Key da Evolution não configurada.');
  }
  if (!webhookUrl) {
    console.log(`Webhook não configurado para a instância '${instanceName}' pois a URL não foi fornecida.`);
    return { message: 'Webhook URL not provided, skipping setup.' };
  }

  const endpoint = `${EVO_API_URL}/webhook/set/${instanceName}`;
  // Payload conforme documentação oficial da Evolution API
  const payload = {
    url: webhookUrl,
    webhook_by_events: false,
    webhook_base64: false,
    events: [
      'QRCODE_UPDATED',
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'MESSAGES_DELETE',
      'SEND_MESSAGE',
      'CONNECTION_UPDATE',
      'TYPEBOT_START',
      'TYPEBOT_CHANGE_STATUS'
    ]
  };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'apikey': EVO_API_KEY,
        'Content-Type': 'application/json'
      },
      httpsAgent,
      timeout: 30000
    });
    console.log(`Webhook configurado com sucesso para a instância '${instanceName}' na URL: ${webhookUrl}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao configurar webhook para a instância '${instanceName}':`, error.response?.data || error.message);
    // Não lançar erro aqui necessariamente, a criação da instância pode ter sido bem-sucedida
    // mas o webhook pode falhar. Logar e talvez retornar um status específico.
    return { error: true, message: error.response?.data?.message || `Falha ao configurar webhook: ${error.message}` };
  }
}

/**
 * Obtém o status e informações completas de uma instância na Evolution API.
 * @param {string} instanceName - Nome da instância.
 * @param {string} [userApiUrl] - URL personalizada da API (opcional).
 * @param {string} [userApiKey] - API Key personalizada (opcional).
 * @returns {Promise<object>} - Status e informações da instância.
 */
async function getInstanceStatusEvolution(instanceName, userApiUrl = null, userApiKey = null) {
  // Recarregar configurações antes de cada chamada para garantir dados atualizados
  await loadEvolutionApiConfig();
  
  const apiUrl = userApiUrl || EVO_API_URL;
  const apiKey = userApiKey || EVO_API_KEY;
  
  if (!apiKey) {
    throw new Error('API Key da Evolution não configurada.');
  }

  // Usar o endpoint fetchInstances para obter informações completas da instância
  const endpoint = `${apiUrl}/instance/fetchInstances`;
  
  try {
    const response = await axios.get(endpoint, {
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      httpsAgent,
      timeout: 8000 // Timeout otimizado para verificação individual
    });
    
    // Buscar a instância específica na lista retornada
    const instances = response.data;
    const targetInstance = instances.find(item => {
      // A Evolution API retorna instâncias diretamente, não dentro de um objeto 'instance'
      return item.name === instanceName || 
             item.instanceName === instanceName ||
             item.profileName === instanceName ||
             item.id === instanceName;
    });
    
    if (!targetInstance) {
      console.log(`❌ Instância '${instanceName}' não encontrada na Evolution API`);
      return {
        status: 'not_found'
      };
    }
    
    // A instância é retornada diretamente, não dentro de um objeto 'instance'
    const instanceData = targetInstance;
    const instanceState = instanceData.connectionStatus || instanceData.status || 'close';
    
    // Mapear estados da Evolution API para os status do sistema
    let mappedStatus;
    switch (instanceState.toLowerCase()) {
      case 'open':
        mappedStatus = 'connected';
        break;
      case 'connecting':
        mappedStatus = 'connecting';
        break;
      case 'disconnected':
      case 'close':
        mappedStatus = 'disconnected';
        break;
      default:
        mappedStatus = instanceState.toLowerCase();
    }
    
    console.log(`📡 Status da Evolution API para ${instanceName}: ${instanceState} → ${mappedStatus}`);
    console.log(`👤 Informações do perfil: ${instanceData.profileName} (${instanceData.ownerJid || 'N/A'})`);
    
    return {
      status: mappedStatus,
      instanceName: instanceData.name || instanceData.instanceName || instanceName,
      state: instanceState,
      ownerJid: instanceData.ownerJid,
      profileName: instanceData.profileName,
      profilePictureUrl: instanceData.profilePictureUrl,
      profileStatus: instanceData.profileStatus
    };
  } catch (error) {
    // Se a instância não for encontrada (404), retorna not_found
    if (error.response?.status === 404) {
      console.log(`❌ Instância '${instanceName}' não encontrada na Evolution API`);
      return {
        status: 'not_found'
      };
    }
    
    console.error(`❌ Erro ao consultar status da instância '${instanceName}':`, error.response?.data || error.message);
    
    // Em caso de outros erros, retorna status desconhecido
    return {
      status: 'unknown',
      error: error.response?.data?.message || error.message
    };
  }
}

module.exports = { createInstanceEvolution, setupWebhookEvolution, getInstanceStatusEvolution };