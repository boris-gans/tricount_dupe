import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import { useAuth } from './AuthContext.jsx'
import { createGroup } from './services/api.js'

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

// Emoji picker component
function EmojiPicker({ selectedEmoji, onEmojiSelect }) {
  const emojis = [
    { name: 'Party', code: '🎉' },
    { name: 'Money', code: '💰' },
    { name: 'Food', code: '🍕' },
    { name: 'Travel', code: '✈️' },
    { name: 'Home', code: '🏠' },
    { name: 'Car', code: '🚗' },
    { name: 'Gift', code: '🎁' },
    { name: 'Heart', code: '❤️' },
    { name: 'Star', code: '⭐' },
    { name: 'Fire', code: '🔥' },
    { name: 'Lightning', code: '⚡' },
    { name: 'Rocket', code: '🚀' }
  ]

  return (
    <div className="emoji-picker">
      <div className="emoji-grid">
        {emojis.map((emoji) => (
          <button
            key={emoji.code}
            type="button"
            className={`emoji-option ${selectedEmoji === emoji.code ? 'selected' : ''}`}
            onClick={() => onEmojiSelect(emoji.code)}
            title={emoji.name}
          >
            {emoji.code}
          </button>
        ))}
      </div>
    </div>
  )
}

// Create group modal
function CreateGroupModal({ onClose }) {
  const [name, setName] = useState('')
  const [groupPw, setGroupPw] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await createGroup({ name, group_pw: groupPw, emoji: emoji || null })
      onClose()
      // TODO: Refresh groups list
    } catch (err) {
      alert(err.message || 'Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="text"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Group password"
            value={groupPw}
            onChange={(e) => setGroupPw(e.target.value)}
            required
          />
          <div className="emoji-section">
            <label>Choose an emoji (optional)</label>
            <EmojiPicker selectedEmoji={emoji} onEmojiSelect={setEmoji} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Join group modal
function JoinGroupModal({ onClose }) {
  const [groupId, setGroupId] = useState('')
  const [groupPw, setGroupPw] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    try {
      // TODO: Implement join group API call
      console.log('Joining group:', { group_id: parseInt(groupId), group_pw: groupPw })
      onClose()
    } catch (err) {
      alert(err.message || 'Failed to join group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Existing Group</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <input
            type="number"
            placeholder="Group ID"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Group password"
            value={groupPw}
            onChange={(e) => setGroupPw(e.target.value)}
            required
          />
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={isLoading}>
              {isLoading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Account() {
  const userId = localStorage.getItem('userId')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  
  return (
    <div className="container">
      <h1>Your groups</h1>
      <p className="muted">User ID: {userId}</p>
      <div className="card-row">
        <button className="btn primary" onClick={() => setShowCreateModal(true)}>Create new group</button>
        <button className="btn" onClick={() => setShowJoinModal(true)}>Join existing group</button>
      </div>
      <div className="empty">No groups yet.</div>
      
      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} />
      )}
      {showJoinModal && (
        <JoinGroupModal onClose={() => setShowJoinModal(false)} />
      )}
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
