'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Clock, Search, ChevronDown, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RegistroView } from '@/components/RegistroView'
import { HistoricoView } from '@/components/HistoricoView'
import { LoginView } from '@/components/LoginView'
import { Colaborador } from '@/types'
import { defaultPeriod, emailLocalPart, wasActiveInMonth } from '@/lib/utils'
import { cn } from '@/lib/cn'
import type { User } from '@supabase/supabase-js'

function upsertColaboradorByLocal(
  map: Map<string, Colaborador>,
  correo: string,
  partial: Omit<Colaborador, 'correo'>,
  preferExisting = false,
) {
  const local = emailLocalPart(correo)
  if (!local) return
  const prev = map.get(local)
  map.set(local, {
    correo: prev?.correo || correo,
    equipo: preferExisting
      ? (prev?.equipo || partial.equipo || null)
      : (partial.equipo || prev?.equipo || null),
    chapter: preferExisting
      ? (prev?.chapter || partial.chapter || null)
      : (partial.chapter || prev?.chapter || null),
    rol: preferExisting
      ? (prev?.rol || partial.rol || null)
      : (partial.rol || prev?.rol || null),
  })
}

export default function AjustesPage() {
  const [view, setView] = useState<'registro' | 'historico'>('registro')
  const [correos, setCorreos] = useState<string[]>([])
  const [clientes, setClientes] = useState<string[]>([])
  const [proyectos, setProyectos] = useState<string[]>([])
  const [colabByLocal, setColabByLocal] = useState<Map<string, Colaborador>>(new Map())
  const [correoPeriodo, setCorreoPeriodo] = useState(defaultPeriod)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    setMounted(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const loadOfficialCorreos = useCallback(async (mes: string) => {
    const { data, error } = await supabase
      .from('buk_mensual')
      .select('correo, status_empleado, active_until')
      .eq('mes', mes)

    if (error) {
      console.error('buk_mensual:', error.message)
      showToast('err', `Error cargando correos: ${error.message}`)
      return
    }

    const emails = new Set<string>()
    data?.forEach((d) => {
      if (!d.correo || !wasActiveInMonth(d as any, mes)) return
      emails.add(d.correo)
    })
    setCorreos([...emails].sort())
  }, [])

  useEffect(() => {
    async function loadCatalog() {
      const [colabRes, clickupRes] = await Promise.all([
        supabase.from('colaboradores').select('correo, chapter, rol, coe'),
        supabase.from('clickup_raw').select('correo, equipo, chapter, rol, cliente, proyecto'),
      ])

      if (colabRes.error) {
        console.error('colaboradores:', colabRes.error.message)
        showToast('err', `Error cargando colaboradores: ${colabRes.error.message}`)
      }
      if (clickupRes.error) {
        console.error('clickup_raw:', clickupRes.error.message)
        showToast('err', `Error cargando proyectos de clickup: ${clickupRes.error.message}`)
      }

      const byLocal = new Map<string, Colaborador>()

      colabRes.data?.forEach((d) => {
        if (!d.correo) return
        upsertColaboradorByLocal(byLocal, d.correo, {
          equipo: d.coe || null,
          chapter: d.chapter || null,
          rol: d.rol || null,
        })
      })

      // ClickUp solo rellena huecos — colaboradores manda en chapter/rol
      clickupRes.data?.forEach((d) => {
        if (!d.correo) return
        upsertColaboradorByLocal(byLocal, d.correo, {
          equipo: d.equipo || null,
          chapter: d.chapter || null,
          rol: d.rol || null,
        }, true)
      })

      setColabByLocal(byLocal)

      if (clickupRes.data) {
        setClientes([...new Set(clickupRes.data.map((d) => d.cliente).filter(Boolean))].sort() as string[])
        setProyectos([...new Set(clickupRes.data.map((d) => d.proyecto).filter(Boolean))].sort() as string[])
      }
    }

    loadCatalog()
    loadOfficialCorreos(defaultPeriod())
  }, [loadOfficialCorreos])

  function handlePeriodoChange(mes: string) {
    setCorreoPeriodo(mes)
    loadOfficialCorreos(mes)
  }

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  if (!mounted) return null
  if (authLoading) return null
  if (!user) return <LoginView />

  return (
    <div className="flex min-h-[100dvh] w-full bg-zinc-50/50 selection:bg-brand-primary/20">
      
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 w-72 flex flex-col bg-brand-primary text-white shadow-xl">
        {/* Section 1: Logo + Search */}
        <div className="flex flex-col gap-5 px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm p-1.5">
              <img src="/LogoAttachGroupWhite.png" alt="Attach Group" className="w-full h-full object-contain brightness-0" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-white">Attach Group</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/10 border border-white/5 text-sm font-medium text-white placeholder:text-white/30 outline-none focus:bg-white/[13%] focus:border-white/10 transition-all"
            />
          </div>
        </div>

        <div className="mx-5 h-px bg-white/5" />

        {/* Section 2: Navigation */}
        <nav className="flex flex-col gap-0.5 px-3 mt-5 flex-1">
          <button 
            onClick={() => setView('registro')}
            className={cn(
              "relative flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-150 group",
              view === 'registro' 
                ? "bg-white/12 text-white" 
                : "text-white/70 hover:bg-white/[8%] hover:text-white/90"
            )}
          >
            {view === 'registro' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-full" />}
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0", view === 'registro' ? "bg-white/12" : "bg-white/[6%] group-hover:bg-white/[10%]")}>
              <PlusCircle className="h-4 w-4" />
            </div>
            <span className="flex-1 text-left">Registro de Horas</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
          </button>

          <button 
            onClick={() => setView('historico')}
            className={cn(
              "relative flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-150 group",
              view === 'historico' 
                ? "bg-white/12 text-white" 
                : "text-white/70 hover:bg-white/[8%] hover:text-white/90"
            )}
          >
            {view === 'historico' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-full" />}
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0", view === 'historico' ? "bg-white/12" : "bg-white/[6%] group-hover:bg-white/[10%]")}>
              <Clock className="h-4 w-4" />
            </div>
            <span className="flex-1 text-left">Histórico de Ajustes</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
          </button>
        </nav>

        {/* User footer */}
        <div className="mx-5 h-px bg-white/5" />
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
            {user.email?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate leading-tight">
              {user.email?.split('@')[0] ?? 'Usuario'}
            </p>
            <p className="text-[11px] text-white/30 truncate leading-tight mt-0.5">
              {user.email ?? ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/30 hover:text-white/60 transition-colors shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="ml-72 flex-1 flex flex-col pt-8 pb-16 px-8 lg:px-12">
        <div key={view} className="flex-1 w-full max-w-7xl mx-auto">
          {view === 'registro' ? (
            <RegistroView
              correos={correos}
              clientes={clientes}
              colabByLocal={colabByLocal}
              periodo={correoPeriodo}
              onPeriodoChange={handlePeriodoChange}
              showToast={showToast}
            />
          ) : (
            <HistoricoView
              correos={correos}
              clientes={clientes}
              proyectos={proyectos}
              onPeriodoFilterChange={handlePeriodoChange}
              showToast={showToast}
            />
          )}
        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl border shadow-lg backdrop-blur-md z-50 text-sm font-medium flex items-center gap-3",
              toast.type === 'ok' 
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800" 
                : "bg-red-50/90 border-red-200 text-red-800"
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}