# Frontend — Instruções para agentes de IA

> Regra Cursor: `.cursor/rules/hopdesk-frontend.mdc` (ativa em `client/**`)

## Contexto

- **Objetivo:** HopDesk — atendimento, chamados e base de conhecimento
- **Público:** agentes e usuários finais; interface clara, poucos cliques
- **Stack:** React, Vite, Tailwind CSS v4, shadcn/ui, Lucide icons, Zustand, React Router v6, i18next
- **Visual:** workspace claro estilo ClickUp — neutros + azul nos CTAs (tokens em `src/index.css`), helpdesk desktop

## Filosofia de usabilidade

O usuário deve entender **"O que faço aqui?"** em menos de 3 segundos, sem tutorial.

## Desktop first (helpdesk)

Projete e implemente priorizando **desktop**. Mobile continua suportado (sidebar vira Sheet no staff; customer usa topbar), mas o layout canônico do staff é o shell com sidebar.

| Princípio | Correto | Incorreto |
|-----------|---------|-----------|
| Layout staff | Sidebar + barra superior + conteúdo amplo | Só navbar mobile sem nav lateral |
| Layout customer | Topbar (logo + nav + busca KB) + FAB abrir chamado | Forçar sidebar no customer |
| Navegação principal | Itens na sidebar (staff) ou topbar (customer) | Esconder rotas só em atalhos |
| Densidade | Listas e painéis usáveis em tela larga | Forçar fluxo de uma coluna em todo desktop |
| Mobile | Mesmas rotas; menu staff em Sheet; ícones na topbar | Fluxo paralelo incompatível |

| Regra | Correto | Incorreto |
|-------|---------|-----------|
| Textos claros | "Meus chamados" | "Profile settings" |
| Ações visíveis | Sidebar / topbar + CTAs claros | Ícones sem rótulo em ações importantes |
| Poucos cliques | Destino na sidebar ou topbar | Ação só em submenu aninhado |
| Linguagem acolhedora | "Olá, Maria! O que você gostaria de fazer hoje?" | "Painel — Visão geral" |
| Confirmação | Diálogo antes de sair | Logout direto |

## Arquitetura de navegação

**Staff**

```
┌──────────────┬────────────────────────────────────────┐
│  Sidebar     │  TopBar: [Base] 🔍 busca KB  🔔 Avatar │
│  [Logo]      │────────────────────────────────────────│
│  Chamados    │  Conteúdo (Outlet)                     │
│  Histórico   │                                        │
│  Indicadores │  (admin; dashboard SLA + ?group=)      │
│  Config      │  SLA fica em Configurações → aba SLA   │
│  Sair        │                                        │
└──────────────┴────────────────────────────────────────┘
```

**Customer** (sem sidebar)

```
┌──────────────────────────────────────────────────────┐
│  [Logo]  Meus chamados | Base   🔍   🎫 📖 🔔 Avatar │
│──────────────────────────────────────────────────────│
│  Lista de chamados + FAB abrir chamado               │
└──────────────────────────────────────────────────────┘
```

### Usar

- Sidebar staff (`src/components/Drawer/`) — logo + Chamados, Histórico, Indicadores (admin), Configurações, Sair
- TopBar (`src/components/Navbar/`) — busca KB global; staff: atalho Base; customer: logo + nav (+ ícones abaixo de `lg`)
- Base de conhecimento — overlay (`?kb=`) sobre a página atual via topbar/`KnowledgeBaseDialog`; URLs `/knowledge-base/*` redirecionam para o overlay (compartilhamento)
- SLA (Service Level Agreement) — aba em `pages/Settings/` (`SlaTab`)
- Layout (`src/pages/Dashboard/Layout/`) — drawer (staff) + topbar + `<main>`
- Home staff — fila em `/tickets` (padrão após login); `/` só para customer
- Indicadores — dashboard SLA com filtro de período + agrupamento (`?group=overall|priority|requester|agent|sector`); fila ao vivo permanece em `/tickets`

### Não usar

- Submenus aninhados profundos
- Esconder navegação principal só no hub
- Reintroduzir Base/SLA como itens do drawer (já migraram)
- Cores hardcoded (usar tokens semânticos)

## Padrões de componentes

### Navbar (TopBar)

Barra superior: busca da base de conhecimento; notificações e avatar. No staff, logo fica na sidebar; no customer, logo e nav ficam na topbar. Abaixo de `lg`, customer vê ícones para Meus chamados e Base.

**Referência:** `src/components/Navbar/`, `src/components/Navbar/UserMenu/`

### Sidebar

Somente staff. Itens planos: Chamados, Histórico, Indicadores (admin), Configurações, Sair (com confirmação).

**Referência:** `src/components/Drawer/`, `src/components/Drawer/DrawerMenu/`

### Home autenticada

- **Staff:** fila de chamados (`/tickets`) — destino padrão após login; `/` redireciona para a fila
- **Customer:** lista de chamados em `/`
- **Indicadores** (admin): dashboard SLA (`/indicators`) com período + `?group=`; a fila ao vivo fica em `/tickets`

### Preferências

