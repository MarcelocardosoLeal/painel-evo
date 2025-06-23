# ⚡ Instalação Rápida - Painel Evo

> Guia express para instalação via Portainer

---

## 🚀 Método 1: Template Portainer (Mais Rápido)

### 1. Importar Template
```bash
# 1. Acesse Portainer → App Templates → Import
# 2. Cole a URL do template:
https://raw.githubusercontent.com/SEU_USUARIO/Painel-Evo/main/deployment/portainer-template.json
```

### 2. Configurar Variáveis
```env
JWT_SECRET=seu-jwt-secret-super-seguro
EVOLUTION_WEBHOOK_SECRET=webhook-secret
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key
```

### 3. Deploy
- Clique em "Deploy the stack"
- Aguarde o build das imagens
- Acesse: https://painel-evo.advancedbot.com.br

---

## 🛠️ Método 2: Stack Manual

### 1. Criar Stack
```bash
# Portainer → Stacks → Add stack
# Nome: painel-evo
```

### 2. Copiar docker-compose.yml
```bash
# Copie o conteúdo do arquivo:
# deployment/docker-compose.yml
```

### 3. Configurar Environment
```env
JWT_SECRET=seu-jwt-secret-super-seguro
EVOLUTION_WEBHOOK_SECRET=webhook-secret
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key
```

### 4. Deploy Stack
- Clique em "Deploy the stack"
- Aguarde conclusão

---

## ✅ Verificação Rápida

### 1. Containers Rodando
```bash
# Verifique no Portainer → Containers:
✅ painel-evo-backend
✅ painel-evo-frontend
```

### 2. Logs Sem Erros
```bash
# Backend deve mostrar:
✅ "Server running on port 3000"
✅ "Database connected"

# Frontend deve mostrar:
✅ Nginx started
```

### 3. Acesso Web
```bash
# Teste os URLs:
✅ https://painel-evo.advancedbot.com.br (Frontend)
✅ https://painel-evo.advancedbot.com.br/api/health (API)
```

---

## 🆘 Problemas Comuns

### Container não inicia
```bash
# Verifique:
1. Variáveis de ambiente configuradas
2. Rede network_public existe
3. PostgreSQL acessível
4. Traefik funcionando
```

### Erro de conexão com banco
```bash
# Verifique:
1. PostgreSQL na rede network_public
2. Credenciais corretas no DATABASE_URL
3. Database 'dbevolution' existe
```

### SSL/Domínio não funciona
```bash
# Verifique:
1. Traefik configurado com Let's Encrypt
2. Domínio apontando para o servidor
3. Labels do Traefik corretos
```

---

## 📞 Suporte

Para problemas mais complexos:
- **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)** - Documentação completa
- **[README.md](./README.md)** - Visão geral da pasta
- **Logs do Portainer** - Sempre verifique primeiro

---

**⏱️ Tempo estimado**: 5-10 minutos
**🎯 Resultado**: Painel Evo funcionando com SSL