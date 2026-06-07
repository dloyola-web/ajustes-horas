import { useState, useEffect, useCallback, RefObject } from 'react'
import { DropdownPos } from '@/types'

export function useDropdownPosition(open: boolean, anchorRef: RefObject<HTMLElement | null>, minWidth = 160) {
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: minWidth })

  const updatePos = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, minWidth) })
  }, [anchorRef, minWidth])

  useEffect(() => {
    if (!open) return
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  return { pos, updatePos }
}

export function useClickOutside(
  open: boolean,
  wrapRef: RefObject<HTMLElement | null>,
  listRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, wrapRef, listRef, onClose])
}
