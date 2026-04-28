import { useEffect } from 'react'
import { useDragDismiss } from '../lib/useDragDismiss'

/**
 * BottomSheet — base container for all sliding panels.
 *
 * Structure:
 *   overlay (backdrop, tap to close)
 *   └─ .bottom-sheet  (fixed height, flex column, NO overflow)
 *      ├─ drag-handle  (touchAction: none — drag to dismiss)
 *      ├─ .sheet-header  (sticky top — never scrolls)
 *      └─ .sheet-body   (flex: 1, overflow-y: auto — only this scrolls)
 *
 * Children are expected to render a .sheet-header + .sheet-body pair,
 * OR just raw content (which sits inside the scroll area automatically).
 */
export default function BottomSheet({ isOpen, onClose, className = '', children }) {
  const { ref, onTouchStart, onTouchMove, onTouchEnd } = useDragDismiss(onClose)

  // Reset transform when re-opened (sheet slides in fresh)
  useEffect(() => {
    if (isOpen && ref.current) {
      ref.current.style.transform = 'translateY(0)'
      ref.current.style.transition = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bottom-sheet ${className}`}
        ref={ref}
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Drag handle — ONLY this area triggers dismiss gesture */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            padding: '14px 0 8px',
            display: 'flex', justifyContent: 'center',
            cursor: 'grab', flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <div style={{
            width: 40, height: 5, borderRadius: 3,
            background: 'rgba(0,0,0,0.15)',
          }} />
        </div>

        {/* Children render directly — sheet-header stays fixed, sheet-body scrolls */}
        {children}
      </div>
    </div>
  )
}
