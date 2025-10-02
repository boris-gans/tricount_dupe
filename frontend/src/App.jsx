import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import AccountHome from './features/groups/AccountHome.jsx'
import GroupDetails from './features/groups/GroupDetails.jsx'
import { Button } from './components/ui/button.jsx'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card.jsx'
import { Input } from './components/ui/input.jsx'
import { Label } from './components/ui/label.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function Navbar() {
  const { isAuthenticated, logout, name } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="text-lg font-semibold text-primary">
          MyCount
        </Link>
        <div className="flex-1" />
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/account">Dashboard</Link>
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline-block">{name}</span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}

function Landing() {
  return (
    <section className="container flex flex-col items-center gap-6 py-16 text-center">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-semibold sm:text-5xl">Split expenses the simple way</h1>
        <p className="text-lg text-muted-foreground">
          Track, share, and settle group expenses with ease using a streamlined, modern interface powered by shadcn/ui.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" asChild>
          <Link to="/signup">Get started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/login">Log in</Link>
        </Button>
      </div>
    </section>
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
    <section className="container py-16">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="name@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" name="pw" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Log in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/signup" className="text-primary">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
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
    <section className="container py-16">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" type="text" placeholder="Ada Lovelace" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" placeholder="name@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-pw">Password</Label>
              <Input id="signup-pw" name="pw" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating…' : 'Sign up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </section>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/account" element={<ProtectedRoute><AccountHome /></ProtectedRoute>} />
          <Route path="/account/:groupName" element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
