import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext.jsx'
import { createGroup, joinGroup, getUserGroups } from '../../services/api.js'
import { saveGroupDetails, rememberGroupId, syncGroupSummaries } from './groupStorage.js'

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

function CreateGroupModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [groupPw, setGroupPw] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit({ name, group_pw: groupPw, emoji: emoji || null })
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

function JoinGroupModal({ onClose, onSubmit }) {
  const [groupId, setGroupId] = useState('')
  const [groupPw, setGroupPw] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const parsedId = parseInt(groupId, 10)
      if (Number.isNaN(parsedId) || parsedId <= 0) {
        alert('Enter a valid group ID')
        setIsLoading(false)
        return
      }
      await onSubmit({
        group_id: parsedId,
        group_pw: groupPw
      })
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
            min="1"
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

export default function AccountHome() {
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getUserGroups()
      const list = Array.isArray(result) ? result : result ? [result] : []
      setGroups(list)
      syncGroupSummaries(list)
    } catch (err) {
      setError(err.message || 'Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }

  function handleNavigateToGroup(group) {
    if (!group?.id || !group?.name) return
    rememberGroupId(group.name, group.id)
    if (group.members && group.expenses) {
      saveGroupDetails(group)
    }
    navigate(`/account/${encodeURIComponent(group.name)}`, {
      state: {
        groupId: group.id,
        group: group.members && group.expenses ? group : undefined
      }
    })
  }

  async function handleCreateGroup(payload) {
    const group = await createGroup(payload)
    if (group) {
      saveGroupDetails(group)
      handleNavigateToGroup(group)
      setShowCreateModal(false)
      await loadGroups()
    }
  }

  async function handleJoinGroup(payload) {
    const group = await joinGroup(payload)
    if (group) {
      saveGroupDetails(group)
      handleNavigateToGroup(group)
      setShowJoinModal(false)
      await loadGroups()
    }
  }

  return (
    <div className="container">
      <h1>Your groups</h1>
      <p className="muted">User ID: {userId}</p>
      <div className="card-row">
        <button className="btn primary" onClick={() => setShowCreateModal(true)}>Create new group</button>
        <button className="btn" onClick={() => setShowJoinModal(true)}>Join existing group</button>
      </div>

      {error && <div className="empty">{error}</div>}
      {!error && isLoading && <div className="empty">Loading groups…</div>}
      {!error && !isLoading && groups.length === 0 && (
        <div className="empty">No groups yet.</div>
      )}

      {!error && !isLoading && groups.length > 0 && (
        <div className="group-grid">
          {groups.map((group) => (
            <button
              key={group.id}
              className="group-card"
              onClick={() => handleNavigateToGroup(group)}
            >
              <span className="group-emoji">{group.emoji || '👥'}</span>
              <span className="group-name">{group.name}</span>
            </button>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}
      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onSubmit={handleJoinGroup}
        />
      )}
    </div>
  )
}
