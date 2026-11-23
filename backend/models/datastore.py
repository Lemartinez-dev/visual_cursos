import json
import os
import threading
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from backend.models.supabase_client import SupabaseService

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "database.json")

class DataStore:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DataStore, cls).__new__(cls)
                cls._instance.supabase = SupabaseService()
                cls._instance.users = []
                cls._instance.courses = []
                cls._instance.units = []
                cls._instance.resources = []
                cls._instance.tasks = []
                cls._instance.submissions = []
                cls._instance.reviews = []
                cls._instance.activity_logs = []
                cls._instance.load_or_seed()
            return cls._instance

    def load_or_seed(self):
        # 1. Try loading from Supabase if connected
        if hasattr(self, "supabase") and self.supabase.is_connected:
            try:
                sb_courses = self.supabase.fetch_all("courses")
                if sb_courses and len(sb_courses) > 0:
                    self.courses = sb_courses
                    self.users = self.supabase.fetch_all("users") or []
                    self.units = self.supabase.fetch_all("academic_units") or []
                    self.resources = self.supabase.fetch_all("resource_items") or []
                    self.tasks = self.supabase.fetch_all("task_items") or []
                    self.submissions = self.supabase.fetch_all("submissions") or []
                    self.reviews = self.supabase.fetch_all("reviews") or []
                    self.activity_logs = self.supabase.fetch_all("activity_logs") or []
                    self.recalculate_progress()
                    print(f"[SUPABASE] Datos cargados exitosamente desde la nube ({len(self.courses)} cursos).")
                    return
            except Exception as e:
                print(f"[SUPABASE] No se pudieron cargar datos desde Supabase: {e}")

        # 2. Local fallback
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if data.get("courses") or data.get("Courses"):
                        # Normalize keys (handle PascalCase or snake_case)
                        self.users = self._normalize_list(data.get("users") or data.get("Users", []))
                        self.courses = self._normalize_list(data.get("courses") or data.get("Courses", []))
                        self.units = self._normalize_list(data.get("units") or data.get("Units", []))
                        self.resources = self._normalize_list(data.get("resources") or data.get("Resources", []))
                        self.tasks = self._normalize_list(data.get("tasks") or data.get("Tasks", []))
                        self.submissions = self._normalize_list(data.get("submissions") or data.get("Submissions", []))
                        self.reviews = self._normalize_list(data.get("reviews") or data.get("Reviews", []))
                        self.activity_logs = self._normalize_list(data.get("activity_logs") or data.get("ActivityLogs", []))
                        self.recalculate_progress()
                        return
            except Exception as e:
                print(f"Error loading existing database, reseeding: {e}")

        self.seed_initial_data()
        self.save()

    def _normalize_dict(self, d: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase/PascalCase keys to snake_case for Python internal consistency"""
        normalized = {}
        for k, v in d.items():
            snake_k = ""
            for i, c in enumerate(k):
                if c.isupper() and i > 0 and not k[i-1].isupper():
                    snake_k += "_" + c.lower()
                else:
                    snake_k += c.lower()
            if isinstance(v, list):
                normalized[snake_k] = [self._normalize_dict(item) if isinstance(item, dict) else item for item in v]
            elif isinstance(v, dict):
                normalized[snake_k] = self._normalize_dict(v)
            else:
                normalized[snake_k] = v
        return normalized

    def _normalize_list(self, lst: List[Any]) -> List[Any]:
        return [self._normalize_dict(x) if isinstance(x, dict) else x for x in lst]

    def save(self):
        with self._lock:
            self.recalculate_progress()
            data = {
                "users": self.users,
                "courses": self.courses,
                "units": self.units,
                "resources": self.resources,
                "tasks": self.tasks,
                "submissions": self.submissions,
                "reviews": self.reviews,
                "activity_logs": self.activity_logs
            }
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # Sync to Supabase in the cloud if configured
            if hasattr(self, "supabase") and self.supabase.is_connected:
                try:
                    self.supabase.insert_batch("users", self.users)
                    self.supabase.insert_batch("courses", self.courses)
                    self.supabase.insert_batch("academic_units", self.units)
                    self.supabase.insert_batch("resource_items", self.resources)
                    self.supabase.insert_batch("task_items", self.tasks)
                    self.supabase.insert_batch("submissions", self.submissions)
                    self.supabase.insert_batch("reviews", self.reviews)
                    self.supabase.insert_batch("activity_logs", self.activity_logs)
                except Exception as e:
                    print(f"[SUPABASE] Error sincronizando datos a Supabase: {e}")

    def recalculate_progress(self):
        # 1. Dependency check
        for task in self.tasks:
            dep_ids = task.get("dependency_task_ids") or []
            if dep_ids:
                uncompleted = next((t for t in self.tasks if t.get("id") in dep_ids and t.get("status") != "Completada"), None)
                if uncompleted:
                    task["is_blocked"] = True
                    task["blocking_reason"] = f"Depende de: '{uncompleted.get('title')}' (Estado: {uncompleted.get('status')})"
                else:
                    task["is_blocked"] = False
                    task["blocking_reason"] = None
            else:
                task["is_blocked"] = False
                task["blocking_reason"] = None

        # 2. Recalculate courses and units
        for course in self.courses:
            c_id = course.get("id")
            course_tasks = [t for t in self.tasks if t.get("course_id") == c_id]
            if course_tasks:
                completed = sum(1 for t in course_tasks if t.get("status") == "Completada")
                course["progress_percentage"] = round((completed / len(course_tasks)) * 100, 1)

            course_units = [u for u in self.units if u.get("course_id") == c_id]
            for unit in course_units:
                u_id = unit.get("id")
                unit_tasks = [t for t in self.tasks if t.get("unit_id") == u_id]
                if unit_tasks:
                    u_completed = sum(1 for t in unit_tasks if t.get("status") == "Completada")
                    unit["progress_percentage"] = round((u_completed / len(unit_tasks)) * 100, 1)
                    if unit["progress_percentage"] >= 100:
                        unit["status"] = "Aprobada"
                    elif unit["progress_percentage"] > 0:
                        unit["status"] = "En Desarrollo"
                    else:
                        unit["status"] = "Pendiente"

    def log_activity(self, course_id: str, user_id: str, action: str, description: str):
        log_entry = {
            "id": f"act-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{len(self.activity_logs)}",
            "course_id": course_id,
            "user_id": user_id,
            "action": action,
            "description": description,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        self.activity_logs.insert(0, log_entry)
        if len(self.activity_logs) > 300:
            self.activity_logs = self.activity_logs[:300]

    def seed_initial_data(self):
        now = datetime.utcnow()
        self.users = [
            {"id": "usr-coord", "name": "Mg. Carlos Mendoza", "email": "carlos.mendoza@edu.lat", "role": "coordinador", "role_display_name": "Coordinador de Virtualización", "department": "Dirección de Educación Virtual", "avatar_color": "#4F46E5", "initials": "CM"},
            {"id": "usr-doc1", "name": "Dra. Elena Ramos", "email": "elena.ramos@edu.lat", "role": "docente", "role_display_name": "Docente Experta (Ingeniería)", "department": "Facultad de Ingeniería", "avatar_color": "#059669", "initials": "ER"},
            {"id": "usr-doc2", "name": "Dr. Andrés Gómez", "email": "andres.gomez@edu.lat", "role": "docente", "role_display_name": "Docente Experto (Salud)", "department": "Facultad de Ciencias de la Salud", "avatar_color": "#0D9488", "initials": "AG"},
            {"id": "usr-rev", "name": "Lic. Claudia Morales", "email": "claudia.morales@edu.lat", "role": "revisor_pedagogico", "role_display_name": "Revisora Pedagógica", "department": "Centro de Innovación Pedagógica", "avatar_color": "#D97706", "initials": "CM"},
            {"id": "usr-di", "name": "Esp. Javier Ortiz", "email": "javier.ortiz@edu.lat", "role": "disenador_instruccional", "role_display_name": "Diseñador Instruccional", "department": "Unidad de Tecnologías Educativas", "avatar_color": "#2563EB", "initials": "JO"},
            {"id": "usr-mult", "name": "Mateo Vargas", "email": "mateo.vargas@edu.lat", "role": "productor_multimedia", "role_display_name": "Productor Multimedia", "department": "Laboratorio de Medios Digitales", "avatar_color": "#7C3AED", "initials": "MV"},
            {"id": "usr-lms", "name": "Ing. Sofía Castro", "email": "sofia.castro@edu.lat", "role": "desarrollador_lms", "role_display_name": "Desarrollador de Entornos Virtuales (LMS)", "department": "Campus Virtual TI", "avatar_color": "#DB2777", "initials": "SC"},
            {"id": "usr-cal", "name": "Mg. Patricia Vega", "email": "patricia.vega@edu.lat", "role": "auditor_calidad", "role_display_name": "Auditora de Calidad Académica", "department": "Acreditación y Calidad Institucional", "avatar_color": "#DC2626", "initials": "PV"}
        ]

        self.courses = [
            {
                "id": "crs-101",
                "code": "VIRT-ING-301",
                "title": "Inteligencia Artificial y Aprendizaje Automático",
                "faculty": "Facultad de Ingeniería y Ciencias Básicas",
                "academic_program": "Ingeniería de Sistemas",
                "period": "2026-I",
                "description": "Virtualización de la asignatura de computación inteligente con laboratorios en Python y recursos interactivos.",
                "modality": "100% Virtual Asincrónico",
                "credits": 3,
                "coordinator_id": "usr-coord",
                "teacher_id": "usr-doc1",
                "instructional_designer_id": "usr-di",
                "pedagogical_reviewer_id": "usr-rev",
                "multimedia_producer_id": "usr-mult",
                "lms_developer_id": "usr-lms",
                "quality_auditor_id": "usr-cal",
                "status": "En Montaje LMS",
                "progress_percentage": 75.0,
                "start_date": (now - timedelta(days=45)).isoformat() + "Z",
                "target_completion_date": (now + timedelta(days=15)).isoformat() + "Z",
                "tags": ["Ingeniería", "IA", "Python", "Prioridad Alta"]
            },
            {
                "id": "crs-102",
                "code": "VIRT-MED-104",
                "title": "Bioética y Deontología Médica",
                "faculty": "Facultad de Ciencias Médicas y de la Salud",
                "academic_program": "Medicina Humana",
                "period": "2026-I",
                "description": "Casos de estudio bioéticos, dilemas clínicos en cuidados intensivos y marco deontológico.",
                "modality": "Híbrido Virtualizado",
                "credits": 2,
                "coordinator_id": "usr-coord",
                "teacher_id": "usr-doc2",
                "instructional_designer_id": "usr-di",
                "pedagogical_reviewer_id": "usr-rev",
                "multimedia_producer_id": "usr-mult",
                "lms_developer_id": "usr-lms",
                "quality_auditor_id": "usr-cal",
                "status": "En Revisión Pedagógica",
                "progress_percentage": 42.0,
                "start_date": (now - timedelta(days=28)).isoformat() + "Z",
                "target_completion_date": (now + timedelta(days=30)).isoformat() + "Z",
                "tags": ["Salud", "Bioética", "Casos Clínicos"]
            },
            {
                "id": "crs-103",
                "code": "VIRT-EAS-205",
                "title": "Gestión Financiera para la Toma de Decisiones",
                "faculty": "Facultad de Ciencias Empresariales y Económicas",
                "academic_program": "Administración de Empresas",
                "period": "2026-I",
                "description": "Análisis de razones financieras, flujo de caja y evaluación de proyectos de inversión.",
                "modality": "100% Virtual",
                "credits": 4,
                "coordinator_id": "usr-coord",
                "teacher_id": "usr-doc1",
                "instructional_designer_id": "usr-di",
                "pedagogical_reviewer_id": "usr-rev",
                "multimedia_producer_id": "usr-mult",
                "lms_developer_id": "usr-lms",
                "quality_auditor_id": "usr-cal",
                "status": "En Producción Multimedia",
                "progress_percentage": 58.0,
                "start_date": (now - timedelta(days=35)).isoformat() + "Z",
                "target_completion_date": (now + timedelta(days=20)).isoformat() + "Z",
                "tags": ["Negocios", "Finanzas", "Simuladores"]
            },
            {
                "id": "crs-104",
                "code": "VIRT-DIS-102",
                "title": "Diseño de Interfaces y Experiencia de Usuario (UI/UX)",
                "faculty": "Facultad de Artes y Diseño Digital",
                "academic_program": "Diseño Interactivo",
                "period": "2026-I",
                "description": "Metodología Design Thinking, prototipado interactivo en Figma y pruebas de usabilidad.",
                "modality": "100% Virtual",
                "credits": 3,
                "coordinator_id": "usr-coord",
                "teacher_id": "usr-doc1",
                "instructional_designer_id": "usr-di",
                "pedagogical_reviewer_id": "usr-rev",
                "multimedia_producer_id": "usr-mult",
                "lms_developer_id": "usr-lms",
                "quality_auditor_id": "usr-cal",
                "status": "Control de Calidad",
                "progress_percentage": 88.0,
                "start_date": (now - timedelta(days=60)).isoformat() + "Z",
                "target_completion_date": (now + timedelta(days=5)).isoformat() + "Z",
                "tags": ["Diseño", "UI/UX", "Figma", "Fase Final"]
            },
            {
                "id": "crs-105",
                "code": "VIRT-HUM-101",
                "title": "Metodología de la Investigación Científica",
                "faculty": "Facultad de Humanidades y Educación",
                "academic_program": "Tronco Común Institucional",
                "period": "2026-I",
                "description": "Competencias investigativas transversales, formulación de problemas y normas de citación internacional.",
                "modality": "100% Virtual Asincrónico",
                "credits": 3,
                "coordinator_id": "usr-coord",
                "teacher_id": "usr-doc2",
                "instructional_designer_id": "usr-di",
                "pedagogical_reviewer_id": "usr-rev",
                "multimedia_producer_id": "usr-mult",
                "lms_developer_id": "usr-lms",
                "quality_auditor_id": "usr-cal",
                "status": "Publicado",
                "progress_percentage": 100.0,
                "start_date": (now - timedelta(days=90)).isoformat() + "Z",
                "target_completion_date": (now - timedelta(days=10)).isoformat() + "Z",
                "published_at": (now - timedelta(days=8)).isoformat() + "Z",
                "tags": ["Transversal", "Investigación", "Certificado"]
            },
            {
                "id": "crs-106",
                "code": "VIRT-ING-405",
                "title": "Ciberseguridad y Protección de Datos",
                "faculty": "Facultad de Ingeniería",
                "academic_program": "Ingeniería de Sistemas",
                "period": "2026-I",
                "description": "Seguridad perimetral, ethical hacking, criptografía y gestión de riesgos informáticos.",
                "modality": "100% Virtual",
                "credits": 3,
                "coordinator_id": "usr-coord",
                "teacher_id": "usr-doc1",
                "instructional_designer_id": "usr-di",
                "pedagogical_reviewer_id": "usr-rev",
                "multimedia_producer_id": "usr-mult",
                "lms_developer_id": "usr-lms",
                "quality_auditor_id": "usr-cal",
                "status": "En Riesgo",
                "progress_percentage": 25.0,
                "start_date": (now - timedelta(days=20)).isoformat() + "Z",
                "target_completion_date": (now + timedelta(days=10)).isoformat() + "Z",
                "tags": ["Crítico", "Ciberseguridad", "Demorado"]
            }
        ]

        self.units = [
            {"id": "unt-101-1", "course_id": "crs-101", "unit_number": 1, "title": "Unidad 1: Fundamentos del Machine Learning y Pipelines", "description": "Introducción, algoritmos supervisados vs no supervisados, preprocesamiento.", "status": "Aprobada", "progress_percentage": 100.0},
            {"id": "unt-101-2", "course_id": "crs-101", "unit_number": 2, "title": "Unidad 2: Redes Neuronales Artificiales y Deep Learning", "description": "Perceptrón multicapa, funciones de activación, optimización por gradiente.", "status": "En Desarrollo", "progress_percentage": 80.0},
            {"id": "unt-101-3", "course_id": "crs-101", "unit_number": 3, "title": "Unidad 3: Procesamiento de Lenguaje Natural y Transformers", "description": "Embeddings, arquitecturas de atención, LLMs y aplicaciones.", "status": "Pendiente", "progress_percentage": 40.0},
            {"id": "unt-102-1", "course_id": "crs-102", "unit_number": 1, "title": "Unidad 1: Principialismo y Fundamentos Bioéticos", "description": "Autonomía, beneficencia, no maleficencia y justicia distributiva en salud.", "status": "En Desarrollo", "progress_percentage": 60.0},
            {"id": "unt-102-2", "course_id": "crs-102", "unit_number": 2, "title": "Unidad 2: Dilemas Clínicos en Pacientes Críticos", "description": "Consentimiento informado, cuidados paliativos y comités hospitalarios.", "status": "Pendiente", "progress_percentage": 25.0}
        ]

        self.resources = [
            {
                "id": "res-101-1",
                "course_id": "crs-101",
                "unit_id": "unt-101-1",
                "title": "Sílabo y Planeación Microcurricular de IA",
                "description": "Documento oficial con competencias, rúbricas de evaluación y cronograma académico.",
                "type": "Sílabo",
                "stage": "Planeación",
                "status": "Certificado Calidad",
                "current_version": "v1.1",
                "author_id": "usr-doc1",
                "assigned_reviewer_id": "usr-rev",
                "latest_file_url": "/uploads/silabo_ia_2026.pdf",
                "latest_external_link": "https://campusvirtual.universidad.edu/silabos/VIRT-ING-301.pdf",
                "created_at": (now - timedelta(days=40)).isoformat() + "Z",
                "updated_at": (now - timedelta(days=35)).isoformat() + "Z",
                "submissions_count": 2,
                "reviews_count": 2
            },
            {
                "id": "res-101-2",
                "course_id": "crs-101",
                "unit_id": "unt-101-1",
                "title": "Guion Técnico y Pedagógico: Video Redes Neuronales",
                "description": "Guion a dos columnas con marcas de tiempo, narrativa didáctica y código Python.",
                "type": "Guion de Video",
                "stage": "Diseño Instruccional",
                "status": "Aprobado",
                "current_version": "v2.0",
                "author_id": "usr-doc1",
                "assigned_reviewer_id": "usr-di",
                "latest_file_url": "/uploads/guion_video_redes_v2.docx",
                "latest_external_link": "https://docs.google.com/document/d/guion-redes-ia",
                "created_at": (now - timedelta(days=32)).isoformat() + "Z",
                "updated_at": (now - timedelta(days=25)).isoformat() + "Z",
                "submissions_count": 2,
                "reviews_count": 2
            },
            {
                "id": "res-101-3",
                "course_id": "crs-101",
                "unit_id": "unt-101-1",
                "title": "Cápsula de Video Multimedia: Redes Neuronales en Acción",
                "description": "Video animado de 6 minutos en MP4 Full HD con locución profesional y subtítulos.",
                "type": "Video Producido",
                "stage": "Producción Multimedia",
                "status": "Aprobado",
                "current_version": "v1.0",
                "author_id": "usr-mult",
                "assigned_reviewer_id": "usr-di",
                "latest_file_url": "/uploads/video_capsula_redes.mp4",
                "latest_external_link": "https://vimeo.com/video-produccion-ia",
                "created_at": (now - timedelta(days=22)).isoformat() + "Z",
                "updated_at": (now - timedelta(days=15)).isoformat() + "Z",
                "submissions_count": 1,
                "reviews_count": 1
            },
            {
                "id": "res-101-4",
                "course_id": "crs-101",
                "unit_id": "unt-101-2",
                "title": "Infografía Interactiva: Arquitectura de Transformers",
                "description": "Recurso interactivo con capas navegables de la arquitectura Self-Attention.",
                "type": "Infografía",
                "stage": "Producción Multimedia",
                "status": "En Revisión",
                "current_version": "v1.1",
                "author_id": "usr-mult",
                "assigned_reviewer_id": "usr-rev",
                "latest_file_url": "/uploads/infografia_transformers.zip",
                "latest_external_link": "https://genially.com/infografia-transformers",
                "created_at": (now - timedelta(days=14)).isoformat() + "Z",
                "updated_at": (now - timedelta(days=2)).isoformat() + "Z",
                "submissions_count": 2,
                "reviews_count": 1
            },
            {
                "id": "res-101-5",
                "course_id": "crs-101",
                "unit_id": "unt-101-1",
                "title": "Montaje en LMS de Unidad 1 y Tarea con Rúbrica",
                "description": "Aula virtual configurada con libro digital, foro y entrega con auto-calificador.",
                "type": "Montaje en Aula",
                "stage": "Montaje LMS",
                "status": "Integrado en LMS",
                "current_version": "v1.0",
                "author_id": "usr-lms",
                "assigned_reviewer_id": "usr-cal",
                "latest_external_link": "https://moodle.universidad.edu/course/view.php?id=301",
                "created_at": (now - timedelta(days=10)).isoformat() + "Z",
                "updated_at": (now - timedelta(days=1)).isoformat() + "Z",
                "submissions_count": 1,
                "reviews_count": 1
            },
            {
                "id": "res-102-1",
                "course_id": "crs-102",
                "unit_id": "unt-102-1",
                "title": "Lectura Fundamental: El Principio de Autonomía en Pacientes Críticos",
                "description": "Texto académico con dilemas reales en cuidados intensivos y marco legal latinoamericano.",
                "type": "Lectura/Texto",
                "stage": "Diseño Instruccional",
                "status": "Requiere Ajustes",
                "current_version": "v1.0",
                "author_id": "usr-doc2",
                "assigned_reviewer_id": "usr-rev",
                "latest_file_url": "/uploads/lectura_autonomia_v1.docx",
                "created_at": (now - timedelta(days=18)).isoformat() + "Z",
                "updated_at": (now - timedelta(days=3)).isoformat() + "Z",
                "submissions_count": 1,
                "reviews_count": 1
            }
        ]

        self.tasks = [
            {
                "id": "tsk-101-1", "course_id": "crs-101", "unit_id": "unt-101-1", "resource_id": "res-101-1",
                "title": "Revisión y Ajuste Pedagógico del Sílabo de IA",
                "description": "Verificar coherencia entre resultados de aprendizaje, criterios de evaluación y créditos.",
                "stage": "Planeación", "role_required": "revisor_pedagogico", "assigned_user_id": "usr-rev",
                "priority": "Alta", "status": "Completada", "due_date": (now - timedelta(days=35)).isoformat() + "Z",
                "completed_at": (now - timedelta(days=35)).isoformat() + "Z", "dependency_task_ids": []
            },
            {
                "id": "tsk-101-2", "course_id": "crs-101", "unit_id": "unt-101-1", "resource_id": "res-101-2",
                "title": "Redacción de Guion para Video de Redes Neuronales",
                "description": "Elaborar la narrativa conceptual, marcas de tiempo y ejemplos prácticos en Python.",
                "stage": "Diseño Instruccional", "role_required": "docente", "assigned_user_id": "usr-doc1",
                "priority": "Alta", "status": "Completada", "due_date": (now - timedelta(days=28)).isoformat() + "Z",
                "completed_at": (now - timedelta(days=26)).isoformat() + "Z", "dependency_task_ids": ["tsk-101-1"]
            },
            {
                "id": "tsk-101-3", "course_id": "crs-101", "unit_id": "unt-101-1", "resource_id": "res-101-2",
                "title": "Validación Instruccional y Aprobación del Guion",
                "description": "Revisar carga cognitiva, tono didáctico y precisión metodológica del guion de video.",
                "stage": "Diseño Instruccional", "role_required": "disenador_instruccional", "assigned_user_id": "usr-di",
                "priority": "Alta", "status": "Completada", "due_date": (now - timedelta(days=24)).isoformat() + "Z",
                "completed_at": (now - timedelta(days=23)).isoformat() + "Z", "dependency_task_ids": ["tsk-101-2"]
            },
            {
                "id": "tsk-101-4", "course_id": "crs-101", "unit_id": "unt-101-1", "resource_id": "res-101-3",
                "title": "Producción y Renderizado de Cápsula de Video",
                "description": "Grabación de locución, animación gráfica de sinapsis y exportación web optimizada.",
                "stage": "Producción Multimedia", "role_required": "productor_multimedia", "assigned_user_id": "usr-mult",
                "priority": "Media", "status": "Completada", "due_date": (now - timedelta(days=15)).isoformat() + "Z",
                "completed_at": (now - timedelta(days=14)).isoformat() + "Z", "dependency_task_ids": ["tsk-101-3"]
            },
            {
                "id": "tsk-101-5", "course_id": "crs-101", "unit_id": "unt-101-2", "resource_id": "res-101-4",
                "title": "Elaboración de Infografía Interactiva sobre Transformers",
                "description": "Diseño visual interactivo en Genially/HTML5 a partir del contenido base.",
                "stage": "Producción Multimedia", "role_required": "productor_multimedia", "assigned_user_id": "usr-mult",
                "priority": "Media", "status": "En Revisión", "due_date": (now + timedelta(days=2)).isoformat() + "Z",
                "dependency_task_ids": ["tsk-101-3"]
            },
            {
                "id": "tsk-101-6", "course_id": "crs-101", "unit_id": "unt-101-1", "resource_id": "res-101-5",
                "title": "Montaje Técnico y Parametrización en LMS Moodle",
                "description": "Crear la estructura de la Unidad 1, enlazar recursos multimedia y configurar calificaciones.",
                "stage": "Montaje LMS", "role_required": "desarrollador_lms", "assigned_user_id": "usr-lms",
                "priority": "Alta", "status": "Completada", "due_date": (now - timedelta(days=2)).isoformat() + "Z",
                "completed_at": (now - timedelta(days=1)).isoformat() + "Z", "dependency_task_ids": ["tsk-101-4"]
            },
            {
                "id": "tsk-101-7", "course_id": "crs-101", "unit_id": "unt-101-1", "resource_id": "res-101-5",
                "title": "Auditoría de Calidad Técnica y Accesibilidad Web (WCAG)",
                "description": "Verificar contraste, subtitulado de videos, enlaces externos, rúbricas y navegación en LMS.",
                "stage": "Control Calidad", "role_required": "auditor_calidad", "assigned_user_id": "usr-cal",
                "priority": "Crítica", "status": "En Proceso", "due_date": (now + timedelta(days=4)).isoformat() + "Z",
                "dependency_task_ids": ["tsk-101-6"]
            },
            {
                "id": "tsk-101-8", "course_id": "crs-101", "unit_id": "unt-101-2", "resource_id": None,
                "title": "Certificación Final y Publicación del Curso",
                "description": "Emisión del acta de conformidad institucional y apertura del aula para estudiantes.",
                "stage": "Control Calidad", "role_required": "coordinador", "assigned_user_id": "usr-coord",
                "priority": "Alta", "status": "Pendiente", "due_date": (now + timedelta(days=15)).isoformat() + "Z",
                "dependency_task_ids": ["tsk-101-7"]
            },
            {
                "id": "tsk-102-1", "course_id": "crs-102", "unit_id": "unt-102-1", "resource_id": "res-102-1",
                "title": "Redacción de Contenido Base: Principio de Autonomía",
                "description": "Desarrollar el texto base con dilemas reales en cuidados intensivos.",
                "stage": "Diseño Instruccional", "role_required": "docente", "assigned_user_id": "usr-doc2",
                "priority": "Alta", "status": "Requiere Ajustes", "due_date": (now - timedelta(days=2)).isoformat() + "Z",
                "dependency_task_ids": []
            },
            {
                "id": "tsk-102-2", "course_id": "crs-102", "unit_id": "unt-102-1", "resource_id": "res-102-1",
                "title": "Revisión Pedagógica y de Citación APA de Lectura",
                "description": "Verificar estilo pedagógico, citas APA 7ma edición y anonimización de casos clínicos.",
                "stage": "Diseño Instruccional", "role_required": "revisor_pedagogico", "assigned_user_id": "usr-rev",
                "priority": "Alta", "status": "Completada", "due_date": (now - timedelta(days=3)).isoformat() + "Z",
                "completed_at": (now - timedelta(days=3)).isoformat() + "Z", "dependency_task_ids": ["tsk-102-1"]
            },
            {
                "id": "tsk-106-1", "course_id": "crs-106", "unit_id": "", "resource_id": None,
                "title": "Entrega y Consolidación del Sílabo de Ciberseguridad",
                "description": "Entrega del documento maestro por parte del docente responsable.",
                "stage": "Planeación", "role_required": "docente", "assigned_user_id": "usr-doc1",
                "priority": "Alta", "status": "En Proceso", "due_date": (now - timedelta(days=6)).isoformat() + "Z",
                "dependency_task_ids": []
            },
            {
                "id": "tsk-106-2", "course_id": "crs-106", "unit_id": "", "resource_id": None,
                "title": "Planificación Instruccional y Cronograma de Prácticas",
                "description": "Definir calendario de grabaciones y requerimientos de laboratorios virtuales.",
                "stage": "Planeación", "role_required": "disenador_instruccional", "assigned_user_id": "usr-di",
                "priority": "Media", "status": "Pendiente", "due_date": (now - timedelta(days=3)).isoformat() + "Z",
                "dependency_task_ids": ["tsk-106-1"]
            }
        ]

        self.submissions = [
            {
                "id": "sub-101-1", "course_id": "crs-101", "task_id": "tsk-101-2", "resource_id": "res-101-2",
                "submitted_by_user_id": "usr-doc1", "version": "v1.0", "submitted_at": (now - timedelta(days=27)).isoformat() + "Z",
                "notes": "Envío el primer borrador del guion de video para revisión.",
                "file_url": "/uploads/guion_video_redes_v1.docx", "file_name": "guion_video_redes_v1.docx", "status": "Con Observaciones"
            },
            {
                "id": "sub-101-2", "course_id": "crs-101", "task_id": "tsk-101-2", "resource_id": "res-101-2",
                "submitted_by_user_id": "usr-doc1", "version": "v2.0", "submitted_at": (now - timedelta(days=25)).isoformat() + "Z",
                "notes": "Versión final ajustada con analogía visual y código Python simplificado.",
                "file_url": "/uploads/guion_video_redes_v2.docx", "file_name": "guion_video_redes_v2.docx", "status": "Aprobada"
            },
            {
                "id": "sub-102-1", "course_id": "crs-102", "task_id": "tsk-102-1", "resource_id": "res-102-1",
                "submitted_by_user_id": "usr-doc2", "version": "v1.0", "submitted_at": (now - timedelta(days=5)).isoformat() + "Z",
                "notes": "Envío el texto formativo sobre el principio de autonomía.",
                "file_url": "/uploads/lectura_autonomia_v1.docx", "file_name": "lectura_autonomia_v1.docx", "status": "Con Observaciones"
            }
        ]

        self.reviews = [
            {
                "id": "rev-101-1", "course_id": "crs-101", "task_id": "tsk-101-2", "resource_id": "res-101-2",
                "submission_id": "sub-101-1", "reviewer_user_id": "usr-rev", "reviewer_role": "revisor_pedagogico",
                "decision": "Requiere Ajustes",
                "feedback": "El tema está excelentemente planteado, pero la densidad matemática en la sección 2 puede desmotivar a los estudiantes. Añadir analogía visual antes de la fórmula.",
                "checklist": [
                    {"item": "Alineación con competencias y resultados de aprendizaje (RAP)", "passed": True, "notes": "Alineado"},
                    {"item": "Rigor conceptual y adecuación pedagógica", "passed": False, "notes": "Demasiada densidad"},
                    {"item": "Cumplimiento de derechos de autor y normas de citación", "passed": True, "notes": "IEEE correcto"},
                    {"item": "Accesibilidad y directrices WCAG", "passed": True, "notes": "Cumple"}
                ],
                "reviewed_at": (now - timedelta(days=26)).isoformat() + "Z"
            },
            {
                "id": "rev-101-2", "course_id": "crs-101", "task_id": "tsk-101-3", "resource_id": "res-101-2",
                "submission_id": "sub-101-2", "reviewer_user_id": "usr-di", "reviewer_role": "disenador_instruccional",
                "decision": "Aprobado",
                "feedback": "¡Excelente ajuste! La incorporación de la analogía con el semáforo y la síntesis en Python quedó perfecta para producción multimedia.",
                "checklist": [
                    {"item": "Alineación con competencias y resultados de aprendizaje (RAP)", "passed": True},
                    {"item": "Rigor conceptual y adecuación pedagógica", "passed": True},
                    {"item": "Cumplimiento de derechos de autor y normas de citación", "passed": True},
                    {"item": "Accesibilidad y directrices WCAG", "passed": True}
                ],
                "reviewed_at": (now - timedelta(days=23)).isoformat() + "Z"
            },
            {
                "id": "rev-102-1", "course_id": "crs-102", "task_id": "tsk-102-1", "resource_id": "res-102-1",
                "submission_id": "sub-102-1", "reviewer_user_id": "usr-rev", "reviewer_role": "revisor_pedagogico",
                "decision": "Requiere Ajustes",
                "feedback": "Faltan las referencias en formato APA 7ma edición en páginas 4 y 7, y se deben anonimizar los casos clínicos conforme a la ley de protección de datos en salud.",
                "checklist": [
                    {"item": "Alineación con competencias y resultados de aprendizaje (RAP)", "passed": True},
                    {"item": "Rigor conceptual y adecuación pedagógica", "passed": False, "notes": "Faltan referencias"},
                    {"item": "Cumplimiento de derechos de autor y normas de citación", "passed": False, "notes": "Revisar APA 7ma"},
                    {"item": "Accesibilidad y directrices WCAG", "passed": True}
                ],
                "reviewed_at": (now - timedelta(days=3)).isoformat() + "Z"
            }
        ]

        self.activity_logs = [
            {"id": "act-1", "course_id": "crs-101", "user_id": "usr-lms", "action": "INTEGRACION_LMS", "description": "Montaje completado de la Unidad 1 en el aula virtual Moodle con libro interactivo y foro.", "timestamp": (now - timedelta(days=1)).isoformat() + "Z"},
            {"id": "act-2", "course_id": "crs-101", "user_id": "usr-mult", "action": "ENTREGA_RECURSO", "description": "Entrega de nueva versión v1.1 de la infografía interactiva de Transformers.", "timestamp": (now - timedelta(days=2)).isoformat() + "Z"},
            {"id": "act-3", "course_id": "crs-102", "user_id": "usr-rev", "action": "OBSERVACION_REGISTRADA", "description": "Revisión pedagógica emitió dictamen 'Requiere Ajustes' en la lectura de Autonomía.", "timestamp": (now - timedelta(days=3)).isoformat() + "Z"},
            {"id": "act-4", "course_id": "crs-101", "user_id": "usr-di", "action": "APROBACION", "description": "Diseño Instruccional aprobó formalmente el Guion de Video de Redes Neuronales v2.0.", "timestamp": (now - timedelta(days=23)).isoformat() + "Z"},
            {"id": "act-5", "course_id": "crs-105", "user_id": "usr-cal", "action": "CERTIFICACION", "description": "Auditoría de Calidad certificó el 100% de los estándares del curso Metodología de la Investigación.", "timestamp": (now - timedelta(days=8)).isoformat() + "Z"}
        ]

        self.recalculate_progress()
