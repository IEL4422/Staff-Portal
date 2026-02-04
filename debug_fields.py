import requests
import json

# Test credentials
base_url = "https://docgen-fix-2.preview.emergentagent.com"
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
    
    print("=== CALL LOG TABLE STRUCTURE ===")
    # Get call log records to see field structure
    call_log_response = requests.get(f"{api_url}/airtable/call-log", headers=headers)
    if call_log_response.status_code == 200:
        call_log_data = call_log_response.json()
        records = call_log_data.get('records', [])
        if records:
            print("Sample Call Log Record Fields:")
            print(json.dumps(records[0].get('fields', {}), indent=2))
        else:
            print("No call log records found")
    else:
        print(f"Failed to get call log: {call_log_response.status_code} - {call_log_response.text}")
    
    print("\n=== MASTER LIST RECORD STRUCTURE ===")
    # Get Deandra Johnson's record to see field structure
    deandra_response = requests.get(f"{api_url}/airtable/master-list/rec04FJtHmZLFLROL", headers=headers)
    if deandra_response.status_code == 200:
        deandra_data = deandra_response.json()
        print("Deandra Johnson Record Fields:")
        print(json.dumps(deandra_data.get('fields', {}), indent=2))
    else:
        print(f"Failed to get Deandra's record: {deandra_response.status_code} - {deandra_response.text}")
        
else:
    print(f"Login failed: {response.status_code} - {response.text}")