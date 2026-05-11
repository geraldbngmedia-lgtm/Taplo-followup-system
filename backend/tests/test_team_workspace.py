"""
Backend tests for A-hub Team / Workspace feature.
Covers: team_role/workspace_id on auth, team members/invitations CRUD,
public invite accept, candidate workspace scoping & permission checks,
extension push workspace scoping, follow-up generation across team.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://follow-up-pro-13.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_LEGACY_EMAIL = "gerald8221@icloud.com"
OWNER_LEGACY_PASSWORD = "Apple2014ID"


def _rand_email(prefix: str) -> str:
    return f"taplo-test-{prefix}-{uuid.uuid4().hex[:10]}@example.com"


class _NoCookieSession:
    """Wrapper that drops cookies after every request so cross-user tests
    don't leak auth cookies (backend prioritises cookie over Bearer header)."""
    def __init__(self):
        self._s = requests.Session()
        self._s.headers.update({"Content-Type": "application/json"})

    def _clear(self):
        self._s.cookies.clear()

    def get(self, *a, **kw):
        self._clear(); r = self._s.get(*a, **kw); self._clear(); return r
    def post(self, *a, **kw):
        self._clear(); r = self._s.post(*a, **kw); self._clear(); return r
    def patch(self, *a, **kw):
        self._clear(); r = self._s.patch(*a, **kw); self._clear(); return r
    def delete(self, *a, **kw):
        self._clear(); r = self._s.delete(*a, **kw); self._clear(); return r


@pytest.fixture(scope="session")
def session():
    return _NoCookieSession()


@pytest.fixture(scope="session")
def new_owner(session):
    """Register a fresh owner for isolated testing."""
    email = _rand_email("owner")
    r = session.post(f"{API}/auth/register", json={
        "name": "TEST Owner",
        "email": email,
        "password": "TestPass123!",
    })
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["team_role"] == "owner"
    assert data["workspace_id"] == data["id"]
    return {
        "email": email,
        "password": "TestPass123!",
        "id": data["id"],
        "workspace_id": data["workspace_id"],
        "access_token": data["access_token"],
        "name": "TEST Owner",
    }


