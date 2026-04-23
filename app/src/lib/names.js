/**
 * GodavariMatters — Name Normalization Engine
 * 
 * Converts ugly DB-format names (VENKATARAMAYYANAGAR) into
 * proper display names (Venkata Ramayya Nagar) using the
 * sachivalayam_officials.json as the canonical source.
 */

// Canonical display names from sachivalayam_officials.json
// Key: uppercase-no-spaces (matching DB/GeoJSON format)
// Value: Proper human-readable format
const DISPLAY_NAME_MAP = {
  // Urban Sachivalayams (96)
  'VEERABHADRANAGAR': 'Veerabhadra Nagar',
  'ALLBANKCOLONY': 'All Bank Colony',
  'INDIRASATYANAGAR': 'Indira Satya Nagar',
  'GANDHIPURAM-02': 'Gandhipuram - 02',
  'MUNICIPALCOLONY': 'Municipal Colony',
  'RAMADASPETA': 'Ramadas Peta',
  'VIDYUTHCOLONY': 'Vidyuth Colony',
  'P&TCOLONY': 'P & T Colony',
  'ANNAPURNAMMAPETA': 'Annapurnamma Peta',
  'INNISPETA-02': 'Innispeta - 02',
  'JANDAPANJAROAD': 'Janda Panja Road',
  'HARIPURAM': 'Haripuram',
  'ALCOTGARDENS-01': 'Alcot Gardens - 01',
  'SUBHASHNAGAR': 'Subhash Nagar',
  'GORAKSHANAPETA': 'Gorakshana Peta',
  'ALCOTGARDENS-02': 'Alcot Gardens - 02',
  'INNISPETA-03': 'Innispeta - 03',
  'VEERABADRAPURAM': 'Veerabadra Puram',
  'JAYAKRISHNAPURAM': 'Jayakrishna Puram',
  'NEWVLPURAM': 'New VL Puram',
  'GOPALNAGARPUNTHA': 'Gopal Nagar Puntha',
  'SESHAYYAMETTA': 'Seshayya Metta',
  'SESHAYYAMETTA-02': 'Seshayya Metta - 02',
  'DANAVAIPETA': 'Danavaipeta',
  'PRAKASAMNAGAR-02': 'Prakasam Nagar - 02',
  'JAMPETA-02': 'Jampeta - 02',
  'BESTHAVEDHI': 'Bestha Vedhi',
  'KVRSWAMYROAD': 'KVR Swamy Road',
  'ADEMMADIBBA': 'Ademma Dibba',
  'MALLINANAGAR': 'Mallina Nagar',
  'SYAMALANAGAR': 'Syamala Nagar',
  'LAKSHMIVARAPUPETA': 'Lakshmivara Pupeta',
  'SIDDARTHANAGAR': 'Siddartha Nagar',
  'SAMBASIVARAOPETA': 'Sambasiva Rao Peta',
  'KOKABASKARAMMANAGAR': 'Kokabaskaramma Nagar',
  'SWARAJNAGAR': 'Swaraj Nagar',
  'BATTINANAGAR': 'Battina Nagar',
  'THOTARAMULUNAGAR': 'Thotaramulu Nagar',
  'MROOFFICEROAD': 'MRO Office Road',
  'SIGIDEELAPETA': 'Sigideela Peta',
  'NARAYANAPURAM': 'Narayana Puram',
  'CHANDACHOULTRYSTREET': 'Chanda Choultry Street',
  'SEETHAMPETA': 'Seethampeta',
  'GANDHIPURAM-01': 'Gandhipuram - 01',
  'VENKATARAMAYYANAGAR': 'Venkata Ramayya Nagar',
  'VANKAYALAVARISTREET': 'Vankayalavari Street',
  'MEDARAPETA': 'Medara Peta',
  'JAMPETA-01': 'Jampeta - 01',
  'BHASKARNAGAR': 'Bhaskar Nagar',
  'SARANGADHARAMETTA': 'Sarangadhara Metta',
  'TADITHOTA': 'Tadithota',
  'SIMHACHALNAGAR': 'Simhachal Nagar',
  'TUMMALAVA': 'Tummalava',
  'BURMACOLONY': 'Burma Colony',
  'SUVISESHAPURAM': 'Suviseshapuram',
  'AMBEDKARNAGAR-02': 'Ambedkar Nagar - 02',
  'SUBBARAONAGAR-02': 'Subbarao Nagar - 02',
  'GADALAMMANAGAR': 'Gadalamma Nagar',
  'BRODIPETA': 'Brodipeta',
  'VLPURAM-02': 'VL Puram - 02',
  'KOTILINGALAPETA': 'Kotilingala Peta',
  'AMBEDKARNAGAR-01': 'Ambedkar Nagar - 01',
  'RVNAGAR': 'RV Nagar',
  'LALITHANAGAR-02': 'Lalitha Nagar - 02',
  'PRAKASAMNAGAR-01': 'Prakasam Nagar - 01',
  'KAMBALAPETA': 'Kambala Peta',
  'INDIRANAGAR': 'Indira Nagar',
  'VENKATESWARANAGAR': 'Venkateswara Nagar',
  'MALLIKARJUNANAGAR': 'Mallikarjuna Nagar',
  'RAJENDRANAGAR': 'Rajendra Nagar',
  'BOGGULADIBBA': 'Boggula Dibba',
  'INNISPETA-01': 'Innispeta - 01',
  'NEHRUNAGAR': 'Nehru Nagar',
  'KOTHAPETA': 'Kothapeta',
  'KRISHNANAGAR': 'Krishna Nagar',
  'SAMBHUNAGAR': 'Sambhu Nagar',
  'KONDAVARIVEDHI': 'Kondavari Vedhi',
  'SANJEEVAYYANAGAR': 'Sanjeevayya Nagar',
  'MANGALAVARIPETA': 'Mangalavari Peta',
  'GADIREDDYNAGAR': 'Gadireddy Nagar',
  'TNAGAR': 'T Nagar',
  'MULAGOYYA': 'Mulagoyya',
  'SUBBARAONAGAR-01': 'Subbarao Nagar - 01',
  'LALITHANAGAR-01': 'Lalitha Nagar - 01',
  'AVAVAMBAYCOLONY': 'Avavambay Colony',
  'ARYAPURAM': 'Aryapuram',
  'VLPURAM-01': 'VL Puram - 01',
  'BRUHUNNALAPETA': 'Bruhunnala Peta',
  'ADARSHNAGAR': 'Adarsh Nagar',
  'LINGAMPETA': 'Lingampeta',
  'SRIRAMNAGAR': 'Sri Ram Nagar',
  'KESARICLUBAREA': 'Kesari Club Area',
  'KNRPETA': 'KNR Peta',
  'ADDEPALLICOLONY': 'Addepalli Colony',
  'ANANDANAGAR': 'Ananda Nagar',
  'SUBBARAOPETA': 'Subbarao Peta',

  // Rural Villages
  'TORREDU': 'Torredu',
  'KATHERU': 'Katheru',
  'DOWLESWARAM': 'Dowleswaram',
  'HUKUMPETA': 'Hukumpeta',
  'BOMMURU': 'Bommuru',
  'RAJAHMUNDRYPART': 'Rajahmundry Part',
  'KOLAMURU': 'Kolamuru',
  'RAJAVOLU': 'Rajavolu',
  'MORAMPUDI(RURAL)': 'Morampudi (Rural)',
}

