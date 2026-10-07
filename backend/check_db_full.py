import asyncio
from app.db.session import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        print("=== TICKETS TABLE COLUMNS ===")
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tickets' ORDER BY ordinal_position"))
        for row in res.fetchall():
            print(f"  {row[0]}: {row[1]}")
            
        print("\n=== USERS TABLE COLUMNS ===")
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"))
        for row in res.fetchall():
            print(f"  {row[0]}: {row[1]}")

        print("\n=== CURRENT TICKETS ===")
        res = await conn.execute(text("SELECT * FROM tickets"))
        for row in res.fetchall():
            print(dict(row._mapping))

        print("\n=== CURRENT USERS ===")
        res = await conn.execute(text("SELECT * FROM users"))
        for row in res.fetchall():
            print(dict(row._mapping))

asyncio.run(main())
