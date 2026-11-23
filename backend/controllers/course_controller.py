import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from backend.models.datastore import DataStore

class CourseController:
    def __init__(self):
        self.store = DataStore()

    def get_all(self, status: Optional[str] = None, faculty: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        self.store.recalculate_progress()
        courses = self.store.courses
        if status:
            courses = [c for c in courses if c.get("status", "").lower() == status.lower()]
        if faculty:
            courses = [c for c in courses if faculty.lower() in c.get("faculty", "").lower()]
        if search:
            courses = [c for c in courses if search.lower() in c.get("title", "").lower() or search.lower() in c.get("code", "").lower()]
        return courses

    def get_by_id(self, course_id: str) -> Optional[Dict[str, Any]]:
        self.store.recalculate_progress()
        course = next((c for c in self.store.courses if c.get("id") == course_id), None)
        if not course:
            return None

        units = [u for u in self.store.units if u.get("course_id") == course_id]
        units.sort(key=lambda u: u.get("unit_number", 0))

        tasks = [t for t in self.store.tasks if t.get("course_id") == course_id]
        resources = [r for r in self.store.resources if r.get("course_id") == course_id]
        logs = [l for l in self.store.activity_logs if l.get("course_id") == course_id][:20]

        team_ids = {
            course.get("coordinator_id"),
            course.get("teacher_id"),
            course.get("instructional_designer_id"),
            course.get("pedagogical_reviewer_id"),
            course.get("multimedia_producer_id"),
            course.get("lms_developer_id"),
            course.get("quality_auditor_id")
        }
        team = [u for u in self.store.users if u.get("id") in team_ids]

        return {
            "course": course,
            "units": units,
            "tasks": tasks,
            "resources": resources,
            "team": team,
            "recent_logs": logs
        }

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        course_id = f"crs-{uuid.uuid4().hex[:6]}"
        now = datetime.utcnow()
        new_course = {
            "id": course_id,
            "code": data.get("code", "").upper(),
            "title": data.get("title", ""),
            "faculty": data.get("faculty", "Facultad de Ingeniería"),
            "academic_program": data.get("academic_program", ""),
            "period": data.get("period", "2026-I"),
            "description": data.get("description", ""),
            "modality": data.get("modality", "100% Virtual"),
            "credits": data.get("credits", 3),
            "coordinator_id": data.get("coordinator_id", "usr-coord"),
            "teacher_id": data.get("teacher_id", ""),
            "instructional_designer_id": data.get("instructional_designer_id", ""),
            "pedagogical_reviewer_id": data.get("pedagogical_reviewer_id", "usr-rev"),
            "multimedia_producer_id": data.get("multimedia_producer_id", "usr-mult"),
            "lms_developer_id": data.get("lms_developer_id", "usr-lms"),
            "quality_auditor_id": data.get("quality_auditor_id", "usr-cal"),
            "status": "Planificación",
            "progress_percentage": 0.0,
            "start_date": now.isoformat() + "Z",
            "target_completion_date": (now + timedelta(days=60)).isoformat() + "Z",
            "tags": data.get("tags", ["Nuevo", "Virtualización"])
        }
        self.store.courses.append(new_course)
        self.store.log_activity(course_id, new_course["coordinator_id"], "CREAR_CURSO",
            f"Se inició la virtualización del curso: {new_course['code']} - {new_course['title']}")
        self.store.save()
        return new_course
