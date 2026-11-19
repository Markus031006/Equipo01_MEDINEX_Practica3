# Payload local — MEDINEX (pruebas)

Servidor Payload CMS 3.94 + Next.js 15.4 + SQLite (`medinex.db`), para probar el
frontend de `../gitwork` contra una base de datos real.

- URL: http://localhost:3000 — API REST en http://localhost:3000/api
- Admin: http://localhost:3000/admin
- Colecciones (exactas a `../gitwork/payload-setup/collections-and-seed.ts`):
  `users` (auth), `appointments`, `schedule-blocks`, `audit-log`
- CORS permitido: http://localhost:5173 y http://localhost:8443 (frontend Vite)
- Base de datos: SQLite en `./medinex.db` (se crea sola al arrancar)
- Secreto: `.env` → `PAYLOAD_SECRET` (aleatorio, no compartir)

## Estado actual (2026-11-19)

- Servidor local DETENIDO (se cayó; `medinex.db` intacto con los 17 usuarios).
  Para rearrancarlo: `setsid nohup npm run dev > server.log 2>&1 < /dev/null &`
  desde este directorio.
- 17 cuentas demo sembradas (markus/1234, alexis/4567, oscar/7890,
  ana.torres/paciente2026, luis.perez/recep2026a, ..., mario.beltran/ti2026c).
  Emails derivados: `<username>@medinex.buap.mx`.
- Cita de conflicto sembrada: CIT-0001, Ana Torres Ruiz, Consulta general,
  2026-10-27 10:30–11:00, Consultorio 2, programada.
- El frontend ya tiene su `.env` apuntando aquí
  (`VITE_PAYLOAD_API_URL=http://localhost:3000/api`).

## Comandos

```bash
# Arrancar desacoplado (desde este directorio)
setsid nohup npm run dev > server.log 2>&1 < /dev/null &

# Ver log
tail -f server.log

# Parar
pkill -f "next dev -p 3000"

# Borrar la base y volver a sembrar desde cero
rm -f medinex.db
# (luego arrancar y repetir la siembra con los curl de las notas, o usar el
# botón "Inicializar / Sembrar datos demo" del login del frontend)
```

## Producción / Railway (2026-11-19)

Listo para desplegar sin cambios de código adicionales:

- `npm run build` compila (`next build`) y `npm start` sirve (`next start`,
  usa `$PORT` si está definido, por defecto 3000).
- **Migraciones:** en producción Payload NO empuja el esquema solo. El
  arranque corre `src/migrations/20261119_190020_initial.ts` (vía
  `prodMigrations` en `payload.config.ts`) y crea las 11 tablas en una base
  vacía. Verificado: primer arranque crea las tablas (log `Migrating:
  20261119_190020_initial` → `Migrated`), segundo arranque las salta
  (registro en `payload_migrations`, batch 1) y los datos sobreviven.
  La migración se escribió a mano porque `payload migrate:create` no corre
  en Node 24 (mismo bug de undici que `generate:importmap`); el SQL es el
  esquema exacto volcado de `medinex.db` y usa `db.run(sql\`...\`)` (en
  Payload 3.94 el método es `run`, no `execute`).
- Variables de entorno (ver `.env.example`): `PAYLOAD_SECRET` (generar uno
  nuevo por entorno), `DATABASE_URI` (en Railway:
  `file:<ruta-del-volumen>/medinex.db`), `FRONTEND_URL` (URL pública del
  frontend, lista separada por comas; se suma a los localhost), 
  `PAYLOAD_SERVER_URL` (URL pública de este servicio), `PORT` (lo provee
  Railway).
- El frontend (`../gitwork`) se sirve con `vite preview` (`npm start`) y su
  `VITE_PAYLOAD_API_URL` es variable de BUILD: debe construirse después de
  conocer la URL pública del backend.

## Producción / Neon + Vercel (2026-11-19)

Railway quedó bloqueado (el trial de Markus terminó y pide pago), así que el
objetivo de despliegue pasa a **Neon (Postgres, plan gratuito) + Vercel
Hobby (gratis, sin tarjeta)**. El backend ya está migrado a Postgres en
este repo; la fase de navegador (crear la base en Neon y desplegar en
Vercel) queda pendiente.

- **Adaptador dual en `src/payload.config.ts`:** el adaptador se elige solo
  por el esquema de `DATABASE_URI` — `file:...` → SQLite local (como
  siempre), `postgres://` / `postgresql://` → Postgres. La instalación
  local sigue funcionando igual con `./medinex.db`.
- **Migración de Postgres:** `src/migrations-postgres/20261119_190020_initial.ts`
  (+ `index.ts`), equivalente a la de SQLite: 4 tipos ENUM
  (`enum_users_role`, `enum_appointments_status`,
  `enum_schedule_blocks_reason`, `enum_audit_log_result`), 11 tablas y 33
  índices; ids `serial`, timestamps `timestamp(3) with time zone`,
  `payload_kv.data` como `jsonb`. La migración de SQLite queda intacta.
- **Neon, plan gratuito (verificado 2026-11-19):** $0, sin tarjeta, sin
  límite de tiempo; 100 CU-hours por proyecto al mes, 1 GB de almacenamiento
  por proyecto (20 GB en total por cuenta), hasta 2 CU (8 GB RAM), 10 ramas,
  5 GB de egress por proyecto. La base se apaga a los 5 min sin uso
  (scale-to-zero) y la primera consulta la despierta (cold start de unos
  segundos). Si se acaban las CU-hours o el egress, el cómputo se suspende
  hasta el siguiente ciclo mensual o hasta subir de plan. La DB de MEDINEX
  mide 204 KB (17 usuarios, 5 citas, 9 entradas de bitácora): ~5.000 veces
  por debajo del límite de 1 GB. Para este uso el plan sobra.
- **Variables para la fase de navegador (Vercel + Neon):**
  `DATABASE_URI` = cadena pooled de Neon con `?sslmode=require`;
  `PAYLOAD_SECRET` = generar uno nuevo aleatorio (no reusar el local);
  `PAYLOAD_SERVER_URL` = URL pública del backend;
  `FRONTEND_URL` = URL pública del frontend.
  El frontend (`../gitwork`) se despliega como sitio estático Vite (raíz
  del repo) con `VITE_PAYLOAD_API_URL` como variable de BUILD.
- **Respaldo:** si Vercel no pudiera alojar el backend de Payload, Render
  (plan gratuito) — como los datos viven en Neon, su disco efímero no
  importa.
- **Verificación local (Postgres 16 real, DB de prueba vacía, borrada
  después):** `npx tsc --noEmit` OK, `npm run build` OK; `NODE_ENV=production
  next start` con `DATABASE_URI=postgres://...`: log `Migrating:
  20261119_190020_initial` → `Migrated (62ms)`; GET /api/users sin auth 403;
  POST /api/users markus 201; login markus/1234 200 + JWT; POST
  /api/appointments CIT-0001 201; GET /api/users con token 200 (1 usuario);
  GET /api/appointments 200 (1 cita); schedule-blocks 0, audit-log 0; GET
  /admin 200. Esquema verificado en la base: 11 tablas, 4 tipos ENUM,
  `payload_migrations` con batch 1, `users.role` como `enum_users_role`.
  Segundo arranque: migración saltada, datos intactos (login + 1 cita).
  Dos fallos encontrados y corregidos en el camino: (1) la migración
  creaba `users_sessions` antes que `users` y Postgres exige que la tabla
  referenciada exista (en SQLite el orden no importaba) — reordenado;
  (2) el rol de prueba no tenía CREATE sobre el esquema `public` (en PG 16
  ya no viene por defecto) — en Neon el usuario es dueño de su base, así
  que no aplica. Servidores de prueba detenidos y DBs de prueba eliminadas.
- **Camino SQLite intacto:** con `DATABASE_URI=file:...` el servidor
  sigue usando SQLite y su migración original; verificado con una DB
  vacía en producción (migración + crear usuario 201 + login 200). OJO:
  arrancar en producción contra el `medinex.db` local viejo se detiene en
  la pregunta interactiva de Payload (esa base tiene un registro de
  migración con batch -1 por los pushes de desarrollo); en local se usa
  `npm run dev` como siempre, y en Neon la base empieza vacía, así que
  no aplica.

## Notas

- `npx payload generate:importmap` falla en este Node (v24.22.1) por un choque
  entre undici y el global `CacheStorage` ("Illegal constructor"). El archivo
  `src/app/(payload)/admin/importMap.js` se escribió a mano (mapa vacío, sin
  componentes personalizados) y el admin funciona. Además, las páginas del
  admin importaban `./importMap.js` pero el archivo vive en `admin/`:
  se corrigió a `../importMap.js`, y `layout.tsx` se reescribió según la
  plantilla oficial de Payload 3.94 (props `importMap` y `serverFunction`
  del `RootLayout`).
- La primera petición a `/api/users` tras arrancar tarda ~18 s (compilación de
  la ruta + creación de la BD). Las siguientes responden en milisegundos.
- Sin autenticación, `GET /api/users` responde 403 JSON (correcto: la lectura
  exige usuario autenticado según el esquema).
