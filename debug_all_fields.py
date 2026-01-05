import requests
import json

# Test credentials
base_url = "https://lawstaff.preview.emergentagent.com"
api_url = f"{base_url}/api"

# Login first
login_data = {
    "email": "test@example.com",
    "password": "test123456"
}

response = requests.post(f"{api_url}/auth/login", json=login_data)
if response.status_code == 200:
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    print("=== ALL CALL LOG RECORDS ===")
    # Get all call log records to see if any have linking fields
    call_log_response = requests.get(f"{api_url}/airtable/call-log", headers=headers)
    if call_log_response.status_code == 200:
        call_log_data = call_log_response.json()
        records = call_log_data.get('records', [])
        print(f"Found {len(records)} call log records")
        
        # Check all unique field names across all records
        all_fields = set()
        for record in records:
            all_fields.update(record.get('fields', {}).keys())
        
        print("All Call Log Field Names:")
        for field in sorted(all_fields):
            print(f"  - {field}")
            
        # Show a few sample records
        print("\nSample Call Log Records:")
        for i, record in enumerate(records[:3]):
            print(f"Record {i+1}: {json.dumps(record.get('fields', {}), indent=2)}")
            print("---")
    else:
        print(f"Failed to get call log: {call_log_response.status_code} - {call_log_response.text}")
    
    print("\n=== MASTER LIST SAMPLE RECORDS ===")
    # Get a few master list records to see all available fields
    master_response = requests.get(f"{api_url}/airtable/master-list?maxRecords=3", headers=headers)
    if master_response.status_code == 200:
        master_data = master_response.json()
        records = master_data.get('records', [])
        
        # Check all unique field names
        all_fields = set()
        for record in records:
            all_fields.update(record.get('fields', {}).keys())
        
        print("All Master List Field Names:")
        for field in sorted(all_fields):
            print(f"  - {field}")
            
else:
    print(f"Login failed: {response.status_code} - {response.text}")