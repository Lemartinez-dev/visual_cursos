import uuid
from datetime import datetime
from typing import Dict, Any
from backend.models.datastore import DataStore

class ReviewController:
    def __init__(self):
        self.store = DataStore()

    def submit_review(self, data: Dict[str, Any]) -> Dict[str, Any]:
        rev_id = f"rev-{uuid.uuid4().hex[:6]}"
        now = datetime.utcnow().isoformat() + "Z"

        resource_id = data.get("resource_id")
        task_id = data.get("task_id")
        course_id = data.get("course_id")
        decision = data.get("decision", "Aprobado")
        feedback = data.get("feedback", "")
        reviewer_id = data.get("reviewer_user_id", "usr-rev")
        reviewer_role = data.get("reviewer_role", "revisor_pedagogico")

        review = {
            "id": rev_id,
            "course_id": course_id,
            "task_id": task_id,
            "resource_id": resource_id,
            "submission_id": data.get("submission_id", ""),
            "reviewer_user_id": reviewer_id,
            "reviewer_role": reviewer_role,
            "decision": decision,
            "feedback": feedback,
            "checklist": data.get("checklist", []),
            "reviewed_at": now
        }

        resource = next((r for r in self.store.resources if r.get("id") == resource_id), None)
        task = next((t for t in self.store.tasks if t.get("id") == task_id or t.get("resource_id") == resource_id), None)

        if decision == "Aprobado":
            if resource:
                resource["status"] = "Aprobado"
                resource["reviews_count"] = resource.get("reviews_count", 0) + 1
                resource["updated_at"] = now
            if task:
                task["status"] = "Completada"
                task["completed_at"] = now
            self.store.log_activity(course_id, reviewer_id, "APROBACION",
                f"Dictamen APROBADO por {reviewer_role} para '{resource.get('title') if resource else 'Insumo'}'. Observación: {feedback}")
        elif decision == "Requiere Ajustes":
            if resource:
                resource["status"] = "Requiere Ajustes"
                resource["reviews_count"] = resource.get("reviews_count", 0) + 1
                resource["updated_at"] = now
            if task:
                task["status"] = "Requiere Ajustes"
            self.store.log_activity(course_id, reviewer_id, "OBSERVACION_REGISTRADA",
                f"Dictamen REQUIERE AJUSTES para '{resource.get('title') if resource else 'Insumo'}'. Observación: {feedback}")
        else: # Rechazado
            if resource:
                resource["status"] = "Requiere Ajustes"
                resource["reviews_count"] = resource.get("reviews_count", 0) + 1
                resource["updated_at"] = now
            if task:
                task["status"] = "Requiere Ajustes"
            self.store.log_activity(course_id, reviewer_id, "RECHAZO",
                f"Dictamen RECHAZADO para '{resource.get('title') if resource else 'Insumo'}'. Motivo: {feedback}")

        self.store.reviews.append(review)
        self.store.save()
        return review
