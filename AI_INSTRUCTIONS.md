# 🤖 Instruções para Assistentes de IA - Painel Evolution

> **PROMPT INICIAL:** Use este arquivo como base para instruções iniciais em novas conversas com IA.

## 📋 Contexto do Projeto

**Nome:** Painel Evolution  
**Tipo:** Plataforma Multi-tenant para Gerenciamento de Instâncias WhatsApp  
**Status:** Produção (v1.1.0)  
**Stack:** Node.js + Express + Vue.js 3 + Prisma + PostgreSQL  

## 🎯 Instruções Obrigatórias para IA

### 1. 📖 SEMPRE LER PRIMEIRO
```
1. PROJECT_STATE.md - Estado atual e contexto
2. TASK.md - Tarefas pendentes e histórico
3. PLANNING.md - Arquitetura e decisões técnicas
```

### 2. 🔄 FLUXO DE TRABALHO
```
INÍCIO → PROJECT_STATE.md → TASK.md → PLANNING.md → EXECUTAR → ATUALIZAR PROJECT_STATE.md
```

### 3. 🚫 NÃO FAZER
- ❌ Não começar do zero sem ler o contexto
- ❌ Não ignorar a arquitetura existente
- ❌ Não criar arquivos duplicados
- ❌ Não alterar estrutura sem consultar PLANNING.md
- ❌ Não esquecer de atualizar PROJECT_STATE.md

### 4. ✅ SEMPRE FAZER
- ✅ Ler PROJECT_STATE.md no início
- ✅ Verificar TASK.md para tarefas pendentes
- ✅ Seguir padrões do PLANNING.md
- ✅ Atualizar documentação após mudanças
- ✅ Manter consistência com código existente

## 🏗️ Arquitetura Resumida

### Estrutura de Portas
- **Backend:** 5000 (Express.js)
- **Frontend:** 8080 (Vue.js + Vite)

### Arquivos Críticos
- `backend/server.js` - Servidor principal
- `frontend/src/main.js` - Aplicação Vue
- `prisma/schema.prisma` - Schema do banco
- `.env` - Configurações

### Comandos Essenciais
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev

# Prisma
npx prisma generate
npx prisma db push
```

## 📝 Padrões de Código

### Backend (Node.js)
- Express.js com middlewares
- Prisma ORM para database
- JWT para autenticação
- Socket.IO para real-time

### Frontend (Vue.js)
- Composition API
- Vue Router para navegação
- Tailwind CSS para styling
- Axios para HTTP requests

## 🐛 Sistema de Bug Tracking

### ⚠️ AVISO CRÍTICO PARA IA
**🚨 NUNCA CRIE NOVOS BUGS AO CONSERTAR OS EXISTENTES! 🚨**

**PROTOCOLO OBRIGATÓRIO antes de corrigir bugs:**
1. 🔍 **ANALISE completamente** o código atual
2. 🧪 **TESTE todas as funcionalidades** que funcionam
3. 📝 **DOCUMENTE** exatamente o que vai mudar
4. ⚡ **FAÇA mudanças pequenas** e incrementais
5. ✅ **TESTE imediatamente** após cada mudança
6. 🔄 **VERIFIQUE** se não quebrou outras funcionalidades

**Regra de Ouro:** *"Melhor um bug conhecido do que dois bugs novos!"*

### Como Usar o Sistema
1. **SEMPRE verificar** seção "🐛 Known Issues & Bugs" no TASK.md antes de começar
2. **Reportar novos bugs** usando o template padronizado
3. **Atualizar status** quando trabalhando em bugs existentes
4. **Mover bugs resolvidos** para seção "✅ Completed Tasks"

### Template para Novos Bugs
```markdown
- [ ] **[Nome do Bug]** [Prioridade: 🔥/⚠️/📝]
  - Issue: [Descrição clara do problema]
  - Impact: [Como afeta os usuários]
  - Priority: [HIGH/MEDIUM/LOW]
  - Reported: [Data]
  - Files to investigate: [Arquivos relacionados]
  - Status: [PENDING/IN PROGRESS/TESTING/RESOLVED]
```

### Status de Bugs
- **PENDING INVESTIGATION:** Aguardando análise
- **IN PROGRESS:** Sendo investigado/corrigido
- **TESTING:** Correção implementada, aguardando testes
- **RESOLVED:** Corrigido e testado

## 🔧 Comandos de Manutenção

```bash
# Verificar status
git status

# Instalar dependências
npm install

# Banco de dados
npx prisma generate
npx prisma db push
node seed.js

# Iniciar serviços
npm run dev
```

## 📋 Checklist para Nova Conversa

### Para o Usuário
```
Olá! Para trabalhar eficientemente no projeto Painel Evolution, preciso:

1. 📖 Ler o PROJECT_STATE.md para entender onde paramos
2. 📋 Verificar TASK.md para tarefas pendentes  
3. 🏗️ Consultar PLANNING.md para arquitetura

Posso começar lendo esses arquivos?
```

### Para a IA
- [ ] Ler PROJECT_STATE.md
- [ ] Verificar TASK.md
- [ ] **VERIFICAR seção "🐛 Known Issues & Bugs" no TASK.md**
- [ ] Consultar PLANNING.md
- [ ] Entender o contexto atual
- [ ] Identificar próximos passos
- [ ] **Atualizar status de bugs se trabalhando neles**

## 🎯 Objetivos do Sistema

1. **Continuidade:** Nunca perder contexto entre conversas
2. **Eficiência:** Não refazer trabalho já feito
3. **Consistência:** Manter padrões estabelecidos
4. **Documentação:** Sempre atualizar estado do projeto

## 💡 Exemplo de Prompt Inicial

```
Olá! Vou trabalhar no projeto Painel Evolution. 

Antes de começar, preciso ler:
1. PROJECT_STATE.md - para entender onde paramos
2. TASK.md - para ver tarefas pendentes
3. PLANNING.md - para entender a arquitetura

Posso começar lendo esses arquivos para manter a continuidade do projeto?
```

---

**📅 Criado:** Janeiro 2025  
**🎯 Objetivo:** Eliminar perda de contexto entre conversas com IA  
**🔄 Uso:** Copie e cole como prompt inicial em novas conversas