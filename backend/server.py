from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage
import resend
import asyncio

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT config
JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Prefer Bearer token (explicit, used by SPA + extension); fall back to cookie
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        # Backfill team fields for legacy users (one-shot, on first call)
        if not user.get("workspace_id") or not user.get("team_role"):
            await db.users.update_one(
                {"_id": ObjectId(user["_id"])},
                {"$set": {"workspace_id": user["_id"], "team_role": "owner"}},
            )
            user["workspace_id"] = user["_id"]
            user["team_role"] = "owner"
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_workspace_user_ids(workspace_id: str) -> List[str]:
    """Return all user_ids belonging to the given workspace."""
    cursor = db.users.find({"workspace_id": workspace_id}, {"_id": 1})
    return [str(u["_id"]) async for u in cursor]


def require_owner(user: dict):
    if user.get("team_role") != "owner":
        raise HTTPException(status_code=403, detail="Only the workspace owner can perform this action")

# ========================
# Pydantic Models
# ========================

class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class WaitlistInput(BaseModel):
    email: str

class CandidateCreate(BaseModel):
    name: str
    email: str
    role: str
    group: str  # silver_medallist, not_ready_yet, pipeline, offer_declined
    reason: Optional[str] = ""
    notes: Optional[str] = ""
    gdpr_consent: bool = True
    last_contact_date: Optional[str] = None

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    group: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    gdpr_consent: Optional[bool] = None
    last_contact_date: Optional[str] = None
    last_followed_up: Optional[str] = None

class FollowUpRequest(BaseModel):
    candidate_id: str
    custom_context: Optional[str] = ""

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class DeleteAccount(BaseModel):
    password: str

class ExtensionPushCandidate(BaseModel):
    name: str
    email: str
    role: Optional[str] = ""
    phone: Optional[str] = ""
    stage: Optional[str] = ""
    tags: Optional[List[str]] = []
    notes: Optional[str] = ""
    gdpr_consent: bool = True
    tt_candidate_id: Optional[str] = None
    tt_profile_url: Optional[str] = None
    followup_date: Optional[str] = None

class TeamInviteInput(BaseModel):
    email: str
    message: Optional[str] = ""

class AcceptInviteInput(BaseModel):
    name: str
    password: str

# ========================
# Auth Endpoints
# ========================

@api_router.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(data.password)
    user_doc = {
        "name": data.name,
        "email": email,
        "password_hash": hashed,
        "role": "recruiter",
        "team_role": "owner",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    # New self-registered users own a brand-new workspace (workspace_id == their user_id)
    await db.users.update_one({"_id": result.inserted_id}, {"$set": {"workspace_id": user_id}})
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {"id": user_id, "name": data.name, "email": email, "role": "recruiter", "team_role": "owner", "workspace_id": user_id, "access_token": access_token, "refresh_token": refresh_token}

@api_router.post("/auth/login")
async def login(data: LoginInput, response: Response, request: Request):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    # Backfill team fields if missing (legacy users)
    workspace_id = user.get("workspace_id") or user_id
    team_role = user.get("team_role") or "owner"
    if not user.get("workspace_id") or not user.get("team_role"):
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"workspace_id": workspace_id, "team_role": team_role}})
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {"id": user_id, "name": user["name"], "email": email, "role": user.get("role", "recruiter"), "team_role": team_role, "workspace_id": workspace_id, "access_token": access_token, "refresh_token": refresh_token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ========================
# Profile Management
# ========================

@api_router.patch("/auth/profile")
async def update_profile(data: ProfileUpdate, request: Request):
    user = await get_current_user(request)
    update_fields = {}
    if data.name and data.name.strip():
        update_fields["name"] = data.name.strip()
    if data.email and data.email.strip():
        new_email = data.email.lower().strip()
        if new_email != user["email"]:
            existing = await db.users.find_one({"email": new_email})
            if existing:
                raise HTTPException(status_code=400, detail="Email already in use")
            update_fields["email"] = new_email
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_fields})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return updated

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange, request: Request):
    user = await get_current_user(request)
    user_doc = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(data.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}

@api_router.delete("/auth/delete-account")
async def delete_account(data: DeleteAccount, request: Request):
    user = await get_current_user(request)
    user_doc = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    # Delete all user data
    await db.candidates.delete_many({"created_by": user["_id"]})
    await db.extension_settings.delete_many({"user_id": user["_id"]})
    await db.users.delete_one({"_id": ObjectId(user["_id"])})
    return {"message": "Account deleted"}

# ========================
# Waitlist
# ========================

