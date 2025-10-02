import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { createGroupInviteLink, deleteGroupExpense, getGroupDetails } from '../../services/api.js'
import {
  getCachedGroupDetailsByName,
  getGroupIdByName,
  saveGroupDetails
} from './groupStorage.js'
import AddExpenseModal from './AddExpenseModal.jsx'
import { useAuth } from '../../AuthContext.jsx'
import { Button } from '../../components/ui/button.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Card } from '../../components/ui/card.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.jsx'
import { Input } from '../../components/ui/input.jsx'
import { cn } from '../../lib/utils.js'
import { Copy, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'

function formatCurrency(amount) {
  if (typeof amount !== 'number') return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

function ExpenseRow({ expense, expanded, onToggle, onEdit, onDelete }) {
  const title = expense.description || 'Untitled expense'
  const createdByName = expense.created_by?.name || expense.paid_by?.name || 'someone'

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        'cursor-pointer select-none transition hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        expanded && 'border-primary/60'
      )}
    >
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted">
          {expense.photo_url ? (
            <img src={expense.photo_url} alt={title} className="h-full w-full object-cover" />
          ) : (
            <ReceiptText className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="text-base font-medium">{title}</span>
              <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                <span>Created by {createdByName}</span>
                <span>{formatCurrency(typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(expense)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(expense)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {expanded ? (
            <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid by</span>
                <span className="font-medium">{expense.paid_by?.name || 'Unknown'}</span>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold">Splits</p>
                {Array.isArray(expense.splits) && expense.splits.length ? (
                  <div className="space-y-2">
                    {expense.splits.map((split) => {
                      const splitName = split.user?.name || 'Member'
                      const splitAmount = typeof split.amount === 'number' ? split.amount : Number(split.amount) || 0
                      return (
                        <div key={`${expense.id}-${split.user?.id ?? splitName}`} className="flex items-center justify-between text-sm">
                          <span>{splitName}</span>
                          <span className="font-medium">{formatCurrency(splitAmount)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No split information available.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function BalanceRow({ member, isCurrentUser }) {
  const balanceValue = typeof member.balance === 'number' ? member.balance : Number(member.balance) || 0
  const amountDisplayBase = formatCurrency(Math.abs(balanceValue))
  const amountDisplay = balanceValue > 0 ? `+${amountDisplayBase}` : balanceValue < 0 ? `-${amountDisplayBase}` : amountDisplayBase
  const amountClasses = balanceValue > 0
    ? 'text-emerald-300'
    : balanceValue < 0
      ? 'text-rose-300'
      : 'text-muted-foreground'

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="space-y-1">
        <p className="font-medium">{member.name}</p>
        {isCurrentUser ? <Badge variant="secondary" className="w-fit">Me</Badge> : null}
      </div>
      <span className={cn('text-lg font-semibold', amountClasses)}>{amountDisplay}</span>
    </Card>
  )
}

export default function GroupDetails() {
  const { groupName } = useParams()
  const decodedName = useMemo(() => decodeURIComponent(groupName), [groupName])
  const location = useLocation()
  const { userId } = useAuth()

  const initialGroup = location.state?.group || getCachedGroupDetailsByName(decodedName)
  const [group, setGroup] = useState(initialGroup || null)
  const [isLoading, setIsLoading] = useState(!initialGroup)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('expenses')
  const [modalState, setModalState] = useState(null)
  const [expandedExpenseId, setExpandedExpenseId] = useState(null)
  const [isInviteLoading, setIsInviteLoading] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [copyError, setCopyError] = useState(null)
  const copyTimeoutRef = useRef(null)
  const memberMapKey = useMemo(() => `memberNameToId:${decodedName}`, [decodedName])

  const memberNameToId = useMemo(() => {
    if (!group?.members?.length) return {}
    return group.members.reduce((acc, member) => {
      if (member?.name && member?.id != null) {
        acc[member.name] = member.id
      }
      return acc
    }, {})
  }, [group])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (Object.keys(memberNameToId).length) {
      try {
        sessionStorage.setItem(memberMapKey, JSON.stringify(memberNameToId))
      } catch (err) {
        console.error('Failed to cache member name map', err)
      }
    } else {
      try {
        sessionStorage.removeItem(memberMapKey)
      } catch (err) {
        console.error('Failed to clear member name map', err)
      }
    }

    return () => {
      try {
        sessionStorage.removeItem(memberMapKey)
      } catch (err) {
        console.error('Failed to remove member name map', err)
      }
    }
  }, [memberMapKey, memberNameToId])

  const groupId = useMemo(() => {
    if (location.state?.groupId) return location.state.groupId
    if (initialGroup?.id) return initialGroup.id
    return getGroupIdByName(decodedName)
  }, [location.state, initialGroup, decodedName])

  const numericUserId = useMemo(() => {
    if (!userId) return null
    const parsed = parseInt(userId, 10)
    return Number.isFinite(parsed) ? parsed : null
  }, [userId])

  const totals = useMemo(() => {
    const expenses = Array.isArray(group?.expenses) ? group.expenses : []
    const totalExpenses = expenses.reduce((sum, expense) => {
      const amount = typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0
      return sum + amount
    }, 0)

    const myExpenses = expenses.reduce((sum, expense) => {
      if (!numericUserId || !Array.isArray(expense.splits)) return sum
      const matchingSplit = expense.splits.find((split) => {
        const splitId = split.user?.id ?? split.user_id
        return splitId === numericUserId
      })
      if (!matchingSplit) return sum
      const splitAmount = typeof matchingSplit.amount === 'number' ? matchingSplit.amount : Number(matchingSplit.amount) || 0
      return sum + splitAmount
    }, 0)

    return {
      totalExpenses,
      myExpenses,
    }
  }, [group?.expenses, numericUserId])

  const currentMemberBalance = useMemo(() => {
    if (!numericUserId || !Array.isArray(group?.members)) return null
    const me = group.members.find((member) => member.id === numericUserId)
    if (!me) return null
    const balanceValue = typeof me.balance === 'number' ? me.balance : Number(me.balance) || 0
    return balanceValue
  }, [group?.members, numericUserId])

  const otherMemberCount = useMemo(() => {
    if (!Array.isArray(group?.members)) return 0
    if (!numericUserId) return group.members.length
    return group.members.filter((member) => member.id !== numericUserId).length
  }, [group?.members, numericUserId])

  const isSoloGroup = otherMemberCount === 0
  const inviteButtonLabel = isInviteLoading ? 'Generating…' : 'Invite a Friend!'

  useEffect(() => {
    setCopySuccess(false)
    setCopyError(null)
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
    }
  }, [inviteUrl])

  useEffect(() => {
    let isMounted = true

    async function loadDetails() {
      if (group) {
        setIsLoading(false)
        setError(null)
        return
      }
      if (!groupId) {
        setIsLoading(false)
        setError('Group details not found. Try reopening from your account page.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getGroupDetails(groupId)
        if (!isMounted) return
        setGroup(data)
        saveGroupDetails(data)
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Failed to load group details')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadDetails()

    return () => {
      isMounted = false
    }
  }, [group, groupId])

  async function refreshGroupDetails() {
    if (!groupId) return
    try {
      const data = await getGroupDetails(groupId)
      setGroup(data)
      saveGroupDetails(data)
    } catch (err) {
      console.error('Failed to refresh group after creating expense', err)
    }
  }

  function handleExpenseSuccess(expenseResult, type) {
    setGroup((prev) => {
      if (!prev) return prev
      const existingExpenses = Array.isArray(prev.expenses) ? prev.expenses : []
      if (type === 'edit') {
        return {
          ...prev,
          expenses: existingExpenses.map((expense) => (expense.id === expenseResult.id ? expenseResult : expense)),
        }
      }
      return {
        ...prev,
        expenses: [expenseResult, ...existingExpenses],
      }
    })
    refreshGroupDetails()
  }

  function handleOpenCreateModal() {
    setModalState({ mode: 'create' })
  }

  function handleOpenEditModal(expense) {
    setModalState({ mode: 'edit', expense })
  }

  function handleCloseModal() {
    setModalState(null)
  }

  async function handleDeleteExpense(expense) {
    if (!groupId || !expense?.id) return
    try {
      await deleteGroupExpense(groupId, { id: expense.id })
      setGroup((prev) => {
        if (!prev) return prev
        const existingExpenses = Array.isArray(prev.expenses) ? prev.expenses : []
        return {
          ...prev,
          expenses: existingExpenses.filter((item) => item.id !== expense.id),
        }
      })
      refreshGroupDetails()
    } catch (err) {
      console.error('Failed to delete expense', err)
    }
  }

  function handleToggleExpense(expenseId) {
    setExpandedExpenseId((prev) => (prev === expenseId ? null : expenseId))
  }

  async function handleInviteClick() {
    if (!groupId) return
    setIsInviteLoading(true)
    try {
      setInviteError(null)
      setCopyError(null)
      setCopySuccess(false)
      const data = await createGroupInviteLink(groupId)
      const token = data?.token
      if (!token) {
        throw new Error('Invite token was not returned')
      }
      const shareUrl = `${window.location.origin}/join?token=${encodeURIComponent(token)}`
      setInviteUrl(shareUrl)
      setInviteDialogOpen(true)
    } catch (err) {
      console.error('Failed to create invite link', err)
      const message = err instanceof Error ? err.message : 'Failed to create invite link'
      setInviteError(message)
    } finally {
      setIsInviteLoading(false)
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) return
    try {
      setCopyError(null)
      await navigator.clipboard.writeText(inviteUrl)
      setCopySuccess(true)
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopySuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy invite link', err)
      const message = err instanceof Error ? err.message : 'Unable to copy link. Please copy it manually.'
      setCopyError(message)
      setCopySuccess(false)
    }
  }

  if (isLoading) {
    return (
      <section className="container py-12">
        <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Loading group details…
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="container py-12">
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      </section>
    )
  }

  if (!group) {
    return (
      <section className="container py-12">
        <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Group data is unavailable.
        </div>
      </section>
    )
  }

  return (
    <section className="container space-y-8 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-xl border border-border/80 bg-muted text-3xl">
            {group.emoji || '👥'}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">{group.name}</h1>
            <p className="text-sm text-muted-foreground">{group.members?.length || 0} members</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleInviteClick}
              disabled={isInviteLoading}
            >
              {inviteButtonLabel}
            </Button>
            <Button type="button" onClick={handleOpenCreateModal} disabled={!group?.members?.length}>
              <Plus className="mr-2 h-4 w-4" /> Add expense
            </Button>
          </div>
          {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">My expenses</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.myExpenses)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total expenses</p>
          <p className="text-2xl font-semibold">{formatCurrency(totals.totalExpenses)}</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          {group.expenses?.length ? (
            <div className="space-y-3">
              {group.expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  expanded={expandedExpenseId === expense.id}
                  onToggle={() => handleToggleExpense(expense.id)}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteExpense}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No expenses recorded yet.
            </div>
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          {isSoloGroup ? (
            <Card className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-lg font-medium">Invite friends to start sharing expenses.</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleInviteClick}
                disabled={isInviteLoading}
              >
                {inviteButtonLabel}
              </Button>
              {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
            </Card>
          ) : (
            <>
              {typeof currentMemberBalance === 'number' ? (
                <Card className="p-5">
                  {currentMemberBalance > 0 ? (
                    <p className="text-xl font-semibold text-emerald-300">
                      You are owed {formatCurrency(Math.abs(currentMemberBalance))}
                    </p>
                  ) : currentMemberBalance < 0 ? (
                    <p className="text-xl font-semibold text-rose-300">
                      You owe {formatCurrency(Math.abs(currentMemberBalance))}
                    </p>
                  ) : (
                    <p className="text-xl font-semibold text-muted-foreground">You are all settled</p>
                  )}
                </Card>
              ) : null}

              {group.members?.length ? (
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <BalanceRow key={member.id} member={member} isCurrentUser={numericUserId === member.id} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  No balances to show.
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open)
          if (!open) {
            setCopySuccess(false)
            setCopyError(null)
            if (copyTimeoutRef.current) {
              clearTimeout(copyTimeoutRef.current)
              copyTimeoutRef.current = null
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your invite link</DialogTitle>
            <DialogDescription>Send this link to friends so they can join your group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Invite link</p>
            <Input
              value={inviteUrl}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          </div>
          {copyError ? <p className="text-sm text-destructive">{copyError}</p> : null}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleCopyInvite} disabled={!inviteUrl}>
              <Copy className="mr-2 h-4 w-4" /> {copySuccess ? 'Copied!' : 'Copy link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {modalState && group?.members?.length ? (
        <AddExpenseModal
          groupId={group.id}
          members={group.members}
          currentUserId={numericUserId}
          onClose={handleCloseModal}
          onSuccess={handleExpenseSuccess}
          mode={modalState.mode}
          expense={modalState.expense}
        />
      ) : null}
    </section>
  )
}
