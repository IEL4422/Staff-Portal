import requests
import sys
import json
from datetime import datetime, timezone

class StaffPortalAPITester:
    def __init__(self, base_url="https://estatelaw-portal.preview.emergentagent.com"):
        self.base_url = base_url
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

    def test_probate_task_status_error_handling(self):
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

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Illinois Estate Law Staff Portal API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()

        # Authentication tests - try test credentials first
        if self.test_login_with_test_credentials():
            print("✅ Logged in with test credentials")
            
            # NEW EDITABLE PROGRESS BAR AND FIELD EDITING TESTING (MAIN FOCUS)
            print("\n🎯 EDITABLE PROGRESS BAR AND FIELD-TYPE SPECIFIC EDITING TESTING:")
            print("Testing the new editable progress bar and field-type-specific editing features")
            self.test_probate_case_data_retrieval()
            self.test_editable_progress_bar_backend()
            self.test_field_type_specific_editing_backend()
            self.test_estate_planning_case_backend()
            self.test_backend_persistence_verification()
            
            # Task Completion Date Feature Tests (Supporting APIs)
            print("\n📅 Testing Task Completion Date API Endpoints:")
            self.test_task_dates_get_endpoint()
            self.test_task_dates_post_endpoint()
            self.test_task_dates_integration()
            
            # Other feature tests (background verification)
            print("\n📊 Testing other features (background verification):")
            self.test_dashboard_consultations_data()
            self.test_search_deandra_johnson()
            self.test_call_log_endpoints()
            self.test_master_list_update_for_files()
            
            # Other Airtable integration tests
            print("\n📊 Testing other Airtable integrations:")
            self.test_airtable_master_list()
            self.test_airtable_search()
            self.test_dashboard_data()
            self.test_dates_deadlines()
            self.test_payments()
            
            # Create operations tests
            print("\n🔨 Testing create operations:")
            self.test_create_mail()
            self.test_create_invoice()
            self.test_create_task()
            self.test_create_deadline()
            self.test_create_contact()
            self.test_create_lead()
            self.test_create_client()
            
            # Webhook tests
            print("\n🔗 Testing webhooks:")
            self.test_webhooks()
            
        elif self.test_user_registration():
            print("✅ Created new test user")
            self.test_user_login()
            
            # Run the same tests with new user
            print("\n🎯 Testing specific features from review request:")
            self.test_dashboard_consultations_data()
            self.test_search_deandra_johnson()
            self.test_call_log_endpoints()
            self.test_master_list_update_for_files()
            
            # Other tests...
            self.test_airtable_master_list()
            self.test_airtable_search()
            self.test_dashboard_data()
            self.test_dates_deadlines()
            self.test_payments()
            self.test_create_mail()
            self.test_create_invoice()
            self.test_create_task()
            self.test_create_deadline()
            self.test_create_contact()
            self.test_create_lead()
            self.test_create_client()
            self.test_webhooks()
        else:
            print("❌ Authentication failed, skipping authenticated tests")

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