/**
 * GodavariMatters — TranslatedText Component
 * 
 * Inline component that automatically translates its text
 * content when the user switches to Telugu. Shows original
 * text immediately, then swaps once translation arrives.
 */

import { useState, useEffect, memo } from 'react'
import { translateText, getCachedTranslation, isTranslationAvailable } from './translate'
import { useApp } from './store'

/**
 * Renders translated text inline. Use this for individual items
 * in lists where useTranslate hook can't be used (varying count).
 * 
 * @param {Object} props
 * @param {string} props.text - Text to translate
 * @param {string} [props.as] - HTML element to render as (default: 'span')
 * @param {string} [props.className] - CSS class
 */
const TranslatedText = memo(function TranslatedText({ text, as: Tag = 'span', className, style }) {
  const { state } = useApp()
  const lang = state.lang || 'en'
  const [display, setDisplay] = useState(getCachedTranslation(text, lang))

  useEffect(() => {
    if (!text || lang === 'en' || !isTranslationAvailable()) {
      setDisplay(text)
      return
    }

    const cached = getCachedTranslation(text, lang)
    if (cached !== text) {
      setDisplay(cached)
      return
    }

    let cancelled = false
    translateText(text, lang).then(result => {
      if (!cancelled) setDisplay(result)
    })
    return () => { cancelled = true }
  }, [text, lang])

  return <Tag className={className} style={style}>{display}</Tag>
})

export default TranslatedText
