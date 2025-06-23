const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Importar função de sincronização periódica
const { startPeriodicSync } = require('./controllers/instanceController');

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware para adicionar io a cada requisição
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/', (req, res) => {
  res.send('Painel Evo Backend is running!');
});

// Rotas da API
const authRoutes = require('./routes/authRoutes');
const instanceRoutes = require('./routes/instanceRoutes');
const evolutionSettingsRoutes = require('./routes/evolutionSettingsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const userRoutes = require('./routes/userRoutes'); // Adicionar rotas de usuários

app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/evolution-settings', evolutionSettingsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/users', userRoutes); // Usar as rotas de usuários

// Middleware de autenticação para Socket.IO
const jwt = require('jsonwebtoken');
const prisma = require('./prisma/db'); // Certifique-se que o caminho está correto

// Controle de logs para evitar spam
let lastJwtErrorLog = 0;
let jwtErrorCount = 0;
const JWT_LOG_INTERVAL = 60000; // 1 minuto

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Opcional: buscar o usuário no banco para garantir que ainda existe/está ativo
            const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user) {
                return next(new Error('Authentication error: User not found.'));
            }
            socket.user = user; // Adiciona o objeto user ao socket
            next();
        } catch (err) {
            // Controlar logs de JWT expired para evitar spam
            const now = Date.now();
            if (err.message === 'jwt expired') {
                jwtErrorCount++;
                if (now - lastJwtErrorLog > JWT_LOG_INTERVAL) {
                    console.log(`⚠️  ${jwtErrorCount} tentativas de conexão com JWT expirado no último minuto (normal - tokens sendo renovados automaticamente)`);
                    lastJwtErrorLog = now;
                    jwtErrorCount = 0;
                }
            } else {
                console.error('Socket authentication error:', err.message);
            }
            next(new Error('Authentication error: Invalid token.'));
        }
    } else {
        next(new Error('Authentication error: No token provided.'));
    }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id, 'User ID:', socket.user.id);

  // Associar o socket a uma sala específica do usuário
  socket.join(socket.user.id.toString());

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Outros eventos do Socket.IO podem ser adicionados aqui
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Iniciar sincronização periódica de status das instâncias
  startPeriodicSync(io);
});

module.exports = { app, server, io }; // Exportar para possíveis testes ou outros módulos