#!/usr/bin/env python3
"""
Seed script to create the initial admin user.

Usage:
    python3 seed_admin.py

This will create an admin user with the following credentials:
    Email: admin@illinoisestatelaw.com
    Password: AdminPass123!

You can also pass custom values:
    python3 seed_admin.py --email custom@email.com --password YourPassword123 --name "Admin Name"
"""

import os
import sys
import argparse
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from dotenv import load_dotenv
load_dotenv()

import bcrypt
from supabase import create_client

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_admin(email: str, password: str, name: str):
    supabase_url = os.environ.get('VITE_SUPABASE_URL')
    supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print("Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env")
        sys.exit(1)

    supabase = create_client(supabase_url, supabase_key)

    existing = supabase.table("users").select("id").eq("email", email.lower()).execute()
    if existing.data:
        print(f"Error: User with email '{email}' already exists")
        sys.exit(1)

    if len(password) < 8:
        print("Error: Password must be at least 8 characters")
        sys.exit(1)

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    user_data = {
        "id": user_id,
        "email": email.lower(),
        "password_hash": hash_password(password),
        "name": name,
        "role": "admin",
        "is_active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    result = supabase.table("users").insert(user_data).execute()

    if result.data:
        print("\n" + "="*50)
        print("Admin user created successfully!")
        print("="*50)
        print(f"\nEmail:    {email}")
        print(f"Password: {password}")
        print(f"Role:     admin")
        print(f"ID:       {user_id}")
        print("\nYou can now log in at /login")
        print("="*50 + "\n")
    else:
        print("Error: Failed to create admin user")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Create initial admin user')
    parser.add_argument('--email', default='admin@illinoisestatelaw.com', help='Admin email')
    parser.add_argument('--password', default='AdminPass123!', help='Admin password (min 8 chars)')
    parser.add_argument('--name', default='Administrator', help='Admin display name')

    args = parser.parse_args()

    print("\nCreating admin user...")
    create_admin(args.email, args.password, args.name)

if __name__ == "__main__":
    main()
