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
from teamtailor_service import TeamtailorClient, full_sync, map_tt_candidate_to_taplo

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
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
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
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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

class TeamtailorConnectInput(BaseModel):
    api_key: str

class TeamtailorImportInput(BaseModel):
    candidate_tt_ids: List[str]
    group: str
    reason: Optional[str] = ""

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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "name": data.name, "email": email, "role": "recruiter"}

@api_router.post("/auth/login")
async def login(data: LoginInput, response: Response, request: Request):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "name": user["name"], "email": email, "role": user.get("role", "recruiter")}

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
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

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

def serialize_candidate(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc["warmth"] = calc_warmth(doc.get("last_contact_date"))
    doc["next_followup"] = calc_next_followup(doc.get("group", "pipeline"), doc.get("last_contact_date"))
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.candidates.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_candidate(doc)

@api_router.get("/candidates")
async def list_candidates(request: Request, group: Optional[str] = None):
    user = await get_current_user(request)
    query = {"created_by": user["_id"], "gdpr_consent": True}
    if group:
        query["group"] = group
    docs = await db.candidates.find(query).sort("created_at", -1).to_list(500)
    return [serialize_candidate(d) for d in docs]

@api_router.get("/candidates/{candidate_id}")
async def get_candidate(candidate_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.candidates.find_one({"_id": ObjectId(candidate_id), "created_by": user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return serialize_candidate(doc)

@api_router.patch("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, data: CandidateUpdate, request: Request):
    user = await get_current_user(request)
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.candidates.find_one_and_update(
        {"_id": ObjectId(candidate_id), "created_by": user["_id"]},
        {"$set": update_fields},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return serialize_candidate(result)

@api_router.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.candidates.delete_one({"_id": ObjectId(candidate_id), "created_by": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate removed"}

# ========================
# AI Follow-Up Generator
# ========================

@api_router.post("/candidates/{candidate_id}/generate-followup")
async def generate_followup(candidate_id: str, data: FollowUpRequest, request: Request):
    user = await get_current_user(request)
    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id), "created_by": user["_id"]})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    group_labels = {
        "silver_medallist": "Silver Medallist (strong runner-up candidate)",
        "not_ready_yet": "Not Ready Yet (promising but needs more time/experience)",
        "pipeline": "Pipeline (keeping warm for future roles)",
        "offer_declined": "Offer Declined (previously received an offer but didn't accept)"
    }
    group_label = group_labels.get(candidate["group"], candidate["group"])

    system_prompt = f"""You are Taplo, an AI recruitment assistant. Your job is to write warm, personalised follow-up emails from a recruiter to a candidate.

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
            parts = response_text.split("\n", 1)
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
# Teamtailor Integration
# ========================

@api_router.post("/teamtailor/connect")
async def tt_connect(data: TeamtailorConnectInput, request: Request):
    """Save Teamtailor API key and test connection."""
    user = await get_current_user(request)
    tt = TeamtailorClient(data.api_key)
    result = await tt.test_connection()
    if not result.get("connected"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to connect"))
    await db.tt_settings.update_one(
        {"user_id": user["_id"]},
        {"$set": {
            "user_id": user["_id"],
            "api_key": data.api_key,
            "company_name": result.get("company_name"),
            "company_id": result.get("company_id"),
            "connected": True,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"connected": True, "company_name": result.get("company_name")}

@api_router.get("/teamtailor/status")
async def tt_status(request: Request):
    """Check Teamtailor connection status."""
    user = await get_current_user(request)
    settings = await db.tt_settings.find_one({"user_id": user["_id"]}, {"_id": 0, "api_key": 0})
    if not settings:
        return {"connected": False, "has_key": False}
    return {
        "connected": settings.get("connected", False),
        "has_key": True,
        "company_name": settings.get("company_name"),
        "last_sync": settings.get("last_sync"),
        "last_sync_results": settings.get("last_sync_results"),
    }

@api_router.delete("/teamtailor/disconnect")
async def tt_disconnect(request: Request):
    """Remove Teamtailor connection."""
    user = await get_current_user(request)
    await db.tt_settings.delete_one({"user_id": user["_id"]})
    # Clean up synced data
    for col in ["tt_jobs", "tt_stages", "tt_candidates", "tt_applications", "tt_custom_fields"]:
        await db[col].delete_many({"synced_by": user["_id"]})
    return {"message": "Teamtailor disconnected"}

@api_router.post("/teamtailor/sync")
async def tt_sync(request: Request):
    """Trigger a full sync from Teamtailor."""
    user = await get_current_user(request)
    settings = await db.tt_settings.find_one({"user_id": user["_id"]})
    if not settings or not settings.get("api_key"):
        raise HTTPException(status_code=400, detail="Teamtailor not connected. Please add your API key first.")
    results = await full_sync(db, user["_id"], settings["api_key"])
    return {"message": "Sync complete", "results": results}

@api_router.get("/teamtailor/jobs")
async def tt_jobs(request: Request):
    """List synced Teamtailor jobs."""
    user = await get_current_user(request)
    jobs = await db.tt_jobs.find({"synced_by": user["_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return jobs

@api_router.get("/teamtailor/candidates")
async def tt_candidates_list(request: Request):
    """List synced Teamtailor candidates (not yet imported into Taplo)."""
    user = await get_current_user(request)
    # Get already-imported TT IDs
    imported = await db.candidates.find(
        {"created_by": user["_id"], "tt_id": {"$exists": True}},
        {"tt_id": 1, "_id": 0}
    ).to_list(5000)
    imported_ids = {c["tt_id"] for c in imported}

    tt_cands = await db.tt_candidates.find({"synced_by": user["_id"]}, {"_id": 0}).to_list(500)

    # Enrich with latest application info
    for c in tt_cands:
        c["already_imported"] = c.get("tt_id") in imported_ids
        # Find applications for this candidate
        apps = await db.tt_applications.find(
            {"synced_by": user["_id"], "candidate_tt_id": c.get("tt_id")},
            {"_id": 0}
        ).to_list(50)
        if apps:
            sorted_apps = sorted(apps, key=lambda a: a.get("updated_at", ""), reverse=True)
            latest = sorted_apps[0]
            job = await db.tt_jobs.find_one({"synced_by": user["_id"], "tt_id": latest.get("job_tt_id")}, {"_id": 0})
            c["latest_role"] = job.get("title", "Unknown") if job else "Unknown"
            c["latest_stage"] = latest.get("stage_name", "")
            c["application_count"] = len(apps)
        else:
            c["latest_role"] = "No applications"
            c["latest_stage"] = ""
            c["application_count"] = 0
        # GDPR
        c["has_consent"] = bool(c.get("consent_future_jobs_at")) and not c.get("unsubscribed", False)
        c["full_name"] = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
    return tt_cands

@api_router.post("/teamtailor/import")
async def tt_import(data: TeamtailorImportInput, request: Request):
    """Import selected Teamtailor candidates into Taplo pipeline."""
    user = await get_current_user(request)
    if not data.candidate_tt_ids:
        raise HTTPException(status_code=400, detail="No candidates selected")

    # Build jobs lookup
    jobs_raw = await db.tt_jobs.find({"synced_by": user["_id"]}, {"_id": 0}).to_list(500)
    tt_jobs_map = {j["tt_id"]: j for j in jobs_raw}

    imported = []
    skipped = []
    for tt_id in data.candidate_tt_ids:
        # Check if already imported
        existing = await db.candidates.find_one({"created_by": user["_id"], "tt_id": tt_id})
        if existing:
            skipped.append(tt_id)
            continue

        tt_cand = await db.tt_candidates.find_one({"synced_by": user["_id"], "tt_id": tt_id}, {"_id": 0})
        if not tt_cand:
            skipped.append(tt_id)
            continue

        # Get applications for this candidate
        apps = await db.tt_applications.find(
            {"synced_by": user["_id"], "candidate_tt_id": tt_id}, {"_id": 0}
        ).to_list(50)

        doc = map_tt_candidate_to_taplo(tt_cand, apps, tt_jobs_map, data.group, data.reason or "")
        doc["created_by"] = user["_id"]
        doc["created_at"] = datetime.now(timezone.utc).isoformat()

        result = await db.candidates.insert_one(doc)
        doc["_id"] = result.inserted_id
        imported.append(serialize_candidate(doc))

    return {
        "imported": len(imported),
        "skipped": len(skipped),
        "candidates": imported,
    }

@api_router.get("/teamtailor/sync-status")
async def tt_auto_sync(request: Request):
    """Auto-sync check — returns status and triggers background sync if stale."""
    user = await get_current_user(request)
    settings = await db.tt_settings.find_one({"user_id": user["_id"]})
    if not settings or not settings.get("api_key"):
        return {"connected": False, "should_sync": False}

    last_sync = settings.get("last_sync")
    should_sync = True
    if last_sync:
        try:
            last = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            hours_since = (datetime.now(timezone.utc) - last).total_seconds() / 3600
            should_sync = hours_since > 1  # Re-sync if older than 1 hour
        except Exception:
            pass

    return {
        "connected": True,
        "should_sync": should_sync,
        "last_sync": last_sync,
        "company_name": settings.get("company_name"),
    }

# ========================
# Root
# ========================

@api_router.get("/")
async def root():
    return {"message": "Taplo API is running"}

# ========================
# App Setup
# ========================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), os.environ.get("CORS_ORIGINS", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.waitlist.create_index("email", unique=True)
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@taplo.io")
    admin_password = os.environ.get("ADMIN_PASSWORD", "TaploAdmin2026!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n- GET /api/auth/me\n- POST /api/auth/refresh\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
