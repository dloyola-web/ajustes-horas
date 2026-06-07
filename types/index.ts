export interface Row {
  _id: string
  correo: string
  cliente: string
  proyecto: string
  equipo: string
  chapter: string
  rol: string
  horas_ajuste: string
  motivo: string
}

export interface Adjustment {
  id: string
  correo: string
  fecha: string
  cliente: string
  proyecto: string
  equipo: string
  chapter: string
  horas_ajuste: number
  motivo: string
  rol: string
  status: string
  created_at: string
}

export interface Colaborador {
  correo: string
  equipo: string | null
  chapter: string | null
  rol: string | null
}

export type DropdownPos = { top: number; left: number; width: number }
