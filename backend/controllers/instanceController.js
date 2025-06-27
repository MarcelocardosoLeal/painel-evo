const asyncHandler = require('express-async-handler');
const prisma = require('../prisma/db');
const { createInstanceEvolution, getInstanceStatusEvolution } = require('../services/evolutionService');
const { setupWebhookEvolution } = require('../services/evolutionService'); // Adicionado para setupWebhookEvolution
const axios = require('axios');
const https = require('https'); // Adicionado para httpsAgent

// Agente HTTPS para ignorar erros SSL (use com cautela, idealmente apenas em desenvolvimento)
const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production' // Em produção, valide SSL
});

// @desc    Create a new instance
// @route   POST /api/instances
// @access  Private
const createInstance = asyncHandler(async (req, res) => {
    const { name } = req.body; // Alterado de instanceName para name
    const userId = req.user.id;

    if (!name) { // Alterado de instanceName para name
        res.status(400);
        throw new Error('O nome da instância é obrigatório.');
    }

    // Usar 'name' onde 'instanceName' era usado para o nome da instância fornecido pelo usuário
    const instanceNameFromUser = name; 

    try {
        // 1. Buscar EvolutionSettings globais
        const globalSettings = await prisma.evolutionSettings.findFirst();

        if (!globalSettings || !globalSettings.baseUrl || !globalSettings.apiKeyGlobal) {
            res.status(400);
            throw new Error('Configurações da Evolution API não foram definidas pelo administrador. Entre em contato com o administrador do sistema para configurar as credenciais da Evolution API.');
        }

        const { baseUrl: evolutionApiUrl, apiKeyGlobal: evolutionApiKey } = globalSettings;

        // 2. Chamar a Evolution API para criar a instância
        // 2. Chamar a Evolution API para criar a instância
        let createdEvolutionInstance;
        try {
            const evolutionApiResponse = await axios.post(`${evolutionApiUrl}/instance/create`,
                {
                    instanceName: instanceNameFromUser, // Usar a variável que armazena o nome vindo do usuário
                    qrcode: true, // Solicita o QR Code na criação da instância
                    integration: 'WHATSAPP-BAILEYS',
                    // Adicionar outros parâmetros conforme a documentação da sua Evolution API:
                    // webhook: 'SUA_URL_DE_WEBHOOK_GLOBAL_OU_ESPECIFICA_PARA_EVENTOS_DA_INSTANCIA',
                    // token: 'SEU_TOKEN_DE_AUTENTICACAO_PARA_WEBHOOK_SE_NECESSARIO'
                },
                {
                    headers: { 
                        'apikey': evolutionApiKey,
                        'Content-Type': 'application/json'
                    },
                    httpsAgent, // Adicionado para controle de SSL
                    timeout: 30000 // Timeout de 30 segundos
                }
            );

            if (evolutionApiResponse.status !== 201 || !evolutionApiResponse.data || !evolutionApiResponse.data.instance) {
                // Log detalhado do erro da API Evolution
                console.error('Falha ao criar instância na Evolution API. Status:', evolutionApiResponse.status, 'Data:', evolutionApiResponse.data);
                res.status(evolutionApiResponse.status || 500);
                throw new Error(`Falha ao criar instância na Evolution API. ${evolutionApiResponse.data?.error || evolutionApiResponse.data?.message || 'Resposta inesperada.'}`);
            }
            createdEvolutionInstance = evolutionApiResponse.data; // A resposta completa pode ser útil

            // Após criar a instância na Evolution API, configurar o webhook se a URL for fornecida
            const webhookUrl = req.body.webhookUrl || process.env.DEFAULT_WEBHOOK_URL;
            if (createdEvolutionInstance && createdEvolutionInstance.instance && webhookUrl) {
              try {
                console.log(`Tentando configurar webhook para ${createdEvolutionInstance.instance.instanceName} na URL: ${webhookUrl}`);
                const webhookSetupResponse = await setupWebhookEvolution(createdEvolutionInstance.instance.instanceName, webhookUrl);
                console.log('Resposta da configuração do webhook:', webhookSetupResponse);
                // Adicionar lógica para tratar a resposta do webhookSetupResponse se necessário
              } catch (webhookError) {
                console.error(`Erro ao configurar webhook para ${createdEvolutionInstance.instance.instanceName}:`, webhookError.message);
                // Decide se a falha na configuração do webhook deve impedir a resposta de sucesso.
                // Por ora, apenas logamos o erro e continuamos.
              }
            }

        } catch (apiError) {
            // Trata erros da chamada axios, incluindo erros de rede ou da API Evolution
            if (apiError.response) {
                // A requisição foi feita e o servidor respondeu com um status code fora do range 2xx
                console.error('Erro da Evolution API (response):', apiError.response.status, apiError.response.data);
                res.status(apiError.response.status);
                throw new Error(`Erro da Evolution API: ${apiError.response.data?.error || apiError.response.data?.message || apiError.message}`);
            } else if (apiError.request) {
                // A requisição foi feita mas não houve resposta
                console.error('Erro da Evolution API (request): Sem resposta do servidor.', apiError.request);
                res.status(503); // Service Unavailable
                throw new Error('Não foi possível conectar à Evolution API. Verifique a URL e o servidor.');
            } else {
                // Algo aconteceu ao configurar a requisição que acionou um erro
                console.error('Erro ao configurar requisição para Evolution API:', apiError.message);
                res.status(500);
                throw new Error('Erro ao preparar a comunicação com a Evolution API.');
            }
        }

        // 3. Salvar a instância no banco de dados
        const newInstance = await prisma.instance.create({
            data: {
                instanceName: instanceNameFromUser, // Nome dado pelo usuário para identificar a instância no painel
                evolutionInstanceId: createdEvolutionInstance.instance.instanceId, // UUID único da instância retornado pela Evolution API
                status: createdEvolutionInstance.instance.status?.toLowerCase() || 'pending_qr', // Status inicial após criação bem-sucedida
                qrCodeBase64: createdEvolutionInstance.qrcode?.base64, // QR Code se retornado
                ownerJid: createdEvolutionInstance.instance.owner, // JID do proprietário, se retornado
                profileName: createdEvolutionInstance.instance.profileName, // Nome do perfil, se retornado
                profilePictureUrl: createdEvolutionInstance.instance.profilePictureUrl, // URL da foto de perfil, se retornado
                userId: userId,
            },
        });

        // A resposta da Evolution API para criação pode ser algo como:
        // {
        //   "instance": {
        //     "instanceName": "myinstance",
        //     "status": "created"
        //   },
        //   "hash": {
        //     "apikey": "your-instance-api-key"
        //   },
        //   "qrcode": {
        //     "base64": "data:image/png;base64,..."
        //   }
        // }
        // Ajuste o acesso aos campos acima conforme a estrutura real da resposta da sua Evolution API.

        // Emitir evento Socket.IO para notificar o frontend sobre a nova instância
        if (req.io) {
            req.io.to(userId.toString()).emit('instance:created', newInstance);
            // Considerar emitir para uma sala geral de admin se necessário
            // req.io.emit('instance:created', newInstance); 
        }

        res.status(201).json(newInstance);

    } catch (error) {
        res.status(res.statusCode || 500); // Mantém o status code se já definido (ex: 400, 404)
        // Verifica se o erro é da Evolution API ou um erro interno
        if (error.response) { // Erro do Axios
            console.error('Erro da Evolution API:', error.response.data);
            throw new Error(`Erro ao comunicar com a Evolution API: ${error.response.data.message || error.message}`);
        } else {
            console.error('Erro ao criar instância:', error);
            throw new Error(error.message || 'Erro interno ao criar instância.');
        }
    }

});

