const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'password123'; // Lembre-se de trocar isso em produção!

  // Verifica se o usuário admin já existe
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Usuário administrador já existe.');
    return;
  }

  // Cria o hash da senha
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Cria o usuário administrador
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true, // Adiciona um campo isAdmin ao seu modelo User no schema.prisma se necessário
    },
  });

  console.log('Usuário administrador criado com sucesso:', adminUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });