# Equipo01_MEDINEX_Practica3 — Prototipo funcional MEDINEX

Prototipo funcional de frontend del sistema **MEDINEX** (gestión de citas
administrativas de la clínica de la Dirección de Bienestar Universitario),
construido para la **Práctica 3 · Proceso de Desarrollo y Prototipo Funcional
Asistido por IA** de Ingeniería de Software I (BUAP, Facultad de Ciencias de
la Computación).

> Prototipo conceptual con datos ficticios. MEDINEX solo gestiona información
> administrativa de citas: no guarda diagnósticos, recetas, notas de sesión ni
> ningún dato clínico (RNF-01).

## Caso maestro

MEDINEX — Gestión de citas, expedientes administrativos y servicios de una
clínica universitaria. Alcance del prototipo: reserva de citas en autoservicio,
registro asistido por Recepción, agenda del profesional, bloqueos de horario,
reprogramación y cancelación, catálogos y políticas, indicadores operativos y
bitácora de auditoría.

Documentos base: SRS v1.0 (Práctica 1) y DAS/SDD v1.0 con prototipo de Figma
(Práctica 2). El prototipo implementa las pantallas P-01 a P-09 del DAS/SDD.

## Integrantes — Equipo 01

| Nombre | Matrícula |
| --- | --- |
| Hernandez Santos Markus Omar | 202435501 |
| Anaya Galván Alexis Abel | 202416673 |
| Martínez Romero Oscar Rai | 202437683 |

## Tecnología

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Backend real: servidor Payload CMS 3.x (carpeta `payload-local/`, SQLite en
  la configuración local de prueba) con API REST en `/api` y autenticación
  nativa con JWT. Las citas, los bloqueos y la bitácora persisten en el
  servidor (colecciones `users`, `appointments`, `schedule-blocks` y
  `audit-log`); los datos siguen siendo ficticios y de demostración.
  Las citas arrancan vacías; las cuentas demo se siembran desde P-01.
- Sin despliegue en producción: el prototipo se ejecuta en local o desde la
  vista previa publicada de Figma Make.

## Ejecución local

El prototipo necesita dos servidores: el backend Payload y el frontend.

```bash
# 1. Servidor Payload (puerto 3000)
cd payload-local
cp .env.example .env
npm install
npm run dev

# 2. Frontend (puerto 8443, en otra terminal, desde la raíz del repositorio)
npm install
cp .env.example .env   # VITE_PAYLOAD_API_URL=http://localhost:3000/api
npm run dev
```

La aplicación queda disponible en `http://localhost:8443` (el puerto lo fija
`vite.config.ts`). Al entrar, pulsar «Inicializar / Sembrar datos demo» en
P-01 para crear las 17 cuentas de demostración y luego iniciar sesión con
una cuenta de la tabla siguiente. Para una compilación de producción del
frontend:

```bash
npm run build
npm run preview
```

También se puede consultar la vista previa publicada en Figma Make:
https://scoop-future-50775312.figma.site/

## Cuentas de demostración (datos ficticios)

| Usuario | Contraseña | Rol |
| --- | --- | --- |
| `markus` | `1234` | Paciente (Markus Hernández) |
| `alexis` | `4567` | Paciente (Alexis Anaya) |
| `oscar` | `7890` | Paciente (Oscar Martínez) |

El selector de rol en el inicio de sesión es solo un atajo de demostración:
rellena el usuario y sigue pidiendo la contraseña. También se puede crear una
cuenta nueva desde el propio prototipo (queda guardada en la base de datos
del servidor Payload).

## Pantallas implementadas (P-01 a P-09)

| Pantalla | Flujo | RF del SRS |
| --- | --- | --- |
| P-01 Inicio de sesión y registro | Acceso al sistema | RF-01 |
| P-02 Reservar cita | UC-01 Reservar cita (autoservicio) | RF-02, RF-03, RF-09 |
| P-03 Registrar cita asistida | UC-02 Registro asistido | RF-02, RF-04, RF-19 |
| P-04 Mi agenda | UC-03 Agenda del profesional | RF-12 |
| P-05 Bloquear horario | UC-03 Bloqueo de agenda | RF-05, RF-11 |
| P-06 Mis citas / Citas registradas | UC-04 Reprogramar o cancelar | RF-06, RF-07 |
| P-07 Catálogos y políticas | Administración y configuración | RF-13 |
| P-08 Indicadores operativos | UC-06 Indicadores | RF-14, RF-17 |
| P-09 Bitácora | Auditoría de acciones | RF-11, RNF-06 |

Funcionalidades simples verificables: búsqueda y filtrado de citas por folio,
servicio, profesional o persona; validación de formularios (campos obligatorios
con mensaje junto al campo); cambio de estado de la cita conforme a la máquina
de estados (programada → confirmada → atendida o no presentada; cancelación
desde programada o confirmada); detección del conflicto de disponibilidad en
la franja del 27 oct 2026 10:30 (verificación en la interfaz y de
solapamiento contra el servidor antes de insertar); advertencia de bloqueo
con citas afectadas.

## Estructura del proyecto

```
├── public/
│   └── favicon.svg
├── src/
│   ├── App.tsx            # Aplicación: pantallas P-01 a P-09 y navegación por rol
│   ├── index.css          # Estilos (Tailwind) y guía visual del DAS/SDD
│   ├── main.tsx           # Punto de entrada
│   ├── vite-env.d.ts
│   └── utils/
│       ├── authStore.ts    # Sesión contra Payload (POST /users/login, JWT)
│       ├── dataStore.ts    # Citas, bloqueos y bitácora contra la API REST
│       └── payloadClient.ts # Cliente REST centralizado (fetch + JWT)
├── index.html
├── package.json
├── payload-local/          # Servidor Payload CMS 3.x + SQLite (pruebas)
├── payload-setup/          # Esquema de colecciones de Payload (referencia)
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Uso de inteligencia artificial

- **Figma Make** generó el prototipo interactivo inicial (estructura de
  navegación por rol y las pantallas P-01 a P-09) a partir de un prompt del
  equipo con la guía visual, los roles y los flujos del DAS/SDD.
- **Gemini** continuó el desarrollo por partes (P-02 y P-03; P-04 y P-05),
  y **ChatGPT/Claude** apoyaron la integración del estado compartido
  (`dataStore.ts`) y la redacción del documento de diseño.
- **Migración a Payload CMS (noviembre de 2026):** Muse definió el
  requerimiento y el prompt, Gemini generó el código de migración (cliente
  REST, almacenes asíncronos y esquema de colecciones) y Muse lo implementó
  y corrigió (tipos, textos exactos de la interfaz y calendario dinámico).
  Verificado en vivo contra el servidor local con una prueba de 8 pasos
  (19 de noviembre de 2026, resultado 8/8).
- El equipo revisó y corrigió manualmente el resultado en cada iteración:
  restitución del pie de prototipo conceptual, limpieza de variables sin uso
  que impedían compilar, sustitución de datos de ejemplo fijos por un almacén
  compartido que arranca vacío, y eliminación de un módulo de análisis clínico
  generado por la IA que violaba RNF-01 (MEDINEX no maneja datos clínicos).
  La evidencia completa (prompts, iteraciones y reflexión crítica) está en la
  sección 8 del documento de la Práctica 3 y en el DAS/SDD §10.3–10.4.

## Límites declarados

- Prototipo de demostración, no es el sistema completo ni está validado para
  uso real. La concurrencia de reservas (RF-09) se verifica contra el
  servidor antes de insertar; las notificaciones (RF-10) siguen simuladas y
  la autenticación usa cuentas de demostración (JWT de Payload, sin
  credenciales institucionales). Los datos viven en el servidor local
  (SQLite) y no tienen respaldo automático. No usar con datos personales
  reales.
