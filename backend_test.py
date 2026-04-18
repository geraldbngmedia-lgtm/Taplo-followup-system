#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class TaploAPITester:
    def __init__(self, base_url="https://follow-up-pro-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.candidate_id = None
        self.extension_key = None
        self.extension_candidate_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_waitlist(self):
        """Test waitlist signup"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "Waitlist Signup",
            "POST",
            "waitlist",
            200,
            data={"email": test_email}
        )
        return success

    def test_register(self):
        """Test user registration"""
        test_email = f"testuser_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": "Test User",
                "email": test_email,
                "password": "TestPass123!"
            }
        )
        if success and 'id' in response:
            self.user_id = response['id']
        return success

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "admin@taplo.io",
                "password": "TaploAdmin2026!"
            }
        )
        if success and 'id' in response:
            self.user_id = response['id']
        return success

    def test_auth_me(self):
        """Test getting current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_candidate(self):
        """Test creating a candidate"""
        success, response = self.run_test(
            "Create Candidate",
            "POST",
            "candidates",
            200,
            data={
                "name": "Jane Doe",
                "email": "jane.doe@example.com",
                "role": "Senior Frontend Developer",
                "group": "silver_medallist",
                "reason": "Strong runner-up",
                "notes": "Great technical skills, would be perfect for future roles",
                "gdpr_consent": True
            }
        )
        if success and 'id' in response:
            self.candidate_id = response['id']
        return success

    def test_list_candidates(self):
        """Test listing candidates"""
        success, response = self.run_test(
            "List Candidates",
            "GET",
            "candidates",
            200
        )
        return success

    def test_get_candidate(self):
        """Test getting a specific candidate"""
        if not self.candidate_id:
            print("⚠️  Skipping get candidate test - no candidate ID available")
            return True
        
        success, response = self.run_test(
            "Get Candidate",
            "GET",
            f"candidates/{self.candidate_id}",
            200
        )
        return success

    def test_update_candidate(self):
        """Test updating a candidate"""
        if not self.candidate_id:
            print("⚠️  Skipping update candidate test - no candidate ID available")
            return True
            
        success, response = self.run_test(
            "Update Candidate",
            "PATCH",
            f"candidates/{self.candidate_id}",
            200,
            data={
                "notes": "Updated notes - still a great candidate"
            }
        )
        return success

    def test_generate_followup(self):
        """Test AI follow-up generation"""
        if not self.candidate_id:
            print("⚠️  Skipping follow-up generation test - no candidate ID available")
            return True
            
        success, response = self.run_test(
            "Generate AI Follow-up",
            "POST",
            f"candidates/{self.candidate_id}/generate-followup",
            200,
            data={
                "candidate_id": self.candidate_id,
                "custom_context": "We have a new senior role opening that might interest them"
            }
        )
        return success

    def test_digest(self):
        """Test daily digest"""
        success, response = self.run_test(
            "Daily Digest",
            "GET",
            "digest",
            200
        )
        return success

    def test_stats(self):
        """Test dashboard stats"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "stats",
            200
        )
        return success

    def test_delete_candidate(self):
        """Test deleting a candidate"""
        if not self.candidate_id:
            print("⚠️  Skipping delete candidate test - no candidate ID available")
            return True
            
        success, response = self.run_test(
            "Delete Candidate",
            "DELETE",
            f"candidates/{self.candidate_id}",
            200
        )
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    # ========================
    # Extension Integration Tests
    # ========================

    def test_extension_get_key(self):
        """Test getting extension API key"""
        success, response = self.run_test(
            "Extension Get Key",
            "GET",
            "extension/key",
            200
        )
        if success:
            # Should return ext_key and push_count
            expected_keys = ['ext_key', 'push_count']
            if all(key in response for key in expected_keys):
                if response['ext_key'].startswith('taplo_ext_'):
                    print("   ✅ Extension key generated correctly")
                    self.extension_key = response['ext_key']
                    return True
                else:
                    print(f"   ❌ Invalid extension key format: {response.get('ext_key')}")
                    return False
            else:
                print(f"   ❌ Missing expected keys in response")
                return False
        return success

    def test_extension_regenerate_key(self):
        """Test regenerating extension API key"""
        success, response = self.run_test(
            "Extension Regenerate Key",
            "POST",
            "extension/regenerate-key",
            200
        )
        if success:
            # Should return new ext_key
            if 'ext_key' in response and response['ext_key'].startswith('taplo_ext_'):
                print("   ✅ Extension key regenerated correctly")
                self.extension_key = response['ext_key']
                return True
            else:
                print(f"   ❌ Invalid regenerated key: {response.get('ext_key')}")
                return False
        return success

    def test_extension_push_candidate_no_key(self):
        """Test pushing candidate without extension key"""
        success, response = self.run_test(
            "Extension Push Candidate (No Key)",
            "POST",
            "extension/push-candidate",
            401,
            data={
                "name": "Test Candidate",
                "email": "test@example.com",
                "role": "Developer"
            }
        )
        if success:
            # Should return 401 with missing key error
            if 'detail' in response and 'Missing extension key' in response['detail']:
                print("   ✅ Correct error for missing key")
                return True
            else:
                print(f"   ❌ Unexpected error message: {response.get('detail')}")
                return False
        return success

    def test_extension_push_candidate_invalid_key(self):
        """Test pushing candidate with invalid extension key"""
        # Override headers for this test
        url = f"{self.base_url}/api/extension/push-candidate"
        headers = {
            'Content-Type': 'application/json',
            'X-Extension-Key': 'invalid_key_12345'
        }
        
        self.tests_run += 1
        print(f"\n🔍 Testing Extension Push Candidate (Invalid Key)...")
        print(f"   URL: POST {url}")
        
        try:
            response = self.session.post(url, json={
                "name": "Test Candidate",
                "email": "test@example.com",
                "role": "Developer"
            }, headers=headers)

            success = response.status_code == 401
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'detail' in response_data and 'Invalid extension key' in response_data['detail']:
                        print("   ✅ Correct error for invalid key")
                        return True
                    else:
                        print(f"   ❌ Unexpected error message: {response_data.get('detail')}")
                        return False
                except:
                    return True
            else:
                print(f"❌ Failed - Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_extension_push_candidate_valid_key(self):
        """Test pushing candidate with valid extension key"""
        if not hasattr(self, 'extension_key'):
            print("⚠️  Skipping push candidate test - no extension key available")
            return True
            
        # Override headers for this test
        url = f"{self.base_url}/api/extension/push-candidate"
        headers = {
            'Content-Type': 'application/json',
            'X-Extension-Key': self.extension_key
        }
        
        self.tests_run += 1
        print(f"\n🔍 Testing Extension Push Candidate (Valid Key)...")
        print(f"   URL: POST {url}")
        
        try:
            response = self.session.post(url, json={
                "name": "Alex Rivera",
                "email": "alex.rivera@example.com",
                "role": "Senior Frontend Developer",
                "phone": "+1234567890",
                "stage": "Rejected",
                "tags": ["senior", "frontend"],
                "notes": "Great candidate, would be perfect for future roles",
                "gdpr_consent": True,
                "tt_candidate_id": "12345",
                "tt_profile_url": "https://teamtailor.com/candidate/12345"
            }, headers=headers)

            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'status' in response_data and response_data['status'] == 'created':
                        print("   ✅ Candidate created successfully")
                        self.extension_candidate_id = response_data.get('candidate', {}).get('id')
                        return True
                    else:
                        print(f"   ❌ Unexpected response: {response_data}")
                        return False
                except:
                    return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_extension_push_candidate_duplicate(self):
        """Test pushing duplicate candidate (should update existing)"""
        if not hasattr(self, 'extension_key'):
            print("⚠️  Skipping duplicate push test - no extension key available")
            return True
            
        # Override headers for this test
        url = f"{self.base_url}/api/extension/push-candidate"
        headers = {
            'Content-Type': 'application/json',
            'X-Extension-Key': self.extension_key
        }
        
        self.tests_run += 1
        print(f"\n🔍 Testing Extension Push Candidate (Duplicate)...")
        print(f"   URL: POST {url}")
        
        try:
            response = self.session.post(url, json={
                "name": "Alex Rivera",
                "email": "alex.rivera@example.com",  # Same email as before
                "role": "Senior Backend Developer",  # Different role
                "stage": "Interview",
                "notes": "Updated notes from extension"
            }, headers=headers)

            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'status' in response_data and response_data['status'] == 'updated':
                        print("   ✅ Candidate updated successfully")
                        return True
                    else:
                        print(f"   ❌ Expected 'updated' status, got: {response_data.get('status')}")
                        return False
                except:
                    return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_extension_recent_pushes(self):
        """Test getting recent extension pushes"""
        success, response = self.run_test(
            "Extension Recent Pushes",
            "GET",
            "extension/recent-pushes",
            200
        )
        if success:
            # Should return array of candidates
            if isinstance(response, list):
                print(f"   ✅ Returned {len(response)} recent pushes")
                return True
            else:
                print(f"   ❌ Expected array, got: {type(response)}")
                return False
        return success

def main():
    print("🚀 Starting Taplo API Tests")
    print("=" * 50)
    
    tester = TaploAPITester()
    
    # Test sequence
    tests = [
        ("Waitlist", tester.test_waitlist),
        ("Register", tester.test_register),
        ("Login", tester.test_login),
        ("Auth Me", tester.test_auth_me),
        ("Create Candidate", tester.test_create_candidate),
        ("List Candidates", tester.test_list_candidates),
        ("Get Candidate", tester.test_get_candidate),
        ("Update Candidate", tester.test_update_candidate),
        ("Generate Follow-up", tester.test_generate_followup),
        ("Daily Digest", tester.test_digest),
        ("Dashboard Stats", tester.test_stats),
        ("Delete Candidate", tester.test_delete_candidate),
        # Extension Integration Tests
        ("Extension Get Key", tester.test_extension_get_key),
        ("Extension Regenerate Key", tester.test_extension_regenerate_key),
        ("Extension Push (No Key)", tester.test_extension_push_candidate_no_key),
        ("Extension Push (Invalid Key)", tester.test_extension_push_candidate_invalid_key),
        ("Extension Push (Valid Key)", tester.test_extension_push_candidate_valid_key),
        ("Extension Push (Duplicate)", tester.test_extension_push_candidate_duplicate),
        ("Extension Recent Pushes", tester.test_extension_recent_pushes),
        ("Logout", tester.test_logout),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())