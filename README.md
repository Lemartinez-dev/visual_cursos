# VirtualizaCore — Plataforma de Gestión Integral de la Virtualización Académica
### Backend Python 3.12 (Arquitectura MVC) + Frontend React 18 (SPA)

Prototipo funcional desarrollado para el **Reto de Innovación Tecnológica: Diseño de una plataforma para la gestión integral de la virtualización de cursos académicos**.

---

## 🚀 Guía de Ejecución Local Paso a Paso

El sistema está diseñado para ejecutarse de forma ágil y autónoma, sin requerir compiladores pesados ni bases de datos externas adicionales.

### 1. Requisitos Previos

- **Python 3.10 o superior** (probado y optimizado en Python 3.12).
- **Navegador Web Moderno** (Google Chrome, Microsoft Edge, Mozilla Firefox o Safari).

---

### 2. Instalación de Dependencias

Abra una terminal (PowerShell o CMD en Windows, o Bash en Linux/macOS) en la raíz del proyecto (`c:\Users\soporte\Desktop\Reto_entrevista`):

```bash
pip install -r requirements.txt
```

*(O de forma directa:)*
```bash
pip install fastapi uvicorn python-multipart pydantic
```

---

### 3. Iniciar el Servidor de la Aplicación

Puede iniciar el servidor mediante cualquiera de los siguientes dos métodos:

#### Opción A (Recomendada - Módulo Python):
```powershell
# En Windows (PowerShell):
python -m backend.main

# O con la ruta absoluta del intérprete si no está en PATH:
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -m backend.main
```

#### Opción B (Comando directo Uvicorn):
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

Una vez ejecutado, observará en la terminal el mensaje de confirmación:
```
INFO:     Started server process
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:5000 (Press CTRL+C to quit)
```

---

### 4. Acceder al Sistema en el Navegador

Abra su navegador e ingrese a las siguientes URLs:

