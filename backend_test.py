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