import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Admin functions ──
async function adminGetReports() {
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

async function adminApproveResolved(reportId) {
  if (!supabase) {
    const reports = JSON.parse(localStorage.getItem('gm_reports') || '[]')
    const idx = reports.findIndex(r => r.id === reportId)
    if (idx >= 0) { reports[idx].status = 'resolved'; localStorage.setItem('gm_reports', JSON.stringify(reports)) }
    return
  }
  await supabase.from('reports').update({ status: 'resolved', admin_approved: true, admin_reviewed_at: new Date().toISOString() }).eq('id', reportId)
}

async function adminRejectResolved(reportId) {
  if (!supabase) {
    const reports = JSON.parse(localStorage.getItem('gm_reports') || '[]')
    const idx = reports.findIndex(r => r.id === reportId)
    if (idx >= 0) { reports[idx].status = 'unresolved'; reports[idx].cleaned_image_url = null; localStorage.setItem('gm_reports', JSON.stringify(reports)) }
    return
  }
  await supabase.from('reports').update({ status: 'unresolved', cleaned_image_url: null, admin_approved: false, admin_reviewed_at: new Date().toISOString() }).eq('id', reportId)
}

async function adminDeleteReport(reportId, report) {
  if (!supabase) {
    const reports = JSON.parse(localStorage.getItem('gm_reports') || '[]')
    localStorage.setItem('gm_reports', JSON.stringify(reports.filter(r => r.id !== reportId)))
    return
  }

  // 1. Delete image from storage if possible
  if (report?.image_url) {
    try {
      if (report.image_url.includes('supabase.co')) {
        // Delete from Supabase Storage
        const fileName = report.image_url.split('/').pop()
        if (fileName) {
          await supabase.storage.from('pollution_snaps').remove([fileName])
        }
      }
    } catch (e) {
      console.error('Failed to delete image from storage:', e)
    }
  }

  // 2. Delete report record
  await supabase.from('reports').delete().eq('id', reportId)
}

// ── Login Screen ──
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (supabase) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        onLogin(data.user)
      } else {
        // Demo mode — hardcoded admin
        if (email === 'admin@godavarimatters.in' && password === 'admin123') {
          onLogin({ email, id: 'demo-admin' })
        } else {
          throw new Error('Invalid credentials')
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font)'
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24,
        padding: '40px 36px', boxShadow: '0 32px 80px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>
            Godavar<span style={{ color: '#E8390E', fontStyle: 'italic' }}>!</span>Matters
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: 500 }}>
            Admin Dashboard
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@godavarimatters.in"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(232,57,14,0.15)', border: '1px solid rgba(232,57,14,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8066' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              padding: '14px', borderRadius: 12, background: '#E8390E', color: '#fff',
              fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 8, fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(232,57,14,0.35)'
            }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 24 }}>
          GodavariMatters Admin · Rajamahendravaram
        </p>
      </div>
    </div>
  )
}