// @desc    Get all instances for a user
// @route   GET /api/instances
// @access  Private
const getInstances = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    try {
        // Super Admin pode ver todas as instâncias, usuários comuns só as suas
        const whereClause = isAdmin ? {} : { userId };
        
        const instances = await prisma.instance.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isAdmin: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc', // Opcional: ordenar por data de criação
            },
        });

        if (!instances) {
            // Isso tecnicamente não deveria acontecer com findMany, que retorna [] se nada for encontrado.
            // Mas é uma boa prática para outros tipos de busca.
            res.status(404);
            throw new Error('Nenhuma instância encontrada para este usuário.');
        }

        // Buscar configurações da Evolution API globais
        const globalSettings = await prisma.evolutionSettings.findFirst();

        // Se as configurações estão disponíveis, verificar o status real de cada instância
        if (globalSettings && globalSettings.baseUrl && globalSettings.apiKeyGlobal) {
            console.log('🔄 Iniciando sincronização de status das instâncias...');
            console.log(`📊 Total de instâncias a verificar: ${instances.length}`);
            
            const { getInstanceStatusEvolution } = require('../services/evolutionService');
            
            // Verificar status de cada instância em paralelo (mas limitado para não sobrecarregar)
            const instancesWithRealStatus = await Promise.allSettled(
                instances.map(async (instance) => {
                    try {
                        const instanceIdentifier = instance.instanceName;
                        console.log(`🔍 Verificando status da instância: ${instanceIdentifier}`);
                        
                        const statusResponse = await getInstanceStatusEvolution(
                            instanceIdentifier,
                            globalSettings.baseUrl,
                            globalSettings.apiKeyGlobal
                        );
                        const realStatus = statusResponse;
                        

                        
                        // Verificar se há dados válidos da Evolution API para atualizar
                        if (realStatus.status && realStatus.status !== 'unknown' && realStatus.status !== 'not_found') {
                            
                            // Preparar dados para atualização
                            const updateData = {
                                status: realStatus.status,
                                updatedAt: new Date()
                            };
                            
                            // Atualizar campos de perfil se disponíveis
                            if (realStatus.ownerJid) {
                                updateData.ownerJid = realStatus.ownerJid;
                            }
                            if (realStatus.profileName) {
                                updateData.profileName = realStatus.profileName;
                            }
                            if (realStatus.profilePictureUrl) {
                                updateData.profilePictureUrl = realStatus.profilePictureUrl;
                            }
                            
                            // Verificar se há mudanças para atualizar
                            const hasChanges = realStatus.status !== instance.status ||
                                             (realStatus.ownerJid && realStatus.ownerJid !== instance.ownerJid) ||
                                             (realStatus.profileName && realStatus.profileName !== instance.profileName) ||
                                             (realStatus.profilePictureUrl && realStatus.profilePictureUrl !== instance.profilePictureUrl);
                            
                            if (hasChanges) {

                                
                                const updatedInstance = await prisma.instance.update({
                                    where: { id: instance.id },
                                    data: updateData
                                });
                                

                                
                                // Emitir evento Socket.IO para notificar o frontend sobre as mudanças
                                if (req.io) {
                                    req.io.to(userId.toString()).emit('instance:status_changed', {
                                        instanceId: instance.id,
                                        status: updatedInstance.status,
                                        instance: updatedInstance
                                    });
                                }
                                
                                return updatedInstance;
                            } else {
                                console.log(`⏭️ Nenhuma mudança detectada para ${instanceIdentifier}`);
                            }
                        } else {
                            console.log(`⚠️ Status inválido ou não encontrado para ${instanceIdentifier}: ${realStatus.status}`);
                        }
                        
                        return instance;
                    } catch (error) {
                        console.error(`Erro ao verificar status da instância ${instance.instanceName}:`, error.message);
                        return instance; // Retorna a instância original em caso de erro
                    }
                })
            );
            
            // Extrair os resultados bem-sucedidos
            const finalInstances = instancesWithRealStatus.map(result => 
                result.status === 'fulfilled' ? result.value : result.reason
            ).filter(instance => instance && typeof instance === 'object');
            
            res.status(200).json(finalInstances);
        } else {
            // Se não há configurações da Evolution API, retornar instâncias sem verificação
            console.warn('Configurações da Evolution API não encontradas. Retornando status do banco de dados.');
            res.status(200).json(instances);
        }
    } catch (error) {
        console.error('Erro ao buscar instâncias:', error);
        res.status(res.statusCode || 500);
        throw new Error(error.message || 'Erro interno ao buscar instâncias.');
    }
});

