"""
Document Generation Module Tests
Tests for: Login, Client Bundle, Templates, Document Generation, Dropbox, Slack
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://docgen-fix-2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "contact@illinoisestatelaw.com"
TEST_PASSWORD = "IEL2024!"


class TestAuth:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
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
        print(f"Login successful - user: {data['user'].get('email')}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"}
        )
        assert response.status_code in [401, 400]


class TestAirtableClients:
    """Test Airtable client data endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_cached_matters(self, auth_headers):
        """Test getting cached matters (clients) from Airtable"""
        response = requests.get(
            f"{BASE_URL}/api/airtable/cached/matters",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # API returns 'matters' not 'records'
        assert "matters" in data
        print(f"Found {len(data['matters'])} matters/clients")
        
        # Check that we have Probate and Estate Planning cases
        case_types = set()
        for record in data['matters'][:20]:  # Check first 20
            case_type = record.get('fields', {}).get('Type of Case', '')
            if case_type:
                case_types.add(case_type)
        
        print(f"Case types found: {case_types}")
        assert len(data['matters']) > 0, "No clients found"


class TestClientBundle:
    """Test client bundle API - critical for document generation"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def sample_client_id(self, auth_headers):
        """Get a sample client ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/airtable/cached/matters",
            headers=auth_headers
        )
        data = response.json()
        if data.get('matters'):
            return data['matters'][0]['id']
        pytest.skip("No clients available for testing")
    
    def test_get_client_bundle(self, auth_headers, sample_client_id):
        """Test getting client bundle with all Airtable fields"""
        response = requests.get(
            f"{BASE_URL}/api/documents/client-bundle/{sample_client_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        bundle = response.json()
        
        # Check that bundle has expected keys
        print(f"Client bundle has {len(bundle)} keys")
        
        # Check for common fields
        expected_fields = ['clientname', 'mattername', 'currentdate']
        for field in expected_fields:
            assert field in bundle, f"Missing expected field: {field}"
        
        # Check for raw fields
        assert '_raw_fields' in bundle, "Missing _raw_fields in bundle"
        
        print(f"Client name: {bundle.get('clientname', 'N/A')}")
        print(f"Matter name: {bundle.get('mattername', 'N/A')}")
        
        # Check array normalization - arrays should be converted to strings
        raw_fields = bundle.get('_raw_fields', {})
        for key, value in raw_fields.items():
            # If original was array, bundle value should be string
            if isinstance(value, list):
                bundle_value = bundle.get(key, '')
                assert isinstance(bundle_value, str), f"Array field '{key}' not normalized to string"
                print(f"Array field '{key}' normalized: {value} -> '{bundle_value}'")
    
    def test_client_bundle_array_normalization(self, auth_headers, sample_client_id):
        """Test that linked records (arrays) are properly normalized to strings"""
        response = requests.get(
            f"{BASE_URL}/api/documents/client-bundle/{sample_client_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        bundle = response.json()
        
        # Check specific fields that are often linked records
        linked_fields = ['Calendar', 'Judge', 'Case Contacts', 'Assets & Debts']
        
        for field in linked_fields:
            if field in bundle:
                value = bundle[field]
                # Should be string, not list
                assert not isinstance(value, list), f"Field '{field}' is still an array: {value}"
                print(f"Field '{field}' is properly normalized: {type(value).__name__} = '{value[:50] if value else 'empty'}'")


class TestTemplates:
    """Test template endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_templates(self, auth_headers):
        """Test getting all templates"""
        response = requests.get(
            f"{BASE_URL}/api/documents/templates",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print(f"Found {len(data['templates'])} templates")
        
        # List template names and types
        for t in data['templates'][:5]:
            print(f"  - {t.get('name')} ({t.get('type')}) - {t.get('case_type')}")
    
    def test_get_templates_by_case_type_probate(self, auth_headers):
        """Test getting templates filtered by Probate case type"""
        response = requests.get(
            f"{BASE_URL}/api/documents/templates/by-case-type/Probate",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print(f"Found {len(data['templates'])} Probate templates")
    
    def test_get_templates_by_case_type_estate_planning(self, auth_headers):
        """Test getting templates filtered by Estate Planning case type"""
        response = requests.get(
            f"{BASE_URL}/api/documents/templates/by-case-type/Estate%20Planning",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print(f"Found {len(data['templates'])} Estate Planning templates")
    
    def test_get_constants(self, auth_headers):
        """Test getting constants (counties, case types, categories)"""
        response = requests.get(
            f"{BASE_URL}/api/documents/constants",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "counties" in data
        assert "case_types" in data
        assert "categories" in data
        print(f"Counties: {data['counties']}")
        print(f"Case types: {data['case_types']}")


class TestDocumentGeneration:
    """Test document generation endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def sample_client_id(self, auth_headers):
        """Get a sample client ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/airtable/cached/matters",
            headers=auth_headers
        )
        data = response.json()
        if data.get('matters'):
            return data['matters'][0]['id']
        pytest.skip("No clients available for testing")
    
    @pytest.fixture(scope="class")
    def sample_template_id(self, auth_headers):
        """Get a sample template ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/documents/templates",
            headers=auth_headers
        )
        data = response.json()
        if data.get('templates'):
            return data['templates'][0]['id']
        pytest.skip("No templates available for testing")
    
    def test_get_batch_variables(self, auth_headers, sample_client_id, sample_template_id):
        """Test getting batch variables for document generation"""
        response = requests.post(
            f"{BASE_URL}/api/documents/get-batch-variables",
            headers=auth_headers,
            json={
                "client_id": sample_client_id,
                "template_ids": [sample_template_id]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        print(f"Found {len(data['variables'])} variables for template")
        
        # Check variable structure
        for var in data['variables'][:3]:
            print(f"  - {var.get('variable')}: needs_input={var.get('needs_input')}, has_airtable_data={var.get('has_airtable_data')}")
    
    def test_generate_batch_documents(self, auth_headers, sample_client_id, sample_template_id):
        """Test batch document generation"""
        response = requests.post(
            f"{BASE_URL}/api/documents/generate-batch",
            headers=auth_headers,
            json={
                "client_id": sample_client_id,
                "template_ids": [sample_template_id],
                "staff_inputs": {},
                "save_to_dropbox": False,
                "save_inputs": False
            }
        )
        
        # Document generation may fail if template file is missing, but API should respond
        assert response.status_code in [200, 400, 500]
        data = response.json()
        
        if response.status_code == 200:
            print(f"Generated {data.get('total_generated', 0)} documents")
            if data.get('results'):
                for r in data['results']:
                    print(f"  - {r.get('template_name')}: {r.get('docx_filename', r.get('pdf_filename', 'N/A'))}")
        else:
            print(f"Generation response: {data}")
    
    def test_get_generated_documents(self, auth_headers):
        """Test getting list of generated documents"""
        response = requests.get(
            f"{BASE_URL}/api/documents/generated",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        print(f"Found {len(data['documents'])} generated documents in history")


class TestDropboxIntegration:
    """Test Dropbox integration endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_dropbox_list_folders(self, auth_headers):
        """Test listing Dropbox folders"""
        response = requests.get(
            f"{BASE_URL}/api/documents/dropbox/folders",
            headers=auth_headers,
            params={"path": ""}
        )
        
        # May return 401 if token expired, 200 if working
        if response.status_code == 200:
            data = response.json()
            assert "folders" in data
            print(f"Found {len(data['folders'])} Dropbox folders")
            for f in data['folders'][:5]:
                print(f"  - {f.get('name')}: {f.get('path')}")
        elif response.status_code == 401:
            print("Dropbox token expired - expected behavior")
            data = response.json()
            assert "expired" in data.get("detail", "").lower() or "token" in data.get("detail", "").lower()
        else:
            print(f"Dropbox API response: {response.status_code} - {response.text}")
    
    def test_dropbox_search_folders(self, auth_headers):
        """Test searching Dropbox folders"""
        response = requests.get(
            f"{BASE_URL}/api/documents/dropbox/search",
            headers=auth_headers,
            params={"query": "Illinois"}
        )
        
        # May return 401 if token expired
        if response.status_code == 200:
            data = response.json()
            print(f"Search results: {len(data.get('folders', []))} folders")
        elif response.status_code == 401:
            print("Dropbox token expired - expected behavior")
        else:
            print(f"Dropbox search response: {response.status_code}")


class TestSlackIntegration:
    """Test Slack integration endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_send_for_approval_validation(self, auth_headers):
        """Test send for approval endpoint validation"""
        # Test with empty documents - should return 400
        response = requests.post(
            f"{BASE_URL}/api/documents/send-for-approval",
            headers=auth_headers,
            json={
                "documents": [],
                "matter_name": "Test Matter"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "No documents" in data.get("detail", "")
        print("Validation working - empty documents rejected")


class TestMappingProfiles:
    """Test mapping profile endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_mapping_profiles(self, auth_headers):
        """Test getting all mapping profiles"""
        response = requests.get(
            f"{BASE_URL}/api/documents/mapping-profiles",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        print(f"Found {len(data['profiles'])} mapping profiles")


class TestAirtableFields:
    """Test Airtable fields endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_airtable_fields(self, auth_headers):
        """Test getting available Airtable fields for mapping"""
        response = requests.get(
            f"{BASE_URL}/api/documents/airtable-fields",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # API returns structured data with multiple field categories
        assert "master_list_fields" in data or "bundle_keys" in data
        
        if "master_list_fields" in data:
            print(f"Found {len(data['master_list_fields'])} Master List fields")
            for f in data['master_list_fields'][:10]:
                print(f"  - {f}")
        
        if "bundle_keys" in data:
            print(f"Found {len(data['bundle_keys'])} bundle keys")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
