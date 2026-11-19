import { useSyncExternalStore } from 'react'
import { payloadFetch, type PayloadListResponse } from './payloadClient'
import { usernameToEmail } from './authStore'

export type AppointmentStatus =
  | 'programada'
  | 'confirmada'
  | 'atendida'
  | 'no presentada'
  | 'cancelada'

export type BookingChannel = 'Autoservicio' | 'Teléfono' | 'Correo' | 'Mensajería' | 'Ventanilla'
export type BlockReason = 'Capacitación' | 'Ausencia' | 'Indisponibilidad'

export interface Appointment {
  id: string // Folio legible 'CIT-0001'
  docId?: string // ID interno de documento en Payload
  patientName: string
  patientId: string
  contact?: string
  userType?: string
  channel: BookingChannel
  service: string
  professional: string
  date: string // 'YYYY-MM-DD'
  start: string // 'HH:MM'
  end: string // 'HH:MM'
  room: string
  status: AppointmentStatus
}

export interface ScheduleBlock {
  id: string
  docId?: string
  professional: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  reason: BlockReason
  detail: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  userName: string
  role: string
  action: string
  reference: string
  result: 'Exitoso' | 'Rechazado'
}

export interface SlotInfo {
  id: string
  service: string
  professional: string
  dateVal: string
  dateLabel: string
  start: string
  end: string
  timeLabel: string
  room: string
  isAvailable: boolean
  reasonDisabled?: string
}

interface Store {
  appointments: Appointment[]
  blocks: ScheduleBlock[]
  audit: AuditEntry[]
  loading: boolean
  error: string | null
}

interface Actor {
  name: string
  role: string
}

interface AppointmentInput {
  patientName: string
  patientId: string
  contact?: string
  userType?: string
  channel: BookingChannel
  service: string
  professional: string
  date: string
  start: string
  end: string
  room: string
}

interface BlockInput {
  professional: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  reason: BlockReason
  detail: string
}

export const professionalNames: Record<string, string> = {
  'Consulta general': 'Dra. Laura Mendoza',
  Nutrición: 'Dr. Carlos Ibarra',
  'Psicología preventiva': 'Lic. Sofía Herrera',
  Orientación: 'Mtro. Diego Ramírez',
}

export const roomsByService: Record<string, string> = {
  'Consulta general': 'Consultorio 2',
  Nutrición: 'Consultorio 3',
  'Psicología preventiva': 'Consultorio 4',
  Orientación: 'Consultorio 1',
}

// Franjas de 30 min de 09:00 a 14:00 (último bloque inicia 13:30 y termina 14:00)
const WORKING_TIMES = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
]

let store: Store = {
  appointments: [],
  blocks: [],
  audit: [],
  loading: false,
  error: null,
}

const listeners = new Set<() => void>()

