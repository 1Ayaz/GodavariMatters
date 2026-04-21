import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Upload a report image to Supabase Storage.
 * Strips EXIF data by re-encoding through canvas before upload.
 */
export async function uploadImage(file) {
  if (!supabase) return { url: URL.createObjectURL(file), isLocal: true }

  // Strip EXIF by re-encoding through canvas
  const stripped = await stripExif(file)
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`

  const { data, error } = await supabase.storage
    .from('pollution_snaps')
    .upload(fileName, stripped, { contentType: 'image/jpeg', upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('pollution_snaps')
    .getPublicUrl(fileName)

  return { url: publicUrl, isLocal: false }
}

/**
 * Strip EXIF metadata by drawing image to canvas and re-exporting as JPEG.
 * This is the "Ghost Ledger" EXIF wipe — no device info leaks.
 */
function stripExif(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Cap at 1200px to save bandwidth
      const max = 1200
      let w = img.width, h = img.height
      if (w > max) { h = (max / w) * h; w = max }
      if (h > max) { w = (max / h) * w; h = max }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Submit a garbage report to Supabase.
 */
export async function submitReport(report) {
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
    .update({ status: 'resolved', cleaned_image_url: cleanedImageUrl, resolved_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}
