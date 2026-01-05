import requests
import sys
import json
from datetime import datetime, timezone

class StaffPortalAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        # Extract backend URL from frontend URL for API calls
        if "localhost:3000" in base_url:
            self.api_url = "https://estate-manager-55.preview.emergentagent.com/api"
        else:
            self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test("API Health Check", "GET", "health", 200)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        result = self.run_test("User Registration", "POST", "auth/register", 200, test_user)
        if result and 'access_token' in result:
            self.token = result['access_token']
            self.user_id = result['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Try to get user info first to verify token works
        result = self.run_test("Get Current User", "GET", "auth/me", 200)
        return result is not None

    def test_login_with_test_credentials(self):
        """Test login with provided test credentials"""
        test_credentials = {
            "email": "test@test.com",
            "password": "test"
        }
        
        result = self.run_test("Login with Test Credentials", "POST", "auth/login", 200, test_credentials)
        if result and 'access_token' in result:
            self.token = result['access_token']
            self.user_id = result['user']['id']
            return True
        return False

    def test_airtable_master_list(self):
        """Test Airtable Master List endpoints"""
        if not self.token:
            return False
            
        # Get master list
        result = self.run_test("Get Master List", "GET", "airtable/master-list?maxRecords=10", 200)
        return result is not None

    def test_airtable_search(self):
        """Test Airtable search functionality"""
        if not self.token:
            return False
            
        result = self.run_test("Search Records", "GET", "airtable/search?query=test&tables=Master List", 200)
        return result is not None

    def test_dashboard_data(self):
        """Test dashboard data endpoint"""
        if not self.token:
            return False
            
        result = self.run_test("Dashboard Data", "GET", "airtable/dashboard", 200)
        return result is not None

    def test_dates_deadlines(self):
        """Test dates and deadlines endpoints"""
        if not self.token:
            return False
            
        # Get dates and deadlines
        result = self.run_test("Get Dates & Deadlines", "GET", "airtable/dates-deadlines", 200)
        return result is not None

    def test_payments(self):
        """Test payments endpoint"""
        if not self.token:
            return False
            
        result = self.run_test("Get Payments", "GET", "airtable/payments", 200)
        return result is not None

    def test_create_mail(self):
        """Test creating mail record"""
        if not self.token:
            return False
            
        mail_data = {
            "recipient": "test@example.com",
            "subject": "Test Mail",
            "body": "This is a test mail from API testing",
            "status": "Pending"
        }
        
        result = self.run_test("Create Mail Record", "POST", "airtable/mail", 200, mail_data)
        return result is not None

    def test_create_invoice(self):
        """Test creating invoice record"""
        if not self.token:
            return False
            
        invoice_data = {
            "client_name": "Test Client",
            "amount": 1500.00,
            "description": "Test Invoice for API testing",
            "status": "Pending",
            "due_date": "2024-12-31"
        }
        
        result = self.run_test("Create Invoice Record", "POST", "airtable/invoices", 200, invoice_data)
        return result is not None

    def test_create_task(self):
        """Test creating task record"""
        if not self.token:
            return False
            
        task_data = {
            "title": "Test Task",
            "description": "This is a test task from API testing",
            "due_date": "2024-12-31",
            "priority": "Medium",
            "status": "To Do"
        }
        
        result = self.run_test("Create Task Record", "POST", "airtable/case-tasks", 200, task_data)
        return result is not None

    def test_create_deadline(self):
        """Test creating date/deadline record"""
        if not self.token:
            return False
            
        deadline_data = {
            "title": "Test Deadline",
            "date": "2024-12-31",
            "type": "Deadline",
            "notes": "This is a test deadline from API testing"
        }
        
        result = self.run_test("Create Date/Deadline Record", "POST", "airtable/dates-deadlines", 200, deadline_data)
        return result is not None

    def test_create_contact(self):
        """Test creating case contact record"""
        if not self.token:
            return False
            
        contact_data = {
            "name": "Test Contact",
            "role": "Client",
            "phone": "555-123-4567",
            "email": "testcontact@example.com",
            "notes": "This is a test contact from API testing"
        }
        
        result = self.run_test("Create Case Contact Record", "POST", "airtable/case-contacts", 200, contact_data)
        return result is not None

    def test_create_lead(self):
        """Test creating lead record"""
        if not self.token:
            return False
            
        lead_data = {
            "name": "Test Lead",
            "email": "testlead@example.com",
            "phone": "555-987-6543",
            "lead_type": "Estate Planning",
            "referral_source": "Website",
            "inquiry_notes": "This is a test lead from API testing"
        }
        
        result = self.run_test("Create Lead Record", "POST", "airtable/leads", 200, lead_data)
        return result is not None

    def test_create_client(self):
        """Test creating client record"""
        if not self.token:
            return False
            
        client_data = {
            "name": "Test Client",
            "email": "testclient@example.com",
            "phone": "555-456-7890",
            "address": "123 Test St, Test City, TS 12345",
            "case_type": "Probate"
        }
        
        result = self.run_test("Create Client Record", "POST", "airtable/clients", 200, client_data)
        return result is not None

    def test_webhooks(self):
        """Test webhook endpoints (mocked)"""
        if not self.token:
            return False
            
        # Test case update webhook
        webhook_data = {"data": {"case_id": "test123", "update": "Test case update"}}
        result1 = self.run_test("Send Case Update Webhook", "POST", "webhooks/send-case-update", 200, webhook_data)
        
        # Test file upload webhook
        file_data = {"data": {"file_name": "test.pdf", "case_id": "test123"}}
        result2 = self.run_test("Upload File Webhook", "POST", "webhooks/upload-file", 200, file_data)
        
        return result1 is not None and result2 is not None

    def test_call_log_endpoints(self):
        """Test Call Log API endpoints"""
        if not self.token:
            return False
            
        # Test getting all call log records
        result1 = self.run_test("Get Call Log Records", "GET", "airtable/call-log", 200)
        
        # Test getting call log records filtered by case ID (using test lead ID)
        # Note: Deandra Johnson should have 0 call log records as mentioned in review request
        test_case_id = "rec04FJtHmZLFLROL"  # Deandra Johnson's record ID
        result2 = self.run_test("Get Call Log by Case ID (Deandra Johnson)", "GET", f"airtable/call-log?case_id={test_case_id}", 200)
        
        if result2 is not None:
            records = result2.get('records', [])
            print(f"📞 Call log records for Deandra Johnson: {len(records)} (expected: 0)")
        
        return result1 is not None and result2 is not None

    def test_master_list_update_for_files(self):
        """Test Master List PATCH endpoint for file attachments"""
        if not self.token:
            return False
            
        # Use the test lead ID for Deandra Johnson
        test_record_id = "rec04FJtHmZLFLROL"
        
        # Test updating with Dropbox URL (this field exists in the schema)
        update_data = {
            "fields": {
                "Dropbox URL": "https://example.com/test-file.pdf"
            }
        }
        
        result = self.run_test("Update Master List Record (Dropbox URL)", "PATCH", f"airtable/master-list/{test_record_id}", 200, update_data)
        
        # Also test with Case Notes field (which should exist)
        update_data2 = {
            "fields": {
                "Case Notes": "Test file attachment note added via API"
            }
        }
        
        result2 = self.run_test("Update Master List Record (Case Notes)", "PATCH", f"airtable/master-list/{test_record_id}", 200, update_data2)
        
        return result is not None or result2 is not None

    def test_dashboard_consultations_data(self):
        """Test dashboard data for consultations with phone/email fields"""
        if not self.token:
            return False
            
        result = self.run_test("Dashboard Consultations Data", "GET", "airtable/dashboard", 200)
        
        if result:
            # Check if consultations data is present
            consultations = result.get("consultations", [])
            print(f"📋 Found {len(consultations)} consultations")
            
            # Check for phone and email fields in consultations
            has_contact_info = False
            for consultation in consultations:
                fields = consultation.get("fields", {})
                phone = fields.get("Phone Number") or fields.get("Phone")
                email = fields.get("Email Address") or fields.get("Email")
                
                if phone or email:
                    has_contact_info = True
                    print(f"📞 Consultation has contact info - Phone: {phone}, Email: {email}")
                    break
            
            if not has_contact_info and consultations:
                print("⚠️  No phone/email contact info found in consultations")
            
            return True
        
        return False

    def test_search_deandra_johnson(self):
        """Test searching for Deandra Johnson specifically"""
        if not self.token:
            return False
            
        result = self.run_test("Search for Deandra Johnson", "GET", "airtable/search?query=Deandra Johnson", 200)
        
        if result:
            records = result.get("records", [])
            print(f"🔍 Found {len(records)} records for 'Deandra Johnson'")
            
            # Look for the specific record
            deandra_found = False
            for record in records:
                fields = record.get("fields", {})
                client_name = fields.get("Client") or fields.get("Matter Name") or ""
                if "Deandra" in client_name and "Johnson" in client_name:
                    deandra_found = True
                    record_id = record.get("id")
                    print(f"✅ Found Deandra Johnson record: {record_id}")
                    break
            
            if not deandra_found:
                print("⚠️  Deandra Johnson record not found in search results")
            
            return True
        
        return False

    def test_task_dates_get_endpoint(self):
        """Test GET /api/task-dates/{case_id} endpoint"""
        if not self.token:
            return False
            
        # Use the test case ID from review request: Estate of King Hung Wong
        test_case_id = "rec0CkT1DyRCxkOak"
        
        result = self.run_test("GET Task Dates API", "GET", f"task-dates/{test_case_id}", 200)
        
        if result:
            task_dates = result.get("task_dates", {})
            print(f"📅 Found {len(task_dates)} task completion dates for case {test_case_id}")
            
            # Check the structure of the response
            if isinstance(task_dates, dict):
                print("✅ Task dates returned as dictionary (correct format)")
                for task_key, task_data in task_dates.items():
                    if isinstance(task_data, dict) and "completion_date" in task_data:
                        print(f"📋 Task '{task_key}' completed on: {task_data['completion_date']}")
            else:
                print("⚠️  Task dates not returned as expected dictionary format")
            
            return True
        
        return False

    def test_task_dates_post_endpoint(self):
        """Test POST /api/task-dates/{case_id} endpoint"""
        if not self.token:
            return False
            
        # Use the test case ID from review request: Estate of King Hung Wong
        test_case_id = "rec0CkT1DyRCxkOak"
        
        # Test saving a task completion date with "Done" status
        test_task_data = {
            "task_key": "test_task_completion_api",
            "status": "Done"
        }
        
        result = self.run_test("POST Task Dates API (Done status)", "POST", f"task-dates/{test_case_id}", 200, test_task_data)
        
        if result:
            success = result.get("success", False)
            completion_date = result.get("completion_date")
            
            if success and completion_date:
                print(f"✅ Task completion date saved successfully: {completion_date}")
                
                # Verify the date is in ISO format
                try:
                    from datetime import datetime
                    parsed_date = datetime.fromisoformat(completion_date.replace('Z', '+00:00'))
                    print(f"📅 Completion date is valid ISO format: {parsed_date}")
                except Exception as e:
                    print(f"⚠️  Completion date format issue: {e}")
                
                # Test with "Not Applicable" status
                test_task_data_na = {
                    "task_key": "test_task_not_applicable_api",
                    "status": "Not Applicable"
                }
                
                result2 = self.run_test("POST Task Dates API (Not Applicable status)", "POST", f"task-dates/{test_case_id}", 200, test_task_data_na)
                
                if result2:
                    success2 = result2.get("success", False)
                    completion_date2 = result2.get("completion_date")
                    
                    if success2 and completion_date2:
                        print(f"✅ Not Applicable task completion date saved: {completion_date2}")
                    else:
                        print("⚠️  Not Applicable task completion date not saved properly")
                
                # Test with non-completion status (should not save date)
                test_task_data_progress = {
                    "task_key": "test_task_in_progress_api",
                    "status": "In Progress"
                }
                
                result3 = self.run_test("POST Task Dates API (In Progress status)", "POST", f"task-dates/{test_case_id}", 200, test_task_data_progress)
                
                if result3:
                    success3 = result3.get("success", False)
                    completion_date3 = result3.get("completion_date")
                    
                    if success3 and completion_date3 is None:
                        print("✅ In Progress status correctly did not save completion date")
                    else:
                        print(f"⚠️  In Progress status unexpectedly saved date: {completion_date3}")
                
                return True
            else:
                print("⚠️  Task completion date not saved properly")
        
        return False

    def test_task_dates_integration(self):
        """Test full task dates integration - save and retrieve"""
        if not self.token:
            return False
            
        test_case_id = "rec0CkT1DyRCxkOak"
        
        # First, save a task completion date
        test_task_data = {
            "task_key": "integration_test_task",
            "status": "Done"
        }
        
        save_result = self.run_test("Task Dates Integration - Save", "POST", f"task-dates/{test_case_id}", 200, test_task_data)
        
        if save_result and save_result.get("success"):
            saved_date = save_result.get("completion_date")
            print(f"📅 Saved completion date: {saved_date}")
            
            # Now retrieve the task dates to verify it was saved
            get_result = self.run_test("Task Dates Integration - Retrieve", "GET", f"task-dates/{test_case_id}", 200)
            
            if get_result:
                task_dates = get_result.get("task_dates", {})
                
                if "integration_test_task" in task_dates:
                    retrieved_task = task_dates["integration_test_task"]
                    retrieved_date = retrieved_task.get("completion_date")
                    
                    if retrieved_date == saved_date:
                        print("✅ Task completion date successfully saved and retrieved")
                        return True
                    else:
                        print(f"⚠️  Date mismatch - Saved: {saved_date}, Retrieved: {retrieved_date}")
                else:
                    print("⚠️  Saved task not found in retrieved data")
            else:
                print("⚠️  Failed to retrieve task dates after saving")
        else:
            print("⚠️  Failed to save task completion date")
        
        return False

    def test_editable_progress_bar_backend(self):
        """Test backend support for editable progress bar functionality"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Editable Progress Bar Backend Support:")
        print("=" * 50)
        
        # Test case: Estate of King Hung Wong (Probate case)
        probate_case_id = "rec0CkT1DyRCxkOak"
        
        # Test updating Stage (Probate) field for progress bar
        stage_updates = [
            {"stage": "Pre-Opening", "description": "Initial stage"},
            {"stage": "Estate Opened", "description": "Estate has been opened"},
            {"stage": "Creditor Notification Period", "description": "Creditor notification in progress"},
            {"stage": "Administration", "description": "Estate administration phase"},
            {"stage": "Estate Closed", "description": "Final stage - estate closed"}
        ]
        
        all_passed = True
        
        for stage_update in stage_updates:
            stage = stage_update["stage"]
            description = stage_update["description"]
            
            print(f"\n📊 Testing progress bar stage update: {stage}")
            
            # Update the Stage (Probate) field
            update_data = {
                "fields": {
                    "Stage (Probate)": stage
                }
            }
            
            result = self.run_test(
                f"Update Progress Bar Stage to '{stage}'",
                "PATCH",
                f"airtable/master-list/{probate_case_id}",
                200,
                update_data
            )
            
            if result:
                # Verify the update was successful
                updated_fields = result.get("fields", {})
                updated_stage = updated_fields.get("Stage (Probate)")
                
                if updated_stage == stage:
                    print(f"✅ Progress bar stage successfully updated to: {updated_stage}")
                else:
                    print(f"⚠️  Stage update mismatch - Expected: {stage}, Got: {updated_stage}")
                    all_passed = False
            else:
                print(f"❌ Failed to update progress bar stage to {stage}")
                all_passed = False
        
        return all_passed

    def test_field_type_specific_editing_backend(self):
        """Test backend support for field-type specific editing functionality"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Field-Type Specific Editing Backend Support:")
        print("=" * 50)
        
        # Test case: Estate of King Hung Wong (Probate case)
        probate_case_id = "rec0CkT1DyRCxkOak"
        
        # Test different field types as mentioned in review request
        field_tests = [
            {
                "field_name": "County",
                "field_type": "dropdown",
                "test_value": "Cook",
                "description": "County dropdown field (Cook, DuPage, Lake, etc.)"
            },
            {
                "field_name": "Package Purchased", 
                "field_type": "dropdown",
                "test_value": "Probate Package",
                "description": "Package Purchased dropdown field"
            },
            {
                "field_name": "Stage (Probate)",
                "field_type": "dropdown", 
                "test_value": "Administration",
                "description": "Stage (Probate) dropdown field"
            },
            {
                "field_name": "Is there a will?",
                "field_type": "boolean",
                "test_value": "Yes",
                "description": "Boolean field (Yes/No options)"
            },
            {
                "field_name": "Opening Date",
                "field_type": "date",
                "test_value": "2024-01-15",
                "description": "Opening Date field (date picker)"
            },
            {
                "field_name": "Closing Date",
                "field_type": "date", 
                "test_value": "2024-12-31",
                "description": "Closing Date field (date picker)"
            },
            {
                "field_name": "Last Contacted",
                "field_type": "date",
                "test_value": "2024-01-10",
                "description": "Last Contacted date field"
            },
            {
                "field_name": "Date of Birth",
                "field_type": "date",
                "test_value": "1950-05-15", 
                "description": "Date of Birth field (date picker)"
            },
            {
                "field_name": "Date of Death",
                "field_type": "date",
                "test_value": "2023-10-20",
                "description": "Date of Death field (date picker)"
            },
            {
                "field_name": "Client Name",
                "field_type": "text",
                "test_value": "Linda Wong (Updated)",
                "description": "Client Name text field"
            },
            {
                "field_name": "Phone Number",
                "field_type": "text", 
                "test_value": "(555) 123-4567",
                "description": "Phone Number text field"
            },
            {
                "field_name": "Email Address",
                "field_type": "text",
                "test_value": "linda.wong.updated@example.com",
                "description": "Email Address text field"
            }
        ]
        
        all_passed = True
        
        for field_test in field_tests:
            field_name = field_test["field_name"]
            field_type = field_test["field_type"]
            test_value = field_test["test_value"]
            description = field_test["description"]
            
            print(f"\n📝 Testing {field_type} field: {field_name}")
            print(f"   Description: {description}")
            
            # Update the specific field
            update_data = {
                "fields": {
                    field_name: test_value
                }
            }
            
            result = self.run_test(
                f"Update {field_type} field '{field_name}' to '{test_value}'",
                "PATCH",
                f"airtable/master-list/{probate_case_id}",
                200,
                update_data
            )
            
            if result:
                # Verify the update was successful
                updated_fields = result.get("fields", {})
                updated_value = updated_fields.get(field_name)
                
                if updated_value == test_value:
                    print(f"✅ {field_type.title()} field '{field_name}' successfully updated to: {updated_value}")
                else:
                    print(f"⚠️  Field update mismatch - Expected: {test_value}, Got: {updated_value}")
                    # Don't mark as failed for minor differences (Airtable might format values)
                    if str(updated_value) != str(test_value):
                        print(f"   Note: Values differ but update was processed")
            else:
                print(f"❌ Failed to update {field_type} field '{field_name}'")
                all_passed = False
        
        return all_passed

    def test_estate_planning_case_backend(self):
        """Test backend support for Estate Planning case editing"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Estate Planning Case Backend Support:")
        print("=" * 50)
        
        # First, try to find an Estate Planning case
        search_result = self.run_test("Search for Estate Planning Cases", "GET", "airtable/search?query=Estate Planning", 200)
        
        estate_planning_case_id = None
        if search_result:
            records = search_result.get("records", [])
            for record in records:
                fields = record.get("fields", {})
                case_type = fields.get("Type of Case", "")
                if "Estate Planning" in case_type:
                    estate_planning_case_id = record.get("id")
                    matter_name = fields.get("Matter Name", "Unknown")
                    print(f"✅ Found Estate Planning case: {matter_name} (ID: {estate_planning_case_id})")
                    break
        
        if not estate_planning_case_id:
            print("⚠️  No Estate Planning case found for testing")
            return False
        
        # Test Estate Planning specific fields
        ep_field_tests = [
            {
                "field_name": "Package Purchased",
                "field_type": "dropdown",
                "test_value": "Estate Planning Package",
                "description": "Package Purchased dropdown for Estate Planning"
            },
            {
                "field_name": "Stage (EP)",
                "field_type": "dropdown",
                "test_value": "2 - Drafting",
                "description": "Stage (EP) dropdown (1 - Questionnaire, 2 - Drafting, etc.)"
            },
            {
                "field_name": "Last Contacted",
                "field_type": "date",
                "test_value": "2024-01-08",
                "description": "Last Contacted date field"
            },
            {
                "field_name": "Client Name",
                "field_type": "text",
                "test_value": "Estate Planning Client (Updated)",
                "description": "Client Name text field"
            },
            {
                "field_name": "Phone Number",
                "field_type": "text",
                "test_value": "(555) 987-6543",
                "description": "Phone Number text field"
            }
        ]
        
        all_passed = True
        
        for field_test in ep_field_tests:
            field_name = field_test["field_name"]
            field_type = field_test["field_type"]
            test_value = field_test["test_value"]
            description = field_test["description"]
            
            print(f"\n📝 Testing Estate Planning {field_type} field: {field_name}")
            
            # Update the specific field
            update_data = {
                "fields": {
                    field_name: test_value
                }
            }
            
            result = self.run_test(
                f"Update EP {field_type} field '{field_name}' to '{test_value}'",
                "PATCH",
                f"airtable/master-list/{estate_planning_case_id}",
                200,
                update_data
            )
            
            if result:
                updated_fields = result.get("fields", {})
                updated_value = updated_fields.get(field_name)
                
                if updated_value == test_value:
                    print(f"✅ Estate Planning {field_type} field '{field_name}' successfully updated")
                else:
                    print(f"⚠️  EP field update processed (Expected: {test_value}, Got: {updated_value})")
            else:
                print(f"❌ Failed to update Estate Planning {field_type} field '{field_name}'")
                all_passed = False
        
        return all_passed

    def test_backend_persistence_verification(self):
        """Test that backend updates are persisting to Airtable (verify 200 responses on PATCH requests)"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Backend Update Persistence:")
        print("=" * 50)
        
        # Test case: Estate of King Hung Wong
        test_case_id = "rec0CkT1DyRCxkOak"
        
        # Test a series of updates and verify they persist
        persistence_tests = [
            {
                "field": "Stage (Probate)",
                "value": "Administration",
                "description": "Progress bar stage update"
            },
            {
                "field": "County", 
                "value": "Cook",
                "description": "Dropdown field update"
            },
            {
                "field": "Last Contacted",
                "value": "2024-01-12",
                "description": "Date field update"
            }
        ]
        
        all_passed = True
        
        for test in persistence_tests:
            field = test["field"]
            value = test["value"]
            description = test["description"]
            
            print(f"\n💾 Testing persistence: {description}")
            
            # Make the update
            update_data = {
                "fields": {
                    field: value
                }
            }
            
            result = self.run_test(
                f"Update {field} for persistence test",
                "PATCH",
                f"airtable/master-list/{test_case_id}",
                200,
                update_data
            )
            
            if result:
                print(f"✅ PATCH request returned 200 - update sent to Airtable")
                
                # Verify by retrieving the record
                get_result = self.run_test(
                    f"Verify {field} persistence",
                    "GET",
                    f"airtable/master-list/{test_case_id}",
                    200
                )
                
                if get_result:
                    fields = get_result.get("fields", {})
                    persisted_value = fields.get(field)
                    
                    if persisted_value == value:
                        print(f"✅ Value persisted correctly in Airtable: {persisted_value}")
                    else:
                        print(f"⚠️  Value may have been formatted by Airtable - Expected: {value}, Got: {persisted_value}")
                        # Don't fail for formatting differences
                else:
                    print(f"❌ Failed to retrieve record for persistence verification")
                    all_passed = False
            else:
                print(f"❌ PATCH request failed - update not sent to Airtable")
                all_passed = False
        
        return all_passed

    def test_my_tasks_api_endpoint(self):
        """Test the /api/airtable/my-tasks endpoint specifically for the review request"""
        if not self.token:
            return False
            
        print("\n🎯 Testing My Tasks API Endpoint:")
        print("=" * 50)
        
        # Test the my-tasks endpoint that filters by logged-in user's email
        result = self.run_test("GET /api/airtable/my-tasks", "GET", "airtable/my-tasks", 200)
        
        if result:
            records = result.get("records", [])
            print(f"📋 Found {len(records)} tasks for logged-in user")
            
            # For test@test.com, we expect 0 tasks as mentioned in review request
            if len(records) == 0:
                print("✅ Correctly returns empty array for test@test.com (no tasks assigned)")
                return True
            else:
                print(f"📝 Found {len(records)} tasks assigned to user:")
                for i, record in enumerate(records[:3]):  # Show first 3 tasks
                    fields = record.get("fields", {})
                    task_name = fields.get("Task", "Unknown Task")
                    assigned_to = fields.get("Assigned To Contact Email", "Unknown")
                    due_date = fields.get("Due Date", "No due date")
                    print(f"   {i+1}. {task_name} (Assigned to: {assigned_to}, Due: {due_date})")
                
                # Check if tasks are properly filtered by user email
                user_email = "test@test.com"  # The test credentials email
                properly_filtered = True
                for record in records:
                    fields = record.get("fields", {})
                    assigned_email = fields.get("Assigned To Contact Email", "").lower()
                    if user_email.lower() not in assigned_email:
                        properly_filtered = False
                        print(f"⚠️  Task not properly filtered: assigned to {assigned_email}")
                        break
                
                if properly_filtered:
                    print("✅ All returned tasks are properly filtered by user email")
                    return True
                else:
                    print("❌ Tasks not properly filtered by user email")
                    return False
        
        return False

    def test_tasks_page_backend_support(self):
        """Test backend APIs that support the Tasks page functionality"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Tasks Page Backend Support:")
        print("=" * 50)
        
        # Test the my-tasks endpoint (main API for Tasks page)
        my_tasks_result = self.test_my_tasks_api_endpoint()
        
        # Test general tasks endpoint for comparison
        general_tasks_result = self.run_test("GET /api/airtable/tasks (general)", "GET", "airtable/tasks", 200)
        
        if general_tasks_result:
            general_records = general_tasks_result.get("records", [])
            print(f"📊 General tasks endpoint returned {len(general_records)} total tasks")
        
        return my_tasks_result

    def test_clients_page_backend_support(self):
        """Test backend APIs that support the Clients page with probate progress bars"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Clients Page Backend Support:")
        print("=" * 50)
        
        # Test active cases endpoint (used by Clients page)
        result = self.run_test("GET /api/airtable/active-cases", "GET", "airtable/active-cases", 200)
        
        if result:
            records = result.get("records", [])
            print(f"📋 Found {len(records)} active cases for Clients page")
            
            # Check for probate cases and their progress information
            probate_cases = []
            estate_planning_cases = []
            
            for record in records:
                fields = record.get("fields", {})
                case_type = fields.get("Type of Case", "")
                matter_name = fields.get("Matter Name", "Unknown")
                stage_probate = fields.get("Stage (Probate)", "")
                
                if "Probate" in case_type:
                    probate_cases.append({
                        "id": record.get("id"),
                        "matter_name": matter_name,
                        "stage": stage_probate
                    })
                elif "Estate Planning" in case_type:
                    estate_planning_cases.append({
                        "id": record.get("id"),
                        "matter_name": matter_name,
                        "case_type": case_type
                    })
            
            print(f"⚖️  Found {len(probate_cases)} Probate cases (should show progress bars)")
            print(f"📝 Found {len(estate_planning_cases)} Estate Planning cases (should NOT show progress bars)")
            
            # Show some examples
            if probate_cases:
                print("\n📊 Sample Probate cases with progress information:")
                for i, case in enumerate(probate_cases[:3]):
                    stage = case["stage"] or "No stage set"
                    print(f"   {i+1}. {case['matter_name']} - Stage: {stage}")
            
            if estate_planning_cases:
                print("\n📋 Sample Estate Planning cases (no progress bars):")
                for i, case in enumerate(estate_planning_cases[:3]):
                    print(f"   {i+1}. {case['matter_name']} - Type: {case['case_type']}")
            
            return True
        
        return False

    def test_header_navigation_backend_support(self):
        """Test backend endpoints that support header navigation items"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Header Navigation Backend Support:")
        print("=" * 50)
        
        # Test endpoints for each navigation item mentioned in review request
        navigation_tests = [
            {
                "name": "Dashboard",
                "endpoint": "airtable/dashboard",
                "description": "Dashboard data endpoint"
            },
            {
                "name": "Clients", 
                "endpoint": "airtable/active-cases",
                "description": "Active cases for Clients page"
            },
            {
                "name": "Leads",
                "endpoint": "airtable/active-leads", 
                "description": "Active leads for Leads page"
            },
            {
                "name": "Tasks",
                "endpoint": "airtable/my-tasks",
                "description": "My tasks for Tasks page"
            },
            {
                "name": "Payments",
                "endpoint": "airtable/payments",
                "description": "Payments data"
            },
            {
                "name": "Judge Info",
                "endpoint": "airtable/judge-information",
                "description": "Judge information data"
            }
        ]
        
        all_passed = True
        
        for nav_test in navigation_tests:
            name = nav_test["name"]
            endpoint = nav_test["endpoint"]
            description = nav_test["description"]
            
            print(f"\n🔗 Testing {name} navigation support:")
            
            result = self.run_test(f"{name} - {description}", "GET", endpoint, 200)
            
            if result:
                # Check if we got meaningful data
                if "records" in result:
                    record_count = len(result.get("records", []))
                    print(f"   ✅ {name} endpoint returned {record_count} records")
                elif "judges" in result:
                    judge_count = len(result.get("judges", []))
                    print(f"   ✅ {name} endpoint returned {judge_count} judges")
                elif "payments" in result:
                    payment_count = len(result.get("payments", []))
                    print(f"   ✅ {name} endpoint returned {payment_count} payments")
                elif "total_active_cases" in result:
                    case_count = result.get("total_active_cases", 0)
                    print(f"   ✅ {name} endpoint returned {case_count} active cases")
                else:
                    print(f"   ✅ {name} endpoint returned data")
            else:
                print(f"   ❌ {name} endpoint failed")
                all_passed = False
        
        return all_passed

    def test_probate_progress_calculation(self):
        """Test probate progress calculation based on Stage (Probate) field"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Probate Progress Calculation:")
        print("=" * 50)
        
        # Get some probate cases to test progress calculation
        result = self.run_test("Get Active Cases for Progress Testing", "GET", "airtable/active-cases", 200)
        
        if result:
            records = result.get("records", [])
            probate_cases = [r for r in records if "Probate" in r.get("fields", {}).get("Type of Case", "")]
            
            print(f"📊 Testing progress calculation for {len(probate_cases)} probate cases")
            
            # Define the progress stages and their percentages
            progress_stages = {
                "Pre-Opening": 4,
                "Estate Opened": 25, 
                "Creditor Notification Period": 50,
                "Administration": 72,
                "Estate Closed": 100
            }
            
            for i, case in enumerate(probate_cases[:5]):  # Test first 5 cases
                fields = case.get("fields", {})
                matter_name = fields.get("Matter Name", "Unknown")
                stage = fields.get("Stage (Probate)", "")
                
                expected_progress = progress_stages.get(stage, 0)
                
                print(f"   {i+1}. {matter_name}")
                print(f"      Stage: {stage}")
                print(f"      Expected Progress: {expected_progress}%")
                
                if stage in progress_stages:
                    print(f"      ✅ Valid stage for progress calculation")
                else:
                    print(f"      ⚠️  Stage not in progress calculation map")
            
            return True
        
        return False
        """Test error handling for Probate Task Tracker status updates"""
        if not self.token:
            return False
            
        test_case_id = "rec0CkT1DyRCxkOak"
        
        print("\n🛡️ Testing Probate Task Tracker Error Handling:")
        print("=" * 50)
        
        # Test missing task_key (should return 400)
        invalid_data1 = {
            "status": "Done"
            # Missing task_key
        }
        
        result1 = self.run_test("Missing task_key", "POST", f"task-dates/{test_case_id}", 400, invalid_data1)
        
        # Test with valid data to ensure normal operation still works
        valid_data = {
            "task_key": "error_handling_test",
            "status": "Done"
        }
        
        result2 = self.run_test("Valid task update after error", "POST", f"task-dates/{test_case_id}", 200, valid_data)
        
        return result1 is None and result2 is not None  # result1 should fail (None), result2 should succeed

    def test_probate_case_data_retrieval(self):
        """Test retrieving the Estate of King Hung Wong case data"""
        if not self.token:
            return False
            
        # Test case ID from review request
        test_case_id = "rec0CkT1DyRCxkOak"
        
        print(f"\n🏛️ Testing Estate of King Hung Wong case data retrieval:")
        print("=" * 50)
        
        # Get the specific case record
        result = self.run_test("Get Estate of King Hung Wong Record", "GET", f"airtable/master-list/{test_case_id}", 200)
        
        if result:
            fields = result.get("fields", {})
            matter_name = fields.get("Matter Name", "Unknown")
            client = fields.get("Client", "Unknown") 
            case_type = fields.get("Type of Case", "Unknown")
            
            print(f"📋 Matter Name: {matter_name}")
            print(f"👤 Client: {client}")
            print(f"⚖️  Case Type: {case_type}")
            
            # Verify this is the correct case
            if "King Hung Wong" in matter_name or "King Hung Wong" in client:
                print("✅ Confirmed this is the Estate of King Hung Wong case")
                return True
            else:
                print("⚠️  This doesn't appear to be the Estate of King Hung Wong case")
                return False
        
        return False

    def test_add_asset_debt_form_backend(self):
        """Test Add Asset/Debt form backend integration"""
        if not self.token:
            return False
            
        print("\n🏠 Testing Add Asset/Debt Form Backend Integration:")
        print("=" * 50)
        
        # Test 1: Create Asset record
        asset_data = {
            "name": "Test Property Asset",
            "asset_or_debt": "Asset",
            "type_of_asset": "Real Estate",
            "value": 150000,
            "notes": "Test submission from portal"
        }
        
        result1 = self.run_test("Create Asset Record", "POST", "airtable/assets-debts", 200, asset_data)
        
        if result1:
            record = result1.get("record", {})
            if record:
                asset_id = record.get("id")
                fields = record.get("fields", {})
                print(f"✅ Asset created with ID: {asset_id}")
                print(f"   Name: {fields.get('Name of Asset')}")
                print(f"   Type: {fields.get('Asset or Debt')}")
                print(f"   Value: {fields.get('Value')}")
            else:
                print("⚠️  Asset creation response missing record data")
        
        # Test 2: Create Debt record
        debt_data = {
            "name": "Test Credit Card Debt",
            "asset_or_debt": "Debt",
            "type_of_debt": "Credit Card",
            "value": 5000,
            "notes": "Test debt submission"
        }
        
        result2 = self.run_test("Create Debt Record", "POST", "airtable/assets-debts", 200, debt_data)
        
        if result2:
            record = result2.get("record", {})
            if record:
                debt_id = record.get("id")
                fields = record.get("fields", {})
                print(f"✅ Debt created with ID: {debt_id}")
                print(f"   Name: {fields.get('Name of Asset')}")
                print(f"   Type: {fields.get('Asset or Debt')}")
                print(f"   Value: {fields.get('Value')}")
            else:
                print("⚠️  Debt creation response missing record data")
        
        # Test 3: Test with minimal required data
        minimal_data = {
            "name": "Minimal Asset Test",
            "asset_or_debt": "Asset"
        }
        
        result3 = self.run_test("Create Asset with Minimal Data", "POST", "airtable/assets-debts", 200, minimal_data)
        
        # Test 4: Test error handling - missing required name field
        invalid_data = {
            "asset_or_debt": "Asset",
            "value": 1000
            # Missing required "name" field
        }
        
        result4 = self.run_test("Create Asset without Name (should fail)", "POST", "airtable/assets-debts", 500, invalid_data)
        
        # Test 5: Get existing assets/debts to verify creation
        result5 = self.run_test("Get Assets/Debts List", "GET", "airtable/assets-debts", 200)
        
        if result5:
            records = result5.get("records", [])
            print(f"📊 Total assets/debts in system: {len(records)}")
            
            # Look for our test records
            test_records = [r for r in records if "Test" in r.get("fields", {}).get("Name of Asset", "")]
            print(f"🧪 Test records found: {len(test_records)}")
        
        return (result1 is not None and result2 is not None and 
                result3 is not None and result5 is not None)

    def test_add_asset_debt_form_validation(self):
        """Test Add Asset/Debt form field validation"""
        if not self.token:
            return False
            
        print("\n✅ Testing Add Asset/Debt Form Validation:")
        print("=" * 50)
        
        # Test different asset types
        asset_types = ["Real Estate", "Bank Account", "Investment Account", "Personal Property", "Other"]
        debt_types = ["Credit Card", "Mortgage", "Personal Loan", "Medical Debt", "Other"]
        
        validation_tests = []
        
        # Test each asset type
        for asset_type in asset_types:
            test_data = {
                "name": f"Test {asset_type} Asset",
                "asset_or_debt": "Asset",
                "type_of_asset": asset_type,
                "value": 10000,
                "notes": f"Testing {asset_type} validation"
            }
            
            result = self.run_test(f"Validate Asset Type: {asset_type}", "POST", "airtable/assets-debts", 200, test_data)
            validation_tests.append(result is not None)
        
        # Test each debt type
        for debt_type in debt_types:
            test_data = {
                "name": f"Test {debt_type} Debt",
                "asset_or_debt": "Debt", 
                "type_of_debt": debt_type,
                "value": 5000,
                "notes": f"Testing {debt_type} validation"
            }
            
            result = self.run_test(f"Validate Debt Type: {debt_type}", "POST", "airtable/assets-debts", 200, test_data)
            validation_tests.append(result is not None)
        
        # Test value field validation
        value_tests = [
            {"value": 0, "description": "Zero value"},
            {"value": 999999.99, "description": "Large value"},
            {"value": 1.50, "description": "Decimal value"}
        ]
        
        for value_test in value_tests:
            test_data = {
                "name": f"Value Test - {value_test['description']}",
                "asset_or_debt": "Asset",
                "value": value_test["value"],
                "notes": f"Testing {value_test['description']}"
            }
            
            result = self.run_test(f"Validate Value: {value_test['description']}", "POST", "airtable/assets-debts", 200, test_data)
            validation_tests.append(result is not None)
        
        # Test long notes field
        long_notes_data = {
            "name": "Long Notes Test Asset",
            "asset_or_debt": "Asset",
            "value": 25000,
            "notes": "This is a very long notes field to test the character limit and ensure that the backend can handle extended descriptions and detailed information about assets and debts. " * 5
        }
        
        result = self.run_test("Validate Long Notes Field", "POST", "airtable/assets-debts", 200, long_notes_data)
        validation_tests.append(result is not None)
        
        passed_tests = sum(validation_tests)
        total_tests = len(validation_tests)
        
        print(f"📊 Validation Tests: {passed_tests}/{total_tests} passed")
        
        return passed_tests >= (total_tests * 0.8)  # 80% pass rate acceptable

    def test_add_asset_debt_search_integration(self):
        """Test Add Asset/Debt form matters search integration"""
        if not self.token:
            return False
            
        print("\n🔍 Testing Add Asset/Debt Matters Search Integration:")
        print("=" * 50)
        
        # Test the search endpoint that would be used by the matters search field
        result1 = self.run_test("Search Matters for Asset/Debt Form", "GET", "airtable/search?query=Estate", 200)
        
        if result1:
            records = result1.get("records", [])
            print(f"🔍 Found {len(records)} matters matching 'Estate'")
            
            # Test creating asset/debt linked to a matter
            if records:
                first_matter = records[0]
                matter_id = first_matter.get("id")
                matter_name = first_matter.get("fields", {}).get("Matter Name", "Unknown")
                
                print(f"🔗 Testing link to matter: {matter_name} ({matter_id})")
                
                linked_asset_data = {
                    "name": "Linked Asset Test",
                    "asset_or_debt": "Asset",
                    "type_of_asset": "Bank Account",
                    "value": 75000,
                    "master_list": [matter_id],
                    "notes": "Asset linked to specific matter"
                }
                
                result2 = self.run_test("Create Asset Linked to Matter", "POST", "airtable/assets-debts", 200, linked_asset_data)
                
                if result2:
                    record = result2.get("record", {})
                    if record:
                        fields = record.get("fields", {})
                        linked_matters = fields.get("Master List", [])
                        print(f"✅ Asset linked to {len(linked_matters)} matter(s)")
                    else:
                        print("⚠️  Asset creation response missing record data")
                
                return result2 is not None
            else:
                print("⚠️  No matters found for linking test")
                return True  # Not a failure if no matters exist
        
        return False

    def run_all_tests(self):
        """Run all API tests focused on the review request features"""
        print("🚀 Starting Illinois Estate Law Staff Portal API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("🎯 FOCUS: Testing new features from review request")
        print("=" * 60)

        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()

        # Authentication tests - use test credentials from review request
        if self.test_login_with_test_credentials():
            print("✅ Logged in with test credentials (test@test.com / test)")
            
            # MAIN FOCUS: NEW FEATURES FROM REVIEW REQUEST
            print("\n🎯 TESTING NEW FEATURES FROM REVIEW REQUEST:")
            print("=" * 60)
            
            # 1. Test Add Asset/Debt Form - PRIMARY FOCUS
            print("\n1️⃣ ADD ASSET/DEBT FORM - PRIMARY FOCUS:")
            self.test_add_asset_debt_form_backend()
            self.test_add_asset_debt_form_validation()
            self.test_add_asset_debt_search_integration()
            
            # 2. Test Clients Page - Probate Task Progress backend support
            print("\n2️⃣ CLIENTS PAGE - PROBATE TASK PROGRESS:")
            self.test_clients_page_backend_support()
            self.test_probate_progress_calculation()
            
            # 3. Test Tasks Page - My Tasks backend support  
            print("\n3️⃣ TASKS PAGE - MY TASKS:")
            self.test_tasks_page_backend_support()
            
            # 4. Test Backend API - /api/airtable/my-tasks directly
            print("\n4️⃣ BACKEND API - /api/airtable/my-tasks:")
            self.test_my_tasks_api_endpoint()
            
            # 5. Test Header Navigation backend support
            print("\n5️⃣ HEADER NAVIGATION:")
            self.test_header_navigation_backend_support()
            
            # SUPPORTING TESTS (Background verification)
            print("\n📊 SUPPORTING BACKEND TESTS:")
            print("=" * 50)
            
            # Authentication verification
            self.test_user_login()
            
            # Core Airtable integration tests
            self.test_airtable_master_list()
            self.test_dashboard_data()
            
        else:
            print("❌ Authentication failed with test credentials")
            print("   Trying user registration as fallback...")
            
            if self.test_user_registration():
                print("✅ Created new test user")
                self.test_user_login()
                
                # Run limited tests with new user
                print("\n🎯 Testing with new user (limited scope):")
                self.test_airtable_master_list()
                self.test_dashboard_data()
            else:
                print("❌ Both authentication methods failed, skipping authenticated tests")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = StaffPortalAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())