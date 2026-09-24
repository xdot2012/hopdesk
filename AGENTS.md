# Instruções para agentes de IA — HopDesk

Este repositório é o **HopDesk**: plataforma full-stack de atendimento e gestão de solicitações (helpdesk). As regras estão separadas por contexto:

| Contexto | Regra Cursor (auto) | Documentação |
|----------|---------------------|--------------|
| **Global** | `.cursor/rules/hopdesk-padroes.mdc` | — |
| **Frontend** | `.cursor/rules/hopdesk-frontend.mdc` | [`client/AGENTS.md`](client/AGENTS.md) |
| **Backend** | `.cursor/rules/hopdesk-backend.mdc` | [`server/AGENTS.md`](server/AGENTS.md) |

As regras de frontend e backend são ativadas ao trabalhar em `client/**` ou `server/**`. A regra global de padrões aplica-se em toda conversa.

## Contexto compartilhado

- **Objetivo:** HopDesk — chamados, setores, SLA, base de conhecimento, papéis (`customer` / `agent` / `admin`)
- **Princípio transversal:** simplicidade — estender o que já existe; não inventar arquitetura
- **Atribuição:** somente manual (`assign_me` + troca de responsável)
- **Frontend desktop first (helpdesk):** shell com sidebar; mobile via Sheet; detalhes em [`client/AGENTS.md`](client/AGENTS.md)

## Seguir padrões existentes

Regra Cursor global: `.cursor/rules/hopdesk-padroes.mdc` (ativa em toda conversa).

Ao implementar qualquer mudança:

1. **Leia código similar** no mesmo diretório/domínio antes de escrever.
2. **Replique** estrutura de pastas, nomenclatura, imports e abstrações já usadas.
3. **Reutilize** componentes, hooks, deps e bases de model/schema existentes.
4. **Não introduza** bibliotecas ou padrões arquiteturais novos sem necessidade explícita.
5. **Consulte** o `AGENTS.md` do contexto (`client/` ou `server/`) para detalhes.

No frontend, também: um componente por arquivo; evitar `useEffect`; UI de tela em `pages/`; forms em `Form/` + Zod — detalhes em [`client/AGENTS.md`](client/AGENTS.md).

## Estrutura do repositório

```
hopdesk/
├── client/     # React + Vite + Tailwind + shadcn/ui
├── server/     # FastAPI + SQLAlchemy + PostgreSQL
└── docs/       # Documentação geral (ex.: Bruno)
```

## Organização por recurso e ação

O código deve refletir **entidades e ações do domínio** — não abstrações técnicas genéricas.

| Princípio | Correto | Evitar |
|-----------|---------|--------|
| Rotas/API | Um arquivo por recurso (`user/profile.py`, `auth/session.py`) | Agrupar em `lookups`, `files` com uploads misturados |
| Uploads | Junto ao recurso dono (`/user/me/avatar`) | Rota genérica de upload separada do contexto |
| Download de arquivos | Só `GET /v1/files/{file_key}` (proxy/storage) | — |
| Use cases | Verbo + substantivo de ação real (`create_user`, `get_user_profile`) | Nomes genéricos (`resolve_references`, `handle_data`) |
| Frontend `api/` | Espelha o domínio (`api/user/uploadAvatar/`, `api/auth/signIn/`) | Pasta `api/files/` ou `api/lookups/` |

Detalhes por contexto: [`client/AGENTS.md`](client/AGENTS.md) e [`server/AGENTS.md`](server/AGENTS.md).
