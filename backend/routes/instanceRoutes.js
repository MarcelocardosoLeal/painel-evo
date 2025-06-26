const express = require('express');
const { protect, userOnly } = require('../middlewares/authMiddleware');
const {
  createInstance,
  fetchInstances,
  connectInstance,
  logoutInstance,
  deleteInstance,
  getQrCode,
  syncInstancesStatus
} = require('../controllers/instanceController');

const router = express.Router();

// Rotas acessíveis para todos os usuários autenticados (Super Admin e Usuários Comuns)
router.route('/')
  .post(protect, userOnly, createInstance) // Criar nova instância
  .get(protect, userOnly, fetchInstances); // Buscar todas as instâncias

router.route('/:instanceId/connect')
  .get(protect, userOnly, connectInstance); // Conectar instância (Obter QR Code)

router.route('/:instanceId/qrcode')
  .get(protect, userOnly, getQrCode); // Buscar QR Code específico

router.route('/:instanceId/logout')
  .post(protect, userOnly, logoutInstance); // Desconectar instância

router.route('/:instanceId')
  .delete(protect, userOnly, deleteInstance); // Deletar instância

// Rota para sincronização manual de status
router.route('/sync/status')
  .post(protect, userOnly, syncInstancesStatus); // Sincronizar status manualmente

module.exports = router;