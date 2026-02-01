"""
Test suite for Document Generation batch endpoints
Tests: /api/documents/templates, /api/documents/get-batch-variables, /api/documents/generate-batch
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDocumentsBatch:
    """Document Generation batch endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "contact@illinoisestatelaw.com", "password": "IEL2024!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_templates(self):
        """TEST 1: GET /api/documents/templates returns templates list"""
        response = requests.get(f"{BASE_URL}/api/documents/templates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert isinstance(data["templates"], list)
        print(f"Found {len(data['templates'])} templates")
    
    def test_get_batch_variables_empty(self):
        """TEST 2: POST /api/documents/get-batch-variables with empty template_ids"""
        response = requests.post(
            f"{BASE_URL}/api/documents/get-batch-variables",
            headers=self.headers,
            json={"template_ids": [], "client_id": None}
        )
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        assert data["variables"] == []
    
    def test_generate_batch_no_client_id(self):
        """TEST 3: POST /api/documents/generate-batch without client_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/documents/generate-batch",
            headers=self.headers,
            json={"template_ids": ["template1"]}
        )
        assert response.status_code == 400
        assert "client_id is required" in response.json().get("detail", "")
    
    def test_generate_batch_empty_templates(self):
        """TEST 4: POST /api/documents/generate-batch with empty template_ids returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/documents/generate-batch",
            headers=self.headers,
            json={"template_ids": [], "client_id": "test123"}
        )
        assert response.status_code == 400
        assert "At least one template_id is required" in response.json().get("detail", "")
    
    def test_get_batch_variables_with_real_data(self):
        """TEST 5: POST /api/documents/get-batch-variables with real template and client"""
        # First get a template
        templates_response = requests.get(f"{BASE_URL}/api/documents/templates", headers=self.headers)
        templates = templates_response.json().get("templates", [])
        
        if not templates:
            pytest.skip("No templates available for testing")
        
        template_id = templates[0]["id"]
        
        # Get a client
        clients_response = requests.get(f"{BASE_URL}/api/airtable/cached/matters", headers=self.headers)
        matters = clients_response.json().get("matters", [])
        
        if not matters:
            pytest.skip("No clients available for testing")
        
        # Find a Probate client (matching template case type)
        client_id = None
        for matter in matters:
            if matter.get("type") == "Probate":
                client_id = matter["id"]
                break
        
        if not client_id:
            client_id = matters[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/documents/get-batch-variables",
            headers=self.headers,
            json={"template_ids": [template_id], "client_id": client_id, "profile_mappings": {}}
        )
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        assert "all_variables" in data or "saved_inputs" in data
    
    def test_generate_batch_with_real_data(self):
        """TEST 6: POST /api/documents/generate-batch with real template and client"""
        # First get a template
        templates_response = requests.get(f"{BASE_URL}/api/documents/templates", headers=self.headers)
        templates = templates_response.json().get("templates", [])
        
        if not templates:
            pytest.skip("No templates available for testing")
        
        template_id = templates[0]["id"]
        
        # Get a Probate client
        clients_response = requests.get(f"{BASE_URL}/api/airtable/cached/matters", headers=self.headers)
        matters = clients_response.json().get("matters", [])
        
        client_id = None
        for matter in matters:
            if matter.get("type") == "Probate":
                client_id = matter["id"]
                break
        
        if not client_id:
            pytest.skip("No Probate clients available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/documents/generate-batch",
            headers=self.headers,
            json={
                "client_id": client_id,
                "template_ids": [template_id],
                "profile_mappings": {},
                "staff_inputs": {},
                "save_to_dropbox": False,
                "save_inputs": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "total_requested" in data
        assert "total_generated" in data
        assert "results" in data
        assert data["total_requested"] == 1
        print(f"Generated {data['total_generated']} document(s)")


class TestDocumentsTemplates:
    """Template management endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "contact@illinoisestatelaw.com", "password": "IEL2024!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_constants(self):
        """TEST 7: GET /api/documents/constants returns counties and case types"""
        response = requests.get(f"{BASE_URL}/api/documents/constants", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "counties" in data or "case_types" in data or "categories" in data
    
    def test_get_airtable_fields(self):
        """TEST 8: GET /api/documents/airtable-fields returns available fields"""
        response = requests.get(f"{BASE_URL}/api/documents/airtable-fields", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Should return bundle_keys or similar
        assert isinstance(data, dict)
    
    def test_get_generated_documents(self):
        """TEST 9: GET /api/documents/generated returns generated docs history"""
        response = requests.get(f"{BASE_URL}/api/documents/generated", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert isinstance(data["documents"], list)
        print(f"Found {len(data['documents'])} generated documents in history")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
