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
      <div 
        className={`bottom-sheet ${className}`} 
        ref={ref} 
        onTouchStart={onTouchStart} 
        onTouchMove={onTouchMove} 
        onTouchEnd={onTouchEnd} 
        style={{ transition: 'transform 0.2s ease-out' }}
      >
        <div className="wcp-drag-handle" style={{ margin: '0 auto 12px' }} />
        {children}
      </div>
    </div>
  )
}
