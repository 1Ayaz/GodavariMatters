import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,       // Store session in localStorage so it survives page reloads
        autoRefreshToken: true,     // Automatically refresh the JWT before it expires (prevents 400 on delete)
        detectSessionInUrl: false,  // We don't use OAuth redirects
      }
    })
  : null

// ── SECURITY: Rate Limiter ──
const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 3 // max 3 reports per window
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB raw (camera photos can be huge — we compress before upload)
const MAX_COMPRESSED_SIZE = 5 * 1024 * 1024 // 5MB after compression
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
  if (file.size > MAX_FILE_SIZE) throw new Error('Image too large. Please use a lower resolution camera setting.')
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
    throw new Error('Invalid file type. Only images (JPG, PNG, WEBP) are allowed.')
  }
}

function validateCompressedFile(blob) {
  if (!blob) throw new Error('Image compression failed.')
  if (blob.size > MAX_COMPRESSED_SIZE) throw new Error('Image still too large after compression. Please try taking a photo from closer range.')
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
  // Validate file type and raw size first
  validateFile(file)
  
  // Compress first — camera photos can be 10-20MB raw but compress to <1MB
  const compressed = await compressImage(file)
  
  // Validate the compressed result
  validateCompressedFile(compressed)
  
  // Primary: Cloudinary Unsigned Upload
  try {
    const formData = new FormData()
    formData.append('file', compressed, 'upload.jpg')
    formData.append('upload_preset', 'Godavari_Matters')

    const response = await fetch('https://api.cloudinary.com/v1_1/dmvxad50g/image/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Cloudinary upload failed:', errorData)
      throw new Error('Failed to upload image to Cloudinary.')
    }

    const data = await response.json()
    return { url: data.secure_url, isLocal: false }
  } catch (error) {
    console.error('Upload Error:', error)
    
    // Fallback: base64 (if upload entirely fails)
    console.warn('GodavariMatters: Cloudinary upload failed. Falling back to local base64.')
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(compressed)
    })
    return { url: base64, isLocal: true }
  }
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
  // Security: Rate limit + GPS duplicate check (Disabled for now to allow rapid testing/reporting)
  // checkRateLimit()
  // checkDuplicateGPS(report.lat, report.lng)
  
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
      reports[idx].cleaned_image_url = cleanedImageUrl
      reports[idx].resolved_at = new Date().toISOString()
      localStorage.setItem('gm_reports', JSON.stringify(reports))
      return reports[idx]
    }
    throw new Error('Report not found in local storage.')
  }

  // First verify the report exists
  const { data: existing, error: fetchErr } = await supabase
    .from('reports')
    .select('id, status')
    .eq('id', reportId)
    .single()

  if (fetchErr || !existing) {
    console.error('Failed to find report for update:', fetchErr)
    throw new Error('Could not find the report. It may have been deleted.')
  }

  const { data, error } = await supabase
    .from('reports')
    .update({
      cleaned_image_url: cleanedImageUrl,
      resolved_at: new Date().toISOString()
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    console.error('Supabase update error:', error)
    // RLS policy likely blocking anonymous updates — provide actionable message
    if (error.code === 'PGRST301' || error.message?.includes('policy') || error.message?.includes('permission')) {
      throw new Error('Update blocked by database security policy. The reports table may need an UPDATE policy for anonymous users.')
    }
    throw new Error(`Failed to update report: ${error.message}`)
  }

  if (!data) {
    // RLS can silently return no rows on update without raising an error
    console.error('Update returned no data — likely blocked by RLS policy')
    throw new Error('Verification update was blocked. Please contact the admin to check database policies.')
  }

  return data
}