- **Idioma** — `ChangeLanguageSelect` em Preferências; persistido em `localStorage` (`locale`)
- **Tema** — `ChangeModeButton`; persistido em `localStorage` (`color-mode`)

Traduções em `src/locales/pt-BR.json` e `src/locales/en.json`. Usar `useTranslation()` nos componentes.

## Padrões de código existentes

**Regra:** todo código novo deve seguir os padrões já estabelecidos no projeto. Em dúvida, copie a estrutura de um arquivo similar.

### Organização de código (obrigatório)

| Regra | Correto | Evitar |
|-------|---------|--------|
| Um componente por arquivo | `Foo/index.tsx` exporta só `Foo` | Vários `function Bar`/`Baz` no mesmo `.tsx` |
| `useEffect` | Só sync externo (subscription, timer, DOM API) | Espelhar props→state; lógica que cabe em evento/derivação |
| Onde vive o componente | Genérico → `components/`; de uma tela → `pages/<Area>/` | `StaffDashboard*` / views de ticket só numa página em `components/` |
| Página ↔ router | URL (path/search) como fonte de verdade | Tab/filtro só em `useState` quando deveria ser `?group=` etc. |
| Forms | `Form/index.tsx` + Zod (`schema.ts` + `useFormValidation`) | `<form>` inline sem Zod / sem pasta `Form/` |

**Exceção:** `components/ui/` (shadcn) pode agrupar primitivos no mesmo arquivo.

**Referência de form:** `pages/Auth/SignIn/Form/` + `api/auth/signIn/schema.ts`

### Estrutura de pastas

```
src/
├── api/<domain>/<recurso>/    # index.ts; types.ts / schema.ts (Zod) quando necessário
├── components/<Nome>/         # só genéricos; index.tsx (1 componente, default export)
├── components/ui/             # shadcn (arquivos flat; exceção multi-export)
├── contexts/<Nome>/           # providers de domínio
├── pages/<Area>/<Nome>/       # index.tsx + Form/index.tsx; UI específica da tela aqui
├── hooks/                     # useFormValidation, useMutation, useQuery
├── store/<domain>Store.ts     # Zustand + barrel em store/index.ts
├── router/paths.ts            # constantes de rota UI
└── services/http/             # cliente HTTP (não usar direto nas páginas)
```

### API: espelhar o backend por recurso

Organize `api/` pelo **mesmo domínio e recurso** da API — não por tipo técnico.

```
api/
├── index.ts                   # paths HTTP (SIGN_IN_PATH, …)
├── auth/
│   ├── signIn/                # POST /v1/auth/sign_in
│   ├── signOut/
│   └── signUp/
└── user/
    ├── getProfile/
    ├── updateProfile/
    └── uploadAvatar/          # POST /v1/user/me/avatar
```

| Princípio | Correto | Evitar |
|-----------|---------|--------|
| Paths | Constantes em `api/index.ts` | URL hardcoded no componente |
| Upload | No recurso dono (`api/user/uploadAvatar/`) | Pasta genérica `api/files/` |
| Listagem | Um módulo por recurso | Módulo `api/lookups/` |
| Exibir imagem/arquivo | `AuthenticatedImage` / `AuthenticatedAvatarImage` / `openAuthenticatedFile` (Bearer → blob) | `<img src={url}>` bare em `/v1/files` |

### Imports

```typescript
// Cross-module: alias ~/
import { Button } from '~/components/ui/button';
import useSignIn from '~/api/auth/signIn';
import { useAlertStore } from '~/store';
import { DASHBOARD } from '~/router/paths';

// Mesmo módulo: relativo
import SignInForm from './Form';
```

### API hooks

| Tipo | Hook base | Quando usar |
|------|-----------|-------------|
| Formulário | `useFormValidation` | POST/PUT com zod + react-hook-form |
| Mutação simples | `useMutation` | POST sem formulário (ex.: sign out) |
| Leitura | `useQuery` / `useImmutableQuery` | GET |

**Template de formulário:**
1. `schema.ts` com zod → exportar `{action}Schema` e `{Action}Type`
2. `index.ts` com `useFormValidation<ResponseProps>(schema, PATH)`
3. Paths centralizados em `api/index.ts`

**Referência:** `api/auth/signIn/`

### Formulários em páginas

- **Sempre** pasta `Form/` própria (mesmo padrão Auth) — não embutir o form na page
- Schema Zod + `useFormValidation` **antes** de chamar a API (dialogs inclusos)
- Usar `FormControl` (`TextInput`, `PasswordInput`, `BooleanInput`) quando couber
- Destructure: `{ create, control, handleSubmit, errors, isMutating }`
- Submit tipado com `z.infer` do schema
- Feedback via `useAlertStore` (`showError`, `showSuccessSnack`)
- Ações destrutivas: `ButtonWithDialog`

**Referência:** `pages/Auth/SignIn/Form/index.tsx`

### Páginas

- Page (`index.tsx`): layout, título, links — estado de navegação alinhado ao router
- Form (`Form/index.tsx`): lógica de submissão + validação Zod
- UI usada só nesta área: coloque sob `pages/<Area>/…`, não em `components/`
- Rotas autenticadas: registrar em `router/index.tsx` sob `RestrictedRoute` → `Layout`
- Páginas secundárias: link "Voltar ao painel"
- Rotas legadas: preferir `<Navigate>` para a rota canônica

