"""Supabase Python Client initialization."""

from functools import lru_cache
from supabase import Client, create_client
from app.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    """Return a cached singleton Supabase Client using the active API key."""
    key = settings.supabase_anon_key or settings.supabase_publishable_key
    return create_client(settings.supabase_url, key)


@lru_cache
def get_supabase_anon_client() -> Client:
    """Return a cached singleton Supabase Client."""
    key = settings.supabase_publishable_key or settings.supabase_anon_key
    return create_client(settings.supabase_url, key)
