// Script de debug para testar as funcionalidades do frontend

// Função para testar se o token está válido
function testToken() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  console.log('=== TESTE DE TOKEN ===');
  console.log('Token presente:', !!token);
  console.log('Usuário:', user);
  console.log('É admin:', user.isAdmin);
  
  if (token) {
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
  }
}

// Função para testar requisições básicas
async function testBasicRequests() {
  console.log('=== TESTE DE REQUISIÇÕES ===');
  
  try {
    // Teste de instâncias
    console.log('Testando GET /instances...');
    const instancesResponse = await fetch('http://localhost:5000/api/instances', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Instâncias - Status:', instancesResponse.status);
    const instancesData = await instancesResponse.json();
    console.log('Instâncias - Data:', instancesData);
    
  } catch (error) {
    console.error('Erro ao testar instâncias:', error);
  }
  
  try {
    // Teste de configurações Evolution
    console.log('Testando GET /evolution-settings...');
    const evolutionResponse = await fetch('http://localhost:5000/api/evolution-settings', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Evolution Settings - Status:', evolutionResponse.status);
    const evolutionData = await evolutionResponse.json();
    console.log('Evolution Settings - Data:', evolutionData);
    
  } catch (error) {
    console.error('Erro ao testar evolution settings:', error);
  }
  
  try {
    // Teste de usuários (apenas para admin)
    console.log('Testando GET /users...');
    const usersResponse = await fetch('http://localhost:5000/api/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Users - Status:', usersResponse.status);
    const usersData = await usersResponse.json();
    console.log('Users - Data:', usersData);
    
  } catch (error) {
    console.error('Erro ao testar users:', error);
  }
}

// Função para testar Socket.IO
function testSocketIO() {
  console.log('=== TESTE DE SOCKET.IO ===');
  
  try {
    // Verificar se o socket está disponível globalmente
    if (window.io) {
      console.log('Socket.IO library disponível');
      
      const token = localStorage.getItem('token');
      const socket = window.io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });
      
      socket.on('connect', () => {
        console.log('✅ Socket conectado:', socket.id);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('❌ Socket desconectado:', reason);
      });
      
      socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão Socket:', error);
      });
      
      // Testar por 10 segundos
      setTimeout(() => {
        socket.disconnect();
        console.log('Socket desconectado após teste');
      }, 10000);
      
    } else {
      console.log('Socket.IO library não disponível');
    }
  } catch (error) {
    console.error('Erro ao testar Socket.IO:', error);
  }
}

// Executar todos os testes
console.log('🚀 Iniciando testes de debug do frontend...');
testToken();
testBasicRequests();
testSocketIO();

console.log('\n📋 Para executar este script no console do navegador:');
console.log('1. Abra o DevTools (F12)');
console.log('2. Vá para a aba Console');
console.log('3. Cole este código e pressione Enter');
console.log('4. Verifique os resultados dos testes');