/**
 * Normalize a raw area name to its key format (uppercase, no spaces)
 * Used for matching/comparison across data sources
 */
export function normalizeKey(name) {
  if (!name) return ''
  return name.toUpperCase().replace(/\s+/g, '')
}

/**
 * Convert an area name to its proper display format
 * "VENKATARAMAYYANAGAR" → "Venkata Ramayya Nagar"
 * Falls back to title-case conversion if not in map
 */
export function displayName(name) {
  if (!name) return 'Unknown Area'
  
  // First try direct lookup
  const key = normalizeKey(name)
  if (DISPLAY_NAME_MAP[key]) return DISPLAY_NAME_MAP[key]
  
  // Handle SESHAYYAMETTA variants
  if (key.includes('SESHAYYAMETTA')) return DISPLAY_NAME_MAP['SESHAYYAMETTA'] || 'Seshayya Metta'

  // Fallback: smart title-case with common word boundary detection
  return smartTitleCase(name)
}

/**
 * Smart title case that handles Indian locality naming patterns.
 * "VENKATARAMAYYANAGAR" → "Venkataramayyanagar" (no lookup match = as-is title case)
 * "Morampudi (Rural)" → "Morampudi (Rural)" (already formatted)
 */
function smartTitleCase(name) {
  // If already mixed case, return as-is
  if (name !== name.toUpperCase() && name !== name.toLowerCase()) return name
  
  return name
    .split(/(\s+|-|(?<=\d)(?=[A-Z])|(?<=[a-z])(?=[A-Z]))/)
    .map(word => {
      if (!word || word.match(/^\s+$/)) return word
      if (word === '-') return ' - '
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join('')
}

/**
 * Get a mapping of normalized keys to display names,
 * useful for batch processing.
 */
export function getDisplayNameMap() {
  return { ...DISPLAY_NAME_MAP }
}
