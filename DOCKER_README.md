# 🐳 Painel Evo - Deploy com Docker

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Traefik configurado e rodando (com rede `traefik`)
- Domínio apontando para o servidor

## 🚀 Instalação Rápida

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/painel-evo.git
cd painel-evo
```

### 2. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com seus dados
nano .env
```

### 3. Verifique se a rede Traefik existe
```bash
# Verificar se existe
docker network ls | grep traefik

# Se não existir, criar:
docker network create traefik
```

### 4. Execute a stack
```bash
docker-compose up -d
```

### 5. Verifique o status
```bash
# Ver logs
docker-compose logs -f

# Ver status dos containers
docker-compose ps
```

## 📦 Deploy via Portainer

### Opção 1: Template (Recomendado)
1. Importe o template `portainer-template.json` no Portainer
2. Use o template "Painel Evo - Multi-Tenant"
3. Preencha as variáveis de ambiente
4. Deploy!

### Opção 2: Stack Manual
1. Acesse Portainer → Stacks → Add Stack
2. Cole o conteúdo do `docker-compose.yml`
3. Configure as variáveis de ambiente
4. Deploy!

## ⚙️ Variáveis de Ambiente Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|----------|
| `DOMAIN` | Domínio da aplicação | `painel.seudominio.com` |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | `senha_super_segura_123` |
| `JWT_SECRET` | Chave JWT | `chave_aleatoria_32_caracteres_ou_mais` |
| `EVOLUTION_API_URL` | URL da Evolution API | `https://evolution.seudominio.com` |

## 🔧 Comandos Úteis

```bash
# Parar a stack
docker-compose down

# Rebuild e restart
docker-compose up -d --build

# Ver logs específicos
docker-compose logs backend
docker-compose logs frontend

# Backup do banco
docker exec painel-evo-postgres pg_dump -U postgres painel_evo > backup.sql

# Restore do banco
docker exec -i painel-evo-postgres psql -U postgres painel_evo < backup.sql
```

## 🌐 Acesso

Após o deploy bem-sucedido:
- **Frontend**: `https://seu-dominio.com`
- **API**: `https://seu-dominio.com/api`

## 🔍 Troubleshooting

### Problema: Erro 502 Bad Gateway
```bash
# Verificar se os containers estão rodando
docker-compose ps

# Verificar logs do backend
docker-compose logs backend
```

### Problema: Erro de conexão com banco
```bash
# Verificar se o PostgreSQL está saudável
docker-compose ps postgres

# Verificar logs do banco
docker-compose logs postgres
```

### Problema: SSL não funciona
- Verifique se o domínio aponta para o servidor
- Verifique se o Traefik está configurado corretamente
- Aguarde alguns minutos para o Let's Encrypt gerar o certificado

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs`
2. Verifique se todas as variáveis estão configuradas
3. Verifique se a rede `traefik` existe
4. Verifique se o domínio aponta para o servidor

---

**Nota**: Este setup assume que você já tem Traefik configurado. Se não tiver, consulte a documentação oficial do Traefik.