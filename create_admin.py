"""Script to create an admin user in the database"""

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import os

# Get MongoDB URL from environment or use default
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'illinois_estate_law')

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def create_admin_user(email: str, password: str, name: str = "Admin"):
    """Create an admin user in the database"""
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        # Check if user already exists
        existing = await db.users.find_one({"email": email.lower()})

        if existing:
            # Update existing user to admin
            result = await db.users.update_one(
                {"email": email.lower()},
                {"$set": {
                    "is_admin": True,
                    "password": hash_password(password),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            print(f"✓ Updated existing user '{email}' to admin with new password")
        else:
            # Create new admin user
            user_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)

            user = {
                "id": user_id,
                "email": email.lower(),
                "password": hash_password(password),
                "name": name,
                "is_admin": True,
                "created_at": now,
                "updated_at": now
            }

            await db.users.insert_one(user)
            print(f"✓ Created new admin user: {email}")

        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  Admin: Yes")

    except Exception as e:
        print(f"✗ Error creating admin user: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    # Admin credentials
    ADMIN_EMAIL = "contact@illinoisestatelaw.com"
    ADMIN_PASSWORD = "IEL2024!"
    ADMIN_NAME = "Illinois Estate Law Admin"

    print("Creating admin user...")
    asyncio.run(create_admin_user(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME))
