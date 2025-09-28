import { useEffect, useMemo, useState } from 'react'
import { createGroupExpense, updateGroupExpense } from '../../services/api.js'

const roundTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100

function buildInitialSplits(members) {
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    isSelected: true,
    isManual: false,
    amount: 0,
  }))
}

function buildSplitsFromExpense(members, expense) {
  const splitMap = new Map()
  if (expense?.splits) {
    for (const split of expense.splits) {
      if (split?.user?.id != null) {
        splitMap.set(split.user.id, roundTwo(split.amount ?? 0))
      }
    }
  }

  const participatingIds = Array.from(splitMap.keys())
  const hasParticipants = participatingIds.length > 0
  const total = hasParticipants ? roundTwo(participatingIds.reduce((sum, id) => sum + (splitMap.get(id) ?? 0), 0)) : 0
  const evenShare = hasParticipants ? roundTwo(total / participatingIds.length) : 0
  const isEvenSplit = hasParticipants && participatingIds.every((id) => Math.abs((splitMap.get(id) ?? 0) - evenShare) < 0.02)

  return members.map((member) => {
    if (!splitMap.has(member.id)) {
      return {
        id: member.id,
        name: member.name,
        isSelected: false,
        isManual: false,
        amount: 0,
      }
    }
    const amount = splitMap.get(member.id) ?? 0
    return {
      id: member.id,
      name: member.name,
      isSelected: true,
      isManual: !isEvenSplit,
      amount,
    }
  })
}

