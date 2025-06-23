# 🚀 Deployment - Painel Evo

> Documentação e arquivos para instalação via Portainer

---

## 📁 Estrutura da Pasta

```
deployment/
├── README.md                 # Este arquivo - guia da pasta
├── QUICK_INSTALL.md         # ⚡ Instalação rápida (5-10 min)
├── DEPLOY_GUIDE.md          # 📖 Guia completo de instalação
├── docker-compose.yml       # 🐳 Stack para Portainer
├── portainer-template.json  # 📋 Template para instalação rápida
├── .env.example            # 🔧 Variáveis de ambiente
└── .dockerignore           # 🚀 Otimização de build
```

## ⚡ Instalação Express (5-10 min)

**Para instalação rápida, consulte**: **[QUICK_INSTALL.md](./QUICK_INSTALL.md)**

## 🎯 Opções de Instalação

### Opção 1: Template Portainer (Recomendado)
1. Acesse Portainer → App Templates
2. Importe o arquivo `portainer-template.json`
3. Configure as variáveis de ambiente
4. Deploy!

### Opção 2: Stack Manual
1. Acesse Portainer → Stacks
2. Copie o conteúdo de `docker-compose.yml`
3. Configure as variáveis de ambiente
4. Deploy!

## 📋 Pré-requisitos

- ✅ Docker Swarm ativo
- ✅ Portainer instalado
- ✅ Traefik configurado com SSL
- ✅ PostgreSQL existente na rede `network_public`
- ✅ Domínio configurado: `painel-evo.advancedbot.com.br`

## 🔧 Variáveis Obrigatórias

```env
JWT_SECRET=seu-jwt-secret-super-seguro
EVOLUTION_WEBHOOK_SECRET=webhook-secret
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key
```

## 📖 Documentação Completa

Para instruções detalhadas, consulte:
- **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)** - Guia completo de instalação

## 🌐 URLs de Acesso

Após o deploy:
- **Frontend**: https://painel-evo.advancedbot.com.br
- **API**: https://painel-evo.advancedbot.com.br/api

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs no Portainer
2. Confirme as variáveis de ambiente
3. Valide a conectividade com PostgreSQL
4. Consulte o DEPLOY_GUIDE.md para troubleshooting

---

**Nota**: Esta pasta contém apenas arquivos relacionados ao deployment. O código fonte está nas pastas `backend/` e `frontend/`.