// @desc    Connect an instance and get QR code
// @route   GET /api/instances/:instanceId/connect
// @access  Private
const connectInstance = asyncHandler(async (req, res) => {
    const { instanceId } = req.params;
    const userId = req.user.id;

    try {
        // 1. Buscar a instância no banco de dados para verificar se pertence ao usuário e obter o instanceName
        const instance = await prisma.instance.findUnique({
            where: { id: parseInt(instanceId) },
        });

        if (!instance) {
            res.status(404);
            throw new Error('Instância não encontrada.');
        }

        // Verificar se o usuário é admin ou se é o dono da instância
        if (!req.user.isAdmin && instance.userId !== userId) {
            res.status(403);
            throw new Error('Usuário não autorizado a acessar esta instância.');
        }

        // 2. Buscar EvolutionSettings globais
        const globalSettings = await prisma.evolutionSettings.findFirst();

        if (!globalSettings || !globalSettings.baseUrl || !globalSettings.apiKeyGlobal) {
            res.status(400);
            throw new Error('Configurações da Evolution API não foram definidas pelo administrador. Entre em contato com o administrador do sistema para configurar as credenciais da Evolution API.');
        }

        const { baseUrl: evolutionApiUrl, apiKeyGlobal: evolutionApiKey } = globalSettings;

        // 3. Chamar a Evolution API para obter o QR Code
        // A Evolution API usa o instanceName para identificar a instância na rota de conexão
        const instanceIdentifier = instance.instanceName;
        const connectUrl = `${evolutionApiUrl}/instance/connect/${instanceIdentifier}`;
        
        console.log('Conectando instância:', instanceIdentifier, 'URL:', connectUrl);

        const evolutionApiResponse = await axios.get(connectUrl, {
            headers: {
                'apikey': evolutionApiKey, // Chave da API Global da Evolution
                'Content-Type': 'application/json'
            },
            httpsAgent, // Adicionado para controle de SSL
            timeout: 30000 // Timeout de 30 segundos
        });

        if (evolutionApiResponse.status !== 200 || !evolutionApiResponse.data) {
            console.error('Falha ao conectar instância na Evolution API. Status:', evolutionApiResponse.status, 'Data:', evolutionApiResponse.data);
            res.status(evolutionApiResponse.status || 500);
            throw new Error(`Falha ao conectar instância na Evolution API. ${evolutionApiResponse.data?.message || 'Resposta inesperada.'}`);
        }

        // A resposta da Evolution API para /connect pode variar.
        // Geralmente inclui o QR code (base64) e/ou status.
        // Exemplo: { qrcode: { base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...' } }
        // Ou { "instance": { "instanceName": "myinstance", "status": "qrcode" }, "qrcode": { "base64": "..." } }
        // Ou { "pairingCode": "ABCD-EFGH", "code": "...", "count": 1 }

        const qrCodeData = evolutionApiResponse.data;
        console.log('Resposta da Evolution API (connect):', JSON.stringify(qrCodeData, null, 2));

        // Extrair QR code de diferentes formatos de resposta
        let qrCodeBase64 = null;
        let instanceStatus = 'disconnected';

        if (qrCodeData.qrcode?.base64) {
            qrCodeBase64 = qrCodeData.qrcode.base64;
        } else if (qrCodeData.base64) {
            qrCodeBase64 = qrCodeData.base64;
        } else if (qrCodeData.pairingCode) {
            // Para pairing code, não há QR code visual
            console.log('Pairing code recebido:', qrCodeData.pairingCode);
        }

        // Determinar status da instância
        if (qrCodeData.instance?.status) {
            instanceStatus = qrCodeData.instance.status;
        } else if (qrCodeData.status) {
            instanceStatus = qrCodeData.status;
        } else if (qrCodeBase64) {
            instanceStatus = 'qrcode';
        } else if (qrCodeData.pairingCode) {
            instanceStatus = 'pairing';
        }

        // Atualizar o status da instância no banco de dados
        const dataToUpdate = {
            qrCodeBase64: qrCodeBase64,
            status: instanceStatus,
        };

        // Adiciona os novos campos se estiverem presentes na resposta da API de conexão
        if (qrCodeData.instance?.owner) {
            dataToUpdate.ownerJid = qrCodeData.instance.owner;
        }
        if (qrCodeData.instance?.profileName) {
            dataToUpdate.profileName = qrCodeData.instance.profileName;
        }
        if (qrCodeData.instance?.profilePictureUrl) {
            dataToUpdate.profilePictureUrl = qrCodeData.instance.profilePictureUrl;
        }

        const updatedInstance = await prisma.instance.update({
            where: { id: parseInt(instanceId) },
            data: dataToUpdate,
        });

        // Emitir evento Socket.IO para notificar o frontend sobre o QR code e mudança de status
        if (req.io) {
            req.io.to(userId.toString()).emit('instance:qrcode', { 
                instanceId, 
                qrCode: qrCodeBase64,
                pairingCode: qrCodeData.pairingCode,
                status: instanceStatus
            });
            req.io.to(userId.toString()).emit('instance:status_changed', { 
                instanceId, 
                status: updatedInstance.status, 
                instance: updatedInstance 
            });
        }

        // Preparar resposta com todas as informações disponíveis
        const response = {
            qrCodeBase64: qrCodeBase64,
            pairingCode: qrCodeData.pairingCode,
            status: instanceStatus,
            instance: updatedInstance,
            rawResponse: qrCodeData // Para debug, pode ser removido em produção
        };

        res.status(200).json(response);

    } catch (error) {
        if (error.response) {
            console.error('Erro da Evolution API (connect):', error.response.status, error.response.data);
            res.status(error.response.status);
            throw new Error(`Erro da Evolution API: ${error.response.data?.error || error.response.data?.message || error.message}`);
        } else if (error.request) {
            console.error('Erro da Evolution API (connect - request): Sem resposta do servidor.', error.request);
            res.status(503);
            throw new Error('Não foi possível conectar à Evolution API para obter o QR Code.');
        } else {
            console.error('Erro ao conectar instância:', error);
            res.status(res.statusCode || 500);
            throw new Error(error.message || 'Erro interno ao tentar conectar instância.');
        }
    }
});

