"""PostgreSQL persistence for crawled jobs."""

from __future__ import annotations

import logging
import os

from .models import Job

log = logging.getLogger("crawler")

DB_CONFIG = {
    "host": os.environ.get("DATABASE_HOST", "localhost"),
    "port": int(os.environ.get("DATABASE_PORT", "5432")),
    "user": os.environ.get("DATABASE_USER", "admin"),
    "password": os.environ.get("DATABASE_PASSWORD", "admin123"),
    "dbname": os.environ.get("DATABASE_NAME", "crawl_job"),
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    source          TEXT        NOT NULL,
    source_job_id   TEXT        NOT NULL,
    title           TEXT        NOT NULL,
    company         TEXT,
    url             TEXT        NOT NULL,
    location        TEXT,
    salary_min      BIGINT,
    salary_max      BIGINT,
    salary_currency TEXT,
    salary_text     TEXT,
    job_type        TEXT,
    level           TEXT,
    experience      TEXT,
    posted_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    skills          TEXT[]      DEFAULT '{}',
    logo            TEXT,
    first_seen_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (source, source_job_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs (title);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs (location);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs (posted_at DESC);
"""

_conn = None


def _get_conn():
    global _conn
    if _conn is None or _conn.closed:
        import psycopg2

        _conn = psycopg2.connect(**DB_CONFIG, connect_timeout=5)
    return _conn


def init_db() -> None:
    try:
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute(_SCHEMA)
        conn.commit()
        log.info("DB initialized (%s/%s)", DB_CONFIG["host"], DB_CONFIG["dbname"])
    except Exception as e:  # noqa: BLE001
        log.warning("DB init failed (persistence disabled): %s", e)


def persist_jobs(jobs: list[Job]) -> int:
    """Insert/update jobs (upsert by (source, source_job_id)). Returns count saved."""
    if not jobs:
        return 0
    try:
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO jobs (
                    source, source_job_id, title, company, url, location,
                    salary_min, salary_max, salary_currency, salary_text, job_type,
                    level, experience, posted_at, expires_at,
                    skills, logo
                ) VALUES (
                    %(source)s, %(source_job_id)s, %(title)s, %(company)s, %(url)s, %(location)s,
                    %(salary_min)s, %(salary_max)s, %(salary_currency)s, %(salary_text)s, %(job_type)s,
                    %(level)s, %(experience)s, %(posted_at)s, %(expires_at)s,
                    %(skills)s, %(logo)s
                )
                ON CONFLICT (source, source_job_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    company = COALESCE(EXCLUDED.company, jobs.company),
                    url = EXCLUDED.url,
                    location = COALESCE(EXCLUDED.location, jobs.location),
                    salary_min = COALESCE(EXCLUDED.salary_min, jobs.salary_min),
                    salary_max = COALESCE(EXCLUDED.salary_max, jobs.salary_max),
                    salary_currency = COALESCE(EXCLUDED.salary_currency, jobs.salary_currency),
                    salary_text = COALESCE(EXCLUDED.salary_text, jobs.salary_text),
                    job_type = COALESCE(EXCLUDED.job_type, jobs.job_type),
                    level = COALESCE(EXCLUDED.level, jobs.level),
                    experience = COALESCE(EXCLUDED.experience, jobs.experience),
                    posted_at = COALESCE(EXCLUDED.posted_at, jobs.posted_at),
                    expires_at = COALESCE(EXCLUDED.expires_at, jobs.expires_at),
                    skills = COALESCE(EXCLUDED.skills, jobs.skills),
                    logo = COALESCE(EXCLUDED.logo, jobs.logo),
                    updated_at = now()
                """,
                [
                    {
                        **j.model_dump(),
                        "skills": j.skills or [],
                    }
                    for j in jobs
                ],
            )
        conn.commit()
        return len(jobs)
    except Exception as e:  # noqa: BLE001
        log.warning("persist_jobs failed: %s", e)
        return 0


def close_db() -> None:
    global _conn
    if _conn is not None:
        try:
            _conn.close()
        except Exception:  # noqa: BLE001
            pass
        _conn = None