export default function AddExpenseModal({
  groupId,
  members,
  currentUserId,
  onClose,
  onSuccess,
  mode = 'create',
  expense = null,
}) {
  const [description, setDescription] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [paidById, setPaidById] = useState(null)
  const [splits, setSplits] = useState(() => buildInitialSplits(members))
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amountValue = useMemo(() => {
    const parsed = parseFloat(amountInput)
    return Number.isFinite(parsed) ? parsed : NaN
  }, [amountInput])

  useEffect(() => {
    const defaultPayer = () => {
      if (currentUserId && members.some((m) => m.id === currentUserId)) return currentUserId
      return members[0]?.id ?? null
    }

    if (mode === 'edit' && expense) {
      const initialSplits = buildSplitsFromExpense(members, expense)
      setDescription(expense.description ?? '')
      setAmountInput(expense.amount != null ? String(expense.amount) : '')
      const payerId = expense.paid_by?.id ?? defaultPayer()
      setPaidById(payerId)
      setSplits(initialSplits)
    } else {
      const initialSplits = buildInitialSplits(members)
      setDescription('')
      setAmountInput('')
      setPaidById(defaultPayer())
      setSplits(initialSplits)
    }
  }, [mode, expense, members, currentUserId])

  useEffect(() => {
    setSplits((prev) => redistributeSplits(prev, amountValue))
  }, [amountValue])

  useEffect(() => {
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError(null)
      return
    }

    const selectedSplits = splits.filter((split) => split.isSelected)
    const totalAllocated = roundTwo(selectedSplits.reduce((acc, split) => acc + split.amount, 0))
    const manualTotal = selectedSplits
      .filter((split) => split.isManual)
      .reduce((acc, split) => acc + split.amount, 0)

    if (manualTotal - amountValue > 0.009) {
      setError('Manual splits exceed the total amount.')
      return
    }

    if (selectedSplits.length === 0) {
      setError('Select at least one participant.')
      return
    }

    if (Math.abs(totalAllocated - amountValue) > 0.01) {
      setError('Splits must add up to the total amount.')
      return
    }

    setError(null)
  }, [amountValue, splits])

  function redistributeSplits(currentSplits, amount) {
    if (!Number.isFinite(amount) || amount < 0) amount = 0
    const selected = currentSplits.filter((split) => split.isSelected)
    const manualTotal = selected
      .filter((split) => split.isManual)
      .reduce((sum, split) => sum + split.amount, 0)
    const remaining = Math.max(amount - manualTotal, 0)
    const autoParticipants = selected.filter((split) => !split.isManual)
    const autoCount = autoParticipants.length

    let autoShare = autoCount ? roundTwo(remaining / autoCount) : 0

    let updatedSplits = currentSplits.map((split) => {
      if (!split.isSelected) {
        return { ...split, amount: 0, isManual: false }
      }
      if (split.isManual || autoCount === 0) return split
      return { ...split, amount: autoShare }
    })

    if (autoCount) {
      const autoIds = autoParticipants.map((split) => split.id)
      const autoTotal = autoShare * autoCount
      const diff = roundTwo(remaining - autoTotal)
      if (Math.abs(diff) >= 0.01) {
        const lastAutoId = autoIds[autoIds.length - 1]
        updatedSplits = updatedSplits.map((split) => {
          if (split.id === lastAutoId) {
            const adjusted = roundTwo(split.amount + diff)
            return { ...split, amount: adjusted < 0 ? 0 : adjusted }
          }
          return split
        })
      }
    }

    return updatedSplits
  }

  function handleAmountChange(e) {
    setAmountInput(e.target.value)
  }

  function toggleParticipant(memberId) {
    setSplits((prev) => {
      const next = prev.map((split) => {
        if (split.id !== memberId) return split
        const nextSelected = !split.isSelected
        return {
          ...split,
          isSelected: nextSelected,
          amount: nextSelected ? split.amount : 0,
          isManual: nextSelected ? split.isManual : false,
        }
      })
      return redistributeSplits(next, amountValue)
    })
  }

  function handleManualAmount(memberId, value) {
    setSplits((prev) => {
      const amountCap = Number.isFinite(amountValue) ? amountValue : Infinity
      const otherManualTotal = prev
        .filter((split) => split.id !== memberId && split.isSelected && split.isManual)
        .reduce((sum, split) => sum + split.amount, 0)

      const next = prev.map((split) => {
        if (split.id !== memberId) return split
        if (!split.isSelected) return split
        const parsed = parseFloat(value)
        const candidate = Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
        const maxAllowed = amountCap === Infinity ? candidate : Math.max(amountCap - otherManualTotal, 0)
        const clipped = roundTwo(Math.min(candidate, maxAllowed))
        return {
          ...split,
          amount: clipped,
          isManual: true,
        }
      })
      return redistributeSplits(next, amountValue)
    })
  }

  function resetManual(memberId) {
    setSplits((prev) => {
      const next = prev.map((split) => {
        if (split.id !== memberId) return split
        return {
          ...split,
          isManual: false,
        }
      })
      return redistributeSplits(next, amountValue)
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!groupId) return

    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setError('Description is required.')
      return
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.')
      return
    }

    const selectedSplits = splits.filter((split) => split.isSelected)
    if (selectedSplits.length === 0) {
      setError('Select at least one participant.')
      return
    }

    const totalAllocated = roundTwo(selectedSplits.reduce((acc, split) => acc + split.amount, 0))
    if (Math.abs(totalAllocated - amountValue) > 0.01) {
      setError('Splits must add up to the total amount.')
      return
    }

    const payloadSplits = selectedSplits.map((split) => ({
      user: { id: split.id, name: split.name },
      amount: roundTwo(split.amount),
    }))

    const payloadTotal = roundTwo(payloadSplits.reduce((acc, split) => acc + split.amount, 0))
    const diff = roundTwo(amountValue - payloadTotal)
    if (Math.abs(diff) > 0 && payloadSplits.length) {
      const lastIndex = payloadSplits.length - 1
      payloadSplits[lastIndex] = {
        ...payloadSplits[lastIndex],
        amount: roundTwo(payloadSplits[lastIndex].amount + diff),
      }
    }

    const payerId = paidById ?? selectedSplits[0].id

    setIsSubmitting(true)

    if (mode === 'edit' && expense) {
      const roundedAmount = roundTwo(amountValue)
      const expensePayload = {
        description: trimmedDescription,
        amount: roundedAmount,
        paid_by_id: payerId,
        photo_url: expense?.photo_url ?? null,
        splits: payloadSplits,
      }

      updateGroupExpense(groupId, {
        id: expense.id,
        expense: expensePayload,
      })
        .then((updatedExpense) => {
          onSuccess(updatedExpense, 'edit')
          onClose()
        })
        .catch((err) => {
          setError(err.message || 'Failed to update expense.')
        })
        .finally(() => setIsSubmitting(false))
      return
    }

    createGroupExpense(groupId, {
      description: trimmedDescription,
      amount: roundTwo(amountValue),
      paid_by_id: payerId,
      photo_url: null,
      splits: payloadSplits,
    })
      .then((createdExpense) => {
        onSuccess(createdExpense, 'create')
        onClose()
      })
      .catch((err) => {
        setError(err.message || 'Failed to create expense.')
      })
      .finally(() => setIsSubmitting(false))
  }

  const headerLabel = mode === 'edit' ? 'Edit Expense' : 'Add Expense'
  const actionLabel = mode === 'edit' ? 'Edit Expense' : 'Add expense'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-expense-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{headerLabel}</h2>
          <button className="close-btn" type="button" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was the expense for?"
              required
            />
          </label>
          <label className="form-field">
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountInput}
              onChange={handleAmountChange}
              placeholder="0.00"
              required
            />
          </label>
          <label className="form-field">
            <span>Paid by</span>
            <select
              value={paidById ?? ''}
              onChange={(e) => setPaidById(Number(e.target.value))}
              required
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
          <div className="form-field">
            <span>Split between</span>
            <div className="split-list">
              {splits.map((split) => (
                <div key={split.id} className={`split-row ${split.isSelected ? '' : 'inactive'}`}>
                  <div className="split-info">
                    <span className="split-name">{split.name}</span>
                    {split.isManual && split.isSelected && (
                      <button
                        type="button"
                        className="split-reset"
                        onClick={() => resetManual(split.id)}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={split.isSelected ? split.amount : 0}
                    onChange={(e) => handleManualAmount(split.id, e.target.value)}
                    disabled={!split.isSelected || isSubmitting}
                    className="split-amount-input"
                  />
                  <button
                    type="button"
                    className={`participant-toggle ${split.isSelected ? 'active' : ''}`}
                    onClick={() => toggleParticipant(split.id)}
                    disabled={isSubmitting}
                    title={split.isSelected ? 'Included' : 'Excluded'}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn primary" disabled={isSubmitting}>{actionLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
