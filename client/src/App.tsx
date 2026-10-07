import './App.css'
import { Navbar } from './components/Navbar'
import Home from './Pages/Home'

const App = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Home />
      </main>
    </div>
  )
}

export default App

