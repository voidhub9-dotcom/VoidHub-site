'use client'

import { useEffect } from 'react'

export default function AntiDebug() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key)) ||
        (e.ctrlKey && ['u', 's', 'p'].includes(e.key)) ||
        (e.metaKey && e.altKey && e.key === 'i') // mac: Cmd+Option+I
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()
        return false
      }
    }

    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false }
    const handleSelectStart = (e: Event) => {
      if ((e.target as HTMLElement)?.closest('[data-selectable]')) return
      e.preventDefault()
    }
    const handleCopy      = (e: ClipboardEvent) => { e.preventDefault() }
    const handleCut       = (e: ClipboardEvent) => { e.preventDefault() }
    const handleDragStart = (e: DragEvent)      => { e.preventDefault() }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('dragstart', handleDragStart)

    let devOpen = false

    const onDevTools = () => {
      if (devOpen) return
      devOpen = true
      // eslint-disable-next-line no-debugger
      debugger
      console.clear()
    }

    // Heuristic 1: docked devtools change the window/outer size ratio
    const checkSize = () => {
      const docked =
        window.outerHeight - window.innerHeight > 160 ||
        window.outerWidth  - window.innerWidth  > 160
      if (docked) onDevTools()
      else devOpen = false
    }

    // Heuristic 2: object with toString() getter fires when devtools evaluates it
    const timingCheck = () => {
      const sentinel = new (class {
        toString() { onDevTools(); return '' }
      })()
      console.log('%c', sentinel)
    }

    const sizeId   = setInterval(checkSize,   800)
    const timingId = setInterval(timingCheck, 2500)
    const clearId  = setInterval(() => { if (devOpen) console.clear() }, 1000)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('dragstart', handleDragStart)
      clearInterval(sizeId)
      clearInterval(timingId)
      clearInterval(clearId)
    }
  }, [])

  return null
}
