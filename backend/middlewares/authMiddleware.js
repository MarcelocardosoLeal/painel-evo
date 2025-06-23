const jwt = require('jsonwebtoken');
const prisma = require('../prisma/db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obter token do header
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decodificado:', decoded);

      // Verificar se userId existe no token
      if (!decoded.userId) {
        console.error('userId não encontrado no token:', decoded);
        return res.status(401).json({ message: 'Não autorizado, token inválido.' });
      }

      // Obter usuário do token (sem a senha)
      req.user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!req.user) {
        return res.status(401).json({ message: 'Não autorizado, usuário não encontrado.' });
      }

      next();
    } catch (error) {
      console.error('Erro na autenticação do token:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Não autorizado, token expirado.' });
      }
      return res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado, nenhum token fornecido.' });
  }
};

// Middleware para Super Admin (acesso total)
const superAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Apenas Super Administradores podem acessar esta funcionalidade.' });
  }
};

// Middleware para usuários comuns (apenas instâncias)
const userOnly = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado. Usuário não autenticado.' });
  }
};

module.exports = { protect, superAdmin, userOnly };