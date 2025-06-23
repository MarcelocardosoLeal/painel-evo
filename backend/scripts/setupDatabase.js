const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando estado atual do banco de dados...');
  
  // 1. Verificar usuários existentes
  const users = await prisma.user.findMany();
  console.log(`📊 Total de usuários no banco: ${users.length}`);
  
  if (users.length > 0) {
    console.log('👥 Usuários encontrados:');
    users.forEach(user => {
      console.log(`  - ${user.email} (Admin: ${user.isAdmin})`);
    });
  }
  
  // 2. Criar usuário admin se não existir
  const adminEmail = 'admin@example.com';
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  
  if (!adminUser) {
    console.log('🔧 Criando usuário administrador...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    adminUser = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        password: hashedPassword,
        isAdmin: true,
      },
    });
    console.log('✅ Usuário administrador criado com sucesso!');
  } else {
    console.log('✅ Usuário administrador já existe.');
  }
  
  // 3. Verificar configurações da Evolution API
  const evolutionSettings = await prisma.evolutionSettings.findMany();
  console.log(`📊 Total de configurações Evolution: ${evolutionSettings.length}`);
  
  if (evolutionSettings.length === 0) {
    console.log('🔧 Criando configurações padrão da Evolution API...');
    
    const defaultSettings = await prisma.evolutionSettings.create({
      data: {
        baseUrl: 'https://evolutionv2.advancedbot.com.br', // URL padrão da Evolution API
        apiKeyGlobal: '0417bf43b0a8669bd6635bcb49d783df', // API Key da documentação
      },
    });
    console.log('✅ Configurações da Evolution API criadas com sucesso!');
  } else {
    console.log('✅ Configurações da Evolution API já existem.');
    evolutionSettings.forEach(setting => {
      console.log(`  - Base URL: ${setting.baseUrl}`);
    });
  }
  
  // 4. Verificar instâncias
  const instances = await prisma.instance.findMany();
  console.log(`📊 Total de instâncias: ${instances.length}`);
  
  console.log('\n🎉 Setup do banco de dados concluído!');
  console.log('\n📋 Resumo:');
  console.log(`   - Usuários: ${(await prisma.user.findMany()).length}`);
  console.log(`   - Configurações Evolution: ${(await prisma.evolutionSettings.findMany()).length}`);
  console.log(`   - Instâncias: ${(await prisma.instance.findMany()).length}`);
  
  console.log('\n🔑 Credenciais do Admin:');
  console.log('   Email: admin@example.com');
  console.log('   Senha: password123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o setup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });