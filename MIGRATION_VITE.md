# 🚀 Migração Vue CLI para Vite - Plano Detalhado

## 📋 Visão Geral

**Objetivo:** Migrar o frontend do Vue CLI para Vite para resolver vulnerabilidades de segurança e melhorar performance.

**Status Atual:** Vue 3.2.13 + Vue CLI 5.0.0  
**Status Desejado:** Vue 3.4+ + Vite 5.0+

**Benefícios da Migração:**
- ✅ Resolução de 32 vulnerabilidades de segurança
- ⚡ Build 10-100x mais rápido
- 🔥 Hot Module Replacement (HMR) instantâneo
- 📦 Bundle size menor
- 🛠️ Tooling moderno e mantido ativamente

## 🔍 Análise do Estado Atual

### Dependências Atuais
```json
{
  "vue": "^3.2.13",
  "vue-router": "^4.5.1",
  "axios": "^1.9.0",
  "socket.io-client": "^4.8.1",
  "tailwindcss": "^3.4.17",
  "@vue/cli-service": "~5.0.0"
}
```

### Estrutura Atual
```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   ├── views/
│   ├── router/
│   ├── assets/
│   ├── App.vue
│   └── main.js
├── vue.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 📝 Plano de Migração

### Fase 1: Preparação (15 min)

1. **Backup do projeto atual**
   ```bash
   cp -r frontend frontend-backup
   ```

2. **Análise de compatibilidade**
   - ✅ Vue 3.2.13 é compatível com Vite
   - ✅ Vue Router 4.5.1 é compatível
   - ✅ Tailwind CSS 3.4.17 é compatível
   - ✅ Axios e Socket.IO são compatíveis

### Fase 2: Instalação do Vite (20 min)

1. **Remover dependências do Vue CLI**
   ```bash
   npm uninstall @vue/cli-service @vue/cli-plugin-babel @vue/cli-plugin-eslint
   ```

2. **Instalar Vite e plugins**
   ```bash
   npm install --save-dev vite @vitejs/plugin-vue
   npm install --save-dev @vitejs/plugin-vue-jsx # se necessário
   ```

3. **Atualizar dependências principais**
   ```bash
   npm install vue@^3.4.0 vue-router@^4.2.0
   ```

### Fase 3: Configuração (30 min)

1. **Criar vite.config.js**
   ```javascript
   import { defineConfig } from 'vite'
   import vue from '@vitejs/plugin-vue'
   import { resolve } from 'path'
   
   export default defineConfig({
     plugins: [vue()],
     resolve: {
       alias: {
         '@': resolve(__dirname, 'src')
       }
     },
     server: {
       port: 8080,
       proxy: {
         '/api': {
           target: 'http://localhost:5000',
           changeOrigin: true
         }
       }
     },
     build: {
       outDir: 'dist',
       sourcemap: true
     }
   })
   ```

2. **Atualizar index.html**
   - Mover de `public/index.html` para `index.html` (raiz)
   - Adicionar `<script type="module" src="/src/main.js"></script>`

3. **Atualizar package.json scripts**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "lint": "eslint src --ext .vue,.js,.jsx,.ts,.tsx"
     }
   }
   ```

### Fase 4: Ajustes de Código (45 min)

1. **Atualizar main.js**
   ```javascript
   import { createApp } from 'vue'
   import App from './App.vue'
   import router from './router'
   import axios from 'axios'
   import { io } from 'socket.io-client'
   import './assets/tailwind.css'
   
   // Configurações permanecem iguais
   // ...
   
   const app = createApp(App)
   app.use(router)
   app.mount('#app')
   ```

2. **Verificar imports**
   - Trocar imports relativos por absolutos onde necessário
   - Verificar se todos os assets estão sendo importados corretamente

3. **Atualizar configuração do Tailwind**
   ```javascript
   // tailwind.config.js
   module.exports = {
     content: [
       "./index.html",
       "./src/**/*.{vue,js,ts,jsx,tsx}"
     ],
     // resto da configuração permanece igual
   }
   ```

### Fase 5: Configuração do ESLint (20 min)

1. **Atualizar ESLint para Vite**
   ```bash
   npm install --save-dev eslint-plugin-vue@latest
   npm install --save-dev @babel/eslint-parser@latest
   ```

2. **Criar .eslintrc.js**
   ```javascript
   module.exports = {
     env: {
       node: true,
       'vue/setup-compiler-macros': true
     },
     extends: [
       'plugin:vue/vue3-essential',
       'eslint:recommended'
     ],
     parserOptions: {
       parser: '@babel/eslint-parser',
       requireConfigFile: false
     },
     rules: {}
   }
   ```

### Fase 6: Testes e Validação (30 min)

1. **Testar desenvolvimento**
   ```bash
   npm run dev
   ```

2. **Testar build de produção**
   ```bash
   npm run build
   npm run preview
   ```

3. **Verificar funcionalidades**
   - ✅ Roteamento funciona
   - ✅ Socket.IO conecta
   - ✅ API calls funcionam
   - ✅ Tailwind CSS carrega
   - ✅ HMR funciona

### Fase 7: Limpeza (10 min)

1. **Remover arquivos desnecessários**
   ```bash
   rm vue.config.js
   rm babel.config.js # se não usado
   ```

2. **Atualizar .gitignore**
   ```
   # Vite
   dist/
   dist-ssr/
   *.local
   
   # Hot-reload
   .vite/
   ```

## 📦 Nova Estrutura de Dependências

### Dependencies
```json
{
  "vue": "^3.4.0",
  "vue-router": "^4.2.0",
  "axios": "^1.9.0",
  "socket.io-client": "^4.8.1"
}
```

### DevDependencies
```json
{
  "@vitejs/plugin-vue": "^5.0.0",
  "vite": "^5.0.0",
  "tailwindcss": "^3.4.17",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.6",
  "eslint": "^8.0.0",
  "eslint-plugin-vue": "^9.0.0",
  "@babel/eslint-parser": "^7.23.0"
}
```

## ⚠️ Possíveis Problemas e Soluções

### 1. Imports de Assets
**Problema:** Assets não carregam  
**Solução:** Usar `import` explícito ou colocar em `public/`

### 2. Environment Variables
**Problema:** process.env não funciona  
**Solução:** Usar `import.meta.env` e prefixar com `VITE_`

### 3. Global Properties
**Problema:** $socket não funciona  
**Solução:** Verificar se está sendo definido corretamente no app.config.globalProperties

### 4. CSS Imports
**Problema:** Tailwind não carrega  
**Solução:** Verificar se o import está correto em main.js

## 🎯 Resultados Esperados

### Performance
- **Dev Server:** ~2s → ~200ms startup
- **HMR:** ~1s → ~50ms updates
- **Build:** ~45s → ~15s

### Segurança
- **Vulnerabilidades:** 32 → 0
- **Dependências:** Atualizadas e mantidas

### Developer Experience
- **Faster feedback loop**
- **Better error messages**
- **Modern tooling**

## 📚 Recursos Adicionais

- [Vite Migration Guide](https://vitejs.dev/guide/migration.html)
- [Vue 3 + Vite Template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-vue)
- [Vite Configuration Reference](https://vitejs.dev/config/)

---

**Tempo Total Estimado:** 2-3 horas  
**Complexidade:** Média  
**Risco:** Baixo (com backup)  
**Benefício:** Alto