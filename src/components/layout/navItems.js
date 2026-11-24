import { BarChart3, BookA, Crown, GraduationCap, LayoutDashboard, PencilLine, Settings, Target } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Home', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/practice', label: 'Practice', short: 'Practice', icon: GraduationCap },
  { to: '/challenge', label: 'Bee Challenge', short: 'Challenge', icon: Crown },
  { to: '/study', label: 'Study', short: 'Study', icon: PencilLine },
  { to: '/words', label: 'Word List', short: 'Words', icon: BookA },
  { to: '/tricky', label: 'Tricky Words', short: 'Tricky', icon: Target, badge: 'tricky' },
  { to: '/progress', label: 'Progress', short: 'Progress', icon: BarChart3 },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
]

// Shown in the mobile bottom bar; everything else lives behind "More".
export const MOBILE_PRIMARY = ['/', '/practice', '/challenge', '/words']
