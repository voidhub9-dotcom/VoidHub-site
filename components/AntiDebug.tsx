'use client'

import { useEffect } from 'react'

/**
 * Blocks common methods people use to inspect/steal code:
 * - F12 / Ctrl+Shift+I (DevTools)
 * - Right-click context menu
 * - Ctrl+S (Save page)
 * - Ctrl+U (View source)
 * - Text selection
 * - Copy/Paste
 *
 * Note: These are bypassed easily by determined users.
 * Real protection is: don't put sensitive code in the frontend.
 */
export default function AntiDebug() {
  useEffect(() => {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's')
      ) {
        e.preventDefault()
        return false
      }
    }

    // Block right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Disable text selection via CSS is better, but this helps too
    const handleSelectStart = (e: Event) => {
      // Allow selection on specific elements (like buttons with text)
      const target = e.target as HTMLElement
      if (target?.closest('[data-selectable]')) return
      e.preventDefault()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('selectstart', handleSelectStart)

    // Disable copy paste
    document.addEventListener('copy', (e) => {
      e.preventDefault()
    })
    document.addEventListener('cut', (e) => {
      e.preventDefault()
    })

    // Detect if DevTools is open (basic check)
    let devToolsOpen = false
    const checkDevTools = () => {
      const threshold = 160
      if (window.outerHeight - window.innerHeight > threshold) {
        if (!devToolsOpen) {
          console.log('%c⚠️ DevTools detected and blocked', 'color: red; font-size: 14px;')
          devToolsOpen = true
        }
      } else {
        devToolsOpen = false
      }
    }
    const devToolsInterval = setInterval(checkDevTools, 500)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('copy', () => {})
      document.removeEventListener('cut', () => {})
      clearInterval(devToolsInterval)
    }
  }, [])

  return null
}
