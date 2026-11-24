import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProgressProvider } from './context/ProgressProvider'
import { ToastProvider } from './context/ToastProvider'
import { AppShell } from './components/layout/AppShell'

const Home = lazy(() => import('./pages/Home'))
const Practice = lazy(() => import('./pages/Practice'))
const Challenge = lazy(() => import('./pages/Challenge'))
const Study = lazy(() => import('./pages/Study'))
const Words = lazy(() => import('./pages/Words'))
const Tricky = lazy(() => import('./pages/Tricky'))
const Progress = lazy(() => import('./pages/Progress'))
const Settings = lazy(() => import('./pages/Settings'))

export default function App() {
  return (
    <ProgressProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="practice" element={<Practice />} />
              <Route path="challenge" element={<Challenge />} />
              <Route path="study" element={<Study />} />
              <Route path="words" element={<Words />} />
              <Route path="tricky" element={<Tricky />} />
              <Route path="progress" element={<Progress />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ProgressProvider>
  )
}
