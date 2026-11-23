from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    id: str
    name: str
    email: str
    role: str # docente, revisor_pedagogico, disenador_instruccional, productor_multimedia, desarrollador_lms, auditor_calidad, coordinador
    role_display_name: str
    department: str
    avatar_color: str = "#3B82F6"
    initials: str = ""

class Course(BaseModel):
    id: str
    code: str
    title: str
    faculty: str
    academic_program: str
    period: str = "2026-I"
    description: str = ""
    modality: str = "100% Virtual"
    credits: int = 3
    coordinator_id: str = ""
    teacher_id: str = ""
    instructional_designer_id: str = ""
    pedagogical_reviewer_id: str = ""
    multimedia_producer_id: str = ""
    lms_developer_id: str = ""
    quality_auditor_id: str = ""
    status: str = "Planificación" # Planificación, En Revisión Pedagógica, En Producción Multimedia, En Montaje LMS, Control de Calidad, Publicado, En Riesgo
    progress_percentage: float = 0.0
    start_date: Optional[str] = None
    target_completion_date: Optional[str] = None
    published_at: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class AcademicUnit(BaseModel):
    id: str
    course_id: str
    unit_number: int
    title: str
    description: str = ""
    status: str = "Pendiente" # Pendiente, En Desarrollo, En Revisión, Aprobada
    progress_percentage: float = 0.0

class ResourceItem(BaseModel):
    id: str
    course_id: str
    unit_id: str
    title: str
    description: str = ""
    type: str = "Guion de Video" # Sílabo, Guion de Video, Lectura/Texto, Presentación Interactiva, Infografía, Podcast/Audio, Video Producido, Actividad/Rúbrica, Montaje en Aula
    stage: str = "Diseño Instruccional" # Planeación, Diseño Instruccional, Producción Multimedia, Montaje LMS, Control Calidad
    status: str = "Pendiente" # Pendiente, En Elaboración, Entregado, En Revisión, Requiere Ajustes, Aprobado, Integrado en LMS, Certificado Calidad
    current_version: str = "v1.0"
    author_id: str = ""
    assigned_reviewer_id: str = ""
    latest_file_url: Optional[str] = None
    latest_external_link: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    submissions_count: int = 0
    reviews_count: int = 0

class TaskItem(BaseModel):
    id: str
    course_id: str
    unit_id: str = ""
    resource_id: Optional[str] = None
    title: str
    description: str = ""
    stage: str = "Planeación"
    role_required: str = "docente"
    assigned_user_id: str = ""
    priority: str = "Media" # Alta, Media, Baja, Crítica
    status: str = "Pendiente" # Pendiente, En Proceso, En Revisión, Requiere Ajustes, Completada
    due_date: str
    completed_at: Optional[str] = None
    dependency_task_ids: List[str] = Field(default_factory=list)
    is_blocked: bool = False
    blocking_reason: Optional[str] = None

class Submission(BaseModel):
    id: str
    course_id: str
    task_id: str
    resource_id: str
    submitted_by_user_id: str
    version: str = "v1.0"
    submitted_at: Optional[str] = None
    notes: str = ""
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    external_link: Optional[str] = None
    status: str = "En Revisión"

class ChecklistItem(BaseModel):
    item: str
    passed: bool = True
    notes: str = ""

class Review(BaseModel):
    id: str
    course_id: str
    task_id: str
    resource_id: str
    submission_id: str = ""
    reviewer_user_id: str
    reviewer_role: str
    decision: str = "Aprobado" # Aprobado, Requiere Ajustes, Rechazado
    feedback: str = ""
    checklist: List[ChecklistItem] = Field(default_factory=list)
    reviewed_at: Optional[str] = None

class ActivityLog(BaseModel):
    id: str
    course_id: str
    user_id: str
    action: str
    description: str
    timestamp: Optional[str] = None
