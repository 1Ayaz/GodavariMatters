export function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export const POLITICIAN_PHOTOS = {
  'Adireddy Srinivas': 'https://meeadireddy.com/wp-content/uploads/2024/06/adireddy-vasu-profile.jpg',
  'Gorantla Butchaiah Chowdary': 'https://myneta.info/andhra_pradesh2024/candidate_photos/37.jpg',
  'Daggubati Purandheshwari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Daggubati_Purandeswari.jpg/220px-Daggubati_Purandeswari.jpg',
}
