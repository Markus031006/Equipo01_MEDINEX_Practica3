import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react'

import {
  type Session,
  initializePreloadedUsers,
  registerUser,
  loginUser,
  getSession,
  clearSession,
  getRememberedUser,
  setRememberedUser,
} from './utils/authStore'

import {
  useStore,
  resetData,
  createAppointment,
  changeStatus,
  cancelAppointment,
  rescheduleAppointment,
  createBlock,
  getSlots,
  professionalNames,
  formatDateLabel,
  type Appointment,
  type SlotInfo,
  type AppointmentStatus,
  type BookingChannel,
  type BlockReason,
} from './utils/dataStore'

type Role = 'Paciente' | 'Recepción' | 'Profesional' | 'Coordinación' | 'TI'
type Screen = 'P-02' | 'P-03' | 'P-04' | 'P-05' | 'P-06' | 'P-07' | 'P-08' | 'P-09'
type IconName =
  | 'calendar'
  | 'clock'
  | 'users'
  | 'chart'
  | 'settings'
  | 'log'
  | 'plus'
  | 'chevron'
  | 'search'
  | 'lock'
  | 'check'
  | 'warning'
  | 'close'
  | 'eye'
  | 'menu'
  | 'alert-circle'

const roleLabels: Record<Role, string> = {
  Paciente: 'Paciente',
  Recepción: 'Recepción',
  Profesional: 'Profesional',
  Coordinación: 'Coordinación',
  TI: 'TI institucional',
}

const roleMenu: Record<Role, { id: Screen; label: string; icon: IconName }[]> = {
  Paciente: [
    { id: 'P-02', label: 'Reservar cita', icon: 'plus' },
    { id: 'P-06', label: 'Mis citas', icon: 'calendar' },
  ],
  Recepción: [
    { id: 'P-03', label: 'Registrar cita', icon: 'plus' },
    { id: 'P-06', label: 'Citas registradas', icon: 'calendar' },
  ],
  Profesional: [
    { id: 'P-04', label: 'Mi agenda', icon: 'calendar' },
    { id: 'P-05', label: 'Bloquear horario', icon: 'lock' },
  ],
  Coordinación: [
    { id: 'P-07', label: 'Catálogos y políticas', icon: 'settings' },
    { id: 'P-08', label: 'Indicadores', icon: 'chart' },
    { id: 'P-09', label: 'Bitácora', icon: 'log' },
  ],
  TI: [{ id: 'P-09', label: 'Bitácora', icon: 'log' }],
}

const screenTitles: Record<Screen, [string, string]> = {
  'P-02': ['Reservar cita', 'Encuentra un horario disponible para tu atención.'],
  'P-03': ['Registrar cita asistida', 'Agenda una cita a nombre de una persona usuaria.'],
  'P-04': ['Mi agenda', 'Consulta tus citas y bloqueos de la semana.'],
  'P-05': ['Bloquear horario', 'Registra periodos en los que no estarás disponible.'],
  'P-06': ['Mis citas', 'Consulta y administra tus próximas citas.'],
  'P-07': ['Catálogos y políticas', 'Administra la configuración del servicio.'],
  'P-08': ['Indicadores', 'Monitorea la operación de Bienestar Universitario.'],
  'P-09': ['Bitácora', 'Consulta la actividad administrativa del sistema.'],
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.91 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
    log: <><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/><path d="M9 15h3M9 11h6M9 7h3M16 3h5v5M14 10l7-7"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    warning: <><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    'alert-circle': <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Button({ children, variant = 'primary', icon, onClick, disabled, type = 'button', 'aria-label': ariaLabel }: {
  children?: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; 'aria-label'?: string
}) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{icon && <Icon name={icon} size={18}/>}{children && <span>{children}</span>}</button>
}

function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return <label className={`field ${error ? 'has-error' : ''}`}>
    <span className="field-label">{label}</span>
    {children}
    {error && <span className="field-error"><Icon name="alert-circle" size={14}/> {error}</span>}
    {hint && !error && <span className="field-hint">{hint}</span>}
  </label>
}

function Alert({ kind, children }: { kind: 'success' | 'error' | 'warning'; children: ReactNode }) {
  const role = kind === 'error' ? 'alert' : 'status'
  return <div className={`alert alert-${kind}`} role={role}><Icon name={kind === 'success' ? 'check' : 'warning'} size={20}/><div>{children}</div></div>
}

function Status({ children }: { children: string }) {
  return <span className={`status status-${children.replace(' ', '-')}`}>{children}</span>
}

function ConceptFooter() {
  return <footer className="concept-footer">Prototipo conceptual con datos ficticios. MEDINEX solo gestiona información administrativa de citas.</footer>
}

