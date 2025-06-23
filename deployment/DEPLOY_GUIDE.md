# 🚀 Guia de Deploy - Painel Evo

## 📋 Pré-requisitos

### Infraestrutura Necessária
- ✅ **Docker Swarm** ativo no servidor
- ✅ **Portainer** instalado e funcionando
- ✅ **Traefik** configurado com SSL automático
- ✅ **PostgreSQL** rodando na rede `network_public`
- ✅ **Domínio** `painel-evo.advancedbot.com.br` apontando para o servidor

### Configurações do PostgreSQL
Sua stack atual do PostgreSQL:
```yaml
services:
  postgres:
    image: postgres:16.0
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=7oqmxlmreoak
      - POSTGRES_DB=dbevolution
    ports:
      - "5433:5432"
    networks:
      - network_public
```

## 🔧 Preparação do Banco de Dados

### 1. Criar Database para o Painel Evo
```sql
-- Conectar no PostgreSQL e executar:
CREATE DATABASE painel_evo;
CREATE USER painel_evo_user WITH PASSWORD 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE painel_evo TO painel_evo_user;
```

### 2. Atualizar Variáveis de Ambiente
No `docker-compose.yml`, ajuste a `DATABASE_URL`:
```yaml
- DATABASE_URL=postgresql://painel_evo_user:senha_segura_aqui@postgres:5432/painel_evo
```

## 🐳 Deploy via GitHub Container Registry

### Opção 1: Build Automático (Recomendado)

1. **Push para GitHub**:
   ```bash
   git add .
   git commit -m "feat: add docker configuration"
   git push origin main
   ```

2. **GitHub Actions** irá automaticamente:
   - Fazer build das imagens
   - Publicar no GitHub Container Registry
   - Disponibilizar em: `ghcr.io/seu-usuario/painel-evo-backend:latest`

3. **Atualizar docker-compose.yml**:
   ```yaml
   painel-evo-backend:
     image: ghcr.io/seu-usuario/painel-evo-backend:latest
     # remove a seção 'build'
   
   painel-evo-frontend:
     image: ghcr.io/seu-usuario/painel-evo-frontend:latest
     # remove a seção 'build'
   ```

### Opção 2: Build Local

1. **Build das imagens**:
   ```bash
   docker build -t painel-evo-backend ./backend
   docker build -t painel-evo-frontend ./frontend
   ```

2. **Tag e Push**:
   ```bash
   docker tag painel-evo-backend ghcr.io/seu-usuario/painel-evo-backend:latest
   docker tag painel-evo-frontend ghcr.io/seu-usuario/painel-evo-frontend:latest
   
   docker push ghcr.io/seu-usuario/painel-evo-backend:latest
   docker push ghcr.io/seu-usuario/painel-evo-frontend:latest
   ```

## 📦 Deploy no Portainer

### Método 1: Via Template (Mais Fácil)

1. **Importar Template**:
   - Acesse Portainer → App Templates
   - Clique em "Add Template"
   - Cole o conteúdo de `portainer-template.json`

2. **Instalar Stack**:
   - Selecione o template "Painel Evo"
   - Preencha as variáveis:
     - `JWT_SECRET`: Chave forte (32+ caracteres)
     - `EVOLUTION_WEBHOOK_SECRET`: Chave para webhooks
     - `EVOLUTION_API_URL`: URL da sua Evolution API
     - `EVOLUTION_API_KEY`: Chave da Evolution API

### Método 2: Stack Manual

1. **Criar Nova Stack**:
   - Portainer → Stacks → Add Stack
   - Nome: `painel-evo`

2. **Colar docker-compose.yml**:
   - Cole o conteúdo do arquivo `docker-compose.yml`
   - Ajuste as variáveis de ambiente

3. **Deploy**:
   - Clique em "Deploy the stack"

## 🔐 Configurações de Segurança

### Variáveis Obrigatórias
```env
JWT_SECRET=sua-chave-jwt-super-secreta-32-caracteres-minimo
EVOLUTION_WEBHOOK_SECRET=webhook-secret-para-validacao
DATABASE_URL=postgresql://usuario:senha@postgres:5432/database
```

### Traefik Labels
As labels já estão configuradas para:
- ✅ SSL automático via Let's Encrypt
- ✅ Roteamento por domínio
- ✅ Separação API (`/api`) e Frontend

## 🌐 Acesso à Aplicação

Após o deploy:
- **Frontend**: https://painel-evo.advancedbot.com.br
- **API**: https://painel-evo.advancedbot.com.br/api
- **Health Check**: https://painel-evo.advancedbot.com.br/api/health

## 🔍 Verificação do Deploy

### 1. Verificar Containers
```bash
docker service ls | grep painel-evo
```

### 2. Verificar Logs
```bash
docker service logs painel-evo_painel-evo-backend
docker service logs painel-evo_painel-evo-frontend
```

### 3. Testar Conectividade
```bash
curl https://painel-evo.advancedbot.com.br/api/health
```

## 🚨 Troubleshooting

### Problema: Container não inicia
**Solução**: Verificar logs e variáveis de ambiente
```bash
docker service logs painel-evo_painel-evo-backend --tail 50
```

### Problema: Erro de conexão com banco
**Solução**: Verificar se PostgreSQL está na mesma rede
```bash
docker network ls
docker network inspect network_public
```

### Problema: SSL não funciona
**Solução**: Verificar configuração do Traefik
- Certificar que o domínio aponta para o servidor
- Verificar se Traefik está rodando
- Conferir labels do docker-compose

## 📈 Monitoramento

### Recursos Alocados
- **Backend**: 0.5 CPU, 512MB RAM
- **Frontend**: 0.3 CPU, 256MB RAM
- **Total**: 0.8 CPU, 768MB RAM

### Logs Importantes
- Autenticação JWT
- Conexões com Evolution API
- Erros de banco de dados
- Webhooks recebidos

## 🔄 Atualizações

Para atualizar a aplicação:
1. Push novo código para GitHub
2. GitHub Actions fará build automático
3. No Portainer: Stack → Update → Redeploy

---

**✅ Deploy Concluído!**

Sua aplicação estará disponível em: https://painel-evo.advancedbot.com.br