import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { supabase, getReports, submitReport as apiSubmit, incrementSeen as apiSeen, markResolved as apiResolve, uploadImage } from './supabase'
import { loadData, detectJurisdiction } from './jurisdiction'

const AppContext = createContext()

function detectMobile() {
  if (typeof window === 'undefined') return true
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth <= 768
}

const initialState = {
  reports: [],
  boundaries: null,
  governance: null,
  sachivalayamOfficials: null,
  loading: true,
  isMobile: detectMobile(),
  splashDismissed: false,
  activeView: 'map', // 'map' | 'list'
  filterSeverity: 'all',
  filterStatus: 'all',
  selectedReport: null,
  selectedWard: null,
  selectedLeader: null,
  showReportForm: false,
  showCleanedForm: false,
  showStats: false,
  userLocation: null,
  lang: typeof window !== 'undefined' ? (localStorage.getItem('gm_lang') || 'en') : 'en',
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, boundaries: action.boundaries, governance: action.governance, sachivalayamOfficials: action.sachivalayamOfficials }
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

  // Load data on mount
  useEffect(() => {
    async function init() {
      try {
        const { boundaries, governance } = await loadData()
        // Load sachivalayam officials
        let sachivalayamOfficials = null
        try {
          const offRes = await fetch('/sachivalayam_officials.json')
          const offData = await offRes.json()
          sachivalayamOfficials = offData.sachivalayams || []
        } catch (e) {
          console.warn('Could not load sachivalayam officials:', e)
        }
        dispatch({ type: 'SET_DATA', boundaries, governance, sachivalayamOfficials })
        let reports = await getReports()
        
        // Seed mock data if no reports exist — enables testing
        if (reports.length === 0) {
          console.info('GodavariMatters: No reports found. Seeding mock data for testing...')
          const mockReports = [
            {
              id: 'mock-001',
              lat: 17.0052, lng: 81.7780,
              landmark: 'Near Innespeta Bus Stand',
              severity: 'severe',
              waste_type: 'Street Garbage',
              image_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&h=300&fit=crop',
              assigned_area: 'Prakasam Nagar - 01',
              area_type: 'urban',
              area_code: 'PN01',
              status: 'unresolved',
              seen_count: 12,
              created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
            },
            {
              id: 'mock-002',
              lat: 17.0025, lng: 81.7820,
              landmark: 'Opposite RR Hospital, Danavaipeta',
              severity: 'critical',
              waste_type: 'Medical Waste',
              image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=400&h=300&fit=crop',
              assigned_area: 'Danavaipeta - 02',
              area_type: 'urban',
              area_code: 'DV02',
              status: 'unresolved',
              seen_count: 28,
              created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
            },
            {
              id: 'mock-003',
              lat: 17.0090, lng: 81.7740,
              landmark: 'Kambalacheruvu Main Road',
              severity: 'moderate',
              waste_type: 'Mixed Waste',
              image_url: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=400&h=300&fit=crop',
              assigned_area: 'Seshayyametta - 03',
              area_type: 'urban',
              area_code: 'SM03',
              status: 'unresolved',
              seen_count: 5,
              created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
            },
            {
              id: 'mock-004',
              lat: 17.0015, lng: 81.7700,
              landmark: 'TTD Kalyanamandapam junction',
              severity: 'minor',
              waste_type: 'Construction Debris',
              image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
              assigned_area: 'Prakasam Nagar - 01',
              area_type: 'urban',
              area_code: 'PN01',
              status: 'resolved',
              seen_count: 3,
              created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
              cleaned_image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop',
              resolved_at: new Date(Date.now() - 7 * 86400000).toISOString(),
            },
            {
              id: 'mock-005',
              lat: 16.9980, lng: 81.7850,
              landmark: 'Behind Pushkara Ghat, Godavari bank',
              severity: 'critical',
              waste_type: 'River / Ghat',
              image_url: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400&h=300&fit=crop',
              assigned_area: 'Danavaipeta - 02',
              area_type: 'urban',
              area_code: 'DV02',
              status: 'unresolved',
              seen_count: 45,
              created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
            {
              id: 'mock-006',
              lat: 17.0110, lng: 81.7690,
              landmark: 'Rajahmundry Railway Station (Platform 1)',
              severity: 'severe',
              waste_type: 'Street Garbage',
              image_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop',
              assigned_area: 'Seshayyametta - 03',
              area_type: 'urban',
              area_code: 'SM03',
              status: 'unresolved',
              seen_count: 18,
              created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
            },
            {
              id: 'mock-007',
              lat: 17.0070, lng: 81.7810,
              landmark: 'Arthamuru Road, near Ambedkar Statue',
              severity: 'moderate',
              waste_type: 'Clogged Drain',
              image_url: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=400&h=300&fit=crop',
              assigned_area: 'Prakasam Nagar - 01',
              area_type: 'urban',
              area_code: 'PN01',
              status: 'unresolved',
              seen_count: 7,
              created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
            },
            {
              id: 'mock-008',
              lat: 17.0140, lng: 81.7750,
              landmark: 'Morampudi Ring Road, empty lot',
              severity: 'minor',
              waste_type: 'Construction Debris',
              image_url: 'https://images.unsplash.com/photo-1571727153934-b9e0059b7ab2?w=400&h=300&fit=crop',
              assigned_area: 'Morampudi - 04',
              area_type: 'urban',
              area_code: 'MP04',
              status: 'unresolved',
              seen_count: 2,
              created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
            },
          ]
          reports = mockReports
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
            // Re-fetch all to be safe on delete, or implement DELETE action
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

  const actions = {
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
    showReportForm: (show) => dispatch({ type: 'SHOW_REPORT_FORM', show }),
    showCleanedForm: (show) => dispatch({ type: 'SHOW_CLEANED_FORM', show }),
    toggleStats: () => dispatch({ type: 'TOGGLE_STATS' }),
    setUserLocation: (location) => dispatch({ type: 'SET_USER_LOCATION', location }),
    dismissSplash: () => dispatch({ type: 'DISMISS_SPLASH' }),

    submitReport: async (reportData, imageFile) => {
      // This will throw if rate limited, duplicate GPS, invalid file, etc.
      const { url } = await uploadImage(imageFile)
      const jurisdiction = detectJurisdiction(reportData.lat, reportData.lng)

      if (!jurisdiction) {
        throw new Error('This location is outside our operational boundary. Please report issues only within Rajamahendravaram (Urban & Rural).')
      }
      
      const report = {
        lat: reportData.lat,
        lng: reportData.lng,
        landmark: reportData.landmark,
        severity: reportData.severity,
        waste_type: reportData.waste_type,
        image_url: url,
        assigned_area: jurisdiction?.area || 'Unknown',
        area_type: jurisdiction?.type || 'unknown',
        area_code: jurisdiction?.code || '',
        status: 'unresolved',
        seen_count: 0,
      }

      // Prevent duplicates by checking proximity (within ~15 meters)
      const isDuplicate = state.reports.some(r => {
        const dist = Math.sqrt(Math.pow(r.lat - reportData.lat, 2) + Math.pow(r.lng - reportData.lng, 2))
        return dist < 0.00015 // roughly 15-20 meters
      })
      if (isDuplicate) throw new Error("A similar report already exists at this location. Please 'Seen' that report instead.")

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
        console.error('Failed to increment seen count:', e)
      }
    },

    markResolved: async (reportId, imageFile) => {
      const { url } = await uploadImage(imageFile)
      const updated = await apiResolve(reportId, url)
      dispatch({ type: 'UPDATE_REPORT', report: updated })
      dispatch({ type: 'SHOW_CLEANED_FORM', show: false })
      dispatch({ type: 'SELECT_REPORT', report: updated })
    },
  }

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
