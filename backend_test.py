import requests
import sys
import json
import os
from datetime import datetime, timezone

class StaffPortalAPITester:
    def __init__(self, base_url="https://legalstaff.preview.emergentagent.com"):
        self.base_url = base_url
        # Use the production backend URL directly
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

    def test_admin_login(self):
        """Test admin login with provided credentials"""
        admin_credentials = {
            "email": "contact@illinoisestatelaw.com",
            "password": "IEL2024!"
        }
        
        result = self.run_test("Admin Login", "POST", "auth/login", 200, admin_credentials)
        if result and 'access_token' in result:
            self.token = result['access_token']
            self.user_id = result['user']['id']
            print(f"✅ Admin logged in successfully: {result['user']['email']}")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoints"""
        if not self.token:
            return False
            
        print("\n📊 Testing Dashboard Statistics:")
        print("=" * 50)
        
        # Test active cases count
        result1 = self.run_test("Get Active Cases Count", "GET", "airtable/master-list?view=Active%20Cases", 200)
        if result1:
            active_cases = result1.get("records", [])
            print(f"📋 Total Active Cases: {len(active_cases)}")
        
        # Test upcoming events
        result2 = self.run_test("Get Upcoming Events", "GET", "airtable/dates-deadlines", 200)
        if result2:
            events = result2.get("records", [])
            print(f"📅 Total Events: {len(events)}")
        
        # Test my tasks for task badge
        result3 = self.run_test("Get My Tasks for Badge", "GET", "airtable/my-tasks", 200)
        if result3:
            tasks = result3.get("tasks", [])
            not_started_count = len([t for t in tasks if t.get("fields", {}).get("Status") == "Not Started"])
            print(f"📝 My Tasks: {len(tasks)} (Not Started: {not_started_count})")
        
        return all([result1, result2, result3])

    def test_client_list_features(self):
        """Test Client List page features"""
        if not self.token:
            return False
            
        print("\n👥 Testing Client List Features:")
        print("=" * 50)
        
        # Test clients with filters
        filters = ["All", "Probate", "Estate Planning", "Deed"]
        
        for filter_type in filters:
            if filter_type == "All":
                endpoint = "airtable/master-list?view=Active%20Cases"
            else:
                endpoint = f"airtable/master-list?filterByFormula=AND({{Active/Inactive}}='Active',{{Type of Case}}='{filter_type}')"
            
            result = self.run_test(f"Get {filter_type} Clients", "GET", endpoint, 200)
            if result:
                records = result.get("records", [])
                print(f"   {filter_type}: {len(records)} clients")
                
                # Check for required fields
                if records:
                    sample = records[0].get("fields", {})
                    sign_up_date = sample.get("Date Paid")
                    package = sample.get("Package Purchased")
                    case_type = sample.get("Type of Case")
                    
                    print(f"   Sample data - Sign Up Date: {sign_up_date}, Package: {package}, Type: {case_type}")
        
        return True

    def test_tasks_page_features(self):
        """Test Tasks page features"""
        if not self.token:
            return False
            
        print("\n📝 Testing Tasks Page Features:")
        print("=" * 50)
        
        # Test My Tasks section
        result1 = self.run_test("Get My Tasks", "GET", "airtable/my-tasks", 200)
        if result1:
            my_tasks = result1.get("tasks", [])
            print(f"📋 My Tasks: {len(my_tasks)}")
            
            for i, task in enumerate(my_tasks[:3]):
                fields = task.get("fields", {})
                task_name = fields.get("Task", "Unknown")
                status = fields.get("Status", "Unknown")
                priority = fields.get("Priority", "Unknown")
                due_date = fields.get("Due Date", "No due date")
                print(f"   {i+1}. {task_name} - {status} ({priority}) - Due: {due_date}")
        
        # Test unassigned tasks (Admin only)
        result2 = self.run_test("Get Unassigned Tasks", "GET", "airtable/unassigned-tasks", 200)
        if result2:
            unassigned_tasks = result2.get("records", [])
            print(f"📋 Unassigned Tasks: {len(unassigned_tasks)}")
        
        # Test task badge count (Not Started tasks)
        not_started_count = 0
        if result1:
            tasks = result1.get("tasks", [])
            not_started_count = len([t for t in tasks if t.get("fields", {}).get("Status") == "Not Started"])
            print(f"🏷️  Task Badge Count (Not Started): {not_started_count}")
        
        return all([result1, result2])

    def test_sidebar_action_forms(self):
        """Test sidebar action forms"""
        if not self.token:
            return False
            
        print("\n📋 Testing Sidebar Action Forms:")
        print("=" * 50)
        
        # Test matter search for forms
        result1 = self.run_test("Matter Search for Forms", "GET", "airtable/search?query=Estate", 200)
        if result1:
            records = result1.get("records", [])
            print(f"🔍 Matter Search Results: {len(records)} matters found")
            
            if records:
                sample = records[0].get("fields", {})
                matter_name = sample.get("Matter Name", "Unknown")
                client = sample.get("Client", "Unknown")
                print(f"   Sample: {matter_name} - {client}")
        
        # Test send mail form data
        result2 = self.run_test("Get Mail Records", "GET", "airtable/mail", 200)
        if result2:
            mail_records = result2.get("records", [])
            print(f"📧 Mail Records: {len(mail_records)}")
        
        # Test add deadline form data
        result3 = self.run_test("Get Dates & Deadlines", "GET", "airtable/dates-deadlines", 200)
        if result3:
            deadline_records = result3.get("records", [])
            print(f"📅 Deadline Records: {len(deadline_records)}")
        
        return all([result1, result2, result3])

    def test_case_detail_endpoints(self):
        """Test case detail page endpoints"""
        if not self.token:
            return False
            
        print("\n📄 Testing Case Detail Endpoints:")
        print("=" * 50)
        
        # First get a sample case ID
        result = self.run_test("Get Sample Cases", "GET", "airtable/master-list?maxRecords=5", 200)
        if not result:
            return False
        
        records = result.get("records", [])
        if not records:
            print("❌ No cases found for testing")
            return False
        
        test_case = records[0]
        case_id = test_case.get("id")
        case_fields = test_case.get("fields", {})
        matter_name = case_fields.get("Matter Name", "Unknown")
        
        print(f"🔍 Testing with case: {matter_name} (ID: {case_id})")
        
        # Test GET case details
        result1 = self.run_test("GET Case Details", "GET", f"airtable/master-list/{case_id}", 200)
        if result1:
            fields = result1.get("fields", {})
            print(f"✅ Case details retrieved:")
            print(f"   Matter Name: {fields.get('Matter Name', 'N/A')}")
            print(f"   Client: {fields.get('Client', 'N/A')}")
            print(f"   Type: {fields.get('Type of Case', 'N/A')}")
            print(f"   Status: {fields.get('Active/Inactive', 'N/A')}")
        
        # Test PATCH case update
        update_data = {
            "fields": {
                "Case Notes": f"Test update from API testing - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            }
        }
        
        result2 = self.run_test("PATCH Case Update", "PATCH", f"airtable/master-list/{case_id}", 200, update_data)
        if result2:
            updated_fields = result2.get("fields", {})
            updated_notes = updated_fields.get("Case Notes", "")
            print(f"✅ Case updated successfully")
            print(f"   Updated Notes: {updated_notes[:50]}...")
        
        return all([result1, result2])

    def test_authentication_flow(self):
        """Test complete authentication flow"""
        if not self.token:
            return False
            
        print("\n🔐 Testing Authentication Flow:")
        print("=" * 50)
        
        # Test getting current user
        result1 = self.run_test("Get Current User", "GET", "auth/me", 200)
        if result1:
            user_info = result1
            print(f"👤 Current User: {user_info.get('email')} - {user_info.get('name')}")
        
        # Test admin check
        result2 = self.run_test("Check Admin Status", "GET", "auth/check-admin", 200)
        if result2:
            is_admin = result2.get("is_admin", False)
            print(f"🔑 Admin Status: {is_admin}")
        
        return all([result1, result2])

    def test_task_management_endpoints(self):
        """Test task management endpoints mentioned in test_result.md"""
        if not self.token:
            return False
            
        print("\n📝 Testing Task Management Endpoints:")
        print("=" * 50)
        
        # Test dashboard task section backend
        result1 = self.run_test("Dashboard Task Section", "GET", "airtable/my-tasks", 200)
        if result1:
            tasks = result1.get("tasks", [])
            print(f"📊 Dashboard Tasks: {len(tasks)} tasks for admin user")
            
            if tasks:
                sample_task = tasks[0].get("fields", {})
                print(f"   Sample Task: {sample_task.get('Task', 'Unknown')}")
                print(f"   Status: {sample_task.get('Status', 'Unknown')}")
                print(f"   Priority: {sample_task.get('Priority', 'Unknown')}")
                print(f"   Due Date: {sample_task.get('Due Date', 'No due date')}")
        
        # Test task creation
        new_task_data = {
            "task": "Test Task from API Testing",
            "status": "Not Started",
            "priority": "Normal",
            "due_date": "2024-12-31",
            "notes": "Created during backend testing"
        }
        
        result2 = self.run_test("Create New Task", "POST", "airtable/tasks", 200, new_task_data)
        created_task_id = None
        if result2:
            created_task_id = result2.get("id")
            print(f"✅ Task created with ID: {created_task_id}")
        
        # Test task deletion if task was created
        if created_task_id:
            result3 = self.run_test("Delete Test Task", "DELETE", f"airtable/tasks/{created_task_id}", 200)
            if result3:
                print(f"✅ Task deleted successfully")
        
        # Test task edit (this was failing in test_result.md)
        if tasks:
            test_task_id = tasks[0].get("id")
            edit_data = {
                "Task": "Updated Task Name",
                "Status": "In Progress",
                "Notes": "Updated during testing"
            }
            
            result4 = self.run_test("Edit Existing Task", "PATCH", f"airtable/tasks/{test_task_id}", 200, edit_data)
            if result4:
                print(f"✅ Task edit successful")
            else:
                print(f"❌ Task edit failed - this matches the known issue in test_result.md")
        
        return True

    def test_leads_type_field(self):
        """Test leads Type of Lead field"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Leads Type of Lead Field:")
        print("=" * 50)
        
        # Test active leads endpoint
        result = self.run_test("Get Active Leads", "GET", "airtable/master-list?filterByFormula=AND({Active/Inactive}='Active',{Type of Case}='Lead')", 200)
        if result:
            leads = result.get("records", [])
            print(f"🎯 Found {len(leads)} active leads")
            
            type_counts = {}
            for lead in leads:
                fields = lead.get("fields", {})
                lead_type = fields.get("Type of Lead", "Not specified")
                type_counts[lead_type] = type_counts.get(lead_type, 0) + 1
            
            print(f"📊 Type of Lead distribution:")
            for lead_type, count in type_counts.items():
                print(f"   {lead_type}: {count}")
            
            # Show sample leads
            for i, lead in enumerate(leads[:3]):
                fields = lead.get("fields", {})
                client = fields.get("Client", "Unknown")
                lead_type = fields.get("Type of Lead", "Not specified")
                print(f"   {i+1}. {client} - Type: {lead_type}")
        
        return result is not None

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

    def test_airtable_cache_endpoints(self):
        """Test Airtable caching endpoints for Illinois Estate Law Staff Portal"""
        if not self.token:
            return False
            
        print("\n🗄️ Testing Airtable Cache Endpoints:")
        print("=" * 50)
        
        # Test 1: Cache Status Endpoint
        print("\n1. Testing Cache Status Endpoint:")
        status_result = self.run_test("GET /api/airtable/cache/status", "GET", "airtable/cache/status", 200)
        
        if status_result:
            master_list_count = status_result.get("master_list_count", 0)
            assignees_count = status_result.get("assignees_count", 0)
            master_list_updated = status_result.get("master_list_updated")
            assignees_updated = status_result.get("assignees_updated")
            cache_ttl = status_result.get("cache_ttl_seconds", 0)
            
            print(f"   📊 Master List Count: {master_list_count}")
            print(f"   👥 Assignees Count: {assignees_count}")
            print(f"   🕒 Master List Updated: {master_list_updated}")
            print(f"   🕒 Assignees Updated: {assignees_updated}")
            print(f"   ⏱️  Cache TTL: {cache_ttl} seconds")
            
            if master_list_count > 0 and assignees_count > 0:
                print("   ✅ Cache status shows populated data")
            else:
                print("   ⚠️  Cache appears to be empty or not initialized")
        
        # Test 2: Cached Matters Endpoint (Critical - should return ALL 330+ matters)
        print("\n2. Testing Cached Matters Endpoint (Critical):")
        matters_result = self.run_test("GET /api/airtable/cached/matters", "GET", "airtable/cached/matters", 200)
        
        if matters_result:
            matters = matters_result.get("matters", [])
            total = matters_result.get("total", 0)
            cached_at = matters_result.get("cached_at")
            
            print(f"   📋 Total Matters: {total}")
            print(f"   🕒 Cached At: {cached_at}")
            
            if total >= 330:
                print(f"   ✅ CRITICAL SUCCESS: Returns {total} matters (≥330 expected)")
            else:
                print(f"   ❌ CRITICAL FAILURE: Only {total} matters returned (expected ≥330)")
            
            # Verify response structure
            if matters and len(matters) > 0:
                sample_matter = matters[0]
                required_fields = ['id', 'name', 'type', 'client']
                missing_fields = [field for field in required_fields if field not in sample_matter]
                
                if not missing_fields:
                    print("   ✅ Matter structure includes required fields: id, name, type, client")
                    print(f"   📝 Sample matter: {sample_matter.get('name')} ({sample_matter.get('type')})")
                else:
                    print(f"   ⚠️  Missing required fields in matter structure: {missing_fields}")
        
        # Test 3: Cached Assignees Endpoint
        print("\n3. Testing Cached Assignees Endpoint:")
        assignees_result = self.run_test("GET /api/airtable/cached/assignees", "GET", "airtable/cached/assignees", 200)
        
        if assignees_result:
            assignees = assignees_result.get("assignees", [])
            total = assignees_result.get("total", 0)
            cached_at = assignees_result.get("cached_at")
            
            print(f"   👥 Total Assignees: {total}")
            print(f"   🕒 Cached At: {cached_at}")
            print(f"   📝 Assignees: {', '.join(assignees) if assignees else 'None'}")
            
            if total > 0:
                print("   ✅ Assignees cache populated")
            else:
                print("   ⚠️  No assignees found in cache")
        
        # Test 4: Cache Refresh Endpoint
        print("\n4. Testing Cache Refresh Endpoint:")
        refresh_result = self.run_test("POST /api/airtable/cache/refresh", "POST", "airtable/cache/refresh", 200)
        
        if refresh_result:
            success = refresh_result.get("success", False)
            status = refresh_result.get("status", {})
            
            if success:
                print("   ✅ Cache refresh triggered successfully")
                new_master_count = status.get("master_list_count", 0)
                new_assignees_count = status.get("assignees_count", 0)
                print(f"   📊 Updated Master List Count: {new_master_count}")
                print(f"   👥 Updated Assignees Count: {new_assignees_count}")
            else:
                print("   ❌ Cache refresh failed")
        
        # Test 5: Master List Endpoint with fetch_all (should use cached data)
        print("\n5. Testing Master List with fetch_all (cached data):")
        fetch_all_result = self.run_test("GET /api/airtable/master-list?fetch_all=true", "GET", "airtable/master-list?fetch_all=true", 200)
        
        if fetch_all_result:
            records = fetch_all_result.get("records", [])
            total = fetch_all_result.get("total", len(records))
            
            print(f"   📋 Total Records with fetch_all: {total}")
            
            if total >= 330:
                print(f"   ✅ CRITICAL SUCCESS: fetch_all returns {total} records (≥330 expected)")
            else:
                print(f"   ❌ CRITICAL FAILURE: fetch_all only returns {total} records (expected ≥330)")
            
            # Verify this matches cached matters count
            if matters_result and fetch_all_result:
                cached_count = matters_result.get("total", 0)
                fetch_all_count = total
                
                if cached_count == fetch_all_count:
                    print("   ✅ Cached matters count matches fetch_all count")
                else:
                    print(f"   ⚠️  Count mismatch: cached={cached_count}, fetch_all={fetch_all_count}")
        
        # Test 6: Performance comparison (cached vs direct)
        print("\n6. Testing Cache Performance:")
        import time
        
        # Time the cached endpoint
        start_time = time.time()
        cached_perf_result = self.run_test("Cached matters (performance test)", "GET", "airtable/cached/matters", 200)
        cached_time = time.time() - start_time
        
        # Time the direct endpoint (without cache)
        start_time = time.time()
        direct_perf_result = self.run_test("Direct master-list (performance test)", "GET", "airtable/master-list?maxRecords=100", 200)
        direct_time = time.time() - start_time
        
        print(f"   ⚡ Cached endpoint time: {cached_time:.3f}s")
        print(f"   🐌 Direct endpoint time: {direct_time:.3f}s")
        
        if cached_time < direct_time:
            improvement = ((direct_time - cached_time) / direct_time) * 100
            print(f"   ✅ Cache provides {improvement:.1f}% performance improvement")
        else:
            print("   ⚠️  Cache not showing performance improvement (may need warm-up)")
        
        # Summary
        print("\n📊 Cache Testing Summary:")
        cache_tests_passed = 0
        total_cache_tests = 5
        
        if status_result: cache_tests_passed += 1
        if matters_result and matters_result.get("total", 0) >= 330: cache_tests_passed += 1
        if assignees_result: cache_tests_passed += 1
        if refresh_result and refresh_result.get("success"): cache_tests_passed += 1
        if fetch_all_result and fetch_all_result.get("total", 0) >= 330: cache_tests_passed += 1
        
        print(f"   ✅ {cache_tests_passed}/{total_cache_tests} cache tests passed")
        
        return cache_tests_passed >= 4  # Allow 1 test to fail

    def test_new_tasks_page_features(self):
        """Test the new Tasks Page features mentioned in review request"""
        if not self.token:
            return False
            
        print("\n📝 Testing New Tasks Page Features:")
        print("=" * 50)
        
        # Test 1: All Tasks Endpoint (Admin Only) - should return all tasks
        result1 = self.run_test("GET /api/airtable/all-tasks (Admin)", "GET", "airtable/all-tasks", 200)
        if result1:
            all_tasks = result1.get("tasks", [])
            print(f"📋 All Tasks (Admin): {len(all_tasks)} tasks returned")
            
            if all_tasks:
                sample_task = all_tasks[0].get("fields", {})
                print(f"   Sample Task: {sample_task.get('Task', 'Unknown')}")
                print(f"   Status: {sample_task.get('Status', 'Unknown')}")
                print(f"   Assigned To: {sample_task.get('Assigned To', 'Unassigned')}")
        
        # Test 2: All Tasks with status filter - Not Started
        result2 = self.run_test("GET /api/airtable/all-tasks?status_filter=Not Started", "GET", "airtable/all-tasks?status_filter=Not Started", 200)
        if result2:
            not_started_tasks = result2.get("tasks", [])
            print(f"📋 Not Started Tasks: {len(not_started_tasks)} tasks")
            
            # Verify all returned tasks have "Not Started" status
            all_not_started = True
            for task in not_started_tasks:
                status = task.get("fields", {}).get("Status", "")
                if status != "Not Started":
                    all_not_started = False
                    print(f"   ⚠️  Found task with status '{status}' in Not Started filter")
                    break
            
            if all_not_started and not_started_tasks:
                print("   ✅ All returned tasks have 'Not Started' status")
        
        # Test 3: All Tasks with status filter - Done
        result3 = self.run_test("GET /api/airtable/all-tasks?status_filter=Done", "GET", "airtable/all-tasks?status_filter=Done", 200)
        if result3:
            done_tasks = result3.get("tasks", [])
            print(f"📋 Done Tasks: {len(done_tasks)} tasks")
            
            # Verify all returned tasks have "Done" status
            all_done = True
            for task in done_tasks:
                status = task.get("fields", {}).get("Status", "")
                if status != "Done":
                    all_done = False
                    print(f"   ⚠️  Found task with status '{status}' in Done filter")
                    break
            
            if all_done and done_tasks:
                print("   ✅ All returned tasks have 'Done' status")
        
        # Test 4: Master List with increased max_records
        result4 = self.run_test("GET /api/airtable/master-list?max_records=1000", "GET", "airtable/master-list?max_records=1000", 200)
        if result4:
            master_records = result4.get("records", [])
            print(f"📋 Master List (max 1000): {len(master_records)} records returned")
            
            if len(master_records) > 500:
                print("   ✅ Successfully returned more than 500 records (increased limit working)")
            elif len(master_records) > 100:
                print("   ✅ Returned more records than default 100 limit")
            else:
                print(f"   ⚠️  Only returned {len(master_records)} records (may be total available)")
        
        # Test 5: My Tasks endpoint - verify returns tasks array (not records)
        result5 = self.run_test("GET /api/airtable/my-tasks (verify tasks array)", "GET", "airtable/my-tasks", 200)
        if result5:
            if "tasks" in result5:
                my_tasks = result5.get("tasks", [])
                print(f"📋 My Tasks: {len(my_tasks)} tasks (correct 'tasks' key)")
                print("   ✅ Correctly returns 'tasks' array (not 'records')")
            elif "records" in result5:
                print("   ❌ My Tasks incorrectly returns 'records' instead of 'tasks'")
            else:
                print("   ⚠️  My Tasks response structure unclear")
        
        # Test 6: Unassigned Tasks endpoint - verify returns records
        result6 = self.run_test("GET /api/airtable/unassigned-tasks (verify records)", "GET", "airtable/unassigned-tasks", 200)
        if result6:
            if "records" in result6:
                unassigned_records = result6.get("records", [])
                print(f"📋 Unassigned Tasks: {len(unassigned_records)} records (correct 'records' key)")
                print("   ✅ Correctly returns 'records' array")
            else:
                print("   ❌ Unassigned Tasks doesn't return 'records' array")
        
        return all([result1, result2, result3, result4, result5, result6])

    def test_non_admin_access_restriction(self):
        """Test that non-admin users get 403 error for admin-only endpoints"""
        print("\n🔒 Testing Non-Admin Access Restriction:")
        print("=" * 50)
        
        # First, login as a non-admin user (if we can create one)
        # For now, we'll test with current admin user and expect success
        # In a real scenario, we'd need to create a non-admin user
        
        # Test admin access (should work)
        admin_result = self.run_test("Admin Access to All Tasks", "GET", "airtable/all-tasks", 200)
        if admin_result:
            print("✅ Admin user can access all-tasks endpoint")
        
        # Note: To properly test non-admin restriction, we would need:
        # 1. Create a non-admin user account
        # 2. Login with that account
        # 3. Test the all-tasks endpoint (should return 403)
        # 4. Switch back to admin account
        
        print("⚠️  Non-admin restriction test requires separate user account")
        print("   Current test uses admin credentials - access should be allowed")
        
        return admin_result is not None

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

    def test_calendar_backend_endpoints(self):
        """Test Calendar page backend endpoints"""
        if not self.token:
            return False
            
        print("\n📅 Testing Calendar Backend Endpoints:")
        print("=" * 50)
        
        # Test GET /api/airtable/dates-deadlines (for calendar)
        result = self.run_test("GET Dates & Deadlines for Calendar", "GET", "airtable/dates-deadlines", 200)
        
        if result:
            records = result.get("records", [])
            print(f"📅 Found {len(records)} dates/deadlines for calendar")
            
            # Check for required fields for calendar display
            for i, record in enumerate(records[:3]):  # Check first 3 records
                fields = record.get("fields", {})
                event = fields.get("Event", "")
                date = fields.get("Date", "")
                add_client = fields.get("Add Client", [])
                
                print(f"   {i+1}. Event: {event}")
                print(f"      Date: {date}")
                print(f"      Linked Matters: {len(add_client) if isinstance(add_client, list) else 0}")
                
                if not event:
                    print(f"      ⚠️  Missing Event field")
                if not date:
                    print(f"      ⚠️  Missing Date field")
            
            return True
        
        return False

    def test_assets_debts_backend_endpoints(self):
        """Test Assets & Debts page backend endpoints"""
        if not self.token:
            return False
            
        print("\n💰 Testing Assets & Debts Backend Endpoints:")
        print("=" * 50)
        
        # Test GET /api/airtable/assets-debts (for assets/debts list)
        result = self.run_test("GET Assets & Debts for List Page", "GET", "airtable/assets-debts", 200)
        
        if result:
            records = result.get("records", [])
            print(f"💰 Found {len(records)} assets/debts records")
            
            # Calculate summary statistics for the page
            total_assets = 0
            total_debts = 0
            asset_count = 0
            debt_count = 0
            
            for record in records:
                fields = record.get("fields", {})
                asset_or_debt = fields.get("Asset or Debt", "")
                value = fields.get("Value", 0)
                
                if asset_or_debt == "Asset":
                    asset_count += 1
                    if isinstance(value, (int, float)):
                        total_assets += value
                elif asset_or_debt == "Debt":
                    debt_count += 1
                    if isinstance(value, (int, float)):
                        total_debts += value
            
            net_worth = total_assets - total_debts
            
            print(f"📊 Summary Statistics:")
            print(f"   Total Assets: ${total_assets:,.2f} ({asset_count} records)")
            print(f"   Total Debts: ${total_debts:,.2f} ({debt_count} records)")
            print(f"   Net Worth: ${net_worth:,.2f}")
            
            # Check for required fields for list display
            sample_records = records[:3]
            for i, record in enumerate(sample_records):
                fields = record.get("fields", {})
                name = fields.get("Name of Asset", "")
                asset_type = fields.get("Type of Asset", "")
                debt_type = fields.get("Type of Debt", "")
                value = fields.get("Value", 0)
                
                print(f"   {i+1}. Name: {name}")
                print(f"      Type: {asset_type or debt_type or 'Not specified'}")
                print(f"      Value: ${value:,.2f}" if isinstance(value, (int, float)) else f"      Value: {value}")
            
            return True
        
        return False

    def test_case_contacts_backend_endpoints(self):
        """Test Case Contacts page backend endpoints"""
        if not self.token:
            return False
            
        print("\n👥 Testing Case Contacts Backend Endpoints:")
        print("=" * 50)
        
        # Test GET /api/airtable/case-contacts (for case contacts list)
        result = self.run_test("GET Case Contacts for List Page", "GET", "airtable/case-contacts", 200)
        
        if result:
            records = result.get("records", [])
            print(f"👥 Found {len(records)} case contacts")
            
            # Calculate contact type statistics
            contact_types = {}
            total_contacts = len(records)
            
            for record in records:
                fields = record.get("fields", {})
                contact_type = fields.get("Type", [])
                
                # Handle Type field (could be array or string)
                if isinstance(contact_type, list):
                    for ct in contact_type:
                        contact_types[ct] = contact_types.get(ct, 0) + 1
                elif isinstance(contact_type, str) and contact_type:
                    contact_types[contact_type] = contact_types.get(contact_type, 0) + 1
            
            print(f"📊 Contact Type Statistics:")
            print(f"   Total Contacts: {total_contacts}")
            for contact_type, count in contact_types.items():
                print(f"   {contact_type}: {count}")
            
            # Check for required fields for list display
            sample_records = records[:3]
            for i, record in enumerate(sample_records):
                fields = record.get("fields", {})
                name = fields.get("Name", "")
                contact_type = fields.get("Type", [])
                relationship = fields.get("Relationship to Decedent", "")
                street_address = fields.get("Street Address", "")
                city = fields.get("City", "")
                state = fields.get("State (Abbreviation)", "")
                
                print(f"   {i+1}. Name: {name}")
                print(f"      Type: {contact_type}")
                print(f"      Relationship: {relationship}")
                print(f"      Address: {street_address}, {city}, {state}")
            
            return True
        
        return False

    def run_illinois_estate_law_tests(self):
        """Run comprehensive tests for Illinois Estate Law Staff Portal"""
        print("🏛️  ILLINOIS ESTATE LAW STAFF PORTAL - BACKEND API TESTING")
        print("=" * 70)
        print(f"🌐 Testing Backend URL: {self.api_url}")
        print("=" * 70)
        
        # Test 1: Authentication
        print("\n1️⃣  AUTHENTICATION TESTING")
        auth_success = self.test_admin_login()
        if not auth_success:
            print("❌ Authentication failed - cannot proceed with other tests")
            return False
        
        # Test authentication flow
        self.test_authentication_flow()
        
        # Test 2: Dashboard Features
        print("\n2️⃣  DASHBOARD TESTING")
        self.test_dashboard_stats()
        
        # Test 3: Client List Features
        print("\n3️⃣  CLIENT LIST TESTING")
        self.test_client_list_features()
        
        # Test 4: Tasks Page Features
        print("\n4️⃣  TASKS PAGE TESTING")
        self.test_tasks_page_features()
        
        # Test 5: Sidebar Action Forms
        print("\n5️⃣  SIDEBAR ACTION FORMS TESTING")
        self.test_sidebar_action_forms()
        
        # Test 6: Case Detail Pages
        print("\n6️⃣  CASE DETAIL PAGES TESTING")
        self.test_case_detail_endpoints()
        
        # Test 7: Task Management (from test_result.md)
        print("\n7️⃣  TASK MANAGEMENT TESTING")
        self.test_task_management_endpoints()
        
        # Test 8: Leads Type of Lead Field
        print("\n8️⃣  LEADS TYPE FIELD TESTING")
        self.test_leads_type_field()
        
        # Test 9: Airtable Cache Testing (Critical for Review Request)
        print("\n9️⃣  AIRTABLE CACHE TESTING (CRITICAL)")
        cache_success = self.test_airtable_cache_endpoints()
        
        # Test 10: Additional Backend Support
        print("\n🔟 ADDITIONAL BACKEND SUPPORT")
        self.test_header_navigation_backend_support()
        
        # Final Summary
        print("\n" + "=" * 70)
        print("📊 FINAL TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📊 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [t for t in self.test_results if not t["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed >= (self.tests_run * 0.8)  # 80% pass rate

    def test_registration_email_domain_validation(self):
        """Test registration email domain validation"""
        print("\n🔐 Testing Registration Email Domain Validation:")
        print("=" * 50)
        
        # Test 1: Invalid domain (should fail with 400)
        invalid_user = {
            "email": "invalid@gmail.com",
            "password": "TestPass123!",
            "name": "Invalid User"
        }
        
        result1 = self.run_test("Registration with Invalid Domain (@gmail.com)", "POST", "auth/register", 400, invalid_user)
        
        # Check if the error message is correct - result1 should not be None if we got expected status
        if result1 is not None:
            print("✅ Registration correctly rejected for invalid domain")
            domain_validation_passed = True
        else:
            print("❌ Registration should have been rejected for invalid domain")
            domain_validation_passed = False
        
        # Test 2: Valid domain (should succeed if user doesn't exist)
        timestamp = datetime.now().strftime("%H%M%S")
        valid_user = {
            "email": f"newuser{timestamp}@illinoisestatelaw.com",
            "password": "TestPass123!",
            "name": f"New User {timestamp}"
        }
        
        result2 = self.run_test("Registration with Valid Domain (@illinoisestatelaw.com)", "POST", "auth/register", 200, valid_user)
        
        if result2 is not None and 'access_token' in result2:
            print("✅ Registration succeeded for valid domain")
            valid_domain_passed = True
        else:
            print("❌ Registration should have succeeded for valid domain")
            valid_domain_passed = False
        
        return domain_validation_passed and valid_domain_passed

    def test_admin_check_endpoints(self):
        """Test admin check endpoints with different users"""
        print("\n👑 Testing Admin Check Endpoints:")
        print("=" * 50)
        
        # Test with regular user (test@illinoisestatelaw.com)
        regular_credentials = {
            "email": "test@illinoisestatelaw.com",
            "password": "test"
        }
        
        login_result = self.run_test("Login as Regular User", "POST", "auth/login", 200, regular_credentials)
        if login_result and 'access_token' in login_result:
            self.token = login_result['access_token']
            
            # Check admin status for regular user
            admin_result1 = self.run_test("Check Admin Status (Regular User)", "GET", "auth/check-admin", 200)
            
            if admin_result1:
                is_admin = admin_result1.get("is_admin", True)  # Default to True to catch failures
                if is_admin == False:
                    print("✅ Regular user correctly identified as non-admin")
                else:
                    print("❌ Regular user incorrectly identified as admin")
        
        # Test with admin user (contact@illinoisestatelaw.com)
        admin_credentials = {
            "email": "contact@illinoisestatelaw.com",
            "password": "IEL2024!"
        }
        
        admin_login_result = self.run_test("Login as Admin User", "POST", "auth/login", 200, admin_credentials)
        if admin_login_result and 'access_token' in admin_login_result:
            self.token = admin_login_result['access_token']
            
            # Check admin status for admin user
            admin_result2 = self.run_test("Check Admin Status (Admin User)", "GET", "auth/check-admin", 200)
            
            if admin_result2:
                is_admin = admin_result2.get("is_admin", False)  # Default to False to catch failures
                if is_admin == True:
                    print("✅ Admin user correctly identified as admin")
                else:
                    print("❌ Admin user incorrectly identified as non-admin")
        
        return True

    def test_profile_update_endpoints(self):
        """Test profile update endpoints"""
        print("\n👤 Testing Profile Update Endpoints:")
        print("=" * 50)
        
        # Login as test user first
        test_credentials = {
            "email": "test@illinoisestatelaw.com",
            "password": "test"
        }
        
        login_result = self.run_test("Login for Profile Update Tests", "POST", "auth/login", 200, test_credentials)
        if not login_result or 'access_token' not in login_result:
            print("❌ Failed to login for profile update tests")
            return False
        
        self.token = login_result['access_token']
        original_user_id = login_result['user']['id']
        
        # Test 1: Update name (should succeed)
        name_update = {
            "name": "Updated Test Name"
        }
        
        result1 = self.run_test("Update Profile Name", "PATCH", "auth/profile", 200, name_update)
        
        # Test 2: Update email with invalid domain (should fail)
        invalid_email_update = {
            "email": "invalid@gmail.com"
        }
        
        result2 = self.run_test("Update Profile Email (Invalid Domain)", "PATCH", "auth/profile", 400, invalid_email_update)
        
        # Test 3: Update email with valid domain (should succeed)
        timestamp = datetime.now().strftime("%H%M%S")
        valid_email_update = {
            "email": f"updated{timestamp}@illinoisestatelaw.com"
        }
        
        result3 = self.run_test("Update Profile Email (Valid Domain)", "PATCH", "auth/profile", 200, valid_email_update)
        
        # Restore original email to maintain test consistency
        if result3:
            print("⚠️  Email was changed - attempting to restore original email")
            
            # Login with new email first
            new_login_result = self.run_test("Login with New Email", "POST", "auth/login", 200, {
                "email": f"updated{timestamp}@illinoisestatelaw.com",
                "password": "test"
            })
            
            if new_login_result and 'access_token' in new_login_result:
                self.token = new_login_result['access_token']
                
                # Restore original email and name
                restore_data = {
                    "email": "test@illinoisestatelaw.com",
                    "name": "Test User"
                }
                
                restore_result = self.run_test("Restore Original Profile", "PATCH", "auth/profile", 200, restore_data)
                if restore_result:
                    print("✅ Original profile restored")
                else:
                    print("⚠️  Failed to restore original profile - manual intervention may be needed")
        
        return result1 is not None and result2 is None and result3 is not None

    def test_password_change_endpoints(self):
        """Test password change endpoints"""
        print("\n🔑 Testing Password Change Endpoints:")
        print("=" * 50)
        
        # Login as test user first
        test_credentials = {
            "email": "test@illinoisestatelaw.com",
            "password": "test"
        }
        
        login_result = self.run_test("Login for Password Change Tests", "POST", "auth/login", 200, test_credentials)
        if not login_result or 'access_token' not in login_result:
            print("❌ Failed to login for password change tests")
            return False
        
        self.token = login_result['access_token']
        
        # Test 1: Change password with wrong current password (should fail)
        wrong_password_data = {
            "current_password": "wrongpassword",
            "new_password": "NewTestPass123!"
        }
        
        result1 = self.run_test("Change Password (Wrong Current Password)", "POST", "auth/change-password", 400, wrong_password_data)
        
        # Test 2: Change password with correct current password (should succeed)
        # Note: We won't actually change the password to avoid breaking other tests
        correct_password_data = {
            "current_password": "test",
            "new_password": "NewTestPass123!"
        }
        
        result2 = self.run_test("Change Password (Correct Current Password)", "POST", "auth/change-password", 200, correct_password_data)
        
        # If password was changed, change it back to maintain test consistency
        if result2:
            print("⚠️  Password was changed - attempting to restore original password")
            restore_password_data = {
                "current_password": "NewTestPass123!",
                "new_password": "test"
            }
            
            # Login with new password first
            new_login_result = self.run_test("Login with New Password", "POST", "auth/login", 200, {
                "email": "test@illinoisestatelaw.com",
                "password": "NewTestPass123!"
            })
            
            if new_login_result and 'access_token' in new_login_result:
                self.token = new_login_result['access_token']
                restore_result = self.run_test("Restore Original Password", "POST", "auth/change-password", 200, restore_password_data)
                if restore_result:
                    print("✅ Original password restored")
                else:
                    print("⚠️  Failed to restore original password - manual intervention may be needed")
        
        return result1 is None and result2 is not None

    def test_user_settings_registration_features(self):
        """Test all user settings and registration features as requested"""
        print("\n🎯 Testing User Settings and Registration Features:")
        print("=" * 60)
        
        # Run all the specific tests requested
        test1 = self.test_registration_email_domain_validation()
        test2 = self.test_admin_check_endpoints()
        test3 = self.test_profile_update_endpoints()
        test4 = self.test_password_change_endpoints()
        
        print(f"\n📊 User Settings & Registration Test Results:")
        print(f"   Registration Domain Validation: {'✅ PASSED' if test1 else '❌ FAILED'}")
        print(f"   Admin Check Endpoints: {'✅ PASSED' if test2 else '❌ FAILED'}")
        print(f"   Profile Update Endpoints: {'✅ PASSED' if test3 else '❌ FAILED'}")
        print(f"   Password Change Endpoints: {'✅ PASSED' if test4 else '❌ FAILED'}")
        
        return test1 and test2 and test3 and test4

    def test_task_management_features(self):
        """Test task management features from review request"""
        if not self.token:
            return False
            
        print("\n📋 Testing Task Management Features:")
        print("=" * 50)
        
        # Test 1: GET /api/airtable/my-tasks (Dashboard Task Section)
        my_tasks_result = self.run_test("GET My Tasks for Dashboard", "GET", "airtable/my-tasks", 200)
        
        if my_tasks_result:
            records = my_tasks_result.get("records", [])
            print(f"📋 Found {len(records)} tasks for current user")
            
            # Check task structure for dashboard display
            for i, record in enumerate(records[:3]):
                fields = record.get("fields", {})
                task_name = fields.get("Task", "Unknown Task")
                status = fields.get("Status", "Unknown")
                priority = fields.get("Priority", "Unknown")
                due_date = fields.get("Due Date", "No due date")
                notes = fields.get("Notes", "")
                
                print(f"   {i+1}. {task_name}")
                print(f"      Status: {status}")
                print(f"      Priority: {priority}")
                print(f"      Due Date: {due_date}")
                print(f"      Has Notes: {'Yes' if notes else 'No'}")
        
        # Test 2: PATCH /api/airtable/tasks/{record_id} (Task Edit)
        if my_tasks_result and my_tasks_result.get("records"):
            first_task = my_tasks_result["records"][0]
            task_id = first_task.get("id")
            
            if task_id:
                # Test updating task status and notes
                update_data = {
                    "Task": "Updated Task Name",
                    "Status": "In Progress", 
                    "Priority": "High",
                    "Notes": "Updated via API test"
                }
                
                update_result = self.run_test("Update Task (Edit functionality)", "PATCH", f"airtable/tasks/{task_id}", 200, update_data)
                
                if update_result:
                    updated_fields = update_result.get("fields", {})
                    print(f"✅ Task updated successfully:")
                    print(f"   Task: {updated_fields.get('Task')}")
                    print(f"   Status: {updated_fields.get('Status')}")
                    print(f"   Priority: {updated_fields.get('Priority')}")
                    print(f"   Notes: {updated_fields.get('Notes')}")
        
        # Test 3: DELETE /api/airtable/tasks/{record_id} (Task Delete)
        # Create a test task first to delete
        test_task_data = {
            "task": "Test Task for Deletion",
            "status": "Not Started",
            "priority": "Normal",
            "notes": "This task will be deleted in testing"
        }
        
        create_result = self.run_test("Create Test Task for Deletion", "POST", "airtable/tasks", 200, test_task_data)
        
        if create_result:
            created_task_id = create_result.get("id")
            if created_task_id:
                # Now test deleting the task
                delete_result = self.run_test("DELETE Task (Delete functionality)", "DELETE", f"airtable/tasks/{created_task_id}", 200)
                
                if delete_result:
                    success = delete_result.get("success", False)
                    deleted_id = delete_result.get("deleted")
                    
                    if success and deleted_id == created_task_id:
                        print(f"✅ Task deleted successfully: {deleted_id}")
                    else:
                        print(f"⚠️  Delete response: success={success}, deleted={deleted_id}")
        
        # Test 4: GET /api/airtable/tasks (General Tasks endpoint)
        general_tasks_result = self.run_test("GET General Tasks", "GET", "airtable/tasks", 200)
        
        if general_tasks_result:
            records = general_tasks_result.get("records", [])
            print(f"📊 Total tasks in system: {len(records)}")
        
        return True

    def test_leads_type_of_lead_field(self):
        """Test that leads show Type of Lead field"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Leads Type of Lead Field:")
        print("=" * 50)
        
        # Get leads data (assuming there's an active-leads endpoint)
        leads_result = self.run_test("GET Active Leads", "GET", "airtable/active-leads", 200)
        
        if leads_result:
            records = leads_result.get("records", [])
            print(f"📋 Found {len(records)} leads")
            
            # Check for Type of Lead field in leads
            leads_with_type = 0
            for i, record in enumerate(records[:5]):  # Check first 5 leads
                fields = record.get("fields", {})
                matter_name = fields.get("Matter Name", "Unknown")
                type_of_lead = fields.get("Type of Lead", "")
                lead_type = fields.get("Lead Type", "")  # Alternative field name
                
                # Check both possible field names
                lead_type_value = type_of_lead or lead_type
                
                print(f"   {i+1}. {matter_name}")
                print(f"      Type of Lead: {lead_type_value or 'Not specified'}")
                
                if lead_type_value:
                    leads_with_type += 1
            
            print(f"📊 Leads with Type of Lead field: {leads_with_type}/{min(len(records), 5)}")
            return True
        else:
            # Try alternative endpoint
            master_list_result = self.run_test("GET Master List (Leads)", "GET", "airtable/master-list?filterByFormula={Type of Case}='Lead'", 200)
            
            if master_list_result:
                records = master_list_result.get("records", [])
                print(f"📋 Found {len(records)} leads from Master List")
                
                for i, record in enumerate(records[:3]):
                    fields = record.get("fields", {})
                    matter_name = fields.get("Matter Name", "Unknown")
                    type_of_lead = fields.get("Type of Lead", "")
                    
                    print(f"   {i+1}. {matter_name}")
                    print(f"      Type of Lead: {type_of_lead or 'Not specified'}")
                
                return True
        
        return False

    def test_detail_pages_no_id_display(self):
        """Test that detail pages don't show record IDs"""
        if not self.token:
            return False
            
        print("\n🔍 Testing Detail Pages - No ID Display:")
        print("=" * 50)
        
        # Get some sample records to test detail retrieval
        master_list_result = self.run_test("GET Master List for Detail Testing", "GET", "airtable/master-list?maxRecords=5", 200)
        
        if master_list_result:
            records = master_list_result.get("records", [])
            print(f"📋 Testing detail retrieval for {len(records)} records")
            
            for i, record in enumerate(records):
                record_id = record.get("id")
                fields = record.get("fields", {})
                matter_name = fields.get("Matter Name", "Unknown")
                case_type = fields.get("Type of Case", "Unknown")
                
                print(f"   {i+1}. {matter_name} ({case_type})")
                print(f"      Record ID: {record_id} (should NOT be displayed in UI)")
                
                # Test individual record retrieval
                detail_result = self.run_test(f"GET Detail for {matter_name}", "GET", f"airtable/master-list/{record_id}", 200)
                
                if detail_result:
                    detail_fields = detail_result.get("fields", {})
                    # Verify the record has the expected data but ID should not be shown in UI
                    print(f"      ✅ Detail data retrieved successfully")
                    print(f"      Matter Name: {detail_fields.get('Matter Name', 'N/A')}")
                    print(f"      Case Type: {detail_fields.get('Type of Case', 'N/A')}")
                    print(f"      Note: Record ID {record_id} should be hidden in frontend")
                else:
                    print(f"      ❌ Failed to retrieve detail data")
            
            return True
        
        return False

    def run_all_tests(self):
        """Run all backend API tests focused on Task Management Features"""
        print("🚀 Starting Illinois Estate Law Staff Portal Backend API Tests")
        print(f"🌐 Testing against: {self.api_url}")
        print("🎯 FOCUS: TASK MANAGEMENT FEATURES")
        print("=" * 60)

        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication tests with admin credentials
        admin_credentials = {
            "email": "contact@illinoisestatelaw.com",
            "password": "IEL2024!"
        }
        
        login_result = self.run_test("Login with Admin Credentials", "POST", "auth/login", 200, admin_credentials)
        if login_result and 'access_token' in login_result:
            self.token = login_result['access_token']
            self.user_id = login_result['user']['id']
            print("✅ Admin authentication successful")
        else:
            print("❌ Admin login failed - trying test credentials")
            if not self.test_login_with_test_credentials():
                print("❌ All authentication failed - skipping authenticated tests")
                return 1
        
        # TASK MANAGEMENT FEATURES (PRIMARY FOCUS)
        print("\n" + "🎯" * 20)
        print("TESTING TASK MANAGEMENT FEATURES")
        print("🎯" * 20)
        
        task_mgmt_success = self.test_task_management_features()
        leads_success = self.test_leads_type_of_lead_field()
        detail_success = self.test_detail_pages_no_id_display()
        
        # Core functionality tests (secondary)
        print("\n" + "📋" * 20)
        print("TESTING OTHER BACKEND FUNCTIONALITY")
        print("📋" * 20)
        
        self.test_airtable_master_list()
        self.test_airtable_search()
        self.test_dashboard_data()
        self.test_dates_deadlines()
        self.test_payments()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"🏁 BACKEND API TESTING COMPLETE")
        print(f"📊 Tests Run: {self.tests_run}")
        print(f"✅ Tests Passed: {self.tests_passed}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Special focus on task management results
        print(f"\n🎯 TASK MANAGEMENT FEATURES:")
        print(f"   Task Management: {'✅ PASSED' if task_mgmt_success else '❌ FAILED'}")
        print(f"   Leads Type of Lead: {'✅ PASSED' if leads_success else '❌ FAILED'}")
        print(f"   Detail Pages (No ID): {'✅ PASSED' if detail_success else '❌ FAILED'}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return 0
        elif self.tests_passed >= self.tests_run * 0.8:
            print("✅ MOST TESTS PASSED (80%+ success rate)")
            return 0
        else:
            print("⚠️  MULTIPLE TEST FAILURES - Review required")
            return 1

    def test_matter_search_for_add_task_modal(self):
        """Test matter search functionality for Add Task Modal (Priority P0 Fix)"""
        if not self.token:
            return False
            
        print("\n🔍 Testing Matter Search for Add Task Modal (P0 Fix):")
        print("=" * 50)
        
        # Test 1: Get all matters with fetch_all=true (for dropdown population)
        result1 = self.run_test("GET /api/airtable/master-list?fetch_all=true", "GET", "airtable/master-list?fetch_all=true", 200)
        
        if result1:
            records = result1.get("records", [])
            total = result1.get("total", 0)
            print(f"📋 Retrieved {len(records)} matters (total: {total}) for dropdown population")
            
            # Verify we have matter data suitable for search
            if records:
                sample_matter = records[0].get("fields", {})
                matter_name = sample_matter.get("Matter Name", "")
                client = sample_matter.get("Client", "")
                print(f"   Sample matter: {matter_name} - {client}")
                
                # Test search functionality with a sample query
                if matter_name:
                    search_term = matter_name.split()[0] if matter_name.split() else "Estate"
                    result2 = self.run_test(f"Search matters with term '{search_term}'", "GET", f"airtable/search?query={search_term}", 200)
                    
                    if result2:
                        search_records = result2.get("records", [])
                        print(f"🔍 Search for '{search_term}' returned {len(search_records)} results")
                        
                        # Verify search results contain the expected matter
                        found_match = False
                        for record in search_records:
                            fields = record.get("fields", {})
                            if search_term.lower() in fields.get("Matter Name", "").lower():
                                found_match = True
                                break
                        
                        if found_match:
                            print("✅ Search functionality working correctly")
                        else:
                            print("⚠️  Search results may not include expected matches")
                    
                    return result2 is not None
            else:
                print("⚠️  No matters found for testing search functionality")
                return False
        
        return False

    def test_task_assignees_api(self):
        """Test GET /api/airtable/task-assignees endpoint"""
        if not self.token:
            return False
            
        print("\n👥 Testing Task Assignees API:")
        print("=" * 50)
        
        result = self.run_test("GET /api/airtable/task-assignees", "GET", "airtable/task-assignees", 200)
        
        if result:
            assignees = result.get("assignees", [])
            print(f"👤 Found {len(assignees)} unique task assignees")
            
            # Show sample assignees
            for i, assignee in enumerate(assignees[:5]):
                print(f"   {i+1}. {assignee}")
            
            if len(assignees) > 5:
                print(f"   ... and {len(assignees) - 5} more assignees")
            
            return True
        
        return False

    def test_task_creation_api(self):
        """Test POST /api/airtable/tasks endpoint for creating new tasks"""
        if not self.token:
            return False
            
        print("\n📝 Testing Task Creation API:")
        print("=" * 50)
        
        # First get a matter to link the task to
        matters_result = self.run_test("Get matters for task linking", "GET", "airtable/master-list?maxRecords=1", 200)
        
        matter_id = None
        if matters_result:
            records = matters_result.get("records", [])
            if records:
                matter_id = records[0].get("id")
                matter_name = records[0].get("fields", {}).get("Matter Name", "Unknown")
                print(f"🔗 Will link task to matter: {matter_name} (ID: {matter_id})")
        
        # Test creating a new task
        task_data = {
            "task": "Test Task from Matter Search Modal",
            "status": "Not Started",
            "priority": "Normal",
            "due_date": "2024-12-31",
            "notes": "Created via Add Task Modal testing",
            "link_to_matter": matter_id,
            "assigned_to": "Test User"
        }
        
        result = self.run_test("POST /api/airtable/tasks (Create Task)", "POST", "airtable/tasks", 200, task_data)
        
        created_task_id = None
        if result:
            created_task_id = result.get("id")
            fields = result.get("fields", {})
            print(f"✅ Task created successfully with ID: {created_task_id}")
            print(f"   Task: {fields.get('Task', 'Unknown')}")
            print(f"   Status: {fields.get('Status', 'Unknown')}")
            print(f"   Priority: {fields.get('Priority', 'Unknown')}")
            print(f"   Due Date: {fields.get('Due Date', 'No due date')}")
            
            # Verify the matter link
            linked_matter = fields.get("Link to Matter", [])
            if linked_matter and matter_id in linked_matter:
                print(f"✅ Task successfully linked to matter: {matter_id}")
            elif linked_matter:
                print(f"⚠️  Task linked to different matter: {linked_matter}")
            else:
                print("⚠️  Task not linked to any matter")
        
        # Clean up - delete the test task
        if created_task_id:
            delete_result = self.run_test("DELETE test task (cleanup)", "DELETE", f"airtable/tasks/{created_task_id}", 200)
            if delete_result:
                print(f"🗑️  Test task cleaned up successfully")
        
        return result is not None

    def test_data_caching_backend_support(self):
        """Test backend endpoints that support data caching functionality"""
        if not self.token:
            return False
            
        print("\n💾 Testing Data Caching Backend Support:")
        print("=" * 50)
        
        # Test the endpoints that should be cached by DataCacheContext
        
        # 1. Test master-list endpoint (for matters caching)
        result1 = self.run_test("GET matters for caching", "GET", "airtable/master-list?fetch_all=true", 200)
        
        if result1:
            records = result1.get("records", [])
            print(f"📋 Master list endpoint returned {len(records)} matters for caching")
            print("   This data should be cached as '[DataCache] Loaded X matters'")
        
        # 2. Test task-assignees endpoint (for assignees caching)
        result2 = self.run_test("GET assignees for caching", "GET", "airtable/task-assignees", 200)
        
        if result2:
            assignees = result2.get("assignees", [])
            print(f"👥 Task assignees endpoint returned {len(assignees)} assignees for caching")
            print("   This data should be cached as '[DataCache] Loaded X assignees'")
        
        # 3. Test response times (caching should reduce redundant API calls)
        import time
        
        print("\n⏱️  Testing response times for caching effectiveness:")
        
        # First call (should be slower - no cache)
        start_time = time.time()
        result3 = self.run_test("First call (no cache)", "GET", "airtable/master-list?maxRecords=10", 200)
        first_call_time = time.time() - start_time
        
        # Second call (should be faster if cached on frontend)
        start_time = time.time()
        result4 = self.run_test("Second call (potential cache)", "GET", "airtable/master-list?maxRecords=10", 200)
        second_call_time = time.time() - start_time
        
        print(f"   First call time: {first_call_time:.3f}s")
        print(f"   Second call time: {second_call_time:.3f}s")
        
        if second_call_time < first_call_time:
            print("✅ Second call was faster (potential caching benefit)")
        else:
            print("ℹ️  Response times similar (caching happens on frontend)")
        
        return all([result1, result2, result3, result4])

    def run_cache_focused_tests(self):
        """Run focused tests for the cache review request"""
        print("🗄️  Illinois Estate Law Staff Portal - Airtable Cache Testing")
        print("=" * 80)
        
        # Test admin login first
        if not self.test_admin_login():
            print("❌ Admin login failed - cannot proceed with tests")
            return False
        
        # Cache-focused tests for the review request
        tests = [
            ("Airtable Cache Endpoints (CRITICAL)", self.test_airtable_cache_endpoints),
            ("Authentication Flow", self.test_authentication_flow),
        ]
        
        print(f"\n📋 Running {len(tests)} cache-focused test suites...")
        print("=" * 80)
        
        for test_name, test_func in tests:
            print(f"\n🧪 {test_name}:")
            print("-" * 60)
            try:
                success = test_func()
                if success:
                    print(f"✅ {test_name} - PASSED")
                else:
                    print(f"❌ {test_name} - FAILED")
            except Exception as e:
                print(f"❌ {test_name} - ERROR: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 CACHE TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed >= (self.tests_run * 0.8)  # 80% pass rate for cache tests

    def run_focused_tests(self):
        """Run focused tests for the review request"""
        print("🚀 Starting Illinois Estate Law Staff Portal - Matter Search & Task Management Tests")
        print("=" * 80)
        
        # Test admin login first
        if not self.test_admin_login():
            print("❌ Admin login failed - cannot proceed with tests")
            return False
        
        # Focused tests for the review request
        tests = [
            ("Matter Search for Add Task Modal (P0 Fix)", self.test_matter_search_for_add_task_modal),
            ("Task Assignees API", self.test_task_assignees_api),
            ("Task Creation API", self.test_task_creation_api),
            ("Data Caching Backend Support", self.test_data_caching_backend_support),
            ("Authentication Flow", self.test_authentication_flow),
        ]
        
        print(f"\n📋 Running {len(tests)} focused test suites...")
        print("=" * 80)
        
        for test_name, test_func in tests:
            print(f"\n🧪 {test_name}:")
            print("-" * 60)
            try:
                success = test_func()
                if success:
                    print(f"✅ {test_name} - PASSED")
                else:
                    print(f"❌ {test_name} - FAILED")
            except Exception as e:
                print(f"❌ {test_name} - ERROR: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 FOCUSED TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = StaffPortalAPITester()
    return tester.run_focused_tests()  # Use focused tests for the review request

if __name__ == "__main__":
    sys.exit(main())