**Referência:** `pages/Settings/index.tsx`, `pages/Indicators/index.tsx` (`?group=`)

### Componentes

- Pasta com `index.tsx`, `export default function` — **um** componente por arquivo
- Genéricos em `components/`; específicos de tela em `pages/`
- Evitar `useEffect` quando der para derivar no render ou usar handlers
- Estilização: `cn()` + tokens semânticos + shadcn/ui
- Ícones: Lucide React

**Referência:** `components/EmptyState/index.tsx`

### Nomenclatura

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Pastas | PascalCase | `EmptyState/`, `SignIn/` |
| API hook (leitura) | `useGet` / `useList` + recurso | `useGetProfile` |
| Função de upload | verbo direto | `uploadAvatar` |
| Path constant | `SCREAMING_SNAKE_PATH` | `SIGN_IN_PATH` |
| Rota | `SCREAMING_SNAKE` | `DASHBOARD`, `SETTINGS` |
| Response type | `<Action>ResponseProps` | `SignInResponseProps` |
| Schema type | `<Action>Type` | `SignInType` |
| Store | `use<Domain>Store` | `useUserStore` |

### Referências canônicas

| Tarefa | Copiar estrutura de |
|--------|---------------------|
| Novo formulário auth | `api/auth/signIn/` + `pages/Auth/SignIn/Form/` |
| Upload no contexto | `api/user/uploadAvatar/` |
| Nova página autenticada | `pages/Settings/index.tsx` |
| Novo componente UI | `components/EmptyState/index.tsx` |
| Nova mutação simples | `api/auth/signOut/index.ts` |

### Ao adicionar código novo

1. Encontre o arquivo mais parecido no projeto.
2. Copie a estrutura (pastas, exports, imports, hooks).
3. Adapte apenas o necessário — não mude o padrão do domínio.

## Diretrizes visuais

- Marca: HopDesk (`AppLogo`, favicon `hopdesk-icon.svg`, mark do sapo em `public/hopdesk-mark.png`)
- Fonte: Jost
- Componentes UI: `src/components/ui/` (shadcn)
- Ícones: Lucide React + SVG de marca em `src/components/brand/`
- Cores: CSS variables em `src/index.css` — Teal Hop (primary), Pond (dark), Lily (destaques)
- Shell desktop staff: sidebar + topbar; customer: topbar; mobile staff: Sheet à esquerda
- Preview de marca: `/brand/identity` (somente URL, sem link na navegação)

## Testes

- Unit/smoke: Vitest — `npm test` (arquivos `*.test.ts` em `src/`: schemas Zod, helpers de ticket/paths/API, auth returnTo)
- E2E smoke: Playwright — `npm run test:e2e:install` (uma vez) e `npm run test:e2e` (`tests/e2e/`)
- Config: `vitest.config.ts`, `playwright.config.ts`

## Checklist de entrega

- [ ] API espelha recursos do backend (sem `lookups/` ou `files/` genéricos)?
- [ ] Uploads usam path do recurso associado?
- [ ] Segue estrutura de pastas e nomenclatura existente?
- [ ] Usa hooks de `api/` (não axios direto nas páginas)?
- [ ] Um componente React por arquivo (exceto `components/ui/`)?
- [ ] UI específica da tela está em `pages/`, não em `components/`?
- [ ] Sem `useEffect` desnecessário (derivação/handlers preferidos)?
- [ ] Página alinha estado de navegação ao router (path/search)?
- [ ] Formulários em `Form/` próprio + `useFormValidation` + Zod (+ `FormControl` quando couber)?
- [ ] Imports com `~/` para cross-module?
- [ ] Textos em português claro?
- [ ] Rotas principais acessíveis pela sidebar (staff) ou topbar (customer)?
- [ ] Usuário sem experiência técnica entenderia os rótulos?
- [ ] Funciona em desktop e mobile (Sheet / ícones topbar)?
- [ ] Ações destrutivas pedem confirmação?
- [ ] Caminho claro para voltar ao painel?

## Arquivos-chave

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/api/index.ts` | Constantes de path HTTP |
| `src/api/auth/signIn/` | Formulário + mutação de login |
| `src/api/user/uploadAvatar/` | Upload no recurso dono |
| `src/components/Drawer/` | Sidebar do helpdesk (staff) |
| `src/components/Navbar/index.tsx` | TopBar (KB, notificações, avatar; nav customer) |
| `src/components/AppLogo/index.tsx` | Marca HopDesk |
| `src/components/EmptyState/index.tsx` | Estado vazio reutilizável |
| `src/pages/Dashboard/index.tsx` | Tela inicial (staff overview / customer lista) |
| `src/pages/Dashboard/Layout/index.tsx` | Shell autenticado |
| `src/pages/Settings/index.tsx` | Configurações (+ aba SLA) |
| `src/router/paths.ts` | Constantes de rotas |
| `src/index.css` | Tokens de cor e tema |
