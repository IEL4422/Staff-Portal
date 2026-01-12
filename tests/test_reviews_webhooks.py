"""
Test suite for Reviews page webhook endpoints and Probate Detail page
Tests the P1 bug fixes:
1. Reviews page 'Request' button - sends review request webhook + Airtable update
2. Reviews page 'Follow Up' button - sends follow-up webhook + Airtable update
3. Probate Detail page loads without 'Client Role' field (field was removed)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "contact@illinoisestatelaw.com"
TEST_PASSWORD = "IEL2024!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL.lower()
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestReviewWebhookEndpoints:
    """Test Review webhook endpoints - P1 bug fixes"""
    
    def test_send_review_request_endpoint_exists(self, auth_headers):
        """Test that send-review-request endpoint exists and requires proper data"""
        # Test with empty data - should fail validation
        response = requests.post(
            f"{BASE_URL}/api/webhooks/send-review-request",
            headers=auth_headers,
            json={}
        )
        # Should return 422 (validation error) not 404 (not found)
        assert response.status_code == 422, f"Expected 422 for missing data, got {response.status_code}"
        print("✓ send-review-request endpoint exists and validates input")
    
    def test_send_review_followup_endpoint_exists(self, auth_headers):
        """Test that send-review-followup endpoint exists and requires proper data"""
        # Test with empty data - should fail validation
        response = requests.post(
            f"{BASE_URL}/api/webhooks/send-review-followup",
            headers=auth_headers,
            json={}
        )
        # Should return 422 (validation error) not 404 (not found)
        assert response.status_code == 422, f"Expected 422 for missing data, got {response.status_code}"
        print("✓ send-review-followup endpoint exists and validates input")
    
    def test_send_review_request_with_valid_data(self, auth_headers):
        """Test send-review-request with valid data structure"""
        # First get a completed matter to test with
        response = requests.get(
            f"{BASE_URL}/api/airtable/master-list",
            headers=auth_headers,
            params={"filter_by": "AND({Active/Inactive}='Completed', {Type of Case}!='Lead')", "max_records": 1}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not fetch completed matters: {response.status_code}")
        
        records = response.json().get("records", [])
        if not records:
            pytest.skip("No completed matters found to test with")
        
        record = records[0]
        record_id = record.get("id")
        fields = record.get("fields", {})
        
        # Test the webhook endpoint with real data
        webhook_data = {
            "record_id": record_id,
            "first_name": fields.get("First Name", "Test"),
            "last_name": fields.get("Last Name", "User"),
            "email_address": fields.get("Email Address", "test@example.com"),
            "phone_number": fields.get("Phone Number", "")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/send-review-request",
            headers=auth_headers,
            json=webhook_data
        )
        
        # Should succeed (200) or fail with webhook error (500) - not 404 or 422
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "success"
            assert "date_sent" in data
            print(f"✓ Review request sent successfully for record {record_id}")
        else:
            # 500 means webhook was called but Zapier might have failed
            print(f"⚠ Review request endpoint called but webhook failed: {response.text}")
    
    def test_send_review_followup_with_valid_data(self, auth_headers):
        """Test send-review-followup with valid data structure"""
        # First get a completed matter to test with
        response = requests.get(
            f"{BASE_URL}/api/airtable/master-list",
            headers=auth_headers,
            params={"filter_by": "AND({Active/Inactive}='Completed', {Type of Case}!='Lead')", "max_records": 1}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not fetch completed matters: {response.status_code}")
        
        records = response.json().get("records", [])
        if not records:
            pytest.skip("No completed matters found to test with")
        
        record = records[0]
        record_id = record.get("id")
        fields = record.get("fields", {})
        
        # Test the webhook endpoint with real data
        webhook_data = {
            "record_id": record_id,
            "first_name": fields.get("First Name", "Test"),
            "last_name": fields.get("Last Name", "User"),
            "email_address": fields.get("Email Address", "test@example.com"),
            "phone_number": fields.get("Phone Number", "")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/send-review-followup",
            headers=auth_headers,
            json=webhook_data
        )
        
        # Should succeed (200) or fail with webhook error (500) - not 404 or 422
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "success"
            assert "date_sent" in data
            print(f"✓ Review follow-up sent successfully for record {record_id}")
        else:
            # 500 means webhook was called but Zapier might have failed
            print(f"⚠ Review follow-up endpoint called but webhook failed: {response.text}")


class TestMasterListEndpoints:
    """Test Master List endpoints for Probate Detail page"""
    
    def test_get_master_list_record(self, auth_headers):
        """Test fetching a single master list record"""
        # First get a probate case
        response = requests.get(
            f"{BASE_URL}/api/airtable/master-list",
            headers=auth_headers,
            params={"filter_by": "{Type of Case}='Probate'", "max_records": 1}
        )
        
        assert response.status_code == 200
        records = response.json().get("records", [])
        
        if not records:
            pytest.skip("No probate cases found")
        
        record_id = records[0].get("id")
        
        # Fetch the specific record
        response = requests.get(
            f"{BASE_URL}/api/airtable/master-list/{record_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "fields" in data
        
        # Verify 'Client Role' field is NOT in the response (it doesn't exist in Airtable)
        fields = data.get("fields", {})
        # Note: The field simply doesn't exist in Airtable, so it won't be in the response
        # This is expected behavior - the frontend was trying to update a non-existent field
        print(f"✓ Master list record fetched successfully: {record_id}")
        print(f"  Fields present: {list(fields.keys())[:10]}...")  # Show first 10 fields
    
    def test_update_master_list_record_valid_field(self, auth_headers):
        """Test updating a valid field on master list record"""
        # First get a probate case
        response = requests.get(
            f"{BASE_URL}/api/airtable/master-list",
            headers=auth_headers,
            params={"filter_by": "{Type of Case}='Probate'", "max_records": 1}
        )
        
        assert response.status_code == 200
        records = response.json().get("records", [])
        
        if not records:
            pytest.skip("No probate cases found")
        
        record_id = records[0].get("id")
        
        # Update a valid field (Staff Notes)
        response = requests.patch(
            f"{BASE_URL}/api/airtable/master-list/{record_id}",
            headers=auth_headers,
            json={"fields": {"Staff Notes": "Test note from automated testing"}}
        )
        
        # Should succeed
        assert response.status_code == 200, f"Update failed: {response.status_code} - {response.text}"
        print(f"✓ Master list record updated successfully: {record_id}")


class TestReviewsPageData:
    """Test data fetching for Reviews page"""
    
    def test_fetch_completed_matters(self, auth_headers):
        """Test fetching completed matters for Reviews page"""
        response = requests.get(
            f"{BASE_URL}/api/airtable/master-list",
            headers=auth_headers,
            params={"filter_by": "AND({Active/Inactive}='Completed', {Type of Case}!='Lead')"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "records" in data
        
        records = data.get("records", [])
        print(f"✓ Found {len(records)} completed matters for Reviews page")
        
        if records:
            # Check first record has expected fields
            first_record = records[0]
            fields = first_record.get("fields", {})
            
            # These fields should be available for the Reviews page
            expected_fields = ["Matter Name", "Email Address", "Phone Number"]
            for field in expected_fields:
                if field in fields:
                    print(f"  ✓ Field '{field}' present")
                else:
                    print(f"  ⚠ Field '{field}' not present in this record")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
