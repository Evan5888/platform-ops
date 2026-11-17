import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Analysis } from './pages/Analysis'
import { Catalog } from './pages/Catalog'
import { DataCenter } from './pages/DataCenter'
import { GamesPage, PaymentsPage, UsersPage } from './pages/Topics'
import { Movement } from './pages/Movement'
import { Notes } from './pages/Notes'
import { Overview } from './pages/Overview'
import { AppShell } from './shell/AppShell'
import { FiltersProvider } from './state/Filters'

export function App() {
  return (
    <FiltersProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="movement" element={<Movement />} />
            <Route path="analysis/:metric" element={<Analysis />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="data" element={<DataCenter />} />
            <Route path="metrics" element={<Catalog />} />
            <Route path="notes" element={<Notes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FiltersProvider>
  )
}