function emit(partial: Partial<Store>): void {
  store = { ...store, ...partial }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Store {
  return store
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

function formatNow(): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB
}

function appointmentIsActive(appointment: Appointment): boolean {
  return appointment.status === 'programada' || appointment.status === 'confirmada'
}

// Mapeo entre documentos Payload y tipos de la UI
function mapPayloadAppointment(doc: any): Appointment {
  return {
    id: doc.folio || doc.id,
    docId: doc.id,
    patientName: doc.patient_name || '',
    patientId: doc.patient_id || '',
    contact: doc.contact || '',
    userType: doc.user_type || 'Estudiante',
    channel: (doc.channel as BookingChannel) || 'Autoservicio',
    service: doc.service || 'Consulta general',
    professional: doc.professional || '',
    date: doc.date || '',
    start: doc.start_time || '',
    end: doc.end_time || '',
    room: doc.room || roomsByService[doc.service] || 'Consultorio',
    status: (doc.status as AppointmentStatus) || 'programada',
  }
}

function mapPayloadBlock(doc: any): ScheduleBlock {
  return {
    id: doc.id,
    docId: doc.id,
    professional: doc.professional || '',
    startDate: doc.start_date || '',
    startTime: doc.start_time || '',
    endDate: doc.end_date || '',
    endTime: doc.end_time || '',
    reason: (doc.reason as BlockReason) || 'Indisponibilidad',
    detail: doc.detail || '',
  }
}

function mapPayloadAudit(doc: any): AuditEntry {
  return {
    id: doc.id,
    timestamp: doc.created_at || formatNow(),
    userName: doc.actor || 'Sistema',
    role: doc.actor_role || 'Sistema',
    action: doc.action || '',
    reference: doc.target || '—',
    result: doc.result === 'Rechazado' ? 'Rechazado' : 'Exitoso',
  }
}

export async function refreshStoreData(): Promise<void> {
  emit({ loading: true, error: null })
  try {
    const [apptsRes, blocksRes, auditRes] = await Promise.all([
      payloadFetch<PayloadListResponse<any>>('/appointments?limit=500&sort=-createdAt'),
      payloadFetch<PayloadListResponse<any>>('/schedule-blocks?limit=200&sort=-createdAt'),
      payloadFetch<PayloadListResponse<any>>('/audit-log?limit=300&sort=-createdAt'),
    ])

    emit({
      appointments: apptsRes.docs.map(mapPayloadAppointment),
      blocks: blocksRes.docs.map(mapPayloadBlock),
      audit: auditRes.docs.map(mapPayloadAudit),
      loading: false,
      error: null,
    })
  } catch (err: any) {
    emit({
      loading: false,
      error: err?.message || 'Error al sincronizar datos con Payload CMS.',
    })
  }
}

async function logAuditRemote(
  actor: Actor,
  action: string,
  target: string,
  result: 'Exitoso' | 'Rechazado'
): Promise<void> {
  try {
    await payloadFetch('/audit-log', {
      method: 'POST',
      body: JSON.stringify({
        actor: actor.name,
        actor_role: actor.role,
        action,
        target,
        result,
        created_at: formatNow(),
      }),
    })
  } catch {
    // No interrumpir flujo principal si falla la bitácora secundaria
  }
}

function nextFolio(appointments: Appointment[]): string {
  const maxNum = appointments.reduce((max, item) => {
    const num = Number(String(item.id).replace(/\D/g, ''))
    return Number.isFinite(num) ? Math.max(max, num) : max
  }, 0)
  return `CIT-${String(maxNum + 1).padStart(4, '0')}`
}

export async function createAppointment(
  input: AppointmentInput,
  actor: Actor
): Promise<{ ok: true; appointment: Appointment } | { ok: false; error: string }> {
  try {
    // 1. Consulta fresca al backend para evitar condiciones de carrera / doble reserva real
    const [freshAppts, freshBlocks] = await Promise.all([
      payloadFetch<PayloadListResponse<any>>(
        `/appointments?where[professional][equals]=${encodeURIComponent(input.professional)}&where[date][equals]=${encodeURIComponent(input.date)}&limit=100`
      ),
      payloadFetch<PayloadListResponse<any>>(
        `/schedule-blocks?where[professional][equals]=${encodeURIComponent(input.professional)}&limit=100`
      ),
    ])

    const activeAppts = freshAppts.docs.map(mapPayloadAppointment).filter(appointmentIsActive)
    const blocks = freshBlocks.docs.map(mapPayloadBlock)

    const isTaken = activeAppts.some((a) => overlaps(a.start, a.end, input.start, input.end))
    const isBlocked = blocks.some(
      (b) =>
        input.date >= b.startDate &&
        input.date <= b.endDate &&
        overlaps(
          input.start,
          input.end,
          input.date === b.startDate ? b.startTime : '00:00',
          input.date === b.endDate ? b.endTime : '23:59'
        )
    )

    if (isTaken || isBlocked) {
      await logAuditRemote(actor, 'Intentó registrar una cita en una franja no disponible', '—', 'Rechazado')
      await refreshStoreData()
      return {
        ok: false,
        error: 'Conflicto de disponibilidad: la franja ya fue tomada por otra solicitud. Elige otra franja.',
      }
    }

    const folio = nextFolio(store.appointments)
    const created = await payloadFetch<{ doc: any }>('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        folio,
        patient_name: input.patientName,
        patient_id: input.patientId,
        contact: input.contact || '',
        user_type: input.userType || 'Estudiante',
        professional: input.professional,
        service: input.service,
        date: input.date,
        start_time: input.start,
        end_time: input.end,
        room: input.room,
        status: 'programada',
        channel: input.channel,
        created_by: actor.name,
      }),
    })

    const appointment = mapPayloadAppointment(created.doc || created)
    await logAuditRemote(
      actor,
      actor.role === 'Recepción' ? 'Registró una cita asistida' : 'Reservó una cita',
      appointment.id,
      'Exitoso'
    )
    await refreshStoreData()
    return { ok: true, appointment }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al registrar la cita en el servidor.' }
  }
}

