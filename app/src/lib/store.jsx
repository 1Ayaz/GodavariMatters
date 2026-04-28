import { createContext, useContext, useReducer, useMemo, useRef, useEffect } from 'react'
import { supabase, getReports, submitReport as apiSubmit, incrementSeen as apiSeen, markResolved as apiResolve, uploadImage } from './supabase'
import { loadData, detectJurisdiction } from './jurisdiction'
import { MOCK_REPORTS } from './mockData'

const AppContext = createContext()

function detectMobile() {
  if (typeof window === 'undefined') return true
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768
}

// ─── Cloud Vision: validate photo is a real civic/garbage issue ───────────────
async function validateGarbagePhoto(imageFile) {
  const toBase64 = (file) => new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result.split(',')[1])
    reader.onerror = rej
    reader.readAsDataURL(file)
  })

  const base64 = await toBase64(imageFile)

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${import.meta.env.VITE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'LABEL_DETECTION', maxResults: 15 }]
        }]
      })
    }
  )

  const data = await response.json()
  const labels = data.responses[0]?.labelAnnotations?.map(l => l.description.toLowerCase()) || []

  const civicKeywords = [
    'garbage', 'waste', 'litter', 'pollution', 'debris',
    'trash', 'dump', 'sewage', 'drain', 'filth',
    'street', 'road', 'construction', 'rubble', 'ghat',
    'river', 'plastic', 'mud', 'soil', 'sand', 'water',
    'infrastructure', 'pavement', 'sidewalk', 'pothole'
  ]

  const matched = labels.some(label => civicKeywords.some(kw => label.includes(kw)))
  if (!matched) throw new Error('Photo does not show a civic issue. Please photograph the actual problem.')
}
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  reports: [],
  boundaries: null,
  governance: null,
  loading: true,
  isMobile: detectMobile(),
  splashDismissed: false,
  activeView: 'map', // 'map' | 'list'
  filterSeverity: 'all',
  filterStatus: 'all',
  selectedReport: null,
  selectedWard: null,
  selectedLeader: null,
  selectedOfficial: null,
  showReportForm: false,
  showCleanedForm: false,
  showStats: false,
  userLocation: null,
  lang: typeof window !== 'undefined' ? (localStorage.getItem('gm_lang') || 'en') : 'en',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, boundaries: action.boundaries, governance: action.governance }
    case 'SET_REPORTS':
      return { ...state, reports: action.reports, loading: false }
    case 'ADD_REPORT':
      return { ...state, reports: [action.report, ...state.reports] }
    case 'UPDATE_REPORT':
      return { ...state, reports: state.reports.map(r => r.id === action.report.id ? action.report : r) }
    case 'SET_VIEW':
      return { ...state, activeView: action.view }
    case 'SET_FILTER_SEVERITY':
      return { ...state, filterSeverity: action.value }
    case 'SET_FILTER_STATUS':
      return { ...state, filterStatus: action.value }
    case 'SELECT_REPORT':
      return { ...state, selectedReport: action.report, selectedWard: null }
    case 'SELECT_WARD':
      return { ...state, selectedWard: action.ward, selectedReport: null }
    case 'SELECT_LEADER':
      return { ...state, selectedLeader: action.leader }
    case 'SELECT_OFFICIAL':
      return { ...state, selectedOfficial: action.official }
    case 'SHOW_REPORT_FORM':
      return { ...state, showReportForm: action.show }
    case 'SHOW_CLEANED_FORM':
      return { ...state, showCleanedForm: action.show }
    case 'TOGGLE_STATS':
      return { ...state, showStats: !state.showStats }
    case 'SET_USER_LOCATION':
      return { ...state, userLocation: action.location }
    case 'DISMISS_SPLASH':
      return { ...state, splashDismissed: true }
    case 'SET_LANG':
      return { ...state, lang: action.lang }
    case 'SET_MOBILE':
      return { ...state, isMobile: action.mobile }
    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  // Load data on mount
  useEffect(() => {
    async function init() {
      try {
        const { boundaries, governance } = await loadData()
        dispatch({ type: 'SET_DATA', boundaries, governance })
        let reports = await getReports()

        if (reports.length === 0) {
          reports = MOCK_REPORTS.map(r => {
            const jur = detectJurisdiction(r.lat, r.lng)
            return jur ? { ...r, assigned_area: jur.area, area_code: jur.code } : r
          })
        }

        dispatch({ type: 'SET_REPORTS', reports })
      } catch (e) {
        console.error('Failed to load data:', e)
        dispatch({ type: 'SET_REPORTS', reports: [] })
      }
    }
    init()

    // Real-time listener
    let channel = null
    if (supabase) {
      channel = supabase
        .channel('public:reports')
        .on('postgres_changes', { event: '*', table: 'reports', schema: 'public' }, (payload) => {
          if (payload.eventType === 'INSERT') dispatch({ type: 'ADD_REPORT', report: payload.new })
          if (payload.eventType === 'UPDATE') dispatch({ type: 'UPDATE_REPORT', report: payload.new })
          if (payload.eventType === 'DELETE') {
            getReports().then(reports => dispatch({ type: 'SET_REPORTS', reports }))
          }
        })
        .subscribe()
    }

    // Listen for resize
    const handleResize = () => {
      const mobile = detectMobile()
      if (mobile !== state.isMobile) {
        dispatch({ type: 'SET_MOBILE', mobile })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const actions = useMemo(() => ({
    setView: (view) => dispatch({ type: 'SET_VIEW', view }),
    setSeverityFilter: (value) => dispatch({ type: 'SET_FILTER_SEVERITY', value }),
    setStatusFilter: (value) => dispatch({ type: 'SET_FILTER_STATUS', value }),
    setLang: (lang) => {
      localStorage.setItem('gm_lang', lang)
      dispatch({ type: 'SET_LANG', lang })
    },
    selectReport: (report) => dispatch({ type: 'SELECT_REPORT', report }),
    selectWard: (ward) => dispatch({ type: 'SELECT_WARD', ward }),
    selectLeader: (leader) => dispatch({ type: 'SELECT_LEADER', leader }),
    selectOfficial: (official) => dispatch({ type: 'SELECT_OFFICIAL', official }),
    showReportForm: (show) => dispatch({ type: 'SHOW_REPORT_FORM', show }),
    showCleanedForm: (show) => dispatch({ type: 'SHOW_CLEANED_FORM', show }),
    toggleStats: () => dispatch({ type: 'TOGGLE_STATS' }),
    setUserLocation: (location) => dispatch({ type: 'SET_USER_LOCATION', location }),
    dismissSplash: () => dispatch({ type: 'DISMISS_SPLASH' }),

    submitReport: async (reportData, imageFile) => {
      const { url } = await uploadImage(imageFile)

      // ── Cloud Vision: reject blank/irrelevant photos ──────────────────────
      await validateGarbagePhoto(imageFile)
      // ─────────────────────────────────────────────────────────────────────

      const jurisdiction = detectJurisdiction(reportData.lat, reportData.lng)
      if (!jurisdiction) throw new Error('This location is outside the GRMC operational boundary.')

      const report = {
        lat: reportData.lat, lng: reportData.lng,
        landmark: reportData.landmark,
        severity: reportData.severity,
        waste_type: reportData.waste_type,
        image_url: url,
        assigned_area: jurisdiction.area,
        area_code: jurisdiction.code || '',
        status: 'unresolved',
        seen_count: 0,
      }

      const isDuplicate = stateRef.current.reports.some(r => {
        if (r.status === 'resolved') return false
        const dist = Math.sqrt(Math.pow(r.lat - reportData.lat, 2) + Math.pow(r.lng - reportData.lng, 2))
        return dist < 0.00015
      })
      if (isDuplicate) throw new Error("An active report already exists at this location. Please 'Seen' that report instead.")

      const saved = await apiSubmit(report)
      dispatch({ type: 'ADD_REPORT', report: saved })
      dispatch({ type: 'SHOW_REPORT_FORM', show: false })
      return saved
    },

    incrementSeen: async (reportId) => {
      try {
        const updated = await apiSeen(reportId)
        if (updated) dispatch({ type: 'UPDATE_REPORT', report: updated })
      } catch (e) {
        console.error('Failed to increment seen:', e)
      }
    },

    markResolved: async (reportId, imageFile) => {
      const { url } = await uploadImage(imageFile)
      const updated = await apiResolve(reportId, url)
      dispatch({ type: 'UPDATE_REPORT', report: updated })
      dispatch({ type: 'SHOW_CLEANED_FORM', show: false })
      dispatch({ type: 'SELECT_REPORT', report: updated })
    },
  }), [dispatch])

  // Filtered reports
  const filteredReports = state.reports.filter(r => {
    if (state.filterSeverity !== 'all' && r.severity !== state.filterSeverity) return false
    if (state.filterStatus !== 'all' && r.status !== state.filterStatus) return false
    return true
  })

  return (
    <AppContext.Provider value={{ state, actions, filteredReports }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}