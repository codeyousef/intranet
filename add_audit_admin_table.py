import sqlite3
import os
from datetime import datetime

# Open the database
db_path = os.path.join(os.getcwd(), 'mazaya.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"Connected to database: {db_path}")

# Create audit_admin_users table
try:
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            created_at TEXT,
            updated_at TEXT
        )
    ''')
    print("audit_admin_users table created or already exists.")
    
    # Add the user as the first audit admin
    admin_email = 'yousef.baitalmal@flyadeal.com'
    now = datetime.now().isoformat()
    
    try:
        cursor.execute('''
            INSERT OR IGNORE INTO audit_admin_users (email, created_at, updated_at)
            VALUES (?, ?, ?)
        ''', (admin_email, now, now))
        
        if cursor.rowcount > 0:
            print(f"Added {admin_email} as audit admin.")
        else:
            print(f"{admin_email} is already an audit admin.")
            
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error adding initial audit admin: {e}")
        
except sqlite3.Error as e:
    print(f"Error creating audit_admin_users table: {e}")
finally:
    conn.close()
    print("Database connection closed.")