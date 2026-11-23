// VirtualizaCore - React 18 Application (Frontend)
// Architecture: React SPA + Python MVC Backend

const { useState, useEffect, useRef, useCallback } = React;

const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) 
    ? window.__API_BASE__.replace(/\/$/, '') 
    : '/api';

const DEMO_USERS_FALLBACK = [
    { id: "usr-coord", name: "Mg. Carlos Mendoza", email: "carlos.mendoza@edu.lat", role: "coordinador", role_display_name: "Coordinador de Virtualización", department: "Dirección de Educación Virtual", avatar_color: "#4F46E5", initials: "CM" },
    { id: "usr-doc1", name: "Dra. Elena Ramos", email: "elena.ramos@edu.lat", role: "docente", role_display_name: "Docente Experta (Ingeniería)", department: "Facultad de Ingeniería", avatar_color: "#059669", initials: "ER" },
    { id: "usr-doc2", name: "Dr. Andrés Gómez", email: "andres.gomez@edu.lat", role: "docente", role_display_name: "Docente Experto (Salud)", department: "Facultad de Ciencias de la Salud", avatar_color: "#0D9488", initials: "AG" },
    { id: "usr-rev", name: "Lic. Claudia Morales", email: "claudia.morales@edu.lat", role: "revisor_pedagogico", role_display_name: "Revisora Pedagógica", department: "Centro de Innovación Pedagógica", avatar_color: "#D97706", initials: "CM" },
    { id: "usr-di", name: "Esp. Javier Ortiz", email: "javier.ortiz@edu.lat", role: "disenador_instruccional", role_display_name: "Diseñador Instruccional", department: "Unidad de Tecnologías Educativas", avatar_color: "#2563EB", initials: "JO" },
    { id: "usr-mult", name: "Mateo Vargas", email: "mateo.vargas@edu.lat", role: "productor_multimedia", role_display_name: "Productor Multimedia", department: "Laboratorio de Medios Digitales", avatar_color: "#7C3AED", initials: "MV" },
    { id: "usr-lms", name: "Ing. Sofía Castro", email: "sofia.castro@edu.lat", role: "desarrollador_lms", role_display_name: "Desarrollador de Entornos Virtuales (LMS)", department: "Campus Virtual TI", avatar_color: "#DB2777", initials: "SC" },
    { id: "usr-cal", name: "Mg. Patricia Vega", email: "patricia.vega@edu.lat", role: "auditor_calidad", role_display_name: "Auditora de Calidad Académica", department: "Acreditación y Calidad Institucional", avatar_color: "#DC2626", initials: "PV" }
];

