import { useEffect, useState } from 'react'
import { getMessage } from './services/api'

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      getMessage().then(data => setMsg(data.message));
    }, 5000); //refresh msg every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Tricount!</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count} and msg is {msg}
        </button>
        <p>
          {msg}
        </p>
      </div>
    </>
  )
}

export default App
