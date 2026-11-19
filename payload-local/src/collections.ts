import type { CollectionConfig } from 'payload'

const isAuthenticated = ({ req: { user } }: any) => Boolean(user)

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  access: {
    create: () => true, // Permite autorregistro de Pacientes y siembra
    read: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'username', type: 'text', required: true, unique: true },
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'Paciente',
      options: ['Paciente', 'Recepción', 'Profesional', 'Coordinación', 'TI'],
    },
    { name: 'matricula', type: 'text' },
  ],
}

export const Appointments: CollectionConfig = {
  slug: 'appointments',
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'folio', type: 'text', required: true, unique: true },
    { name: 'patient_name', type: 'text', required: true },
    { name: 'patient_id', type: 'text', required: true },
    { name: 'contact', type: 'text' },
    { name: 'user_type', type: 'text' },
    { name: 'professional', type: 'text', required: true },
    { name: 'service', type: 'text', required: true },
    { name: 'date', type: 'text', required: true },
    { name: 'start_time', type: 'text', required: true },
    { name: 'end_time', type: 'text', required: true },
    { name: 'room', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'programada',
      options: ['programada', 'confirmada', 'atendida', 'no presentada', 'cancelada'],
    },
    { name: 'channel', type: 'text' },
    { name: 'created_by', type: 'text' },
  ],
}

export const ScheduleBlocks: CollectionConfig = {
  slug: 'schedule-blocks',
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'professional', type: 'text', required: true },
    { name: 'start_date', type: 'text', required: true },
    { name: 'end_date', type: 'text', required: true },
    { name: 'start_time', type: 'text', required: true },
    { name: 'end_time', type: 'text', required: true },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: ['Capacitación', 'Ausencia', 'Indisponibilidad'],
    },
    { name: 'detail', type: 'text' },
  ],
}

export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: () => false, // Bitácora inmutable
    delete: () => false,
  },
  fields: [
    { name: 'actor', type: 'text', required: true },
    { name: 'actor_role', type: 'text' },
    { name: 'action', type: 'text', required: true },
    { name: 'target', type: 'text' },
    { name: 'result', type: 'select', options: ['Exitoso', 'Rechazado'] },
    { name: 'created_at', type: 'text' },
  ],
}
