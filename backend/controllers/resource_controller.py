import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from backend.models.datastore import DataStore

class ResourceController:
    def __init__(self):
        self.store = DataStore()

    def get_all(self, course_id: Optional[str] = None, stage: Optional[str] = None,
                status: Optional[str] = None) -> List[Dict[str, Any]]:
        resources = self.store.resources
        if course_id:
            resources = [r for r in resources if r.get("course_id") == course_id]
        if stage:
            resources = [r for r in resources if r.get("stage", "").lower() == stage.lower()]
        if status:
            resources = [r for r in resources if r.get("status", "").lower() == status.lower()]
        return resources

    def get_by_id(self, resource_id: str) -> Optional[Dict[str, Any]]:
        res = next((r for r in self.store.resources if r.get("id") == resource_id), None)
        if not res:
            return None
        submissions = [s for s in self.store.submissions if s.get("resource_id") == resource_id]
        reviews = [r for r in self.store.reviews if r.get("resource_id") == resource_id]
        course = next((c for c in self.store.courses if c.get("id") == res.get("course_id")), None)
        unit = next((u for u in self.store.units if u.get("id") == res.get("unit_id")), None)

        return {
            "resource": res,
            "course": course,
            "unit": unit,
            "submissions": submissions,
            "reviews": reviews
        }

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        res_id = f"res-{uuid.uuid4().hex[:6]}"
        now = datetime.utcnow().isoformat() + "Z"
        new_res = {
            "id": res_id,
            "course_id": data.get("course_id", ""),
            "unit_id": data.get("unit_id", ""),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "type": data.get("type", "Guion de Video"),
            "stage": data.get("stage", "Diseño Instruccional"),
            "status": "Borrador",
            "current_version": "v1.0",
            "author_id": data.get("author_id", "usr-doc1"),
            "assigned_reviewer_id": data.get("assigned_reviewer_id", "usr-rev"),
            "latest_file_url": data.get("latest_file_url"),
            "latest_external_link": data.get("latest_external_link"),
            "created_at": now,
            "updated_at": now,
            "submissions_count": 0,
            "reviews_count": 0
        }
        self.store.resources.append(new_res)
        self.store.log_activity(new_res["course_id"], new_res["author_id"], "CREAR_RECURSO",
            f"Nuevo insumo registrado: [{new_res['type']}] {new_res['title']}")
        self.store.save()
        return new_res

    def submit_deliverable(self, data: Dict[str, Any]) -> Dict[str, Any]:
        sub_id = f"sub-{uuid.uuid4().hex[:6]}"
        now = datetime.utcnow().isoformat() + "Z"

        resource_id = data.get("resource_id")
        task_id = data.get("task_id")
        course_id = data.get("course_id")

        submission = {
            "id": sub_id,
            "course_id": course_id,
            "task_id": task_id,
            "resource_id": resource_id,
            "submitted_by_user_id": data.get("submitted_by_user_id", "usr-doc1"),
            "version": data.get("version", "v1.0"),
            "submitted_at": now,
            "notes": data.get("notes", ""),
            "file_url": data.get("file_url"),
            "file_name": data.get("file_name"),
            "external_link": data.get("external_link"),
            "status": "En Revisión"
        }

        # Cascade update to task
        task = next((t for t in self.store.tasks if t.get("id") == task_id or t.get("resource_id") == resource_id), None)
        if task:
            task["status"] = "En Revisión"

        # Cascade update to resource
        res = next((r for r in self.store.resources if r.get("id") == resource_id), None)
        if res:
            res["status"] = "En Revisión"
            res["current_version"] = submission["version"]
            if submission["file_url"]:
                res["latest_file_url"] = submission["file_url"]
            if submission["external_link"]:
                res["latest_external_link"] = submission["external_link"]
            res["submissions_count"] = res.get("submissions_count", 0) + 1
            res["updated_at"] = now

        self.store.submissions.append(submission)
        self.store.log_activity(course_id, submission["submitted_by_user_id"], "ENTREGA_RECURSO",
            f"Se entregó nueva versión ({submission['version']}) de '{res.get('title') if res else 'Insumo'}'.")
        self.store.save()
        return submission
