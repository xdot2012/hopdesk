from app.use_cases.notification.create_notification import create_notification


async def create_first_login_notifications(db, commit: bool=True):
    notifications = []
    notifications.append(await create_notification(
        "First Login.",
        "Welcome! It looks like this is your first time logging in. Please take a moment to explore the system and get familiar with its features.",
        None,
        db,
        commit=False
    ))

    if commit:
        db.add_all(notifications)
        db.commit()

    return notifications