// @desc    Logout an instance
// @route   POST /api/instances/:instanceId/logout
// @access  Private
const logoutInstance = asyncHandler(async (req, res) => {
    const { instanceId } = req.params;
    const userId = req.user.id;

    try {
        // 1. Buscar a instância no banco de dados
        const instance = await prisma.instance.findUnique({
            where: { id: parseInt(instanceId) },
        });

        if (!instance) {
            res.status(404);
            throw new Error('Instância não encontrada.');
        }

        // Verificar se o usuário é admin ou se é o dono da instância
        if (!req.user.isAdmin && instance.userId !== userId) {
            res.status(403);
            throw new Error('Usuário não autorizado a modificar esta instância.');
        }

        // 2. Buscar EvolutionSettings globais
        const globalSettings = await prisma.evolutionSettings.findFirst();

        if (!globalSettings || !globalSettings.baseUrl || !globalSettings.apiKeyGlobal) {
            res.status(400);
            throw new Error('Configurações da Evolution API não foram definidas pelo administrador. Entre em contato com o administrador do sistema para configurar as credenciais da Evolution API.');
        }

        const { baseUrl: evolutionApiUrl, apiKeyGlobal: evolutionApiKey } = globalSettings;

        // 3. Chamar a Evolution API para desconectar a instância
        const logoutUrl = `${evolutionApiUrl}/instance/logout/${instance.instanceName}`;

        const evolutionApiResponse = await axios.delete(logoutUrl, {
            headers: {
                'apikey': evolutionApiKey, // Chave da API Global da Evolution
            },
        });

        // A Evolution API geralmente retorna um status 200 ou 204 em caso de sucesso no logout.
        // E pode retornar um corpo de resposta com detalhes ou estar vazio.
        if (evolutionApiResponse.status < 200 || evolutionApiResponse.status >= 300) {
            console.error('Falha ao desconectar instância na Evolution API. Status:', evolutionApiResponse.status, 'Data:', evolutionApiResponse.data);
            res.status(evolutionApiResponse.status || 500);
            throw new Error(`Falha ao desconectar instância na Evolution API. ${evolutionApiResponse.data?.message || 'Resposta inesperada.'}`);
        }

        // 4. Atualizar o status da instância no banco de dados
        const updatedInstance = await prisma.instance.update({
            where: { id: parseInt(instanceId) },
            data: { status: 'disconnected', qrCodeBase64: null }, // Atualiza o status e limpa o QR code
        });

        // Emitir evento Socket.IO para notificar o frontend sobre a mudança de status
        if (req.io) {
            req.io.to(userId.toString()).emit('instance:status_changed', { instanceId, status: updatedInstance.status, instance: updatedInstance });
        }

        res.status(200).json({ message: 'Instância desconectada com sucesso.', instance: updatedInstance });

    } catch (error) {
        console.error('Erro ao desconectar instância:', error);
        res.status(res.statusCode || 500);
        if (error.response) { // Erro do Axios (Evolution API)
            console.error('Erro da Evolution API ao desconectar:', error.response.status, error.response.data);
            throw new Error(`Erro da Evolution API ao desconectar: ${error.response.data?.error || error.response.data?.message || error.message}`);
        } else if (error.request) {
            console.error('Erro da Evolution API (request): Sem resposta do servidor ao desconectar.', error.request);
            res.status(503); // Service Unavailable
            throw new Error('Não foi possível conectar à Evolution API para desconectar. Verifique a URL e o servidor.');
        } else {
            throw new Error(error.message || 'Erro interno ao desconectar instância.');
        }
    }
});

