import psycopg2
from psycopg2 import OperationalError

def check_db_connection():
    """Checks the connection to the PostgreSQL database."""
    print("Attempting to connect to the database...")
    try:
        connection = psycopg2.connect(
            host="dolphinscheduler-postgresql",
            user="root",
            password="root",
            dbname="dolphinscheduler",
            port=5432
        )
        print("Database connection successful.")
        connection.close()
    except OperationalError as e:
        print(f"Error while connecting to PostgreSQL: {e}")

if __name__ == "__main__":
    check_db_connection()
