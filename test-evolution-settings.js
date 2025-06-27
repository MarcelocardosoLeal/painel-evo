const axios = require('axios');

// Configurar axios
axios.defaults.baseURL = 'http://localhost:5000/api';

async function testEvolutionSettings() {
  try {
    console.log('🧪 Testando salvamento das configurações da Evolution API...');
    
    // Primeiro, fazer login para obter o token
    const loginResponse = await axios.post('/auth/login', {
      email: 'admin@admin.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    
    // Configurar o token para as próximas requisições
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Testar GET das configurações
    console.log('\n📥 Testando GET /evolution-settings...');
    try {
      const getResponse = await axios.get('/evolution-settings');
      console.log('✅ GET funcionou:', getResponse.data);
    } catch (getError) {
      console.log('❌ GET falhou:', getError.response?.status, getError.response?.data);
    }
    
    // Testar POST das configurações
    console.log('\n📤 Testando POST /evolution-settings...');
    const postData = {
      ev_api_url: 'https://evolution2.advancedbot.com.br',
      ev_api_key_global: 'test-key-123'
    };
    
    console.log('📝 Dados a serem enviados:', postData);
    
    const postResponse = await axios.post('/evolution-settings', postData);
    console.log('✅ POST funcionou:', postResponse.data);
    
    // Verificar se os dados foram salvos
    console.log('\n🔍 Verificando se os dados foram salvos...');
    const verifyResponse = await axios.get('/evolution-settings');
    console.log('📊 Dados salvos:', verifyResponse.data);
    
  } catch (error) {
    console.error('❌ Erro no teste:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

testEvolutionSettings();