import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { useDropdownPosition, useClickOutside } from '@/hooks/useDropdown'
import { DropdownPortal } from './DropdownPortal'
import { cn } from '@/lib/cn'

function filterOptions(options: string[], query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase()
  const list = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  return list.slice(0, limit)
}

export function FilterMultiSelect({
  selected,
  onChange,
  options,
  placeholder = 'Todos',
}: {
  selected: string[]
  onChange: (v: string[]) => void
  options: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  
  const { pos, updatePos } = useDropdownPosition(open, inputRef, 220)

  const available = options.filter((o) => !selected.includes(o))
  const filtered = filterOptions(available, q)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])
  
  useClickOutside(open, wrapRef, listRef, close)

  function openSearch(next: string) {
    setQ(next)
    setOpen(true)
    setActiveIndex(-1)
    requestAnimationFrame(updatePos)
  }

  function add(opt: string) {
    if (!selected.includes(opt)) onChange([...selected, opt])
    setQ('')
    setActiveIndex(-1)
    inputRef.current?.focus()
    requestAnimationFrame(updatePos)
  }

  function remove(opt: string) {
    onChange(selected.filter((s) => s !== opt))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openSearch('')
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && filtered[activeIndex]) {
        add(filtered[activeIndex])
      } else if (filtered.length === 1 && q.trim()) {
        add(filtered[0])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Backspace' && q === '' && selected.length > 0) {
      remove(selected[selected.length - 1])
    }
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full", open && "z-50")}>
      <div 
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[38px] p-1.5 w-full bg-white border rounded-lg cursor-text transition-all",
          open ? "border-brand-primary ring-1 ring-brand-primary/20" : "border-zinc-200 hover:border-zinc-300"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md max-w-full overflow-hidden">
            <span className="truncate">{s}</span>
            <button 
              type="button" 
              onMouseDown={(e) => { e.preventDefault(); remove(s) }} 
              aria-label={`Quitar ${s}`}
              className="text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={q}
          placeholder={selected.length ? 'Buscar...' : placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-label={placeholder}
          onFocus={() => { setOpen(true); requestAnimationFrame(updatePos) }}
          onChange={(e) => openSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[60px] bg-transparent border-none outline-none text-sm text-zinc-800 placeholder:text-zinc-400 py-0.5 px-1"
        />
      </div>
      <DropdownPortal 
        open={open} 
        pos={pos} 
        items={filtered} 
        listRef={listRef} 
        onPick={add}
        activeIndex={activeIndex}
      />
    </div>
  )
}
