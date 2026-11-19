import { useSyncExternalStore } from 'react'

export type AppointmentStatus =
  | 'programada'
  | 'confirmada'
  | 'atendida'
  | 'no presentada'
  | 'cancelada'

export type BookingChannel = 'Autoservicio' | 'Teléfono' | 'Correo' | 'Mensajería' | 'Ventanilla'
export type BlockReason = 'Capacitación' | 'Ausencia' | 'Indisponibilidad'

export interface Appointment {
  id: string
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
  status: AppointmentStatus
}

export interface ScheduleBlock {
  id: string
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

const STORAGE_KEY = 'medinex_data_v1'
const EMPTY_STORE: Store = { appointments: [], blocks: [], audit: [] }

export const professionalNames: Record<string, string> = {
  'Consulta general': 'Dra. Laura Mendoza',
  Nutrición: 'Dr. Carlos Ibarra',
  'Psicología preventiva': 'Lic. Sofía Herrera',
  Orientación: 'Mtro. Diego Ramírez',
}

const rooms: Record<string, string> = {
  'Consulta general': 'Consultorio 2',
  Nutrición: 'Consultorio 3',
  'Psicología preventiva': 'Consultorio 4',
  Orientación: 'Consultorio 1',
}

const dates = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']
const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30']

function readStore(): Store {
  if (typeof window === 'undefined') return EMPTY_STORE

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STORE
    const parsed = JSON.parse(raw) as Partial<Store>
    return {
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    }
  } catch {
    return EMPTY_STORE
  }
}

let store = readStore()
const listeners = new Set<() => void>()

function emit(nextStore: Store): void {
  store = nextStore
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // El prototipo sigue operando en memoria si el navegador bloquea el almacenamiento.
  }
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

function nextId(prefix: string, records: Array<{ id: string }>): string {
  const largest = records.reduce((max, record) => {
    const value = Number(record.id.replace(/\D/g, ''))
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
  return `${prefix}-${String(largest + 1).padStart(4, '0')}`
}

function audit(actor: Actor, action: string, reference: string, result: AuditEntry['result']): AuditEntry {
  return {
    id: nextId('BIT', store.audit),
    timestamp: new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date()),
    userName: actor.name,
    role: actor.role,
    action,
    reference,
    result,
  }
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB
}

function appointmentIsActive(appointment: Appointment): boolean {
  return appointment.status === 'programada' || appointment.status === 'confirmada'
}

export function resetData(): void {
  store = EMPTY_STORE
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento persistente no hay nada adicional que limpiar.
  }
  listeners.forEach((listener) => listener())
}

export function createAppointment(
  input: AppointmentInput,
  actor: Actor,
): { ok: true; appointment: Appointment } | { ok: false; error: string } {
  const unavailable = store.appointments.some(
    (appointment) =>
      appointmentIsActive(appointment) &&
      appointment.professional === input.professional &&
      appointment.date === input.date &&
      overlaps(appointment.start, appointment.end, input.start, input.end),
  )

  const blocked = store.blocks.some(
    (block) =>
      block.professional === input.professional &&
      input.date >= block.startDate &&
      input.date <= block.endDate &&
      overlaps(
        input.start,
        input.end,
        input.date === block.startDate ? block.startTime : '00:00',
        input.date === block.endDate ? block.endTime : '23:59',
      ),
  )

  if (unavailable || blocked) {
    const rejected = audit(actor, 'Intentó registrar una cita en una franja no disponible', '—', 'Rechazado')
    emit({ ...store, audit: [rejected, ...store.audit] })
    return { ok: false, error: 'La franja seleccionada ya no está disponible. Elige otro horario.' }
  }

  const appointment: Appointment = {
    ...input,
    id: nextId('CIT', store.appointments),
    status: 'programada',
  }
  const entry = audit(actor, 'Registró una cita', appointment.id, 'Exitoso')
  emit({
    ...store,
    appointments: [...store.appointments, appointment],
    audit: [entry, ...store.audit],
  })
  return { ok: true, appointment }
}

export function changeStatus(id: string, status: AppointmentStatus, actor: Actor): boolean {
  const appointment = store.appointments.find((item) => item.id === id)
  if (!appointment) return false

  const allowed: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
    programada: ['confirmada'],
    confirmada: ['atendida', 'no presentada'],
  }
  if (!allowed[appointment.status]?.includes(status)) {
    const entry = audit(actor, `Intentó cambiar estado a ${status}`, id, 'Rechazado')
    emit({ ...store, audit: [entry, ...store.audit] })
    return false
  }

  const entry = audit(actor, `Cambió estado a ${status}`, id, 'Exitoso')
  emit({
    ...store,
    appointments: store.appointments.map((item) => (item.id === id ? { ...item, status } : item)),
    audit: [entry, ...store.audit],
  })
  return true
}

