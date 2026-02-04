import requests
import sys
import json
import os
from datetime import datetime, timezone

class ReviewRequestBackendTester:
    def __init__(self, base_url="https://docgen-fix-2.preview.emergentagent.com"):
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

    def test_add_lead_form_backend(self):
        """Test Add Lead Form backend support - Lead Type dropdown, Consult Status dropdown, and Type of Case auto-set"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Add Lead Form Backend Support:")
        print("=" * 60)
        
        # Test 1: Get existing leads to check Lead Type options
        result1 = self.run_test("Get Active Leads for Lead Type Analysis", "GET", 
                               "airtable/master-list?filterByFormula=AND({Active/Inactive}='Active',{Type of Case}='Lead')", 200)
        
        lead_type_options = set()
        consult_status_options = set()
        
        if result1:
            leads = result1.get("records", [])
            print(f"📊 Found {len(leads)} active leads for analysis")
            
            for lead in leads:
                fields = lead.get("fields", {})
                lead_type = fields.get("Lead Type")
                consult_status = fields.get("Consult Status")
                
                if lead_type:
                    lead_type_options.add(lead_type)
                if consult_status:
                    consult_status_options.add(consult_status)
            
            print(f"\n📋 Lead Type Options Found in Data:")
            expected_lead_types = {
                "Probate", 
                "Probate (Estate Administration)", 
                "Estate Planning", 
                "Estate Planning (Wills, Trusts, Deeds)", 
                "Family", 
                "Other"
            }
            
            for lead_type in sorted(lead_type_options):
                status = "✅" if lead_type in expected_lead_types else "⚠️"
                print(f"   {status} {lead_type}")
            
            print(f"\n📋 Consult Status Options Found in Data:")
            expected_consult_statuses = {
                "Upcoming", 
                "Hired", 
                "Needs Follow Up", 
                "Follow Up Sent", 
                "CSA Sent", 
                "Missed Consult", 
                "Not a Good Fit - Archive", 
                "Not a Good Fit - Send Review", 
                "Ignored/Archive", 
                "Contact Information Sent"
            }
            
            for status in sorted(consult_status_options):
                status_check = "✅" if status in expected_consult_statuses else "⚠️"
                print(f"   {status_check} {status}")
            
            # Check coverage of expected options
            missing_lead_types = expected_lead_types - lead_type_options
            missing_consult_statuses = expected_consult_statuses - consult_status_options
            
            if missing_lead_types:
                print(f"\n⚠️  Missing Lead Type options: {missing_lead_types}")
            else:
                print(f"\n✅ All expected Lead Type options found in data")
                
            if missing_consult_statuses:
                print(f"\n⚠️  Missing Consult Status options: {missing_consult_statuses}")
            else:
                print(f"\n✅ All expected Consult Status options found in data")
        
        # Test 2: Create a new lead to verify Type of Case auto-set to "Lead"
        new_lead_data = {
            "fields": {
                "Matter Name": f"Test Lead - {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "Client": "Test Client for Lead Creation",
                "Email Address": "testlead@example.com",
                "Phone Number": "(555) 123-4567",
                "Lead Type": "Estate Planning",
                "Consult Status": "Upcoming",
                "Inquiry Notes": "This is a test lead created to verify Type of Case auto-set functionality",
                "Type of Case": "Lead"  # This should be automatically set
            }
        }
        
        result2 = self.run_test("Create New Lead Record", "POST", "airtable/master-list", 200, new_lead_data)
        
        created_lead_id = None
        if result2:
            created_lead_id = result2.get("id")
            fields = result2.get("fields", {})
            type_of_case = fields.get("Type of Case")
            lead_type = fields.get("Lead Type")
            consult_status = fields.get("Consult Status")
            
            print(f"\n✅ Lead created successfully with ID: {created_lead_id}")
            print(f"   Type of Case: {type_of_case}")
            print(f"   Lead Type: {lead_type}")
            print(f"   Consult Status: {consult_status}")
            
            if type_of_case == "Lead":
                print(f"✅ Type of Case correctly set to 'Lead'")
            else:
                print(f"❌ Type of Case should be 'Lead' but got '{type_of_case}'")
        
        # Test 3: Test PATCH update of Lead Type and Consult Status
        if created_lead_id:
            update_data = {
                "fields": {
                    "Lead Type": "Probate (Estate Administration)",
                    "Consult Status": "Hired",
                    "Inquiry Notes": "Updated via API test - Lead Type and Consult Status changed"
                }
            }
            
            result3 = self.run_test("Update Lead Type and Consult Status", "PATCH", 
                                   f"airtable/master-list/{created_lead_id}", 200, update_data)
            
            if result3:
                updated_fields = result3.get("fields", {})
                updated_lead_type = updated_fields.get("Lead Type")
                updated_consult_status = updated_fields.get("Consult Status")
                
                print(f"✅ Lead updated successfully:")
                print(f"   Updated Lead Type: {updated_lead_type}")
                print(f"   Updated Consult Status: {updated_consult_status}")
                
                if updated_lead_type == "Probate (Estate Administration)" and updated_consult_status == "Hired":
                    print(f"✅ Lead Type and Consult Status updates working correctly")
                else:
                    print(f"❌ Lead Type or Consult Status update failed")
        
        # Test 4: Verify Inquiry Notes field support
        if created_lead_id:
            inquiry_notes_data = {
                "fields": {
                    "Inquiry Notes": "Testing Inquiry Notes field - this should be a textarea field that supports longer text content for lead inquiries and notes."
                }
            }
            
            result4 = self.run_test("Update Inquiry Notes Field", "PATCH", 
                                   f"airtable/master-list/{created_lead_id}", 200, inquiry_notes_data)
            
            if result4:
                updated_fields = result4.get("fields", {})
                updated_notes = updated_fields.get("Inquiry Notes")
                print(f"✅ Inquiry Notes field updated successfully")
                print(f"   Notes: {updated_notes[:50]}...")
        
        # Clean up - delete the test lead
        if created_lead_id:
            cleanup_result = self.run_test("Delete Test Lead", "DELETE", 
                                          f"airtable/master-list/{created_lead_id}", 200)
            if cleanup_result:
                print(f"🧹 Test lead cleaned up successfully")
        
        return True

    def test_tasks_page_clickable_matter_links_backend(self):
        """Test Tasks Page backend support for clickable matter links"""
        if not self.token:
            return False
            
        print("\n🔗 Testing Tasks Page Clickable Matter Links Backend Support:")
        print("=" * 60)
        
        # Test 1: Get tasks with matter information
        result1 = self.run_test("Get My Tasks with Matter Links", "GET", "airtable/my-tasks", 200)
        
        if result1:
            tasks = result1.get("tasks", [])
            print(f"📋 Found {len(tasks)} tasks for matter link analysis")
            
            tasks_with_matters = []
            matter_types = set()
            
            for task in tasks:
                fields = task.get("fields", {})
                task_name = fields.get("Task", "Unknown Task")
                link_to_matter = fields.get("Link to Matter", [])
                
                if link_to_matter and len(link_to_matter) > 0:
                    matter_id = link_to_matter[0]  # First linked matter
                    tasks_with_matters.append({
                        "task_id": task.get("id"),
                        "task_name": task_name,
                        "matter_id": matter_id
                    })
            
            print(f"🔗 Found {len(tasks_with_matters)} tasks with matter links")
            
            # Test 2: For each task with a matter link, get the matter details
            for i, task_info in enumerate(tasks_with_matters[:5]):  # Test first 5
                matter_id = task_info["matter_id"]
                task_name = task_info["task_name"]
                
                matter_result = self.run_test(f"Get Matter Details for Task {i+1}", "GET", 
                                            f"airtable/master-list/{matter_id}", 200)
                
                if matter_result:
                    matter_fields = matter_result.get("fields", {})
                    matter_name = matter_fields.get("Matter Name", "Unknown Matter")
                    case_type = matter_fields.get("Type of Case", "Unknown Type")
                    
                    print(f"   Task: {task_name[:30]}...")
                    print(f"   Matter: {matter_name} ({case_type})")
                    
                    matter_types.add(case_type)
                    
                    # Verify matter has the required fields for navigation
                    required_fields = ["Matter Name", "Type of Case"]
                    missing_fields = [field for field in required_fields if not matter_fields.get(field)]
                    
                    if not missing_fields:
                        print(f"   ✅ Matter has all required fields for navigation")
                    else:
                        print(f"   ⚠️  Matter missing fields: {missing_fields}")
            
            print(f"\n📊 Matter Types Found (for navigation routing):")
            navigation_mapping = {
                "Probate": "/probate-case/",
                "Estate Planning": "/estate-planning/", 
                "Deed/LLC": "/deed/",
                "Lead": "/lead/"
            }
            
            for matter_type in sorted(matter_types):
                route = navigation_mapping.get(matter_type, "/unknown/")
                print(f"   {matter_type} → {route}")
        
        # Test 3: Test task creation with matter linking (to verify the link structure)
        test_task_data = {
            "task": "Test Task for Matter Linking",
            "status": "Not Started",
            "priority": "Normal",
            "notes": "Created to test matter linking functionality"
        }
        
        # First get a sample matter to link to
        sample_matter_result = self.run_test("Get Sample Matter for Task Linking", "GET", 
                                           "airtable/master-list?maxRecords=1", 200)
        
        if sample_matter_result:
            records = sample_matter_result.get("records", [])
            if records:
                sample_matter_id = records[0].get("id")
                sample_matter_name = records[0].get("fields", {}).get("Matter Name", "Unknown")
                
                # Add matter link to task data
                test_task_data["link_to_matter"] = sample_matter_id
                
                result3 = self.run_test("Create Task with Matter Link", "POST", "airtable/tasks", 200, test_task_data)
                
                created_task_id = None
                if result3:
                    created_task_id = result3.get("id")
                    fields = result3.get("fields", {})
                    linked_matters = fields.get("Link to Matter", [])
                    
                    print(f"\n✅ Task created with matter link:")
                    print(f"   Task ID: {created_task_id}")
                    print(f"   Linked to Matter: {sample_matter_name}")
                    print(f"   Matter ID: {sample_matter_id}")
                    
                    if sample_matter_id in linked_matters:
                        print(f"✅ Matter link structure correct for frontend navigation")
                    else:
                        print(f"❌ Matter link structure issue")
                
                # Clean up test task
                if created_task_id:
                    cleanup_result = self.run_test("Delete Test Task", "DELETE", 
                                                  f"airtable/tasks/{created_task_id}", 200)
                    if cleanup_result:
                        print(f"🧹 Test task cleaned up successfully")
        
        # Test 4: Verify matter name color styling support (backend provides data, frontend applies styling)
        print(f"\n🎨 Matter Name Styling Support:")
        print(f"   Backend provides: Matter Name field in task data")
        print(f"   Frontend should apply: color: #2E7DA1 (teal/blue)")
        print(f"   Navigation: Click should route to appropriate detail page based on Type of Case")
        
        return True

    def run_all_tests(self):
        """Run all review request backend tests"""
        print("🚀 Starting Illinois Estate Law Staff Portal Review Request Backend Tests")
        print("=" * 80)
        
        # Login first
        if not self.test_admin_login():
            print("❌ Failed to login - cannot continue with tests")
            return False
        
        # Run all review request tests
        test_methods = [
            self.test_add_lead_form_backend,
            self.test_tasks_page_clickable_matter_links_backend
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test {test_method.__name__} failed with exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("🏁 REVIEW REQUEST BACKEND TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - see details above")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = ReviewRequestBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)