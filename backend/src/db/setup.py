from sqlalchemy import create_engine, Column, String, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv
from core.logger import logger

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Workflow(Base):
    __tablename__ = "workflows"
    uuid = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)

def create_db_connection():
    """Creates a new database session."""
    return SessionLocal()

def init_db():
    """Initializes the database table."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Workflow table initialized successfully.")
    except Exception as e:
        logger.error(f"Error during table initialization: {e}")
