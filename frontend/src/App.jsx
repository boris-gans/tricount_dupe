import { useEffect, useState } from 'react'
import { getMessage, createUser, createGroup } from './services/api'

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [msg, setMsg] = useState("")

  const [userId, setUserId] = useState("")
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [message, setMessage] = useState("")

  const [groupName, setGroupName] = useState("")
  const [groupPw, setGroupPw] = useState("")
  const [emoji, setEmoji] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      getMessage().then(data => setMsg(data.message));
    }, 5000); //refresh msg every 5 seconds

    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const user = createUser({ name, email, pw });
      const userId = localStorage.getItem("userId");
      setMessage(`User created: ${user.name} (id: ${userId})`);
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleGroupSubmit(e) {
    e.preventDefault();
    try {
      const group = createGroup({ groupName, groupPw, userId, emoji });
      setMessage(`Group created: ${group.name} (id: ${userId})`);
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <>
      <h1>Tricount!</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count} and msg is {msg}
        </button>
        <p>
          {msg}
        </p>
      </div>
      <div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <br />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <br />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
          />
          <br />
          <button type="submit">Create User</button>
        </form>
        <p>{message}</p>
      </div>
      <div>
        <form onSubmit={handleGroupSubmit}>
          <input
            type="text"
            placeholder="Group Name"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
          <br />
          <input
            type="password"
            placeholder="Group PW"
            value={groupPw}
            onChange={e => setGroupPw(e.target.value)}
          />
          <br />
          <input
            type="text"
            placeholder="Emoji"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
          />
          <br />
          <button type="submit">Create Group</button>
        </form>
        <p>{message}</p>
      </div>
    </>
  )
}

export default App
