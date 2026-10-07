#!/usr/bin/env python3
"""
Comprehensive Database Connectivity Test Script
Tests PostgreSQL / Supabase connection, read, write, latency, and diagnostics.
"""

import os
import sys
import time
import uuid
import re
from pathlib import Path
from datetime import datetime

# Enable ANSI colors in Windows terminal
if sys.platform == "win32":
    os.system("")

# ANSI Color formatting
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    BG_GREEN = "\033[42m\033[30m"
    BG_RED = "\033[41m\033[97m"

def log_success(msg: str):
    print(f"{Colors.GREEN}{Colors.BOLD}[SUCCESS]{Colors.RESET} {msg}")

def log_error(msg: str):
    print(f"{Colors.RED}{Colors.BOLD}[ERROR]{Colors.RESET} {msg}")

def log_info(msg: str):
    print(f"{Colors.CYAN}{Colors.BOLD}[INFO]{Colors.RESET} {msg}")

def log_warn(msg: str):
    print(f"{Colors.YELLOW}{Colors.BOLD}[WARNING]{Colors.RESET} {msg}")

def log_section(title: str):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}")
    print(f" {title}")
    print(f"{'='*60}{Colors.RESET}")


def load_env_variables() -> dict[str, str]:
    """Load environment variables from .env files if not already set in os.environ."""
    search_paths = [
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
        Path(__file__).resolve().parent / "backend" / ".env",
        Path(__file__).resolve().parent / ".env",
    ]
    loaded_from = None
    for p in search_paths:
        if p.is_file():
            loaded_from = p
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'").strip('"')
                        if k and k not in os.environ:
                            os.environ[k] = v
            break

    if loaded_from:
        log_info(f"Loaded environment variables from: {loaded_from}")
    return dict(os.environ)


def parse_db_config():
    """Extract and normalize database connection parameters."""
    env = load_env_variables()

    db_url = env.get("DATABASE_URL", "").strip()
    host = env.get("POSTGRES_HOST", "").strip()
    port = env.get("POSTGRES_PORT", "5432").strip()
    user = env.get("POSTGRES_USER", "").strip()
    password = env.get("POSTGRES_PASSWORD", "").strip()
    dbname = env.get("POSTGRES_DB", "postgres").strip()

    # If DATABASE_URL is provided, normalize it and extract parameters for diagnostics
    if db_url:
        import urllib.parse
        try:
            clean_url = re.sub(r'^[a-zA-Z0-9_+]+://', 'http://', db_url)
            parsed = urllib.parse.urlparse(clean_url)
            if not host and parsed.hostname:
                host = parsed.hostname
            if parsed.port:
                port = str(parsed.port)
            if not user and parsed.username:
                user = parsed.username
            if not dbname and parsed.path.lstrip("/"):
                dbname = parsed.path.lstrip("/").split("?")[0]
        except Exception:
            pass
        return {
            "url": db_url,
            "host": host or "cloud-postgres",
            "port": port or "5432",
            "user": user or "postgres",
            "dbname": dbname or "postgres",
        }

    if not host or not user or not password:
        log_error("Missing database connection parameters.")
        print(f"{Colors.YELLOW}Troubleshooting:{Colors.RESET}")
        print("Please set DATABASE_URL or POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD in your .env file.")
        sys.exit(1)

    import urllib.parse
    encoded_pw = urllib.parse.quote_plus(password)
    constructed_url = f"postgresql+asyncpg://{user}:{encoded_pw}@{host}:{port}/{dbname}?ssl=require"
    return {
        "url": constructed_url,
        "host": host,
        "port": port,
        "user": user,
        "dbname": dbname,
    }


