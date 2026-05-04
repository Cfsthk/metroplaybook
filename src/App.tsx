import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { EditorPage } from './pages/EditorPage'
import { LibraryPage } from './pages/LibraryPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/playbook/:playbookId/play/:playId" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
