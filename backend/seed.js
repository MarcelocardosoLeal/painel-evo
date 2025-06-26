const { PrismaClient } = require('../node_modules/@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar se já existe um usuário admin
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true }
    });

    if (existingAdmin) {
      console.log('Usuário administrador já existe:', existingAdmin.email);
      return;
    }

    // Criar usuário administrador padrão
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@painelevo.com.br',
        password: hashedPassword,
        isAdmin: true
      }
    });

    console.log('Usuário administrador criado com sucesso!');
    console.log('Email: admin@painelevo.com.br');
    console.log('Senha: admin123');
    console.log('ID:', adminUser.id);
    
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();