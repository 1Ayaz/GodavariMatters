import { useMemo } from 'react'
import { useApp } from '../lib/store'

/**
 * NammaKasa-style Politician Report Card
 * Shows: Photo, name, party, stats, worst wards, recent reports
 */
export default function LeaderSheet() {
  const { state, actions, filteredReports } = useApp()
  const leader = state.selectedLeader

  // Compute stats for this leader's constituency
  const stats = useMemo(() => {
    if (!leader) return null
    const allReports = state.reports
    const active = allReports.filter(r => r.status === 'unresolved')
    const resolved = allReports.filter(r => r.status === 'resolved')
    
    // Group by area
    const areaMap = {}
    allReports.forEach(r => {
      const area = r.assigned_area || 'Unknown'
      if (!areaMap[area]) areaMap[area] = { total: 0, unresolved: 0 }
      areaMap[area].total++
      if (r.status === 'unresolved') areaMap[area].unresolved++
    })
    
    const worstAreas = Object.entries(areaMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }))

    const avgDays = allReports.length > 0
      ? Math.round(allReports.reduce((acc, r) => acc + Math.max(1, Math.ceil((Date.now() - new Date(r.created_at).getTime()) / 86400000)), 0) / allReports.length)
      : 0

    return {
      active: active.length,
      total: allReports.length,
      resolved: resolved.length,
      avgDays,
      areas: Object.keys(areaMap).length,
      worstAreas,
      recentReports: allReports.slice(0, 5)
    }
  }, [leader, state.reports])

  if (!leader || !stats) return null

  const handleShare = () => {
    const text = `📊 ${leader.name} (${leader.party} · ${leader.type}) — Constituency Report Card\n\n${stats.active} active reports · ${stats.total} total · ${stats.avgDays} avg days unresolved\n\nTrack accountability on GodavariMatters 👉 godavarimatters.in`
    if (navigator.share) {
      navigator.share({ title: `${leader.name} Report Card`, text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    }
  }

  // Photo URLs for known politicians
  const photoMap = {
    'Adireddy Srinivas': 'https://meeadireddy.com/wp-content/uploads/2024/06/adireddy-vasu-profile.jpg',
    'Daggubati Purandheshwari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Daggubati_Purandeswari.jpg/220px-Daggubati_Purandeswari.jpg',
    'Gorantla Butchaiah Chowdary': 'https://myneta.info/andhra_pradesh2024/candidate_photos/37.jpg',
  }
  const photoUrl = photoMap[leader.name] || ''

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && actions.selectLeader(null)}>
      <div className="bottom-sheet detail-sheet">
        <div className="sheet-header">
          <div className="leader-header-info">
            <div className="leader-avatar-wrap">
              {photoUrl ? (
                <img src={photoUrl} alt={leader.name} className="leader-avatar"
                  onError={(e) => { e.target.style.display='none' }} />
              ) : (
                <div className="leader-avatar" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6', fontSize:'18px', fontWeight:800, color:'#6b7280' }}>
                  {leader.name.split(' ').map(n => n[0]).join('')}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0 }}>{leader.name}</h2>
              <div className="leader-role">
                {leader.type} · {leader.constituency} · <span className={`party-tag ${leader.party.toLowerCase()}`}>{leader.party}</span>
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button className="icon-btn" onClick={handleShare} title="Share">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button className="close-btn" onClick={() => actions.selectLeader(null)}>&times;</button>
          </div>
        </div>

        <div className="sheet-body">
          {/* Stats row — NammaKasa style: 4 cards */}
          <div className="leader-stats">
            <div className="dstat">
              <span className="dstat-num">{stats.active}</span>
              <span className="dstat-label">Active</span>
            </div>
            <div className="dstat">
              <span className="dstat-num">{stats.total}</span>
              <span className="dstat-label">Reports</span>
            </div>
            <div className="dstat">
              <span className="dstat-num">{stats.avgDays}</span>
              <span className="dstat-label">Avg Days</span>
            </div>
            <div className="dstat">
              <span className="dstat-num">{stats.areas}</span>
              <span className="dstat-label">Wards</span>
            </div>
          </div>

          {/* Summary alert */}
          <div className="leader-summary">
            <strong>{stats.active} civic issues</strong> across {stats.areas} wards remain unresolved in {leader.name}'s {leader.type === 'MP' ? 'parliamentary' : 'assembly'} constituency.
          </div>

          {/* Worst wards */}
          {stats.worstAreas.length > 0 && (
            <>
              <h3 className="section-title">WORST WARDS</h3>
              {stats.worstAreas.map((area, i) => (
                <div key={area.name} className="lb-item" style={{ cursor: 'default' }}>
                  <span className={`lb-rank${i < 3 ? ' top3' : ''}`}>{i + 1}</span>
                  <div className="lb-info">
                    <div className="lb-name">{area.name}</div>
                  </div>
                  <span className="lb-count">{area.total}</span>
                </div>
              ))}
            </>
          )}

          {/* Recent reports */}
          {stats.recentReports.length > 0 && (
            <>
              <h3 className="section-title" style={{ marginTop: 20 }}>RECENT REPORTS</h3>
              {stats.recentReports.map(r => (
                <div key={r.id} className="wr-item" onClick={() => { actions.selectLeader(null); actions.selectReport(r); }}>
                  {r.image_url && <img src={r.image_url} width="48" height="48" alt="" />}
                  <div className="wr-info">
                    <div className="wr-landmark">{r.assigned_area}</div>
                    <div className="wr-time">{r.landmark} · {Math.max(1, Math.ceil((Date.now() - new Date(r.created_at).getTime()) / 86400000)) === 1 ? 'Today' : `${Math.max(1, Math.ceil((Date.now() - new Date(r.created_at).getTime()) / 86400000))}d ago`}</div>
                  </div>
                  <span className={`wr-severity ${r.severity}`}>{r.severity}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
