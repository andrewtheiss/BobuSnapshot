import { useEffect, useState } from 'react'
import './App.css'
import GovernancePage from './pages/Governance'
import NewProposal from './pages/NewProposal'
import ProposalDetailsPage from './pages/ProposalDetails'

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
  if (/^#\/proposal\/0x[0-9a-fA-F]{40}$/.test(route)) {
    return <ProposalDetailsPage />
  }

  return <GovernancePage />
}

export default App
