"""
Database Engine, Session Management and Dependency
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)

Base = declarative_base()


def get_db():
    """FastAPI database session dependency"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables and perform lightweight schema migrations"""
    import backend.app.models  # Ensure all models are registered
    from sqlalchemy import text, inspect

    Base.metadata.create_all(bind=engine)

    # Lightweight auto-migration for SQLite to add missing columns to existing DB files
    if settings.DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                inspector = inspect(engine)
                if "search_profiles" in inspector.get_table_names():
                    existing_cols = {col["name"] for col in inspector.get_columns("search_profiles")}
                    if "email_digest_enabled" not in existing_cols:
                        conn.execute(text("ALTER TABLE search_profiles ADD COLUMN email_digest_enabled BOOLEAN DEFAULT 1"))
                    if "notification_email" not in existing_cols:
                        conn.execute(text("ALTER TABLE search_profiles ADD COLUMN notification_email VARCHAR(255)"))
                    if "target_ats_companies" not in existing_cols:
                        conn.execute(text("ALTER TABLE search_profiles ADD COLUMN target_ats_companies JSON DEFAULT '[]'"))
                    conn.commit()
        except Exception as e:
            import logging
            logging.getLogger("database").warning(f"Auto-migration check note: {e}")
