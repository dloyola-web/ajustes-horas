import { Row } from '@/types'

export const EQUIPOS = [
  'CoE Analytics & Technology',
  'CoE Digital Channels & Exp',
  'CoE Inno. & Org. Transformation',
  'Sin tribu',
  'Tribe Data & Cloud',
  'Tribe Digital Channels',
  'Tribe End to End',
  'Tribe Technology & Exp',
] as const

export const CHAPTERS = ['ANALYTICS', 'DEV', 'SEO', 'PAID', 'EXPERIENCE', 'ALLIANCE', 'PROGRAMATICA', 'INNOVACIÓN'] as const
export const ROLES = ['TM', 'CBL', 'CL', 'TL'] as const

export function defaultPeriod(): string {
  const d = new Date()
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`
}

export function emailLocalPart(correo: string): string {
  const at = correo.indexOf('@')
  return (at > 0 ? correo.slice(0, at) : correo).trim().toLowerCase()
}

export function emptyRow(): Row {
  return {
    _id: crypto.randomUUID(),
    correo: '',
    cliente: '',
    proyecto: '',
    equipo: '',
    chapter: '',
    rol: '',
    horas_ajuste: '',
    motivo: '',
  }
}

export function formatPeriodo(fecha: string): string {
  if (!fecha) return ''
  return fecha.length >= 7 ? fecha.slice(0, 7) : fecha
}

export function wasActiveInMonth(
  row: { status_empleado: string; active_until: string | null },
  mes: string,
): boolean {
  if (row.status_empleado === 'activo') return true
  return Boolean(row.active_until?.startsWith(mes))
}
