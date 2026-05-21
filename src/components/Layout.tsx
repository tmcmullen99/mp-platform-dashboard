import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatPanel from './ChatPanel'

export default function Layout() {
  return (
    <div className="min-h-screen bg-cream flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <ChatPanel />
    </div>
  )
}
