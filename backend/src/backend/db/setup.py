import psycopg2
from psycopg2 import OperationalError
import os
from ..core.logger import logger

def create_db_connection():
    """Creates a connection to the PostgreSQL database."""
    try:
        connection = psycopg2.connect(
            host="dolphinscheduler-postgresql",
            user="root",
            password="root",
            dbname="dolphinscheduler",
            port=5432,
            client_encoding='utf8'
        )
        return connection
    except OperationalError as e:
        logger.error(f"Error while connecting to PostgreSQL: {e}")
        return None

def init_db():
    """Initializes the database table."""
    connection = create_db_connection()
    if connection is None:
        logger.error("Failed to connect to the database. Aborting table initialization.")
        return

    try:
        cursor = connection.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                uuid VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            )
        """)
        connection.commit()
        logger.info("Workflow table initialized successfully.")
    except Exception as e:
        logger.error(f"Error during table initialization: {e}")
    finally:
        if connection:
            connection.close()
