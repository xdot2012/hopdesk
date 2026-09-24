# Backend — Instruções para agentes de IA

> Regra Cursor: `.cursor/rules/hopdesk-backend.mdc` (ativa em `server/**`)

## Contexto

- **Objetivo:** backend do HopDesk (helpdesk) — auth, usuário, tickets, setores, SLA, base de conhecimento, arquivos
- **Stack:** Python 3.10+, FastAPI, SQLAlchemy 2.0 (sync), PostgreSQL, Pydantic v2, JWT, Alembic
- **Cache:** Redis (opcional; fallback em memória)
- **Storage:** local (disco) ou S3 via `FILES_STORAGE_BACKEND`
- **Testes:** pytest, httpx, SQLite em testes

## Arquitetura

```
routes (HTTP fino)  →  use_cases (lógica)  →  models + core/
```

| Camada | Diretório | Responsabilidade |
|--------|-----------|------------------|
| Routes | `app/routes/v1/{domain}/` | Endpoints, injeção de deps, retorno de schemas |
| Use cases | `app/use_cases/{domain}/` | Lógica de negócio e acesso ao DB |
| Models | `app/models/` | ORM SQLAlchemy |
| Schemas | `app/schemas/v1/` | DTOs Pydantic (request/response) |
| Core | `app/core/` | Infra interna: DB, auth, cache, hash, token, business time |
| Services | `app/services/{nome}/` | Integrações externas: email, arquivos, monitoramento |

## Domínios presentes

| Domínio | Conteúdo |
|---------|----------|
| `auth` | Sign-in, sign-up, sessão, refresh, confirmação de e-mail, 2FA |
| `user` | Perfil (`/me`), avatar |
| `ticket` | Chamados, mensagens, anexos, atribuição manual, SSE |
| `sector` / `user_sector` | Setores e vínculo usuário–setor (gestor) |
| `sla` | SLA (Service Level Agreement) — política editável (metas + timezone) e calendário útil fixo |
| `knowledge_base` | Artigos (árvore, visibilidade public/staff) |
| `instance` | Configurações da instância (flags de e-mail de ticket) |
| `files` | Somente download (`GET /{file_key}`) |

## Organização de rotas

### Por recurso, não por tipo técnico

Cada entidade exposta na API tem **seu próprio arquivo de route** — mesmo com poucos endpoints.

```
app/routes/v1/
├── auth/
├── user/
├── ticket/
├── sector/
├── user_sector/
├── sla/
├── knowledge_base/
├── instance/
└── files/
    └── __init__.py           # GET /{file_key}
```

Não criar módulos genéricos (`lookups`, uploads misturados em `files`).

### Arquivos (`/v1/files`)

A rota `files` é **somente leitura**:

| Rota | Uso |
|------|-----|
| `GET /v1/files/{file_key}` | Servir arquivo via storage (local ou S3); **exige Bearer** + ACL por tipo |

Uploads ficam no recurso associado:

| Upload | Rota |
|--------|------|
| Avatar | `POST /v1/user/me/avatar` |
| Imagem KB | `POST /v1/knowledge_base/articles/{id}/images` → key `knowledge-base/images/{article_id}/…` |
| Anexo de ticket | rotas em `ticket/` |

ACL do download (`use_cases/files/authorize_file_download.py`):

- `avatars/*` — qualquer autenticado
- `ticket-attachments/*` — mesmas regras de `get_ticket` (quando vinculado); pré-vínculo exige auth
- `knowledge-base/images/{article_id}/*` — mesmas regras de leitura do artigo

## Use cases: ações reais

Nomeie use cases como **ações que uma pessoa executa** ou **consultas explícitas** — verbo + substantivo (`verb_noun`).

| Tipo | Padrão | Exemplos |
|------|--------|----------|
| Buscar um | `get_{recurso}` | `get_user_profile` |
| Criar | `create_{recurso}` | `create_user` |
| Atualizar | `update_{recurso}` | `update_user_profile` |
| Composição | Importar getters de outros use cases | `get_user` usado ao atualizar perfil |

**Evitar:** módulos genéricos como `resolve_references`, `helpers`, `utils` em `use_cases/`.

**Referência:** `use_cases/user/create_user.py`, `use_cases/user/get_user_profile.py`

## Schemas

Schemas por domínio em `app/schemas/v1/`:

```
app/schemas/v1/
├── base.py
├── auth.py
├── user.py
├── ticket.py
├── knowledge_base.py
├── sla.py
└── …
```

**Referência:** `schemas/v1/auth.py`, `schemas/v1/ticket.py`, `schemas/v1/base.py`

## Tipagem estrutural (sem dataclass)

**Não usar `dataclass`.** Estruturas leves (payloads de serviço, resultados internos) usam **`TypedDict`**.

```python
from typing import TypedDict

class StoredFile(TypedDict):
    key: str
    url: str

stored: StoredFile = {"key": key, "url": url}
# acesso: stored["key"]
```

