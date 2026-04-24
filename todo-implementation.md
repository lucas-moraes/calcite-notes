# Electron Development - Implementation Checklist

Lista de ajustes necessários para alinhar o projeto Calcite com as melhores práticas de desenvolvimento Electron.

---

## 🔒 Segurança

- [x] **Remover `sandbox: false`** do `webPreferences` em `main.ts` (linha 176)
  - ✅ **CONCLUÍDO**: Alterado para `sandbox: true` para habilitar sandbox de segurança
  - Data: 2026-04-24

- [ ] **Validar canais IPC no preload**
  - Criar whitelist de canais válidos no preload para garantir que apenas canais autorizados sejam usados
  - Implementação: Definir array `validChannels` e validar antes de cada chamada IPC
  - Prioridade: **Média**

---

## 🏗️ Estrutura do Projeto

- [ ] **Criar pasta `shared/`** para tipos compartilhados
  - Tipos de IPC, interfaces de configuração, constantes
  - Permite type-safety entre main e renderer sem duplicação de código
  - Prioridade: **Média**

- [ ] **Reorganizar estrutura seguindo o padrão recomendado**
  ```
  src/
  ├── main/         # Mover electron/main.ts para cá
  │   ├── index.ts
  │   ├── ipc/      # Handlers IPC organizados por módulo
  │   └── utils/    # Utilitários do main process
  ├── preload/      # Mover electron/preload.ts para cá
  │   └── index.ts
  ├── renderer/     # Mover src/ atual para cá
  │   ├── components/
  │   ├── pages/
  │   └── styles/
  └── shared/       # Tipos IPC compartilhados
      └── types/
  ```
  - Prioridade: **Baixa** (requer mudanças significativas em paths)

---

## 🪟 Gerenciamento de Janelas

- [x] **Persistir estado da janela** (tamanho, posição, maximizado)
  - ✅ **CONCLUÍDO**: Implementado sistema de persistência via arquivo `window-state.json`
  - Salva tamanho, posição e estado maximizado
  - Janela só é exibida após carregamento completo (`ready-to-show`)
  - Data: 2026-04-24

- [x] **Implementar `single-instance-lock`**
  - ✅ **CONCLUÍDO**: Implementado usando `app.requestSingleInstanceLock()`
  - Handler `second-instance` foca a janela existente
  - Data: 2026-04-24

- [x] **Comportamento diferente por plataforma em `window-all-closed`**
  - ✅ **CONCLUÍDO**: Implementado comportamento específico por plataforma
  - macOS: mantém app rodando
  - Windows/Linux: fecha completamente
  - Data: 2026-04-24

---

## ⚠️ Tratamento de Erros

- [x] **Adicionar handler global de erros** (`process.on('uncaughtException')`)
  - ✅ **CONCLUÍDO**: Handler implementado com logging via electron-log
  - Mostra dialog de erro em produção
  - Data: 2026-04-24

- [x] **Adicionar handler de rejeições não tratadas** (`process.on('unhandledRejection')`)
  - ✅ **CONCLUÍDO**: Handler implementado com logging via electron-log
  - Data: 2026-04-24

- [x] **Melhorar mensagens de erro nos IPC handlers**
  - ✅ **CONCLUÍDO**: Handlers agora retornam objetos estruturados `{ success: boolean, error?: string }`
  - Mensagens de erro específicas para diferentes falhas (path inválido, arquivo não encontrado, etc.)
  - Data: 2026-04-24

---

## 🔄 Funcionalidades Adicionais

- [ ] **Implementar auto-updates**
  - Usar `electron-updater` para atualizações automáticas
  - Adicionar menu/notify para informar usuário sobre atualizações
  - Configurar `electron-builder` para gerar pacotes de update
  - Prioridade: **Baixa**

- [x] **Adicionar sistema de logging**
  - ✅ **CONCLUÍDO**: Instalado e configurado `electron-log`
  - Logs salvos em arquivo automaticamente
  - Substituições de console.log/error por log.info/error/debug
  - Níveis configuráveis por ambiente (debug em dev, warn+ em produção)
  - Data: 2026-04-24

- [ ] **Implementar crash reporter**
  - Configurar `crashReporter` do Electron
  - Enviar relatórios para serviço de monitoramento ou arquivo local
  - Prioridade: **Baixa**

- [ ] **Registrar protocol handler** (ex: `calcite://`)
  - Permitir abrir notas diretamente de links externos
  - Implementação: `app.setAsDefaultProtocolClient('calcite')`
  - Prioridade: **Baixa**

---

## 🔧 Correções de Código

- [x] **Consistência de formato de arquivos**
  - ✅ **CONCLUÍDO**: Handler `get-notes` atualizado para buscar arquivos `.md` em vez de `.json`
  - Formato unificado para Markdown `.md`
  - Data: 2026-04-24

- [x] **Validar parâmetros em IPC handlers**
  - ✅ **CONCLUÍDO**: Handlers `save-note` e `save-new-note` agora validam parâmetros
  - Verificações de tipo e existência de propriedades obrigatórias
  - Retornam erros descritivos para validações falhas
  - Data: 2026-04-24