// ── Report card in admin ──
function AdminReportCard({ report, onApprove, onReject, onDelete }) {
  const [loading, setLoading] = useState(false)
  const isPendingReview = report.cleaned_image_url && report.status !== 'resolved' && report.admin_approved !== false
  const isResolved = report.status === 'resolved'
  const daysAgo = Math.max(1, Math.ceil((Date.now() - new Date(report.created_at).getTime()) / 86400000))

  const severityColors = { minor: '#fb923c', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626' }
  const color = severityColors[report.severity] || '#f97316'

  const act = async (fn) => {
    setLoading(true)
    await fn(report.id)
    setLoading(false)
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e8e8ec',
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s'
    }}>
      {/* Report image */}
      <div style={{ position: 'relative', height: 160, background: '#f3f4f6' }}>
        {report.image_url && (
          <img src={report.image_url} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          <span style={{ background: color, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
            {report.severity}
          </span>
          <span style={{
            background: isResolved ? '#16a34a' : isPendingReview ? '#f59e0b' : '#ef4444',
            color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20
          }}>
            {isResolved ? 'RESOLVED' : isPendingReview ? 'REVIEW PENDING' : 'OPEN'}
          </span>
        </div>
        {/* Cleaned image preview */}
        {report.cleaned_image_url && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, width: 60, height: 60, borderRadius: 8, border: '2px solid #fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <img src={report.cleaned_image_url} alt="Cleaned" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{report.assigned_area}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
          {report.landmark} · {daysAgo}d ago · {report.waste_type} · {report.seen_count || 0} seen
        </div>

        {/* If cleaned photo submitted — show approve/reject */}
        {report.cleaned_image_url && !isResolved && (
          <>
            <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              🧹 Cleaned photo submitted — verify and approve or reject.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => act(onApprove)} disabled={loading}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, background: '#16a34a',
                  color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                ✓ Approve Resolved
              </button>
              <button onClick={() => act(onReject)} disabled={loading}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, background: '#ef4444',
                  color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                ✗ Reject
              </button>
            </div>
          </>
        )}

        {isResolved && (
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Verified resolved</div>
        )}

        <button onClick={() => act(() => onDelete(report))} disabled={loading}
          style={{
            width: '100%', marginTop: 8, padding: '8px', borderRadius: 8, border: '1px solid #e8e8ec',
            background: 'transparent', color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>
          Delete Report
        </button>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ──
export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('pending') // 'pending' | 'all' | 'resolved'
  const [stats, setStats] = useState({ total: 0, open: 0, pending: 0, resolved: 0 })

  useEffect(() => {
    // Check existing session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) { setUser(session.user); fetchReports() }
      })
    }
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const data = await adminGetReports()
      setReports(data)
      setStats({
        total: data.length,
        open: data.filter(r => r.status === 'unresolved' && !r.cleaned_image_url).length,
        pending: data.filter(r => r.cleaned_image_url && r.status !== 'resolved').length,
        resolved: data.filter(r => r.status === 'resolved').length,
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleLogin = (u) => { setUser(u); fetchReports() }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setReports([])
  }

  const filtered = reports.filter(r => {
    if (filter === 'pending') return r.cleaned_image_url && r.status !== 'resolved'
    if (filter === 'resolved') return r.status === 'resolved'
    return true
  })

  if (!user) return <AdminLogin onLogin={handleLogin} />

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8fa', fontFamily: 'var(--font)' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)', borderBottom: '1px solid #e8e8ec',
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
            Godavar<span style={{ color: '#E8390E', fontStyle: 'italic' }}>!</span>Matters
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E8390E', background: '#fef2f0', padding: '2px 8px', borderRadius: 20 }}>
            ADMIN
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</span>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e8e8ec', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign Out
          </button>
          <a href="/" style={{ padding: '6px 14px', borderRadius: 8, background: '#E8390E', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            ← Public Site
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, color: '#1a1a1a' },
            { label: 'Open', value: stats.open, color: '#ef4444' },
            { label: 'Pending Review', value: stats.pending, color: '#f59e0b' },
            { label: 'Resolved', value: stats.resolved, color: '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: '#fff', borderRadius: 14, padding: '16px',
              border: '1px solid #e8e8ec', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 20, width: 'fit-content' }}>
          {[
            { key: 'pending', label: `Pending Review (${stats.pending})` },
            { key: 'all', label: 'All Reports' },
            { key: 'resolved', label: 'Resolved' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: filter === t.key ? '#fff' : 'transparent',
                color: filter === t.key ? '#1a1a1a' : '#9ca3af',
                fontWeight: filter === t.key ? 700 : 500, fontSize: 13, fontFamily: 'inherit',
                boxShadow: filter === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            {filter === 'pending' ? 'Awaiting Your Review' : filter === 'resolved' ? 'Resolved Reports' : 'All Reports'}
            <span style={{ fontSize: 13, fontWeight: 500, color: '#9ca3af', marginLeft: 8 }}>({filtered.length})</span>
          </h2>
          <button onClick={fetchReports} disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e8e8ec', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {filter === 'pending' ? 'No pending reviews — all caught up!' : 'No reports in this category'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(report => (
              <AdminReportCard
                key={report.id}
                report={report}
                onApprove={async (id) => { await adminApproveResolved(id); await fetchReports() }}
                onReject={async (id) => { await adminRejectResolved(id); await fetchReports() }}
                onDelete={async (r) => { await adminDeleteReport(r.id, r); await fetchReports() }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
