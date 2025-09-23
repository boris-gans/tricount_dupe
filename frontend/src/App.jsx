import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import './App.css'
import { useAuth } from './AuthContext.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  function handleLogout() {
    logout()
    navigate('/')
  }
  return (
    <nav className="nav">
      <Link to="/" className="brand">tricount-dupe</Link>
      <div className="spacer" />
      {isAuthenticated ? (
        <>
          <Link to="/account">Account</Link>
          <button className="btn" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup" className="btn">Sign up</Link>
        </>
      )}
    </nav>
  )
}

function Landing() {
  return (
    <div className="container">
      <h1>Split expenses the simple way</h1>
      <p>Track, share and settle group expenses with ease.</p>
      <div className="actions">
        <Link to="/signup" className="btn primary">Get started</Link>
        <Link to="/login" className="btn">Log in</Link>
      </div>
    </div>
  )
}

function Login() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  async function onSubmit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = form.get('email')
    const pw = form.get('pw')
    try {
      await login({ email, pw })
      navigate('/account')
    } catch (err) {
      alert(err.message || 'Login failed')
    }
  }
  return (
    <div className="auth-card">
      <h2>Log in</h2>
      <form onSubmit={onSubmit}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="pw" type="password" placeholder="Password" required />
        <button className="btn primary" disabled={isLoading} type="submit">{isLoading ? 'Loading…' : 'Log in'}</button>
      </form>
      <p className="muted">No account? <Link to="/signup">Sign up</Link></p>
    </div>
  )
}

function Signup() {
  const { signup, isLoading } = useAuth()
  const navigate = useNavigate()
  async function onSubmit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = form.get('name')
    const email = form.get('email')
    const pw = form.get('pw')
    try {
      await signup({ name, email, pw })
      navigate('/account')
    } catch (err) {
      alert(err.message || 'Signup failed')
    }
  }
  return (
    <div className="auth-card">
      <h2>Create your account</h2>
      <form onSubmit={onSubmit}>
        <input name="name" type="text" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="pw" type="password" placeholder="Password" required />
        <button className="btn primary" disabled={isLoading} type="submit">{isLoading ? 'Creating…' : 'Sign up'}</button>
      </form>
      <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  )
}

function Account() {
  const userId = localStorage.getItem('userId')
  // Later: fetch groups for user using token.
  return (
    <div className="container">
      <h1>Your groups</h1>
      <p className="muted">User ID: {userId}</p>
      <div className="card-row">
        <button className="btn primary">Create new group</button>
        <button className="btn">Join existing group</button>
      </div>
      <div className="empty">No groups yet.</div>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