@api_router.post("/waitlist")
async def join_waitlist(data: WaitlistInput):
    email = data.email.lower().strip()
    existing = await db.waitlist.find_one({"email": email})
    if existing:
        return {"message": "You're already on the waitlist!"}
    await db.waitlist.insert_one({
        "email": email,
        "joined_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Welcome to the waitlist!"}

# ========================
# Candidates CRUD
# ========================

def calc_warmth(last_contact_str: Optional[str]) -> str:
    if not last_contact_str:
        return "cold"
    try:
        last = datetime.fromisoformat(last_contact_str.replace("Z", "+00:00"))
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        days = (datetime.now(timezone.utc) - last).days
        if days <= 3:
            return "hot"
        elif days <= 7:
            return "warm"
        elif days <= 14:
            return "cool"
        return "cold"
    except Exception:
        return "cold"

def calc_next_followup(group: str, last_contact_str: Optional[str]) -> str:
    intervals = {
        "silver_medallist": 7,
        "not_ready_yet": 14,
        "pipeline": 10,
        "offer_declined": 21,
    }
    days = intervals.get(group, 10)
    if last_contact_str:
        try:
            last = datetime.fromisoformat(last_contact_str.replace("Z", "+00:00"))
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            return (last + timedelta(days=days)).isoformat()
        except Exception:
            pass
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

def serialize_candidate(doc: dict, current_user_id: Optional[str] = None) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc["warmth"] = calc_warmth(doc.get("last_contact_date"))
    # Use custom follow-up date if set, otherwise calculate from group
    custom_fu = doc.get("custom_followup_date")
    if custom_fu:
        doc["next_followup"] = custom_fu
    else:
        doc["next_followup"] = calc_next_followup(doc.get("group", "pipeline"), doc.get("last_contact_date"))
    # Team-aware fields
    doc["created_by_name"] = doc.get("created_by_name", "")
    if current_user_id is not None:
        doc["is_mine"] = doc.get("created_by") == current_user_id
    return doc

@api_router.post("/candidates")
async def create_candidate(data: CandidateCreate, request: Request):
    user = await get_current_user(request)
    doc = {
        "name": data.name,
        "email": data.email.lower().strip(),
        "role": data.role,
        "group": data.group,
        "reason": data.reason or "",
        "notes": data.notes or "",
        "gdpr_consent": data.gdpr_consent,
        "last_contact_date": data.last_contact_date or datetime.now(timezone.utc).isoformat(),
        "last_followed_up": None,
        "created_by": user["_id"],
        "created_by_name": user.get("name", ""),
        "workspace_id": user["workspace_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.candidates.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_candidate(doc, current_user_id=user["_id"])

@api_router.get("/candidates")
async def list_candidates(request: Request, group: Optional[str] = None):
    user = await get_current_user(request)
    workspace_user_ids = await get_workspace_user_ids(user["workspace_id"])
    query = {
        "$or": [
            {"workspace_id": user["workspace_id"]},
            {"created_by": {"$in": workspace_user_ids}},
        ],
        "gdpr_consent": True,
    }
    if group:
        query["group"] = group
    docs = await db.candidates.find(query).sort("created_at", -1).to_list(500)
    return [serialize_candidate(d, current_user_id=user["_id"]) for d in docs]

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, request: Request):
    user = await get_current_user(request)
    workspace_user_ids = await get_workspace_user_ids(user["workspace_id"])
    doc = await db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "$or": [
            {"workspace_id": user["workspace_id"]},
            {"created_by": {"$in": workspace_user_ids}},
        ],
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return serialize_candidate(doc, current_user_id=user["_id"])

@api_router.patch("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, data: CandidateUpdate, request: Request):
    user = await get_current_user(request)
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    # Only the original creator can edit
    result = await db.candidates.find_one_and_update(
        {"_id": ObjectId(candidate_id), "created_by": user["_id"]},
        {"$set": update_fields},
        return_document=True
    )
    if not result:
        # Distinguish between "not in workspace" (404) and "not yours" (403)
        existing = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
        if existing and existing.get("workspace_id") == user["workspace_id"]:
            raise HTTPException(status_code=403, detail="You can only edit candidates you added")
        raise HTTPException(status_code=404, detail="Candidate not found")
    return serialize_candidate(result, current_user_id=user["_id"])

@api_router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, request: Request):
    user = await get_current_user(request)
    # Only the original creator can delete
    result = await db.candidates.delete_one({"_id": ObjectId(candidate_id), "created_by": user["_id"]})
    if result.deleted_count == 0:
        existing = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
        if existing and existing.get("workspace_id") == user["workspace_id"]:
            raise HTTPException(status_code=403, detail="You can only delete candidates you added")
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate removed"}

# ========================
# AI Follow-Up Generator
# ========================

@api_router.post("/candidates/{candidate_id}/generate-followup")
async def generate_followup(candidate_id: str, data: FollowUpRequest, request: Request):
    user = await get_current_user(request)
    workspace_user_ids = await get_workspace_user_ids(user["workspace_id"])
    candidate = await db.candidates.find_one({
        "_id": ObjectId(candidate_id),
        "$or": [
            {"workspace_id": user["workspace_id"]},
            {"created_by": {"$in": workspace_user_ids}},
        ],
    })
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    group_labels = {
        "silver_medallist": "Silver Medallist (strong runner-up candidate)",
        "not_ready_yet": "Not Ready Yet (promising but needs more time/experience)",
        "pipeline": "Pipeline (keeping warm for future roles)",
        "offer_declined": "Offer Declined (previously received an offer but didn't accept)"
    }
    group_label = group_labels.get(candidate["group"], candidate["group"])

    system_prompt = """You are A-hub, an AI recruitment assistant. Your job is to write warm, personalised follow-up emails from a recruiter to a candidate.

Rules:
- Keep it friendly, professional, and human
- Reference the candidate's name, role, and context
- Keep it concise (3-5 sentences for the body)
- Include a clear but soft call-to-action
- Do NOT be pushy or salesy
- Output ONLY the email subject line and body, formatted as:
Subject: [subject]

[body]"""

    user_prompt = f"""Write a follow-up email for:
- Candidate: {candidate['name']}
- Email: {candidate['email']}
- Role applied for: {candidate['role']}
- Category: {group_label}
- Recruiter notes: {candidate.get('notes', 'None')}
- Reason for nurturing: {candidate.get('reason', 'Keeping warm')}
- Last contact: {candidate.get('last_contact_date', 'Unknown')}
{f'- Additional context: {data.custom_context}' if data.custom_context else ''}

Write the email from the recruiter's perspective. Be warm and genuine."""

    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"followup-{candidate_id}-{uuid.uuid4().hex[:8]}",
            system_message=system_prompt
        )
        chat.with_model("openai", "gpt-5.2")
        message = UserMessage(text=user_prompt)
        response_text = await chat.send_message(message)

        # Parse subject and body
        subject = ""
        body = response_text
        if "Subject:" in response_text:
            for i, line in enumerate(response_text.split("\n")):
                if line.startswith("Subject:"):
                    subject = line.replace("Subject:", "").strip()
                    body = "\n".join(response_text.split("\n")[i+1:]).strip()
                    break

        # Update last_followed_up
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"last_followed_up": datetime.now(timezone.utc).isoformat(), "last_contact_date": datetime.now(timezone.utc).isoformat()}}
        )

        return {"subject": subject, "body": body, "candidate_email": candidate["email"]}
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate follow-up: {str(e)}")

