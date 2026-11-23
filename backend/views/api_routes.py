import os
import uuid
import shutil
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Body
from typing import Optional, Dict, Any, List

from backend.models.datastore import DataStore
from backend.controllers.course_controller import CourseController
from backend.controllers.task_controller import TaskController
from backend.controllers.resource_controller import ResourceController
from backend.controllers.review_controller import ReviewController
from backend.controllers.dashboard_controller import DashboardController

router = APIRouter(prefix="/api")

course_ctrl = CourseController()
task_ctrl = TaskController()
resource_ctrl = ResourceController()
review_ctrl = ReviewController()
dashboard_ctrl = DashboardController()
store = DataStore()

# 0. Authentication
@router.post("/auth/login")
def login(credentials: Dict[str, Any] = Body(...)):
    email = credentials.get("email", "").strip().lower()
    password = credentials.get("password", "")

    # Look up user by email
    user = next((u for u in store.users if u.get("email", "").strip().lower() == email), None)
    if not user:
        raise HTTPException(status_code=401, detail="Correo electrónico no registrado en el sistema")

    # In prototype demo, password accepted if provided or equals demo standard
    if not password:
        raise HTTPException(status_code=400, detail="Debe ingresar su contraseña")

    token = f"jwt-session-{user.get('id')}-{uuid.uuid4().hex[:8]}"
    return {
        "token": token,
        "user": user,
        "message": f"Bienvenido, {user.get('name')}"
    }

# 1. Dashboard
@router.get("/dashboard/summary")
def get_dashboard_summary():
    return dashboard_ctrl.get_summary()

# 2. Users
@router.get("/users")
def get_users():
    return store.users

@router.get("/users/{user_id}")
def get_user(user_id: str):
    user = next((u for u in store.users if u.get("id") == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

# 3. Courses
@router.get("/courses")
def get_courses(status: Optional[str] = None, faculty: Optional[str] = None, search: Optional[str] = None):
    return course_ctrl.get_all(status=status, faculty=faculty, search=search)

@router.get("/courses/{course_id}")
def get_course_detail(course_id: str):
    detail = course_ctrl.get_by_id(course_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return detail

@router.post("/courses", status_code=201)
def create_course(data: Dict[str, Any] = Body(...)):
    return course_ctrl.create(data)

# 4. Units
@router.get("/courses/{course_id}/units")
def get_course_units(course_id: str):
    return [u for u in store.units if u.get("course_id") == course_id]

@router.post("/courses/{course_id}/units", status_code=201)
def create_unit(course_id: str, data: Dict[str, Any] = Body(...)):
    unit_id = f"unt-{uuid.uuid4().hex[:6]}"
    existing_count = sum(1 for u in store.units if u.get("course_id") == course_id)
    unit = {
        "id": unit_id,
        "course_id": course_id,
        "unit_number": data.get("unit_number") or (existing_count + 1),
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "status": "Pendiente",
        "progress_percentage": 0.0
    }
    store.units.append(unit)
    store.log_activity(course_id, "usr-coord", "CREAR_UNIDAD", f"Nueva unidad curricular #{unit['unit_number']}: {unit['title']}")
    store.save()
    return unit

# 5. Tasks
@router.get("/tasks")
def get_tasks(course_id: Optional[str] = None, user_id: Optional[str] = None,
              role: Optional[str] = None, status: Optional[str] = None, stage: Optional[str] = None):
    return task_ctrl.get_all(course_id=course_id, user_id=user_id, role=role, status=status, stage=stage)

@router.post("/tasks", status_code=201)
def create_task(data: Dict[str, Any] = Body(...)):
    return task_ctrl.create(data)

@router.patch("/tasks/{task_id}/status")
def update_task_status(task_id: str, data: Dict[str, Any] = Body(...)):
    new_status = data.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Debe especificar 'status'")
    updated, err = task_ctrl.update_status(task_id, new_status)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return updated

# 6. Resources
@router.get("/resources")
def get_resources(course_id: Optional[str] = None, stage: Optional[str] = None, status: Optional[str] = None):
    return resource_ctrl.get_all(course_id=course_id, stage=stage, status=status)

@router.get("/resources/{resource_id}")
def get_resource(resource_id: str):
    res = resource_ctrl.get_by_id(resource_id)
    if not res:
        raise HTTPException(status_code=404, detail="Recurso no encontrado")
    return res

@router.post("/resources", status_code=201)
def create_resource(data: Dict[str, Any] = Body(...)):
    return resource_ctrl.create(data)

# 7. Submissions & Deliverables
@router.post("/submissions", status_code=201)
def submit_deliverable(data: Dict[str, Any] = Body(...)):
    return resource_ctrl.submit_deliverable(data)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo inválido")

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(file.filename)}"
    file_path = os.path.join(uploads_dir, safe_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "fileName": file.filename,
        "url": f"/uploads/{safe_name}",
        "size": os.path.getsize(file_path)
    }

# 8. Reviews
@router.post("/reviews", status_code=201)
def submit_review(data: Dict[str, Any] = Body(...)):
    return review_ctrl.submit_review(data)

# 9. Activity Logs
@router.get("/activity-logs")
def get_activity_logs(course_id: Optional[str] = None):
    logs = store.activity_logs
    if course_id:
        logs = [l for l in logs if l.get("course_id") == course_id]
    return logs[:50]

# 10. Demo Reset
@router.post("/system/reset-demo")
def reset_demo():
    store.seed_initial_data()
    store.save()
    return {"message": "Datos de demostración restaurados exitosamente al estado original"}
