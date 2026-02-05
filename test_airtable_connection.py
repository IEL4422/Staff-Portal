#!/usr/bin/env python3
"""Test Airtable connection with provided credentials"""

import os
import httpx
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY', '')
AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID', '')

async def test_airtable_connection():
    """Test connection to Airtable"""
    print("Testing Airtable Connection")
    print("=" * 50)
    print(f"Base ID: {AIRTABLE_BASE_ID}")
    print(f"API Key: {'*' * 20}{AIRTABLE_API_KEY[-10:] if len(AIRTABLE_API_KEY) > 10 else '***'}")
    print()

    if not AIRTABLE_API_KEY or not AIRTABLE_BASE_ID:
        print("❌ Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set")
        return False

    # Test connection by listing tables
    url = f"https://api.airtable.com/v0/meta/bases/{AIRTABLE_BASE_ID}/tables"
    headers = {
        'Authorization': f'Bearer {AIRTABLE_API_KEY}',
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print(f"📡 Connecting to: {url}")
            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json()
                tables = data.get('tables', [])
                print(f"✅ Connection successful!")
                print(f"\nFound {len(tables)} tables:")
                for table in tables:
                    print(f"  • {table['name']} (ID: {table['id']})")
                return True
            else:
                print(f"❌ Connection failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False

    except httpx.TimeoutException:
        print("❌ Connection timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(test_airtable_connection())