def diagnose_failure(error_msg: str, host: str, port: str):
    """Provide actionable troubleshooting tips based on known error patterns."""
    err_lower = error_msg.lower()

    print(f"\n{Colors.YELLOW}{Colors.BOLD}Diagnostic Troubleshooting Guide:{Colors.RESET}")

    if "password authentication failed" in err_lower or "28p01" in err_lower or "invalid password" in err_lower:
        print(f" {Colors.RED}* Authentication Failure detected:{Colors.RESET}")
        print("   1. Verify your database password in .env (POSTGRES_PASSWORD or DATABASE_URL).")
        print("   2. If your password contains special characters like '@', '#', or ':', make sure they are URL-encoded in DATABASE_URL (e.g., '@' -> '%40').")
        print("   3. On Supabase, ensure the user name includes your project reference if using pooler (e.g., postgres.project_ref).")

    elif "ssl" in err_lower or "certificate" in err_lower or "tlsv" in err_lower:
        print(f" {Colors.RED}* SSL / TLS Error detected:{Colors.RESET}")
        print("   1. Supabase strictly requires SSL connections.")
        print("   2. Ensure '?ssl=require' or '?sslmode=require' is appended to your connection string.")
        print("   3. In asyncpg / SQLAlchemy, set connect_args={'ssl': 'require'}.")

    elif "connection refused" in err_lower or "timeout" in err_lower or "timed out" in err_lower or "could not connect to server" in err_lower:
        print(f" {Colors.RED}* Connection Timeout / Refused detected:{Colors.RESET}")
        print(f"   1. Current target: host '{host}' on port '{port}'.")
        print("   2. Port 5432 vs 6543 on Supabase:")
        print("      - Port 6543: Supabase Transaction Mode Pooler (PgBouncer) - recommended for serverless / pooled connections.")
        print("      - Port 5432: Session Mode Pooler or Direct Connection.")
        print("      - Try switching between port 5432 and 6543 in your .env.")
        print("   3. Check whether your IP is restricted or if the Supabase project is currently paused in the dashboard.")

    elif "no such host" in err_lower or "getaddrinfo" in err_lower or "name or service not known" in err_lower:
        print(f" {Colors.RED}* DNS / Host Resolution Failure:{Colors.RESET}")
        print(f"   1. Hostname '{host}' could not be resolved.")
        print("   2. Check your internet connection and verify that the hostname in your .env matches your Supabase database settings.")

    elif "permission denied" in err_lower or "42501" in err_lower or "must be owner" in err_lower:
        print(f" {Colors.RED}* Permission Denied (Insufficient Privileges):{Colors.RESET}")
        print("   1. The connected database user role does not have privileges to create tables or insert into schema 'public'.")
        print("   2. For Supabase, connect using the 'postgres' superuser or 'service_role' credentials for schema migration / write tests.")
        print("   3. Run: GRANT ALL ON SCHEMA public TO <your_user>;")

    else:
        print("   1. Check your database server logs and firewall rules.")
        print("   2. Ensure the database user has sufficient privileges to perform SELECT and table operations.")


