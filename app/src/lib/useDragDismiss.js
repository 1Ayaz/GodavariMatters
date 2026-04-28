import { useRef, useCallback } from 'react'

/**
 * Smooth drag-to-dismiss for bottom sheets.
 * - Tracks finger in real time (live translateY visual feedback)
 * - Velocity-aware: a fast flick dismisses even under the distance threshold
 * - Snaps back with a spring-eased transition if not dismissed
 */
export function useDragDismiss(onDismiss, threshold = 72) {
  const ref       = useRef(null)
  const startY    = useRef(0)
  const lastY     = useRef(0)
  const lastTime  = useRef(0)
  const velocity  = useRef(0)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  const onTouchStart = useCallback((e) => {
    startY.current   = e.touches[0].clientY
    lastY.current    = e.touches[0].clientY
    lastTime.current = performance.now()
    velocity.current = 0
    if (ref.current) {
      ref.current.style.transition = 'none'
      ref.current.style.willChange = 'transform'
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    const now  = performance.now()
    const y    = e.touches[0].clientY
    const diff = y - startY.current
    const dt   = now - lastTime.current || 1

    // Track velocity (px/ms) — exponential moving average for stability
    velocity.current = velocity.current * 0.6 + ((y - lastY.current) / dt) * 0.4
    lastY.current    = y
    lastTime.current = now

    // Only allow downward drag (diff > 0)
    if (diff > 0 && ref.current) {
      // Apply rubber-band resistance: full drag until 60px, then logarithmic
      const drag = diff < 60 ? diff : 60 + Math.log1p(diff - 60) * 14
      ref.current.style.transform = `translateY(${drag}px)`
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    const diff     = e.changedTouches[0].clientY - startY.current
    const vel      = velocity.current  // px/ms — positive = downward

    if (ref.current) {
      ref.current.style.willChange = 'auto'
    }

    const shouldDismiss =
      diff > threshold ||          // dragged far enough
      (diff > 24 && vel > 0.55)    // OR fast flick downward (even short drag)

    if (shouldDismiss) {
      // Animate off screen, then call dismiss
      if (ref.current) {
        ref.current.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 1, 1)'
        ref.current.style.transform  = 'translateY(110%)'
        // Slight delay so the slide-out animation is visible
        setTimeout(() => dismissRef.current(), 260)
      } else {
        dismissRef.current()
      }
    } else {
      // Snap back with a natural spring
      if (ref.current) {
        ref.current.style.transition = 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
        ref.current.style.transform  = 'translateY(0)'
      }
    }
  }, [threshold])

  return { ref, onTouchStart, onTouchMove, onTouchEnd }
}
