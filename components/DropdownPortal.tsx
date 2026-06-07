import { RefObject, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DropdownPos } from '@/types'
import { cn } from '@/lib/cn'

export function DropdownPortal({
  open,
  pos,
  items,
  listRef,
  onPick,
  activeIndex = -1,
}: {
  open: boolean
  pos: DropdownPos
  items: string[]
  listRef: RefObject<HTMLUListElement | null>
  onPick: (item: string) => void
  activeIndex?: number
}) {
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (open && activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && items.length > 0 && (
        <motion.ul
          ref={listRef}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed z-[9999] max-h-56 overflow-y-auto m-0 p-1 bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-xl rounded-xl list-none"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          role="listbox"
        >
          {items.map((o, i) => (
            <li
              key={o}
              ref={(el) => { itemRefs.current[i] = el }}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors select-none",
                i === activeIndex ? "bg-brand-primary/10 text-brand-secondary font-medium" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
              onMouseDown={(e) => { e.preventDefault(); onPick(o) }}
            >
              {o}
            </li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>,
    document.body,
  )
}