// Main App Component
function App() {
    // Auth Session State
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        try {
            return !!localStorage.getItem('virtualizacore_session');
        } catch {
            return false;
        }
    });
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('virtualizacore_session');
            return saved ? JSON.parse(saved).user : null;
        } catch {
            return null;
        }
    });

    const [currentView, setCurrentView] = useState('dashboard');
    const [users, setUsers] = useState(DEMO_USERS_FALLBACK);
    const [dashboard, setDashboard] = useState(null);
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [courseDetail, setCourseDetail] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [resources, setResources] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);

    // Tasks filter state
    const [filterOnlyMyTasks, setFilterOnlyMyTasks] = useState(false);
    const [tasksViewMode, setTasksViewMode] = useState('kanban'); // 'kanban' | 'table'

    // Modals state
    const [deliverableModal, setDeliverableModal] = useState({ open: false, resourceId: null, taskId: null });
    const [reviewModal, setReviewModal] = useState({ open: false, resourceId: null, taskId: null });
    const [newCourseModal, setNewCourseModal] = useState(false);
    const [newTaskModal, setNewTaskModal] = useState({ open: false, courseId: null });

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
    };

    // API helper
    const apiCall = async (url, options = {}) => {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
        const res = await fetch(fullUrl, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || `Error ${res.status}`);
        }
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) return await res.json();
        return null;
    };

    // Initial Data Fetch
    const loadAllData = useCallback(async () => {
        try {
            const [uList, dash, cList, tList, rList, lList] = await Promise.all([
                apiCall('/users'),
                apiCall('/dashboard/summary'),
                apiCall('/courses'),
                apiCall('/tasks'),
                apiCall('/resources'),
                apiCall('/activity-logs')
            ]);
            setUsers(uList);
            // Verify current session against live users
            try {
                const saved = localStorage.getItem('virtualizacore_session');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.user) {
                        const matched = uList.find(u => u.id === parsed.user.id) || parsed.user;
                        setCurrentUser(matched);
                        setIsAuthenticated(true);
                    }
                }
            } catch (e) {}
            setDashboard(dash);
            setCourses(cList);
            setTasks(tList);
            setResources(rList);
            setActivityLogs(lList);
        } catch (err) {
            showToast("Error cargando datos: " + err.message, "error");
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, []);

    // Auth Handlers
    const handleLoginSuccess = (user, token) => {
        try {
            localStorage.setItem('virtualizacore_session', JSON.stringify({ user, token }));
        } catch (e) {}
        setCurrentUser(user);
        setIsAuthenticated(true);
        showToast(`Bienvenido a VirtualizaCore, ${user.name}`, 'success');
    };

    const handleLogout = () => {
        try {
            localStorage.removeItem('virtualizacore_session');
        } catch (e) {}
        setIsAuthenticated(false);
        setCurrentUser(null);
        showToast("Sesión cerrada correctamente", "info");
    };

    // Course detail loader
    const openCourseDetail = async (courseId) => {
        try {
            setSelectedCourseId(courseId);
            const data = await apiCall(`/courses/${courseId}`);
            setCourseDetail(data);
            setCurrentView('course-detail');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            showToast("Error al abrir curso: " + err.message, "error");
        }
    };

    // Task status advancement
    const advanceTaskStatus = async (taskId, newStatus) => {
        try {
            await apiCall(`/tasks/${taskId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            showToast(`Tarea actualizada a '${newStatus}'`, 'success');
            await loadAllData();
            if (selectedCourseId) {
                const refreshed = await apiCall(`/courses/${selectedCourseId}`);
                setCourseDetail(refreshed);
            }
        } catch (err) {
            showToast("Error: " + err.message, "error");
        }
    };

    // Role switcher
    const handleRoleChange = (userId) => {
        const found = users.find(u => u.id === userId);
        if (found) {
            setCurrentUser(found);
            try {
                const currentSession = JSON.parse(localStorage.getItem('virtualizacore_session') || '{}');
                localStorage.setItem('virtualizacore_session', JSON.stringify({ ...currentSession, user: found }));
            } catch (e) {}
            showToast(`Rol activo: ${found.role_display_name} (${found.name})`, 'info');
        }
    };

    // Reset Demo
    const handleResetDemo = async () => {
        if (!confirm("¿Desea restaurar los datos al estado original del reto?")) return;
        try {
            await apiCall('/system/reset-demo', { method: 'POST' });
            showToast("Datos restaurados correctamente", "info");
            await loadAllData();
            setCurrentView('dashboard');
        } catch (err) {
            showToast("Error al restaurar: " + err.message, "error");
        }
    };

    // Unauthenticated View: Render Login Portal
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
                <LoginView
                    users={users}
                    onLoginSuccess={handleLoginSuccess}
                    showToast={showToast}
                />
                {/* Notification Toast */}
                <div className={`fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center space-x-3 z-50 transform transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
                    <i className={`fa-solid text-base ${toast.type === 'error' ? 'fa-circle-exclamation text-rose-400' : toast.type === 'info' ? 'fa-circle-info text-blue-400' : 'fa-circle-check text-emerald-400'}`}></i>
                    <span className="font-medium">{toast.message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col">
            {/* Header / Navigation */}
            <Header
                currentView={currentView}
                setCurrentView={setCurrentView}
                users={users}
                currentUser={currentUser}
                onRoleChange={handleRoleChange}
                tasksCount={tasks.filter(t => t.assigned_user_id === currentUser?.id && t.status !== 'Completada').length}
                onResetDemo={handleResetDemo}
                onLogout={handleLogout}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {currentView === 'dashboard' && (
                    <DashboardView
                        dashboard={dashboard}
                        courses={courses}
                        users={users}
                        onOpenCourse={openCourseDetail}
                        onNewCourse={() => setNewCourseModal(true)}
                    />
                )}

                {currentView === 'courses' && (
                    <CoursesView
                        courses={courses}
                        users={users}
                        onOpenCourse={openCourseDetail}
                        onNewCourse={() => setNewCourseModal(true)}
                    />
                )}

                {currentView === 'course-detail' && courseDetail && (
                    <CourseDetailView
                        detail={courseDetail}
                        users={users}
                        onBack={() => setCurrentView('courses')}
                        onAdvanceTask={advanceTaskStatus}
                        onNewTask={(cId) => setNewTaskModal({ open: true, courseId: cId })}
                        onSubmitDeliverable={(tId, rId) => setDeliverableModal({ open: true, taskId: tId, resourceId: rId })}
                        onReviewResource={(rId, tId) => setReviewModal({ open: true, resourceId: rId, taskId: tId })}
                    />
                )}

                {currentView === 'tasks' && (
                    <TasksView
                        tasks={tasks}
                        courses={courses}
                        users={users}
                        currentUser={currentUser}
                        filterOnlyMyTasks={filterOnlyMyTasks}
                        setFilterOnlyMyTasks={setFilterOnlyMyTasks}
                        viewMode={tasksViewMode}
                        setViewMode={setTasksViewMode}
                        onAdvanceTask={advanceTaskStatus}
                        onNewTask={() => setNewTaskModal({ open: true, courseId: null })}
                        onSubmitDeliverable={(tId, rId) => setDeliverableModal({ open: true, taskId: tId, resourceId: rId })}
                        onReviewResource={(rId, tId) => setReviewModal({ open: true, resourceId: rId, taskId: tId })}
                    />
                )}

                {currentView === 'resources' && (
                    <ResourcesView
                        resources={resources}
                        courses={courses}
                        users={users}
                        onSubmitDeliverable={() => setDeliverableModal({ open: true, resourceId: null, taskId: null })}
                        onReviewResource={(rId) => setReviewModal({ open: true, resourceId: rId, taskId: null })}
                    />
                )}

                {currentView === 'reviews' && (
                    <ReviewsView
                        resources={resources}
                        courses={courses}
                        users={users}
                        onReviewResource={(rId) => setReviewModal({ open: true, resourceId: rId, taskId: null })}
                        onSubmitCorrection={(rId) => setDeliverableModal({ open: true, resourceId: rId, taskId: null })}
                    />
                )}

                {currentView === 'timeline' && (
                    <TimelineView
                        logs={activityLogs}
                        courses={courses}
                        users={users}
                    />
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span><strong>VirtualizaCore</strong> &copy; 2026 - Solución al Reto de Innovación Tecnológica (Gestión Integral de la Virtualización Académica).</span>
                    <span className="text-slate-400 font-mono text-[11px]">Arquitectura: Backend Python 3.12 (MVC) + Frontend React 18 SPA</span>
                </div>
            </footer>

            {/* Modals */}
            {deliverableModal.open && (
                <DeliverableModal
                    resources={resources}
                    tasks={tasks}
                    courses={courses}
                    currentUser={currentUser}
                    selectedResourceId={deliverableModal.resourceId}
                    selectedTaskId={deliverableModal.taskId}
                    onClose={() => setDeliverableModal({ open: false, resourceId: null, taskId: null })}
                    onSuccess={async () => {
                        setDeliverableModal({ open: false, resourceId: null, taskId: null });
                        showToast("Entrega registrada con éxito", "success");
                        await loadAllData();
                        if (selectedCourseId) openCourseDetail(selectedCourseId);
                    }}
                />
            )}

            {reviewModal.open && (
                <ReviewModal
                    resources={resources}
                    tasks={tasks}
                    courses={courses}
                    currentUser={currentUser}
                    selectedResourceId={reviewModal.resourceId}
                    selectedTaskId={reviewModal.taskId}
                    onClose={() => setReviewModal({ open: false, resourceId: null, taskId: null })}
                    onSuccess={async (decision) => {
                        setReviewModal({ open: false, resourceId: null, taskId: null });
                        showToast(`Dictamen '${decision}' registrado formalmente`, "success");
                        await loadAllData();
                        if (selectedCourseId) openCourseDetail(selectedCourseId);
                    }}
                />
            )}

            {newCourseModal && (
                <NewCourseModal
                    users={users}
                    currentUser={currentUser}
                    onClose={() => setNewCourseModal(false)}
                    onSuccess={async (createdCourse) => {
                        setNewCourseModal(false);
                        showToast(`Curso '${createdCourse.code}' creado con éxito`, "success");
                        await loadAllData();
                        openCourseDetail(createdCourse.id);
                    }}
                />
            )}

            {newTaskModal.open && (
                <NewTaskModal
                    courses={courses}
                    users={users}
                    tasks={tasks}
                    defaultCourseId={newTaskModal.courseId}
                    onClose={() => setNewTaskModal({ open: false, courseId: null })}
                    onSuccess={async () => {
                        setNewTaskModal({ open: false, courseId: null });
                        showToast("Tarea creada y asignada en el flujo", "success");
                        await loadAllData();
                        if (selectedCourseId) openCourseDetail(selectedCourseId);
                    }}
                />
            )}

            {/* Notification Toast */}
            <div className={`fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center space-x-3 z-50 transform transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
                <i className={`fa-solid text-base ${toast.type === 'error' ? 'fa-circle-exclamation text-rose-400' : toast.type === 'info' ? 'fa-circle-info text-blue-400' : 'fa-circle-check text-emerald-400'}`}></i>
                <span className="font-medium">{toast.message}</span>
            </div>
        </div>
    );
}

// Login View Component (Portal de Acceso Institucional)
function LoginView({ users, onLoginSuccess, showToast }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');
        if (!email.trim()) {
            setErrorMsg('Por favor ingrese su correo institucional');
            return;
        }
        if (!password) {
            setErrorMsg('Por favor ingrese su contraseña');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || `Error de autenticación (${res.status})`);
            }
            const data = await res.json();
            onLoginSuccess(data.user, data.token);
        } catch (err) {
            setErrorMsg(err.message || 'Error al validar credenciales');
        } finally {
            setLoading(false);
        }
    };

    const handleFastLogin = async (user) => {
        setEmail(user.email);
        setPassword('virtualiza2026');
        setErrorMsg('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: 'virtualiza2026' })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || `Error de autenticación (${res.status})`);
            }
            const data = await res.json();
            onLoginSuccess(data.user, data.token);
        } catch (err) {
            setErrorMsg(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const safeUsers = users && users.length > 0 ? users : [];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-indigo-500 selection:text-white">
            {/* Top Institutional Header */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <i className="fa-solid fa-graduation-cap text-lg"></i>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">VirtualizaCore</span>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono font-bold">Python MVC + React</span>
                            </div>
                            <p className="text-[11px] text-slate-400 hidden sm:block">Plataforma de Gestión Integral de la Virtualización Académica</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                        <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                            Supabase Cloud DB Activo
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                            v2.4 Prototipo
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Auth Section */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
                {/* Hero Title */}
                <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>Reto de Innovación Tecnológica | Acceso Institucional</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        Portal de Acceso y Gestión de Roles
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-slate-400">
                        Centralice y coordine todo el ciclo de virtualización de asignaturas: desde la entrega de guiones docentes hasta la producción multimedia, revisión pedagógica y montaje en LMS.
                    </p>
                </div>

                {/* Grid: Form (Col 5) + Fast Access Profiles (Col 7) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Column 1: Login Form Card */}
                    <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                        
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                                    <i className="fa-solid fa-key text-blue-400"></i>
                                    <span>Iniciar Sesión</span>
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">Ingrese con sus credenciales institucionales</p>
                            </div>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-400/30 font-semibold">
                                Auth REST API
                            </span>
                        </div>

                        {errorMsg && (
                            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5 animate-fade-in">
                                <i className="fa-solid fa-circle-exclamation text-rose-400 text-base flex-shrink-0"></i>
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Correo Institucional
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <i className="fa-solid fa-envelope text-xs"></i>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ej: carlos.mendoza@edu.lat"
                                        required
                                        className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Contraseña
                                    </label>
                                    <span className="text-[10px] text-slate-400">
                                        (Demo: <code className="text-indigo-300 font-mono">virtualiza2026</code>)
                                    </span>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <i className="fa-solid fa-lock text-xs"></i>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                                    >
                                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-xs">
                                <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-[11px]">Recordar sesión</span>
                                </label>
                                <span className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer" onClick={() => setPassword('virtualiza2026')}>
                                    Autocompletar clave
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                        <span>Validando credenciales...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-right-to-bracket"></i>
                                        <span>Ingresar a VirtualizaCore</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
                            <div className="flex items-start space-x-2">
                                <i className="fa-solid fa-shield-check text-emerald-400 mt-0.5 text-xs"></i>
                                <span>Sesión protegida por token JWT simulado y persistencia local.</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <i className="fa-solid fa-bolt text-amber-400 mt-0.5 text-xs"></i>
                                <span>También puede ingresar en 1 clic seleccionando cualquiera de los perfiles de prueba.</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Fast-Access Profiles (8 Roles from Challenge) */}
                    <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                                    <i className="fa-solid fa-users-viewfinder text-indigo-400"></i>
                                    <span>Acceso Rápido por Perfil Especializado</span>
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Haga clic en un especialista para ingresar automáticamente con su rol, tareas asignadas y permisos del reto:
                                </p>
                            </div>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-400/30 font-semibold hidden sm:inline">
                                8 Roles
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {safeUsers.map((u) => (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => handleFastLogin(u)}
                                    className="text-left p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/90 hover:border-indigo-500/60 transition group flex items-start space-x-3 relative overflow-hidden cursor-pointer"
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md group-hover:scale-105 transition"
                                        style={{ backgroundColor: u.avatar_color || '#3b82f6' }}
                                    >
                                        {u.initials || 'US'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition truncate">
                                                {u.name}
                                            </div>
                                            <i className="fa-solid fa-chevron-right text-[10px] text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition flex-shrink-0 ml-1"></i>
                                        </div>
                                        <div className="text-[11px] text-indigo-300 font-medium truncate mt-0.5">
                                            {u.role_display_name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                            {u.department}
                                        </div>
                                        <div className="text-[9px] text-slate-500 font-mono truncate mt-0.5">
                                            {u.email}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Workflow Badges */}
                        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">Flujo del Proceso:</span>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-blue-300 border border-slate-700">1. Silabo & Guión</span>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-purple-300 border border-slate-700">2. Multimedia</span>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 border border-slate-700">3. Revisión</span>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300 border border-slate-700">4. LMS & Calidad</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Value Props */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-folder-tree text-sm"></i>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white">Centralización Integral</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Consolida guiones, presentaciones, videos y SCORM en un repositorio trazable evitando pérdidas en correos.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-arrows-split-up-and-left text-sm"></i>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white">Control de Dependencias</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Bloquea automáticamente fases posteriores hasta que los insumos previos obtengan dictamen pedagógico favorable.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-chart-line text-sm"></i>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white">Métricas & Cuellos de Botella</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Tableros dinámicos en tiempo real con cálculo ponderado de avance y alertas tempranas de retrasos.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span><strong>VirtualizaCore</strong> &copy; 2026 - Solución al Reto de Innovación Tecnológica.</span>
                    <span className="font-mono text-[11px] text-slate-400">
                        Arquitectura MVC: Python 3.12 (FastAPI) + React 18 + Supabase PostgreSQL
                    </span>
                </div>
            </footer>
        </div>
    );
}

// Header Component
function Header({ currentView, setCurrentView, users, currentUser, onRoleChange, tasksCount, onResetDemo, onLogout }) {
    return (
        <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand */}
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <i className="fa-solid fa-graduation-cap text-lg"></i>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">VirtualizaCore</span>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono font-bold">Python MVC + React</span>
                            </div>
                            <p className="text-xs text-slate-400 hidden sm:block">Plataforma de Gestión Integral de la Virtualización Académica</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex space-x-1">
                        <button onClick={() => setCurrentView('dashboard')} className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${currentView === 'dashboard' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                            <i className="fa-solid fa-chart-pie text-blue-400"></i>
                            <span>Dashboard & KPIs</span>
                        </button>
                        <button onClick={() => setCurrentView('courses')} className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${currentView === 'courses' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                            <i className="fa-solid fa-book-bookmark text-emerald-400"></i>
                            <span>Portafolio</span>
                        </button>
                        <button onClick={() => setCurrentView('tasks')} className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${currentView === 'tasks' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                            <i className="fa-solid fa-list-check text-indigo-400"></i>
                            <span>Mi Bandeja</span>
                            {tasksCount > 0 && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">{tasksCount}</span>}
                        </button>
                        <button onClick={() => setCurrentView('resources')} className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${currentView === 'resources' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                            <i className="fa-solid fa-folder-tree text-amber-400"></i>
                            <span>Insumos & Entregas</span>
                        </button>
                        <button onClick={() => setCurrentView('reviews')} className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${currentView === 'reviews' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                            <i className="fa-solid fa-clipboard-check text-rose-400"></i>
                            <span>Revisiones & Calidad</span>
                        </button>
                        <button onClick={() => setCurrentView('timeline')} className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${currentView === 'timeline' ? 'bg-blue-600/30 text-white border border-blue-500/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                            <i className="fa-solid fa-timeline text-purple-400"></i>
                            <span>Trazabilidad</span>
                        </button>
                    </nav>

                    {/* Role Switcher & User Profile */}
                    <div className="flex items-center space-x-3">
                        <div className="hidden lg:flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 font-medium">Simular Rol Evaluador:</span>
                            <select
                                value={currentUser?.id || ''}
                                onChange={(e) => onRoleChange(e.target.value)}
                                className="bg-slate-800 text-white text-xs rounded-lg border border-slate-700 px-2.5 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                            >
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role_display_name})</option>
                                ))}
                            </select>
                        </div>

                        {/* Avatar */}
                        <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: currentUser?.avatar_color || '#3b82f6' }}>
                                {currentUser?.initials || 'US'}
                            </div>
                            <div className="hidden sm:block text-left">
                                <div className="text-xs font-semibold leading-tight">{currentUser?.name}</div>
                                <div className="text-[10px] text-blue-400">{currentUser?.role_display_name}</div>
                            </div>
                        </div>

                        {/* Reset Demo Button */}
                        <button onClick={onResetDemo} title="Restaurar datos de prueba" className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition text-sm">
                            <i className="fa-solid fa-arrows-rotate"></i>
                        </button>

                        {/* Logout Button */}
                        <button 
                            onClick={onLogout} 
                            title="Cerrar sesión" 
                            className="bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500/50 transition text-xs font-semibold flex items-center space-x-1.5"
                        >
                            <i className="fa-solid fa-right-from-bracket text-rose-400"></i>
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Role Context Notification Banner */}
            <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 border-t border-b border-indigo-700/50 py-1.5 px-4 text-xs text-center flex items-center justify-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    <i className="fa-solid fa-user-gear mr-1"></i> Modo Simulación Activo
                </span>
                <span className="text-slate-300">
                    Viendo la plataforma como <strong>{currentUser?.name} ({currentUser?.role_display_name})</strong>. Evaluando permisos de: {currentUser?.department}.
                </span>
            </div>
        </header>
    );
}

// Dashboard View Component
function DashboardView({ dashboard, courses, users, onOpenCourse, onNewCourse }) {
    const chartBottlenecksRef = useRef(null);
    const chartStatusRef = useRef(null);
    const chartInstances = useRef({});

    useEffect(() => {
        if (!dashboard) return;

        // Bottlenecks Chart
        if (chartBottlenecksRef.current && dashboard.bottlenecks) {
            if (chartInstances.current.bottlenecks) chartInstances.current.bottlenecks.destroy();
            chartInstances.current.bottlenecks = new Chart(chartBottlenecksRef.current, {
                type: 'bar',
                data: {
                    labels: dashboard.bottlenecks.map(b => b.stage),
                    datasets: [
                        { label: 'Tareas Activas / En Proceso', data: dashboard.bottlenecks.map(b => b.pending_items), backgroundColor: '#6366f1', borderRadius: 4 },
                        { label: 'Tareas Vencidas / Retrasadas', data: dashboard.bottlenecks.map(b => b.overdue_items), backgroundColor: '#ef4444', borderRadius: 4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
                }
            });
        }

        // Status Chart
        if (chartStatusRef.current) {
            if (chartInstances.current.status) chartInstances.current.status.destroy();
            chartInstances.current.status = new Chart(chartStatusRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['Publicado', 'Montaje/Calidad', 'Revisión Pedagógica', 'En Riesgo'],
                    datasets: [{
                        data: [
                            dashboard.published_courses || 1,
                            (dashboard.in_production_courses || 2),
                            dashboard.in_review_courses || 2,
                            dashboard.at_risk_courses || 1
                        ],
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { display: false } }
                }
            });
        }

        return () => {
            if (chartInstances.current.bottlenecks) chartInstances.current.bottlenecks.destroy();
            if (chartInstances.current.status) chartInstances.current.status.destroy();
        };
    }, [dashboard]);

    if (!dashboard) return <div className="text-center py-12 text-slate-400">Cargando métricas...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cuadro de Mando Integral (KPIs)</h1>
                    <p className="text-sm text-slate-500">Monitoreo en tiempo real del flujo de virtualización, cuellos de botella y balance de carga de trabajo.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={onNewCourse} className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                        <i className="fa-solid fa-plus mr-2"></i> Nuevo Curso a Virtualizar
                    </button>
                    <button onClick={() => window.print()} className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition">
                        <i className="fa-solid fa-print mr-2 text-slate-500"></i> Imprimir Reporte
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avance Promedio Portafolio</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <i className="fa-solid fa-chart-line text-sm"></i>
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-slate-900">{dashboard.global_average_progress}%</span>
                        <span className="text-xs text-emerald-600 font-semibold"><i className="fa-solid fa-arrow-trend-up"></i> +4.2% esta sem.</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" style={{ width: `${dashboard.global_average_progress}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{dashboard.total_courses} cursos activos en simultáneo</p>
                </div>

                {/* KPI 2 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cursos en Riesgo</span>
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                            <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-rose-600">{dashboard.at_risk_courses}</span>
                        <span className="text-xs text-rose-500 font-medium">Requieren intervención</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-600 flex items-center space-x-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>{dashboard.overdue_tasks} tareas con fecha límite vencida</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Detección automática de retrasos</p>
                </div>

                {/* KPI 3 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Insumos Certificados</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <i className="fa-solid fa-circle-check text-sm"></i>
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-slate-900">{dashboard.approved_resources}</span>
                        <span className="text-xs text-slate-500 font-medium">de {dashboard.total_resources} totales</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${dashboard.total_resources > 0 ? (dashboard.approved_resources / dashboard.total_resources) * 100 : 0}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Guiones, videos y aulas aprobadas</p>
                </div>

                {/* KPI 4 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pendientes de Dictamen</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <i className="fa-solid fa-hourglass-half text-sm"></i>
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                        <span className="text-3xl font-extrabold text-amber-600">{dashboard.pending_reviews_count}</span>
                        <span className="text-xs text-slate-500 font-medium">en cola de revisión</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-600 flex items-center space-x-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>{dashboard.blocked_tasks} tareas en espera de insumos</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Dependencias bloqueadas activas</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Diagnóstico de Cuellos de Botella por Etapa del Flujo</h2>
                            <p className="text-xs text-slate-500">Mide tareas activas vs. tareas retrasadas por cada fase del proceso de virtualización.</p>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-200">Fases del Reto</span>
                    </div>
                    <div className="mt-4 h-64">
                        <canvas ref={chartBottlenecksRef}></canvas>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="pb-3 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">Estado del Portafolio</h2>
                            <p className="text-xs text-slate-500">Distribución de cursos por fase actual</p>
                        </div>
                        <div className="mt-4 h-56 flex items-center justify-center">
                            <canvas ref={chartStatusRef}></canvas>
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span> Publicados / 100%</span>
                            <strong>{dashboard.published_courses}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span> En Montaje / Calidad</span>
                            <strong>{dashboard.in_production_courses}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span> En Contenido / Revisión</span>
                            <strong>{dashboard.in_review_courses}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-rose-500 mr-2"></span> En Riesgo de Retraso</span>
                            <strong className="text-rose-600">{dashboard.at_risk_courses}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Multi-Course Progress Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Seguimiento Integral de Cursos Simultáneos</h2>
                        <p className="text-xs text-slate-500">Vista consolidada del avance, tareas pendientes y estado de alerta de cada curso.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Código y Nombre</th>
                                <th className="px-4 py-3">Facultad</th>
                                <th className="px-4 py-3">Fase Actual</th>
                                <th className="px-4 py-3 text-center">Avance</th>
                                <th className="px-4 py-3 text-center">Pendientes</th>
                                <th className="px-4 py-3 text-center">Bloqueadas</th>
                                <th className="px-4 py-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dashboard.courses_progress?.map(c => (
                                <tr key={c.course_id} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-3">
                                        <div className="font-bold text-slate-900 cursor-pointer hover:text-blue-600" onClick={() => onOpenCourse(c.course_id)}>{c.title}</div>
                                        <div className="text-[11px] text-slate-400 font-mono">{c.code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">{c.faculty}</td>
                                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${c.progress_percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{c.progress_percentage}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.pending_tasks > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {c.pending_tasks}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {c.blocked_tasks > 0 ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                                <i className="fa-solid fa-lock mr-1 text-[10px]"></i> {c.blocked_tasks}
                                            </span>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => onOpenCourse(c.course_id)} className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-medium px-2.5 py-1 rounded-md transition border border-slate-200">
                                            Gestionar &rarr;
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Workload Grid */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">Matriz de Capacidad y Carga de Trabajo por Rol</h2>
                    <p className="text-xs text-slate-500">Distribución de tareas activas para prevenir sobrecargas entre docentes, diseñadores y productores.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {dashboard.user_workloads?.map(w => {
                        const userObj = users.find(u => u.id === w.user_id);
                        return (
                            <div key={w.user_id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition">
                                <div className="flex items-center space-x-3 mb-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: userObj?.avatar_color || '#4F46E5' }}>
                                        {userObj?.initials || 'US'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-xs font-bold text-slate-900 truncate">{w.user_name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{w.role}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-200/60">
                                    <span className="text-slate-500">Activas: <strong className="text-slate-800">{w.pending_tasks}</strong></span>
                                    <span className="text-slate-500">Hechas: <strong className="text-emerald-600">{w.completed_tasks}</strong></span>
                                    {w.overdue_tasks > 0 ? (
                                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                                            <i className="fa-solid fa-triangle-exclamation"></i> {w.overdue_tasks}
                                        </span>
                                    ) : <span className="text-slate-400 text-[10px]">Al día</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Courses View Component
function CoursesView({ courses, users, onOpenCourse, onNewCourse }) {
    const [search, setSearch] = useState('');
    const [faculty, setFaculty] = useState('');
    const [status, setStatus] = useState('');

    const filtered = courses.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase());
        const matchesFaculty = !faculty || c.faculty.includes(faculty);
        const matchesStatus = !status || c.status === status;
        return matchesSearch && matchesFaculty && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Portafolio de Cursos Académicos</h1>
                    <p className="text-sm text-slate-500">Gestión de asignaturas en proceso de diseño, guionización, producción y montaje virtual.</p>
                </div>
                <button onClick={onNewCourse} className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                    <i className="fa-solid fa-plus mr-2"></i> Nuevo Curso
                </button>
            </div>

            {/* Filter bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs"></i>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o código..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2">
                        <option value="">Todas las Facultades</option>
                        <option value="Ingeniería">Facultad de Ingeniería</option>
                        <option value="Salud">Facultad de Ciencias de la Salud</option>
                        <option value="Empresariales">Facultad de Ciencias Empresariales</option>
                        <option value="Artes">Facultad de Artes y Diseño</option>
                        <option value="Humanidades">Facultad de Humanidades</option>
                    </select>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2">
                        <option value="">Todos los Estados</option>
                        <option value="Planificación">Planificación</option>
                        <option value="En Revisión Pedagógica">En Revisión Pedagógica</option>
                        <option value="En Producción Multimedia">En Producción Multimedia</option>
                        <option value="En Montaje LMS">En Montaje LMS</option>
                        <option value="Control de Calidad">Control de Calidad</option>
                        <option value="Publicado">Publicado</option>
                        <option value="En Riesgo">En Riesgo</option>
                    </select>
                </div>
            </div>

            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => {
                    const teacher = users.find(u => u.id === c.teacher_id)?.name || 'Docente Asignado';
                    const designer = users.find(u => u.id === c.instructional_designer_id)?.name || 'Diseñador Asignado';
                    return (
                        <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{c.code}</span>
                                    <StatusBadge status={c.status} />
                                </div>
                                <h3 className="font-bold text-base text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition" onClick={() => onOpenCourse(c.id)}>
                                    {c.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                    <div className="flex items-center text-slate-500"><i className="fa-solid fa-graduation-cap w-4 text-slate-400"></i><span className="truncate ml-1.5">{c.faculty}</span></div>
                                    <div className="flex items-center text-slate-500"><i className="fa-solid fa-chalkboard-user w-4 text-blue-500"></i><span className="truncate ml-1.5 font-medium text-slate-700">{teacher}</span></div>
                                    <div className="flex items-center text-slate-500"><i className="fa-solid fa-compass-drafting w-4 text-indigo-500"></i><span className="truncate ml-1.5">{designer}</span></div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                                <div className="flex justify-between items-center text-xs mb-1.5">
                                    <span className="font-medium text-slate-600">Avance de Virtualización</span>
                                    <strong className="font-bold text-slate-800">{c.progress_percentage}%</strong>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-3">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" style={{ width: `${c.progress_percentage}%` }}></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400"><i className="fa-regular fa-clock mr-1"></i> Periodo {c.period}</span>
                                    <button onClick={() => onOpenCourse(c.id)} className="text-xs bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 font-semibold px-3 py-1.5 rounded-lg shadow-sm transition">
                                        Gestionar Flujo &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Course Detail View Component
function CourseDetailView({ detail, users, onBack, onAdvanceTask, onNewTask, onSubmitDeliverable, onReviewResource }) {
    const [activeTab, setActiveTab] = useState('units');
    const { course, units, tasks, resources, team, recent_logs } = detail;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Back */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600">
                    <i className="fa-solid fa-arrow-left mr-2"></i> Volver al Portafolio
                </button>
                <div className="flex items-center space-x-2">
                    <button onClick={() => onNewTask(course.id)} className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm">
                        <i className="fa-solid fa-plus mr-1.5"></i> Asignar Tarea
                    </button>
                </div>
            </div>

            {/* Course Banner */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">{course.code}</span>
                            <span className="text-xs font-medium text-slate-500">{course.period} • {course.modality} • {course.credits} Créditos</span>
                            <StatusBadge status={course.status} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
                        <p className="text-xs text-slate-500 max-w-3xl">{course.description}</p>
                        <p className="text-xs text-indigo-700 font-medium pt-1">{course.faculty} | {course.academic_program}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center min-w-[140px]">
                        <span className="text-xs text-slate-500 block">Avance del Curso</span>
                        <strong className="text-3xl font-extrabold text-blue-600 block mt-1">{course.progress_percentage}%</strong>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${course.progress_percentage}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflow Pipeline Stepper */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center">
                    <i className="fa-solid fa-diagram-project mr-2 text-indigo-600"></i> Flujo Secuencial de Etapas y Dependencias
                </h3>
                <StageStepper status={course.status} />
            </div>

            {/* Sub-tabs Navigation */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-4">
                    <nav className="flex space-x-4">
                        <button onClick={() => setActiveTab('units')} className={`py-3 px-3 border-b-2 text-xs flex items-center space-x-2 ${activeTab === 'units' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            <i className="fa-solid fa-layer-group"></i>
                            <span>Unidades Académicas</span>
                            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-[10px]">{units.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('tasks')} className={`py-3 px-3 border-b-2 text-xs flex items-center space-x-2 ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            <i className="fa-solid fa-list-check"></i>
                            <span>Tareas del Flujo</span>
                            <span className="bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 text-[10px]">{tasks.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('resources')} className={`py-3 px-3 border-b-2 text-xs flex items-center space-x-2 ${activeTab === 'resources' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            <i className="fa-solid fa-file-lines"></i>
                            <span>Insumos y Entregables</span>
                            <span className="bg-slate-200 text-slate-700 rounded-full px-2 py-0.5 text-[10px]">{resources.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('team')} className={`py-3 px-3 border-b-2 text-xs flex items-center space-x-2 ${activeTab === 'team' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            <i className="fa-solid fa-users"></i>
                            <span>Equipo Asignado</span>
                        </button>
                        <button onClick={() => setActiveTab('logs')} className={`py-3 px-3 border-b-2 text-xs flex items-center space-x-2 ${activeTab === 'logs' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            <span>Trazabilidad</span>
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'units' && (
                        <div className="space-y-3">
                            {units.map(u => (
                                <div key={u.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">{u.unit_number}</span>
                                                <h4 className="font-bold text-sm text-slate-900">{u.title}</h4>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 ml-8">{u.description}</p>
                                        </div>
                                        <div className="flex items-center space-x-3 ml-8 sm:ml-0">
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-slate-700">{u.progress_percentage}%</span>
                                                <span className="text-[10px] text-slate-400 block">{u.status}</span>
                                            </div>
                                            <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${u.progress_percentage}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Tarea & Descripción</th>
                                        <th className="px-3 py-3">Etapa</th>
                                        <th className="px-3 py-3">Asignado</th>
                                        <th className="px-3 py-3">Vencimiento</th>
                                        <th className="px-3 py-3">Dependencia</th>
                                        <th className="px-3 py-3 text-center">Estado</th>
                                        <th className="px-3 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tasks.map(t => {
                                        const user = users.find(u => u.id === t.assigned_user_id);
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-50 transition">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900">{t.title}</div>
                                                    <div className="text-[11px] text-slate-400">{t.description}</div>
                                                </td>
                                                <td className="px-3 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">{t.stage}</span></td>
                                                <td className="px-3 py-3 text-slate-700">{user?.name || 'Asignado'}</td>
                                                <td className="px-3 py-3 text-slate-500 font-mono text-[11px]">{formatDate(t.due_date)}</td>
                                                <td className="px-3 py-3">
                                                    {t.is_blocked ? (
                                                        <span className="text-rose-600 text-[10px] font-bold bg-rose-50 px-2 py-0.5 rounded flex items-center" title={t.blocking_reason}>
                                                            <i className="fa-solid fa-lock mr-1"></i> Bloqueada
                                                        </span>
                                                    ) : <span className="text-emerald-600 text-[10px] font-medium"><i className="fa-solid fa-check-circle mr-1"></i> Disponible</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center"><TaskBadge status={t.status} /></td>
                                                <td className="px-3 py-3 text-right">
                                                    <TaskActions task={t} onAdvance={onAdvanceTask} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resources.map(r => (
                                <ResourceCard key={r.id} resource={r} course={course} users={users} onReview={() => onReviewResource(r.id, null)} />
                            ))}
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {team.map(u => (
                                <div key={u.id} className="border border-slate-200 rounded-xl p-4 flex items-center space-x-3 bg-white shadow-sm">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.avatar_color }}>
                                        {u.initials}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">{u.name}</div>
                                        <div className="text-[11px] text-blue-600 font-medium">{u.role_display_name}</div>
                                        <div className="text-[10px] text-slate-400">{u.email}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 ml-2">
                            {recent_logs.map(l => (
                                <LogItem key={l.id} log={l} users={users} courses={[course]} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Tasks View Component (Kanban & Table)
function TasksView({ tasks, courses, users, currentUser, filterOnlyMyTasks, setFilterOnlyMyTasks, viewMode, setViewMode, onAdvanceTask, onNewTask, onSubmitDeliverable, onReviewResource }) {
    const [stageFilter, setStageFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    let list = tasks;
    if (filterOnlyMyTasks && currentUser) {
        list = list.filter(t => t.assigned_user_id === currentUser.id);
    }
    if (stageFilter) list = list.filter(t => t.stage === stageFilter);
    if (courseFilter) list = list.filter(t => t.course_id === courseFilter);
    if (priorityFilter) list = list.filter(t => t.priority === priorityFilter);

    const pendientes = list.filter(t => t.status === 'Pendiente');
    const proceso = list.filter(t => t.status === 'En Proceso');
    const revision = list.filter(t => t.status === 'En Revisión' || t.status === 'Requiere Ajustes');
    const completadas = list.filter(t => t.status === 'Completada');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bandeja de Tareas del Flujo</h1>
                    <p className="text-sm text-slate-500">Identifica claramente qué debe hacer cada responsable, prioridades y dependencias entre etapas.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
                        <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 text-xs font-medium rounded-md ${viewMode === 'kanban' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>
                            <i className="fa-solid fa-table-columns mr-1"></i> Tablero Kanban
                        </button>
                        <button onClick={() => setViewMode('table')} className={`px-3 py-1 text-xs font-medium rounded-md ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>
                            <i className="fa-solid fa-list mr-1"></i> Lista Detallada
                        </button>
                    </div>
                    <button onClick={onNewTask} className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm">
                        <i className="fa-solid fa-plus mr-1.5"></i> Crear Tarea
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setFilterOnlyMyTasks(!filterOnlyMyTasks)}
                        className={`px-3 py-1.5 border text-xs font-medium rounded-lg flex items-center transition ${filterOnlyMyTasks ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
                    >
                        <i className="fa-solid fa-user-check mr-1.5"></i> Filtrar solo mis tareas
                    </button>
                    <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5">
                        <option value="">Todas las Etapas</option>
                        <option value="Planeación">Planeación</option>
                        <option value="Diseño Instruccional">Diseño Instruccional</option>
                        <option value="Producción Multimedia">Producción Multimedia</option>
                        <option value="Montaje LMS">Montaje LMS</option>
                        <option value="Control Calidad">Control Calidad</option>
                    </select>
                    <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5">
                        <option value="">Todos los Cursos</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
                    </select>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5">
                        <option value="">Todas las Prioridades</option>
                        <option value="Alta">Alta / Crítica</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                    </select>
                </div>
                <div className="text-xs text-slate-500 font-medium">Mostrando {list.length} tareas del flujo</div>
            </div>

            {/* Kanban Columns */}
            {viewMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                    <KanbanColumn title="Pendiente" count={pendientes.length} bgHeader="bg-slate-400" tasks={pendientes} courses={courses} users={users} onAdvance={onAdvanceTask} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                    <KanbanColumn title="En Proceso" count={proceso.length} bgHeader="bg-blue-500" tasks={proceso} courses={courses} users={users} onAdvance={onAdvanceTask} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                    <KanbanColumn title="En Revisión / Ajustes" count={revision.length} bgHeader="bg-amber-500" tasks={revision} courses={courses} users={users} onAdvance={onAdvanceTask} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                    <KanbanColumn title="Completadas" count={completadas.length} bgHeader="bg-emerald-500" tasks={completadas} courses={courses} users={users} onAdvance={onAdvanceTask} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Tarea</th>
                                <th className="px-3 py-3">Curso</th>
                                <th className="px-3 py-3">Etapa</th>
                                <th className="px-3 py-3">Asignado</th>
                                <th className="px-3 py-3">Vencimiento</th>
                                <th className="px-3 py-3">Prioridad</th>
                                <th className="px-3 py-3">Estado</th>
                                <th className="px-3 py-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {list.map(t => {
                                const course = courses.find(c => c.id === t.course_id);
                                const user = users.find(u => u.id === t.assigned_user_id);
                                return (
                                    <tr key={t.id} className="hover:bg-slate-50 transition">
                                        <td className="px-4 py-3"><div className="font-bold text-slate-900">{t.title}</div><div className="text-[11px] text-slate-400">{t.description}</div></td>
                                        <td className="px-3 py-3 text-slate-700 font-medium">{course?.code}</td>
                                        <td className="px-3 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">{t.stage}</span></td>
                                        <td className="px-3 py-3">{user?.name}</td>
                                        <td className="px-3 py-3 font-mono text-[11px]">{formatDate(t.due_date)}</td>
                                        <td className="px-3 py-3"><PriorityBadge priority={t.priority} /></td>
                                        <td className="px-3 py-3"><TaskBadge status={t.status} /></td>
                                        <td className="px-3 py-3 text-right">
                                            <TaskActions task={t} onAdvance={onAdvanceTask} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Kanban Column
function KanbanColumn({ title, count, bgHeader, tasks, courses, users, onAdvance, onSubmitDeliverable, onReviewResource }) {
    return (
        <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-slate-600 flex items-center">
                    <span className={`w-2.5 h-2.5 rounded-full mr-2 ${bgHeader}`}></span> {title}
                </span>
                <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{count}</span>
            </div>
            <div className="space-y-3 flex-1 min-h-[300px]">
                {tasks.map(t => {
                    const course = courses.find(c => c.id === t.course_id);
                    const user = users.find(u => u.id === t.assigned_user_id);
                    return (
                        <div key={t.id} className={`kanban-card bg-white rounded-xl border ${t.is_blocked ? 'border-rose-300' : 'border-slate-200'} p-3.5 shadow-sm space-y-2.5`}>
                            <div className="flex items-start justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{course?.code}</span>
                                <PriorityBadge priority={t.priority} />
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 leading-snug">{t.title}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                            {t.is_blocked && (
                                <div className="bg-rose-50 border border-rose-200 rounded p-1.5 text-[10px] text-rose-700 flex items-center">
                                    <i className="fa-solid fa-lock text-rose-500 mr-1.5"></i>
                                    <span className="truncate">{t.blocking_reason || 'Dependencia pendiente'}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                                <div className="flex items-center space-x-1.5 text-slate-600">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: user?.avatar_color || '#4F46E5' }}>
                                        {user?.initials || 'US'}
                                    </div>
                                    <span className="truncate max-w-[80px]">{user?.name?.split(' ')[1] || 'Usuario'}</span>
                                </div>
                                <div className="font-mono text-slate-400">{formatDate(t.due_date)}</div>
                            </div>
                            <div className="pt-1 flex justify-end">
                                <TaskActions task={t} onAdvance={onAdvance} onSubmitDeliverable={onSubmitDeliverable} onReviewResource={onReviewResource} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Resources View
function ResourcesView({ resources, courses, users, onSubmitDeliverable, onReviewResource }) {
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const filtered = resources.filter(r => {
        const matchesStatus = !statusFilter || r.status === statusFilter;
        const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Repositorio Central de Insumos y Entregas</h1>
                    <p className="text-sm text-slate-500">Responde a: <em>¿Qué insumos están disponibles?</em> Sílabos, guiones didácticos, presentaciones, videos y aulas virtuales con versiones.</p>
                </div>
                <button onClick={onSubmitDeliverable} className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                    <i className="fa-solid fa-cloud-arrow-up mr-2"></i> Realizar Nueva Entrega
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-1">
                    {['', 'En Revisión', 'Requiere Ajustes', 'Aprobado', 'Integrado en LMS'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === st ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            {st === '' ? 'Todos' : st === 'Requiere Ajustes' ? '⚠️ Requieren Ajustes' : st === 'Aprobado' ? '✅ Aprobados' : st === 'Integrado en LMS' ? '💻 En LMS' : st}
                        </button>
                    ))}
                </div>
                <div className="relative w-64">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar insumo..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(r => {
                    const course = courses.find(c => c.id === r.course_id);
                    return <ResourceCard key={r.id} resource={r} course={course} users={users} onReview={() => onReviewResource(r.id)} />;
                })}
            </div>
        </div>
    );
}

// Reviews View Component
function ReviewsView({ resources, courses, users, onReviewResource, onSubmitCorrection }) {
    const adjustments = resources.filter(r => r.status === 'Requiere Ajustes');
    const reviewed = resources.filter(r => r.reviews_count > 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Control de Calidad, Revisiones y Aprobaciones</h1>
                    <p className="text-sm text-slate-500">Responde a: <em>¿Cuáles requieren corrección y cuáles han sido aprobados?</em> Circuito de retroalimentación formal y checklist pedagógico.</p>
                </div>
                <button onClick={() => onReviewResource(null)} className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition">
                    <i className="fa-solid fa-stamp mr-2"></i> Emitir Dictamen de Revisión
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Items Requiring Correction */}
                <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5 lg:col-span-1">
                    <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                        <span className="text-sm font-bold text-rose-800 flex items-center">
                            <i className="fa-solid fa-circle-exclamation text-rose-500 mr-2"></i> Requieren Corrección Activa
                        </span>
                        <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">{adjustments.length}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Insumos devueltos al autor docente o multimedia para subsanar observaciones.</p>
                    <div className="mt-4 space-y-3">
                        {adjustments.length === 0 ? (
                            <div className="text-xs text-slate-400 py-4 text-center">No hay insumos con observaciones activas. ¡Todo al día!</div>
                        ) : (
                            adjustments.map(r => {
                                const course = courses.find(c => c.id === r.course_id);
                                return (
                                    <div key={r.id} className="border border-rose-200 bg-rose-50/60 rounded-xl p-3.5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-rose-800 uppercase">{r.type}</span>
                                            <span className="text-[10px] font-mono text-slate-500">{r.current_version}</span>
                                        </div>
                                        <h4 className="font-bold text-xs text-slate-900">{r.title}</h4>
                                        <div className="text-[11px] text-slate-500">{course?.code}: {course?.title}</div>
                                        <div className="pt-2 flex justify-end">
                                            <button onClick={() => onSubmitCorrection(r.id)} className="text-xs bg-white text-rose-700 hover:bg-rose-100 font-semibold px-2.5 py-1 rounded border border-rose-200 shadow-sm">
                                                Entregar Versión Corregida &rarr;
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* History of Reviews */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-sm font-bold text-slate-900 flex items-center">
                            <i className="fa-solid fa-clock-rotate-left text-blue-500 mr-2"></i> Registro Histórico de Dictámenes y Aprobaciones
                        </span>
                        <span className="text-xs text-slate-400">Trazabilidad oficial</span>
                    </div>
                    <div className="mt-4 space-y-4">
                        {reviewed.map(r => {
                            const course = courses.find(c => c.id === r.course_id);
                            return (
                                <div key={r.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm hover:shadow transition">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.stage}</span>
                                            <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                                            <p className="text-xs text-slate-500">{course?.code} - {course?.title}</p>
                                        </div>
                                        <div><ResourceBadge status={r.status} /></div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Versión actual: <strong className="text-slate-800">{r.current_version}</strong></span>
                                        <button onClick={() => onReviewResource(r.id)} className="text-emerald-700 hover:text-emerald-900 font-medium">
                                            Ver historial y emitir nuevo dictamen &rarr;
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Timeline View Component
function TimelineView({ logs, courses, users }) {
    const [selectedCourse, setSelectedCourse] = useState('');
    const filtered = selectedCourse ? logs.filter(l => l.course_id === selectedCourse) : logs;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Bitácora Global de Trazabilidad</h1>
                    <p className="text-sm text-slate-500">Historial inmutable de entregas, revisiones, cambios de estado y aprobaciones en toda la institución.</p>
                </div>
                <div>
                    <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2">
                        <option value="">Todos los cursos</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 ml-2">
                    {filtered.map(l => (
                        <LogItem key={l.id} log={l} users={users} courses={courses} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Resource Card Component
function ResourceCard({ resource, course, users, onReview }) {
    const author = users.find(u => u.id === resource.author_id)?.name || 'Autor';
    const reviewer = users.find(u => u.id === resource.assigned_reviewer_id)?.name || 'Revisor';

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">{resource.type}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{resource.current_version}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 leading-snug mb-1">{resource.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{resource.description}</p>
                <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex justify-between"><span className="text-slate-400">Curso:</span><span className="font-semibold text-slate-800 truncate max-w-[180px]">{course?.title}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Autor:</span><span className="text-slate-700">{author}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Revisor:</span><span className="text-slate-700">{reviewer}</span></div>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div><ResourceBadge status={resource.status} /></div>
                <div className="flex items-center space-x-2">
                    {resource.latest_file_url && (
                        <a href={resource.latest_file_url} target="_blank" download className="text-slate-500 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 text-xs" title="Descargar archivo">
                            <i className="fa-solid fa-download"></i>
                        </a>
                    )}
                    {resource.latest_external_link && (
                        <a href={resource.latest_external_link} target="_blank" className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 text-xs" title="Abrir enlace">
                            <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    )}
                    <button onClick={onReview} className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-md border border-emerald-200">
                        Dictaminar &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
}

// Log Item Component
function LogItem({ log, users, courses }) {
    const user = users.find(u => u.id === log.user_id);
    const course = courses.find(c => c.id === log.course_id);

    let icon = 'fa-pen';
    let iconBg = 'bg-blue-100 text-blue-600';
    if (log.action === 'APROBACION' || log.action === 'CERTIFICACION') {
        icon = 'fa-check';
        iconBg = 'bg-emerald-100 text-emerald-600';
    } else if (log.action === 'OBSERVACION_REGISTRADA' || log.action === 'RECHAZO') {
        icon = 'fa-exclamation';
        iconBg = 'bg-rose-100 text-rose-600';
    } else if (log.action === 'ENTREGA_RECURSO') {
        icon = 'fa-cloud-arrow-up';
        iconBg = 'bg-indigo-100 text-indigo-600';
    }

    return (
        <div className="relative pl-7 pb-4">
            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${iconBg} flex items-center justify-center text-xs ring-4 ring-white`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{user?.name} <span className="font-normal text-slate-500">({user?.role_display_name})</span></span>
                    <span className="text-[11px] text-slate-400 font-mono">{formatDate(log.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{log.description}</p>
                <div className="mt-1 text-[10px] text-blue-600 font-semibold">{course?.code || log.course_id}</div>
            </div>
        </div>
    );
}

// Stepper Component
function StageStepper({ status }) {
    const stages = [
        { name: '1. Planeación & Sílabo', icon: 'fa-clipboard-list' },
        { name: '2. Guionización', icon: 'fa-pen-to-square' },
        { name: '3. Revisión Pedagógica', icon: 'fa-spell-check' },
        { name: '4. Multimedia', icon: 'fa-film' },
        { name: '5. Montaje LMS', icon: 'fa-laptop-code' },
        { name: '6. Calidad & WCAG', icon: 'fa-shield-halved' },
        { name: '7. Certificado LMS', icon: 'fa-certificate' }
    ];

    let currentIdx = 0;
    if (status === 'Planificación') currentIdx = 0;
    else if (status === 'En Revisión Pedagógica') currentIdx = 2;
    else if (status === 'En Producción Multimedia') currentIdx = 3;
    else if (status === 'En Montaje LMS') currentIdx = 4;
    else if (status === 'Control de Calidad') currentIdx = 5;
    else if (status === 'Publicado') currentIdx = 6;
    else if (status === 'En Riesgo') currentIdx = 1;

    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            {stages.map((s, idx) => {
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const color = isPast ? 'bg-emerald-500 text-white border-emerald-500' : isCurrent ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100' : 'bg-white text-slate-400 border-slate-300';
                return (
                    <div key={idx} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full border-2 ${color} flex items-center justify-center text-xs font-bold transition`}>
                                <i className={`fa-solid ${s.icon}`}></i>
                            </div>
                            <span className={`text-[10px] font-semibold mt-1.5 ${isCurrent ? 'text-blue-700' : isPast ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {s.name}
                            </span>
                        </div>
                        {idx < stages.length - 1 && <div className={`w-6 sm:w-10 h-0.5 mx-1 ${idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>}
                    </div>
                );
            })}
        </div>
    );
}

// Action Buttons for Tasks
function TaskActions({ task, onAdvance, onSubmitDeliverable, onReviewResource }) {
    if (task.is_blocked) {
        return <span className="text-[10px] text-slate-400 italic">Bloqueada</span>;
    }
    if (task.status === 'Pendiente') {
        return (
            <button onClick={() => onAdvance(task.id, 'En Proceso')} className="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold px-2 py-1 rounded transition border border-blue-200">
                Iniciar <i className="fa-solid fa-play ml-1"></i>
            </button>
        );
    }
    if (task.status === 'En Proceso' || task.status === 'Requiere Ajustes') {
        return (
            <button onClick={() => onSubmitDeliverable(task.id, task.resource_id)} className="text-[11px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2 py-1 rounded transition border border-indigo-200">
                Entregar <i className="fa-solid fa-cloud-arrow-up ml-1"></i>
            </button>
        );
    }
    if (task.status === 'En Revisión') {
        return (
            <button onClick={() => onReviewResource(task.resource_id, task.id)} className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-2 py-1 rounded transition border border-emerald-200">
                Evaluar <i className="fa-solid fa-stamp ml-1"></i>
            </button>
        );
    }
    return <span className="text-[10px] text-emerald-600 font-bold"><i className="fa-solid fa-circle-check"></i> Lista</span>;
}

// Badges
function StatusBadge({ status }) {
    switch (status) {
        case 'Publicado':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><i className="fa-solid fa-circle-check mr-1 text-[10px]"></i> Certificado</span>;
        case 'En Montaje LMS':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300"><i className="fa-solid fa-code mr-1 text-[10px]"></i> Montaje LMS</span>;
        case 'En Producción Multimedia':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-300"><i className="fa-solid fa-film mr-1 text-[10px]"></i> Multimedia</span>;
        case 'En Revisión Pedagógica':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"><i className="fa-solid fa-spell-check mr-1 text-[10px]"></i> Revisión</span>;
        case 'Control de Calidad':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-300"><i className="fa-solid fa-shield-halved mr-1 text-[10px]"></i> Calidad</span>;
        case 'En Riesgo':
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"><i className="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i> En Riesgo</span>;
        default:
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
}

function TaskBadge({ status }) {
    switch (status) {
        case 'Completada': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Completada</span>;
        case 'En Proceso': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">En Proceso</span>;
        case 'En Revisión': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">En Revisión</span>;
        case 'Requiere Ajustes': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Ajustes</span>;
        default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">Pendiente</span>;
    }
}

function ResourceBadge({ status }) {
    switch (status) {
        case 'Aprobado':
        case 'Certificado Calidad':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800"><i className="fa-solid fa-check mr-1"></i> Aprobado</span>;
        case 'Requiere Ajustes':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Requiere Ajustes</span>;
        case 'Integrado en LMS':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800"><i className="fa-solid fa-laptop-code mr-1"></i> En LMS</span>;
        case 'En Revisión':
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800"><i className="fa-solid fa-hourglass-half mr-1"></i> En Revisión</span>;
        default:
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">{status}</span>;
    }
}

function PriorityBadge({ priority }) {
    switch (priority) {
        case 'Crítica':
        case 'Alta':
            return <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Alta</span>;
        case 'Media':
            return <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Media</span>;
        default:
            return <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Baja</span>;
    }
}

function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
        return isoStr;
    }
}

// Modals Components
function DeliverableModal({ resources, tasks, courses, currentUser, selectedResourceId, selectedTaskId, onClose, onSuccess }) {
    const [resourceId, setResourceId] = useState(selectedResourceId || resources[0]?.id || '');
    const [version, setVersion] = useState('v1.0');
    const [notes, setNotes] = useState('');
    const [externalLink, setExternalLink] = useState('');
    const [file, setFile] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let fileUrl = null;
            let fileName = null;

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                if (uploadRes.ok) {
                    const up = await uploadRes.json();
                    fileUrl = up.url;
                    fileName = up.fileName;
                }
            }

            const resObj = resources.find(r => r.id === resourceId);
            const taskObj = tasks.find(t => t.id === selectedTaskId || t.resource_id === resourceId);

            const payload = {
                course_id: resObj?.course_id || courses[0]?.id,
                task_id: taskObj?.id || "",
                resource_id: resourceId,
                submitted_by_user_id: currentUser?.id || "usr-doc1",
                version: version,
                notes: notes,
                file_url: fileUrl,
                file_name: fileName,
                external_link: externalLink || null
            };

            await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onSuccess();
        } catch (err) {
            alert("Error al entregar: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
                        <h3 className="font-bold text-base">Registrar Entrega de Insumo</h3>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-lg">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Insumo a Entregar *</label>
                        <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                            {resources.map(r => (
                                <option key={r.id} value={r.id}>[{r.type}] {r.title} ({r.current_version})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Versión *</label>
                            <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Autor Responsable</label>
                            <input type="text" disabled value={`${currentUser?.name} (${currentUser?.role_display_name})`} className="w-full text-xs rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-slate-600" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Enlace Externo (Google Drive, Genially, Canvas, etc.)</label>
                        <input type="url" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">O Adjuntar Archivo Local</label>
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Notas de Entrega *</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} required rows="3" placeholder="Detalle los avances o subsanación de observaciones..." className="w-full text-xs rounded-lg border border-slate-300 p-2.5"></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm">Confirmar Entrega</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ReviewModal({ resources, tasks, courses, currentUser, selectedResourceId, selectedTaskId, onClose, onSuccess }) {
    const [resourceId, setResourceId] = useState(selectedResourceId || resources[0]?.id || '');
    const [decision, setDecision] = useState('Aprobado');
    const [feedback, setFeedback] = useState('Cumple satisfactoriamente con los criterios pedagógicos y de diseño.');
    const [checklist, setChecklist] = useState([
        { item: "Alineación con competencias y resultados de aprendizaje (RAP)", passed: true },
        { item: "Rigor conceptual y adecuación pedagógica al perfil del estudiante", passed: true },
        { item: "Cumplimiento de derechos de autor y normas de citación (APA/IEEE)", passed: true },
        { item: "Accesibilidad digital (WCAG), contraste, legibilidad y subtítulos", passed: true }
    ]);

    const handleChecklistToggle = (index) => {
        setChecklist(prev => prev.map((item, idx) => idx === index ? { ...item, passed: !item.passed } : item));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const resObj = resources.find(r => r.id === resourceId);
            const taskObj = tasks.find(t => t.id === selectedTaskId || t.resource_id === resourceId);

            const payload = {
                course_id: resObj?.course_id || courses[0]?.id,
                task_id: taskObj?.id || "",
                resource_id: resourceId,
                submission_id: "",
                reviewer_user_id: currentUser?.id || "usr-rev",
                reviewer_role: currentUser?.role || "revisor_pedagogico",
                decision: decision,
                feedback: feedback,
                checklist: checklist
            };

            await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            onSuccess(decision);
        } catch (err) {
            alert("Error al dictaminar: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-stamp text-lg"></i>
                        <h3 className="font-bold text-base">Emitir Dictamen de Revisión y Calidad</h3>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-lg">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Insumo a Evaluar *</label>
                        <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                            {resources.map(r => (
                                <option key={r.id} value={r.id}>[{r.type}] {r.title} - Estado: {r.status}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">Dictamen Oficial *</label>
                        <div className="grid grid-cols-3 gap-2">
                            <label className={`border rounded-lg p-2.5 flex items-center space-x-2 cursor-pointer transition ${decision === 'Aprobado' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                                <input type="radio" name="decision" checked={decision === 'Aprobado'} onChange={() => setDecision('Aprobado')} className="text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700"><i className="fa-solid fa-check mr-1"></i> Aprobado</span>
                            </label>
                            <label className={`border rounded-lg p-2.5 flex items-center space-x-2 cursor-pointer transition ${decision === 'Requiere Ajustes' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}>
                                <input type="radio" name="decision" checked={decision === 'Requiere Ajustes'} onChange={() => setDecision('Requiere Ajustes')} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Ajustes</span>
                            </label>
                            <label className={`border rounded-lg p-2.5 flex items-center space-x-2 cursor-pointer transition ${decision === 'Rechazado' ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}>
                                <input type="radio" name="decision" checked={decision === 'Rechazado'} onChange={() => setDecision('Rechazado')} className="text-rose-600" />
                                <span className="text-xs font-bold text-rose-700"><i className="fa-solid fa-xmark mr-1"></i> Rechazado</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Checklist de Criterios de Calidad</label>
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                            {checklist.map((item, idx) => (
                                <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={item.passed} onChange={() => handleChecklistToggle(idx)} className="rounded text-emerald-600" />
                                    <span>{item.item}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Retroalimentación Cualitativa / Observaciones *</label>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} required rows="3" placeholder="Detalle observaciones o justificación del dictamen..." className="w-full text-xs rounded-lg border border-slate-300 p-2.5"></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">Registrar Dictamen</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function NewCourseModal({ users, currentUser, onClose, onSuccess }) {
    const [code, setCode] = useState('VIRT-SIS-202');
    const [title, setTitle] = useState('');
    const [faculty, setFaculty] = useState('Facultad de Ingeniería');
    const [program, setProgram] = useState('Ingeniería de Software');
    const [teacherId, setTeacherId] = useState(users.find(u => u.role === 'docente')?.id || '');
    const [designerId, setDesignerId] = useState(users.find(u => u.role === 'disenador_instruccional')?.id || '');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                code,
                title,
                faculty,
                academic_program: program,
                description,
                coordinator_id: currentUser?.id || "usr-coord",
                teacher_id: teacherId,
                instructional_designer_id: designerId
            };
            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const created = await res.json();
            onSuccess(created);
        } catch (err) {
            alert("Error al crear curso: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2"><i className="fa-solid fa-graduation-cap text-lg"></i><h3 className="font-bold text-base">Registrar Nuevo Curso a Virtualizar</h3></div>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-lg">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Código *</label>
                            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5 uppercase" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Asignatura *</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Arquitectura Cloud" className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Facultad *</label>
                            <input type="text" value={faculty} onChange={(e) => setFaculty(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Programa Académico *</label>
                            <input type="text" value={program} onChange={(e) => setProgram(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Docente Experto *</label>
                            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                                {users.filter(u => u.role === 'docente').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Diseñador Instruccional *</label>
                            <select value={designerId} onChange={(e) => setDesignerId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                                {users.filter(u => u.role === 'disenador_instruccional').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="2" placeholder="Síntesis del curso..." className="w-full text-xs rounded-lg border border-slate-300 p-2.5"></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm">Crear Curso</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function NewTaskModal({ courses, users, tasks, defaultCourseId, onClose, onSuccess }) {
    const [courseId, setCourseId] = useState(defaultCourseId || courses[0]?.id || '');
    const [title, setTitle] = useState('');
    const [stage, setStage] = useState('Planeación');
    const [assigneeId, setAssigneeId] = useState(users[0]?.id || '');
    const [priority, setPriority] = useState('Media');
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [dependency, setDependency] = useState('');

    const courseTasks = tasks.filter(t => t.course_id === courseId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                course_id: courseId,
                title,
                stage,
                assigned_user_id: assigneeId,
                priority,
                due_date: new Date(dueDate).toISOString(),
                dependency_task_ids: dependency ? [dependency] : []
            };
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            onSuccess();
        } catch (err) {
            alert("Error al crear tarea: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-700 to-purple-800 px-6 py-4 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2"><i className="fa-solid fa-list-check text-lg"></i><h3 className="font-bold text-base">Asignar Tarea en el Flujo</h3></div>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-lg">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Curso Destino *</label>
                        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Título de la Tarea *</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: Grabación de video 1.2" className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Etapa *</label>
                            <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                                <option value="Planeación">Planeación</option>
                                <option value="Diseño Instruccional">Diseño Instruccional</option>
                                <option value="Producción Multimedia">Producción Multimedia</option>
                                <option value="Montaje LMS">Montaje LMS</option>
                                <option value="Control Calidad">Control Calidad</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Especialista Asignado *</label>
                            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role_display_name})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Prioridad *</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                                <option value="Alta">Alta</option>
                                <option value="Media">Media</option>
                                <option value="Baja">Baja</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Límite *</label>
                            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="w-full text-xs rounded-lg border border-slate-300 p-2.5" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Dependencia de Tarea Previa (Opcional)</label>
                        <select value={dependency} onChange={(e) => setDependency(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2.5">
                            <option value="">Sin dependencia previa (Iniciar de inmediato)</option>
                            {courseTasks.map(t => <option key={t.id} value={t.id}>Depende de: {t.title} ({t.status})</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">Asignar Tarea</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Mount the React Application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
