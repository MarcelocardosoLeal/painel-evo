# 🐳 GUIA COMPLETO DE CONTAINERIZAÇÃO - PAINEL EVO

## 📋 **ÍNDICE**

1. [Visão Geral](#visão-geral)
2. [Arquivos Docker Necessários](#arquivos-docker-necessários)
3. [Configuração do Docker Compose](#configuração-do-docker-compose)
4. [Template para Portainer](#template-para-portainer)
5. [Scripts de Automação](#scripts-de-automação)
6. [Configuração de Nginx](#configuração-de-nginx)
7. [Variáveis de Ambiente](#variáveis-de-ambiente)
8. [Instruções de Deploy](#instruções-de-deploy)
9. [Monitoramento e Logs](#monitoramento-e-logs)
10. [Backup e Restore](#backup-e-restore)

---

## 🎯 **VISÃO GERAL**

### **Arquitetura da Stack Docker**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     NGINX       │    │    FRONTEND     │    │     BACKEND     │
│  (Proxy/SSL)    │◄──►│   (Vue.js)      │◄──►│   (Node.js)     │
│   Port: 80/443  │    │   Port: 80      │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   POSTGRESQL    │
                                               │  (Database)     │
                                               │   Port: 5432    │
                                               └─────────────────┘
```

### **Benefícios da Containerização**

✅ **Deploy com 1 clique** via Portainer
✅ **Isolamento completo** de dependências
✅ **Escalabilidade horizontal** automática
✅ **Backup automatizado** do banco de dados
✅ **SSL/TLS automático** com Let's Encrypt
✅ **Monitoramento integrado** de recursos
✅ **Updates sem downtime**
✅ **Rollback instantâneo** em caso de problemas

---

## 📦 **ARQUIVOS DOCKER NECESSÁRIOS**

### **1. Backend Dockerfile**

**Arquivo:** `backend/Dockerfile`

```dockerfile
# Multi-stage build para otimização
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Gerar cliente Prisma
RUN npx prisma generate

# Stage final
FROM node:18-alpine AS runtime

WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S painel -u 1001

# Copiar dependências e código
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY . .

# Definir permissões
RUN chown -R painel:nodejs /app
USER painel

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Comando de inicialização
CMD ["npm", "start"]
```

### **2. Frontend Dockerfile**

**Arquivo:** `frontend/Dockerfile`

```dockerfile
# Stage de build
FROM node:18-alpine AS build

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci && npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Stage de produção
FROM nginx:alpine AS production

# Instalar certificados SSL
RUN apk add --no-cache ca-certificates

# Copiar build da aplicação
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Criar usuário não-root
RUN adduser -D -s /bin/sh nginx-user

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Comando de inicialização
CMD ["nginx", "-g", "daemon off;"]
```

### **3. Health Check Script**

**Arquivo:** `backend/healthcheck.js`

```javascript
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('Health check failed:', err.message);
  process.exit(1);
});

request.end();
```

---

## 🐙 **CONFIGURAÇÃO DO DOCKER COMPOSE**

### **Arquivo Principal: `docker-compose.yml` (Com Traefik)**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: painel-evo-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-painel_evo}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres123}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - painel-evo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: painel-evo-backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres123}@postgres:5432/${POSTGRES_DB:-painel_evo}
      JWT_SECRET: ${JWT_SECRET}
      EVOLUTION_API_URL: ${EVOLUTION_API_URL}
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - painel-evo-network
      - traefik
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.painel-evo-api.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.painel-evo-api.entrypoints=websecure"
      - "traefik.http.routers.painel-evo-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.painel-evo-api.loadbalancer.server.port=3000"
      - "traefik.docker.network=traefik"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://${DOMAIN}/api
        VITE_SOCKET_URL: https://${DOMAIN}
    container_name: painel-evo-frontend
    depends_on:
      - backend
    networks:
      - traefik
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.painel-evo-app.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.painel-evo-app.entrypoints=websecure"
      - "traefik.http.routers.painel-evo-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.painel-evo-app.loadbalancer.server.port=80"
      - "traefik.docker.network=traefik"

  # Redis (Opcional - para cache e sessões)
  redis:
    image: redis:7-alpine
    container_name: painel-evo-redis
    networks:
      - painel-evo-network
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

networks:
  painel-evo-network:
    driver: bridge
  traefik:
    external: true
```

### **Arquivo Alternativo: `docker-compose.nginx.yml` (Sem Traefik)**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: painel-evo-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-painel_evo}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres123}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - painel-evo-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: painel-evo-backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres123}@postgres:5432/${POSTGRES_DB:-painel_evo}
      JWT_SECRET: ${JWT_SECRET}
      EVOLUTION_API_URL: ${EVOLUTION_API_URL}
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - painel-evo-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:3000/api
        VITE_SOCKET_URL: http://localhost:3000
    container_name: painel-evo-frontend
    depends_on:
      - backend
    networks:
      - painel-evo-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: painel-evo-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - painel-evo-network
    restart: unless-stopped

  # Redis (Opcional - para cache e sessões)
  redis:
    image: redis:7-alpine
    container_name: painel-evo-redis
    networks:
      - painel-evo-network
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

networks:
  painel-evo-network:
    driver: bridge
```

## 📋 **VARIÁVEIS DE AMBIENTE NECESSÁRIAS**

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Domínio da aplicação
DOMAIN=seu-dominio.com

# Banco de Dados PostgreSQL
POSTGRES_DB=painel_evo
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_super_segura

# JWT Secret (gere uma chave aleatória segura)
JWT_SECRET=sua_chave_jwt_super_secreta_aqui

# Evolution API
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave_evolution_api
```

```yaml
version: '3.8'

services:
  # Banco de Dados PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: painel-evo-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-painel_evo}
      POSTGRES_USER: ${DB_USER:-painel_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - painel_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-painel_user} -d ${DB_NAME:-painel_evo}"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: painel-evo-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER:-painel_user}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-painel_evo}
      JWT_SECRET: ${JWT_SECRET}
      EVOLUTION_API_URL: ${EVOLUTION_API_URL}
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      PORT: 3000
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    networks:
      - painel_network
      - traefik
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.painel-evo-backend.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.painel-evo-backend.entrypoints=websecure"
      - "traefik.http.routers.painel-evo-backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.painel-evo-backend.loadbalancer.server.port=3000"
      - "traefik.docker.network=traefik"

  # Frontend Vue.js
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VUE_APP_API_URL: https://${DOMAIN}/api
        VUE_APP_SOCKET_URL: https://${DOMAIN}
    container_name: painel-evo-frontend
    restart: unless-stopped
    networks:
      - painel_network
      - traefik
    depends_on:
      backend:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.painel-evo-frontend.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.painel-evo-frontend.entrypoints=websecure"
      - "traefik.http.routers.painel-evo-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.painel-evo-frontend.loadbalancer.server.port=80"
      - "traefik.docker.network=traefik"
      # Middleware para Socket.IO
      - "traefik.http.routers.painel-evo-socketio.rule=Host(`${DOMAIN}`) && PathPrefix(`/socket.io`)"
      - "traefik.http.routers.painel-evo-socketio.entrypoints=websecure"
      - "traefik.http.routers.painel-evo-socketio.tls.certresolver=letsencrypt"
      - "traefik.http.routers.painel-evo-socketio.service=painel-evo-backend"

  # Redis para Cache (Opcional)
  redis:
    image: redis:7-alpine
    container_name: painel-evo-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - painel_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  painel_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  traefik:
    external: true
```

### **Arquivo Alternativo: `docker-compose.nginx.yml` (Sem Traefik)**

```yaml
version: '3.8'

services:
  # Banco de Dados PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: painel-evo-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-painel_evo}
      POSTGRES_USER: ${DB_USER:-painel_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - painel_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-painel_user} -d ${DB_NAME:-painel_evo}"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: painel-evo-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER:-painel_user}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-painel_evo}
      JWT_SECRET: ${JWT_SECRET}
      EVOLUTION_API_URL: ${EVOLUTION_API_URL}
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      PORT: 3000
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
    networks:
      - painel_network
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Frontend Vue.js
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VUE_APP_API_URL: ${FRONTEND_API_URL:-http://localhost:3000}
        VUE_APP_SOCKET_URL: ${FRONTEND_SOCKET_URL:-http://localhost:3000}
    container_name: painel-evo-frontend
    restart: unless-stopped
    networks:
      - painel_network
    depends_on:
      backend:
        condition: service_healthy

  # Nginx Proxy Reverso
  nginx:
    image: nginx:alpine
    container_name: painel-evo-nginx
    restart: unless-stopped
    ports:
      - "${HTTP_PORT:-80}:80"
      - "${HTTPS_PORT:-443}:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/logs:/var/log/nginx
    networks:
      - painel_network
    depends_on:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis para Cache (Opcional)
  redis:
    image: redis:7-alpine
    container_name: painel-evo-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - painel_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  painel_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### **Arquivo de Desenvolvimento: `docker-compose.dev.yml`**

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: development
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run serve
    ports:
      - "8080:8080"

  postgres:
    ports:
      - "5432:5432"
```

---

## 🎛️ **TEMPLATE PARA PORTAINER**

### **Arquivo: `portainer-template.json` (Com Traefik)**

```json
{
  "version": "2",
  "templates": [
    {
      "type": 3,
      "title": "Painel Evo - Sistema Multi-Tenant (Traefik)",
      "description": "Sistema completo de gerenciamento multi-tenant para Evolution API com WhatsApp - Configurado para Traefik",
      "note": "Stack completa com frontend Vue.js, backend Node.js, PostgreSQL e integração com Traefik para SSL automático",
      "categories": [
        "WhatsApp",
        "Management",
        "Multi-Tenant",
        "Evolution API",
        "Traefik"
      ],
      "platform": "linux",
      "logo": "https://raw.githubusercontent.com/seu-usuario/painel-evo/main/assets/logo.png",
      "repository": {
        "url": "https://github.com/seu-usuario/painel-evo",
        "stackfile": "docker-compose.yml"
      },
      "env": [
        {
          "name": "DOMAIN",
          "label": "Domain Name",
          "description": "Domínio para acesso ao painel (ex: painel.seudominio.com) - OBRIGATÓRIO para Traefik",
          "default": ""
        },
        {
          "name": "DB_PASSWORD",
          "label": "Database Password",
          "description": "Senha segura para o banco PostgreSQL (mínimo 12 caracteres)",
          "default": ""
        },
        {
          "name": "JWT_SECRET",
          "label": "JWT Secret Key",
          "description": "Chave secreta para assinatura de tokens JWT (mínimo 32 caracteres)",
          "default": ""
        },
        {
          "name": "EVOLUTION_API_URL",
          "label": "Evolution API URL",
          "description": "URL completa da sua Evolution API (ex: https://api.evolution.com)",
          "default": "https://localhost:8080"
        },
        {
          "name": "EVOLUTION_API_KEY",
          "label": "Evolution API Key",
          "description": "Chave de API da Evolution (opcional, se configurada)",
          "default": ""
        },
        {
          "name": "DB_NAME",
          "label": "Database Name",
          "description": "Nome do banco de dados",
          "default": "painel_evo"
        },
        {
          "name": "DB_USER",
          "label": "Database User",
          "description": "Usuário do banco de dados",
          "default": "painel_user"
        },
        {
          "name": "REDIS_PASSWORD",
          "label": "Redis Password",
          "description": "Senha para o Redis (cache)",
          "default": ""
        }
      ]
    },
    {
      "type": 3,
      "title": "Painel Evo - Sistema Multi-Tenant (Nginx)",
      "description": "Sistema completo de gerenciamento multi-tenant para Evolution API com WhatsApp - Configurado com Nginx",
      "note": "Stack completa com frontend Vue.js, backend Node.js, PostgreSQL e Nginx com SSL manual",
      "categories": [
        "WhatsApp",
        "Management",
        "Multi-Tenant",
        "Evolution API",
        "Nginx"
      ],
      "platform": "linux",
      "logo": "https://raw.githubusercontent.com/seu-usuario/painel-evo/main/assets/logo.png",
      "repository": {
        "url": "https://github.com/seu-usuario/painel-evo",
        "stackfile": "docker-compose.nginx.yml"
      },
      "env": [
        {
          "name": "DB_PASSWORD",
          "label": "Database Password",
          "description": "Senha segura para o banco PostgreSQL (mínimo 12 caracteres)",
          "default": ""
        },
        {
          "name": "JWT_SECRET",
          "label": "JWT Secret Key",
          "description": "Chave secreta para assinatura de tokens JWT (mínimo 32 caracteres)",
          "default": ""
        },
        {
          "name": "EVOLUTION_API_URL",
          "label": "Evolution API URL",
          "description": "URL completa da sua Evolution API (ex: https://api.evolution.com)",
          "default": "https://localhost:8080"
        },
        {
          "name": "EVOLUTION_API_KEY",
          "label": "Evolution API Key",
          "description": "Chave de API da Evolution (opcional, se configurada)",
          "default": ""
        },
        {
          "name": "DOMAIN",
          "label": "Domain Name",
          "description": "Domínio para acesso ao painel (ex: painel.seudominio.com)",
          "default": "localhost"
        },
        {
          "name": "HTTP_PORT",
          "label": "HTTP Port",
          "description": "Porta HTTP para acesso (padrão: 80)",
          "default": "80"
        },
        {
          "name": "HTTPS_PORT",
          "label": "HTTPS Port",
          "description": "Porta HTTPS para acesso (padrão: 443)",
          "default": "443"
        },
        {
          "name": "DB_NAME",
          "label": "Database Name",
          "description": "Nome do banco de dados",
          "default": "painel_evo"
        },
        {
          "name": "DB_USER",
          "label": "Database User",
          "description": "Usuário do banco de dados",
          "default": "painel_user"
        },
        {
          "name": "REDIS_PASSWORD",
          "label": "Redis Password",
          "description": "Senha para o Redis (cache)",
          "default": ""
        }
      ]
    }
  ]
}
```

---

## 🔧 **CONFIGURAÇÃO DE NGINX**

### **Arquivo: `nginx/nginx.conf`**

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream backends
    upstream backend {
        least_conn;
        server backend:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream frontend {
        least_conn;
        server frontend:80 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin";

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Socket.IO
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Login rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
                proxy_pass http://frontend;
            }
        }
    }
}
```

---

## 🔐 **VARIÁVEIS DE AMBIENTE**

### **Arquivo: `.env.example`**

```bash
# ==============================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ==============================================
DB_NAME=painel_evo
DB_USER=painel_user
DB_PASSWORD=sua_senha_super_segura_aqui
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}

# ==============================================
# CONFIGURAÇÕES DE SEGURANÇA
# ==============================================
JWT_SECRET=sua_chave_jwt_super_secreta_com_pelo_menos_32_caracteres
ENCRYPTION_KEY=chave_de_criptografia_32_caracteres

# ==============================================
# CONFIGURAÇÕES DA EVOLUTION API
# ==============================================
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_chave_da_evolution_api
EVOLUTION_WEBHOOK_URL=https://seu-painel.com/api/webhook

# ==============================================
# CONFIGURAÇÕES DO SERVIDOR
# ==============================================
NODE_ENV=production
PORT=3000
DOMAIN=seu-dominio.com
HTTP_PORT=80
HTTPS_PORT=443

# ==============================================
# CONFIGURAÇÕES DO FRONTEND
# ==============================================
FRONTEND_API_URL=https://seu-dominio.com/api
FRONTEND_SOCKET_URL=https://seu-dominio.com

# ==============================================
# CONFIGURAÇÕES DO REDIS (CACHE)
# ==============================================
REDIS_PASSWORD=senha_redis_segura
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ==============================================
# CONFIGURAÇÕES DE EMAIL (OPCIONAL)
# ==============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua_senha_de_app
SMTP_FROM=noreply@seu-dominio.com

# ==============================================
# CONFIGURAÇÕES DE BACKUP
# ==============================================
BACKUP_SCHEDULE=0 2 * * *  # Todo dia às 2h da manhã
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=seu-bucket-backup
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_REGION=us-east-1

# ==============================================
# CONFIGURAÇÕES DE MONITORAMENTO
# ==============================================
MONITORING_ENABLED=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30

# ==============================================
# CONFIGURAÇÕES DE LOG
# ==============================================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_MAX_SIZE=100m
LOG_MAX_FILES=10
```

---

## 🔧 **CONFIGURAÇÃO COM TRAEFIK**

### **Pré-requisitos para Traefik**

Antes de fazer o deploy com Traefik, certifique-se de que:

1. **Traefik já está rodando** no seu servidor
2. **Rede `traefik` existe** e está configurada
3. **Domínio está apontando** para o servidor
4. **Certificados Let's Encrypt** estão configurados

### **1. Verificar se Traefik está Funcionando**

```bash
# Verificar se Traefik está rodando
docker ps | grep traefik

# Verificar se a rede traefik existe
docker network ls | grep traefik

# Se a rede não existir, criar:
docker network create traefik
```

### **2. Configuração Básica do Traefik**

Se você ainda não tem o Traefik configurado, aqui está um exemplo básico:

#### **Arquivo: `traefik/docker-compose.yml`**

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard (opcional)
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./acme.json:/acme.json
    networks:
      - traefik
    environment:
      - TRAEFIK_API_DASHBOARD=true
      - TRAEFIK_API_INSECURE=true
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.seudominio.com`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.services.traefik.loadbalancer.server.port=8080"

networks:
  traefik:
    external: true
```

#### **Arquivo: `traefik/traefik.yml`**

```yaml
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entrypoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik

certificatesResolvers:
  letsencrypt:
    acme:
      email: seu-email@dominio.com
      storage: /acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO

accessLog: {}
```

### **3. Configurar Permissões do ACME**

```bash
# Criar arquivo para certificados SSL
touch traefik/acme.json
chmod 600 traefik/acme.json
```

### **4. Vantagens do Traefik vs Nginx**

| Recurso | Traefik | Nginx |
|---------|---------|-------|
| **SSL Automático** | ✅ Let's Encrypt automático | ❌ Configuração manual |
| **Service Discovery** | ✅ Automático via Docker labels | ❌ Configuração manual |
| **Load Balancing** | ✅ Automático | ✅ Manual |
| **Dashboard** | ✅ Interface web integrada | ❌ Não possui |
| **Configuração** | ✅ Via labels Docker | ❌ Arquivos de configuração |
| **Renovação SSL** | ✅ Automática | ❌ Manual |
| **Múltiplos Domínios** | ✅ Fácil configuração | ❌ Configuração complexa |

### **5. Configuração de DNS**

Para usar com Traefik, configure os seguintes registros DNS:

```
# Registro A principal
painel.seudominio.com    A    IP_DO_SERVIDOR

# Opcional: Subdomínio para API
api.painel.seudominio.com    A    IP_DO_SERVIDOR

# Opcional: Subdomínio para monitoramento
monitor.painel.seudominio.com    A    IP_DO_SERVIDOR
```

---

## 🚀 **INSTRUÇÕES DE DEPLOY**

### **1. Deploy via Portainer com Traefik (Recomendado)**

#### **Passo 1: Preparar o Repositório**
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/painel-evo.git
cd painel-evo

# Criar arquivo de ambiente
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

#### **Passo 2: Configurar Portainer**
1. Acesse seu Portainer
2. Vá em **App Templates**
3. Clique em **Add Template**
4. Cole o conteúdo do `portainer-template.json`
5. Salve o template

#### **Passo 3: Verificar Traefik**
```bash
# Verificar se Traefik está rodando
docker ps | grep traefik

# Verificar rede traefik
docker network ls | grep traefik

# Se necessário, criar a rede
docker network create traefik
```

#### **Passo 4: Deploy da Stack**
1. Vá em **Stacks**
2. Clique em **Add Stack**
3. Selecione **Repository**
4. Insira a URL: `https://github.com/seu-usuario/painel-evo`
5. Defina o arquivo: `docker-compose.yml` (para Traefik) ou `docker-compose.nginx.yml` (para Nginx)
6. Configure as variáveis de ambiente:
   - **DOMAIN**: Seu domínio (obrigatório para Traefik)
   - **DB_PASSWORD**: Senha do banco
   - **JWT_SECRET**: Chave JWT
   - **EVOLUTION_API_URL**: URL da Evolution API
7. Clique em **Deploy the stack**

#### **Passo 5: Verificar Deploy**
```bash
# Verificar status dos containers
docker-compose ps

# Verificar logs
docker-compose logs -f

# Testar acesso (substitua pelo seu domínio)
curl -I https://painel.seudominio.com
```

### **2. Deploy Manual via Docker Compose**

```bash
# 1. Preparar ambiente
git clone https://github.com/seu-usuario/painel-evo.git
cd painel-evo
cp .env.example .env

# 2. Editar variáveis de ambiente
nano .env

# 3. Gerar certificados SSL (se necessário)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# 4. Build e deploy
docker-compose build
docker-compose up -d

# 5. Verificar status
docker-compose ps
docker-compose logs -f
```

### **3. Scripts de Automação**

#### **Arquivo: `scripts/deploy.sh`**

```bash
#!/bin/bash

# Script de deploy automatizado
set -e

echo "🚀 Iniciando deploy do Painel Evo..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    exit 1
fi

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "📝 Copie o arquivo .env.example para .env e configure as variáveis"
    exit 1
fi

# Fazer backup do banco (se existir)
if docker-compose ps | grep -q postgres; then
    echo "💾 Fazendo backup do banco de dados..."
    ./scripts/backup.sh
fi

# Pull das imagens mais recentes
echo "📥 Baixando imagens mais recentes..."
docker-compose pull

# Build das imagens customizadas
echo "🔨 Construindo imagens..."
docker-compose build --no-cache

# Deploy da stack
echo "🚀 Fazendo deploy..."
docker-compose up -d

# Aguardar serviços ficarem prontos
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 30

# Verificar health checks
echo "🔍 Verificando status dos serviços..."
docker-compose ps

# Executar migrações do banco
echo "🗃️ Executando migrações do banco..."
docker-compose exec backend npx prisma migrate deploy

# Verificar se tudo está funcionando
echo "✅ Verificando se a aplicação está respondendo..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "🎉 Deploy concluído com sucesso!"
    echo "🌐 Aplicação disponível em: http://localhost"
else
    echo "❌ Aplicação não está respondendo!"
    echo "📋 Verificar logs: docker-compose logs"
    exit 1
fi
```

#### **Arquivo: `scripts/backup.sh`**

```bash
#!/bin/bash

# Script de backup automatizado
set -e

BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="painel_evo_backup_${DATE}.sql"

echo "💾 Iniciando backup do banco de dados..."

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Fazer backup do PostgreSQL
docker-compose exec -T postgres pg_dump -U painel_user painel_evo > "$BACKUP_DIR/$BACKUP_FILE"

# Comprimir backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup criado: $BACKUP_DIR/${BACKUP_FILE}.gz"

# Limpar backups antigos (manter apenas os últimos 30 dias)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "🧹 Backups antigos removidos"
```

#### **Arquivo: `scripts/restore.sh`**

```bash
#!/bin/bash

# Script de restore do banco
set -e

if [ -z "$1" ]; then
    echo "❌ Uso: $0 <arquivo_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restaurando backup: $BACKUP_FILE"

# Descomprimir se necessário
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U painel_user -d painel_evo
else
    cat "$BACKUP_FILE" | docker-compose exec -T postgres psql -U painel_user -d painel_evo
fi

echo "✅ Restore concluído com sucesso!"
```

---

## 📊 **MONITORAMENTO E LOGS**

### **1. Configuração de Logs**

#### **Arquivo: `docker-compose.monitoring.yml`**

```yaml
version: '3.8'

services:
  # Prometheus para métricas
  prometheus:
    image: prom/prometheus:latest
    container_name: painel-evo-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - painel_network

  # Grafana para dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: painel-evo-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - painel_network

  # Loki para logs
  loki:
    image: grafana/loki:latest
    container_name: painel-evo-loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - painel_network

  # Promtail para coleta de logs
  promtail:
    image: grafana/promtail:latest
    container_name: painel-evo-promtail
    restart: unless-stopped
    volumes:
      - ./monitoring/promtail.yml:/etc/promtail/config.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - painel_network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

### **2. Comandos Úteis de Monitoramento**

#### **Comandos Gerais**
```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Ver status dos containers
docker-compose ps

# Ver uso de recursos
docker stats

# Verificar health checks
docker-compose exec backend curl http://localhost:3000/health

# Acessar container para debug
docker-compose exec backend sh

# Reiniciar serviço específico
docker-compose restart backend

# Ver configuração atual
docker-compose config
```

#### **Comandos Específicos para Traefik**
```bash
# Verificar roteamento do Traefik
curl -H "Host: painel.seudominio.com" http://localhost

# Ver certificados SSL
docker exec traefik cat /acme.json | jq '.letsencrypt.Certificates[].domain'

# Verificar logs do Traefik
docker logs traefik -f

# Testar conectividade com backend
docker exec painel-evo-frontend curl http://backend:3000/health

# Verificar labels dos containers
docker inspect painel-evo-frontend | jq '.[0].Config.Labels'

# Dashboard do Traefik (se habilitado)
curl http://localhost:8080/api/rawdata
```

#### **Troubleshooting Traefik**
```bash
# Verificar se o domínio está resolvendo
nslookup painel.seudominio.com

# Testar SSL
openssl s_client -connect painel.seudominio.com:443 -servername painel.seudominio.com

# Verificar rotas do Traefik
curl -s http://localhost:8080/api/http/routers | jq

# Verificar serviços do Traefik
curl -s http://localhost:8080/api/http/services | jq

# Forçar renovação de certificado
docker exec traefik rm /acme.json
docker restart traefik
```

---

## 🔒 **SEGURANÇA E MELHORES PRÁTICAS**

### **1. Checklist de Segurança**

- [ ] **Senhas fortes** para todas as variáveis de ambiente
- [ ] **Certificados SSL** válidos configurados
- [ ] **Rate limiting** configurado no Nginx
- [ ] **Firewall** configurado no servidor
- [ ] **Backup automático** configurado
- [ ] **Logs de auditoria** habilitados
- [ ] **Usuários não-root** nos containers
- [ ] **Secrets** gerenciados adequadamente
- [ ] **Rede isolada** entre containers
- [ ] **Health checks** configurados

### **2. Configuração de Secrets**

```bash
# Gerar senhas seguras
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 24  # Para DB_PASSWORD
openssl rand -hex 16     # Para ENCRYPTION_KEY

# Usar Docker Secrets (em produção)
docker secret create db_password db_password.txt
docker secret create jwt_secret jwt_secret.txt
```

---

## 🚨 **TROUBLESHOOTING COMUM**

### **Problemas com Traefik**

#### **1. Certificado SSL não é gerado**
```bash
# Verificar se o domínio está apontando corretamente
nslookup painel.seudominio.com

# Verificar logs do Traefik
docker logs traefik | grep -i "acme\|certificate\|error"

# Verificar permissões do acme.json
ls -la traefik/acme.json
# Deve mostrar: -rw------- (600)

# Solução: Recriar arquivo acme.json
rm traefik/acme.json
touch traefik/acme.json
chmod 600 traefik/acme.json
docker restart traefik
```

#### **2. Serviço não é descoberto pelo Traefik**
```bash
# Verificar se o container está na rede traefik
docker inspect painel-evo-frontend | grep -A 10 "Networks"

# Verificar labels do container
docker inspect painel-evo-frontend | jq '.[0].Config.Labels'

# Solução: Verificar docker-compose.yml
# - Container deve estar na rede 'traefik'
# - Labels devem estar corretos
# - traefik.enable=true deve estar presente
```

#### **3. Erro 502 Bad Gateway**
```bash
# Verificar se o backend está rodando
docker-compose ps

# Testar conectividade interna
docker exec painel-evo-frontend curl http://backend:3000/health

# Verificar logs do backend
docker-compose logs backend

# Solução comum: Aguardar health check
# O Traefik só roteia após o health check passar
```

### **Problemas com Portainer**

#### **1. Stack falha ao fazer deploy**
```bash
# Verificar logs do Portainer
docker logs portainer

# Verificar se todas as variáveis estão definidas
# Especialmente: DOMAIN, DB_PASSWORD, JWT_SECRET

# Verificar se a rede traefik existe
docker network ls | grep traefik
```

#### **2. Variáveis de ambiente não funcionam**
```bash
# No Portainer, verificar se:
# - Todas as variáveis obrigatórias estão preenchidas
# - Não há espaços em branco nas variáveis
# - DOMAIN não inclui http:// ou https://
```

### **Problemas com Banco de Dados**

#### **1. Erro de conexão com PostgreSQL**
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# Verificar logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker-compose exec postgres psql -U painel_user -d painel_evo -c "SELECT 1;"

# Verificar variáveis de ambiente
docker-compose exec backend env | grep DATABASE_URL
```

#### **2. Migrações não executam**
```bash
# Executar migrações manualmente
docker-compose exec backend npx prisma migrate deploy

# Verificar status das migrações
docker-compose exec backend npx prisma migrate status

# Gerar cliente Prisma
docker-compose exec backend npx prisma generate
```

### **Problemas de Performance**

#### **1. Aplicação lenta**
```bash
# Verificar uso de recursos
docker stats

# Verificar logs de erro
docker-compose logs | grep -i "error\|warning"

# Aumentar recursos se necessário no docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 1G
#       cpus: '0.5'
```

#### **2. Banco de dados lento**
```bash
# Verificar conexões ativas
docker-compose exec postgres psql -U painel_user -d painel_evo -c "SELECT count(*) FROM pg_stat_activity;"

# Verificar queries lentas
docker-compose exec postgres psql -U painel_user -d painel_evo -c "SELECT query, query_start FROM pg_stat_activity WHERE state = 'active';"
```

---

## 🎯 **PRÓXIMOS PASSOS**

### **Fase 1: Preparação (1-2 dias)**
- [ ] Criar todos os Dockerfiles
- [ ] Configurar docker-compose.yml para Traefik
- [ ] Configurar docker-compose.nginx.yml como alternativa
- [ ] Testar build local
- [ ] Verificar configuração do Traefik

### **Fase 2: Automação (2-3 dias)**
- [ ] Criar scripts de deploy
- [ ] Configurar backup automático
- [ ] Implementar health checks
- [ ] Configurar monitoramento
- [ ] Testar troubleshooting

### **Fase 3: Portainer (1 dia)**
- [ ] Criar templates do Portainer (Traefik + Nginx)
- [ ] Testar deploy via Portainer
- [ ] Documentar processo
- [ ] Criar guia do usuário
- [ ] Validar variáveis de ambiente

### **Fase 4: Produção (1-2 dias)**
- [ ] Configurar DNS e domínio
- [ ] Implementar SSL automático via Traefik
- [ ] Configurar backup em produção
- [ ] Testes de carga
- [ ] Monitoramento em produção

---

## 📚 **RECURSOS ADICIONAIS**

- **Documentação Docker:** https://docs.docker.com/
- **Documentação Portainer:** https://documentation.portainer.io/
- **Nginx Configuration:** https://nginx.org/en/docs/
- **PostgreSQL Docker:** https://hub.docker.com/_/postgres
- **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices

---

**📅 Última Atualização:** $(date)
**👤 Responsável:** Equipe Painel Evo
**🎯 Status:** Guia Completo - Pronto para Implementação