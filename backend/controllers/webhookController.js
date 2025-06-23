const prisma = require('../prisma/db');

// @desc    Process incoming webhooks from Evolution API
// @route   POST /api/webhooks/evolution
// @access  Public (but should be secured, e.g., with a secret token)
const handleEvolutionWebhook = async (req, res) => {
    console.log('Webhook da Evolution API recebido.');

    // Verificação do token secreto do webhook
    const webhookToken = req.headers['x-webhook-secret'] || req.query.secret_token;
    if (process.env.EVOLUTION_WEBHOOK_SECRET && webhookToken !== process.env.EVOLUTION_WEBHOOK_SECRET) {
        console.warn('Webhook da Evolution API: Tentativa de acesso com token inválido ou ausente.');
        return res.status(401).json({ message: 'Acesso não autorizado ao webhook.' });
    }
    console.log('Token do webhook verificado com sucesso.');

    console.log('Payload do Webhook:', JSON.stringify(req.body, null, 2));
    const { instance, event, data } = req.body;

    if (!instance || !event) {
        console.warn('Webhook da Evolution API: Dados incompletos (instância ou evento faltando).');
        return res.status(400).json({ message: 'Dados incompletos no webhook.' });
    }

    try {
        const existingInstance = await prisma.instance.findFirst({
            where: { instanceName: instance }, // Assumindo que 'instance' no webhook é o instanceName
        });

        if (!existingInstance) {
            console.warn(`Webhook da Evolution API: Instância '${instance}' não encontrada no banco de dados.`);
            // Decidir se retorna erro ou apenas ignora. Por ora, ignoramos para não travar a API da Evolution.
            return res.status(200).json({ message: 'Instância não encontrada, webhook ignorado.' });
        }

        let statusToUpdate = existingInstance.status;
        let qrCodeToUpdate = existingInstance.qrCodeBase64;
        let shouldUpdate = false;

        // Mapear eventos da Evolution API para os status do nosso sistema
        switch (event) {
            case 'QRCODE_UPDATED':
                statusToUpdate = 'qrcode'; // Status para QR Code gerado
                qrCodeToUpdate = data?.qrcode; // Supondo que 'data.qrcode' contém o base64 do QR
                shouldUpdate = true;
                console.log(`🔄 Webhook: QR Code atualizado para a instância ${instance}`);
                break;
            case 'CONNECTION_UPDATE':
                console.log(`🔄 Webhook CONNECTION_UPDATE para ${instance}:`, data);
                const connectionState = data?.state?.toLowerCase();
                
                switch (connectionState) {
                    case 'open':
                        statusToUpdate = 'connected';
                        qrCodeToUpdate = null; // Limpar QR code após conectar
                        shouldUpdate = true;
                        console.log(`✅ Webhook: Instância ${instance} CONECTADA! Estado: open`);
                        break;
                    case 'connecting':
                        statusToUpdate = 'connecting';
                        shouldUpdate = true;
                        console.log(`🔄 Webhook: Instância ${instance} está conectando...`);
                        break;
                    case 'close':
                    case 'disconnected':
                    case 'logout':
                        statusToUpdate = 'disconnected';
                        qrCodeToUpdate = null; // Limpar QR code quando desconectar
                        shouldUpdate = true;
                        console.log(`❌ Webhook: Instância ${instance} desconectada. Estado: ${connectionState}`);
                        break;
                    case 'qr':
                    case 'qrcode':
                        statusToUpdate = 'qrcode';
                        shouldUpdate = true;
                        console.log(`📱 Webhook: Instância ${instance} aguardando QR Code. Estado: ${connectionState}`);
                        break;
                    default:
                        console.log(`⚠️ Webhook: Estado CONNECTION_UPDATE não mapeado para ${instance}: ${connectionState}`);
                        // Não atualizar status para estados desconhecidos
                        return res.status(200).json({ message: `Estado '${connectionState}' não mapeado.` });
                }
                break;
            case 'MESSAGES_UPSERT':
                // Quando recebemos mensagens, significa que a instância está conectada
                if (existingInstance.status !== 'connected') {
                    statusToUpdate = 'connected';
                    qrCodeToUpdate = null;
                    shouldUpdate = true;
                    console.log(`✅ Webhook: Instância ${instance} detectada como conectada via mensagem recebida.`);
                } else {
                    // Não atualizar status se já está conectado
                    console.log(`📱 Webhook: Mensagem recebida na instância ${instance} (já conectada).`);
                    return res.status(200).json({ message: 'Mensagem processada, status já atualizado.' });
                }
                break;
            case 'INSTANCE_CONNECT':
                statusToUpdate = 'connected';
                qrCodeToUpdate = null;
                shouldUpdate = true;
                console.log(`✅ Webhook: Evento INSTANCE_CONNECT - Instância ${instance} conectada!`);
                break;
            case 'INSTANCE_DISCONNECT':
                statusToUpdate = 'disconnected';
                shouldUpdate = true;
                console.log(`❌ Webhook: Evento INSTANCE_DISCONNECT - Instância ${instance} desconectada.`);
                break;
            // Adicionar mais casos conforme necessário para outros eventos da Evolution API
            default:
                console.log(`⚠️ Webhook da Evolution API: Evento '${event}' não tratado para a instância ${instance}.`);
                return res.status(200).json({ message: `Evento '${event}' não tratado.` });
        }

        if (shouldUpdate && (statusToUpdate !== existingInstance.status || qrCodeToUpdate !== existingInstance.qrCodeBase64)) {
            console.log(`🔄 Atualizando status no banco: ${existingInstance.status} → ${statusToUpdate}`);
            
            const updatedInstance = await prisma.instance.update({
                where: { id: existingInstance.id },
                data: {
                    status: statusToUpdate,
                    qrCodeBase64: qrCodeToUpdate,
                    updatedAt: new Date(),
                },
            });

            console.log(`✅ Status atualizado com sucesso no banco para ${instance}`);

            // Emitir evento Socket.IO para notificar o frontend
            if (req.io) {
                // Emitir para a sala do usuário dono da instância
                req.io.to(existingInstance.userId.toString()).emit('instance:status_changed', {
                    instanceId: existingInstance.id,
                    status: updatedInstance.status,
                    qrCode: updatedInstance.qrCodeBase64,
                    instance: updatedInstance, // Envia a instância completa atualizada
                });
                console.log(`📡 Socket.IO: Evento 'instance:status_changed' emitido para userId: ${existingInstance.userId}`);
                
                // Se a instância foi conectada, emitir evento especial
                if (statusToUpdate === 'connected') {
                    req.io.to(existingInstance.userId.toString()).emit('instance:connected', {
                        instanceId: existingInstance.id,
                        instanceName: instance,
                        message: 'QR Code escaneado! Instância conectada com sucesso.',
                        instance: updatedInstance
                    });
                    console.log(`🎉 Socket.IO: Evento 'instance:connected' emitido para userId: ${existingInstance.userId}`);
                }
            } else {
                console.warn('⚠️ Socket.IO não está disponível no request. Não foi possível emitir evento de atualização de status via webhook.');
            }
        } else {
            console.log(`⏭️ Webhook: Nenhum status alterado para a instância ${instance}, evento ${event}.`);
        }

        res.status(200).json({ 
            message: 'Webhook processado com sucesso.',
            instance: instance,
            event: event,
            statusUpdated: statusToUpdate !== existingInstance.status
        });

    } catch (error) {
        console.error('Erro ao processar webhook da Evolution API:', error);
        res.status(500).json({ message: 'Erro interno ao processar webhook.', error: error.message });
    }
};

module.exports = {
    handleEvolutionWebhook,
};