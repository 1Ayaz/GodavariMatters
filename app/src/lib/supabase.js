import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ── SECURITY: Rate Limiter ──
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 3 // max 3 reports per window
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

function checkRateLimit() {
  const now = Date.now()
  const key = 'gm_rate_limit'
  const timestamps = JSON.parse(localStorage.getItem(key) || '[]')
    .filter(t => now - t < RATE_LIMIT_WINDOW)
  
  if (timestamps.length >= RATE_LIMIT_MAX) {
    const waitMinutes = Math.ceil((RATE_LIMIT_WINDOW - (now - timestamps[0])) / 60000)
    throw new Error(`Too many reports. Please wait ${waitMinutes} minutes before submitting again.`)
  }
  
  timestamps.push(now)
  localStorage.setItem(key, JSON.stringify(timestamps))
}

function validateFile(file) {
  if (!file) throw new Error('No image provided.')
  if (file.size > MAX_FILE_SIZE) throw new Error('Image too large. Maximum size is 5MB.')
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
    throw new Error('Invalid file type. Only images (JPG, PNG, WEBP) are allowed.')
  }
}

function sanitizeText(text) {
  if (!text) return ''
  return text
    .replace(/[<>]/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Prevent JS injection
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 500) // Max 500 chars for any text field
}

function checkDuplicateGPS(lat, lng) {
  const key = 'gm_recent_gps'
  const now = Date.now()
  const recent = JSON.parse(localStorage.getItem(key) || '[]')
    .filter(e => now - e.t < 5 * 60 * 1000) // 5 min window
  
  const isDuplicate = recent.some(e => {
    const dist = Math.abs(e.lat - lat) + Math.abs(e.lng - lng)
    return dist < 0.0001 // ~10m radius
  })
  
  if (isDuplicate) {
    throw new Error('A report was recently submitted from this exact location. Please wait a few minutes.')
  }
  
  recent.push({ lat, lng, t: now })
  localStorage.setItem(key, JSON.stringify(recent))
}

/**
 * Upload a report image.
 * Supabase Storage (pollution_snaps bucket) is the primary target.
 * Falls back to base64 ONLY in offline/demo mode — warns the user.
 * Images are compressed: 1200px max, 85% JPEG quality.
 */
export async function uploadImage(file) {
  // Security validations
  validateFile(file)
  
  // Compress aggressively to save storage
  const compressed = await compressImage(file)
  
  // Primary: Supabase Storage
  if (supabase) {
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
    const { data, error } = await supabase.storage
      .from('pollution_snaps')
      .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false })
    
    if (error) {
      console.error('Supabase storage upload failed:', error)
      throw new Error(`Image upload failed: ${error.message}. Please check your internet connection and try again.`)
    }
    
    const { data: urlData } = supabase.storage
      .from('pollution_snaps')
      .getPublicUrl(fileName)
    
    if (!urlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded image. The storage bucket may not have public access enabled.')
    }
    
    return { url: urlData.publicUrl, isLocal: false }
  }
  
  // Fallback: base64 (DEMO MODE ONLY — warns user)
  console.warn('GodavariMatters: No Supabase configured. Images stored locally — NOT visible on other devices!')
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(compressed)
  })
  return { url: base64, isLocal: true }
}

/**
 * Compress image and strip EXIF for privacy.
 * 1200px max dimension, 85% JPEG quality — full quality for evidence.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_DIM = 1200
      let w = img.width, h = img.height
      
      if (w > h) {
        if (w > MAX_DIM) { h = Math.round((MAX_DIM / w) * h); w = MAX_DIM }
      } else {
        if (h > MAX_DIM) { w = Math.round((MAX_DIM / h) * w); h = MAX_DIM }
      }
      
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Image compression failed'))
          }
        },
        'image/jpeg',
        0.85 // High quality for evidence photos
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Submit a garbage report to Supabase.
 */
export async function submitReport(report) {
  // Security: Rate limit + GPS duplicate check
  checkRateLimit()
  checkDuplicateGPS(report.lat, report.lng)
  
  // Sanitize all text inputs
  report.landmark = sanitizeText(report.landmark)
  report.waste_type = sanitizeText(report.waste_type)
  report.assigned_area = sanitizeText(report.assigned_area)
  
  if (!supabase) {
    // Fallback: localStorage for demo mode
    const existing = JSON.parse(localStorage.getItem('gm_reports') || '[]')
    const newReport = { ...report, id: crypto.randomUUID(), created_at: new Date().toISOString(), seen_count: 0 }
    existing.push(newReport)
    localStorage.setItem('gm_reports', JSON.stringify(existing))
    return newReport
  }

  const { data, error } = await supabase
    .from('reports')
    .insert([report])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all reports from Supabase or localStorage.
 */
export async function getReports() {
  if (!supabase) {
    return JSON.parse(localStorage.getItem('gm_reports') || '[]')
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Increment "I've seen this" counter.
 */
export async function incrementSeen(reportId) {
  if (!supabase) {
    const reports = JSON.parse(localStorage.getItem('gm_reports') || '[]')
    const idx = reports.findIndex(r => r.id === reportId)
    if (idx >= 0) {
      reports[idx].seen_count = (reports[idx].seen_count || 0) + 1
      localStorage.setItem('gm_reports', JSON.stringify(reports))
      return reports[idx]
    }
    return null
  }

  const { data, error } = await supabase.rpc('increment_seen', { report_id: reportId })
  if (error) throw error
  return data
}

/**
 * Mark report as resolved (cleaned).
 */
export async function markResolved(reportId, cleanedImageUrl) {
  if (!supabase) {
    const reports = JSON.parse(localStorage.getItem('gm_reports') || '[]')
    const idx = reports.findIndex(r => r.id === reportId)
    if (idx >= 0) {
      reports[idx].status = 'resolved'
      reports[idx].cleaned_image_url = cleanedImageUrl
      reports[idx].resolved_at = new Date().toISOString()
      localStorage.setItem('gm_reports', JSON.stringify(reports))
      return reports[idx]
    }
    return null
  }

  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'pending_review', cleaned_image_url: cleanedImageUrl, resolved_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}
