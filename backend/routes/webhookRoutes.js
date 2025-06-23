const express = require('express');
const router = express.Router();
const { handleEvolutionWebhook } = require('../controllers/webhookController');

// Rota para receber webhooks da Evolution API
// A Evolution API fará um POST para esta URL
router.post('/evolution', handleEvolutionWebhook);

module.exports = router;
