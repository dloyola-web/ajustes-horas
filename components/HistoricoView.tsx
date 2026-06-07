import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, CheckCircle2, RotateCcw, LayoutDashboard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { FilterMultiSelect } from './FilterMultiSelect'
import { triggerN8nWebhook } from '@/lib/webhook'
import { defaultPeriod, formatPeriodo } from '@/lib/utils'
import { Adjustment } from '@/types'
import { cn } from '@/lib/cn'

function adjustmentStatus(row: Adjustment): 'borrador' | 'procesado' {
  return row.status === 'procesado' ? 'procesado' : 'borrador'
}

export function HistoricoView({
  correos,
  clientes,
  proyectos,
  onPeriodoFilterChange,
  showToast,
}: {
  correos: string[]
  clientes: string[]
  proyectos: string[]
  onPeriodoFilterChange: (mes: string) => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [data, setData] = useState<Adjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [fPeriodo, setFPeriodo] = useState(defaultPeriod)
  const [fStatus, setFStatus] = useState<'' | 'borrador' | 'procesado'>('')
  const [fCorreos, setFCorreos] = useState<string[]>([])
  const [fClientes, setFClientes] = useState<string[]>([])
  const [fProyectos, setFProyectos] = useState<string[]>([])
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const hasFilters = fCorreos.length || fClientes.length || fProyectos.length
  const borradorCount = data.filter((d) => adjustmentStatus(d) === 'borrador').length
  const procesadoCount = data.filter((d) => adjustmentStatus(d) === 'procesado').length
  const visibleData = fStatus ? data.filter((d) => adjustmentStatus(d) === fStatus) : data

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('adjustments').select('*').order('created_at', { ascending: false }).limit(500)
    if (fPeriodo) q = q.like('fecha', `${fPeriodo}%`)
    if (fCorreos.length) q = q.in('correo', fCorreos)
    if (fClientes.length) q = q.in('cliente', fClientes)
    if (fProyectos.length) q = q.in('proyecto', fProyectos)
    const { data: result, error } = await q
    if (error) showToast('err', error.message)
    setData((result as Adjustment[]) || [])
    setLoading(false)
  }, [fPeriodo, fCorreos, fClientes, fProyectos]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { 
    const timer = setTimeout(() => {
      load()
    }, 300)
    return () => clearTimeout(timer)
  }, [load])

  async function handleDelete(id: string) {
    const { error } = await supabase.from('adjustments').delete().eq('id', id)
    if (error) { 
      showToast('err', error.message) 
    } else { 
      showToast('ok', 'Ajuste eliminado')
      load() 
    }
    setConfirmId(null)
  }

  async function processBorradores() {
    const drafts = data.filter((d) => adjustmentStatus(d) === 'borrador')
    if (!drafts.length) { showToast('err', 'No hay borradores en este periodo'); return }
    setProcessing(true)
    const ids = drafts.map((d) => d.id)
    
    const webhookSuccess = await triggerN8nWebhook(fPeriodo, drafts.length)
    
    if (!webhookSuccess) {
      setProcessing(false)
      showToast('err', 'Fallo al contactar el webhook de n8n. Los borradores no fueron procesados.')
      return
    }

    const { error } = await supabase.from('adjustments').update({ status: 'procesado' }).in('id', ids)
    if (error) { 
      setProcessing(false)
      showToast('err', error.message)
      return 
    }
    
    setProcessing(false)
    showToast('ok', `${drafts.length} borrador(es) procesados — flujo n8n activado`)
    load()
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header aligned to the left */}
      <div className="flex justify-between items-start mb-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-2">Histórico de Ajustes</h1>
          <p className="text-zinc-500 text-sm">
            Consulta y gestiona los ajustes realizados. Los borradores pueden ser procesados en lote para notificar al equipo correspondiente.
          </p>
        </div>
        
        {borradorCount > 0 && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={processBorradores} 
            disabled={processing}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-brand-secondary bg-brand-primary/10 border border-brand-primary/20 rounded-lg hover:bg-brand-primary/20 transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {processing ? 'Procesando...' : `Procesar ${borradorCount} borrador(es)`}
          </motion.button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4 mb-6 p-4 bg-white border border-zinc-200 rounded-xl">
        <div className="flex flex-col gap-2 w-full lg:w-40 shrink-0">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Periodo</label>
          <input
            type="month"
            value={fPeriodo}
            onChange={(e) => {
              setFPeriodo(e.target.value)
              onPeriodoFilterChange(e.target.value || defaultPeriod())
            }}
            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
          />
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-64">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Correo</label>
          <FilterMultiSelect selected={fCorreos} onChange={setFCorreos} options={correos} placeholder="Todos" />
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-64">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cliente</label>
          <FilterMultiSelect selected={fClientes} onChange={setFClientes} options={clientes} placeholder="Todos" />
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-64">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Proyecto</label>
          <FilterMultiSelect selected={fProyectos} onChange={setFProyectos} options={proyectos} placeholder="Todos" />
        </div>
        
        <div className="flex-1" />
        
        {(hasFilters || fStatus) && (
          <button 
            onClick={() => {
              setFPeriodo(defaultPeriod())
              setFStatus('')
              setFCorreos([])
              setFClientes([])
              setFProyectos([])
              onPeriodoFilterChange(defaultPeriod())
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-2"
          >
            <RotateCcw className="h-3 w-3" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button 
          onClick={() => setFStatus('')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-2 border",
            fStatus === '' ? "bg-zinc-800 text-white border-zinc-800" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
          )}
        >
          Todos <span className={cn("px-1.5 rounded-md text-[10px]", fStatus === '' ? "bg-white/20" : "bg-zinc-100")}>{data.length}</span>
        </button>
        <button 
          onClick={() => setFStatus('borrador')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-2 border",
            fStatus === 'borrador' ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
          )}
        >
          Borrador <span className={cn("px-1.5 rounded-md text-[10px]", fStatus === 'borrador' ? "bg-yellow-200/50" : "bg-zinc-100")}>{borradorCount}</span>
        </button>
        <button 
          onClick={() => setFStatus('procesado')}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-2 border",
            fStatus === 'procesado' ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
          )}
        >
          Procesado <span className={cn("px-1.5 rounded-md text-[10px]", fStatus === 'procesado' ? "bg-emerald-200/50" : "bg-zinc-100")}>{procesadoCount}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex-1 max-h-[50vh] overflow-y-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-brand-primary animate-spin" />
              <span className="text-sm text-zinc-400">Cargando registros...</span>
            </div>
          </div>
        ) : visibleData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <LayoutDashboard className="h-8 w-8 mb-3 opacity-20" />
            <span className="text-sm">No se encontraron registros para estos filtros</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs whitespace-nowrap table-fixed">
            <colgroup>
              <col className="w-20" />
              <col className="w-40" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-16" />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-12" />
            </colgroup>
            <thead className="bg-zinc-50/80 backdrop-blur border-b border-zinc-200 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Periodo</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Correo</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Cliente</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Proyecto</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Equipo</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Chapter</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Rol</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider text-right">Horas</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Motivo</th>
                <th className="px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibleData.map((row) => (
                <tr key={row.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-2 py-2 font-mono text-[10px] text-zinc-500">{formatPeriodo(row.fecha)}</td>
                  <td className="px-2 py-2 font-medium text-zinc-800 truncate">{row.correo}</td>
                  <td className="px-2 py-2 text-zinc-600 truncate">{row.cliente}</td>
                  <td className="px-2 py-2 text-zinc-600 truncate">{row.proyecto}</td>
                  <td className="px-2 py-2 text-zinc-400 text-[11px] truncate">{row.equipo}</td>
                  <td className="px-2 py-2 text-zinc-600 truncate">{row.chapter}</td>
                  <td className="px-2 py-2 text-zinc-600 truncate">{row.rol}</td>
                  <td className="px-2 py-2 font-mono text-right font-medium">{row.horas_ajuste}</td>
                  <td className="px-2 py-2 text-zinc-400 text-[11px] truncate">{row.motivo}</td>
                  <td className="px-2 py-2">
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                      adjustmentStatus(row) === 'procesado' ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"
                    )}>
                      {adjustmentStatus(row)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <AnimatePresence mode="wait">
                      {confirmId === row.id ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center justify-end gap-1"
                        >
                          <button onClick={() => handleDelete(row.id)} className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded hover:bg-red-200 transition-colors">Sí</button>
                          <button onClick={() => setConfirmId(null)} className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-semibold rounded hover:bg-zinc-200 transition-colors">No</button>
                        </motion.div>
                      ) : (
                        <motion.button 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setConfirmId(row.id)} 
                          className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="mt-3 text-xs text-zinc-400 font-mono flex items-center justify-between">
        <span>Mostrando {visibleData.length} registros</span>
        {fStatus === '' && borradorCount > 0 && procesadoCount > 0 && (
          <span>{borradorCount} borrador · {procesadoCount} procesado</span>
        )}
      </div>
    </div>
  )
}