function Login({
  onLogin,
  onGoToRegister,
  onReset,
  successMessage,
}: {
  onLogin: (session: Session) => void;
  onGoToRegister: () => void;
  onReset: () => void;
  successMessage?: string | null;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<Role>('Paciente');

  useEffect(() => {
    const remembered = getRememberedUser();
    if (remembered) {
      setUsername(remembered);
      setRemember(true);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    await initializePreloadedUsers();

    const session = await loginUser(username.trim(), password);
    if (!session) {
      setError(true);
      return;
    }

    if (remember) {
      setRememberedUser(username.trim());
    } else {
      setRememberedUser(null);
    }

    onLogin(session);
  };

  const handleDemoRoleSelect = (role: Role) => {
    setSelectedDemoRole(role);
    setError(false);
    const demoAccounts: Record<Role, string> = {
      Paciente: 'markus',
      Recepción: 'luis.perez',
      Profesional: 'laura.mendoza',
      Coordinación: 'elena.vargas',
      TI: 'raul.campos',
    };
    setUsername(demoAccounts[role]);
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas restablecer todos los datos de prueba? Las citas, bloqueos y bitácora volverán a cero.')) {
      resetData();
      onReset();
      alert('Datos de prueba restablecidos correctamente.');
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand brand-login">
          <span className="brand-mark"><span/></span>
          <span>MEDINEX</span>
        </div>
        <div className="login-copy">
          <div className="eyebrow">Dirección de Bienestar Universitario</div>
          <h1>Gestión de citas<br/>administrativas</h1>
        </div>
        <div className="login-decoration" aria-hidden="true">
          <div className="deco-card dc-1"/>
          <div className="deco-card dc-2"/>
          <div className="deco-calendar"><Icon name="calendar" size={44}/></div>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-brand">MEDINEX</div>
          <h2>Iniciar sesión</h2>
          <p className="muted">Ingresa tus datos para continuar.</p>

          {successMessage && (
            <Alert kind="success">
              <span>{successMessage}</span>
            </Alert>
          )}

          {error && (
            <Alert kind="error">
              <span>Credenciales no válidas. Verifica tus datos e inténtalo de nuevo.</span>
            </Alert>
          )}

          <Field label="Usuario">
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(false); }}
              placeholder="Ej. markus o tu usuario"
              autoComplete="username"
              required
            />
          </Field>

          <Field label="Contraseña">
            <div className="password-field">
              <input
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword((value) => !value)}
              >
                <Icon name="eye"/>
              </button>
            </div>
          </Field>

          <div className="remember-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Recordar mi usuario</span>
            </label>
          </div>

          <Button type="submit">Ingresar</Button>

          <div className="form-toggle-link">
            <span>¿No tienes una cuenta? </span>
            <button type="button" className="text-button" onClick={onGoToRegister}>
              Crear cuenta
            </button>
          </div>

          <div className="demo-divider">
            <span>Rol (solo para demostración del prototipo)</span>
          </div>
          <div className="role-selector">
            {(Object.keys(roleLabels) as Role[]).map((item) => (
              <button
                type="button"
                key={item}
                className={selectedDemoRole === item ? 'selected' : ''}
                onClick={() => handleDemoRoleSelect(item)}
              >
                {roleLabels[item]}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Button variant="secondary" onClick={handleReset}>
              Restablecer datos de prueba
            </Button>
          </div>

          <p className="institutional-access">El acceso usa credenciales institucionales.</p>
        </form>
      </section>
      <ConceptFooter/>
    </main>
  );
}

function RegisterForm({
  onGoToLogin,
  onRegisterSuccess,
}: {
  onGoToLogin: () => void
  onRegisterSuccess: (username: string) => void
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    await initializePreloadedUsers()

    const res = await registerUser({
      name,
      username,
      id,
      password,
      confirmPassword,
    })

    if (!res.ok && res.errors) {
      setErrors(res.errors)
    } else if (res.ok && res.username) {
      onRegisterSuccess(res.username)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand brand-login">
          <span className="brand-mark"><span/></span>
          <span>MEDINEX</span>
        </div>
        <div className="login-copy">
          <div className="eyebrow">Dirección de Bienestar Universitario</div>
          <h1>Gestión de citas<br/>administrativas</h1>
        </div>
        <div className="login-decoration" aria-hidden="true">
          <div className="deco-card dc-1"/>
          <div className="deco-card dc-2"/>
          <div className="deco-calendar"><Icon name="calendar" size={44}/></div>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-brand">MEDINEX</div>
          <h2>Crear cuenta</h2>
          <p className="muted">Registro para personas usuarias / estudiantes.</p>

          <Alert kind="warning">
            <span>Prototipo conceptual: usa datos ficticios. Las cuentas se guardan solo en este navegador.</span>
          </Alert>

          {errors.form && (
            <Alert kind="error">
              <span>{errors.form}</span>
            </Alert>
          )}

          <Field label="Nombre completo" error={errors.name}>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '', form: '' })) }}
              placeholder="Ej. Pedro Morales"
              required
            />
          </Field>

          <Field label="Nombre de usuario" error={errors.username} hint="4 a 20 caracteres: minúsculas, números, punto o guion bajo.">
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setErrors(prev => ({ ...prev, username: '', form: '' })) }}
              placeholder="Ej. pedro.morales"
              required
            />
          </Field>

          <Field label="Matrícula" error={errors.id} hint="9 dígitos.">
            <input
              type="text"
              value={id}
              onChange={e => { setId(e.target.value); setErrors(prev => ({ ...prev, id: '', form: '' })) }}
              placeholder="Ej. 202400105"
              inputMode="numeric"
              maxLength={9}
              required
            />
          </Field>

          <Field label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres, con una letra y un número.">
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '', form: '' })) }}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword(v => !v)}
              >
                <Icon name="eye"/>
              </button>
            </div>
          </Field>

          <Field label="Confirmar contraseña" error={errors.confirmPassword}>
            <div className="password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '', form: '' })) }}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowConfirmPassword(v => !v)}
              >
                <Icon name="eye"/>
              </button>
            </div>
          </Field>

          <Button type="submit">Registrarme</Button>

          <div className="form-toggle-link">
            <span>¿Ya tienes una cuenta? </span>
            <button type="button" className="text-button" onClick={onGoToLogin}>
              Ya tengo cuenta
            </button>
          </div>
        </form>
      </section>
      <ConceptFooter/>
    </main>
  )
}