# ========================
# Daily Digest
# ========================

@api_router.get("/digest")
async def daily_digest(request: Request):
    user = await get_current_user(request)
    candidates = await db.candidates.find({"created_by": user["_id"], "gdpr_consent": True}).to_list(500)

    now = datetime.now(timezone.utc)
    due_today = []
    going_cold = []
    stats = {"hot": 0, "warm": 0, "cool": 0, "cold": 0, "total": 0}

    for c in candidates:
        c_serialized = serialize_candidate(c)
        stats["total"] += 1
        warmth = c_serialized["warmth"]
        stats[warmth] = stats.get(warmth, 0) + 1

        # Check if follow-up due today or overdue
        next_fu = c_serialized.get("next_followup")
        if next_fu:
            try:
                fu_date = datetime.fromisoformat(next_fu.replace("Z", "+00:00"))
                if fu_date.tzinfo is None:
                    fu_date = fu_date.replace(tzinfo=timezone.utc)
                if fu_date.date() <= now.date():
                    due_today.append(c_serialized)
            except Exception:
                pass

        if warmth in ("cool", "cold"):
            going_cold.append(c_serialized)

    return {
        "date": now.date().isoformat(),
        "due_today": due_today,
        "going_cold": going_cold,
        "stats": stats
    }

# ========================
# Dashboard Stats
# ========================

@api_router.get("/stats")
async def dashboard_stats(request: Request):
    user = await get_current_user(request)
    candidates = await db.candidates.find({"created_by": user["_id"], "gdpr_consent": True}).to_list(500)
    groups = {"silver_medallist": 0, "not_ready_yet": 0, "pipeline": 0, "offer_declined": 0}
    warmth = {"hot": 0, "warm": 0, "cool": 0, "cold": 0}
    for c in candidates:
        g = c.get("group", "pipeline")
        groups[g] = groups.get(g, 0) + 1
        w = calc_warmth(c.get("last_contact_date"))
        warmth[w] = warmth.get(w, 0) + 1
    return {"total": len(candidates), "groups": groups, "warmth": warmth}

# ========================
# Chrome Extension Endpoints
# ========================

@api_router.get("/extension/key")
async def get_extension_key(request: Request):
    """Get or generate extension API key for the current user."""
    user = await get_current_user(request)
    setting = await db.extension_settings.find_one({"user_id": user["_id"]}, {"_id": 0})
    if not setting:
        ext_key = f"taplo_ext_{secrets.token_urlsafe(32)}"
        await db.extension_settings.insert_one({
            "user_id": user["_id"],
            "ext_key": ext_key,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "push_count": 0,
        })
        return {"ext_key": ext_key, "push_count": 0}
    return {"ext_key": setting["ext_key"], "push_count": setting.get("push_count", 0)}