export async function changeStatus(
  appointment: Appointment,
  status: AppointmentStatus,
  actor: Actor
): Promise<boolean> {
  const allowed: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
    programada: ['confirmada'],
    confirmada: ['atendida', 'no presentada'],
  }

  if (!allowed[appointment.status]?.includes(status)) {
    await logAuditRemote(
      actor,
      `Intento de cambio de estado de "${appointment.status}" a "${status}"`,
      appointment.id,
      'Rechazado'
    )
    await refreshStoreData()
    return false
  }

  try {
    const targetId = appointment.docId || appointment.id
    await payloadFetch(`/appointments/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    await logAuditRemote(actor, `Cambió estado a ${status}`, appointment.id, 'Exitoso')
    await refreshStoreData()
    return true
  } catch {
    return false
  }
}

export async function cancelAppointment(
  appointment: Appointment,
  actor: Actor,
  channel: string
): Promise<boolean> {
  if (!appointmentIsActive(appointment)) {
    await logAuditRemote(actor, 'Intento de cancelación no permitida', appointment.id, 'Rechazado')
    await refreshStoreData()
    return false
  }

  try {
    const targetId = appointment.docId || appointment.id
    await payloadFetch(`/appointments/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelada' }),
    })
    await logAuditRemote(actor, `Canceló una cita · ${channel}`, appointment.id, 'Exitoso')
    await refreshStoreData()
    return true
  } catch {
    return false
  }
}

