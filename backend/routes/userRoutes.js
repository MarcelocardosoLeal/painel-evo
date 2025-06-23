const express = require('express');
const { protect, superAdmin } = require('../middlewares/authMiddleware');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');

const router = express.Router();

// Todas as rotas de usuários são protegidas e requerem Super Admin
router.use(protect, superAdmin);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Super Admin only)
router.get('/stats', getUserStats);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Super Admin only)
router.get('/', getAllUsers);

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Super Admin only)
router.post('/', createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Super Admin only)
router.put('/:id', updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Super Admin only)
router.delete('/:id', deleteUser);

module.exports = router;