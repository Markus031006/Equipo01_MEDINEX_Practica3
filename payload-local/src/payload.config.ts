import path from 'path'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fileURLToPath } from 'url'
import { Users, Appointments, ScheduleBlocks, AuditLog } from './collections'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Orígenes del frontend permitidos: los locales de siempre más los que se
// pasen por FRONTEND_URL (lista separada por comas, p. ej. la URL de Railway).
const frontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const localOrigins = ['http://localhost:5173', 'http://localhost:8443']

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
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./medinex.db',
    },
    // En producción Payload no empuja el esquema solo: corre estas
    // migraciones al arrancar (crean las tablas en un volumen vacío).
    prodMigrations: migrations,
  }),
  cors: [...localOrigins, ...frontendOrigins],
  csrf: [...localOrigins, ...frontendOrigins],
})
