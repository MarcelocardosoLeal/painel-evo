const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPassword() {
  try {
    console.log('🔍 Verificando senha do usuário admin@advancedbot.com.br...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'admin@advancedbot.com.br' }
    });
    
    if (!user) {
      console.log('❌ Usuário não encontrado.');
      return;
    }
    
    console.log('✅ Usuário encontrado:', user.name);
    console.log('🔐 Hash da senha no banco:', user.password);
    
    // Testar várias senhas possíveis
    const possiblePasswords = ['123456', 'admin123', 'password', 'admin', '123'];
    
    for (const password of possiblePasswords) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`🔑 Testando senha '${password}': ${isMatch ? '✅ CORRETA' : '❌ incorreta'}`);
      
      if (isMatch) {
        console.log(`🎉 Senha correta encontrada: '${password}'`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar senha:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPassword();