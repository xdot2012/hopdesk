# HopDesk

Plataforma de atendimento e gestão de solicitações — helpdesk com identidade HopDesk.

## Estrutura

- `client/` — React + Vite + Tailwind + shadcn/ui
- `server/` — FastAPI + SQLAlchemy + PostgreSQL
- `docs/bruno/` — coleção de API (Bruno)

## Pré-requisitos

| Ferramenta | Uso |
|------------|-----|
| **Git** | Clonar o repositório |
| **Docker** + **Docker Compose** | Postgres (PostGIS) e Redis em desenvolvimento |
| **Python 3.10+** | Backend |
| **Node.js 18+** (npm) | Frontend |

## Instalação e configuração

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio> hopdesk
cd hopdesk
```

### 2. Backend — variáveis de ambiente

```bash
cd server
cp .env.example .env
```

Edite o `server/.env`. Em desenvolvimento local, use pelo menos:

| Variável | Descrição |
|----------|-----------|
| `SYSTEM_NAME` | Prefixo dos containers/volumes Docker (`hopdesk`) |
| `SYSTEM_DEFAULT_PASSWORD` | Senha dos usuários criados pelo seed de tickets (ambiente `dev`) |
| `DB_*` | Credenciais e host do Postgres — `DB_PORT` deve ser **5435** com `docker-compose.dev.yml` |
| `CACHE_HOST` / `CACHE_PORT` | Redis — padrão `localhost` / `6380` |
| `SECRET_KEY` | Chave JWT (string longa e aleatória) |
| `ENCRYPTION_KEY` | Chave Fernet (base64) |
| `REQUIRE_TWO_FACTOR` | Em local, use `False` se não tiver SMTP |
| `REQUIRE_EMAIL_CONFIRMATION` | Em local, use `False` se não tiver SMTP |
| `USE_REDIS` | `True` para usar o Redis do Compose |

Gerar chaves:

```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY (Fernet)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Exemplo mínimo para desenvolvimento:

```env
SYSTEM_NAME="hopdesk"
SYSTEM_EMAIL="hopdesk@example.com"
SYSTEM_DEFAULT_PASSWORD="change-me"
DB_USER="hopdesk"
DB_NAME="hopdesk"
DB_PASSWORD="change-me"
DB_HOST="localhost"
DB_PORT="5435"
DB_DRIVER="postgresql"
CACHE_PORT="6380"
CACHE_HOST="localhost"
SECRET_KEY="<gere-com-o-comando-acima>"
ENCRYPTION_KEY="<gere-com-o-comando-acima>"
ALGORITHM="HS256"
USE_SENTRY=False
SENTRY_DSN=""
REQUIRE_TWO_FACTOR=False
REQUIRE_EMAIL_CONFIRMATION=False
USE_REDIS=True
```

### 3. Backend — dependências Python

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
```

O `Makefile` (`make dev`) usa `.venv/bin/uvicorn` — mantenha o venv em `server/.venv`.

### 4. Banco e cache (Docker)

Com o Docker em execução:

```bash
cd server
make db        # sobe Postgres + Redis (+ Redis Insight)
make migrate   # alembic upgrade head
```

Serviços expostos:

| Serviço | URL / porta |
|---------|-------------|
| API (depois do `make dev`) | http://127.0.0.1:8000 |
| Docs OpenAPI | http://127.0.0.1:8000/docs |
| Postgres | `localhost:5435` |
| Redis | `localhost:6380` |
| Redis Insight | http://127.0.0.1:5540 |

Para parar os containers: `make db-down`.

### 5. Frontend

```bash
cd client
npm install --legacy-peer-deps
```

A API base está em `http://localhost:8000/` (arquivo `client/src/services/http/index.ts`). Não é necessário `.env` no client para o fluxo local padrão.

## Desenvolvimento

Suba backend e frontend em terminais separados.

### Backend

```bash
cd server
make db       # se ainda não estiver rodando
make migrate  # se houver migrations novas
make dev      # uvicorn com reload
```

### Frontend

```bash
cd client
npm run dev
```

App: http://127.0.0.1:5173

No primeiro start em `ENVIRONMENT=dev` (padrão), o backend aplica seeds (roles, prioridades, SLA, política de atendimento) e, se o CSV de seed existir, cria chamados/usuários de teste com a senha de `SYSTEM_DEFAULT_PASSWORD`.

### Comandos úteis (server)

| Comando | Função |
|---------|--------|
| `make db` / `make db-down` | Sobe / para Postgres + Redis |
| `make migrate` | Aplica migrations |
| `make create-migrations` | Gera migration Alembic (revisar o arquivo gerado) |
| `make undo-migrate` | Desfaz a última migration |
| `make cache-clear` | Limpa o Redis de desenvolvimento |
| `make test` | Roda pytest com coverage |

### Comandos úteis (client)

| Comando | Função |
|---------|--------|
| `npm test` | Vitest (unit/smoke) |
| `npm run test:e2e:install` | Baixa Chromium do Playwright (uma vez) |
| `npm run test:e2e` | Playwright smoke em `tests/e2e/` (ex.: tela de sign-in) |

### API no Bruno

Coleção em [`docs/bruno/`](docs/bruno/) — ver [`docs/bruno/README.md`](docs/bruno/README.md). Ambiente **Local**: `http://localhost:8000`.

## Documentação para agentes

Ver [`AGENTS.md`](AGENTS.md), [`client/AGENTS.md`](client/AGENTS.md) e [`server/AGENTS.md`](server/AGENTS.md).

## Renomear ambiente local

Se você atualizou de um fork anterior, ajuste `SYSTEM_NAME` e credenciais do banco no `server/.env` para `hopdesk` e recrie containers/volumes Docker se necessário.

## Autor

**Douglas Sales**

- GitHub: [xdot2012](https://github.com/xdot2012)
- LinkedIn: [douglas-sales-4a5528a5](https://www.linkedin.com/in/douglas-sales-4a5528a5/)

## Licença

MIT — ver [`LICENSE`](LICENSE).