async def run_async_test(db_config: dict):
    """Run connection, read, write, and latency tests using SQLAlchemy Async / asyncpg."""
    url = db_config["url"]

    # Normalize url for asyncpg if it has postgresql://
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Ensure ssl parameter
    connect_args = {}
    if "ssl=" in url or "sslmode=" in url or "supabase" in url:
        connect_args["ssl"] = "require"

    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(
        url,
        echo=False,
        connect_args=connect_args,
        pool_pre_ping=True,
    )

    log_section("1. Testing Direct Connection & Latency (SELECT NOW())")
    t_start = time.perf_counter()
    try:
        async with engine.connect() as conn:
            t0 = time.perf_counter()
            res = await conn.execute(text("SELECT NOW(), current_database(), current_user, version()"))
            row = res.fetchone()
            latency_ms = (time.perf_counter() - t0) * 1000

            server_time = row[0]
            current_db = row[1]
            current_user = row[2]
            version_str = row[3].split("\n")[0]

            log_success(f"Successfully connected to PostgreSQL! Server time: {server_time}")
            print(f"   - Database      : {Colors.BOLD}{current_db}{Colors.RESET}")
            print(f"   - Connected User: {Colors.BOLD}{current_user}{Colors.RESET}")
            print(f"   - Roundtrip Ping: {Colors.CYAN}{latency_ms:.2f} ms{Colors.RESET}")
            print(f"   - Engine Version: {version_str[:60]}...")
    except Exception as e:
        log_error(f"Connection failed: {str(e)}")
        diagnose_failure(str(e), db_config["host"], db_config["port"])
        await engine.dispose()
        sys.exit(1)

    log_section("2. Testing Table Metadata & Read Permissions")
    try:
        async with engine.connect() as conn:
            res = await conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 10")
            )
            tables = [r[0] for r in res.fetchall()]
            log_success(f"Found {len(tables)} tables in 'public' schema: {', '.join(tables) if tables else 'None'}")
    except Exception as e:
        log_warn(f"Could not read information_schema: {e}")

    log_section("3. Testing Write & Read Operations (Dummy Insert & Verification)")
    test_probe_id = str(uuid.uuid4())[:8]
    test_payload = f"health_probe_{test_probe_id}"
    inserted_id = None

    try:
        async with engine.begin() as conn:
            # 1. Create temporary/test table if not exists
            await conn.execute(
                text("""
                    CREATE TABLE IF NOT EXISTS _db_health_check_test (
                        id SERIAL PRIMARY KEY,
                        probe_token VARCHAR(64) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
            )

            # 2. Insert test probe
            t_write_start = time.perf_counter()
            insert_res = await conn.execute(
                text("INSERT INTO _db_health_check_test (probe_token) VALUES (:token) RETURNING id, probe_token, created_at"),
                {"token": test_payload}
            )
            inserted_row = insert_res.fetchone()
            write_latency_ms = (time.perf_counter() - t_write_start) * 1000

            inserted_id = inserted_row[0]
            log_success(f"Write operation passed: Record inserted [ID: {inserted_id}, Token: {inserted_row[1]}] (latency: {write_latency_ms:.2f} ms)")

            # 3. Read back test probe
            t_read_start = time.perf_counter()
            read_res = await conn.execute(
                text("SELECT id, probe_token, created_at FROM _db_health_check_test WHERE id = :id"),
                {"id": inserted_id}
            )
            fetched_row = read_res.fetchone()
            read_latency_ms = (time.perf_counter() - t_read_start) * 1000

            if fetched_row and fetched_row[1] == test_payload:
                log_success(f"Read operation passed: Integrity verified [Matched token '{fetched_row[1]}'] (latency: {read_latency_ms:.2f} ms)")
            else:
                log_error("Read verification failed: Token mismatch or row missing.")

            # 4. Clean up test record
            await conn.execute(
                text("DELETE FROM _db_health_check_test WHERE id = :id"),
                {"id": inserted_id}
            )
            log_success(f"Cleanup passed: Test probe ID {inserted_id} deleted successfully.")

    except Exception as e:
        log_error(f"Write/Read verification failed: {str(e)}")
        diagnose_failure(str(e), db_config["host"], db_config["port"])
        await engine.dispose()
        sys.exit(1)

    await engine.dispose()

    log_section("Summary & Health Status")
    total_time = (time.perf_counter() - t_start) * 1000
    print(f" {Colors.BG_GREEN} ALL DATABASE CHECKS PASSED {Colors.RESET}")
    print(f" Total test execution time: {Colors.BOLD}{total_time:.2f} ms{Colors.RESET}")
    print(f" Status: PostgreSQL / Supabase is {Colors.GREEN}{Colors.BOLD}ACTIVE, HEALTHY, & ACCEPTING READ/WRITE OPERATIONS{Colors.RESET}.\n")


def main():
    import asyncio
    print(f"{Colors.CYAN}{Colors.BOLD}============================================================")
    print(" PostgreSQL / Supabase Connectivity & Permissions Tester")
    print(f" Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"============================================================{Colors.RESET}")

    cfg = parse_db_config()
    target_host = cfg.get("host") or "from URL"
    target_port = cfg.get("port") or "5432"
    log_info(f"Target Host: {Colors.BOLD}{target_host}:{target_port}{Colors.RESET}")

    asyncio.run(run_async_test(cfg))


if __name__ == "__main__":
    main()
