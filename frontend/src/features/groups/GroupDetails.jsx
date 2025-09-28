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

function formatCurrency(amount) {
  if (typeof amount !== 'number') return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  const title = expense.description || 'Untitled expense'
  return (
    <div className="expense-row">
      <div className={`expense-photo ${expense.photo_url ? 'has-image' : 'placeholder'}`}>
        {expense.photo_url ? (
          <img src={expense.photo_url} alt={title} />
        ) : (
          <span role="img" aria-label="receipt">🧾</span>
        )}
      </div>
      <div className="expense-content">
        <div className="expense-title">{title}</div>
        <div className="expense-meta">
          <span className="expense-payer">Paid by {expense.paid_by?.name || 'someone'}</span>
          <span className="expense-amount">{formatCurrency(expense.amount)}</span>
        </div>
      </div>
      <div className="expense-actions">
        <button type="button" className="icon-btn" onClick={() => onEdit(expense)} title="Edit expense">
          ✏️
        </button>
        <button type="button" className="icon-btn danger" onClick={() => onDelete(expense)} title="Delete expense">
          🗑️
        </button>
      </div>
    </div>
  )
}

function BalanceRow({ member }) {
  const amount = formatCurrency(member.balance)
  const status = member.balance > 0 ? 'owes you' : member.balance < 0 ? 'you owe' : 'settled'
  const amountDisplay = member.balance < 0 ? formatCurrency(Math.abs(member.balance)) : amount

  return (
    <div className={`balance-row ${member.balance > 0 ? 'positive' : member.balance < 0 ? 'negative' : 'neutral'}`}>
      <span className="balance-name">{member.name}</span>
      <span className="balance-status">{status}</span>
      <span className="balance-amount">{member.balance < 0 ? amountDisplay : amount}</span>
    </div>
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
      <div className="container">
        <div className="empty">Loading group details…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="empty">{error}</div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container">
        <div className="empty">Group data is unavailable.</div>
      </div>
    )
  }

  return (
    <div className="container group-layout">
      <div className="group-header">
        <div className="group-emoji-large">{group.emoji || '👥'}</div>
        <div>
          <h1 className="group-title">{group.name}</h1>
          <p className="muted">{group.members?.length || 0} members</p>
        </div>
      </div>

      <div className="group-tabs">
        <button
          className={`group-tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button
          className={`group-tab ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          Balances
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <>
          <div className="group-actions">
            <button
              type="button"
              className="btn add-expense-btn"
              onClick={handleOpenCreateModal}
              disabled={!group?.members?.length}
            >
              <span className="plus-icon">+</span>
              Add Expense
            </button>
          </div>
          <div className="expense-list">
            {group.expenses?.length ? (
              group.expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteExpense}
                />
              ))
            ) : (
              <div className="empty">No expenses recorded yet.</div>
            )}
          </div>
        </>
      ) : (
        <div className="balance-list">
          {group.members?.length ? (
            group.members.map((member) => (
              <BalanceRow key={member.id} member={member} />
            ))
          ) : (
            <div className="empty">No balances to show.</div>
          )}
        </div>
      )}

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
    </div>
  )
}
