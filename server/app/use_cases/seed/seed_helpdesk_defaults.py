import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.roles import ROLE_ADMIN, ROLE_AGENT, ROLE_CUSTOMER
from app.core.ticket_constants import (
    KNOWLEDGE_BASE_CATEGORY_DEVELOPER_GUIDE_SLUG,
    KNOWLEDGE_BASE_CATEGORY_USER_GUIDE_SLUG,
    KNOWLEDGE_BASE_JAM_GUIDE_SLUG,
    KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG,
    KNOWLEDGE_BASE_STATUS_PUBLISHED,
    KNOWLEDGE_BASE_VISIBILITY_PUBLIC,
    KNOWLEDGE_BASE_VISIBILITY_STAFF,
)
from app.models.knowledge_base.article import KnowledgeBaseArticle
from app.models.ticket.ticket_priority import TicketPriority
from app.models.user.role import Role
from app.models.user.user import User
from app.services.text_processor import get_text_processor_service
from app.use_cases.instance.manage_instance import get_or_create_instance_settings
from app.use_cases.knowledge_base.extract_article_keywords import extract_article_keywords
from app.use_cases.knowledge_base.sanitize_article_html import plain_text_to_html, sanitize_article_html
from app.use_cases.sla.manage_sla import (
    create_default_sla,
)


PRIORITY_SEEDS = (
    ("low", "Baixa", 10, 480, 2880),
    ("medium", "Média", 20, 240, 1440),
    ("high", "Alta", 30, 120, 480),
    ("urgent", "Urgente", 40, 60, 240),
)

PRIORITY_GUIDE_BODY = """Como escolher a prioridade do chamado

Use a prioridade para indicar o impacto do problema no negócio. Isso ajuda o atendimento a organizar a fila e cumprir os prazos de SLA.

Baixa
• Dúvidas gerais, solicitações sem urgência ou melhorias.
• O trabalho continua normalmente.

Média
• Problema que atrapalha, mas existe uma alternativa temporária.
• Prioridade padrão na maioria dos casos.

Alta
• Funcionalidade importante indisponível ou impacto relevante em várias pessoas.
• Não há workaround simples.

Urgente
• Sistema parado, falha crítica de pagamento/segurança ou impacto amplo imediato.
• Use somente quando realmente for emergência.

Dica: descreva o impacto no texto do chamado (quantas pessoas afetadas, se há perda financeira, se há alternativa). Isso confirma se a prioridade escolhida faz sentido.
"""

JAM_GUIDE_BODY = """Como gravar bugs com o Jam

O Jam é uma ferramenta para gravar a tela (ou tirar um print) enquanto reproduz o problema. Além do vídeo, ele captura logs do navegador, requisições de rede e informações do dispositivo — o que ajuda o time a entender e corrigir o bug mais rápido.

Downloads

Extensão para Chrome, Edge, Arc, Brave ou Opera:
https://chromewebstore.google.com/detail/jam/iohjgamcilhbgmhbnllfolmkmmekfmci

App para iPhone/iPad:
https://apps.apple.com/app/jam-fix-bugs-faster/id6469037234

Site oficial:
https://jam.dev/

Como instalar (navegador)

1. Abra o link da extensão no Chrome Web Store.
2. Clique em “Usar no Chrome” (ou equivalente no seu navegador Chromium).
3. Fixe o ícone do Jam na barra de ferramentas para ter acesso rápido.

Como gravar um bug

1. Abra a página em que o problema acontece.
2. Clique no ícone do Jam na barra do navegador.
3. Escolha o tipo de captura:
   • Screenshot — foto da tela com contexto técnico.
   • Screen recording — grave o passo a passo do problema.
   • Instant Replay — recupera até os últimos 2 minutos de atividade (útil se o bug já aconteceu).
4. Se quiser, adicione uma descrição curta do que esperava vs. o que ocorreu.
5. Crie o Jam. O link é copiado automaticamente.

Como usar no chamado

Cole o link do Jam na descrição (ou em uma mensagem) do chamado. Assim o atendimento consegue ver exatamente o que aconteceu, sem precisar pedir novas gravações.

Dica: quanto mais claro for o passo a passo na gravação, mais rápido o time consegue reproduzir e resolver.
"""

