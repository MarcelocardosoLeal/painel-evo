const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');

// Registrar um novo usuário
const register = async (req, res) => {
  const { name, email, password, isAdmin } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe com este email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin: isAdmin || false, // Padrão para não admin se não especificado
      },
    });

    // Não retornar a senha no response
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'Usuário registrado com sucesso!', user: userWithoutPassword });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.', error: error.message });
  }
};

// Login de usuário
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Usuário não encontrado
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Senha incorreta
    }

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Token expira em 24 horas
    );

    // Não retornar a senha no response
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      message: 'Login bem-sucedido!', 
      token, 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao fazer login.', error: error.message });
  }
};

// Atualizar perfil do usuário
const updateProfile = async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  const userId = req.user.userId; // Obtido do middleware de autenticação

  if (!name || !email) {
    return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
  }

  try {
    // Buscar usuário atual
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Verificar se o email já está em uso por outro usuário
    if (email !== user.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Este email já está em uso por outro usuário.' });
      }
    }

    const updateData = {
      name,
      email,
    };

    // Se está alterando a senha
    if (currentPassword && newPassword) {
      // Verificar senha atual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Senha atual incorreta.' });
      }

      // Validar nova senha
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Nova senha deve ter pelo menos 6 caracteres.' });
      }

      // Hash da nova senha
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Não retornar a senha no response
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ 
      message: 'Perfil atualizado com sucesso!', 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar perfil.', error: error.message });
  }
};

module.exports = {
  register,
  login,
  updateProfile,
};