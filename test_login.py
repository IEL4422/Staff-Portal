"""Test login functionality"""
import requests
import json

BACKEND_URL = "http://localhost:8000"

def test_login():
    """Test login with admin credentials"""
    url = f"{BACKEND_URL}/api/auth/login"
    payload = {
        "email": "contact@illinoisestatelaw.com",
        "password": "admin123"
    }

    print(f"\n🧪 Testing login at: {url}")
    print(f"📧 Email: {payload['email']}")
    print(f"🔑 Password: {payload['password']}")
    print("\n" + "="*50)

    try:
        response = requests.post(url, json=payload, timeout=10)

        print(f"\n✅ Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ LOGIN SUCCESSFUL!")
            print(f"\n👤 User: {data['user']['name']}")
            print(f"📧 Email: {data['user']['email']}")
            print(f"🔑 Token: {data['access_token'][:50]}...")
            print("\n✅ Your login is working correctly!")
            return True
        else:
            print(f"\n❌ LOGIN FAILED")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"\n❌ CONNECTION ERROR")
        print(f"Could not connect to backend at {BACKEND_URL}")
        print(f"\nMake sure the backend is running:")
        print(f"  cd backend")
        print(f"  uvicorn server:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    test_login()