@pytest.fixture(scope="session")
def owner_headers(new_owner):
    return {"Authorization": f"Bearer {new_owner['access_token']}", "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# Auth: team_role / workspace_id
# ---------------------------------------------------------------------------
class TestAuthTeamFields:
    def test_register_returns_team_fields(self, new_owner):
        assert new_owner["workspace_id"] == new_owner["id"]

    def test_login_returns_team_fields(self, session, new_owner):
        r = session.post(f"{API}/auth/login", json={"email": new_owner["email"], "password": new_owner["password"]})
        assert r.status_code == 200
        data = r.json()
        assert data["team_role"] == "owner"
        assert data["workspace_id"] == new_owner["id"]
        assert "access_token" in data and "refresh_token" in data

    def test_me_returns_team_fields(self, session, owner_headers, new_owner):
        r = session.get(f"{API}/auth/me", headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["team_role"] == "owner"
        assert data["workspace_id"] == new_owner["id"]

    def test_legacy_user_backfilled(self, session):
        r = session.post(f"{API}/auth/login", json={"email": OWNER_LEGACY_EMAIL, "password": OWNER_LEGACY_PASSWORD})
        if r.status_code != 200:
            pytest.skip(f"Legacy user not available: {r.status_code}")
        data = r.json()
        assert data.get("team_role") == "owner"
        assert data.get("workspace_id") == data["id"], "Legacy user workspace_id should equal own user_id"


# ---------------------------------------------------------------------------
# Team members / invitations
# ---------------------------------------------------------------------------
class TestTeamInvitations:
    def test_list_members_initial(self, session, owner_headers, new_owner):
        r = session.get(f"{API}/team/members", headers=owner_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["current_user_role"] == "owner"
        assert len(data["members"]) == 1
        me = data["members"][0]
        assert me["team_role"] == "owner"
        assert me["is_self"] is True

    def test_invite_teammate_and_duplicate(self, session, owner_headers):
        member_email = _rand_email("member")
        r = session.post(f"{API}/team/invite", headers=owner_headers, json={"email": member_email, "message": "join us"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == member_email
        assert data["status"] == "pending"
        assert "accept_url" in data and data["accept_url"].endswith(f"/invite/{data['accept_url'].split('/')[-1]}")
        assert "expires_at" in data
        # Stash for later tests
        pytest.invite_id = data["id"]
        pytest.invite_token = data["accept_url"].rsplit("/", 1)[-1]
        pytest.invite_email = member_email

        # Duplicate pending invite should be rejected
        r2 = session.post(f"{API}/team/invite", headers=owner_headers, json={"email": member_email})
        assert r2.status_code == 400, f"Expected 400 for duplicate invite, got {r2.status_code}: {r2.text}"

    def test_invite_existing_user_rejected(self, session, owner_headers, new_owner):
        # Inviting the owner's own email should fail (existing user)
        r = session.post(f"{API}/team/invite", headers=owner_headers, json={"email": new_owner["email"]})
        assert r.status_code == 400

    def test_list_invitations(self, session, owner_headers):
        r = session.get(f"{API}/team/invitations", headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        # Endpoint returns a bare list
        invites = data if isinstance(data, list) else data.get("invitations", [])
        ids = [i["id"] for i in invites]
        assert pytest.invite_id in ids

    def test_resend_invitation(self, session, owner_headers):
        r = session.post(f"{API}/team/invitations/{pytest.invite_id}/resend", headers=owner_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "resent" in data

    def test_public_get_invitation(self, session):
        r = session.get(f"{API}/invitations/{pytest.invite_token}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == pytest.invite_email
        assert "invited_by_name" in data
        assert "workspace_owner_name" in data

    def test_cancel_invitation_then_public_404(self, session, owner_headers):
        # Create a fresh invite to cancel
        email = _rand_email("cancel")
        r = session.post(f"{API}/team/invite", headers=owner_headers, json={"email": email})
        assert r.status_code == 200
        inv = r.json()
        token = inv["accept_url"].rsplit("/", 1)[-1]
        # Cancel
        r2 = session.delete(f"{API}/team/invitations/{inv['id']}", headers=owner_headers)
        assert r2.status_code in (200, 204)
        # Public fetch should now 404
        r3 = session.get(f"{API}/invitations/{token}")
        assert r3.status_code == 404, f"Expected 404 post-cancel, got {r3.status_code}"


# ---------------------------------------------------------------------------
# Accept invite (public) + member session
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def member_session(session, owner_headers, new_owner):
    """Invite, accept, and return member credentials for use in later tests."""
    email = _rand_email("member2")
    r = session.post(f"{API}/team/invite", headers=owner_headers, json={"email": email})
    assert r.status_code == 200, r.text
    token = r.json()["accept_url"].rsplit("/", 1)[-1]

    r2 = session.post(f"{API}/invitations/{token}/accept", json={"name": "TEST Member", "password": "MemberPass123!"})
    assert r2.status_code == 200, f"accept failed: {r2.status_code} {r2.text}"
    data = r2.json()
    assert data["team_role"] == "member"
    assert data["workspace_id"] == new_owner["workspace_id"]

    return {
        "email": email,
        "password": "MemberPass123!",
        "id": data["id"],
        "workspace_id": data["workspace_id"],
        "access_token": data["access_token"],
        "name": "TEST Member",
        "token": token,
    }


@pytest.fixture(scope="session")
def member_headers(member_session):
    return {"Authorization": f"Bearer {member_session['access_token']}", "Content-Type": "application/json"}


class TestInviteAccept:
    def test_accept_sets_member(self, member_session, new_owner):
        assert member_session["workspace_id"] == new_owner["workspace_id"]

    def test_get_invitation_after_accept_fails(self, session, member_session):
        r = session.get(f"{API}/invitations/{member_session['token']}")
        assert r.status_code in (400, 404), f"Expected error after accept, got {r.status_code}"

    def test_member_me_team_fields(self, session, member_headers, new_owner):
        r = session.get(f"{API}/auth/me", headers=member_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["team_role"] == "member"
        assert data["workspace_id"] == new_owner["workspace_id"]

    def test_members_list_shows_both(self, session, owner_headers, member_session):
        r = session.get(f"{API}/team/members", headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        emails = {m["email"] for m in data["members"]}
        assert member_session["email"] in emails
        assert len(data["members"]) >= 2

    def test_member_can_view_members(self, session, member_headers):
        r = session.get(f"{API}/team/members", headers=member_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["current_user_role"] == "member"


# ---------------------------------------------------------------------------
# Candidate workspace scoping & permissions
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def owner_candidate(session, owner_headers):
    payload = {
        "name": "TEST Owner Candidate",
        "email": f"owner-cand-{uuid.uuid4().hex[:6]}@example.com",
        "role": "Engineer",
        "group": "pipeline",
        "reason": "test",
        "gdpr_consent": True,
    }
    r = session.post(f"{API}/candidates", headers=owner_headers, json=payload)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session")
def member_candidate(session, member_headers):
    payload = {
        "name": "TEST Member Candidate",
        "email": f"member-cand-{uuid.uuid4().hex[:6]}@example.com",
        "role": "Designer",
        "group": "pipeline",
        "reason": "test",
        "gdpr_consent": True,
    }
    r = session.post(f"{API}/candidates", headers=member_headers, json=payload)
    assert r.status_code == 200, r.text
    return r.json()


class TestCandidateScoping:
    def test_member_sees_all_workspace_candidates(self, session, member_headers, owner_candidate, member_candidate):
        r = session.get(f"{API}/candidates", headers=member_headers)
        assert r.status_code == 200
        cands = r.json()
        ids = {c["id"] for c in cands}
        assert owner_candidate["id"] in ids, "Member should see owner's candidate"
        assert member_candidate["id"] in ids

        by_id = {c["id"]: c for c in cands}
        # is_mine flag
        assert "is_mine" in by_id[member_candidate["id"]]
        assert by_id[member_candidate["id"]]["is_mine"] is True
        assert by_id[owner_candidate["id"]]["is_mine"] is False
        # created_by_name field exists
        assert "created_by_name" in by_id[owner_candidate["id"]]

    def test_owner_sees_member_candidate(self, session, owner_headers, member_candidate):
        r = session.get(f"{API}/candidates", headers=owner_headers)
        assert r.status_code == 200
        ids = {c["id"] for c in r.json()}
        assert member_candidate["id"] in ids

    def test_member_cannot_edit_owner_candidate(self, session, member_headers, owner_candidate):
        r = session.patch(f"{API}/candidates/{owner_candidate['id']}", headers=member_headers, json={"notes": "hack"})
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "you added" in detail or "can only edit" in detail, f"Detail: {detail}"

    def test_member_cannot_delete_owner_candidate(self, session, member_headers, owner_candidate):
        r = session.delete(f"{API}/candidates/{owner_candidate['id']}", headers=member_headers)
        assert r.status_code == 403
        detail = r.json().get("detail", "").lower()
        assert "you added" in detail or "can only delete" in detail

    def test_member_can_edit_own_candidate(self, session, member_headers, member_candidate):
        r = session.patch(f"{API}/candidates/{member_candidate['id']}", headers=member_headers, json={"notes": "mine"})
        assert r.status_code == 200, r.text
        assert r.json().get("notes") == "mine"

    def test_generate_followup_on_teammate_candidate(self, session, member_headers, owner_candidate):
        r = session.post(
            f"{API}/candidates/{owner_candidate['id']}/generate-followup",
            headers=member_headers,
            json={"candidate_id": owner_candidate["id"], "custom_context": ""},
        )
        # The access should be granted (not 403/404). LLM may be slow/flaky — tolerate upstream errors.
        assert r.status_code not in (403, 404), f"Expected read access; got {r.status_code}: {r.text[:200]}"
        assert r.status_code in (200, 500, 502, 504), f"Got {r.status_code}: {r.text[:200]}"
        if r.status_code != 200:
            pytest.skip(f"LLM call failed upstream: {r.status_code}")


# ---------------------------------------------------------------------------
# Owner-only guards
# ---------------------------------------------------------------------------
class TestOwnerGuards:
    def test_member_cannot_invite(self, session, member_headers):
        r = session.post(f"{API}/team/invite", headers=member_headers, json={"email": _rand_email("rogue")})
        assert r.status_code == 403
        assert "owner" in r.json().get("detail", "").lower()

    def test_member_cannot_list_invitations(self, session, member_headers):
        r = session.get(f"{API}/team/invitations", headers=member_headers)
        assert r.status_code == 403

    def test_member_cannot_remove_owner(self, session, member_headers, new_owner):
        r = session.delete(f"{API}/team/members/{new_owner['id']}", headers=member_headers)
        assert r.status_code == 403

    def test_owner_cannot_remove_self(self, session, owner_headers, new_owner):
        r = session.delete(f"{API}/team/members/{new_owner['id']}", headers=owner_headers)
        assert r.status_code == 400, f"Expected 400 when owner removes self, got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# Extension push scoping (member pushes -> workspace candidate)
# ---------------------------------------------------------------------------
class TestExtensionPushScoping:
    def test_member_push_creates_workspace_candidate(self, session, member_headers, owner_headers, new_owner, member_session):
        # Get member's extension key
        r = session.get(f"{API}/extension/key", headers=member_headers)
        assert r.status_code == 200, r.text
        ext_key = r.json().get("ext_key") or r.json().get("key")
        assert ext_key

        push_payload = {
            "name": "TEST Extension Push",
            "email": f"ext-{uuid.uuid4().hex[:6]}@example.com",
            "role": "QA",
            "stage": "pipeline",
            "gdpr_consent": True,
        }
        r2 = session.post(
            f"{API}/extension/push-candidate",
            headers={"X-Extension-Key": ext_key, "Content-Type": "application/json"},
            json=push_payload,
        )
        assert r2.status_code == 200, r2.text
        cand = r2.json().get("candidate") or r2.json()
        cand_id = cand["id"]

        # Owner should see the pushed candidate
        r3 = session.get(f"{API}/candidates", headers=owner_headers)
        assert r3.status_code == 200
        by_id = {c["id"]: c for c in r3.json()}
        assert cand_id in by_id, "Owner cannot see member's extension-pushed candidate"
        pushed = by_id[cand_id]
        assert pushed.get("created_by_name") == member_session["name"]
        # Must be scoped to the owner's workspace
        # is_mine=False since owner didn't create it
        assert pushed.get("is_mine") is False


# ---------------------------------------------------------------------------
# Owner removes member
# ---------------------------------------------------------------------------
class TestRemoveMember:
    def test_owner_removes_member_and_candidates_remain(self, session, owner_headers, member_candidate):
        # Create a disposable member to remove
        tmp_email = _rand_email("kick")
        r = session.post(f"{API}/team/invite", headers=owner_headers, json={"email": tmp_email})
        assert r.status_code == 200
        token = r.json()["accept_url"].rsplit("/", 1)[-1]
        r2 = session.post(f"{API}/invitations/{token}/accept", json={"name": "TEST Kick", "password": "KickPass123!"})
        assert r2.status_code == 200
        kicked_id = r2.json()["id"]
        kicked_token = r2.json()["access_token"]

        # Kicked member creates a candidate
        kick_headers = {"Authorization": f"Bearer {kicked_token}", "Content-Type": "application/json"}
        r3 = session.post(f"{API}/candidates", headers=kick_headers, json={
            "name": "TEST Kick Candidate",
            "email": f"kick-cand-{uuid.uuid4().hex[:6]}@example.com",
            "role": "PM",
            "group": "pipeline",
            "reason": "test",
            "gdpr_consent": True,
        })
        assert r3.status_code == 200
        kicked_cand_id = r3.json()["id"]

        # Owner removes the member
        r4 = session.delete(f"{API}/team/members/{kicked_id}", headers=owner_headers)
        assert r4.status_code in (200, 204), f"Expected success, got {r4.status_code}: {r4.text}"

        # Removed user cannot log in
        r5 = session.post(f"{API}/auth/login", json={"email": tmp_email, "password": "KickPass123!"})
        assert r5.status_code in (401, 404)

        # Candidate still visible to the workspace
        r6 = session.get(f"{API}/candidates", headers=owner_headers)
        assert r6.status_code == 200
        ids = {c["id"] for c in r6.json()}
        assert kicked_cand_id in ids, "Removed member's candidate should still be visible to workspace"
