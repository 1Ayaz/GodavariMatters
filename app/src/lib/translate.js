/**
 * GodavariMatters — Translation Service
 * 
 * Uses Google Cloud Translation API v2 to translate
 * user-generated content (landmarks, addresses) to Telugu.
 * 
 * Static UI strings are handled by i18n.js directly.
 * This module handles dynamic content only.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_KEY || ''
const API_URL = 'https://translation.googleapis.com/language/translate/v2'

// In-memory cache to avoid redundant API calls
const translationCache = new Map()

// Persistent cache in localStorage
const CACHE_KEY = 'gm_translations'
function loadLocalCache() {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      Object.entries(parsed).forEach(([key, value]) => {
        translationCache.set(key, value)
      })
    }
  } catch (e) { /* ignore */ }
}
loadLocalCache()

function saveLocalCache() {
  try {
    const obj = Object.fromEntries(translationCache)
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj))
  } catch (e) { /* ignore */ }
}

/**
 * Translate a single string from English to Telugu.
 * Returns the original text if translation fails or API key is missing.
 * 
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (default: 'te' for Telugu)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang = 'te') {
  if (!text || !text.trim()) return text
  if (!API_KEY) return text // No API key configured
  if (targetLang === 'en') return text // Already English

  // Check cache
  const cacheKey = `${targetLang}:${text}`
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text'
      })
    })

    if (!response.ok) {
      console.warn('Translation API error:', response.status)
      return text
    }

    const data = await response.json()
    const translated = data?.data?.translations?.[0]?.translatedText || text

    // Cache result
    translationCache.set(cacheKey, translated)
    saveLocalCache()

    return translated
  } catch (e) {
    console.warn('Translation failed:', e)
    return text
  }
}

/**
 * Batch translate multiple strings.
 * Google API supports up to 128 strings per request.
 * 
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<string[]>} Array of translated texts
 */
export async function translateBatch(texts, targetLang = 'te') {
  if (!texts || texts.length === 0) return texts
  if (!API_KEY || targetLang === 'en') return texts

  // Separate cached and uncached
  const results = new Array(texts.length)
  const uncachedIndices = []
  const uncachedTexts = []

  texts.forEach((text, i) => {
    const cacheKey = `${targetLang}:${text}`
    if (translationCache.has(cacheKey)) {
      results[i] = translationCache.get(cacheKey)
    } else {
      uncachedIndices.push(i)
      uncachedTexts.push(text)
    }
  })

  if (uncachedTexts.length === 0) return results

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: uncachedTexts,
        source: 'en',
        target: targetLang,
        format: 'text'
      })
    })

    if (!response.ok) {
      // Fill remaining with originals
      uncachedIndices.forEach((idx, j) => { results[idx] = texts[idx] })
      return results
    }

    const data = await response.json()
    const translations = data?.data?.translations || []

    uncachedIndices.forEach((idx, j) => {
      const translated = translations[j]?.translatedText || texts[idx]
      results[idx] = translated
      translationCache.set(`${targetLang}:${texts[idx]}`, translated)
    })

    saveLocalCache()
    return results
  } catch (e) {
    console.warn('Batch translation failed:', e)
    uncachedIndices.forEach((idx) => { results[idx] = texts[idx] })
    return results
  }
}

/**
 * React hook helper — translates a string and returns it.
 * Returns original text immediately, then updates once translation arrives.
 */
export function getCachedTranslation(text, targetLang = 'te') {
  if (!text || targetLang === 'en') return text
  const cacheKey = `${targetLang}:${text}`
  return translationCache.get(cacheKey) || text
}

/**
 * Check if translation API is available
 */
export function isTranslationAvailable() {
  return !!API_KEY
}
