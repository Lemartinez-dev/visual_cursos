import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from backend.models.datastore import DataStore

class TaskController:
    def __init__(self):
        self.store = DataStore()

    def get_all(self, course_id: Optional[str] = None, user_id: Optional[str] = None,
                role: Optional[str] = None, status: Optional[str] = None,
                stage: Optional[str] = None) -> List[Dict[str, Any]]:
        self.store.recalculate_progress()
        tasks = self.store.tasks
        if course_id:
            tasks = [t for t in tasks if t.get("course_id") == course_id]
        if user_id:
            tasks = [t for t in tasks if t.get("assigned_user_id") == user_id]
        if role:
            tasks = [t for t in tasks if t.get("role_required", "").lower() == role.lower()]
        if status:
            tasks = [t for t in tasks if t.get("status", "").lower() == status.lower()]
        if stage:
            tasks = [t for t in tasks if t.get("stage", "").lower() == stage.lower()]
        return tasks

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        task_id = f"tsk-{uuid.uuid4().hex[:6]}"
        now = datetime.utcnow()
        due_date = data.get("due_date") or (now + timedelta(days=7)).isoformat() + "Z"

        new_task = {
            "id": task_id,
            "course_id": data.get("course_id", ""),
            "unit_id": data.get("unit_id", ""),
            "resource_id": data.get("resource_id"),
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "stage": data.get("stage", "Planeación"),
            "role_required": data.get("role_required", "docente"),
            "assigned_user_id": data.get("assigned_user_id", ""),
            "priority": data.get("priority", "Media"),
            "status": "Pendiente",
            "due_date": due_date,
            "completed_at": None,
            "dependency_task_ids": data.get("dependency_task_ids", []),
            "is_blocked": False,
            "blocking_reason": None
        }
        self.store.tasks.append(new_task)
        self.store.log_activity(new_task["course_id"], new_task["assigned_user_id"], "CREAR_TAREA",
            f"Nueva tarea asignada: '{new_task['title']}' en etapa {new_task['stage']}")
        self.store.save()
        return new_task

    def update_status(self, task_id: str, new_status: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        task = next((t for t in self.store.tasks if t.get("id") == task_id), None)
        if not task:
            return None, "Tarea no encontrada"

        # Dependency check: cannot start or complete if blocked
        if task.get("is_blocked") and new_status in ["Completada", "En Proceso"]:
            return None, f"Tarea bloqueada. {task.get('blocking_reason')}"

        prev_status = task.get("status")
        task["status"] = new_status
        if new_status == "Completada":
            task["completed_at"] = datetime.utcnow().isoformat() + "Z"
        else:
            task["completed_at"] = None

        self.store.log_activity(task.get("course_id", ""), task.get("assigned_user_id", ""), "CAMBIO_ESTADO",
            f"Tarea '{task.get('title')}' cambió de '{prev_status}' a '{new_status}'")
        self.store.save()
        return task, None
