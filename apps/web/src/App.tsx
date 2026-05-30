import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LibraryPage } from '@/pages/LibraryPage'
import { PlaylistPage } from '@/pages/PlaylistPage'
import { GraphPage } from '@/pages/GraphPage'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="*" element={<LibraryPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
