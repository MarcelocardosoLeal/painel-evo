console.log('🔍 Testando Node.js básico...');
console.log('✅ Node.js está funcionando!');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

try {
  const express = require('express');
  console.log('✅ Express carregado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao carregar Express:', error.message);
}

try {
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ PrismaClient carregado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao carregar PrismaClient:', error.message);
}

console.log('🎉 Teste simples concluído!');