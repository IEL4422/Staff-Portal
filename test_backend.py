#!/usr/bin/env python3
"""Quick backend diagnostic test"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test if all critical imports work"""
    print("🧪 Testing Python imports...")
    print("="*50)

    try:
        import fastapi
        print("✅ FastAPI:", fastapi.__version__)
    except ImportError as e:
        print(f"❌ FastAPI: {e}")
        return False

    try:
        import supabase
        print("✅ Supabase:", supabase.__version__)
    except ImportError as e:
        print(f"❌ Supabase: {e}")
        return False

    try:
        import uvicorn
        print("✅ Uvicorn:", uvicorn.__version__)
    except ImportError as e:
        print(f"❌ Uvicorn: {e}")
        return False

    try:
        import bcrypt
        print("✅ Bcrypt available")
    except ImportError as e:
        print(f"❌ Bcrypt: {e}")
        return False

    try:
        import jwt
        print("✅ PyJWT available")
    except ImportError as e:
        print(f"❌ PyJWT: {e}")
        return False

    return True

def test_env():
    """Test if environment variables are set"""
    print("\n🧪 Testing Environment Variables...")
    print("="*50)

    from dotenv import load_dotenv
    load_dotenv()

    required_vars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'JWT_SECRET'
    ]

    all_ok = True
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            preview = value[:30] + "..." if len(value) > 30 else value
            print(f"✅ {var}: {preview}")
        else:
            print(f"❌ {var}: Not set")
            all_ok = False

    return all_ok

def test_supabase_connection():
    """Test Supabase connection"""
    print("\n🧪 Testing Supabase Connection...")
    print("="*50)

    try:
        from dotenv import load_dotenv
        load_dotenv()

        from supabase import create_client, Client

        supabase_url = os.environ.get('VITE_SUPABASE_URL')
        supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY')

        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials not found in .env")
            return False

        supabase: Client = create_client(supabase_url, supabase_key)

        # Try to query the users table
        result = supabase.table('users').select('id').limit(1).execute()

        print(f"✅ Connected to Supabase successfully")
        print(f"✅ Users table accessible")
        return True

    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_server_import():
    """Test if server.py can be imported"""
    print("\n🧪 Testing Backend Server Import...")
    print("="*50)

    try:
        from dotenv import load_dotenv
        load_dotenv()

        # Change to backend directory
        os.chdir('backend')
        sys.path.insert(0, os.getcwd())

        import server
        print("✅ Backend server module loaded")
        print(f"✅ FastAPI app: {server.app.title}")

        # Check routers
        routes = [route.path for route in server.app.routes]
        auth_routes = [r for r in routes if '/auth/' in r]
        print(f"✅ Auth routes found: {len(auth_routes)}")
        for route in auth_routes:
            print(f"   - {route}")

        return True

    except Exception as e:
        print(f"❌ Server import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "="*50)
    print("🔬 BACKEND DIAGNOSTIC TEST")
    print("="*50 + "\n")

    results = []

    results.append(("Imports", test_imports()))
    results.append(("Environment", test_env()))
    results.append(("Supabase Connection", test_supabase_connection()))
    results.append(("Server Module", test_server_import()))

    print("\n" + "="*50)
    print("📊 TEST RESULTS")
    print("="*50)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")

    all_passed = all(result for _, result in results)

    print("\n" + "="*50)
    if all_passed:
        print("✅ ALL TESTS PASSED")
        print("\nYour backend is ready to start!")
        print("Run: ./start_backend.sh")
    else:
        print("❌ SOME TESTS FAILED")
        print("\nPlease fix the issues above before starting the backend")
    print("="*50 + "\n")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