Contratos HTTP continuam em Pydantic (`RequestBaseModel` / `ResponseBaseModel`).

**Referência:** `services/file_management/entities.py`

## Padrões de código existentes

**Regra:** todo código novo deve seguir os padrões já estabelecidos. Em dúvida, copie a estrutura de um arquivo similar no mesmo domínio.

### Separação de responsabilidades

| Camada | Pode | Não pode |
|--------|------|----------|
| **Route** | HTTP, deps, `HTTPException`, orquestração leve | Lógica de negócio, queries complexas |
| **Use case** | DB, regras de negócio, composição | `HTTPException`, `Depends()` |
| **Schema** | Validação Pydantic, transformação | Acesso ao DB |
| **Model** | Mapeamento ORM | Lógica de negócio |

### Schemas

```python
# Request — preferir RequestBaseModel (camelCase entrada)
class SignInRequest(RequestBaseModel):
    email: str
    password: str = PasswordField

# Response — sempre ResponseBaseModel (camelCase saída)
class GetUserProfileResponse(ResponseBaseModel):
    email: EmailStr
    created_at: datetime.datetime
```

### Use cases

```python
async def create_user(email: str, password: str, hasher: HashService, db: Session):
    user = User(email=email.strip().lower(), password=hasher.create_hash(password))
    db.add(user)
    db.commit()
    return user
```

- `async def` com parâmetros explícitos (sem `Depends`)
- Retorna ORM, dict ou `None` — route decide se levanta erro
- Transações compostas: `commit=False` nos filhos
- Leituras caras: `@cached_database_resource`

**Referência:** `app/use_cases/user/create_user.py`

### Routes

```python
router = APIRouter(tags=["User - Profile"])

@router.get("/me", response_model=GetUserProfileResponse)
async def get_profile(token: AuthTokenDependency, db: DatabaseDependency):
    user = await get_user_profile(token["user_id"], db=db)
    return user
```

- Um arquivo por recurso ou grupo de use case relacionado
- Registrar em `routes/v1/{domain}/__init__.py`
- Tags: `"{Domain} - {Recurso}"` (ex.: `"Auth - Session"`, `"User - Profile"`)
- Rotas dinâmicas (`/{id}`) **depois** de rotas literais (`/images`)

**Referência:** `app/routes/v1/user/profile.py`, `app/routes/v1/auth/session.py`

### Models

| Base | Quando usar |
|------|-------------|
| `TimedBase` | Entidades com timestamps (ex.: `User`) |
| `AuditedBase` | Entidades com auditoria (ex.: `Role`) |
| `UUIDBase` | Só UUID PK |
| `Base` | PK customizada ou join tables |

**Referência:** `app/models/base.py`, `app/models/user.py`

### Erros

- Domínio na route: `raise HTTPException(status_code=..., detail="...")`
- Validação: automática via handler global
- Integridade DB: handler de `IntegrityError`
- Tokens: códigos `"token.expired"`, `"token.invalid"`
- Falhas suaves (token inválido): `JSONResponse` 400 + `MessageResponse`

**Referência:** `app/core/errors/handlers.py`

### Serviços

Use `app/services/` para integrações externas (email, armazenamento de arquivos, monitoramento). Use `app/core/` para infraestrutura interna (hash, cache, JWT).

**Regra:** comece com implementação local em `repository.py`. Quando a integração real existir (ex.: S3), adicione `aws/` e escolha via settings na factory.

#### Estrutura de pasta

```
app/services/{nome}/
├── entities.py      # (opcional) TypedDict
├── protocol.py      # (opcional) Protocol do repository
├── repository.py    # Implementação local concreta
├── service.py       # Classe adapter
├── __init__.py      # Factory get_{nome}_service() com @lru_cache
└── aws/             # (quando necessário)
    ├── repository.py
    └── client.py
```

**Referência canônica (local + S3):** `app/services/file_management/`

#### Responsabilidades

| Arquivo | Responsabilidade |
|---------|------------------|
| `entities.py` | Tipagem (`TypedDict`) — payloads, resultados |
| `repository.py` | I/O com o provedor (disco, SMTP, S3…) |
| `service.py` | API pública — validações, orquestração |
| `__init__.py` | Monta repositório + serviço; expõe factory |

#### Integração

1. **Settings** — config em `app/settings.py`
2. **DI** — `{Nome}Dependency` em `app/dependencies.py`
3. **Routes** — injetar via DI
4. **Use cases** — serviço como parâmetro explícito (sem `Depends()`)
5. **Erros** — serviço levanta `ValueError` em português; route converte em `HTTPException`

**Referência canônica:** `app/services/file_management/`

**Referências legadas:** `app/services/email/`, `app/services/monitor/`

### Ao adicionar código novo

1. Encontre o domínio mais parecido (`auth/`, `user/`).
2. Copie a estrutura (route → use case → schema → model).
3. Siga as convenções do domínio — não misture estilos.
4. Prefira `db.execute(select(...))` em código novo.

## Fluxo para nova feature

