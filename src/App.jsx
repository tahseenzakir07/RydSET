import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateRide from './pages/CreateRide'
import MyBookings from './pages/MyBookings'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import UserProfileView from './pages/UserProfileView'

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth()
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    return user ? children : <Navigate to="/login" />
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen">
                    <Navbar />
                    <main className="container mx-auto px-4 py-8 pb-32 lg:pb-8">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/dashboard" element={
                                <PrivateRoute><Dashboard /></PrivateRoute>
                            } />
                            <Route path="/create-ride" element={
                                <PrivateRoute><CreateRide /></PrivateRoute>
                            } />
                            <Route path="/my-bookings" element={
                                <PrivateRoute><MyBookings /></PrivateRoute>
                            } />
                            <Route path="/profile" element={
                                <PrivateRoute><Profile /></PrivateRoute>
                            } />
                            <Route path="/admin" element={
                                <PrivateRoute><AdminDashboard /></PrivateRoute>
                            } />
                            <Route path="/profile/:userId" element={
                                <PrivateRoute><UserProfileView /></PrivateRoute>
                            } />
                        </Routes>
                    </main>
                    <MobileNav />
                </div>
            </Router>
        </AuthProvider>
    )
}

export default App
