import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Save, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CellAuto } from './CellAuto'
import { triggerN8nWebhook } from '@/lib/webhook'
import { EQUIPOS, CHAPTERS, ROLES, emptyRow, emailLocalPart } from '@/lib/utils'
import { Row, Colaborador } from '@/types'
import { cn } from '@/lib/cn'

export function RegistroView({
  correos,
  clientes,
  colabByLocal,
  periodo,
  onPeriodoChange,
  showToast,
}: {
  correos: string[]
  clientes: string[]
  colabByLocal: Map<string, Colaborador>
  periodo: string
  onPeriodoChange: (mes: string) => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()])
  const [proyectosByCliente, setProyectosByCliente] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)

  const loadProyectos = useCallback(async (cliente: string) => {
    if (proyectosByCliente[cliente]) return
    const { data } = await supabase
      .from('clickup_raw')
      .select('proyecto')
      .eq('cliente', cliente)
    if (data) {
      const unique = [...new Set(data.map((d) => d.proyecto).filter(Boolean))] as string[]
      setProyectosByCliente((prev) => ({ ...prev, [cliente]: unique.sort() }))
    }
  }, [proyectosByCliente])

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r
        const updated = { ...r, [field]: value }
        if (field === 'correo') {
          const colab = colabByLocal.get(emailLocalPart(value))
          if (colab) {
            updated.chapter = colab.chapter || ''
            updated.rol = colab.rol || ''
          }
        }
        if (field === 'cliente' && value) {
          loadProyectos(value)
          updated.proyecto = ''
        }
        return updated
      })
    )
  }

  function addRow() { setRows((p) => [...p, emptyRow()]) }

  function removeRow(id: string) {
    setRows((p) => p.length <= 1 ? p : p.filter((r) => r._id !== id))
  }

  function validRows(): Row[] {
    return rows.filter((r) => r.correo && r.cliente && r.proyecto && r.horas_ajuste)
  }

  async function saveDraft() {
    const v = validRows()
    if (!v.length) { showToast('err', 'No hay filas completas para guardar'); return }
    setSaving(true)
    const payload = v.map((r) => ({
      correo: r.correo, fecha: periodo, cliente: r.cliente, proyecto: r.proyecto,
      equipo: r.equipo, chapter: r.chapter, rol: r.rol,
      horas_ajuste: parseFloat(r.horas_ajuste), motivo: r.motivo || 'Sin motivo', status: 'borrador',
    }))
    const { error } = await supabase.from('adjustments').insert(payload)
    setSaving(false)
    if (error) {
      showToast('err', error.message)
    } else { 
      showToast('ok', `${v.length} ajuste(s) guardados como borrador`)
      setRows([emptyRow(), emptyRow(), emptyRow()]) 
    }
  }

  async function process() {
    const v = validRows()
    if (!v.length) { showToast('err', 'No hay filas completas para procesar'); return }
    setProcessing(true)
    
    const payload = v.map((r) => ({
      correo: r.correo, fecha: periodo, cliente: r.cliente, proyecto: r.proyecto,
      equipo: r.equipo, chapter: r.chapter, rol: r.rol,
      horas_ajuste: parseFloat(r.horas_ajuste), motivo: r.motivo || 'Sin motivo', status: 'procesado',
    }))
    
    const { error } = await supabase.from('adjustments').insert(payload)
    if (error) { 
      setProcessing(false)
      showToast('err', `Error al guardar en BD: ${error.message}`)
      return 
    }
    
    const webhookSuccess = await triggerN8nWebhook(periodo, v.length)
    setProcessing(false)
    
    if (webhookSuccess) {
      showToast('ok', `${v.length} ajuste(s) procesados — flujo n8n activado`)
      setRows([emptyRow(), emptyRow(), emptyRow()])
    } else {
      showToast('err', 'Los ajustes se guardaron pero falló la conexión con n8n. Por favor revisa el histórico.')
      setRows([emptyRow(), emptyRow(), emptyRow()])
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header aligned to the left */}
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-2">Registro de Ajustes</h1>
        <p className="text-zinc-500 text-sm">
          Completa las filas para ajustar las horas a los proyectos. Puedes guardar un borrador para revisión o procesarlo inmediatamente para notificar al equipo.
        </p>
      </div>

      <div className="flex flex-col gap-2 mb-6 w-48">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Periodo de Ajuste
        </label>
        <input 
          type="month" 
          value={periodo} 
          onChange={(e) => onPeriodoChange(e.target.value)} 
          className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
        />
      </div>

      {/* Spreadsheet Container - No shadow, just subtle border */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-6 flex-1 max-h-[60vh] overflow-y-auto w-full">
        <table className="w-full text-left text-xs whitespace-nowrap table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-48" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-40" />
            <col className="w-10" />
          </colgroup>
          <thead className="bg-zinc-50/80 backdrop-blur border-b border-zinc-200 sticky top-0 z-20">
            <tr>
              <th className="px-2 py-2.5 text-center font-semibold text-zinc-500">#</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Correo</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Cliente</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Proyecto</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Equipo</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Chapter</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Rol</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Horas</th>
              <th className="px-2 py-2.5 font-semibold text-zinc-500">Motivo</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row, i) => (
              <tr key={row._id} className="group hover:bg-zinc-50/50 transition-colors">
                <td className="px-2 py-1.5 text-center text-[11px] text-zinc-400 tabular-nums">{i + 1}</td>
                <td className="px-1"><CellAuto value={row.correo} onChange={(v) => updateRow(row._id, 'correo', v)} options={correos} placeholder="correo" /></td>
                <td className="px-1"><CellAuto value={row.cliente} onChange={(v) => updateRow(row._id, 'cliente', v)} options={clientes} placeholder="Seleccionar" /></td>
                <td className="px-1"><CellAuto value={row.proyecto} onChange={(v) => updateRow(row._id, 'proyecto', v)} options={proyectosByCliente[row.cliente] || []} placeholder="Seleccionar" /></td>
                <td className="px-1"><CellAuto value={row.equipo} onChange={(v) => updateRow(row._id, 'equipo', v)} options={[...EQUIPOS]} placeholder="Seleccionar" /></td>
                <td className="px-1"><CellAuto value={row.chapter} onChange={(v) => updateRow(row._id, 'chapter', v)} options={[...CHAPTERS]} placeholder="Seleccionar" /></td>
                <td className="px-1"><CellAuto value={row.rol} onChange={(v) => updateRow(row._id, 'rol', v)} options={[...ROLES]} placeholder="Rol" /></td>
                <td className="px-1">
                  <input 
                    type="number" step="0.25"
                    value={row.horas_ajuste} 
                    onChange={(e) => updateRow(row._id, 'horas_ajuste', e.target.value)} 
                    placeholder="0"
                    className="w-full bg-transparent px-2 py-1 font-medium text-zinc-800 outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded border border-transparent focus:border-brand-primary/30 text-xs"
                  />
                </td>
                <td className="px-1">
                  <input 
                    type="text" 
                    value={row.motivo}
                    onChange={(e) => updateRow(row._id, 'motivo', e.target.value)} 
                    placeholder="Detalle"
                    className="w-full bg-transparent px-2 py-1 text-zinc-800 outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded border border-transparent focus:border-brand-primary/30 text-xs"
                  />
                </td>
                <td className="px-2 text-center">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeRow(row._id)} 
                    className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar fila"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 hover:text-zinc-900 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Agregar fila
        </motion.button>

        <div className="flex items-center gap-4">
          <div className="text-xs text-zinc-500 font-medium px-4">
            <span className="text-zinc-900">{validRows().length}</span> de {rows.length} completas
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={saveDraft} 
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={process} 
            disabled={processing}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors shadow-md shadow-brand-primary/20 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {processing ? 'Procesando...' : 'Procesar e informar'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
