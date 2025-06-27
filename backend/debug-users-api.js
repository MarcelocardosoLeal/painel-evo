const axios = require('axios');

// Configurar axios para usar o backend local
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

async function debugUsersAPI() {
  try {
    console.log('🔍 Testando API de usuários...');
    
    // 1. Testar login
    console.log('\n1. Fazendo login...');
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@painelevo.com.br',
      password: 'admin123'
    });
    
    console.log('Response status:', loginResponse.status);
    console.log('Response data:', loginResponse.data);
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');
    console.log('Token:', token.substring(0, 20) + '...');
    
    // 2. Configurar token para próximas requisições
    api.defaults.headers.Authorization = `Bearer ${token}`;
    
    // 3. Testar endpoint de usuários
    console.log('\n2. Testando endpoint /users...');
    const usersResponse = await api.get('/users');
    console.log('✅ Usuários obtidos com sucesso:');
    console.log('Total de usuários:', usersResponse.data.length);
    usersResponse.data.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Admin: ${user.isAdmin}`);
    });
    
    // 4. Testar endpoint de estatísticas
    console.log('\n3. Testando endpoint /users/stats...');
    const statsResponse = await api.get('/users/stats');
    console.log('✅ Estatísticas obtidas com sucesso:');
    console.log(statsResponse.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('❌ Erro completo:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('Request:', error.request);
    } else {
      console.error('Config:', error.config);
    }
  }
}

debugUsersAPI();