export type Role = 'Paciente' | 'Recepción' | 'Profesional' | 'Coordinación' | 'TI'

export interface StoredUser {
  username: string
  name: string
  role: Role
  id: string | null
  salt: string
  passwordHash: string
}

export interface Session {
  username: string
  name: string
  role: Role
  id: string | null
}

export interface RegisterInput {
  name: string
  username: string
  id: string
  password: string
  confirmPassword: string
}

export type RegisterResult =
  | { ok: true; username: string }
  | { ok: false; errors: Record<string, string> }

const USERS_KEY = 'medinex_users_v3'
const SESSION_KEY = 'medinex_session'
const REMEMBER_KEY = 'medinex_remember_user'


const PRELOADED_USERS: { username: string; rawPass: string; name: string; role: Role; id?: string }[] = [
  { username: 'markus', rawPass: '1234', name: 'Markus Hernández', role: 'Paciente', id: '202400101' },
  { username: 'alexis', rawPass: '4567', name: 'Alexis Anaya', role: 'Paciente', id: '202400102' },
  { username: 'oscar', rawPass: '7890', name: 'Oscar Martínez', role: 'Paciente', id: '202400103' },
  { username: 'ana.torres', rawPass: 'paciente2026', name: 'Ana Torres Ruiz', role: 'Paciente', id: 'MAT-0001' },
  { username: 'luis.perez', rawPass: 'recep2026a', name: 'Luis Pérez', role: 'Recepción' },
  { username: 'marta.gil', rawPass: 'recep2026b', name: 'Marta Gil Olvera', role: 'Recepción' },
  { username: 'jose.leon', rawPass: 'recep2026c', name: 'José León Barrera', role: 'Recepción' },
  { username: 'laura.mendoza', rawPass: 'prof2026a', name: 'Dra. Laura Mendoza', role: 'Profesional' },
  { username: 'carlos.ibarra', rawPass: 'prof2026b', name: 'Dr. Carlos Ibarra', role: 'Profesional' },
  { username: 'sofia.herrera', rawPass: 'prof2026c', name: 'Lic. Sofía Herrera', role: 'Profesional' },
  { username: 'diego.ramirez', rawPass: 'prof2026d', name: 'Mtro. Diego Ramírez', role: 'Profesional' },
  { username: 'elena.vargas', rawPass: 'coord2026a', name: 'Mtra. Elena Vargas', role: 'Coordinación' },
  { username: 'hector.ruiz', rawPass: 'coord2026b', name: 'Mtro. Héctor Ruiz Meza', role: 'Coordinación' },
  { username: 'patricia.mora', rawPass: 'coord2026c', name: 'Mtra. Patricia Mora Díaz', role: 'Coordinación' },
  { username: 'raul.campos', rawPass: 'ti2026a', name: 'Ing. Raúl Campos', role: 'TI' },
  { username: 'diana.ortega', rawPass: 'ti2026b', name: 'Ing. Diana Ortega', role: 'TI' },
  { username: 'mario.beltran', rawPass: 'ti2026c', name: 'Ing. Mario Beltrán', role: 'TI' },
]

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + password)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]): boolean {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return true
  } catch {
    return false
  }
}

export async function initializePreloadedUsers(): Promise<void> {
  const users = readUsers()
  const missing = PRELOADED_USERS.filter(p => !users.some(u => u.username === p.username))
  if (missing.length === 0) return
  const added: StoredUser[] = await Promise.all(
    missing.map(async p => {
      const salt = randomSalt()
      return {
        username: p.username,
        name: p.name,
        role: p.role,
        id: p.id ?? null,
        salt,
        passwordHash: await hashPassword(p.rawPass, salt),
      }
    })
  )
  writeUsers([...users, ...added])
}

export function getUsers(): Session[] {
  return readUsers().map(u => ({ username: u.username, name: u.name, role: u.role, id: u.id }))
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const errors: Record<string, string> = {}
  const name = input.name.trim()
  const username = input.username.trim().toLowerCase()
  const id = input.id.trim()
  const users = readUsers()

  if (!name) errors.name = 'Este campo es obligatorio'
  if (!username) errors.username = 'Este campo es obligatorio'
  else if (!/^[a-z0-9._]{4,20}$/.test(username)) {
    errors.username = 'Usa de 4 a 20 caracteres: minúsculas, números, punto o guion bajo.'
  } else if (users.some(u => u.username === username)) {
    errors.username = 'Ese nombre de usuario ya está en uso.'
  }
  if (!id) errors.id = 'Este campo es obligatorio'
  else if (!/^\d{9}$/.test(id)) errors.id = 'La matrícula debe tener 9 dígitos.'
  else if (users.some(u => u.id === id)) errors.id = 'Esa matrícula ya está registrada.'
  if (!input.password) errors.password = 'Este campo es obligatorio'
  else if (input.password.length < 8 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
    errors.password = 'Mínimo 8 caracteres, con al menos una letra y un número.'
  }
  if (!input.confirmPassword) errors.confirmPassword = 'Este campo es obligatorio'
  else if (input.confirmPassword !== input.password) errors.confirmPassword = 'Las contraseñas no coinciden.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const salt = randomSalt()
  const user: StoredUser = {
    username,
    name,
    role: 'Paciente',
    id,
    salt,
    passwordHash: await hashPassword(input.password, salt),
  }
  if (!writeUsers([...users, user])) {
    return { ok: false, errors: { form: 'No se pudo guardar la cuenta en este navegador.' } }
  }
  return { ok: true, username }
}

export async function loginUser(username: string, password: string): Promise<Session | null> {
  const user = readUsers().find(u => u.username === username.trim().toLowerCase())
  if (!user) return null
  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) return null
  const session: Session = { username: user.username, name: user.name, role: user.role, id: user.id }
  setSession(session)
  return session
}

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // sin almacenamiento: la sesión vive solo en memoria de la app
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // nada que limpiar
  }
}

export function getRememberedUser(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setRememberedUser(username: string | null): void {
  try {
    if (username) localStorage.setItem(REMEMBER_KEY, username)
    else localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // sin almacenamiento
  }
}