export function cancelAppointment(id: string, actor: Actor, channel: string): boolean {
  const appointment = store.appointments.find((item) => item.id === id)
  if (!appointment || !appointmentIsActive(appointment)) {
    const entry = audit(actor, 'Intentó cancelar una cita', id, 'Rechazado')
    emit({ ...store, audit: [entry, ...store.audit] })
    return false
  }

  const entry = audit(actor, `Canceló una cita · ${channel}`, id, 'Exitoso')
  emit({
    ...store,
    appointments: store.appointments.map((item) =>
      item.id === id ? { ...item, status: 'cancelada' as const } : item,
    ),
    audit: [entry, ...store.audit],
  })
  return true
}

export function rescheduleAppointment(
  id: string,
  date: string,
  start: string,
  end: string,
  actor: Actor,
): { ok: true } | { ok: false; error: string } {
  const appointment = store.appointments.find((item) => item.id === id)
  if (!appointment || !appointmentIsActive(appointment)) {
    return { ok: false, error: 'La cita ya no se puede reprogramar.' }
  }

  const conflict = store.appointments.some(
    (item) =>
      item.id !== id &&
      appointmentIsActive(item) &&
      item.professional === appointment.professional &&
      item.date === date &&
      overlaps(item.start, item.end, start, end),
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
        date === block.endDate ? block.endTime : '23:59',
      ),
  )

  if (conflict || blocked) {
    const entry = audit(actor, 'Intentó reprogramar una cita a una franja no disponible', id, 'Rechazado')
    emit({ ...store, audit: [entry, ...store.audit] })
    return { ok: false, error: 'La franja seleccionada ya no está disponible.' }
  }

  const entry = audit(actor, 'Reprogramó una cita', id, 'Exitoso')
  emit({
    ...store,
    appointments: store.appointments.map((item) =>
      item.id === id ? { ...item, date, start, end, status: 'programada' as const } : item,
    ),
    audit: [entry, ...store.audit],
  })
  return { ok: true }
}

export function createBlock(
  input: BlockInput,
  actor: Actor,
): { success: true } | { success: false; affectedAppointments: Appointment[] } {
  const affectedAppointments = store.appointments.filter((appointment) => {
    if (appointment.professional !== input.professional || !appointmentIsActive(appointment)) return false
    if (appointment.date < input.startDate || appointment.date > input.endDate) return false
    return overlaps(
      appointment.start,
      appointment.end,
      appointment.date === input.startDate ? input.startTime : '00:00',
      appointment.date === input.endDate ? input.endTime : '23:59',
    )
  })

  if (affectedAppointments.length > 0) {
    const entry = audit(actor, 'Intentó bloquear un horario con citas activas', '—', 'Rechazado')
    emit({ ...store, audit: [entry, ...store.audit] })
    return { success: false, affectedAppointments }
  }

  const block: ScheduleBlock = {
    ...input,
    id: nextId('BLQ', store.blocks),
  }
  const entry = audit(actor, 'Registró un bloqueo de horario', block.id, 'Exitoso')
  emit({
    ...store,
    blocks: [...store.blocks, block],
    audit: [entry, ...store.audit],
  })
  return { success: true }
}

export function getSlots(service: string): SlotInfo[] {
  const professional = professionalNames[service] ?? ''
  const room = rooms[service] ?? 'Consultorio'

  return dates.flatMap((date) =>
    times.map((start) => {
      const [hour, minute] = start.split(':').map(Number)
      const totalMinutes = hour * 60 + minute + 30
      const end = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
      const appointment = store.appointments.find(
        (item) =>
          appointmentIsActive(item) &&
          item.professional === professional &&
          item.date === date &&
          overlaps(item.start, item.end, start, end),
      )
      const block = store.blocks.find(
        (item) =>
          item.professional === professional &&
          date >= item.startDate &&
          date <= item.endDate &&
          overlaps(
            start,
            end,
            date === item.startDate ? item.startTime : '00:00',
            date === item.endDate ? item.endTime : '23:59',
          ),
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
    }),
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
