import sqlite3
import os

DATABASE = "data.db"


def check_and_fix_database():
    """Check database schema and fix any issues with the old favorite_topping column."""
    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    try:
        # Check if the old favorite_topping column exists
        cur.execute("PRAGMA table_info(pizza_attendees)")
        columns = cur.fetchall()
        column_names = [col[1] for col in columns]

        print("Current pizza_attendees table columns:", column_names)

        # If favorite_topping column exists, we need to recreate the table
        if "favorite_topping" in column_names:
            print("Found old schema with favorite_topping column. Recreating table...")

            # Drop the old table (this will also drop the foreign key constraints)
            cur.execute("DROP TABLE IF EXISTS pizza_preferences")
            cur.execute("DROP TABLE IF EXISTS pizza_attendees")

            # Recreate the tables with the new schema
            with open("create_database.sql", "r") as sql_file:
                sql_script = sql_file.read()
                cur.executescript(sql_script)

            print("Database schema updated successfully!")
        else:
            print("Database schema is already up to date.")

        conn.commit()

    except Exception as e:
        print(f"Error fixing database: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    check_and_fix_database()
