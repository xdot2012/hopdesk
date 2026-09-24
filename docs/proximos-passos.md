# Próximos passos — HopDesk

## Release v1 — fechada

Instância única do helpdesk. Escopo da primeira release está completo.

| Área | Situação |
|------|----------|
| Chamados | Criação, listagem, detalhe, mensagens, anexos, eventos SSE; `sector_id` no chamado |
| Atribuição | Manual (`assign_me`, PATCH assignee / seletor de agente no detalhe) |
| Agentes | `User` com role `agent` ou `admin` |
| Setores | Globais (`Sector` / `UserSector`); gestores via `is_sector_manager`; DELETE de vínculo |
| SLA | Política única editável (metas + timezone); minutos úteis em horário fixo seg–sex 09:00–18:00 |
| Indicadores | Dashboard SLA com `?group=` + período/setor na URL; CSAT médio; export CSV |
| Histórico | Chamados finalizados com filtros + export CSV (até 5 000 linhas) |
| Base de conhecimento | Árvore de artigos, visibilidade `public` / `staff` |
| Papéis | `customer` (portal), `agent`, `admin` |
| Arquivos | Storage `local` ou `s3`; download autenticado + ACL via `GET /v1/files/{key}` |
| E-mail de chamado | Flags na instância (`notify_ticket_emails`) |
| Testes | pytest em `server/tests/`; vitest em `client/src/`; Playwright em `client/tests/e2e/` |

Preferir evoluir recursos existentes (`Ticket`, `User`, `Sector`, `Sla*`, `KnowledgeBaseArticle`) em vez de inventar arquitetura paralela.

---

## Depois da v1

Evoluções só sob demanda explícita de produto (novos fluxos, relatórios ou integrações).

---

## Notas

- SLA: política editável (metas por prioridade + timezone); calendário fixo em `app/core/default_business_calendar.py` (seg–sex 09:00–18:00).
- Documentação Bruno: ver `docs/bruno/README.md`.
- Testes backend: `cd server && make test`.
- Testes frontend: `cd client && npm test`; `npm run test:e2e:install` uma vez, depois `npm run test:e2e`.
