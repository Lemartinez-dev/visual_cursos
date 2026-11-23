-- ==============================================================================
-- VIRTUALIZACORE: ESQUEMA DE BASE DE DATOS EN SUPABASE (POSTGRESQL)
-- Reto de Innovación Tecnológica: Gestión Integral de la Virtualización Académica
-- ==============================================================================

-- 1. Tabla de Usuarios y Especialistas Académicos
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL, -- coordinador, docente, revisor_pedagogico, disenador_instruccional, productor_multimedia, desarrollador_lms, auditor_calidad
    role_display_name TEXT NOT NULL,
    department TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#3B82F6',
    initials TEXT DEFAULT 'US',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Cursos Académicos a Virtualizar
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    faculty TEXT NOT NULL,
    academic_program TEXT NOT NULL,
    period TEXT DEFAULT '2026-I',
    description TEXT,
    modality TEXT DEFAULT '100% Virtual',
    credits INT DEFAULT 3,
    coordinator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    instructional_designer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    pedagogical_reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    multimedia_producer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    lms_developer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    quality_auditor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Planificación', -- Planificación, En Revisión Pedagógica, En Producción Multimedia, En Montaje LMS, Control de Calidad, Publicado, En Riesgo
    progress_percentage NUMERIC(5, 2) DEFAULT 0.0,
    start_date TIMESTAMPTZ,
    target_completion_date TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Unidades Curriculares
CREATE TABLE IF NOT EXISTS academic_units (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pendiente', -- Pendiente, En Desarrollo, En Revisión, Aprobada
    progress_percentage NUMERIC(5, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Insumos y Recursos Académicos
CREATE TABLE IF NOT EXISTS resource_items (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES academic_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- Sílabo, Guion de Video, Lectura/Texto, Presentación Interactiva, Infografía, Video Producido, Actividad/Rúbrica, Montaje en Aula
    stage TEXT NOT NULL, -- Planeación, Diseño Instruccional, Producción Multimedia, Montaje LMS, Control Calidad
    status TEXT DEFAULT 'Pendiente', -- Pendiente, En Elaboración, Entregado, En Revisión, Requiere Ajustes, Aprobado, Integrado en LMS, Certificado Calidad
    current_version TEXT DEFAULT 'v1.0',
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    assigned_reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    latest_file_url TEXT,
    latest_external_link TEXT,
    submissions_count INT DEFAULT 0,
    reviews_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Tareas del Flujo y Dependencias
CREATE TABLE IF NOT EXISTS task_items (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES academic_units(id) ON DELETE SET NULL,
    resource_id TEXT REFERENCES resource_items(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    stage TEXT NOT NULL,
    role_required TEXT NOT NULL,
    assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'Media', -- Alta, Media, Baja, Crítica
    status TEXT DEFAULT 'Pendiente', -- Pendiente, En Proceso, En Revisión, Requiere Ajustes, Completada
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    dependency_task_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_blocked BOOLEAN DEFAULT FALSE,
    blocking_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Entregables (Submissions con trazabilidad de versiones)
CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES task_items(id) ON DELETE SET NULL,
    resource_id TEXT NOT NULL REFERENCES resource_items(id) ON DELETE CASCADE,
    submitted_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    notes TEXT,
    file_url TEXT,
    file_name TEXT,
    external_link TEXT,
    status TEXT DEFAULT 'En Revisión', -- En Revisión, Aprobada, Con Observaciones, Rechazada
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Revisiones y Dictámenes Formales
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES task_items(id) ON DELETE SET NULL,
    resource_id TEXT NOT NULL REFERENCES resource_items(id) ON DELETE CASCADE,
    submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
    reviewer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_role TEXT NOT NULL,
    decision TEXT NOT NULL, -- Aprobado, Requiere Ajustes, Rechazado
    feedback TEXT NOT NULL,
    checklist JSONB DEFAULT '[]'::JSONB,
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bitácora de Trazabilidad y Auditoría
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- CREAR_CURSO, ENTREGA_RECURSO, APROBACION, OBSERVACION_REGISTRADA, etc.
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON task_items(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_course ON task_items(course_id);
CREATE INDEX IF NOT EXISTS idx_resources_course ON resource_items(course_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resource_items(status);
CREATE INDEX IF NOT EXISTS idx_logs_course ON activity_logs(course_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para prototipo
CREATE POLICY "Acceso público lectura users" ON users FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura academic_units" ON academic_units FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura resource_items" ON resource_items FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura task_items" ON task_items FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura submissions" ON submissions FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Acceso público lectura activity_logs" ON activity_logs FOR SELECT USING (true);

-- Políticas de inserción y modificación
CREATE POLICY "Acceso público escritura courses" ON courses FOR ALL USING (true);
CREATE POLICY "Acceso público escritura task_items" ON task_items FOR ALL USING (true);
CREATE POLICY "Acceso público escritura resource_items" ON resource_items FOR ALL USING (true);
CREATE POLICY "Acceso público escritura submissions" ON submissions FOR ALL USING (true);
CREATE POLICY "Acceso público escritura reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "Acceso público escritura activity_logs" ON activity_logs FOR ALL USING (true);
