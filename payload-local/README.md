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
