# HopDesk API – Bruno Collection

Coleção [Bruno](https://www.usebruno.com/) da API HopDesk (`docs/bruno`).

## Importar

1. Instale o [Bruno](https://www.usebruno.com/downloads).
2. **Open Collection** → pasta `docs/bruno`.
3. Selecione o environment **Local** (`http://localhost:8000`) ou **Production**.

## Auth

1. Rode **Auth → Sign In** (salva `auth_token` e `refresh_token` no environment, no formato `Bearer <jwt>`).
2. Requests autenticados herdam o header `Authorization: {{auth_token}}` da collection.
3. **Auth → Refresh Token** usa `Authorization: {{refresh_token}}` e atualiza os tokens.

## Variáveis de environment

| Variável | Uso |
|----------|-----|
| `base_url` | URL da API |
| `auth_token` / `refresh_token` | Preenchidos pelo Sign In / Refresh |
| `code` | Código de reset/confirmação de e-mail |
| `ticket_id` | Preenchido por List/Create Ticket |
| `message_id` | ID da mensagem (Update/Delete Message) |
| `article_id` | Preenchido por Create Article |
| `file_key` | Path do arquivo (avatar, anexo, imagem KB) |
| `sector_id` / `user_sector_id` | Preenchidos por List/Create Sector e User Sector |

## Pastas

| Pasta | Endpoints |
|-------|-----------|
| **Auth** | Sign In/Up, Refresh, Sign Out, Two Factor, Password Recovery, Confirm Email |
| **User** | Get/Update Me, Upload Avatar, Update Password, Update Preferences, Mark Notifications Read, List Users, Update User Role |
| **Ticket** | List/Create/Get/Update, Assign Me, Messages (Add/Update/Delete), Mark Viewed, Cancel, Satisfaction, Attachments, Priorities, Stats, Events (SSE), Assignee/Requester/Mention Options |
| **Files** | Download File (`GET /v1/files/{file_key}`) — requer Bearer + ACL |
| **Sector** | List/Create/Update/Delete |
| **User Sector** | List/Add/Update/Delete |
| **Instance** | Get/Update (flags de e-mail de ticket; timezone legado na API) |
| **Knowledge Base** | List/Tree/Create/Get/Update/Delete, Reorder, Suggest, Upload Image |
| **SLA (Service Level Agreement)** | Get/Update Policy (metas + timezone) |
| **Health** | Healthcheck |

## Fluxos úteis

**Anexo de chamado + download**

1. Sign In → Upload Ticket Attachment (`file_key` salvo) → Create Ticket com a `key` no body → Download File com `{{file_key}}`.

**Atribuição manual**

1. Sign In (agente/admin) → List Tickets → Assign Me ou Update Ticket (`assigneeUserId`).

**Imagem na KB**

1. Create Article (`article_id`) → Upload Article Image → Download File com a `key` retornada.