- **Plataforma Web (Frontend React 18):**  
  👉 **[http://localhost:5000](http://localhost:5000)**

- **Documentación Interactiva de la API (Swagger UI):**  
  👉 **[http://localhost:5000/docs](http://localhost:5000/docs)**

---

## 🔐 Interfaz de Acceso Institucional (Portal de Autenticación)

Al ingresar a la plataforma, el sistema presenta un portal de acceso seguro con dos modalidades de ingreso:

1. **Ingreso con Credenciales Institucionales:**
   - **Correo Electrónico:** Ingrese el correo de cualquiera de los especialistas registrados (ej: `carlos.mendoza@edu.lat`).
   - **Contraseña:** Contraseña institucional de evaluación: `virtualiza2026`.
   - Incluye opción para recordar sesión local y visibilidad de contraseña.
2. **Acceso Rápido por Perfil Especializado (1 Clic):**
   - Una cuadrícula interactiva con los **8 roles clave del reto** (Coordinador, Docentes Expertos de Ingeniería y Salud, Revisora Pedagógica, Diseñador Instruccional, Productor Multimedia, Desarrollador LMS y Auditora de Calidad).
   - Al hacer clic en cualquier tarjeta, el sistema autentica automáticamente al usuario y le da acceso inmediato con sus tareas y contexto asignado.
3. **Cierre de Sesión:**
   - En la esquina superior derecha de la cabecera se encuentra el botón **"Salir"** que destruye la sesión y retorna a la interfaz de acceso.

---

## 🧭 Guía de Navegación y Prueba del Reto

Para evaluar el cumplimiento de los requerimientos planteados en el desafío de innovación, siga este flujo sugerido:

### Paso 1: Cuadro de Mando Integral y Detección de Cuellos de Botella (Dashboard)
- Ingrese a la vista principal.
- Observe los **KPIs**: *Avance Promedio del Portafolio*, *Cursos en Riesgo*, *Insumos Certificados* y *Pendientes de Dictamen*.
- Analice el gráfico interactivo de **Diagnóstico de Cuellos de Botella por Etapa**, que contrasta tareas activas vs. tareas retrasadas en cada una de las 5 fases.
- Revise la **Matriz de Carga de Trabajo**, que evidencia la capacidad operativa de cada especialista para prevenir sobrecargas.

### Paso 2: Portafolio de Cursos y Flujo Secuencial (Deep Dive)
- Haga clic en **"Portafolio"** en la barra superior.
- Utilice los filtros en tiempo real por facultad o estado (*En Riesgo*, *En Montaje*, *En Revisión*).
- Ingrese al curso *"Inteligencia Artificial y Aprendizaje Automático"*:
  - Observe el **StageStepper**, que visualiza las 7 fases del flujo formal: *Planeación* $\rightarrow$ *Guionización* $\rightarrow$ *Revisión* $\rightarrow$ *Multimedia* $\rightarrow$ *Montaje LMS* $\rightarrow$ *Calidad WCAG* $\rightarrow$ *Certificación*.
  - Explore las sub-pestañas: *Unidades Académicas*, *Tareas del Flujo*, *Insumos y Entregables*, *Equipo Asignado* y *Trazabilidad*.

### Paso 3: Claridad de Responsabilidades y Dependencias (Mi Bandeja / Kanban)
- Haga clic en **"Mi Bandeja"**.
- Alterne entre el **Tablero Kanban** (columnas: *Pendiente*, *En Proceso*, *En Revisión / Ajustes*, *Completadas*) y la **Lista Detallada**.
- Active el botón **"Filtrar solo mis tareas"** para comprobar cómo la vista se adapta al especialista simulado.
- Identifique las tareas con la insignia roja **"Bloqueada"**: el sistema valida las dependencias de insumos y no permite iniciarlas hasta que el entregable previo reciba dictamen favorable.
- Utilice los botones de acción rápida (*"Iniciar"*, *"Entregar"*, *"Evaluar"*) para avanzar tareas de fase.

### Paso 4: Insumos Disponibles y Control de Versiones (Repositorio)
- Haga clic en **"Insumos & Entregas"**.
- Filtre por categorías de estado (*En Revisión*, *⚠️ Requieren Ajustes*, *✅ Aprobados*, *💻 En LMS*).
- Compruebe el versionamiento formal (`v1.0`, `v1.1`, `v2.0`), los enlaces a recursos externos y la opción de descarga de archivos adjuntos.
- Haga clic en **"Realizar Nueva Entrega"** para subir un nuevo archivo o registrar un enlace con notas para el revisor.

### Paso 5: Ciclo de Calidad y Solicitud de Ajustes (Revisiones & Calidad)
- Haga clic en **"Revisiones & Calidad"**.
- En la columna izquierda (*"Requieren Corrección Activa"*), observe cómo se destaca la *"Lectura Fundamental: El Principio de Autonomía en Pacientes Críticos"*.
- Haga clic en **"Emitir Dictamen de Revisión"**:
  - Seleccione el dictamen: **Aprobado**, **Requiere Ajustes** o **Rechazado**.
  - Marque los criterios del **Checklist de Calidad** (Alineación RAP, Rigor Pedagógico, Derechos de Autor APA/IEEE, Accesibilidad WCAG).
  - Redacte las observaciones y confirme; observe cómo el sistema actualiza automáticamente el estado del insumo y la tarea vinculada.

### Paso 6: Simulador de Roles (Role Switcher)
- En la esquina superior derecha, cambie de usuario en el menú desplegable:
  - **Mg. Carlos Mendoza**: Coordinador General de Virtualización.
  - **Dra. Elena Ramos**: Docente Experta (Ingeniería).
  - **Dr. Andrés Gómez**: Docente Experto (Salud) — *con curso que requiere ajustes*.
  - **Lic. Claudia Morales**: Revisora Pedagógica.
  - **Esp. Javier Ortiz**: Diseñador Instruccional.
  - **Mateo Vargas**: Productor Multimedia.
  - **Ing. Sofía Castro**: Desarrolladora LMS.
  - **Mg. Patricia Vega**: Auditora de Calidad.

### Paso 7: Restaurar Datos Originales del Reto (Reset Demo)
- En cualquier momento puede hacer clic en el botón con ícono de flechas circulares (**Restaurar Demo**) en la barra superior para reiniciar la base de datos a su estado original.

---

## 🗄️ Implementación de Base de Datos en Supabase

El sistema integra compatibilidad nativa con **Supabase** (PostgreSQL gestionado en la nube).

### 1. Esquema de Base de Datos SQL (`supabase/schema.sql`)
Se incluye el script SQL de producción [supabase/schema.sql](file:///c:/Users/soporte/Desktop/Reto_entrevista/supabase/schema.sql) que crea:
- **Tablas Relacionales**: `users`, `courses`, `academic_units`, `resource_items`, `task_items`, `submissions`, `reviews`, `activity_logs`.
- **Integridad Referencial**: Claves foráneas con eliminación en cascada (`ON DELETE CASCADE / SET NULL`).
- **Índices de Rendimiento**: Índices sobre estados, responsables, cursos y bitácoras.
- **Seguridad RLS (Row Level Security)**: Políticas activas para control de acceso y escritura.

### 2. Conectar tu Proyecto de Supabase
1. Ingresa a tu panel en [Supabase](https://supabase.com) y crea un nuevo proyecto.
2. Ve al **SQL Editor** de Supabase, copia y pega el contenido de `supabase/schema.sql` y presiona **RUN**.
3. En la sección **Project Settings > API**, copia tu **Project URL** y tu **anon / service_role API Key**.
4. Edita el archivo `.env` en la raíz del proyecto:
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-clave-anon-o-service-key-aqui
   ```
5. Al reiniciar el backend, el sistema detecta las credenciales y sincroniza automáticamente las tablas con Supabase en la nube.
   *(Si se ejecuta sin credenciales, el sistema activa el modo local resiliente sin interrumpir el funcionamiento).*

---

## 🏛️ Arquitectura del Sistema (MVC en Python + React 18)

```
c:\Users\soporte\Desktop\Reto_entrevista\
│
├── backend/                       # BACKEND PYTHON 3.12 (MVC)
│   ├── main.py                    # Servidor FastAPI y montaje estático
│   ├── __init__.py
│   ├── models/                    # [M] MODELO
│   │   ├── __init__.py
│   │   ├── entities.py            # Entidades Pydantic (Course, Task, Resource...)
│   │   ├── supabase_client.py     # Cliente e integración con Supabase Cloud
│   │   └── datastore.py           # Persistencia transaccional concurrente
│   ├── controllers/               # [C] CONTROLADORES
│   │   ├── __init__.py
│   │   ├── course_controller.py   # Gestión integral de cursos y unidades
│   │   ├── task_controller.py     # Asignación y motor de validación de dependencias
│   │   ├── resource_controller.py # Insumos, entregas y versionamiento
│   │   ├── review_controller.py   # Dictámenes de calidad y checklists institucionales
│   │   └── dashboard_controller.py# Métricas, KPIs y balance de carga
│   └── views/                     # [V] VISTAS API
│       ├── __init__.py
│       └── api_routes.py          # Enrutador RESTful JSON y Auth
│
├── frontend/                      # FRONTEND REACT 18 SPA (Listo para Cloudflare Pages)
│   ├── index.html                 # Contenedor raíz con React 18 y Tailwind
│   ├── app.jsx                    # Componentes React (Portal Login, Dashboard, Kanban)
│   ├── styles.css                 # Estilos y micro-animaciones personalizadas
│   ├── _redirects                 # Reglas SPA y proxy de APIs para Cloudflare Pages
│   ├── _headers                   # Cabeceras de seguridad y CORS para Cloudflare
│   └── uploads/                   # Directorio para archivos adjuntos locales
│
├── supabase/
│   └── schema.sql                 # Esquema relacional PostgreSQL para Supabase
│
├── data/
│   └── database.json              # Respaldo local transaccional
│
├── wrangler.toml                  # Configuración de despliegue para Cloudflare Pages
├── Procfile                       # Archivo de ejecución para PaaS (Render, Railway, Fly.io)
├── .gitignore                     # Exclusiones de Git (seguridad .env, caches y uploads)
├── .env.example                   # Plantilla pública de variables de entorno
├── requirements.txt               # Dependencias Python del proyecto
└── README.md                      # Esta guía de uso y arquitectura
```

---

## ☁️ Guía de Despliegue en Cloudflare Pages

El sistema se encuentra 100% preparado y optimizado para ser desplegado bajo la arquitectura moderna **JAMstack desacoplada**:

### 1. ¿Cómo funciona la arquitectura en la nube?
- **Frontend (Cloudflare Pages):** La carpeta [frontend/](file:///c:/Users/soporte/Desktop/Reto_entrevista/frontend) se aloja en el CDN ultrarrápido global de Cloudflare Pages con SSL automático, caché perimetral y redirección SPA (`_redirects`).
- **Backend (PaaS Python):** El backend en Python 3.12 (FastAPI MVC) se aloja en un servicio especializado en contenedores o Python como **Render.com**, **Railway**, **Fly.io** o **Koyeb** (todos con capas gratuitas o de bajo costo).
- **Base de Datos (Supabase):** La base de datos PostgreSQL ya se encuentra alojada y activa en la nube en **Supabase** (`us-west-2`), por lo que tanto el backend local como el de producción consumen los mismos datos en tiempo real.

---

### 2. Paso 1: Desplegar el Frontend en Cloudflare Pages

Puede desplegar el frontend de dos formas:

#### Opción A: Vía GitHub / GitLab (Dashboard de Cloudflare)
1. Suba este repositorio a su cuenta de GitHub o GitLab.
2. Ingrese a [Cloudflare Dashboard](https://dash.cloudflare.com/) y vaya a **Workers & Pages > Create application > Pages > Connect to Git**.
3. Seleccione el repositorio del proyecto.
4. En **Build settings**:
   - **Framework preset:** `None`
   - **Build command:** *(dejar vacío)*
   - **Build output directory:** `frontend`
   - **Root directory:** `/` (o `frontend`)
5. Haga clic en **Save and Deploy**. Cloudflare publicará su aplicación en una URL `https://tu-proyecto.pages.dev`.

#### Opción B: Vía terminal con Wrangler CLI (En 1 solo paso)
Si tiene Node.js/npx instalado en su máquina:
```bash
npx wrangler pages deploy frontend --project-name virtualizacore
```

---

### 3. Paso 2: Desplegar el Backend Python (FastAPI MVC)

Para que su backend Python esté disponible en la nube:

1. Cree un servicio web gratuito en [Render.com](https://render.com) o [Railway.app](https://railway.app) apuntando a este mismo repositorio.
2. Configure el comando de inicio (detectado automáticamente desde el archivo [Procfile](file:///c:/Users/soporte/Desktop/Reto_entrevista/Procfile)):
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
3. Agregue las variables de entorno de Supabase:
   ```env
   SUPABASE_URL=https://pdnltleddeoblknofacu.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Copie la URL pública generada (ej: `https://virtualizacore-api.onrender.com`).

---

### 4. Paso 3: Conectar Cloudflare Pages con el Backend Python

Tiene dos alternativas igualmente sencillas:

- **Alternativa A (Recomendada - Proxy transparente sin CORS en `_redirects`):**  
  Edite el archivo [frontend/_redirects](file:///c:/Users/soporte/Desktop/Reto_entrevista/frontend/_redirects) descomentando la regla de proxy:
  ```
  /api/*  https://tu-backend.onrender.com/api/:splat  200
  /*      /index.html                                  200
  ```
  *Cloudflare actuará como proxy inverso hacia su backend Python, evitando cualquier restricción de CORS.*

- **Alternativa B (Variable global en `index.html`):**  
  En [frontend/index.html](file:///c:/Users/soporte/Desktop/Reto_entrevista/frontend/index.html#L40), descomente:
  ```html
  <script>
      window.__API_BASE__ = 'https://tu-backend.onrender.com/api';
  </script>
  ```

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic, Python-Multipart, Supabase Python SDK, Python-Dotenv.
- **Frontend**: React 18 (SPA), Tailwind CSS, Chart.js, FontAwesome.
- **Autenticación**: Endpoint REST `/api/auth/login` con token de sesión y persistencia local en navegador.
- **Persistencia en la Nube**: PostgreSQL en Supabase Cloud con RLS + DataStore transaccional local como respaldo de alta resiliencia.
