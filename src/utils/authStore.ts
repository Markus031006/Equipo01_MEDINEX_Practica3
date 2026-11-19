import { payloadFetch, setAuthToken } from './payloadClient'

export type Role = 'Paciente' | 'Recepción' | 'Profesional' | 'Coordinación' | 'TI'

export interface Session {
  userId?: string
  username: string
  name: string
  role: Role
  id: string | null // Matrícula
  token?: string
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

const SESSION_KEY = 'medinex_session'
const REMEMBER_KEY = 'medinex_remember_user'

// Dominio interno para satisfacer autenticación estándar de Payload si usa email + username
export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase()
  return clean.includes('@') ? clean : `${clean}@medinex.buap.mx`
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const errors: Record<string, string> = {}
  const name = input.name.trim()
  const username = input.username.trim().toLowerCase()
  const id = input.id.trim()

  if (!name) errors.name = 'Este campo es obligatorio'
  if (!username) errors.username = 'Este campo es obligatorio'
  else if (!/^[a-z0-9._]{4,20}$/.test(username)) {
    errors.username = 'Usa de 4 a 20 caracteres: minúsculas, números, punto o guion bajo.'
  }

  if (!id) errors.id = 'Este campo es obligatorio'
  else if (!/^\d{9}$/.test(id)) {
    errors.id = 'La matrícula debe tener 9 dígitos.'
  }

  if (!input.password) errors.password = 'Este campo es obligatorio'
  else if (input.password.length < 8 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
    errors.password = 'Mínimo 8 caracteres, con al menos una letra y un número.'
  }

  if (!input.confirmPassword) errors.confirmPassword = 'Este campo es obligatorio'
  else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  try {
    await payloadFetch(
      '/users',
      {
        method: 'POST',
        body: JSON.stringify({
          email: usernameToEmail(username),
          username,
          name,
          role: 'Paciente',
          matricula: id,
          password: input.password,
        }),
      },
      true
    )
    return { ok: true, username }
  } catch (err: any) {
    const msg = String(err?.message || '')
    if (msg.toLowerCase().includes('username') || msg.toLowerCase().includes('email') || msg.toLowerCase().includes('duplicate')) {
      return { ok: false, errors: { username: 'Ese nombre de usuario o matrícula ya está registrado.' } }
    }
    return { ok: false, errors: { form: msg || 'No se pudo registrar la cuenta en Payload CMS.' } }
  }
}

export async function loginUser(username: string, password: string): Promise<Session | null> {
  const cleanUser = username.trim().toLowerCase()
  if (!cleanUser || !password) return null

  try {
    // Payload autentica nativamente por email o username según configuración; enviamos ambos o email derivado
    const res = await payloadFetch<{
      token: string
      user: {
        id: string
        username?: string
        email?: string
        name: string
        role: Role
        matricula?: string | null
      }
    }>(
      '/users/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: usernameToEmail(cleanUser),
          password,
        }),
      },
      true
    )

    if (!res?.token || !res?.user) return null

    setAuthToken(res.token)
    const session: Session = {
      userId: res.user.id,
      username: res.user.username || cleanUser,
      name: res.user.name,
      role: res.user.role,
      id: res.user.matricula ?? null,
      token: res.token,
    }
    setSession(session)
    return session
  } catch {
    return null
  }
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
    if (session.token) {
      setAuthToken(session.token)
    }
  } catch {
    // sin almacenamiento
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthToken(null)
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
