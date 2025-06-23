const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrisma() {
  try {
    console.log('🔍 Testando conexão com o banco de dados...');
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ Conexão com o banco estabelecida com sucesso!');
    
    // Verificar usuários
    const users = await prisma.user.findMany();
    console.log(`📊 Total de usuários: ${users.length}`);
    
    // Verificar configurações
    const settings = await prisma.evolutionSettings.findMany();
    console.log(`📊 Total de configurações: ${settings.length}`);
    
    // Verificar instâncias
    const instances = await prisma.instance.findMany();
    console.log(`📊 Total de instâncias: ${instances.length}`);
    
    console.log('🎉 Teste do Prisma concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste do Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();