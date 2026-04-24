import { useRef } from 'react'

export function useDragDismiss(onDismiss, threshold = 80) {
  const ref = useRef(null)
  const startY = useRef(0)

  const onTouchStart = (e) => { startY.current = e.touches[0].clientY }
  const onTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && ref.current) ref.current.style.transform = `translateY(${diff}px)`
  }
  const onTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientY - startY.current
    if (diff > threshold) {
      onDismiss()
    } else if (ref.current) {
      ref.current.style.transform = 'translateY(0)'
    }
  }

  return { ref, onTouchStart, onTouchMove, onTouchEnd }
}