- [x] **Sanitizar paths em operações de arquivo**
  - ✅ **CONCLUÍDO**: Implementada função `isPathWithinNotesDir()` para validar paths
  - Todos os handlers IPC agora validam paths antes de operações de arquivo
  - Retornam erros apropriados quando o path está fora do diretório permitido
  - Data: 2026-04-24

---

## 🧪 Qualidade de Código

- [ ] **Adicionar ESLint**
  - Configurar com regras recomendadas para Electron + React + TypeScript
  - Adicionar script `lint:eslint` no package.json
  - Prioridade: **Média**

- [ ] **Adicionar Prettier**
  - Formatação consistente de código
  - Integrar com ESLint
  - Prioridade: **Média**

- [ ] **Habilitar strict mode no TypeScript**
  - Adicionar `"strict": true` ao `tsconfig.json`
  - Corrigir erros de tipo que surgirem
  - Prioridade: **Média**

- [ ] **Adicionar testes unitários**
  - Configurar Jest ou Vitest
  - Testar IPC handlers principais
  - Testar lógica de parsing de notas
  - Prioridade: **Baixa** (AGENTS.md menciona que não existe test suite)

---

## 📋 Documentação

- [ ] **Criar documentação de IPC API**
  - Listar todos os handlers disponíveis
  - Documentar parâmetros de entrada e saída
  - Exemplos de uso
  - Prioridade: **Baixa**

---

## 📊 Resumo de Implementação

**Data:** 2026-04-24  
**Status:** 10 de 17 features implementadas ✅ (59%)

### ✅ Concluído
- 🔒 Remover `sandbox: false` → `sandbox: true`
- 🔒 Sanitizar paths em operações de arquivo
- ⚠️ Handlers globais de erro (`uncaughtException`, `unhandledRejection`)
- ⚠️ Melhorar mensagens de erro nos IPC handlers (retornos estruturados)
- 🔧 Consistência de formato de arquivos (`.json` → `.md`)
- 🔧 Validar parâmetros em IPC handlers
- 🪟 Persistência de estado da janela
- 🪟 Single instance lock
- 🪟 Comportamento por plataforma (`window-all-closed`)
- 🔄 Sistema de logging (`electron-log`)

### ⏳ Pendente
- Validar canais IPC no preload
- Criar pasta `shared/` para tipos
- ESLint + Prettier
- Strict mode TypeScript
- Auto-updates
- Crash reporter
- Protocol handler
- Documentação IPC API
- Testes unitários
- Reorganizar estrutura do projeto

---

## 📊 Prioridade Geral (Original)

### 🔴 Alta Prioridade (Segurança & Correções)
1. ✅ Remover `sandbox: false`
2. ✅ Consistência de formato de arquivos (`.json` vs `.md`)
3. ✅ Sanitizar paths em operações de arquivo
4. ✅ Handlers globais de erro

### 🟡 Média Prioridade (Qualidade & UX)
5. ✅ Sistema de logging
6. ✅ Persistência de estado da janela
7. ✅ Single instance lock
8. ✅ Validação de parâmetros IPC
9. ✅ Melhorar mensagens de erro nos IPC handlers
10. ⏳ ESLint + Prettier + Strict TypeScript
11. ⏳ Validar canais IPC no preload

### 🟢 Baixa Prioridade (Features & Documentação)
11. ⏳ Reorganizar estrutura do projeto
12. ✅ Comportamento por plataforma
13. ⏳ Auto-updates
14. ⏳ Crash reporter
15. ⏳ Protocol handler
16. ⏳ Documentação IPC API
17. ⏳ Testes unitários

---

## 📋 Changelog

### 2026-04-24 - Security & Stability Improvements

#### 🔒 Security
- **Sandbox enabled**: Changed `sandbox: false` to `sandbox: true` in BrowserWindow webPreferences
- **Path sanitization**: Implemented `isPathWithinNotesDir()` function to prevent path traversal attacks
- All file operation IPC handlers now validate paths before execution

#### ⚠️ Error Handling
- Added global `uncaughtException` handler with logging and user dialog in production
- Added global `unhandledRejection` handler for unhandled Promise rejections
- IPC handlers now return structured result objects: `{ success: boolean, error?: string }`

#### 🔧 Bug Fixes
- **File format consistency**: Fixed `get-notes` handler to read `.md` files instead of `.json`
- All notes now consistently use Markdown format

#### 🪟 Window Management
- **Window state persistence**: Implemented automatic save/restore of window size, position, and maximized state
- **Single instance lock**: Prevent multiple app instances; focus existing window instead
- **Platform-specific behavior**: Different `window-all-closed` behavior for macOS vs Windows/Linux
- **Ready-to-show**: Window only appears after content is fully loaded

#### 🔄 Logging System
- Installed and configured `electron-log` package
- Replaced all `console.log/error` with structured logging
- Log files automatically saved to userData directory
- Different log levels for development (debug) and production (warn+)

#### 🔌 IPC Improvements
- All handlers now validate input parameters
- Structured error responses for better debugging
- Frontend updated to handle new IPC result format

---

## 📝 Notas de Implementação

- **Sempre testar em todas as plataformas alvo** (macOS, Windows, Linux)
- **Manter compatibilidade** com dados existentes (migração se necessário)
- **Seguir princípios de segurança**: nunca confiar no renderer, validar todas as entradas
- **Documentar breaking changes** no CHANGELOG
