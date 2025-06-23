# 🆘 **TROUBLESHOOTING - PAINEL EVO**

## 📖 **COMO USAR ESTE GUIA**

### 🎯 **Ordem Recomendada para Resolver Problemas:**

1. **🆘 TROUBLESHOOTING.md** (este arquivo) - Soluções rápidas
2. **📖 DOCUMENTACAO_COMPLETA.md** - Seção "PROBLEMAS COMUNS E SOLUÇÕES"
3. **📝 CHANGELOG.md** - Seção "CÓDIGO CRÍTICO CORRIGIDO"
4. **📋 README.md** - Se precisar reconstruir do zero

### 🔍 **Navegação Rápida neste Arquivo:**
- 🚨 **PROBLEMAS MAIS COMUNS** (abaixo)
- 🔍 **CHECKLIST DE VERIFICAÇÃO RÁPIDA**
- 🆘 **RECONSTRUÇÃO COMPLETA**

---

## 🚨 PROBLEMAS MAIS COMUNS E SOLUÇÕES RÁPIDAS

### ❌ Erro: "Cannot POST /manager/instance/create"

**CAUSA:** URL base da Evolution API incorreta no banco de dados

**SOLUÇÃO RÁPIDA:**
```bash
# 1. Abra o Prisma Studio
cd backend
npx prisma studio

# 2. Vá para a tabela "EvolutionSettings"
# 3. Edite o campo "baseUrl" removendo "/manager" do final
# CORRETO: http://localhost:8080
# INCORRETO: http://localhost:8080/manager
```

---

### ❌ Erro: "Webhook endpoint not found" ou "Not Found"

**CAUSA:** Endpoint de webhook incorreto no código

**SOLUÇÃO:** Verificar arquivo `backend/services/evolutionService.js`

```javascript
// PROCURE POR ESTA LINHA E CORRIJA:

// ❌ INCORRETO:
const webhookUrl = `${baseUrl}/webhook/instance`;

// ✅ CORRETO:
const webhookUrl = `${baseUrl}/webhook/set/${instanceName}`;
```

---

### ❌ QR Code não aparece no modal

**CAUSAS POSSÍVEIS:**
1. Evolution API não está rodando
2. Configurações incorretas no banco
3. Erro na criação da instância

**SOLUÇÕES:**
```bash
# 1. Verificar se Evolution API está rodando
curl http://localhost:8080/manager/instance

# 2. Verificar logs do backend
cd backend
node server.js
# Observe os logs para erros específicos

# 3. Verificar configurações no Prisma Studio
npx prisma studio
# Tabela EvolutionSettings deve ter baseUrl e apiKey corretos
```

---

### ❌ Instância criada mas não conecta

**CAUSA:** Payload do webhook com campos desnecessários

**SOLUÇÃO:** Verificar arquivo `backend/services/evolutionService.js`

```javascript
// PROCURE PELA FUNÇÃO setupWebhookEvolution e corrija:

// ❌ INCORRETO:
const webhookData = {
  instanceName: instanceName, // REMOVER ESTA LINHA
  webhook: {
    url: webhookUrl,
    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
  }
};

// ✅ CORRETO:
const webhookData = {
  webhook: {
    url: webhookUrl,
    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
  }
};
```

---

### ❌ Erro de conexão com banco de dados

**SOLUÇÃO:**
```bash
# 1. Verificar arquivo .env no backend
cd backend
cat .env

# 2. Verificar se PostgreSQL está rodando
# Windows:
services.msc
# Procurar por PostgreSQL

# 3. Testar conexão
npx prisma db push
```

---

### ❌ Frontend não carrega ou erro 404

**SOLUÇÕES:**
```bash
# 1. Verificar se dependências estão instaladas
cd frontend
npm install

# 2. Iniciar servidor de desenvolvimento
npm run serve

# 3. Verificar porta (padrão: 8080)
# Acessar: http://localhost:8080
```

---

### ❌ Erro de autenticação ou token inválido

**SOLUÇÕES:**
```bash
# 1. Limpar localStorage do navegador
# F12 > Application > Local Storage > Clear All

# 2. Verificar JWT_SECRET no .env
cd backend
echo $JWT_SECRET

# 3. Recriar usuário admin se necessário
node create-admin.js
```

---

## 🔍 CHECKLIST DE VERIFICAÇÃO RÁPIDA

### Backend (Porta 5000)
- [ ] `cd backend && node server.js` roda sem erros
- [ ] Arquivo `.env` existe e está configurado
- [ ] PostgreSQL está rodando
- [ ] `npx prisma studio` abre sem erros
- [ ] Tabela `EvolutionSettings` tem `baseUrl` SEM `/manager`

### Frontend (Porta 8080)
- [ ] `cd frontend && npm run serve` roda sem erros
- [ ] `http://localhost:8080` carrega a tela de login
- [ ] Login funciona e redireciona para dashboard
- [ ] Não há erros no console do navegador (F12)

### Evolution API
- [ ] Evolution API está rodando na porta configurada
- [ ] `curl http://localhost:8080/manager/instance` retorna dados
- [ ] API Key está correta no banco de dados

### Funcionalidades
- [ ] Criação de instância não retorna erro 404
- [ ] QR Code aparece no modal
- [ ] Status da instância atualiza em tempo real
- [ ] Usuários comuns não veem configurações admin

---

## 🆘 SE NADA FUNCIONAR - RECONSTRUÇÃO COMPLETA

```bash
# 1. Backup do banco (se necessário)
pg_dump painel_evo > backup.sql

# 2. Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# 3. Recriar banco
cd backend
npx prisma db push --force-reset
node create-admin.js

# 4. Configurar Evolution API no Prisma Studio
npx prisma studio
# baseUrl: http://localhost:8080 (SEM /manager)
# apiKey: sua_chave_da_evolution_api

# 5. Testar tudo novamente
node server.js
```

---

## 📞 ONDE BUSCAR MAIS AJUDA

1. **Documentação Completa:** `DOCUMENTACAO_COMPLETA.md`
2. **Histórico de Mudanças:** `CHANGELOG.md`
3. **Visão Geral:** `README.md`
4. **Logs do Sistema:** Console do backend e frontend
5. **Prisma Studio:** `npx prisma studio` para verificar dados

---

## 🎯 DICA FINAL

Se você está seguindo este guia e ainda tem problemas, o mais provável é que seja um dos dois problemas principais:

1. **URL da Evolution API com `/manager` no final** (remover)
2. **Endpoint de webhook incorreto** (usar `/webhook/set/${instanceName}`)

Estes foram os problemas mais comuns encontrados e suas soluções estão detalhadas acima.