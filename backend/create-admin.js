const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔍 Testando conexão com banco de dados...');
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados!');
    
    // Contar usuários
    const userCount = await prisma.user.count();
    console.log(`📊 Total de usuários: ${userCount}`);
    
    // Verificar se já existe admin
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true }
    });
    
    if (existingAdmin) {
      console.log('✅ Usuário administrador já existe:', existingAdmin.email);
    } else {
      console.log('⚠️ Nenhum usuário administrador encontrado');
      
      // Criar usuário simples sem hash
      const admin = await prisma.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@example.com',
          password: 'password123', // Senha simples por enquanto
          isAdmin: true
        }
      });
      
      console.log('✅ Usuário administrador criado!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Senha: password123');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();