import { useEffect } from 'react'
import { useDragDismiss } from '../lib/useDragDismiss'

export default function BottomSheet({ isOpen, onClose, className = '', children }) {
  const { ref, onTouchStart, onTouchMove, onTouchEnd } = useDragDismiss(onClose)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.transform = 'translateY(0)'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`bottom-sheet ${className}`} ref={ref}>
        {/* Only apply drag handlers to the handle area so scrolling content doesn't trigger it */}
        <div 
          onTouchStart={onTouchStart} 
          onTouchMove={onTouchMove} 
          onTouchEnd={onTouchEnd} 
          style={{ padding: '16px 0', margin: '-16px 0 0', display: 'flex', justifyContent: 'center', touchAction: 'none' }}
        >
          <div className="wcp-drag-handle" style={{ margin: 0 }} />
        </div>
        {children}
      </div>
    </div>
  )
}
