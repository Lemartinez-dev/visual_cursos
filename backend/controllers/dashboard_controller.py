from datetime import datetime
from typing import Dict, Any
from backend.models.datastore import DataStore

class DashboardController:
    def __init__(self):
        self.store = DataStore()

    def get_summary(self) -> Dict[str, Any]:
        self.store.recalculate_progress()
        now = datetime.utcnow()

        total_courses = len(self.store.courses)
        published_courses = sum(1 for c in self.store.courses if c.get("status") == "Publicado")
        at_risk_courses = sum(1 for c in self.store.courses if c.get("status") == "En Riesgo")
        in_planning = sum(1 for c in self.store.courses if c.get("status") == "Planificación")
        in_production = sum(1 for c in self.store.courses if c.get("status") in ["En Producción", "En Producción Multimedia"])
        in_review = sum(1 for c in self.store.courses if c.get("status") == "En Revisión Pedagógica")
        in_quality = sum(1 for c in self.store.courses if c.get("status") == "Control de Calidad")
        in_lms = sum(1 for c in self.store.courses if c.get("status") == "En Montaje LMS")

        avg_progress = round(sum(c.get("progress_percentage", 0) for c in self.store.courses) / total_courses, 1) if total_courses > 0 else 0.0

        total_tasks = len(self.store.tasks)
        completed_tasks = sum(1 for t in self.store.tasks if t.get("status") == "Completada")
        in_progress_tasks = sum(1 for t in self.store.tasks if t.get("status") == "En Proceso")
        in_review_tasks = sum(1 for t in self.store.tasks if t.get("status") == "En Revisión")
        adjustments_tasks = sum(1 for t in self.store.tasks if t.get("status") == "Requiere Ajustes")
        blocked_tasks = sum(1 for t in self.store.tasks if t.get("is_blocked"))

        overdue_tasks = 0
        for t in self.store.tasks:
            due_str = t.get("due_date")
            if due_str and t.get("status") != "Completada":
                try:
                    due = datetime.fromisoformat(due_str.replace("Z", ""))
                    if due < now:
                        overdue_tasks += 1
                except:
                    pass

        total_resources = len(self.store.resources)
        approved_resources = sum(1 for r in self.store.resources if r.get("status") in ["Aprobado", "Integrado en LMS", "Certificado Calidad"])

        # Bottlenecks by stage
        stages = ["Planeación", "Diseño Instruccional", "Producción Multimedia", "Montaje LMS", "Control Calidad"]
        bottlenecks = []
        for stage in stages:
            stage_tasks = [t for t in self.store.tasks if t.get("stage") == stage]
            pending_count = sum(1 for t in stage_tasks if t.get("status") != "Completada")
            stage_overdue = 0
            for t in stage_tasks:
                if t.get("status") != "Completada" and t.get("due_date"):
                    try:
                        due = datetime.fromisoformat(t["due_date"].replace("Z", ""))
                        if due < now:
                            stage_overdue += 1
                    except:
                        pass
            bottlenecks.append({
                "stage": stage,
                "pending_items": pending_count,
                "overdue_items": stage_overdue,
                "average_days_in_stage": round(pending_count * 2.8, 1)
            })

        # Workload by user
        user_workloads = []
        for u in self.store.users:
            u_tasks = [t for t in self.store.tasks if t.get("assigned_user_id") == u.get("id")]
            u_overdue = 0
            for t in u_tasks:
                if t.get("status") != "Completada" and t.get("due_date"):
                    try:
                        due = datetime.fromisoformat(t["due_date"].replace("Z", ""))
                        if due < now:
                            u_overdue += 1
                    except:
                        pass
            user_workloads.append({
                "user_id": u.get("id"),
                "user_name": u.get("name"),
                "role": u.get("role_display_name"),
                "total_tasks_assigned": len(u_tasks),
                "pending_tasks": sum(1 for t in u_tasks if t.get("status") != "Completada"),
                "completed_tasks": sum(1 for t in u_tasks if t.get("status") == "Completada"),
                "overdue_tasks": u_overdue
            })

        # Courses progress DTO
        courses_progress = []
        for c in self.store.courses:
            c_tasks = [t for t in self.store.tasks if t.get("course_id") == c.get("id")]
            c_pending = sum(1 for t in c_tasks if t.get("status") != "Completada")
            c_blocked = sum(1 for t in c_tasks if t.get("is_blocked"))
            courses_progress.append({
                "course_id": c.get("id"),
                "code": c.get("code"),
                "title": c.get("title"),
                "faculty": c.get("faculty"),
                "status": c.get("status"),
                "progress_percentage": c.get("progress_percentage"),
                "pending_tasks": c_pending,
                "blocked_tasks": c_blocked
            })

        return {
            "total_courses": total_courses,
            "in_planning_courses": in_planning,
            "in_production_courses": in_production + in_lms,
            "in_review_courses": in_review,
            "in_quality_audit_courses": in_quality,
            "published_courses": published_courses,
            "at_risk_courses": at_risk_courses,
            "global_average_progress": avg_progress,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "in_review_tasks": in_review_tasks,
            "adjustments_required_tasks": adjustments_tasks,
            "overdue_tasks": overdue_tasks,
            "blocked_tasks": blocked_tasks,
            "total_resources": total_resources,
            "approved_resources": approved_resources,
            "pending_reviews_count": in_review_tasks + adjustments_tasks,
            "bottlenecks": bottlenecks,
            "user_workloads": user_workloads,
            "courses_progress": courses_progress
        }
