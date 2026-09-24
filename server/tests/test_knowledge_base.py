def test_create_and_delete_article(client, agent_headers):
    create = client.post(
        "/v1/knowledge_base/articles",
        headers=agent_headers,
        json={
            "title": "Como resetar senha",
            "slug": "como-resetar-senha",
            "body": "<p>Passo a passo para resetar a senha.</p>",
            "status": "draft",
            "visibility": "staff",
        },
    )
    assert create.status_code == 200, create.text
    article_id = create.json()["id"]

    delete = client.delete(
        f"/v1/knowledge_base/articles/{article_id}",
        headers=agent_headers,
    )
    assert delete.status_code == 204, delete.text

    missing = client.get(
        f"/v1/knowledge_base/articles/{article_id}",
        headers=agent_headers,
    )
    assert missing.status_code == 404
