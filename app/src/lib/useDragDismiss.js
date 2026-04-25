import { useRef, useCallback } from 'react'

export function useDragDismiss(onDismiss, threshold = 80) {
  const ref = useRef(null)
  const startY = useRef(0)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss // sync without destabilizing handlers

  const onTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e) => {
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && ref.current) {
      ref.current.style.transition = 'none'
      ref.current.style.transform = `translateY(${diff}px)`
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    const diff = e.changedTouches[0].clientY - startY.current
    if (diff > threshold) dismissRef.current()
    else if (ref.current) {
      ref.current.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      ref.current.style.transform = 'translateY(0)'
    }
  }, [threshold])

  return { ref, onTouchStart, onTouchMove, onTouchEnd }
}
