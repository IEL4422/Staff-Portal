#!/usr/bin/env python3
"""
Illinois Estate Law Staff Portal - Review Request Backend Testing
Testing backend APIs that support the specific UI features mentioned in the review request.
"""

import requests
import sys
import json
import os
from datetime import datetime, timezone

class ReviewRequestBackendTester:
    def __init__(self, base_url="https://probate-dashboard.preview.emergentagent.com"):
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

    def test_add_asset_debt_status_dropdown_backend(self):
        """Test backend support for Add Asset/Debt Status Dropdown - 9 Options"""
        if not self.token:
            return False
            
        print("\n🏠 Testing Add Asset/Debt Status Dropdown Backend Support:")
        print("=" * 60)
        
        # Test creating assets/debts with all 9 status options
        status_options = [
            "Found",
            "Reported by Client", 
            "Transferred to Estate Bank Account",
            "Claim Paid",
            "Contesting Claim",
            "Abandoned",
            "To Be Sold",
            "Sold",
            "Not Found"
        ]
        
        all_passed = True
        created_records = []
        
        for i, status in enumerate(status_options):
            print(f"\n📋 Testing status option {i+1}/9: '{status}'")
            
            # Create asset with this status
            asset_data = {
                "name": f"Test Asset - {status}",
                "asset_or_debt": "Asset",
                "type_of_asset": "Bank Account",
                "value": 1000 + (i * 100),
                "status": status,
                "notes": f"Testing status dropdown option: {status}"
            }
            
            result = self.run_test(
                f"Create Asset with Status '{status}'",
                "POST",
                "airtable/assets-debts",
                200,
                asset_data
            )
            
            if result:
                record_id = result.get("id")
                if record_id:
                    created_records.append(record_id)
                    print(f"   ✅ Asset created successfully with status '{status}' (ID: {record_id})")
                else:
                    print(f"   ⚠️  Asset created but no ID returned for status '{status}'")
            else:
                print(f"   ❌ Failed to create asset with status '{status}'")
                all_passed = False
        
        # Test retrieving assets to verify status values are preserved
        if created_records:
            print(f"\n🔍 Verifying {len(created_records)} created assets...")
            
            # Get all assets/debts
            result = self.run_test("Get All Assets/Debts", "GET", "airtable/assets-debts", 200)
            
            if result:
                records = result.get("records", [])
                print(f"📊 Found {len(records)} total assets/debts in system")
                
                # Verify our test records have correct status values
                verified_statuses = set()
                for record in records:
                    if record.get("id") in created_records:
                        fields = record.get("fields", {})
                        asset_name = fields.get("Name of Asset", "")
                        status = fields.get("Status", "")
                        
                        if "Test Asset -" in asset_name and status in status_options:
                            verified_statuses.add(status)
                            print(f"   ✅ Verified: {asset_name} has status '{status}'")
                
                print(f"\n📈 Status Verification Summary:")
                print(f"   Created: {len(status_options)} assets with different statuses")
                print(f"   Verified: {len(verified_statuses)} statuses preserved correctly")
                
                if len(verified_statuses) == len(status_options):
                    print("   ✅ All 9 status options working perfectly!")
                else:
                    missing_statuses = set(status_options) - verified_statuses
                    print(f"   ⚠️  Missing verification for: {missing_statuses}")
        
        return all_passed

    def test_task_upload_file_backend(self):
        """Test backend support for Task Upload File field"""
        if not self.token:
            return False
            
        print("\n📎 Testing Task Upload File Backend Support:")
        print("=" * 50)
        
        # Test creating task with file upload
        task_with_file_data = {
            "task": "Test Task with File Upload",
            "status": "Not Started",
            "priority": "Normal",
            "due_date": "2024-12-31",
            "notes": "Testing file upload functionality",
            "file_url": "https://example.com/test-document.pdf"
        }
        
        result1 = self.run_test(
            "Create Task with File Upload",
            "POST",
            "airtable/tasks",
            200,
            task_with_file_data
        )
        
        created_task_id = None
        if result1:
            created_task_id = result1.get("id")
            print(f"✅ Task with file upload created successfully (ID: {created_task_id})")
            
            # Verify the file URL was saved
            fields = result1.get("fields", {})
            upload_file = fields.get("Upload File")
            if upload_file:
                print(f"   📎 File attachment saved: {upload_file}")
            else:
                print(f"   ⚠️  File attachment not found in response")
        
        # Test creating task without file (should still work)
        task_without_file_data = {
            "task": "Test Task without File",
            "status": "Not Started",
            "priority": "Normal",  # Changed from "High" to "Normal"
            "notes": "Testing task creation without file upload"
        }
        
        result2 = self.run_test(
            "Create Task without File Upload",
            "POST",
            "airtable/tasks",
            200,
            task_without_file_data
        )
        
        created_task_id_2 = None
        if result2:
            created_task_id_2 = result2.get("id")
            print(f"✅ Task without file created successfully (ID: {created_task_id_2})")
        
        # Clean up test tasks
        cleanup_success = True
        for task_id in [created_task_id, created_task_id_2]:
            if task_id:
                cleanup_result = self.run_test(
                    f"Cleanup Test Task {task_id}",
                    "DELETE",
                    f"airtable/tasks/{task_id}",
                    200
                )
                if cleanup_result:
                    print(f"🧹 Cleaned up test task {task_id}")
                else:
                    cleanup_success = False
                    print(f"⚠️  Failed to cleanup test task {task_id}")
        
        return result1 is not None and result2 is not None

    def test_lead_type_dropdown_backend(self):
        """Test backend support for Lead Type Dropdown - Correct Options"""
        if not self.token:
            return False
            
        print("\n🎯 Testing Lead Type Dropdown Backend Support:")
        print("=" * 50)
        
        # Expected lead type options from review request
        expected_lead_types = [
            "Probate",
            "Probate (Estate Administration)",
            "Estate Planning", 
            "Estate Planning (Wills, Trusts, Deeds)",
            "Family",
            "Other"
        ]
        
        # Get active leads to check Lead Type field values
        result = self.run_test(
            "Get Active Leads for Type Analysis",
            "GET",
            "airtable/master-list?filterByFormula=AND({Active/Inactive}='Active',{Type of Case}='Lead')",
            200
        )
        
        if result:
            leads = result.get("records", [])
            print(f"📊 Found {len(leads)} active leads for analysis")
            
            # Analyze Lead Type field values
            type_counts = {}
            leads_with_type = 0
            
            for lead in leads:
                fields = lead.get("fields", {})
                lead_type = fields.get("Lead Type", "")
                matter_name = fields.get("Matter Name", "Unknown")
                
                if lead_type:
                    leads_with_type += 1
                    type_counts[lead_type] = type_counts.get(lead_type, 0) + 1
            
            print(f"📈 Lead Type Analysis:")
            print(f"   Total leads: {len(leads)}")
            print(f"   Leads with Lead Type: {leads_with_type}")
            print(f"   Unique lead types found: {len(type_counts)}")
            
            print(f"\n📋 Lead Type Distribution:")
            for lead_type, count in sorted(type_counts.items()):
                is_expected = "✅" if lead_type in expected_lead_types else "⚠️ "
                print(f"   {is_expected} {lead_type}: {count} leads")
            
            # Check if all expected types are available (at least in the data)
            found_expected_types = set(type_counts.keys()) & set(expected_lead_types)
            print(f"\n🎯 Expected Types Found: {len(found_expected_types)}/{len(expected_lead_types)}")
            
            for expected_type in expected_lead_types:
                if expected_type in type_counts:
                    print(f"   ✅ '{expected_type}' - {type_counts[expected_type]} leads")
                else:
                    print(f"   ⚠️  '{expected_type}' - not found in current data")
            
            # Test updating a lead's Lead Type field
            if leads:
                test_lead = leads[0]
                test_lead_id = test_lead.get("id")
                original_type = test_lead.get("fields", {}).get("Lead Type", "")
                
                print(f"\n🧪 Testing Lead Type Update:")
                print(f"   Test Lead ID: {test_lead_id}")
                print(f"   Original Type: {original_type}")
                
                # Try updating to each expected type
                test_type = "Estate Planning (Wills, Trusts, Deeds)"
                update_data = {
                    "fields": {
                        "Lead Type": test_type
                    }
                }
                
                update_result = self.run_test(
                    f"Update Lead Type to '{test_type}'",
                    "PATCH",
                    f"airtable/master-list/{test_lead_id}",
                    200,
                    update_data
                )
                
                if update_result:
                    updated_fields = update_result.get("fields", {})
                    updated_type = updated_fields.get("Lead Type", "")
                    
                    if updated_type == test_type:
                        print(f"   ✅ Successfully updated Lead Type to '{updated_type}'")
                        
                        # Restore original type
                        if original_type:
                            restore_data = {
                                "fields": {
                                    "Lead Type": original_type
                                }
                            }
                            restore_result = self.run_test(
                                f"Restore Original Lead Type",
                                "PATCH",
                                f"airtable/master-list/{test_lead_id}",
                                200,
                                restore_data
                            )
                            if restore_result:
                                print(f"   🔄 Restored original Lead Type: '{original_type}'")
                    else:
                        print(f"   ⚠️  Type update mismatch - Expected: {test_type}, Got: {updated_type}")
                else:
                    print(f"   ❌ Failed to update Lead Type")
            
            return True
        
        return False

    def run_all_tests(self):
        """Run all review request backend tests"""
        print("🚀 Starting Illinois Estate Law Staff Portal Review Request Backend Testing")
        print("=" * 80)
        
        # Login first
        if not self.test_admin_login():
            print("❌ Failed to login - cannot proceed with tests")
            return False
        
        print(f"\n🧪 Running Backend Tests for Review Request Features...")
        
        # Run all specific tests for review request features
        test_methods = [
            self.test_add_asset_debt_status_dropdown_backend,
            self.test_task_upload_file_backend,
            self.test_lead_type_dropdown_backend
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test {test_method.__name__} failed with exception: {str(e)}")
        
        # Print summary
        print(f"\n📊 REVIEW REQUEST BACKEND TESTING SUMMARY:")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL BACKEND TESTS PASSED!")
            print("✅ Backend APIs are ready to support the UI features in the review request")
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} tests failed - see details above")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = ReviewRequestBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)