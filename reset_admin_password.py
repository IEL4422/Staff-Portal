"""Reset admin user password"""
import os
import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase_url = os.environ.get('VITE_SUPABASE_URL')
supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY')
supabase = create_client(supabase_url, supabase_key)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

admin_email = "contact@illinoisestatelaw.com"
new_password = "admin123"

password_hash = hash_password(new_password)

result = supabase.table("users").update({
    "password_hash": password_hash
}).eq("email", admin_email).execute()

if result.data:
    print(f"\n✅ Password reset successfully for {admin_email}")
    print(f"\n📧 Email: {admin_email}")
    print(f"🔑 Password: {new_password}")
    print("\nYou can now login with these credentials.")
else:
    print(f"\n❌ Failed to reset password for {admin_email}")
