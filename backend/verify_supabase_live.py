import asyncio
from app.db.session import engine
from sqlalchemy import text

async def test_supabase():
    async with engine.connect() as conn:
        res = await conn.execute(text('SELECT current_database(), current_user, version()'))
        db, user, ver = res.fetchone()
        print('=== BACKEND TO SUPABASE POSTGRESQL ===')
        print(f'Connected Database: {db}')
        print(f'Database User: {user}')
        print(f'PostgreSQL Engine Version: {ver[:65]}...')
        
        tables = ['users', 'tickets', 'ticket_activities', 'ticket_comments', 'escalations', 'notifications']
        print('\n=== TABLE ACCESS CHECK ===')
        for t in tables:
            cnt = (await conn.execute(text(f'SELECT count(*) FROM {t}'))).scalar()
            print(f'  Table \"{t}\": OK (Rows: {cnt})')

asyncio.run(test_supabase())
