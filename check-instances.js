const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInstances() {
  try {
    console.log('🔍 Verificando instâncias no banco de dados...');
    
    const instances = await prisma.instance.findMany({
      select: {
        id: true,
        instanceName: true,
        evolutionInstanceId: true,
        status: true,
        qrCodeBase64: true,
        userId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`\n📊 Total de instâncias encontradas: ${instances.length}\n`);
    
    instances.forEach((instance, index) => {
      console.log(`--- Instância ${index + 1} ---`);
      console.log(`ID: ${instance.id}`);
      console.log(`Nome: ${instance.instanceName}`);
      console.log(`Evolution ID: ${instance.evolutionInstanceId || 'N/A'}`);
      console.log(`Status: ${instance.status}`);
      console.log(`User ID: ${instance.userId}`);
      console.log(`QR Code: ${instance.qrCodeBase64 ? 'Presente' : 'Ausente'}`);
      console.log(`Criado em: ${instance.createdAt}`);
      console.log(`Atualizado em: ${instance.updatedAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao consultar instâncias:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstances();