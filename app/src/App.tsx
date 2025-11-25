import { useEffect, useState } from 'react'
import './App.css'
import GovernancePage from './pages/Governance'
import NewProposal from './pages/NewProposal'

function App() {
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route === '#/new') {
    return <NewProposal />
  }

  return <GovernancePage />
}

export default App
