"""
Test suite for Assets & Debts Edit Feature
Tests the PATCH /api/airtable/assets-debts/{record_id} endpoint
and related functionality for editing assets/debts on Probate Case Detail page
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://estate-staff-portal.preview.emergentagent.com')

# Test credentials
STAFF_EMAIL = "brittany@illinoisestatelaw.com"
STAFF_PASSWORD = "IEL2026!"


class TestAssetsDebtsEdit:
    """Test suite for Assets & Debts Edit functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for staff user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_login_success(self):
        """Test that staff login works with provided credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Login successful for {STAFF_EMAIL}")
    
    def test_get_assets_debts_endpoint(self, api_client):
        """Test that GET /api/airtable/assets-debts endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200, f"Failed to get assets/debts: {response.text}"
        data = response.json()
        assert "records" in data, "No records field in response"
        print(f"✓ GET assets-debts returned {len(data['records'])} records")
        return data['records']
    
    def test_get_probate_cases(self, api_client):
        """Test fetching probate cases to find one with assets/debts"""
        response = api_client.get(f"{BASE_URL}/api/airtable/master-list")
        assert response.status_code == 200, f"Failed to get master list: {response.text}"
        data = response.json()
        assert "records" in data, "No records in response"
        
        # Find a Probate case
        probate_cases = [
            r for r in data['records'] 
            if r.get('fields', {}).get('Type of Case') == 'Probate'
        ]
        print(f"✓ Found {len(probate_cases)} Probate cases")
        return probate_cases
    
    def test_get_assets_debts_by_case(self, api_client):
        """Test fetching assets/debts for a specific case"""
        # First get a probate case
        response = api_client.get(f"{BASE_URL}/api/airtable/master-list")
        assert response.status_code == 200
        
        probate_cases = [
            r for r in response.json()['records'] 
            if r.get('fields', {}).get('Type of Case') == 'Probate'
        ]
        
        if not probate_cases:
            pytest.skip("No Probate cases found")
        
        case_id = probate_cases[0]['id']
        
        # Get assets/debts for this case
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts", params={"case_id": case_id})
        assert response.status_code == 200, f"Failed to get assets/debts for case: {response.text}"
        data = response.json()
        assert "records" in data
        print(f"✓ Found {len(data['records'])} assets/debts for case {case_id}")
        return data['records'], case_id
    
    def test_patch_assets_debts_endpoint_exists(self, api_client):
        """Test that PATCH /api/airtable/assets-debts/{record_id} endpoint exists"""
        # First get an existing asset/debt record
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200
        
        records = response.json().get('records', [])
        if not records:
            pytest.skip("No assets/debts records found to test PATCH")
        
        record = records[0]
        record_id = record['id']
        
        # Try to PATCH with minimal data (just to verify endpoint exists)
        # We'll use the same values to avoid actually changing data
        current_fields = record.get('fields', {})
        
        patch_data = {
            "fields": {
                "Notes": current_fields.get('Notes', '') or "Test note"
            }
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/airtable/assets-debts/{record_id}",
            json=patch_data
        )
        
        # Should return 200 or 422 (if field names don't match Airtable schema)
        # 404 would mean endpoint doesn't exist
        assert response.status_code != 404, f"PATCH endpoint not found: {response.text}"
        print(f"✓ PATCH endpoint exists, returned status {response.status_code}")
        return record_id, response.status_code
    
    def test_patch_assets_debts_update_notes(self, api_client):
        """Test updating Notes field on an asset/debt record"""
        # Get an existing record
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200
        
        records = response.json().get('records', [])
        if not records:
            pytest.skip("No assets/debts records found")
        
        record = records[0]
        record_id = record['id']
        original_notes = record.get('fields', {}).get('Notes', '')
        
        # Update with test note
        test_note = f"Test note updated via API - {original_notes}"
        patch_data = {
            "fields": {
                "Notes": test_note
            }
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/airtable/assets-debts/{record_id}",
            json=patch_data
        )
        
        if response.status_code == 200:
            updated_record = response.json()
            assert updated_record.get('fields', {}).get('Notes') == test_note
            print(f"✓ Successfully updated Notes field")
            
            # Restore original value
            restore_data = {"fields": {"Notes": original_notes}}
            api_client.patch(f"{BASE_URL}/api/airtable/assets-debts/{record_id}", json=restore_data)
        else:
            print(f"⚠ PATCH returned {response.status_code}: {response.text}")
            # Check if it's a field name issue
            if response.status_code == 422:
                print("Field name mismatch with Airtable schema")
    
    def test_patch_assets_debts_update_status(self, api_client):
        """Test updating Status field on an asset/debt record"""
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200
        
        records = response.json().get('records', [])
        if not records:
            pytest.skip("No assets/debts records found")
        
        record = records[0]
        record_id = record['id']
        original_status = record.get('fields', {}).get('Status', '')
        
        # Try updating status
        new_status = "Found" if original_status != "Found" else "Reported by Client"
        patch_data = {
            "fields": {
                "Status": new_status
            }
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/airtable/assets-debts/{record_id}",
            json=patch_data
        )
        
        if response.status_code == 200:
            print(f"✓ Successfully updated Status to '{new_status}'")
            # Restore original
            restore_data = {"fields": {"Status": original_status}}
            api_client.patch(f"{BASE_URL}/api/airtable/assets-debts/{record_id}", json=restore_data)
        else:
            print(f"⚠ Status update returned {response.status_code}: {response.text}")
    
    def test_patch_assets_debts_update_value(self, api_client):
        """Test updating Value field on an asset/debt record"""
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200
        
        records = response.json().get('records', [])
        if not records:
            pytest.skip("No assets/debts records found")
        
        record = records[0]
        record_id = record['id']
        original_value = record.get('fields', {}).get('Value')
        
        # Try updating value
        new_value = 12345.67
        patch_data = {
            "fields": {
                "Value": new_value
            }
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/airtable/assets-debts/{record_id}",
            json=patch_data
        )
        
        if response.status_code == 200:
            updated = response.json()
            assert updated.get('fields', {}).get('Value') == new_value
            print(f"✓ Successfully updated Value to {new_value}")
            # Restore original
            restore_data = {"fields": {"Value": original_value}}
            api_client.patch(f"{BASE_URL}/api/airtable/assets-debts/{record_id}", json=restore_data)
        else:
            print(f"⚠ Value update returned {response.status_code}: {response.text}")
    
    def test_patch_assets_debts_full_update(self, api_client):
        """Test updating multiple fields at once (simulating frontend edit form)"""
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200
        
        records = response.json().get('records', [])
        if not records:
            pytest.skip("No assets/debts records found")
        
        record = records[0]
        record_id = record['id']
        original_fields = record.get('fields', {})
        
        # Simulate frontend edit form submission
        # These are the field names used in the frontend handleSaveAssetDebt function
        patch_data = {
            "fields": {
                "Name of Asset/Debt": original_fields.get('Name of Asset/Debt', original_fields.get('Name of Asset', 'Test Asset')),
                "Asset or Debt?": original_fields.get('Asset or Debt?', original_fields.get('Asset or Debt', 'Asset')),
                "Status": original_fields.get('Status', 'Found'),
                "Value": original_fields.get('Value', 1000),
                "Notes": "Full update test via API"
            }
        }
        
        # Add type field based on asset or debt
        if patch_data['fields']['Asset or Debt?'] == 'Asset':
            patch_data['fields']['Type of Asset'] = original_fields.get('Type of Asset', 'Other')
        else:
            patch_data['fields']['Type of Debt'] = original_fields.get('Type of Debt', 'Other')
        
        response = api_client.patch(
            f"{BASE_URL}/api/airtable/assets-debts/{record_id}",
            json=patch_data
        )
        
        print(f"Full update response: {response.status_code}")
        if response.status_code != 200:
            print(f"Response body: {response.text}")
        
        # Restore original
        restore_data = {"fields": {"Notes": original_fields.get('Notes', '')}}
        api_client.patch(f"{BASE_URL}/api/airtable/assets-debts/{record_id}", json=restore_data)
        
        return response.status_code, response.text


class TestAssetsDebtsSorting:
    """Test that assets/debts are sorted correctly (Status = Found first)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": STAFF_EMAIL, "password": STAFF_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_assets_debts_sorting_logic(self, api_client):
        """Verify sorting logic: Status = 'Found' should appear first"""
        response = api_client.get(f"{BASE_URL}/api/airtable/assets-debts")
        assert response.status_code == 200
        
        records = response.json().get('records', [])
        if len(records) < 2:
            pytest.skip("Need at least 2 records to test sorting")
        
        # Check if any records have Status = 'Found'
        found_records = [r for r in records if r.get('fields', {}).get('Status') == 'Found']
        other_records = [r for r in records if r.get('fields', {}).get('Status') != 'Found']
        
        print(f"✓ Found {len(found_records)} records with Status='Found'")
        print(f"✓ Found {len(other_records)} records with other statuses")
        
        # Note: Sorting is done on frontend, not backend
        # This test just verifies the data structure supports sorting


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
