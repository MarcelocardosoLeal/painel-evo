const express = require('express');
const router = express.Router();
const { register, login, updateProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Rota para registrar um novo usuário
// POST /api/auth/register
router.post('/register', register);

// Rota para login de usuário
// POST /api/auth/login
router.post('/login', login);

// Rota para atualizar perfil do usuário
// PUT /api/auth/profile
router.put('/profile', protect, updateProfile);

module.exports = router;