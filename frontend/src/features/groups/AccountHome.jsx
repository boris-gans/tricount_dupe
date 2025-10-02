import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext.jsx'
import { createGroup, joinGroup, getUserGroups, getGroupDetails } from '../../services/api.js'
import { saveGroupDetails, rememberGroupId, syncGroupSummaries } from './groupStorage.js'
import { Button } from '../../components/ui/button.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog.jsx'
import { Input } from '../../components/ui/input.jsx'
import { Label } from '../../components/ui/label.jsx'
import { Card } from '../../components/ui/card.jsx'
import { cn } from '../../lib/utils.js'

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
    <div className="grid grid-cols-6 gap-2">
      {emojis.map((emoji) => (
        <Button
          key={emoji.code}
          type="button"
          variant={selectedEmoji === emoji.code ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-10 w-full px-0 text-xl',
            selectedEmoji === emoji.code && 'shadow-lg'
          )}
          onClick={() => onEmojiSelect(emoji.code)}
          title={emoji.name}
        >
          {emoji.code}
        </Button>
      ))}
    </div>
  )
}

function CreateGroupDialog({ open, onOpenChange, onSubmit }) {
  const [name, setName] = useState('')
  const [groupPw, setGroupPw] = useState('')
  const [emoji, setEmoji] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      setIsLoading(false)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    try {
      setErrorMessage(null)
      await onSubmit({ name, group_pw: groupPw, emoji: emoji || null })
      setName('')
      setGroupPw('')
      setEmoji('')
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new group</DialogTitle>
          <DialogDescription>Add a name, password, and optionally choose an emoji.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend trip"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group-pw">Group password</Label>
            <Input
              id="group-pw"
              type="password"
              value={groupPw}
              onChange={(e) => setGroupPw(e.target.value)}
              placeholder="Secure password"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Choose an emoji (optional)</Label>
            <EmojiPicker selectedEmoji={emoji} onEmojiSelect={setEmoji} />
          </div>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Create group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function JoinGroupDialog({ open, onOpenChange, onSubmit }) {
  const [inviteLink, setInviteLink] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupPw, setGroupPw] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!open) {
      setErrorMessage(null)
      setIsLoading(false)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    try {
      const trimmedLink = inviteLink.trim()

      if (trimmedLink) {
        setErrorMessage(null)
        await onSubmit({
          link_auth: trimmedLink,
        })
        setInviteLink('')
        setGroupName('')
        setGroupPw('')
        return
      }

      if (groupName === '' || groupPw === '') {
        setErrorMessage('Provide either an invite link or a group name and password')
        setIsLoading(false)
        return
      }

      setErrorMessage(null)
      await onSubmit({
        pw_auth: {
          group_name: groupName,
          group_pw: groupPw,
        },
      })
      setInviteLink('')
      setGroupName('')
      setGroupPw('')
    } catch (err) {
      setErrorMessage(err.message || 'Failed to join group')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join existing group</DialogTitle>
          <DialogDescription>Enter the name and password shared with you.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="join-link">Group invite link</Label>
            <Input
              id="join-link"
              type="text"
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              placeholder="Paste your invite link"
            />
          </div>
          <div className="relative">
            <div className="my-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or join with group name & password
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="join-name">Group name</Label>
              <Input
                id="join-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Weekend trip"
                required={!inviteLink.trim()}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="join-pw">Group password</Label>
            <Input
              id="join-pw"
              type="password"
              value={groupPw}
              onChange={(e) => setGroupPw(e.target.value)}
              placeholder="Password"
              required={!inviteLink.trim()}
            />
          </div>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Joining…' : 'Join group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function AccountHome() {
  const { name } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isJoinOpen, setIsJoinOpen] = useState(false)

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

  async function handleNavigateToGroup(group) {
    if (!group?.id || !group?.name) return
    rememberGroupId(group.name, group.id)
    try {
      const fullGroup = await getGroupDetails(group.id)
      if (fullGroup) {
        saveGroupDetails(fullGroup)
        navigate(`/account/${encodeURIComponent(fullGroup.name)}`, {
          state: {
            groupId: fullGroup.id,
            group: fullGroup,
          }
        })
        return
      }
    } catch (err) {
      console.error('Failed to load full group details', err)
    }

    navigate(`/account/${encodeURIComponent(group.name)}`, {
      state: {
        groupId: group.id,
      }
    })
  }

  async function handleCreateGroup(payload) {
    const group = await createGroup(payload)
    if (group) {
      saveGroupDetails(group)
      handleNavigateToGroup(group)
      setIsCreateOpen(false)
      await loadGroups()
    }
  }

  async function handleJoinGroup(payload) {
    const group = await joinGroup(payload)
    if (group) {
      saveGroupDetails(group)
      handleNavigateToGroup(group)
      setIsJoinOpen(false)
      await loadGroups()
    }
  }

  return (
    <section className="container space-y-8 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Your groups</h1>
        <p className="text-muted-foreground">Logged in as {name}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setIsCreateOpen(true)}>Create new group</Button>
        <Button variant="outline" onClick={() => setIsJoinOpen(true)}>Join existing group</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && isLoading && (
        <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Loading groups…
        </div>
      )}

      {!error && !isLoading && groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No groups yet.
        </div>
      )}

      {!error && !isLoading && groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="transition hover:border-primary/70 hover:shadow-lg">
              <button
                type="button"
                onClick={() => handleNavigateToGroup(group)}
                className="flex w-full items-center gap-4 rounded-xl px-4 py-5 text-left"
              >
                <span className="text-3xl">{group.emoji || '👥'}</span>
                <span className="text-lg font-medium">{group.name}</span>
              </button>
            </Card>
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateGroup}
      />

      <JoinGroupDialog
        open={isJoinOpen}
        onOpenChange={setIsJoinOpen}
        onSubmit={handleJoinGroup}
      />
    </section>
  )
}
