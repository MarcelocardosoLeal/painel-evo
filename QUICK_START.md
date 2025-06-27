# 🚀 Guia de Inicialização Rápida - Painel Evolution

## ⚡ Comandos Essenciais

### 🔧 Configuração Inicial (Apenas uma vez)

```bash
# 1. Clone o repositório
git clone https://github.com/your-username/painel-evo.git
cd painel-evo

# 2. Configure o backend
cd backend
npm install
cp .env.example .env
# Edite o .env com suas configurações de banco
npx prisma generate
npx prisma migrate deploy
node seed.js  # Cria usuário admin padrão

# 3. Configure o frontend
cd ../frontend
npm install
```

### 🚀 Inicialização Diária (2 terminais)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
*✅ Backend rodando na porta 5000*

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
*✅ Frontend rodando na porta 8080*

## 🌐 URLs de Acesso

| Serviço | URL | Descrição |
|---------|-----|----------|
| **Frontend** | http://localhost:8080 | Interface do usuário |
| **Backend API** | http://localhost:5000 | API REST |
| **Evolution API** | http://localhost:8080 | Serviço externo (configurável) |

## 🔑 Credenciais Padrão

- **Email:** admin@painelevo.com.br
- **Senha:** admin123
- **⚠️ Importante:** Altere a senha após o primeiro login

## 📋 Checklist de Verificação

### ✅ Backend (Porta 5000)
- [ ] `cd backend && npm run dev` executa sem erros
- [ ] Arquivo `.env` configurado com `PORT=5000`
- [ ] PostgreSQL rodando
- [ ] Mensagem "Server is running on port 5000" aparece
- [ ] Acesso a http://localhost:5000 retorna "Painel Evo Backend is running!"

### ✅ Frontend (Porta 8080)
- [ ] `cd frontend && npm run dev` executa sem erros
- [ ] Mensagem "Local: http://localhost:8080/" aparece
- [ ] Acesso a http://localhost:8080 carrega a tela de login
- [ ] Login funciona e redireciona para dashboard

## 🔧 Configuração do .env

**Arquivo: `backend/.env`**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/painel_evo"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret"

# Server Configuration
PORT=5000
FRONTEND_URL="http://localhost:8080"

# Evolution API
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="your-evolution-api-key"

# Webhook Configuration
DEFAULT_WEBHOOK_URL="http://localhost:5000/api/webhooks/evolution"
```

## 🆘 Problemas Comuns

### ❌ "Port 5000 is already in use"
```bash
# Encontrar processo usando a porta
netstat -ano | findstr :5000
# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

### ❌ "Port 8080 is already in use"
```bash
# Encontrar processo usando a porta
netstat -ano | findstr :8080
# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

### ❌ Erro de login
```bash
# Recriar usuário admin
cd backend
node seed.js
```

### ❌ Erro de banco de dados
```bash
# Regenerar banco
cd backend
npx prisma generate
npx prisma db push
node seed.js
```

## 📚 Documentação Adicional

- **README.md** - Visão geral do projeto
- **DOCUMENTACAO_COMPLETA.md** - Documentação técnica detalhada
- **TROUBLESHOOTING.md** - Soluções para problemas específicos
- **CHANGELOG.md** - Histórico de versões e correções

---

**Versão:** 1.1.0  
**Última atualização:** Janeiro 2025  
**Status:** ✅ Sistema totalmente funcional