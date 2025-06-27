const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const prisma = require('../prisma/db');

// @desc    Get all users (Super Admin only)
// @route   GET /api/users
// @access  Private (Super Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            instances: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
  }
});

// @desc    Create a new user (Super Admin only)
// @route   POST /api/users
// @access  Private (Super Admin)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, isAdmin } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe com este email.' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin: isAdmin || false
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({ 
      message: 'Usuário criado com sucesso!', 
      user: newUser 
    });

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar usuário.' });
  }
});

// @desc    Update user (Super Admin only)
// @route   PUT /api/users/:id
// @access  Private (Super Admin)
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, isAdmin, password } = req.body;

  try {
    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Preparar dados para atualização
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;
    
    // Se uma nova senha foi fornecida, fazer hash
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Verificar se email já existe (se está sendo alterado)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email já está em uso por outro usuário.' });
      }
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({ 
      message: 'Usuário atualizado com sucesso!', 
      user: updatedUser 
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar usuário.' });
  }
});

// @desc    Delete user (Super Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Super Admin)
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar se o usuário existe
    const existingUser = await prisma.user.findUnique({ 
      where: { id: parseInt(id) },
      include: {
        instances: true
      }
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Não permitir deletar o próprio usuário
    if (existingUser.id === req.user.id) {
      return res.status(400).json({ message: 'Você não pode deletar sua própria conta.' });
    }

    // Verificar se o usuário tem instâncias
    if (existingUser.instances.length > 0) {
      return res.status(400).json({ 
        message: `Não é possível deletar usuário. Ele possui ${existingUser.instances.length} instância(s) ativa(s). Delete as instâncias primeiro.` 
      });
    }

    // Deletar usuário
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ message: 'Usuário deletado com sucesso!' });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar usuário.' });
  }
});

// @desc    Get user statistics (Super Admin only)
// @route   GET /api/users/stats
// @access  Private (Super Admin)
const getUserStats = asyncHandler(async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalAdmins = await prisma.user.count({ where: { isAdmin: true } });
    const totalCommonUsers = totalUsers - totalAdmins;
    const totalInstances = await prisma.instance.count();
    
    // Usuários com mais instâncias
    const usersWithInstances = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            instances: true
          }
        }
      },
      orderBy: {
        instances: {
          _count: 'desc'
        }
      },
      take: 5
    });

    res.status(200).json({
      totalUsers,
      totalAdmins,
      totalCommonUsers,
      totalInstances,
      usersWithInstances
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar estatísticas.' });
  }
});

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
};