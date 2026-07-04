-- Postgres bootstrap — runs once on first container start (mounted into
-- /docker-entrypoint-initdb.d). Enables the extensions the schema relies on.
-- Mirrors docs/devops/docker.md §"infrastructure/postgres/init.sql".

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram search (ILIKE acceleration)
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search