// @desc    Delete an instance
// @route   DELETE /api/instances/:instanceId
// @access  Private
const deleteInstance = asyncHandler(async (req, res) => {
    const { instanceId } = req.params;
    const userId = req.user.id;

    try {
        // 1. Buscar a instância no banco de dados
        const instance = await prisma.instance.findUnique({
            where: { id: parseInt(instanceId) },
        });

        if (!instance) {
            res.status(404);
            throw new Error('Instância não encontrada.');
        }

        // Verificar se o usuário é admin ou se é o dono da instância
        if (!req.user.isAdmin && instance.userId !== userId) {
            res.status(403);
            throw new Error('Usuário não autorizado a excluir esta instância.');
        }

        // 2. Buscar EvolutionSettings globais
        const globalSettings = await prisma.evolutionSettings.findFirst();

        if (!globalSettings || !globalSettings.baseUrl || !globalSettings.apiKeyGlobal) {
            res.status(400);
            throw new Error('Configurações da Evolution API não foram definidas pelo administrador. Entre em contato com o administrador do sistema para configurar as credenciais da Evolution API.');
        }

        const { baseUrl: evolutionApiUrl, apiKeyGlobal: evolutionApiKey } = globalSettings;

        // 3. Chamar a Evolution API para excluir a instância
        // Algumas APIs podem ter um endpoint de logout/disconnect e outro de delete/remove.
        // Se a instância já estiver desconectada, o delete pode ser direto.
        // Se estiver conectada, pode ser necessário desconectar primeiro ou o delete já faz isso.
        // A Evolution API usa DELETE /instance/delete/{instanceName}
        const deleteUrl = `${evolutionApiUrl}/instance/delete/${instance.instanceName}`;

        try {
            const evolutionApiResponse = await axios.delete(deleteUrl, {
                headers: {
                    'apikey': evolutionApiKey, // Chave da API Global da Evolution
                },
            });
            // Verificar se a resposta da API indica sucesso (ex: status 200, 202, 204)
            if (evolutionApiResponse.status < 200 || evolutionApiResponse.status >= 300) {
                console.warn('A exclusão na Evolution API retornou um status inesperado:', evolutionApiResponse.status, evolutionApiResponse.data);
                // Dependendo da criticidade, pode-se optar por prosseguir com a exclusão local ou lançar erro.
                // Aqui, vamos logar e prosseguir, pois o objetivo principal é remover do nosso sistema.
            }
        } catch (apiError) {
            // Se a instância não existir na Evolution API (ex: já deletada), pode retornar 404.
            // Considerar 404 como um "sucesso" para a exclusão, pois o estado desejado (instância não existe lá) é alcançado.
            if (apiError.response && apiError.response.status === 404) {
                console.log(`Instância ${instance.instanceName} não encontrada na Evolution API. Considerada como já excluída de lá.`);
            } else {
                // Para outros erros da API, logar e decidir se impede a exclusão local.
                // Neste caso, vamos logar o erro mas permitir a exclusão local para não deixar registros órfãos.
                console.error('Erro ao tentar excluir instância na Evolution API:', apiError.response?.status, apiError.response?.data || apiError.message);
                // Poderia-se lançar um erro aqui se a exclusão na Evolution API for mandatória antes da local.
                // res.status(apiError.response?.status || 500);
                // throw new Error(`Erro ao excluir instância na Evolution API: ${apiError.response?.data?.message || apiError.message}`);
            }
        }

        // Independentemente do resultado da API (ex: 404 se já não existir lá), excluímos do nosso DB
        await prisma.instance.delete({
            where: { id: parseInt(instanceId) },
        });

        // Emitir evento Socket.IO para notificar o frontend sobre a exclusão da instância
        if (req.io) {
            req.io.to(userId.toString()).emit('instance:deleted', { instanceId });
        }

        res.status(200).json({ message: 'Instância excluída com sucesso.' });

    } catch (error) {
        console.error('Erro ao excluir instância:', error);
        res.status(res.statusCode || 500);
        // Tratar erros da Evolution API de forma mais específica se necessário
        if (error.response && error.response.status !== 404) { // Erro do Axios, mas não um 404
            console.error('Erro da Evolution API ao excluir:', error.response.status, error.response.data);
            throw new Error(`Erro da Evolution API ao excluir: ${error.response.data?.error || error.response.data?.message || error.message}`);
        } else if (error.request) {
            console.error('Erro da Evolution API (request): Sem resposta do servidor ao excluir.', error.request);
            res.status(503); // Service Unavailable
            throw new Error('Não foi possível conectar à Evolution API para excluir. Verifique a URL e o servidor.');
        } else if (error.response && error.response.status === 404) {
            // Se a API retornou 404, consideramos a exclusão na API como 'bem-sucedida' (já não existe)
            // e prosseguimos para excluir do nosso banco de dados.
            // Esta lógica já está implícita no fluxo atual, mas pode ser explicitada se necessário.
            console.warn(`Instância ${instance.instanceName} não encontrada na Evolution API durante a exclusão (404). Prosseguindo com a exclusão local.`);
        }
        // Se não for um erro da Evolution API (ou for um 404), ou se for um erro do Prisma, lançamos o erro.
        // A exclusão do Prisma já foi tentada, então se chegou aqui com erro do Prisma, ele será lançado.
        throw new Error(error.message || 'Erro interno ao excluir instância.');
    }
});

