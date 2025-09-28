import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loginUser, signupUser, logout as apiLogout } from './services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [userId, setUserId] = useState(() => localStorage.getItem('userId'))
  const [name, setUserName] = useState(() => localStorage.getItem('name'))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (userId) localStorage.setItem('userId', userId)
    else localStorage.removeItem('userId')
  }, [userId])

  async function login(credentials) {
    setIsLoading(true)
    try {
      const data = await loginUser(credentials)
      if (data?.access_token) setToken(data.access_token)
      if (data?.user?.id) setUserId(String(data.user.id))
      if (data?.user?.name) setUserName(String(data.user.name))
      return data
    } finally {
      setIsLoading(false)
    }
  }

  async function signup(payload) {
    setIsLoading(true)
    try {
      const data = await signupUser(payload)
      if (data?.access_token) setToken(data.access_token)
      if (data?.user?.id) setUserId(String(data.user.id))
      if (data?.user?.name) setUserName(String(data.user.name))
      return data
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    apiLogout()
    setToken(null)
    setUserId(null)
  }

  const value = useMemo(() => ({ token, userId, name, isAuthenticated: Boolean(token), isLoading, login, signup, logout }), [token, userId, isLoading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


