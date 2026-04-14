"""
Teamtailor API Service — EU Region
Full sync: candidates, jobs, stages, job-applications, custom fields
Follows JSON:API spec. Requires Admin-scoped API key.
"""
import httpx
import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

TT_BASE_URL = "https://api.teamtailor.com/v1"
TT_API_VERSION = "20240404"


class TeamtailorClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Token token={api_key}",
            "X-Api-Version": TT_API_VERSION,
            "Content-Type": "application/vnd.api+json",
        }

    async def _get(self, path: str, params: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{TT_BASE_URL}{path}",
                headers=self.headers,
                params=params or {},
            )
            resp.raise_for_status()
            return resp.json()

    async def _get_all_pages(self, path: str, params: Optional[dict] = None, max_pages: int = 20) -> list:
        """Fetch all pages of a paginated JSON:API response."""
        all_data = []
        params = params or {}
        params.setdefault("page[size]", 30)
        url = f"{TT_BASE_URL}{path}"
        page = 0

        async with httpx.AsyncClient(timeout=30) as client:
            while url and page < max_pages:
                resp = await client.get(url, headers=self.headers, params=params if page == 0 else {})
                resp.raise_for_status()
                body = resp.json()
                all_data.extend(body.get("data", []))
                next_link = body.get("links", {}).get("next")
                url = next_link if next_link else None
                page += 1
        return all_data

    async def test_connection(self) -> dict:
        """Test if the API key is valid by fetching company info."""
        try:
            data = await self._get("/company")
            company = data.get("data", {})
            attrs = company.get("attributes", {})
            return {
                "connected": True,
                "company_name": attrs.get("name", "Unknown"),
                "company_id": company.get("id"),
            }
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return {"connected": False, "error": "Invalid API key"}
            return {"connected": False, "error": f"API error: {e.response.status_code}"}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def fetch_jobs(self) -> list:
        """Fetch all jobs."""
        raw = await self._get_all_pages("/jobs")
        jobs = []
        for item in raw:
            attrs = item.get("attributes", {})
            jobs.append({
                "tt_id": item.get("id"),
                "title": attrs.get("title", ""),
                "status": attrs.get("status", ""),
                "department": attrs.get("department", ""),
                "location": attrs.get("location", ""),
                "created_at": attrs.get("created-at"),
                "updated_at": attrs.get("updated-at"),
            })
        return jobs

    async def fetch_stages(self) -> list:
        """Fetch all stages."""
        raw = await self._get_all_pages("/stages")
        stages = []
        for item in raw:
            attrs = item.get("attributes", {})
            stages.append({
                "tt_id": item.get("id"),
                "name": attrs.get("name", ""),
                "stage_type": attrs.get("stage-type", ""),
            })
        return stages

    async def fetch_candidates(self) -> list:
        """Fetch all candidates with their attributes."""
        raw = await self._get_all_pages("/candidates")
        candidates = []
        for item in raw:
            attrs = item.get("attributes", {})
            candidates.append({
                "tt_id": item.get("id"),
                "first_name": attrs.get("first-name", ""),
                "last_name": attrs.get("last-name", ""),
                "email": attrs.get("email", ""),
                "phone": attrs.get("phone", ""),
                "created_at": attrs.get("created-at"),
                "updated_at": attrs.get("updated-at"),
                "connected": attrs.get("connected", False),
                "sourced": attrs.get("sourced", False),
                "tags": attrs.get("tags", []),
                "consent_future_jobs_at": attrs.get("consent-future-jobs-at"),
                "unsubscribed": attrs.get("unsubscribed", False),
            })
        return candidates

    async def fetch_job_applications(self) -> list:
        """Fetch all job applications with relationships."""
        raw = await self._get_all_pages("/job-applications", params={"include": "candidate,job,stage"})
        applications = []
        for item in raw:
            attrs = item.get("attributes", {})
            rels = item.get("relationships", {})

            candidate_id = None
            cand_data = rels.get("candidate", {}).get("data")
            if cand_data:
                candidate_id = cand_data.get("id")

            job_id = None
            job_data = rels.get("job", {}).get("data")
            if job_data:
                job_id = job_data.get("id")

            stage_id = None
            stage_data = rels.get("stage", {}).get("data")
            if stage_data:
                stage_id = stage_data.get("id")

            applications.append({
                "tt_id": item.get("id"),
                "candidate_tt_id": candidate_id,
                "job_tt_id": job_id,
                "stage_tt_id": stage_id,
                "created_at": attrs.get("created-at"),
                "updated_at": attrs.get("updated-at"),
                "rejected_at": attrs.get("rejected-at"),
                "stage_name": attrs.get("stage-name", ""),
            })
        return applications

    async def fetch_custom_fields(self) -> list:
        """Fetch custom field definitions."""
        try:
            raw = await self._get_all_pages("/custom-fields")
            fields = []
            for item in raw:
                attrs = item.get("attributes", {})
                fields.append({
                    "tt_id": item.get("id"),
                    "name": attrs.get("name", ""),
                    "field_type": attrs.get("field-type", ""),
                    "api_name": attrs.get("api-name", ""),
                })
            return fields
        except Exception:
            return []


