"""Create admin user in Supabase"""
import bcrypt
import uuid
from datetime import datetime

email = "contact@illinoisestatelaw.com"
password = "IEL2024!"
name = "Illinois Estate Law Admin"

password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
user_id = str(uuid.uuid4())

print(f"User ID: {user_id}")
print(f"Email: {email}")
print(f"Password Hash: {password_hash}")
print(f"Name: {name}")
print(f"Is Admin: true")
