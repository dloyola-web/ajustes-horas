import { useState, useRef, useCallback } from 'react'
import { useDropdownPosition, useClickOutside } from '@/hooks/useDropdown'
import { DropdownPortal } from './DropdownPortal'
import { cn } from '@/lib/cn'

function filterOptions(options: string[], query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase()
  const list = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  return list.slice(0, limit)
}

export function CellAuto({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  
  const { pos, updatePos } = useDropdownPosition(open, inputRef)
  const filtered = filterOptions(options, open ? q : value)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])
  
  useClickOutside(open, wrapRef, listRef, close)

  function openWithQuery(next: string) {
    setQ(next)
    setOpen(true)
    setActiveIndex(-1)
    requestAnimationFrame(updatePos)
  }

  function pick(opt: string) {
    onChange(opt)
    setQ('')
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.blur()
  }

  function handleBlur() {
    const typed = q.trim()
    if (typed) {
      const exact = options.find((o) => o.toLowerCase() === typed.toLowerCase())
      if (exact) onChange(exact)
    }
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openWithQuery(value)
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
        pick(filtered[activeIndex])
      } else if (filtered.length === 1) {
        pick(filtered[0])
      } else {
        handleBlur()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full", open && "z-50")}>
      <input
        ref={inputRef}
        type="text"
        value={open ? q : value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={placeholder}
        onFocus={() => openWithQuery(value)}
        onChange={(e) => openWithQuery(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent px-2 py-1.5 text-zinc-800 text-sm font-medium outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary/30 rounded border border-transparent focus:border-brand-primary/30 placeholder:text-zinc-400 placeholder:font-normal transition-all"
      />
      <DropdownPortal 
        open={open} 
        pos={pos} 
        items={filtered} 
        listRef={listRef} 
        onPick={pick} 
        activeIndex={activeIndex} 
      />
    </div>
  )
}
