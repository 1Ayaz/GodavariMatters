/**
 * GodavariMatters — useTranslate Hook
 * 
 * React hook that translates dynamic content (landmarks, addresses)
 * when the user switches to Telugu. Uses the translation service
 * with caching for instant results on repeated views.
 */

import { useState, useEffect, useRef } from 'react'
import { translateText, translateBatch, getCachedTranslation, isTranslationAvailable } from './translate'
import { useApp } from './store'

/**
 * Translate a single string when language is Telugu
 * @param {string} text - Text to translate
 * @returns {string} Translated text (or original while loading)
 */
export function useTranslate(text) {
  const { state } = useApp()
  const lang = state.lang || 'en'
  const [translated, setTranslated] = useState(getCachedTranslation(text, lang))

  useEffect(() => {
    if (!text || lang === 'en' || !isTranslationAvailable()) {
      setTranslated(text)
      return
    }

    // Check cache first
    const cached = getCachedTranslation(text, lang)
    if (cached !== text) {
      setTranslated(cached)
      return
    }

    // Translate async
    let cancelled = false
    translateText(text, lang).then(result => {
      if (!cancelled) setTranslated(result)
    })
    return () => { cancelled = true }
  }, [text, lang])

  return translated
}

/**
 * Translate an array of strings when language is Telugu
 * Uses batch API for efficiency
 * @param {string[]} texts - Array of texts
 * @returns {string[]} Array of translated texts
 */
export function useTranslateBatch(texts) {
  const { state } = useApp()
  const lang = state.lang || 'en'
  const [translated, setTranslated] = useState(
    texts?.map(t => getCachedTranslation(t, lang)) || []
  )
  const prevKey = useRef('')

  useEffect(() => {
    if (!texts || texts.length === 0) {
      setTranslated([])
      return
    }

    const key = `${lang}:${texts.join('|')}`
    if (key === prevKey.current) return
    prevKey.current = key

    if (lang === 'en' || !isTranslationAvailable()) {
      setTranslated(texts)
      return
    }

    // Check if all are cached
    const cached = texts.map(t => getCachedTranslation(t, lang))
    const allCached = cached.every((c, i) => c !== texts[i])
    if (allCached) {
      setTranslated(cached)
      return
    }

    // Batch translate
    let cancelled = false
    translateBatch(texts, lang).then(results => {
      if (!cancelled) setTranslated(results)
    })
    return () => { cancelled = true }
  }, [texts, lang])

  return translated
}