export async function rescheduleAppointment(
  appointment: Appointment,
  date: string,
  start: string,
  end: string,
  actor: Actor
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!appointmentIsActive(appointment)) {
    return { ok: false, error: 'La cita ya no se puede reprogramar.' }
  }

  const conflict = store.appointments.some(
    (item) =>
      item.id !== appointment.id &&
      appointmentIsActive(item) &&
      item.professional === appointment.professional &&
      item.date === date &&
      overlaps(item.start, item.end, start, end)
  )
  const blocked = store.blocks.some(
    (block) =>
      block.professional === appointment.professional &&
      date >= block.startDate &&
      date <= block.endDate &&
      overlaps(
        start,
        end,
        date === block.startDate ? block.startTime : '00:00',
        date === block.endDate ? block.endTime : '23:59'
      )
  )

  if (conflict || blocked) {
    await logAuditRemote(actor, 'Intentó reprogramar una cita a una franja no disponible', appointment.id, 'Rechazado')
    await refreshStoreData()
    return { ok: false, error: 'La franja seleccionada ya no está disponible.' }
  }

  try {
    const targetId = appointment.docId || appointment.id
    await payloadFetch(`/appointments/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        date,
        start_time: start,
        end_time: end,
        status: 'programada',
      }),
    })
    await logAuditRemote(actor, 'Reprogramó una cita', appointment.id, 'Exitoso')
    await refreshStoreData()
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al reprogramar la cita.' }
  }
}

export async function createBlock(
  input: BlockInput,
  actor: Actor
): Promise<{ success: true } | { success: false; affectedAppointments: Appointment[] }> {
  const affectedAppointments = store.appointments.filter((appointment) => {
    if (appointment.professional !== input.professional || !appointmentIsActive(appointment)) return false
    if (appointment.date < input.startDate || appointment.date > input.endDate) return false
    return overlaps(
      appointment.start,
      appointment.end,
      appointment.date === input.startDate ? input.startTime : '00:00',
      appointment.date === input.endDate ? input.endTime : '23:59'
    )
  })

  if (affectedAppointments.length > 0) {
    await logAuditRemote(actor, 'Intento de bloqueo con citas afectadas', '—', 'Rechazado')
    await refreshStoreData()
    return { success: false, affectedAppointments }
  }

  try {
    const created = await payloadFetch<{ doc: any; id?: string }>('/schedule-blocks', {
      method: 'POST',
      body: JSON.stringify({
        professional: input.professional,
        start_date: input.startDate,
        end_date: input.endDate,
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.reason,
        detail: input.detail,
      }),
    })

    const blockId = created?.doc?.id || created?.id || 'BLQ'
    await logAuditRemote(actor, 'Registró un bloqueo de horario', blockId, 'Exitoso')
    await refreshStoreData()
    return { success: true }
  } catch {
    return { success: false, affectedAppointments: [] }
  }
}

// Genera fechas hábiles (Lunes a Viernes) dentro de un rango dinámico [startDate, endDate]
export function getWeekdaysInRange(startDateStr: string, endDateStr: string): string[] {
  const result: string[] = []
  const [sy, sm, sd] = startDateStr.split('-').map(Number)
  const [ey, em, ed] = endDateStr.split('-').map(Number)
  if (!sy || !sm || !sd || !ey || !em || !ed) return result

  const current = new Date(Date.UTC(sy, sm - 1, sd))
  const end = new Date(Date.UTC(ey, em - 1, ed))

  // Limitar a máximo 31 días por búsqueda para rendimiento óptimo
  let safetyCounter = 0
  while (current <= end && safetyCounter < 31) {
    const dayOfWeek = current.getUTCDay() // 0 = Dom, 6 = Sáb
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const yyyy = current.getUTCFullYear()
      const mm = String(current.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(current.getUTCDate()).padStart(2, '0')
      result.push(`${yyyy}-${mm}-${dd}`)
    }
    current.setUTCDate(current.getUTCDate() + 1)
    safetyCounter++
  }

  return result
}

export function getSlotsForRange(
  service: string,
  dateFrom: string,
  dateTo: string,
  appointmentsList: Appointment[],
  blocksList: ScheduleBlock[]
): SlotInfo[] {
  const professional = professionalNames[service] ?? ''
  const room = roomsByService[service] ?? 'Consultorio'
  const dates = getWeekdaysInRange(dateFrom, dateTo)

  return dates.flatMap((date) =>
    WORKING_TIMES.map((start) => {
      const [hour, minute] = start.split(':').map(Number)
      const totalMinutes = hour * 60 + minute + 30
      const end = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`

      const appointment = appointmentsList.find(
        (item) =>
          appointmentIsActive(item) &&
          item.professional === professional &&
          item.date === date &&
          overlaps(item.start, item.end, start, end)
      )

      const block = blocksList.find(
        (b) =>
          b.professional === professional &&
          date >= b.startDate &&
          date <= b.endDate &&
          overlaps(
            start,
            end,
            date === b.startDate ? b.startTime : '00:00',
            date === b.endDate ? b.endTime : '23:59'
          )
      )

      return {
        id: `${date}-${start}`,
        service,
        professional,
        dateVal: date,
        dateLabel: formatDateLabel(date),
        start,
        end,
        timeLabel: `${start}–${end}`,
        room,
        isAvailable: !appointment && !block,
        reasonDisabled: block ? `Bloqueo · ${block.reason}` : appointment ? 'Horario ocupado' : undefined,
      }
    })
  )
}

export function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace('.', '')
}

// ============================================================================
// SIEMBRA IDEMPOTENTE DE DATOS DEMO EN PAYLOAD CMS (17 usuarios)
// El conflicto del 27 oct 10:30 es como en el original: verificación en la UI,
// no una cita sembrada (ver handleSelectSlot en P-02/P-03).
// ============================================================================
const DEMO_USERS = [
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

export async function seedDemoDataInPayload(): Promise<string> {
  let createdUsers = 0

  // 1. Sembrar los 17 usuarios de forma idempotente
  for (const u of DEMO_USERS) {
    try {
      await payloadFetch(
        '/users',
        {
          method: 'POST',
          body: JSON.stringify({
            email: usernameToEmail(u.username),
            username: u.username,
            name: u.name,
            role: u.role,
            matricula: u.id || '',
            password: u.rawPass,
          }),
        },
        true
      )
      createdUsers++
    } catch {
      // Ya existe en Payload -> idempotente
    }
  }

  return `Siembra completada (${createdUsers} usuarios nuevos verificados).`
}