1. **Model** em `app/models/` — escolher base (`UUIDBase`, `TimedBase`, `AuditedBase`).
2. **Migration** — `make create-migrations`; revisar arquivo em `app/migrations/versions/`.
3. **Schemas** — `{Action}Request` e `{Entity}Response` em `app/schemas/v1/`.
4. **Use case** — função em `app/use_cases/{domain}/` com toda a lógica.
5. **Route** — endpoint fino em `app/routes/v1/{domain}/`.
6. **Registrar** — incluir router no `__init__.py` do domínio e em `app/main.py` se necessário.

## Convenções de nomenclatura

| Elemento | Padrão | Exemplo |
|----------|--------|---------|
| Arquivos | `snake_case` | `create_user.py` |
| Models | `PascalCase` singular | `User`, `UserNotification` |
| Tabelas | lowercase singular | `"user"`, `"session"` |
| Use cases | `verb_noun` (ação real) | `create_user`, `get_user_profile` |
| Request schemas | `{Action}Request` | `SignInRequest` |
| Response schemas | `{Entity}Response` | `GetUserProfileResponse` |
| DI | `{Name}Dependency` | `AuthTokenDependency` |
| Tags OpenAPI | `"{Domain} - {Recurso}"` | `"Auth - Session"` |
| API paths | `/v1/{domain}/snake_case` | `/v1/auth/sign_in` |

## Auth

- **Access token:** JWT via `AuthTokenDependency` → retorna `{ user_id, role }`.
- **Refresh token:** endpoint `/v1/auth/refresh`, validado contra tabela `session`.
- Endpoints protegidos devem usar `AuthTokenDependency`.
- Sign-in real: `/v1/auth/sign_in` (não confundir com `tokenUrl` legado em `core/token/`).

## Validação e erros

- Requests: Pydantic em `app/schemas/v1/`; requests podem usar `RequestBaseModel` (camelCase).
- Responses: `ResponseBaseModel` — saída em **camelCase**.
- Erros de domínio: `HTTPException(status_code=..., detail="...")`.
- Validação/integridade: handlers globais em `app/core/errors/handlers.py`.
- Códigos de token padronizados: `"token.expired"`, `"token.invalid"`.

## Mensagens para o usuário

Mensagens de erro expostas na UI devem ser **claras e em português** — evitar jargão técnico nas respostas que o cliente exibirá diretamente.

## Cache

- Leituras caras: `@cached_database_resource` em use cases.
- Invalidar cache em escritas quando aplicável.
- Redis quando `use_redis=true`; senão repositório em memória.

## Dependências (DI)

Definidas em `app/dependencies.py`:

`DatabaseDependency`, `HasherDependency`, `TokenServiceDependency`, `AuthTokenDependency`, `RefreshTokenDependency`, `EmailDependency`, `FileManagementDependency`, `CacheDependency`, `SettingsDependency`

## Comandos locais

```bash
make db        # Postgres + Redis
make migrate   # alembic upgrade head
make dev       # uvicorn com reload
```

## Checklist de entrega

- [ ] Rotas organizadas por recurso (sem módulos genéricos tipo `lookups`)?
- [ ] Uploads no recurso associado; `/v1/files` só para download?
- [ ] Use cases nomeados como ações reais (`list_`, `get_`, `create_`)?
- [ ] Segue estrutura routes → use_cases → models do domínio?
- [ ] Lógica está no use case, não na route?
- [ ] Schemas separados para request e response?
- [ ] Request usa `RequestBaseModel`; response usa `ResponseBaseModel`?
- [ ] Endpoint protegido usa `AuthTokenDependency`?
- [ ] DI via aliases de `dependencies.py`?
- [ ] Migration revisada manualmente?
- [ ] Mensagens de erro compreensíveis para o usuário final?
- [ ] Integração externa usa serviço em `app/services/`, não lógica na route?
- [ ] Estruturas leves usam `TypedDict` (sem `dataclass`)?

## Arquivos-chave

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/main.py` | Entrada FastAPI, registro de routers |
| `app/settings.py` | Configuração via env |
| `app/dependencies.py` | Injeção de dependências |
| `app/core/database.py` | Sessão SQLAlchemy |
| `app/core/token/__init__.py` | JWT |
| `app/core/errors/handlers.py` | Handlers globais de erro |
| `app/schemas/v1/base.py` | Bases de schema |
| `app/routes/v1/auth/` | Rotas de autenticação |
| `app/routes/v1/user/` | Rotas de usuário / perfil |
| `app/routes/v1/files/` | Download genérico de arquivos |
| `app/use_cases/user/` | Lógica de usuário |
| `app/services/file_management/` | Referência para novos serviços |
| `app/services/email/` | Serviço de e-mail |
| `Makefile` | Comandos de desenvolvimento |

## Particularidades

- DB é **síncrono** apesar de handlers `async def`.
- Emails via `EmailService` + `BackgroundTasks`.
- Feature flags em settings: `require_email_confirmation`, `require_two_factor`, `use_redis`, `use_sentry`.
