const bcrypt = require('./backend/node_modules/bcryptjs');
const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function verifyPassword() {
  try {
    console.log('🔍 Verificando senha do usuário admin@advancedbot.com.br...');
    
    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { email: 'admin@advancedbot.com.br' }
    });
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:', user.name);
    console.log('🔐 Hash da senha:', user.password);
    
    // Testar senhas comuns
    const commonPasswords = ['123456', 'admin123', 'password', 'admin', '123', 'advancedbot', 'super123'];
    
    for (const password of commonPasswords) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`🔑 Testando '${password}': ${isMatch ? '✅ CORRETO!' : '❌ Incorreto'}`);
      
      if (isMatch) {
        console.log(`\n🎉 Senha encontrada: '${password}'`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPassword();