import path from 'path'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fileURLToPath } from 'url'
import { Users, Appointments, ScheduleBlocks, AuditLog } from './collections'
import { migrations as sqliteMigrations } from './migrations'
import { migrations as postgresMigrations } from './migrations-postgres'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Orígenes del frontend permitidos: los locales de siempre más los que se
// pasen por FRONTEND_URL (lista separada por comas, p. ej. la URL de Vercel).
const frontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const localOrigins = ['http://localhost:5173', 'http://localhost:8443']

// Base de datos por entorno:
// - `file:...` (por defecto) → SQLite local, como siempre (`./medinex.db`).
// - `postgres://` o `postgresql://` → Postgres (Neon, plan gratuito).
//   La cadena pooled de Neon lleva `?sslmode=require`; el pool de `pg` la
//   respeta y abre TLS. La base ya debe existir en Neon (se crea en su panel).
const databaseURI = process.env.DATABASE_URI || 'file:./medinex.db'
const isPostgres =
  databaseURI.startsWith('postgres://') || databaseURI.startsWith('postgresql://')

const db = isPostgres
  ? postgresAdapter({
      pool: { connectionString: databaseURI },
      // En producción Payload no empuja el esquema solo: corre estas
      // migraciones al arrancar (crean las tablas en una base vacía).
      prodMigrations: postgresMigrations,
    })
  : sqliteAdapter({
      client: {
        url: databaseURI,
      },
      // En producción Payload no empuja el esquema solo: corre estas
      // migraciones al arrancar (crean las tablas en un volumen vacío).
      prodMigrations: sqliteMigrations,
    })

export default buildConfig({
  admin: {
    user: Users.slug,
  },
  collections: [Users, Appointments, ScheduleBlocks, AuditLog],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.PAYLOAD_SERVER_URL || 'http://localhost:3000',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  cors: [...localOrigins, ...frontendOrigins],
  csrf: [...localOrigins, ...frontendOrigins],
})
