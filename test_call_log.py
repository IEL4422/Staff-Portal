import requests
import json

# Test credentials
base_url = "https://estateplanner-hub.preview.emergentagent.com"
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
    
    print("=== TESTING CALL LOG FILTERING ===")
    
    # Test getting call log records filtered by case ID
    test_case_id = "rec04FJtHmZLFLROL"  # Deandra Johnson's record ID
    call_log_response = requests.get(f"{api_url}/airtable/call-log?case_id={test_case_id}", headers=headers)
    
    print(f"Status Code: {call_log_response.status_code}")
    if call_log_response.status_code == 200:
        call_log_data = call_log_response.json()
        records = call_log_data.get('records', [])
        print(f"✅ Found {len(records)} call log records for case {test_case_id}")
        
        if records:
            print("Sample record:")
            print(json.dumps(records[0].get('fields', {}), indent=2))
        else:
            print("No call log records found for this case (expected for Deandra Johnson)")
    else:
        print(f"❌ Failed: {call_log_response.text}")
        
    # Also test with a case that might have call log records
    print("\n=== TESTING WITH DIFFERENT CASE ===")
    # Let's find a case that has call log records
    all_call_logs = requests.get(f"{api_url}/airtable/call-log", headers=headers)
    if all_call_logs.status_code == 200:
        all_records = all_call_logs.json().get('records', [])
        # Find a record that has a Matter field
        for record in all_records:
            matter_field = record.get('fields', {}).get('Matter')
            if matter_field and isinstance(matter_field, list) and len(matter_field) > 0:
                test_matter_id = matter_field[0]
                print(f"Testing with Matter ID: {test_matter_id}")
                
                matter_call_logs = requests.get(f"{api_url}/airtable/call-log?case_id={test_matter_id}", headers=headers)
                print(f"Status Code: {matter_call_logs.status_code}")
                if matter_call_logs.status_code == 200:
                    matter_records = matter_call_logs.json().get('records', [])
                    print(f"✅ Found {len(matter_records)} call log records for case {test_matter_id}")
                else:
                    print(f"❌ Failed: {matter_call_logs.text}")
                break
        
else:
    print(f"Login failed: {response.status_code} - {response.text}")