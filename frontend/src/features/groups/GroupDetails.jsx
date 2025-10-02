import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { getGroupDetails, deleteGroupExpense } from '../../services/api.js'
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
import { cn } from '../../lib/utils.js'
import { Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'

function formatCurrency(amount) {
  if (typeof amount !== 'number') return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  const title = expense.description || 'Untitled expense'

  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted">
        {expense.photo_url ? (
          <img src={expense.photo_url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <ReceiptText className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-base font-medium">{title}</span>
        <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>Paid by {expense.paid_by?.name || 'someone'}</span>
          <span>{formatCurrency(expense.amount)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(expense)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(expense)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

function BalanceRow({ member }) {
  const amount = formatCurrency(member.balance)
  const status = member.balance > 0 ? 'owes you' : member.balance < 0 ? 'you owe' : 'settled'
  const amountDisplay = member.balance < 0 ? formatCurrency(Math.abs(member.balance)) : amount
  const badgeClasses = member.balance > 0
    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    : member.balance < 0
      ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
      : 'border-muted/50 bg-muted/30 text-muted-foreground'
  const amountClasses = member.balance > 0
    ? 'text-emerald-300'
    : member.balance < 0
      ? 'text-rose-300'
      : 'text-muted-foreground'

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="space-y-1">
        <p className="font-medium">{member.name}</p>
        <Badge variant="secondary" className={badgeClasses}>
          {status}
        </Badge>
      </div>
      <span className={cn('text-lg font-semibold', amountClasses)}>{member.balance < 0 ? amountDisplay : amount}</span>
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
        <Button type="button" onClick={handleOpenCreateModal} disabled={!group?.members?.length}>
          <Plus className="mr-2 h-4 w-4" /> Add expense
        </Button>
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

        <TabsContent value="balances" className="space-y-3">
          {group.members?.length ? (
            group.members.map((member) => (
              <BalanceRow key={member.id} member={member} />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-muted/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No balances to show.
            </div>
          )}
        </TabsContent>
      </Tabs>

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