// Novo endpoint para buscar QR code específico
const getQrCode = asyncHandler(async (req, res) => {
  const { instanceId } = req.params;
  const userId = req.user.id;

  console.log(`Buscando QR Code para instância ${instanceId} do usuário ${userId}`);

  // Buscar instância - admin pode acessar qualquer instância
  const whereClause = req.user.isAdmin 
    ? { id: parseInt(instanceId) }
    : { id: parseInt(instanceId), userId: userId };
    
  const instance = await prisma.instance.findFirst({
    where: whereClause
  });

  if (!instance) {
    return res.status(404).json({ 
      success: false,
      message: 'Instância não encontrada' 
    });
  }

  if (instance.status !== 'connecting' && instance.status !== 'qrcode') {
    return res.status(400).json({ 
      success: false,
      message: 'QR Code só está disponível quando a instância está conectando' 
    });
  }

  if (!instance.qrCodeBase64) {
    return res.status(400).json({ 
      success: false,
      message: 'QR Code ainda não está disponível. Aguarde alguns segundos e tente novamente.' 
    });
  }

  console.log('QR Code encontrado com sucesso');

  res.json({
    success: true,
    qrCode: instance.qrCodeBase64,
    instanceName: instance.instanceName,
    status: instance.status
  });
});



// @desc    Check and update status of all active instances
// @route   POST /api/instances/check-status
// @access  Private
const checkAndUpdateInstancesStatus = asyncHandler(async (req, res) => {
    try {
        console.log('Iniciando verificação de status das instâncias...');
        
        // Buscar todas as instâncias que não estão com status 'disconnected'
        const activeInstances = await prisma.instance.findMany({
            where: {
                status: {
                    not: 'disconnected'
                }
            }
        });

        console.log(`Encontradas ${activeInstances.length} instâncias ativas para verificação.`);
        
        const updateResults = [];
        
        for (const instance of activeInstances) {
            try {
                console.log(`Verificando status da instância: ${instance.instanceName}`);
                
                // Buscar status atual na Evolution API
                const statusResponse = await getInstanceStatusEvolution(instance.instanceName);
                const evolutionStatus = statusResponse.status;
                
                console.log(`Status da Evolution API para ${instance.instanceName}:`, statusResponse);
                
                let shouldUpdate = false;
                let newStatus = instance.status;
                
                // Determinar se precisa atualizar o status
                if (evolutionStatus.status === 'connected' && instance.status !== 'connected') {
                    newStatus = 'connected';
                    shouldUpdate = true;
                } else if (evolutionStatus.status === 'disconnected' && instance.status !== 'disconnected') {
                    newStatus = 'disconnected';
                    shouldUpdate = true;
                } else if (evolutionStatus.status === 'not_found' && instance.status !== 'disconnected') {
                    newStatus = 'disconnected';
                    shouldUpdate = true;
                }
                
                if (shouldUpdate) {
                    console.log(`Atualizando status da instância ${instance.instanceName} de '${instance.status}' para '${newStatus}'`);
                    
                    // Atualizar no banco de dados
                    await prisma.instance.update({
                        where: { id: instance.id },
                        data: { 
                            status: newStatus,
                            updatedAt: new Date()
                        }
                    });
                    
                    // Emitir evento via Socket.IO para notificar o frontend
                    if (req.io) {
                        req.io.emit('instance:status_changed', {
                            instanceId: instance.id,
                            instanceName: instance.instanceName,
                            oldStatus: instance.status,
                            newStatus: newStatus,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    updateResults.push({
                        instanceName: instance.instanceName,
                        oldStatus: instance.status,
                        newStatus: newStatus,
                        updated: true
                    });
                } else {
                    updateResults.push({
                        instanceName: instance.instanceName,
                        status: instance.status,
                        updated: false
                    });
                }
                
            } catch (error) {
                console.error(`Erro ao verificar status da instância ${instance.instanceName}:`, error.message);
                updateResults.push({
                    instanceName: instance.instanceName,
                    error: error.message,
                    updated: false
                });
            }
        }
        
        console.log('Verificação de status concluída:', updateResults);
        
        res.status(200).json({
            message: 'Verificação de status das instâncias concluída',
            totalInstances: activeInstances.length,
            results: updateResults,
            updatedCount: updateResults.filter(r => r.updated).length
        });
        
    } catch (error) {
        console.error('Erro ao verificar status das instâncias:', error);
        res.status(500).json({
            message: 'Erro interno do servidor ao verificar status das instâncias',
            error: error.message
        });
    }
});

// Alias para getInstances para compatibilidade
const fetchInstances = getInstances;

// Função de sincronização periódica para verificar status real na Evolution API
const syncInstancesStatus = async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronização periódica de status das instâncias...');
    
    // Buscar todas as instâncias do banco
    const allInstances = await prisma.instance.findMany({
      include: {
        user: true
      }
    });

    // Buscar configurações globais da Evolution API
    const globalSettings = await prisma.evolutionSettings.findFirst();

    if (allInstances.length === 0) {
      console.log('📭 Nenhuma instância encontrada para sincronizar.');
      return res ? res.status(200).json({ message: 'Nenhuma instância para sincronizar.' }) : null;
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const instance of allInstances) {
      try {
        // Verificar se existem configurações globais da Evolution API
        if (!globalSettings || !globalSettings.baseUrl) {
          console.log(`⚠️ Configurações globais da Evolution API não encontradas.`);
          continue;
        }

        // Obter status real da Evolution API
        const statusResponse = await getInstanceStatusEvolution(instance.instanceName);
        const realStatus = statusResponse.status;
        // Verificar se há divergência
        if (realStatus !== instance.status) {
          
          // Atualizar no banco de dados
          const updatedInstance = await prisma.instance.update({
            where: { id: instance.id },
            data: { 
              status: realStatus,
              // Limpar QR code se conectado
              qrCodeBase64: realStatus === 'connected' ? null : instance.qrCodeBase64,
              updatedAt: new Date()
            }
          });

          // Emitir evento Socket.IO se disponível
          if (req && req.app && req.app.get('io')) {
            const io = req.app.get('io');
            io.to(`user_${instance.userId}`).emit('instance:status_changed', {
              instanceId: instance.id,
              instanceName: instance.instanceName,
              newStatus: realStatus,
              oldStatus: instance.status,
              instance: updatedInstance
            });
            
            // Se conectou, emitir evento especial
            if (realStatus === 'connected' && instance.status !== 'connected') {
              io.to(`user_${instance.userId}`).emit('instance:connected', {
                instanceId: instance.id,
                instanceName: instance.instanceName,
                message: 'Instância sincronizada e conectada!',
                instance: updatedInstance
              });
            }
          }

          syncedCount++;
        }
      } catch (error) {
        console.error(`❌ Erro ao sincronizar instância ${instance.instanceName}:`, error.message);
        errorCount++;
      }
    }

    const message = `✅ Sincronização concluída: ${syncedCount} atualizadas, ${errorCount} erros.`;
    console.log(message);
    
    return res ? res.status(200).json({ 
      message,
      syncedCount,
      errorCount,
      totalInstances: allInstances.length
    }) : { syncedCount, errorCount };

  } catch (error) {
    console.error('❌ Erro na sincronização periódica:', error);
    return res ? res.status(500).json({ 
      message: 'Erro na sincronização de status.',
      error: error.message 
    }) : null;
  }
};

// Função para iniciar sincronização automática
const startPeriodicSync = (io) => {
  console.log('🚀 Iniciando sincronização automática de status (a cada 12 horas)...');
  
  setInterval(async () => {
    try {
      // Criar um objeto req mock para passar o io
      const mockReq = {
        app: {
          get: (key) => key === 'io' ? io : null
        }
      };
      
      await syncInstancesStatus(mockReq, null);
    } catch (error) {
      console.error('❌ Erro na sincronização automática:', error);
    }
  }, 12 * 60 * 60 * 1000); // 12 horas
};

module.exports = {
     createInstance,
     getInstances,
     fetchInstances,
     connectInstance,
     logoutInstance,
     deleteInstance,
     getQrCode,
     startPeriodicSync,
     syncInstancesStatus // Exportada para uso em rotas manuais
 };