COMMERCIAL_TREE = (
    (
        "comercial",
        "Comercial",
        0,
        "<p>Documentação do time comercial: fluxos, aquisição e finalização de vendas.</p>",
        (
            (
                "fluxo-de-vendas",
                "Fluxo de vendas",
                0,
                "<p>Visão geral do fluxo comercial, da prospecção ao fechamento.</p>",
                (
                    (
                        "aquisicao-de-clientes",
                        "Aquisição de clientes",
                        0,
                        "<p>Boas práticas para prospectar e qualificar novos clientes.</p>",
                        (),
                    ),
                    (
                        "finalizacao-de-vendas",
                        "Finalização de vendas",
                        1,
                        "<p>Passos para fechar negócios e registrar a venda.</p>",
                        (
                            (
                                "finalizacao-artigo-1",
                                "Artigo 1",
                                0,
                                "<p>Checklist de documentação antes de enviar a proposta.</p>",
                                (),
                            ),
                            (
                                "finalizacao-artigo-2",
                                "Artigo 2",
                                1,
                                "<p>Como negociar condições comerciais com o cliente.</p>",
                                (),
                            ),
                            (
                                "finalizacao-artigo-3",
                                "Artigo 3",
                                2,
                                "<p>Registro do fechamento e handoff para o time de sucesso.</p>",
                                (),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    ),
)


def _seed_article_node(
    *,
    db: Session,
    root_id,
    author_id,
    text_processor,
    parent_id,
    slug: str,
    title: str,
    sort_order: int,
    body: str,
    children: tuple,
) -> None:
    existing = db.execute(
        select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.slug == slug)
    ).scalars().first()
    if existing:
        article_id = existing.id
        if existing.root_id != root_id:
            existing.root_id = root_id
            db.add(existing)
    else:
        clean_body = sanitize_article_html(body)
        article = KnowledgeBaseArticle(
            id=uuid4(),
            parent_id=parent_id,
            root_id=root_id,
            title=title,
            slug=slug,
            body=clean_body,
            keywords=extract_article_keywords(title, clean_body, text_processor),
            status=KNOWLEDGE_BASE_STATUS_PUBLISHED,
            author_id=author_id,
            sort_order=sort_order,
            published_at=datetime.datetime.utcnow(),
        )
        db.add(article)
        db.flush()
        article_id = article.id

    for child in children:
        child_slug, child_title, child_sort, child_body, grandchildren = child
        _seed_article_node(
            db=db,
            root_id=root_id,
            author_id=author_id,
            text_processor=text_processor,
            parent_id=article_id,
            slug=child_slug,
            title=child_title,
            sort_order=child_sort,
            body=child_body,
            children=grandchildren,
        )


def _get_or_create_root_page(
    db: Session,
    *,
    slug: str,
    name: str,
    visibility: str = KNOWLEDGE_BASE_VISIBILITY_PUBLIC,
    sort_order: int = 0,
    author_id,
) -> KnowledgeBaseArticle:
    page = db.execute(
        select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.slug == slug)
    ).scalars().first()
    if page:
        if page.parent_id is not None:
            page.parent_id = None
        if not page.visibility:
            page.visibility = visibility
        if page.title != name:
            page.title = name
        if page.root_id != page.id:
            page.root_id = page.id
        db.add(page)
        return page

    page = KnowledgeBaseArticle(
        id=uuid4(),
        parent_id=None,
        title=name,
        slug=slug,
        body="<p></p>",
        keywords=[],
        status=KNOWLEDGE_BASE_STATUS_PUBLISHED,
        author_id=author_id,
        sort_order=sort_order,
        visibility=visibility,
        published_at=datetime.datetime.utcnow(),
    )
    db.add(page)
    db.flush()
    page.root_id = page.id
    db.add(page)
    db.flush()
    return page


def seed_helpdesk_defaults(db: Session) -> None:
    for role_name in (ROLE_CUSTOMER, ROLE_AGENT, ROLE_ADMIN):
        existing = db.execute(select(Role).where(Role.name == role_name)).scalars().first()
        if not existing:
            db.add(Role(id=uuid4(), name=role_name))

    for code, label, sort_order, _, _ in PRIORITY_SEEDS:
        priority = db.execute(select(TicketPriority).where(TicketPriority.code == code)).scalars().first()
        if not priority:
            priority = TicketPriority(id=uuid4(), code=code, label=label, sort_order=sort_order)
            db.add(priority)
            db.flush()

    get_or_create_instance_settings(db)
    create_default_sla(db, commit=False)

    author = db.execute(select(User).order_by(User.created_at.asc()).limit(1)).scalars().first()
    text_processor = get_text_processor_service()
    if not author:
        db.commit()
        return

    user_guide = _get_or_create_root_page(
        db,
        slug=KNOWLEDGE_BASE_CATEGORY_USER_GUIDE_SLUG,
        name="Guia do Usuário para o Hopdesk",
        visibility=KNOWLEDGE_BASE_VISIBILITY_PUBLIC,
        sort_order=0,
        author_id=author.id,
    )
    _get_or_create_root_page(
        db,
        slug=KNOWLEDGE_BASE_CATEGORY_DEVELOPER_GUIDE_SLUG,
        name="Guia do Desenvolvedor para o Hopdesk",
        visibility=KNOWLEDGE_BASE_VISIBILITY_STAFF,
        sort_order=1,
        author_id=author.id,
    )

    seeded_articles = (
        (
            KNOWLEDGE_BASE_PRIORITY_GUIDE_SLUG,
            "Como definir a prioridade do chamado",
            PRIORITY_GUIDE_BODY,
        ),
        (
            KNOWLEDGE_BASE_JAM_GUIDE_SLUG,
            "Como gravar bugs com o Jam",
            JAM_GUIDE_BODY,
        ),
    )
    for slug, title, body in seeded_articles:
        existing = db.execute(
            select(KnowledgeBaseArticle).where(KnowledgeBaseArticle.slug == slug)
        ).scalars().first()
        if existing:
            if existing.parent_id != user_guide.id:
                existing.parent_id = user_guide.id
                existing.root_id = user_guide.id
                if not existing.visibility:
                    existing.visibility = KNOWLEDGE_BASE_VISIBILITY_PUBLIC
                db.add(existing)
            if not existing.keywords:
                existing.keywords = extract_article_keywords(
                    existing.title,
                    existing.body,
                    text_processor,
                )
                db.add(existing)
            if existing.body and "<" not in existing.body:
                existing.body = sanitize_article_html(plain_text_to_html(existing.body))
                db.add(existing)
            continue
        clean_body = sanitize_article_html(plain_text_to_html(body.strip()))
        db.add(
            KnowledgeBaseArticle(
                id=uuid4(),
                parent_id=user_guide.id,
                root_id=user_guide.id,
                title=title,
                slug=slug,
                body=clean_body,
                keywords=extract_article_keywords(title, clean_body, text_processor),
                status=KNOWLEDGE_BASE_STATUS_PUBLISHED,
                author_id=author.id,
                published_at=datetime.datetime.utcnow(),
                sort_order=0,
            )
        )

    for slug, title, sort_order, body, children in COMMERCIAL_TREE:
        _seed_article_node(
            db=db,
            root_id=user_guide.id,
            author_id=author.id,
            text_processor=text_processor,
            parent_id=user_guide.id,
            slug=slug,
            title=title,
            sort_order=sort_order,
            body=body,
            children=children,
        )

    for article in db.execute(select(KnowledgeBaseArticle)).scalars().all():
        if article.parent_id is None and article.root_id is None:
            article.root_id = article.id
            db.add(article)
        if article.keywords:
            continue
        article.keywords = extract_article_keywords(article.title, article.body, text_processor)
        db.add(article)

    db.commit()