function Shell({
  session,
  screen,
  setScreen,
  logout,
  children,
}: {
  session: Session
  screen: Screen
  setScreen: (s: Screen) => void
  logout: () => void
  children: ReactNode
}) {
  const role = session.role

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><span/></span>
          <span>MEDINEX</span>
        </div>
        <div className="side-label">MENÚ PRINCIPAL</div>
        <nav>
          {roleMenu[role].map(item => (
            <button
              key={item.id}
              className={screen === item.id ? 'active' : ''}
              onClick={() => setScreen(item.id)}
            >
              <Icon name={item.icon}/>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="mobile-menu"><Icon name="menu"/></div>
          <div className="topbar-spacer"/>
          <div className="user-avatar">
            {session.name.split(' ').filter((_, i) => i < 2).map(n => n[0]).join('')}
          </div>
          <div className="user-meta">
            <strong>{session.name}</strong>
            <span>{role === 'Paciente' ? session.id || 'Sin matrícula' : 'Bienestar Universitario'}</span>
          </div>
          <span className="role-chip">{roleLabels[role]}</span>
          <div className="top-divider"/>
          <button className="logout" onClick={logout}>Cerrar sesión</button>
        </header>
        <main className="content">{children}</main>
        <ConceptFooter/>
      </div>
    </div>
  )
}

function PageHeader({ screen, action }: { screen: Screen; action?: ReactNode }) {
  return <div className="page-header"><div><h1>{screenTitles[screen][0]}</h1><p>{screenTitles[screen][1]}</p></div>{action}</div>
}

function Reserve({
  session,
  patient,
  setScreen,
  takenSlotIds,
  onMarkSlotTaken,
}: {
  session: Session;
  patient: { name: string; id: string };
  setScreen: (s: Screen) => void;
  takenSlotIds: string[];
  onMarkSlotTaken: (id: string) => void;
}) {
  const store = useStore();
  const [service, setService] = useState('Consulta general');
  const [professional, setProfessional] = useState('Dra. Laura Mendoza');
  const [dateFrom, setDateFrom] = useState('2026-10-26');
  const [dateTo, setDateTo] = useState('2026-10-30');
  const [hasSearched, setHasSearched] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState(false);

  const alertRef = useRef<HTMLDivElement | null>(null);

  const slots = useMemo(() => {
    return getSlots(service);
  }, [service, store.appointments, store.blocks]);

  useEffect(() => {
    if (!selectedSlot && slots.length > 0) {
      const firstAvailable = slots.find((s) => s.isAvailable);
      if (firstAvailable) setSelectedSlot(firstAvailable);
    }
  }, [slots, selectedSlot]);

  useEffect(() => {
    if (errorMsg && alertRef.current) {
      alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMsg]);

  const handleServiceChange = (s: string) => {
    setService(s);
    setProfessional(professionalNames[s] || '');
    setSelectedSlot(null);
    setErrorMsg(null);
  };

  const handleSelectSlot = (s: SlotInfo) => {
    if (s.dateVal === '2026-10-27' && s.start === '10:30' && service === 'Consulta general') {
      onMarkSlotTaken(`${s.service}:${s.id}`);
      setErrorMsg('Conflicto de disponibilidad: la franja ya fue tomada por otra solicitud. Elige otra franja.');
      setSelectedSlot(null);
      return;
    }

    const hasOverlap = store.appointments.some((a) => {
      if (a.patientId !== patient.id) return false;
      if (a.status === 'cancelada') return false;
      return a.date === s.dateVal && a.start === s.start;
    });

    if (hasOverlap) {
      setErrorMsg('Ya tienes una cita activa que se traslapa con esta franja.');
      setSelectedSlot(null);
      return;
    }

    setErrorMsg(null);
    setSelectedSlot(s);
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) return;

    const res = createAppointment(
      {
        patientName: patient.name,
        patientId: patient.id,
        channel: 'Autoservicio',
        service: selectedSlot.service,
        professional: selectedSlot.professional,
        date: selectedSlot.dateVal,
        start: selectedSlot.start,
        end: selectedSlot.end,
        room: selectedSlot.room,
      },
      { name: session.name, role: session.role }
    );

    if (res.ok) {
      setCreatedAppointmentId(res.appointment.id);
    } else {
      setErrorMsg(res.error);
      setSelectedSlot(null);
    }
  };

  if (createdAppointmentId && selectedSlot) {
    return (
      <div className="p02-success-container">
        <PageHeader screen="P-02" />
        <div className="p02-success-banner">
          <Alert kind="success">
            <strong>Cita reservada</strong>
            <span>Estado: <Status>programada</Status> · Folio: <strong>{createdAppointmentId}</strong></span>
          </Alert>
        </div>

        {notificationWarning ? (
          <Alert kind="warning">
            <span>La notificación quedó pendiente y se reintentará. Tu cita sigue vigente.</span>
          </Alert>
        ) : (
          <Alert kind="success">
            <span>Se envió una notificación de confirmación.</span>
          </Alert>
        )}

        <div className="card success-summary-card">
          <h2>Resumen de la cita</h2>
          <dl>
            <div><dt>Servicio</dt><dd>{selectedSlot.service}</dd></div>
            <div><dt>Profesional</dt><dd>{selectedSlot.professional}</dd></div>
            <div><dt>Fecha y hora</dt><dd>{formatDateLabel(selectedSlot.dateVal)}, {selectedSlot.timeLabel}</dd></div>
            <div><dt>Lugar</dt><dd>{selectedSlot.room}</dd></div>
            <div><dt>Paciente</dt><dd>{patient.name} ({patient.id})</dd></div>
          </dl>
          <p className="muted-notice">Solo se registran datos administrativos mínimos.</p>
        </div>

        <div className="success-actions">
          <Button onClick={() => setScreen('P-06')}>Ver mis citas</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setCreatedAppointmentId(null);
              setSelectedSlot(null);
              setErrorMsg(null);
            }}
          >
            Reservar otra
          </Button>
          <Button variant="ghost" onClick={() => setNotificationWarning((prev) => !prev)}>
            {notificationWarning ? 'Probar envío normal de notificación' : 'Simular falla de notificación'}
          </Button>
        </div>
      </div>
    );
  }

  const filteredSlots = hasSearched
    ? slots.filter((s) => s.dateVal >= dateFrom && s.dateVal <= dateTo)
    : [];

  return (
    <>
      <PageHeader screen="P-02" />

      <section className="card filter-card">
        <h2>Búsqueda de franjas disponibles</h2>
        <div className="filter-grid-p02">
          <Field label="Servicio">
            <select value={service} onChange={(e) => handleServiceChange(e.target.value)}>
              <option>Consulta general</option>
              <option>Nutrición</option>
              <option>Psicología preventiva</option>
              <option>Orientación</option>
            </select>
          </Field>
          <Field label="Profesional">
            <select value={professional} onChange={(e) => setProfessional(e.target.value)}>
              <option>{professionalNames[service]}</option>
            </select>
          </Field>
          <Field label="Fecha desde">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="Fecha hasta">
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
        </div>
        <div className="filter-actions">
          <Button icon="search" onClick={() => setHasSearched(true)}>Buscar franjas</Button>
        </div>
      </section>

      <div className="booking-grid p02-layout">
        <section className="card slots-section">
          <h2>Franjas disponibles</h2>

          <div ref={alertRef}>
            {errorMsg && <Alert kind="error"><span>{errorMsg}</span></Alert>}
          </div>

          {filteredSlots.length === 0 ? (
            <div className="empty-slots-state">
              <Icon name="calendar" size={40} />
              <h3>No hay franjas disponibles para los filtros seleccionados.</h3>
              <p className="muted">Amplía el rango de fechas o cambia de profesional.</p>
            </div>
          ) : (
            <div className="slot-cards-container">
              {filteredSlots.map((s) => {
                const isTaken = !s.isAvailable || takenSlotIds.includes(`${s.service}:${s.id}`);
                const isSelected = selectedSlot?.id === s.id && !isTaken;

                return (
                  <div
                    key={s.id}
                    className={`slot-card ${isTaken ? 'is-disabled' : ''} ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="slot-card-body">
                      <div className="slot-date-row">
                        <strong>{formatDateLabel(s.dateVal)}</strong>
                        <span className="slot-time"><Icon name="clock" size={16} /> {s.timeLabel}</span>
                      </div>
                      <div className="slot-meta">
                        <span>{s.service}</span> · <span>{s.professional}</span>
                      </div>
                      <div className="slot-room"><Icon name="users" size={16} /> {s.room}</div>
                    </div>
                    <div className="slot-card-action">
                      {isTaken ? (
                        <span className="unavailable-badge">
                          {s.reasonDisabled || 'No disponible'}
                        </span>
                      ) : (
                        <Button
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={() => handleSelectSlot(s)}
                        >
                          {isSelected ? 'Seleccionada' : 'Seleccionar'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="summary-card">
          <div className="summary-head"><span>Resumen de selección</span><Icon name="calendar" /></div>
          <div className="summary-body">
            {selectedSlot && selectedSlot.isAvailable ? (
              <>
                <div className="summary-service">
                  <div className="service-icon"><Icon name="users" /></div>
                  <div><span>SERVICIO</span><strong>{selectedSlot.service}</strong></div>
                </div>
                <dl>
                  <div><dt>Profesional</dt><dd>{selectedSlot.professional}</dd></div>
                  <div><dt>Fecha</dt><dd>{formatDateLabel(selectedSlot.dateVal)}</dd></div>
                  <div><dt>Hora</dt><dd>{selectedSlot.timeLabel}</dd></div>
                  <div><dt>Lugar</dt><dd>{selectedSlot.room}</dd></div>
                  <div><dt>Nombre</dt><dd>{patient.name}</dd></div>
                  <div><dt>Matrícula</dt><dd>{patient.id}</dd></div>
                </dl>
                <p className="admin-data-notice">Solo se registran datos administrativos mínimos.</p>
                <Button onClick={handleConfirmBooking}>Confirmar reserva</Button>
              </>
            ) : (
              <div className="no-slot-selected">
                <p className="muted">Selecciona una franja de la lista para ver el resumen y confirmar.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Register({
  session,
  setScreen,
  takenSlotIds,
  onMarkSlotTaken,
}: {
  session: Session;
  setScreen: (s: Screen) => void;
  takenSlotIds: string[];
  onMarkSlotTaken: (id: string) => void;
}) {
  const store = useStore();
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [userType, setUserType] = useState('Estudiante');
  const [contact, setContact] = useState('');
  const [originChannel, setOriginChannel] = useState<BookingChannel>('Ventanilla');
  const [service, setService] = useState('Consulta general');
  const [professional, setProfessional] = useState('Dra. Laura Mendoza');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  const alertRef = useRef<HTMLDivElement | null>(null);

  const slots = useMemo(() => {
    return getSlots(service);
  }, [service, store.appointments, store.blocks]);

  useEffect(() => {
    if (errorMsg && alertRef.current) {
      alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errorMsg]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Este campo es obligatorio';
    if (!employeeId.trim()) errs.employeeId = 'Este campo es obligatorio';
    if (!contact.trim()) errs.contact = 'Este campo es obligatorio';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSelectSlot = (s: SlotInfo) => {
    if (s.dateVal === '2026-10-27' && s.start === '10:30' && service === 'Consulta general') {
      onMarkSlotTaken(`${s.service}:${s.id}`);
      setErrorMsg('Conflicto de disponibilidad: la franja ya fue tomada por otra solicitud. Elige otra franja.');
      setSelectedSlot(null);
      return;
    }

    const hasOverlap = store.appointments.some((a) => {
      if (a.patientId !== employeeId) return false;
      if (a.status === 'cancelada') return false;
      return a.date === s.dateVal && a.start === s.start;
    });

    if (hasOverlap) {
      setErrorMsg('La persona usuaria ya tiene una cita activa que se traslapa con esta franja.');
      setSelectedSlot(null);
      return;
    }

    setErrorMsg(null);
    setSelectedSlot(s);
  };

  const handleRegister = () => {
    if (!validate()) return;
    if (!selectedSlot || !selectedSlot.isAvailable) {
      setErrorMsg('Selecciona una franja disponible.');
      return;
    }

    const duplicate = store.appointments.some(
      (a) =>
        a.patientId === employeeId.trim() &&
        a.status !== 'cancelada' &&
        a.date === selectedSlot.dateVal &&
        a.start === selectedSlot.start
    );
    if (duplicate) {
      setErrorMsg('La persona usuaria ya tiene una cita activa que se traslapa con esta franja.');
      setSelectedSlot(null);
      return;
    }

    const res = createAppointment(
      {
        patientName: fullName,
        patientId: employeeId.trim(),
        contact,
        userType,
        channel: originChannel,
        service,
        professional,
        date: selectedSlot.dateVal,
        start: selectedSlot.start,
        end: selectedSlot.end,
        room: selectedSlot.room,
      },
      { name: session.name, role: session.role }
    );

    if (res.ok) {
      setCreatedAppointmentId(res.appointment.id);
    } else {
      setErrorMsg(res.error);
      setSelectedSlot(null);
    }
  };

  if (createdAppointmentId) {
    return (
      <div className="p03-success-container">
        <PageHeader screen="P-03" />
        <Alert kind="success">
          <strong>Cita registrada en estado "programada". Folio {createdAppointmentId}.</strong>
          <span>La cita quedó agendada correctamente para {fullName}.</span>
        </Alert>
        <div className="card p03-success-card">
          <h2>Detalles del registro</h2>
          <dl>
            <div><dt>Nombre completo</dt><dd>{fullName}</dd></div>
            <div><dt>Matrícula / Empleado</dt><dd>{employeeId}</dd></div>
            <div><dt>Tipo de usuario</dt><dd>{userType}</dd></div>
            <div><dt>Canal de origen</dt><dd>{originChannel}</dd></div>
            <div><dt>Servicio</dt><dd>{service}</dd></div>
            <div><dt>Profesional</dt><dd>{professional}</dd></div>
            <div><dt>Horario</dt><dd>{selectedSlot ? formatDateLabel(selectedSlot.dateVal) : ''}, {selectedSlot?.timeLabel}</dd></div>
          </dl>
          <div className="p03-action-row">
            <Button onClick={() => setScreen('P-06')}>Ver en Citas</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader screen="P-03" />

      <div className="two-col-form p03-grid">
        <section className="card form-card">
          <h2>Datos de la persona</h2>
          <p className="muted">Ingresa únicamente la información necesaria para la cita.</p>
          <div className="form-grid">
            <Field label="Nombre completo" error={errors.fullName}>
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((prev) => ({ ...prev, fullName: '' })); }}
                placeholder="Ej. Marco Díaz Lara"
              />
            </Field>
            <Field label="Matrícula o número de empleado" error={errors.employeeId}>
              <input
                value={employeeId}
                onChange={(e) => { setEmployeeId(e.target.value); setErrors((prev) => ({ ...prev, employeeId: '' })); }}
                placeholder="Ej. 20264567"
              />
            </Field>
            <Field label="Tipo de usuario">
              <select value={userType} onChange={(e) => setUserType(e.target.value)}>
                <option value="Estudiante">Estudiante</option>
                <option value="Trabajador">Trabajador</option>
              </select>
            </Field>
            <Field label="Teléfono o correo de contacto" error={errors.contact}>
              <input
                value={contact}
                onChange={(e) => { setContact(e.target.value); setErrors((prev) => ({ ...prev, contact: '' })); }}
                placeholder="Ej. 55 1234 5678 o correo"
              />
            </Field>
            <Field label="Canal de origen">
              <select value={originChannel} onChange={(e) => setOriginChannel(e.target.value as BookingChannel)}>
                <option value="Teléfono">Teléfono</option>
                <option value="Correo">Correo</option>
                <option value="Mensajería">Mensajería</option>
                <option value="Ventanilla">Ventanilla</option>
              </select>
            </Field>
          </div>

          <div className="section-divider" />
          <h2>Filtro de servicio</h2>
          <div className="form-grid">
            <Field label="Servicio">
              <select
                value={service}
                onChange={(e) => {
                  const newS = e.target.value;
                  setService(newS);
                  setProfessional(professionalNames[newS] || '');
                  setSelectedSlot(null);
                }}
              >
                <option>Consulta general</option>
                <option>Nutrición</option>
                <option>Psicología preventiva</option>
                <option>Orientación</option>
              </select>
            </Field>
            <Field label="Profesional">
              <select value={professional} onChange={(e) => setProfessional(e.target.value)}>
                <option>{professionalNames[service]}</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="card slots-section-p03">
          <h2>Seleccionar franja</h2>
          <p className="muted">Selecciona la franja horaria para el registro.</p>

          <div ref={alertRef}>
            {errorMsg && <Alert kind="error"><span>{errorMsg}</span></Alert>}
          </div>

          <div className="slot-cards-container">
            {slots.map((s) => {
              const isTaken = !s.isAvailable || takenSlotIds.includes(`${s.service}:${s.id}`);
              const isSelected = selectedSlot?.id === s.id && !isTaken;

              return (
                <div
                  key={s.id}
                  className={`slot-card ${isTaken ? 'is-disabled' : ''} ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="slot-card-body">
                    <div className="slot-date-row">
                      <strong>{formatDateLabel(s.dateVal)}</strong>
                      <span className="slot-time"><Icon name="clock" size={16} /> {s.timeLabel}</span>
                    </div>
                    <div className="slot-room">{s.room}</div>
                  </div>
                  <div className="slot-card-action">
                    {isTaken ? (
                      <span className="unavailable-badge">{s.reasonDisabled || 'No disponible'}</span>
                    ) : (
                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        onClick={() => handleSelectSlot(s)}
                      >
                        {isSelected ? 'Seleccionada' : 'Seleccionar'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p03-confirm-box">
            <Button onClick={handleRegister}>Registrar cita</Button>
          </div>
        </section>
      </div>
    </>
  );
}

function Agenda({ session, setScreen }: { session: Session; setScreen: (s: Screen) => void }) {
  const store = useStore();
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const profName = session.name;

  const profAppts = useMemo(() => {
    return store.appointments
      .filter((a) => a.professional === profName)
      .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
  }, [store.appointments, profName]);

  const profBlocks = useMemo(() => {
    return store.blocks.filter((b) => b.professional === profName);
  }, [store.blocks, profName]);

  const selectedAppt = useMemo(() => {
    return profAppts.find((a) => a.id === selectedApptId) || profAppts[0] || null;
  }, [profAppts, selectedApptId]);

  const dayColumns = [
    { day: 'LUN', date: '26 oct 2026', val: '2026-10-26', col: 1 },
    { day: 'MAR', date: '27 oct 2026', val: '2026-10-27', col: 2 },
    { day: 'MIÉ', date: '28 oct 2026', val: '2026-10-28', col: 3 },
    { day: 'JUE', date: '29 oct 2026', val: '2026-10-29', col: 4 },
    { day: 'VIE', date: '30 oct 2026', val: '2026-10-30', col: 5 },
  ];

  const timeToPixels = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startHour = 8;
    const rowHeight = 88;
    return (h - startHour) * rowHeight + (m / 60) * rowHeight;
  };

  const handleStatusChangeAttempt = (targetStatus: AppointmentStatus) => {
    setTransitionError(null);
    if (!selectedAppt) return;

    const currentStatus = selectedAppt.status;
    const ok = changeStatus(selectedAppt.id, targetStatus, { name: session.name, role: session.role });

    if (!ok) {
      setTransitionError(`No es posible pasar de "${currentStatus}" a "${targetStatus}". Transiciones válidas: programada → confirmada → atendida o no presentada; cancelación desde programada o confirmada.`);
    }
  };

  const handleCancelAttempt = () => {
    setTransitionError(null);
    if (!selectedAppt) return;

    const currentStatus = selectedAppt.status;
    const ok = cancelAppointment(selectedAppt.id, { name: session.name, role: session.role }, 'Consulta Profesional');

    if (!ok) {
      setTransitionError(`No es posible pasar de "${currentStatus}" a "cancelada". Transiciones válidas: programada → confirmada → atendida o no presentada; cancelación desde programada o confirmada.`);
    }
  };

  const isCurrentWeek = weekOffset === 0;

  return (
    <>
      <PageHeader
        screen="P-04"
        action={
          <div className="date-navigation">
            <Button variant="secondary" onClick={() => setViewMode(viewMode === 'week' ? 'list' : 'week')}>
              {viewMode === 'week' ? 'Ver en Lista' : 'Ver en Semana'}
            </Button>
            <Button variant="secondary" onClick={() => setWeekOffset((prev) => prev - 1)}>‹</Button>
            <Button variant="secondary">
              26 – 30 oct 2026
            </Button>
            <Button variant="secondary" onClick={() => setWeekOffset((prev) => prev + 1)}>›</Button>
            <Button variant="secondary" onClick={() => setWeekOffset(0)}>Hoy</Button>
            <Button icon="lock" onClick={() => setScreen('P-05')}>Bloquear horario</Button>
          </div>
        }
      />

      {transitionError && (
        <Alert kind="error">
          <span>{transitionError}</span>
        </Alert>
      )}

      {!isCurrentWeek || (profAppts.length === 0 && profBlocks.length === 0) ? (
        <div className="card empty-state-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>No hay citas ni bloqueos en este periodo.</h3>
          <p className="muted" style={{ marginBottom: '1rem' }}>{isCurrentWeek ? 'Cuando haya citas o bloqueos aparecerán aquí.' : 'Selecciona la semana del 26 al 30 de octubre de 2026.'}</p>
          <Button icon="lock" onClick={() => setScreen('P-05')}>Bloquear horario</Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="card">
          <h2>Lista de citas de la semana</h2>
          {profAppts.length === 0 ? (
            <p className="muted">No hay citas registradas para esta semana.</p>
          ) : (
            <div className="appointment-list">
              {profAppts.map((a) => (
                <article
                  key={a.id}
                  className={`appointment-row ${selectedAppt?.id === a.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedApptId(a.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="appt-main">
                    <div className="appt-title">
                      <h2>{a.patientName} ({a.patientId})</h2>
                      <Status>{a.status}</Status>
                    </div>
                    <div className="appt-meta">
                      <span><Icon name="clock" size={16} />{formatDateLabel(a.date)} · {a.start} - {a.end}</span>
                      <span><Icon name="users" size={16} />{a.service}</span>
                      <span><Icon name="calendar" size={16} />Folio {a.id}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="agenda-layout">
          <section className="calendar-card">
            <div className="calendar-head">
              <div />
              {dayColumns.map((d) => (
                <div key={d.val}>
                  {d.day}<strong>{d.date.replace(' 2026', '')}</strong>
                </div>
              ))}
            </div>
            <div className="calendar-body">
              <div className="time-col">
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>

              {dayColumns.map((c) => (
                <div className="day-col" key={c.val}>
                  {profBlocks
                    .filter((b) => b.startDate <= c.val && b.endDate >= c.val)
                    .map((b) => {
                      const top = timeToPixels(b.startTime);
                      const height = Math.max(30, timeToPixels(b.endTime) - top);
                      return (
                        <div
                          key={b.id}
                          className="blocked striped-block"
                          style={{ top, height, position: 'absolute', left: 2, right: 2 }}
                        >
                          <Icon name="lock" size={15} />
                          <strong>Bloqueo · {b.reason}</strong>
                          <span>{b.startTime}–{b.endTime}</span>
                        </div>
                      );
                    })}

                  {profAppts
                    .filter((a) => a.date === c.val)
                    .map((a) => {
                      const top = timeToPixels(a.start);
                      const height = Math.max(44, timeToPixels(a.end) - top);
                      const isSelected = selectedAppt?.id === a.id;
                      return (
                        <button
                          key={a.id}
                          className={`calendar-appt ${isSelected ? 'selected' : ''}`}
                          style={{ top, height, position: 'absolute', left: 2, right: 2 }}
                          onClick={() => {
                            setSelectedApptId(a.id);
                            setTransitionError(null);
                          }}
                        >
                          <strong>{a.start} · {a.patientName}</strong>
                          <span>Cita · {a.status}</span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </section>

          <aside className="agenda-detail">
            {selectedAppt ? (
              <>
                <div className="detail-header">
                  <div>
                    <span>DETALLE DE CITA</span>
                    <h2>{selectedAppt.start} · {selectedAppt.patientName}</h2>
                  </div>
                  <Status>{selectedAppt.status}</Status>
                </div>
                <div className="detail-content">
                  <div className="person-row">
                    <div className="person-avatar">
                      {selectedAppt.patientName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <strong>{selectedAppt.patientName}</strong>
                      <span>{selectedAppt.patientId}</span>
                    </div>
                  </div>
                  <dl>
                    <div><dt>Contacto</dt><dd>{selectedAppt.contact || 'No registrado'}</dd></div>
                    <div><dt>Servicio</dt><dd>{selectedAppt.service}</dd></div>
                    <div><dt>Fecha y hora</dt><dd>{formatDateLabel(selectedAppt.date)} · {selectedAppt.start}–{selectedAppt.end}</dd></div>
                    <div><dt>Lugar</dt><dd>{selectedAppt.room}</dd></div>
                  </dl>

                  <div className="section-divider" />
                  <h3>Cambiar estado</h3>

                  <div className="state-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-disabled={selectedAppt.status !== 'programada'}
                      onClick={() => handleStatusChangeAttempt('confirmada')}
                    >
                      <Icon name="check" size={18} /> Confirmar
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-disabled={selectedAppt.status !== 'confirmada'}
                      onClick={() => handleStatusChangeAttempt('atendida')}
                    >
                      Marcar atendida
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-disabled={selectedAppt.status !== 'confirmada'}
                      onClick={() => handleStatusChangeAttempt('no presentada')}
                    >
                      No se presentó
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      aria-disabled={selectedAppt.status !== 'programada' && selectedAppt.status !== 'confirmada'}
                      onClick={handleCancelAttempt}
                    >
                      Cancelar cita
                    </button>
                  </div>
                  <p className="disabled-hint">Transiciones válidas: programada → confirmada → atendida o no presentada; cancelación desde programada o confirmada.</p>
                </div>
              </>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p className="muted">Selecciona una cita del calendario para gestionar su estado.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function BlockSchedule({ session, setScreen }: { session: Session; setScreen: (s: Screen) => void }) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState<BlockReason>('Capacitación');
  const [detail, setDetail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictResult, setConflictResult] = useState<{
    success: boolean;
    affectedAppointments?: Appointment[];
  } | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!startDate) errs.startDate = 'Obligatorio';
    if (!startTime) errs.startTime = 'Obligatorio';
    if (!endDate) errs.endDate = 'Obligatorio';
    if (!endTime) errs.endTime = 'Obligatorio';

    if (startDate && startTime && endDate && endTime) {
      const startDT = `${startDate}T${startTime}`;
      const endDT = `${endDate}T${endTime}`;
      if (endDT <= startDT) {
        errs.range = 'La fecha y hora de fin deben ser posteriores al inicio.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const res = createBlock(
      {
        professional: session.name,
        startDate,
        startTime,
        endDate,
        endTime,
        reason,
        detail,
      },
      { name: session.name, role: session.role }
    );

    setConflictResult(res);
  };

  return (
    <>
      <PageHeader screen="P-05" />

      {conflictResult?.success && (
        <Alert kind="success">
          <strong>Bloqueo registrado. Las franjas de ese rango ya no están disponibles.</strong>
          <div style={{ marginTop: '0.5rem' }}>
            <Button onClick={() => setScreen('P-04')}>Volver a Mi agenda</Button>
          </div>
        </Alert>
      )}

      {conflictResult && !conflictResult.success && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: '#b45309' }}>
          <Alert kind="warning">
            <strong>El bloqueo no se aplicó automáticamente. Hay citas programadas en ese rango.</strong>
            <p style={{ marginTop: '0.25rem' }}>
              Se notificó a Recepción y Coordinación para que las resuelvan antes de confirmar el bloqueo.
            </p>
          </Alert>

          <h3 style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Citas afectadas:</h3>
          <table style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.5rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                <th scope="col" style={{ padding: '6px' }}>Fecha</th>
                <th scope="col" style={{ padding: '6px' }}>Hora</th>
                <th scope="col" style={{ padding: '6px' }}>Paciente</th>
                <th scope="col" style={{ padding: '6px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {conflictResult.affectedAppointments?.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px' }}>{formatDateLabel(a.date)}</td>
                  <td style={{ padding: '6px' }}>{a.start} - {a.end}</td>
                  <td style={{ padding: '6px' }}>{a.patientName}</td>
                  <td style={{ padding: '6px' }}><Status>{a.status}</Status></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setConflictResult(null)}>Modificar rango</Button>
            <Button onClick={() => setScreen('P-04')}>Entendido</Button>
          </div>
        </div>
      )}

      {!conflictResult?.success && (
        <div className="narrow-grid">
          <section className="card form-card">
            <h2>Nuevo bloqueo</h2>
            <p className="muted">El horario dejará de mostrarse como disponible para nuevas citas.</p>

            {errors.range && (
              <Alert kind="error">
                <span>{errors.range}</span>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <Field label="Fecha de inicio" error={errors.startDate}>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label="Hora de inicio" error={errors.startTime}>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </Field>
                <Field label="Fecha de fin" error={errors.endDate}>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
                <Field label="Hora de fin" error={errors.endTime}>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </Field>
              </div>

              <Field label="Motivo">
                <select value={reason} onChange={(e) => setReason(e.target.value as BlockReason)}>
                  <option value="Capacitación">Capacitación</option>
                  <option value="Ausencia">Ausencia</option>
                  <option value="Indisponibilidad">Indisponibilidad</option>
                </select>
              </Field>

              <Field
                label="Detalle (opcional)"
                hint={`${detail.length} / 100 caracteres. No incluyas información clínica.`}
              >
                <textarea
                  maxLength={100}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Motivo administrativo del bloqueo"
                />
              </Field>

              <div className="form-actions">
                <Button variant="secondary" onClick={() => setScreen('P-04')}>Cancelar</Button>
                <Button type="submit">Registrar bloqueo</Button>
              </div>
            </form>
          </section>
          <aside className="info-card">
            <div className="info-icon"><Icon name="calendar" /></div>
            <h3>Antes de bloquear</h3>
            <ul>
              <li>Las franjas se retirarán de la disponibilidad.</li>
              <li>Las citas existentes no se cancelan automáticamente.</li>
              <li>Podrás revisar la afección de citas en la agenda.</li>
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}

function MyAppointments({ session, reception, setScreen }: { session: Session; reception: boolean; setScreen: (s: Screen) => void }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<'reschedule' | 'cancel' | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [toast, setToast] = useState('');
  const [cancelChannel, setCancelChannel] = useState('Ventanilla');
  const [rescheduleSlot, setRescheduleSlot] = useState<SlotInfo | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const baseAppointments = useMemo(() => {
    if (reception) return store.appointments;
    return store.appointments.filter((a) => a.patientId === session.id);
  }, [store.appointments, reception, session.id]);

  const upcomingAppts = useMemo(() => {
    return baseAppointments.filter((a) => a.status === 'programada' || a.status === 'confirmada');
  }, [baseAppointments]);

  const historyAppts = useMemo(() => {
    return baseAppointments.filter((a) => a.status === 'atendida' || a.status === 'no presentada' || a.status === 'cancelada');
  }, [baseAppointments]);

  const filteredAppts = useMemo(() => {
    const list = activeTab === 'upcoming' ? upcomingAppts : historyAppts;
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...list].sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
    }
    return list
      .filter((a) =>
        a.id.toLowerCase().includes(q) ||
        a.service.toLowerCase().includes(q) ||
        a.professional.toLowerCase().includes(q) ||
        a.patientName.toLowerCase().includes(q)
      )
      .sort((a, b) => `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`));
  }, [activeTab, upcomingAppts, historyAppts, searchQuery]);

  const availableRescheduleSlots = useMemo(() => {
    if (!selectedAppt) return [];
    return getSlots(selectedAppt.service).filter((s) => s.isAvailable);
  }, [selectedAppt]);

  const handleConfirmCancel = () => {
    if (!selectedAppt) return;
    const ok = cancelAppointment(
      selectedAppt.id,
      { name: session.name, role: session.role },
      cancelChannel
    );
    if (ok) {
      setToast('Cita cancelada');
      setModal(null);
    }
  };

  const handleConfirmReschedule = () => {
    if (!selectedAppt || !rescheduleSlot) return;
    setRescheduleError(null);
    const res = rescheduleAppointment(
      selectedAppt.id,
      rescheduleSlot.dateVal,
      rescheduleSlot.start,
      rescheduleSlot.end,
      { name: session.name, role: session.role }
    );
    if (res.ok) {
      setToast('Cita reprogramada');
      setModal(null);
    } else {
      setRescheduleError(res.error || 'No se pudo reprogramar la cita.');
    }
  };

  return (
    <>
      <PageHeader
        screen="P-06"
        action={reception ? <Button icon="plus" onClick={() => setScreen('P-03')}>Registrar nueva cita</Button> : undefined}
      />
      {toast && (
        <Alert kind="success">
          <strong>{toast}</strong>
          <span>El cambio se guardó correctamente.</span>
        </Alert>
      )}

      <div className="list-toolbar">
        <div className="tabs">
          <button
            type="button"
            className={activeTab === 'upcoming' ? 'active' : ''}
            onClick={() => setActiveTab('upcoming')}
          >
            Próximas <span>{upcomingAppts.length}</span>
          </button>
          <button
            type="button"
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            Historial <span>{historyAppts.length}</span>
          </button>
        </div>
        <div className="search-field">
          <Icon name="search" size={18} />
          <input
            placeholder="Buscar por folio, servicio, profesional..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredAppts.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted">Aún no hay citas registradas.</p>
        </div>
      ) : (
        <div className="appointment-list">
          {filteredAppts.map((a) => {
            const canModify = a.status === 'programada' || a.status === 'confirmada';
            const [year, monthNum, day] = a.date.split('-');
            const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
            const monthLabel = months[parseInt(monthNum, 10) - 1] || 'OCT';

            return (
              <article className="appointment-row" key={a.id}>
                <div className="date-block">
                  <strong>{parseInt(day, 10)}</strong>
                  <span>{monthLabel}</span>
                  <small>{year}</small>
                </div>
                <div className="appt-main">
                  <div className="appt-title">
                    <h2>{a.service}</h2>
                    <Status>{a.status}</Status>
                  </div>
                  <div className="appt-meta">
                    <span><Icon name="clock" size={16} />{a.start} · 30 min</span>
                    <span><Icon name="users" size={16} />{a.professional}</span>
                    <span><Icon name="calendar" size={16} />Folio {a.id}</span>
                    {a.patientName && <span><Icon name="users" size={16} />{a.patientName} ({a.patientId})</span>}
                  </div>
                </div>
                <div className="appt-actions">
                  {canModify && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedAppt(a);
                          setRescheduleSlot(null);
                          setRescheduleError(null);
                          setModal('reschedule');
                        }}
                      >
                        Reprogramar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSelectedAppt(a);
                          setModal('cancel');
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && selectedAppt && (
        <Modal
          title={modal === 'reschedule' ? 'Reprogramar cita' : 'Cancelar cita'}
          close={() => setModal(null)}
        >
          {modal === 'reschedule' ? (
            <>
              {rescheduleError && (
                <Alert kind="error">
                  <span>{rescheduleError}</span>
                </Alert>
              )}
              <p>Selecciona una nueva franja disponible para <strong>{selectedAppt.service}</strong>.</p>
              <Field label="Nueva franja horaria">
                <select onChange={(e) => {
                  const s = availableRescheduleSlots.find((slot) => slot.id === e.target.value);
                  setRescheduleSlot(s || null);
                  setRescheduleError(null);
                }}>
                  <option value="">Selecciona una franja...</option>
                  {availableRescheduleSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.dateLabel} · {s.timeLabel}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setModal(null)}>Volver</Button>
                <Button disabled={!rescheduleSlot} onClick={handleConfirmReschedule}>
                  Confirmar cambio
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert kind="warning">
                <span>Esta acción liberará la franja para otra persona.</span>
              </Alert>
              <Field label="Canal de solicitud de cancelación">
                <select value={cancelChannel} onChange={(e) => setCancelChannel(e.target.value)}>
                  <option value="Ventanilla">Ventanilla</option>
                  <option value="Teléfono">Teléfono</option>
                  <option value="Correo">Correo</option>
                  <option value="Autoservicio">Autoservicio</option>
                </select>
              </Field>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setModal(null)}>Volver</Button>
                <Button variant="danger" onClick={handleConfirmCancel}>
                  Cancelar cita
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title-id">
      <div className="modal" ref={modalRef}>
        <div className="modal-header">
          <h2 id="modal-title-id">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={close}><Icon name="close"/></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Catalogs() {
  const [tab, setTab] = useState<'Servicios' | 'Profesionales' | 'Consultorios' | 'Políticas de agenda'>('Servicios');
  const [search, setSearch] = useState('');

  const servicesData = [
    ['Consulta general', '30 min', 'Presencial', '1', 'Activo'],
    ['Nutrición', '30 min', 'Presencial / remota', '1', 'Activo'],
    ['Psicología preventiva', '30 min', 'Presencial', '1', 'Activo'],
    ['Orientación', '30 min', 'Presencial / remota', '1', 'Activo'],
  ];

  const professionalsData = [
    ['Dra. Laura Mendoza', 'Consulta general', 'Consultorio 2', 'Activo'],
    ['Dr. Carlos Ibarra', 'Nutrición', 'Consultorio 3', 'Activo'],
    ['Lic. Sofía Herrera', 'Psicología preventiva', 'Consultorio 4', 'Activo'],
    ['Mtro. Diego Ramírez', 'Orientación', 'Consultorio 1', 'Activo'],
  ];

  const roomsData = [
    ['Consultorio 1', 'Orientación', 'Mtro. Diego Ramírez'],
    ['Consultorio 2', 'Consulta general', 'Dra. Laura Mendoza'],
    ['Consultorio 3', 'Nutrición', 'Dr. Carlos Ibarra'],
    ['Consultorio 4', 'Psicología preventiva', 'Lic. Sofía Herrera'],
  ];

  const policiesData = [
    ['Duración de franja', '30 minutos por cita para todos los servicios.'],
    ['Horario de atención', 'Lunes a viernes de 09:00 a 14:00 (semana del 26 al 30 de octubre de 2026).'],
    ['Cancelaciones y reprogramaciones', 'Permitidas únicamente desde estados "programada" o "confirmada".'],
    ['Gestión de bloqueos', 'Los bloqueos retiran la disponibilidad pero no cancelan citas existentes automáticamente.'],
    ['Restricción de franjas', 'Las franjas ocupadas o bloqueadas no se ofrecen a nuevas solicitudes.'],
  ];

  const filterText = search.trim().toLowerCase();

  return (
    <>
      <PageHeader screen="P-07" />
      <div className="catalog-read-only-note">
        <Alert kind="warning">
          <span>Prototipo: catálogos de solo lectura.</span>
        </Alert>
      </div>

      <div className="admin-tabs">
        {(['Servicios', 'Profesionales', 'Consultorios', 'Políticas de agenda'] as const).map((t) => (
          <button
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => { setTab(t); setSearch(''); }}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="table-card">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              placeholder={`Buscar en ${tab.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {tab === 'Servicios' && (
          <table>
            <thead>
              <tr>
                <th scope="col">Servicio</th>
                <th scope="col">Duración</th>
                <th scope="col">Modalidad</th>
                <th scope="col">Profesionales</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {servicesData
                .filter((r) => r.some((c) => c.toLowerCase().includes(filterText)))
                .map((r) => (
                  <tr key={r[0]}>
                    <td><strong>{r[0]}</strong></td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>{r[3]}</td>
                    <td><span className="active-chip">{r[4]}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === 'Profesionales' && (
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Servicio</th>
                <th scope="col">Consultorio</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {professionalsData
                .filter((r) => r.some((c) => c.toLowerCase().includes(filterText)))
                .map((r) => (
                  <tr key={r[0]}>
                    <td><strong>{r[0]}</strong></td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td><span className="active-chip">{r[3]}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === 'Consultorios' && (
          <table>
            <thead>
              <tr>
                <th scope="col">Consultorio</th>
                <th scope="col">Servicio</th>
                <th scope="col">Profesional asignado</th>
              </tr>
            </thead>
            <tbody>
              {roomsData
                .filter((r) => r.some((c) => c.toLowerCase().includes(filterText)))
                .map((r) => (
                  <tr key={r[0]}>
                    <td><strong>{r[0]}</strong></td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === 'Políticas de agenda' && (
          <table>
            <thead>
              <tr>
                <th scope="col">Política</th>
                <th scope="col">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {policiesData
                .filter((r) => r.some((c) => c.toLowerCase().includes(filterText)))
                .map((r) => (
                  <tr key={r[0]}>
                    <td><strong>{r[0]}</strong></td>
                    <td>{r[1]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Indicators() {
  const store = useStore();

  const attended = store.appointments.filter((a) => a.status === 'atendida').length;
  const noShow = store.appointments.filter((a) => a.status === 'no presentada').length;
  const canceled = store.appointments.filter((a) => a.status === 'cancelada').length;
  const total = store.appointments.length;

  const denominator = attended + noShow;
  const attendanceRate = denominator > 0 ? ((attended / denominator) * 100).toFixed(1) + '%' : '—';
  const cancelRate = total > 0 ? ((canceled / total) * 100).toFixed(1) + '%' : '0.0%';

  const weekDays = [
    { label: 'Lun', dateVal: '2026-10-26' },
    { label: 'Mar', dateVal: '2026-10-27' },
    { label: 'Mié', dateVal: '2026-10-28' },
    { label: 'Jue', dateVal: '2026-10-29' },
    { label: 'Vie', dateVal: '2026-10-30' },
  ];

  const dayCounts = weekDays.map((d) => {
    const count = store.appointments.filter((a) => a.date === d.dateVal && a.status !== 'cancelada').length;
    return { ...d, count };
  });

  const maxDayCount = Math.max(...dayCounts.map((d) => d.count), 1);

  const services = ['Consulta general', 'Nutrición', 'Psicología preventiva', 'Orientación'];
  const serviceDistribution = services.map((s) => {
    const count = store.appointments.filter((a) => a.service === s).length;
    return { name: s, count };
  });

  return (
    <>
      <PageHeader
        screen="P-08"
        action={
          <div className="date-navigation">
            <Button variant="secondary">26 – 30 oct 2026</Button>
          </div>
        }
      />

      {total === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Aún no hay datos para el periodo.</h3>
          <p className="muted">Registra citas para visualizar indicadores reales.</p>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-icon kpi-1"><Icon name="check" /></div>
              <span>Tasa de asistencia</span>
              <strong>{attendanceRate}</strong>
              <small>Fórmula: atendidas ÷ (atendidas + no presentadas)</small>
            </div>
            <div className="kpi">
              <div className="kpi-icon kpi-3"><Icon name="warning" /></div>
              <span>Cancelaciones</span>
              <strong>{canceled}</strong>
              <small>{cancelRate} del total de citas ({total})</small>
            </div>
            <div className="kpi">
              <div className="kpi-icon kpi-0"><Icon name="calendar" /></div>
              <span>Total de citas</span>
              <strong>{total}</strong>
              <small>En la semana de referencia</small>
            </div>
            <div className="kpi">
              <div className="kpi-icon kpi-2"><Icon name="clock" /></div>
              <span>Atendidas / No presentadas</span>
              <strong>{attended} / {noShow}</strong>
              <small>Conteo acumulado</small>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="card">
              <h2>Citas por semana (Lun – Vie)</h2>
              <p className="muted">Citas activas (no canceladas) por día.</p>
              <div className="weekly-bar-container">
                {dayCounts.map((d) => {
                  const heightPercent = (d.count / maxDayCount) * 100;
                  return (
                    <div key={d.label} className="weekly-bar-col">
                      <span className="bar-value">{d.count}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ height: `${Math.max(heightPercent, 8)}%` }} />
                      </div>
                      <span className="bar-label">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card">
              <h2>Distribución por servicio</h2>
              <p className="muted">Conteo de citas registradas por cada especialidad.</p>
              <div className="service-dist-list">
                {serviceDistribution.map((s) => (
                  <div key={s.name} className="service-dist-item">
                    <div className="service-dist-header">
                      <strong>{s.name}</strong>
                      <span>{s.count} citas</span>
                    </div>
                    <div className="service-dist-track">
                      <div
                        className="service-dist-fill"
                        style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

function AuditLog() {
  const store = useStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');

  const filteredAudit = useMemo(() => {
    return store.audit.filter((entry) => {
      const matchRole = roleFilter === 'Todos' || entry.role === roleFilter;
      const matchSearch =
        entry.userName.toLowerCase().includes(search.toLowerCase()) ||
        entry.action.toLowerCase().includes(search.toLowerCase()) ||
        entry.reference.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [store.audit, search, roleFilter]);

  return (
    <>
      <PageHeader screen="P-09" />
      <section className="table-card">
        <div className="table-toolbar audit-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              placeholder="Buscar usuario, acción o folio"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="Todos">Todos los roles</option>
            <option value="Paciente">Paciente</option>
            <option value="Recepción">Recepción</option>
            <option value="Profesional">Profesional</option>
            <option value="Coordinación">Coordinación</option>
            <option value="TI">TI institucional</option>
          </select>
        </div>

        {filteredAudit.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="muted">Aún no hay registros en la bitácora.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                <th scope="col">Acción</th>
                <th scope="col">Referencia</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.map((r) => (
                <tr key={r.id}>
                  <td>{r.timestamp}</td>
                  <td><strong>{r.userName}</strong></td>
                  <td><span className="role-chip small">{r.role}</span></td>
                  <td>{r.action}</td>
                  <td>{r.reference}</td>
                  <td>
                    <span className={r.result === 'Rechazado' ? 'result-fail' : 'result-ok'}>
                      {r.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pagination">
          <span>Mostrando 1–{filteredAudit.length} de {filteredAudit.length} registros</span>
          <div>
            <Button variant="secondary" disabled>Anterior</Button>
            <Button variant="secondary" disabled>Siguiente</Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('P-02');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

  const [takenSlotIds, setTakenSlotIds] = useState<string[]>([]);

  useEffect(() => {
    initializePreloadedUsers().then(() => {
      const activeSession = getSession();
      if (activeSession) {
        setSession(activeSession);
        setScreen(roleMenu[activeSession.role][0].id);
      }
    });
  }, []);

  const login = (newSession: Session) => {
    setSession(newSession);
    setScreen(roleMenu[newSession.role][0].id);
    setAuthView('login');
    setRegisterSuccessMessage(null);
  };

  const logout = () => {
    clearSession();
    setSession(null);
    setAuthView('login');
  };

  const handleMarkSlotTaken = (id: string) => {
    setTakenSlotIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleRegisterSuccess = () => {
    setAuthView('login');
    setRegisterSuccessMessage('Cuenta creada. Ahora inicia sesión con tu usuario y contraseña.');
  };

  const view = useMemo(() => {
    if (!session) return null;
    const role = session.role;

    if (screen === 'P-02') {
      return (
        <Reserve
          session={session}
          patient={{ name: session.name, id: session.id ?? '' }}
          setScreen={setScreen}
          takenSlotIds={takenSlotIds}
          onMarkSlotTaken={handleMarkSlotTaken}
        />
      );
    }
    if (screen === 'P-03') {
      return (
        <Register
          session={session}
          setScreen={setScreen}
          takenSlotIds={takenSlotIds}
          onMarkSlotTaken={handleMarkSlotTaken}
        />
      );
    }
    if (screen === 'P-04') return <Agenda session={session} setScreen={setScreen} />;
    if (screen === 'P-05') return <BlockSchedule session={session} setScreen={setScreen} />;
    if (screen === 'P-06') return <MyAppointments session={session} reception={role === 'Recepción'} setScreen={setScreen} />;
    if (screen === 'P-07') return <Catalogs />;
    if (screen === 'P-08') return <Indicators />;
    return <AuditLog />;
  }, [session, screen, takenSlotIds]);

  if (!session) {
    if (authView === 'register') {
      return (
        <RegisterForm
          onGoToLogin={() => setAuthView('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      );
    }
    return (
      <Login
        onLogin={login}
        onGoToRegister={() => setAuthView('register')}
        onReset={() => setTakenSlotIds([])}
        successMessage={registerSuccessMessage}
      />
    );
  }

  return (
    <Shell session={session} screen={screen} setScreen={setScreen} logout={logout}>
      {view}
    </Shell>
  );
}