@api_router.post("/extension/regenerate-key")
async def regenerate_extension_key(request: Request):
    """Regenerate extension API key."""
    user = await get_current_user(request)
    ext_key = f"taplo_ext_{secrets.token_urlsafe(32)}"
    await db.extension_settings.update_one(
        {"user_id": user["_id"]},
        {"$set": {"ext_key": ext_key, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ext_key": ext_key}

@api_router.post("/extension/push-candidate")
async def extension_push_candidate(data: ExtensionPushCandidate, request: Request):
    """Receive candidate data pushed from the Chrome extension.
    Authenticated via X-Extension-Key header."""
    ext_key = request.headers.get("X-Extension-Key", "")
    if not ext_key:
        raise HTTPException(status_code=401, detail="Missing extension key")

    setting = await db.extension_settings.find_one({"ext_key": ext_key})
    if not setting:
        raise HTTPException(status_code=401, detail="Invalid extension key")

    user_id = setting["user_id"]
    # Resolve workspace + creator name for proper team scoping
    creator = await db.users.find_one({"_id": ObjectId(user_id)}) if ObjectId.is_valid(user_id) else None
    workspace_id = (creator.get("workspace_id") if creator else None) or user_id
    creator_name = creator.get("name", "") if creator else ""
    email = data.email.lower().strip()

    # Check duplicate by email for this user — only when email is provided.
    # LinkedIn and some other sources don't expose email, so empty-email pushes
    # must always be inserted as new candidates (otherwise every email-less
    # push would collide with the first empty-email record).
    existing = None
    if email:
        existing = await db.candidates.find_one({"created_by": user_id, "email": email})
    if existing:
        # Update existing candidate with fresh data
        update_fields = {}
        if data.role:
            update_fields["role"] = data.role
        if data.stage and data.stage in {"silver_medallist", "not_ready_yet", "pipeline", "offer_declined"}:
            update_fields["group"] = data.stage
        if data.tt_profile_url:
            update_fields["tt_profile_url"] = data.tt_profile_url
        update_fields["last_contact_date"] = datetime.now(timezone.utc).isoformat()
        if update_fields:
            await db.candidates.update_one({"_id": existing["_id"]}, {"$set": update_fields})

        await db.extension_settings.update_one({"ext_key": ext_key}, {"$inc": {"push_count": 1}})
        existing = await db.candidates.find_one({"_id": existing["_id"]})
        return {"status": "updated", "candidate": serialize_candidate(existing, current_user_id=user_id)}

    # Create new candidate — use stage as group if it's a valid group name
    valid_groups = {"silver_medallist", "not_ready_yet", "pipeline", "offer_declined"}
    group = data.stage if data.stage in valid_groups else "pipeline"
    doc = {
        "name": data.name,
        "email": email,
        "role": data.role or "",
        "group": group,
        "reason": "",
        "notes": data.notes or "",
        "gdpr_consent": data.gdpr_consent,
        "last_contact_date": datetime.now(timezone.utc).isoformat(),
        "last_followed_up": None,
        "custom_followup_date": data.followup_date or None,
        "created_by": user_id,
        "created_by_name": creator_name,
        "workspace_id": workspace_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "extension",
        "tt_candidate_id": data.tt_candidate_id,
        "tt_profile_url": data.tt_profile_url,
        "phone": data.phone or "",
        "tags": data.tags or [],
    }
    result = await db.candidates.insert_one(doc)
    doc["_id"] = result.inserted_id

    await db.extension_settings.update_one({"ext_key": ext_key}, {"$inc": {"push_count": 1}})

    return {"status": "created", "candidate": serialize_candidate(doc, current_user_id=user_id)}

@api_router.get("/extension/recent-pushes")
async def extension_recent_pushes(request: Request):
    """List recently pushed candidates from extension."""
    user = await get_current_user(request)
    docs = await db.candidates.find(
        {"created_by": user["_id"], "source": "extension"},
        {"_id": 1, "name": 1, "email": 1, "role": 1, "group": 1, "created_at": 1, "warmth": 1}
    ).sort("created_at", -1).to_list(50)
    results = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        d["warmth"] = calc_warmth(d.get("last_contact_date"))
        results.append(d)
    return results

class ExtractPageRequest(BaseModel):
    page_text: str
    page_url: Optional[str] = ""

@api_router.post("/extension/extract")
async def extension_extract(data: ExtractPageRequest, request: Request):
    """Use AI to extract candidate info from page text. Auth via X-Extension-Key."""
    ext_key = request.headers.get("X-Extension-Key", "")
    if not ext_key:
        raise HTTPException(status_code=401, detail="Missing extension key")
    setting = await db.extension_settings.find_one({"ext_key": ext_key})
    if not setting:
        raise HTTPException(status_code=401, detail="Invalid extension key")

    # Truncate page text to avoid huge token usage
    page_text = data.page_text[:4000]

    prompt = f"""Extract the candidate's contact information from this page text. Return ONLY a JSON object with these fields:
- "name": the person's full name (first and last name)
- "email": their email address
- "phone": their phone number

If a field is not found, use an empty string. Do NOT include any explanation, just the JSON.

Page URL: {data.page_url}

Page text:
{page_text}"""

    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"extract-{uuid.uuid4().hex[:8]}",
            system_message="You extract structured data from text. Always respond with valid JSON only, no markdown, no explanation."
        )
        chat.with_model("openai", "gpt-5.2")
        message = UserMessage(text=prompt)
        response_text = await chat.send_message(message)

        # Parse the JSON response
        import json as json_module
        # Strip markdown code fences if present
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        result = json_module.loads(cleaned)
        return {
            "name": result.get("name", ""),
            "email": result.get("email", ""),
            "phone": result.get("phone", ""),
        }
    except Exception as e:
        logger.error(f"AI extraction error: {e}")
        return {"name": "", "email": "", "phone": "", "error": str(e)}

# ========================
# Team / Workspace Management
# ========================

INVITE_EXPIRY_DAYS = 7


def build_invite_email_html(workspace_owner_name: str, inviter_name: str, accept_url: str, message: str = "") -> str:
    custom_block = ""
    if message:
        safe_msg = message.replace("<", "&lt;").replace(">", "&gt;")
        custom_block = f"""
        <tr><td style="padding:0 24px 16px;">
            <div style="background:#12151C;border-left:3px solid #4E9BE8;border-radius:6px;padding:14px 16px;color:#A0AAB2;font-size:13px;line-height:1.6;font-style:italic;">{safe_msg}</div>
        </td></tr>"""
    return f"""
    <div style="background:#0A0C10;padding:0;margin:0;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#0A0C10;">
            <tr><td style="padding:32px 24px 24px;">
                {WORDMARK_HTML}
            </td></tr>
            <tr><td style="padding:0 24px 8px;">
                <h1 style="color:#F1F3F5;font-size:22px;font-weight:700;margin:0 0 8px;">You're invited to join {workspace_owner_name}'s team on A-hub</h1>
                <p style="color:#A0AAB2;font-size:14px;line-height:1.6;margin:0;">{inviter_name} invited you to collaborate on their candidate pipeline. Accept the invite to start adding and following up on candidates together.</p>
            </td></tr>
            {custom_block}
            <tr><td style="padding:8px 24px 24px;">
                <a href="{accept_url}" style="display:inline-block;background:#8B5CF6;color:#0A0C10;font-size:14px;font-weight:600;padding:13px 32px;border-radius:999px;text-decoration:none;">Accept invitation</a>
            </td></tr>
            <tr><td style="padding:0 24px 24px;">
                <p style="color:#6E7781;font-size:12px;margin:0;line-height:1.6;">Or paste this link into your browser:<br/><span style="color:#A0AAB2;word-break:break-all;">{accept_url}</span></p>
            </td></tr>
            <tr><td style="padding:16px 24px 32px;border-top:1px solid #1A1E27;">
                <p style="color:#6E7781;font-size:11px;margin:0;text-align:center;">This invitation expires in {INVITE_EXPIRY_DAYS} days.</p>
            </td></tr>
        </table>
    </div>"""


async def send_invite_email(to_email: str, workspace_owner_name: str, inviter_name: str, accept_url: str, message: str = "") -> bool:
    try:
        params = {
            "from": f"A-hub <{SENDER_EMAIL}>",
            "to": [to_email],
            "subject": f"{inviter_name} invited you to join their team on A-hub",
            "html": build_invite_email_html(workspace_owner_name, inviter_name, accept_url, message),
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Invite email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send invite email to {to_email}: {e}")
        return False


def _origin_from_request(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    if origin:
        # Strip any trailing path from referer
        try:
            from urllib.parse import urlparse
            p = urlparse(origin)
            if p.scheme and p.netloc:
                return f"{p.scheme}://{p.netloc}"
        except Exception:
            pass
        return origin.rstrip("/")
    env_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    if env_url:
        return env_url
    # Last resort: use the backend's own base URL — works because the SPA is served
    # from the same origin in this deployment.
    base = str(request.base_url).rstrip("/")
    return base


@api_router.get("/team/members")
async def list_team_members(request: Request):
    """List all members of the current user's workspace."""
    user = await get_current_user(request)
    members = await db.users.find({"workspace_id": user["workspace_id"]}, {"password_hash": 0}).to_list(200)
    out = []
    for m in members:
        out.append({
            "id": str(m["_id"]),
            "name": m.get("name", ""),
            "email": m.get("email", ""),
            "team_role": m.get("team_role", "member"),
            "created_at": m.get("created_at"),
            "is_self": str(m["_id"]) == user["_id"],
        })
    out.sort(key=lambda x: (0 if x["team_role"] == "owner" else 1, x["created_at"] or ""))
    return {"members": out, "current_user_role": user.get("team_role", "member")}


@api_router.post("/team/invite")
async def invite_teammate(data: TeamInviteInput, request: Request):
    """Owner-only: send an email invitation to a new teammate."""
    user = await get_current_user(request)
    require_owner(user)
    email = data.email.lower().strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")

    # Reject if user already exists in any workspace
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        if existing_user.get("workspace_id") == user["workspace_id"]:
            raise HTTPException(status_code=400, detail="That person is already on your team")
        raise HTTPException(status_code=400, detail="That email is already registered with another account")

    # Reject if a pending invite already exists for this workspace + email
    pending = await db.invitations.find_one({"workspace_id": user["workspace_id"], "email": email, "status": "pending"})
    if pending:
        raise HTTPException(status_code=400, detail="An invitation is already pending for that email")

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    invite_doc = {
        "workspace_id": user["workspace_id"],
        "email": email,
        "token": token,
        "message": (data.message or "").strip()[:500],
        "invited_by_id": user["_id"],
        "invited_by_name": user.get("name", ""),
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat(),
    }
    result = await db.invitations.insert_one(invite_doc)
    invite_doc["_id"] = result.inserted_id

    accept_url = f"{_origin_from_request(request)}/invite/{token}"
    await send_invite_email(
        to_email=email,
        workspace_owner_name=user.get("name", "your teammate"),
        inviter_name=user.get("name", ""),
        accept_url=accept_url,
        message=invite_doc["message"],
    )

    return {
        "id": str(invite_doc["_id"]),
        "email": email,
        "status": "pending",
        "expires_at": invite_doc["expires_at"],
        "accept_url": accept_url,
    }


@api_router.get("/team/invitations")
async def list_invitations(request: Request):
    """List pending invitations for the current workspace (owner only)."""
    user = await get_current_user(request)
    require_owner(user)
    invites = await db.invitations.find({"workspace_id": user["workspace_id"], "status": "pending"}).sort("created_at", -1).to_list(200)
    out = []
    for inv in invites:
        out.append({
            "id": str(inv["_id"]),
            "email": inv.get("email", ""),
            "status": inv.get("status", "pending"),
            "created_at": inv.get("created_at"),
            "expires_at": inv.get("expires_at"),
            "invited_by_name": inv.get("invited_by_name", ""),
        })
    return out


@api_router.post("/team/invitations/{invite_id}/resend")
async def resend_invitation(invite_id: str, request: Request):
    user = await get_current_user(request)
    require_owner(user)
    inv = await db.invitations.find_one({"_id": ObjectId(invite_id), "workspace_id": user["workspace_id"]})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending invites can be resent")
    accept_url = f"{_origin_from_request(request)}/invite/{inv['token']}"
    ok = await send_invite_email(
        to_email=inv["email"],
        workspace_owner_name=user.get("name", "your teammate"),
        inviter_name=user.get("name", ""),
        accept_url=accept_url,
        message=inv.get("message", ""),
    )
    return {"resent": ok}


@api_router.delete("/team/invitations/{invite_id}")
async def cancel_invitation(invite_id: str, request: Request):
    user = await get_current_user(request)
    require_owner(user)
    result = await db.invitations.delete_one({"_id": ObjectId(invite_id), "workspace_id": user["workspace_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return {"message": "Invitation cancelled"}


@api_router.delete("/team/members/{user_id}")
async def remove_member(user_id: str, request: Request):
    """Owner-only: remove a member from the workspace. Their candidates remain readable by the team."""
    user = await get_current_user(request)
    require_owner(user)
    if user_id == user["_id"]:
        raise HTTPException(status_code=400, detail="You can't remove yourself. Transfer ownership first or delete your account.")
    target = await db.users.find_one({"_id": ObjectId(user_id), "workspace_id": user["workspace_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Member not found in your workspace")
    if target.get("team_role") == "owner":
        raise HTTPException(status_code=400, detail="The workspace owner cannot be removed")
    # Delete the user account; their candidates remain in the workspace (visible & read-only).
    await db.users.delete_one({"_id": ObjectId(user_id)})
    await db.extension_settings.delete_many({"user_id": user_id})
    return {"message": "Member removed"}


@api_router.get("/invitations/{token}")
async def get_invitation_public(token: str):
    """Public endpoint — fetch invitation details for the accept page."""
    inv = await db.invitations.find_one({"token": token})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    if inv.get("status") != "pending":
        raise HTTPException(status_code=400, detail="This invitation has already been accepted or cancelled")
    # Check expiry
    try:
        expires = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00"))
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="This invitation has expired")
    except HTTPException:
        raise
    except Exception:
        pass
    # Look up workspace owner name
    owner = await db.users.find_one({"workspace_id": inv["workspace_id"], "team_role": "owner"})
    return {
        "email": inv.get("email", ""),
        "invited_by_name": inv.get("invited_by_name", ""),
        "workspace_owner_name": owner.get("name", "") if owner else inv.get("invited_by_name", ""),
        "message": inv.get("message", ""),
    }


@api_router.post("/invitations/{token}/accept")
async def accept_invitation_public(token: str, data: AcceptInviteInput, response: Response):
    """Public endpoint — accept an invitation by setting name + password.
    Creates a new member user inside the inviter's workspace."""
    inv = await db.invitations.find_one({"token": token})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    if inv.get("status") != "pending":
        raise HTTPException(status_code=400, detail="This invitation has already been accepted or cancelled")
    try:
        expires = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00"))
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="This invitation has expired")
    except HTTPException:
        raise
    except Exception:
        pass
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    email = inv["email"]
    # Belt-and-suspenders: ensure user doesn't already exist
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in instead.")
    user_doc = {
        "name": data.name.strip(),
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "recruiter",
        "team_role": "member",
        "workspace_id": inv["workspace_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    # Mark the invitation as accepted
    await db.invitations.update_one(
        {"_id": inv["_id"]},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat(), "accepted_user_id": user_id}},
    )
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    return {
        "id": user_id,
        "name": data.name.strip(),
        "email": email,
        "role": "recruiter",
        "team_role": "member",
        "workspace_id": inv["workspace_id"],
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


# ========================
# Daily Digest Email
# ========================

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@taplo.app")
# Email-safe text wordmark used in place of a hosted logo image.
WORDMARK_HTML = "<span style=\"font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;color:#F1F3F5;letter-spacing:-0.02em;\">A-hub<span style=\"display:inline-block;width:6px;height:6px;border-radius:50%;background:#8B5CF6;margin-left:3px;vertical-align:6px;\"></span></span>"

def build_digest_html(user_name, due_candidates):
    due_rows = ""
    for c in due_candidates[:15]:
        warmth_color = {"hot": "#8B5CF6", "warm": "#F1C40F", "cool": "#4E9BE8", "cold": "#6E7781"}.get(c.get("warmth", "cold"), "#6E7781")
        role_text = c.get('role', '') or 'No role specified'
        due_rows += f"""
        <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #1A1E27;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{warmth_color};margin-right:10px;vertical-align:middle;"></span>
                <strong style="color:#F1F3F5;font-size:14px;">{c['name']}</strong>
                <br><span style="color:#6E7781;font-size:12px;">{role_text}</span>
            </td>
            <td style="padding:12px 16px;border-bottom:1px solid #1A1E27;color:#A0AAB2;font-size:13px;text-align:right;">{c.get('email','')}</td>
        </tr>"""

    count = len(due_candidates)

    empty_state = """
        <tr><td colspan="2" style="padding:24px 16px;text-align:center;">
            <p style="color:#6E7781;font-size:14px;margin:0;">No candidates due for follow-up today.</p>
            <p style="color:#6E7781;font-size:12px;margin:4px 0 0;">Your pipeline is looking warm!</p>
        </td></tr>"""

    return f"""
    <div style="background:#0A0C10;padding:0;margin:0;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#0A0C10;">
            <tr><td style="padding:32px 24px 24px;">
                {WORDMARK_HTML}
            </td></tr>
            <tr><td style="padding:0 24px 24px;">
                <h1 style="color:#F1F3F5;font-size:22px;font-weight:700;margin:0 0 6px;">Good morning, {user_name}</h1>
                <p style="color:#6E7781;font-size:14px;margin:0;">{count} candidate{'s' if count != 1 else ''} due for follow-up today</p>
            </td></tr>
            <tr><td style="padding:0 24px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#12151C;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="padding:14px 16px;border-bottom:1px solid #1A1E27;">
                            <span style="color:#8B5CF6;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Due for Follow-Up</span>
                        </td>
                        <td style="padding:14px 16px;border-bottom:1px solid #1A1E27;text-align:right;">
                            <span style="color:#8B5CF6;font-size:12px;font-weight:600;">{count}</span>
                        </td>
                    </tr>
                    {due_rows if due_rows else empty_state}
                </table>
            </td></tr>
            <tr><td style="padding:0 24px 32px;text-align:center;">
                <a href="https://taplo.app/dashboard" style="display:inline-block;background:#8B5CF6;color:#0A0C10;font-size:14px;font-weight:600;padding:12px 32px;border-radius:999px;text-decoration:none;">Open Dashboard</a>
            </td></tr>
            <tr><td style="padding:16px 24px 32px;border-top:1px solid #1A1E27;">
                <p style="color:#6E7781;font-size:11px;margin:0;text-align:center;">A-hub — Never lose a great candidate again</p>
            </td></tr>
        </table>
    </div>"""


async def send_digest_to_user(user_doc):
    """Build and send digest email for a single user."""
    user_id = str(user_doc["_id"])
    candidates = await db.candidates.find({"created_by": user_id, "gdpr_consent": True}).to_list(500)

    if not candidates:
        return False

    now = datetime.now(timezone.utc)
    due = []

    for c in candidates:
        c_ser = serialize_candidate({**c})

        next_fu = c_ser.get("next_followup")
        if next_fu:
            try:
                fu_date = datetime.fromisoformat(next_fu.replace("Z", "+00:00"))
                if fu_date.tzinfo is None:
                    fu_date = fu_date.replace(tzinfo=timezone.utc)
                if fu_date.date() <= now.date():
                    due.append(c_ser)
            except Exception:
                pass

    html = build_digest_html(user_doc.get("name", "there"), due)
    count = len(due)
    subject = f"A-hub: {count} candidate{'s' if count != 1 else ''} due for follow-up" if count > 0 else "A-hub: Your pipeline is warm — no follow-ups due"

    try:
        params = {
            "from": f"A-hub <{SENDER_EMAIL}>",
            "to": [user_doc["email"]],
            "subject": subject,
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Digest sent to {user_doc['email']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send digest to {user_doc['email']}: {e}")
        return False


async def send_all_digests():
    """Send digest emails to all users."""
    users = await db.users.find({}).to_list(1000)
    sent = 0
    failed = 0
    for user in users:
        try:
            result = await send_digest_to_user(user)
            if result:
                sent += 1
        except Exception as e:
            logger.error(f"Digest error for {user.get('email')}: {e}")
            failed += 1
    logger.info(f"Daily digest complete: {sent} sent, {failed} failed")
    # Record last digest run
    await db.digest_log.insert_one({
        "run_at": datetime.now(timezone.utc).isoformat(),
        "sent": sent,
        "failed": failed,
    })
    return {"sent": sent, "failed": failed}


async def digest_scheduler():
    """Background task that checks every hour if digest should be sent."""
    while True:
        try:
            now = datetime.now(timezone.utc)
            # Send at 7 AM UTC (8 AM CET)
            if now.hour == 7:
                last_run = await db.digest_log.find_one(sort=[("run_at", -1)])
                should_run = True
                if last_run:
                    try:
                        last = datetime.fromisoformat(last_run["run_at"].replace("Z", "+00:00"))
                        if last.tzinfo is None:
                            last = last.replace(tzinfo=timezone.utc)
                        if (now - last).total_seconds() < 3600 * 20:
                            should_run = False
                    except Exception:
                        pass
                if should_run:
                    logger.info("Running daily digest...")
                    await send_all_digests()
        except Exception as e:
            logger.error(f"Digest scheduler error: {e}")
        await asyncio.sleep(3600)  # Check every hour


@api_router.post("/digest/send-now")
async def trigger_digest(request: Request):
    """Manually trigger digest for the current user (for testing)."""
    user = await get_current_user(request)
    user_doc = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    result = await send_digest_to_user(user_doc)
    if result:
        return {"message": f"Digest sent to {user_doc['email']}"}
    return {"message": "No candidates to include in digest"}


@api_router.post("/digest/send-all")
async def trigger_all_digests(request: Request):
    """Admin: manually trigger digest for all users."""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await send_all_digests()
    return {"message": "Digests sent", "results": result}

# ========================
# Root
# ========================

@api_router.get("/")
async def root():
    return {"message": "A-hub API is running"}

# ========================
# App Setup
# ========================

app.include_router(api_router)

# CORS: allow all origins for extension + custom domain support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.waitlist.create_index("email", unique=True)
    await db.invitations.create_index("token", unique=True)
    await db.invitations.create_index([("workspace_id", 1), ("status", 1)])
    # Backfill team fields for legacy users (workspace_id == own _id, team_role == "owner")
    legacy_users = db.users.find({"$or": [{"workspace_id": {"$exists": False}}, {"team_role": {"$exists": False}}]})
    async for u in legacy_users:
        uid = str(u["_id"])
        await db.users.update_one(
            {"_id": u["_id"]},
            {"$set": {
                "workspace_id": u.get("workspace_id") or uid,
                "team_role": u.get("team_role") or "owner",
            }},
        )
    # Backfill candidates with workspace_id (looked up from creator's workspace)
    legacy_candidates = db.candidates.find({"workspace_id": {"$exists": False}})
    async for c in legacy_candidates:
        creator_id = c.get("created_by")
        ws = creator_id  # default: workspace_id == creator user_id
        try:
            if creator_id and ObjectId.is_valid(creator_id):
                creator = await db.users.find_one({"_id": ObjectId(creator_id)})
                if creator:
                    ws = creator.get("workspace_id") or creator_id
        except Exception:
            pass
        await db.candidates.update_one({"_id": c["_id"]}, {"$set": {"workspace_id": ws}})
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@taplo.io")
    admin_password = os.environ.get("ADMIN_PASSWORD", "A-hubAdmin2026!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        admin_doc = {
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "team_role": "owner",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.users.insert_one(admin_doc)
        await db.users.update_one({"_id": result.inserted_id}, {"$set": {"workspace_id": str(result.inserted_id)}})
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")
    # Start digest scheduler
    asyncio.create_task(digest_scheduler())
    logger.info("Digest scheduler started (sends at 7 AM UTC daily)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