async def full_sync(db, user_id: str, api_key: str) -> dict:
    """
    Perform a full sync from Teamtailor for a given user.
    Stores raw data in MongoDB and returns a summary.
    """
    tt = TeamtailorClient(api_key)
    now = datetime.now(timezone.utc).isoformat()
    results = {"jobs": 0, "stages": 0, "candidates": 0, "applications": 0, "custom_fields": 0, "errors": []}

    # 1. Fetch jobs
    try:
        jobs = await tt.fetch_jobs()
        for j in jobs:
            j["synced_by"] = user_id
            j["synced_at"] = now
            await db.tt_jobs.update_one(
                {"tt_id": j["tt_id"], "synced_by": user_id},
                {"$set": j},
                upsert=True,
            )
        results["jobs"] = len(jobs)
    except Exception as e:
        logger.error(f"TT jobs sync error: {e}")
        results["errors"].append(f"Jobs: {str(e)}")

    # 2. Fetch stages
    try:
        stages = await tt.fetch_stages()
        for s in stages:
            s["synced_by"] = user_id
            s["synced_at"] = now
            await db.tt_stages.update_one(
                {"tt_id": s["tt_id"], "synced_by": user_id},
                {"$set": s},
                upsert=True,
            )
        results["stages"] = len(stages)
    except Exception as e:
        logger.error(f"TT stages sync error: {e}")
        results["errors"].append(f"Stages: {str(e)}")

    # 3. Fetch candidates
    try:
        candidates = await tt.fetch_candidates()
        for c in candidates:
            c["synced_by"] = user_id
            c["synced_at"] = now
            await db.tt_candidates.update_one(
                {"tt_id": c["tt_id"], "synced_by": user_id},
                {"$set": c},
                upsert=True,
            )
        results["candidates"] = len(candidates)
    except Exception as e:
        logger.error(f"TT candidates sync error: {e}")
        results["errors"].append(f"Candidates: {str(e)}")

    # 4. Fetch job applications
    try:
        apps = await tt.fetch_job_applications()
        for a in apps:
            a["synced_by"] = user_id
            a["synced_at"] = now
            await db.tt_applications.update_one(
                {"tt_id": a["tt_id"], "synced_by": user_id},
                {"$set": a},
                upsert=True,
            )
        results["applications"] = len(apps)
    except Exception as e:
        logger.error(f"TT applications sync error: {e}")
        results["errors"].append(f"Applications: {str(e)}")

    # 5. Fetch custom fields
    try:
        fields = await tt.fetch_custom_fields()
        for f in fields:
            f["synced_by"] = user_id
            f["synced_at"] = now
            await db.tt_custom_fields.update_one(
                {"tt_id": f["tt_id"], "synced_by": user_id},
                {"$set": f},
                upsert=True,
            )
        results["custom_fields"] = len(fields)
    except Exception as e:
        logger.error(f"TT custom fields sync error: {e}")
        results["errors"].append(f"Custom fields: {str(e)}")

    # Update sync timestamp
    await db.tt_settings.update_one(
        {"user_id": user_id},
        {"$set": {"last_sync": now, "last_sync_results": results}},
    )

    return results


def map_tt_candidate_to_taplo(tt_candidate: dict, tt_applications: list, tt_jobs: dict, group: str, reason: str) -> dict:
    """
    Map a raw Teamtailor candidate to a Taplo candidate document.
    tt_jobs is a dict of {tt_id: job_doc}
    """
    name = f"{tt_candidate.get('first_name', '')} {tt_candidate.get('last_name', '')}".strip()
    email = tt_candidate.get("email", "")

    # Find the most recent application to get the role
    role = "Unknown Role"
    last_activity = tt_candidate.get("updated_at")
    if tt_applications:
        sorted_apps = sorted(tt_applications, key=lambda a: a.get("updated_at", ""), reverse=True)
        latest = sorted_apps[0]
        job_id = latest.get("job_tt_id")
        if job_id and job_id in tt_jobs:
            role = tt_jobs[job_id].get("title", role)
        if latest.get("updated_at"):
            last_activity = latest["updated_at"]

    # GDPR: only if they have consent and are not unsubscribed
    has_consent = bool(tt_candidate.get("consent_future_jobs_at")) and not tt_candidate.get("unsubscribed", False)

    return {
        "name": name,
        "email": email,
        "role": role,
        "group": group,
        "reason": reason,
        "notes": f"Imported from Teamtailor (ID: {tt_candidate.get('tt_id')}). Tags: {', '.join(tt_candidate.get('tags', []))}",
        "gdpr_consent": has_consent,
        "last_contact_date": last_activity,
        "last_followed_up": None,
        "tt_id": tt_candidate.get("tt_id"),
        "source": "teamtailor",
    }
