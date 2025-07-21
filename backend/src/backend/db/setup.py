import mysql.connector
from mysql.connector import Error
import os
from ..core.logger import logger

def create_db_connection():
    """Creates a connection to the MySQL database."""
    try:
        connection = mysql.connector.connect(
            host="localhost",
            user="testuser",
            password="testpass",
            database="testdb"
        )
        if connection.is_connected():
            return connection
    except Error as e:
        logger.error(f"Error while connecting to MySQL: {e}")
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
        logger.info("Workflow table initialized successfully.")
    except Error as e:
        logger.error(f"Error during table initialization: {e}")
    finally:
        if connection.is_connected():
            connection.close()
