import { useState, useEffect } from 'react'
import { supabase, checkSupabaseConnection } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, School, Loader2, Info, CheckCircle2, WifiOff } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isOnline, setIsOnline] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        verifyConnection()
    }, [])

    const verifyConnection = async () => {
        setLoading(true)
        const connected = await checkSupabaseConnection()
        setIsOnline(connected)
        setLoading(false)
        if (!connected) {
            console.error('Supabase connection check failed. Possible ISP block.')
        }
    }

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        department: '',
        role: 'student'
    })

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleAuth = async (e) => {
        e.preventDefault()

        // Re-verify connection before attempting auth
        const connected = await checkSupabaseConnection()
        setIsOnline(connected)
        if (!connected) {
            setError('Cannot reach Supabase. Please check your internet or try a VPN/Hotspot.')
            return
        }

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            console.log('Attempting auth with:', formData.email)
            if (isSignUp) {
                if (!formData.email.endsWith('@rajagiri.edu.in')) {
                    throw new Error('Only @rajagiri.edu.in emails are permitted.')
                }

                const { data, error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            name: formData.name,
                            phone: formData.phone,
                            department: formData.department,
                            role: formData.role
                        },
                        emailRedirectTo: `${window.location.origin}/dashboard`
                    }
                })

                console.log('SignUp Result:', { data, error })

                if (error) {
                    if (error.message.includes('User already registered')) {
                        throw new Error('This email is already registered. If you haven\'t verified your email, please check your inbox (and spam) for the link.')
                    }
                    throw error
                }

                // If email confirmation is disabled, a session is returned immediately
                if (data.session) {
                    setSuccess('Account created! Logging you in...')
                    setTimeout(() => navigate('/dashboard'), 1500)
                } else {
                    setSuccess('Account created! Please check your email for verification link.')
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                })
                console.log('SignIn Result:', { data, error })
                if (error) {
                    if (error.message.includes('Email not confirmed')) {
                        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
                    }
                    throw error
                }
                console.log('Navigating to dashboard...')
                navigate('/dashboard')
            }
        } catch (err) {
            console.error('Authentication error details:', err)
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Network error (Failed to fetch). Supabase is being blocked by your network/ISP.')
            } else {
                setError(err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    const resendVerification = async () => {
        if (!formData.email) {
            setError('Please enter your email address first.')
            return
        }
        setLoading(true)
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: formData.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`
                }
            })
            if (error) throw error
            setSuccess('Verification link resent! Please check your inbox.')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto mt-12 px-4 pb-20">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-12 md:p-20 rounded-[4rem] shadow-2xl shadow-rydset-900/5 border-2 border-slate-50 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -mr-40 -mt-40" />

                <div className="relative z-10 text-center mb-16">
                    <h2 className="text-6xl font-black text-rydset-600 tracking-tight mb-4">
                        {isSignUp ? 'Start Sharing' : 'Welcome Back'}
                    </h2>
                    <p className="text-xl text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
                        {isSignUp
                            ? 'Join the premier Rajagiri carpooling network.'
                            : 'Sign in to start sharing rides with the community.'
                        }
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl mb-8 flex flex-col gap-3 text-sm font-bold">
                        <div className="flex items-center gap-3">
                            <Info size={18} /> {error}
                        </div>
                        {error.includes('verify your email') && (
                            <button
                                onClick={resendVerification}
                                className="ml-8 text-rydset-600 hover:text-rydset-700 underline text-left transition-colors"
                            >
                                Resend verification link
                            </button>
                        )}
                    </div>
                )}

                {success && (
                    <div className="bg-accent/10 border border-accent/20 text-rydset-600 p-5 rounded-2xl mb-8 flex items-center gap-3 text-sm font-bold">
                        <CheckCircle2 size={18} /> {success}
                    </div>
                )}

                {!isOnline && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-700 p-5 rounded-2xl mb-8 flex flex-col gap-2 text-sm font-bold">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <WifiOff size={18} /> Supabase connection is blocked.
                            </div>
                            <button
                                onClick={verifyConnection}
                                className="px-4 py-1.5 bg-amber-200/50 hover:bg-amber-200 rounded-xl text-xs transition-colors"
                            >
                                Retry Connection
                            </button>
                        </div>
                        <p className="font-medium text-amber-600/80 pl-8 italic">
                            Your ISP/Network is blocking Supabase. DNS (8.8.8.8) may not be enough. Try a **VPN** or **Mobile Hotspot**.
                        </p>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-8">
                    {isSignUp && (
                        <div className="space-y-8">
                            <div className="relative group">
                                <User className="absolute left-6 top-6 text-slate-400 group-focus-within:text-accent transition-colors" size={24} />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    required
                                    className="input-field !h-20 !pl-16 !text-lg !font-bold !bg-slate-50 !border-2 !border-slate-50 focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 transition-all"
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="relative group">
                                    <Phone className="absolute left-6 top-6 text-slate-400 group-focus-within:text-accent transition-colors" size={24} />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number"
                                        required
                                        className="input-field !h-20 !pl-16 !text-lg !font-bold !bg-slate-50 !border-2 !border-slate-50 focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 transition-all"
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="relative group">
                                    <School className="absolute left-6 top-6 text-slate-400 group-focus-within:text-accent transition-colors" size={24} />
                                    <input
                                        type="text"
                                        name="department"
                                        placeholder="Dept (e.g. CSE)"
                                        required
                                        className="input-field !h-20 !pl-16 !text-lg !font-bold !bg-slate-50 !border-2 !border-slate-50 focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 transition-all"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-6 p-2 bg-slate-50 rounded-3xl border-2 border-slate-50">
                                <button
                                    type="button"
                                    className={`flex-1 py-4 px-6 rounded-2xl text-lg font-black transition-all ${formData.role === 'student' ? 'bg-white text-rydset-600 shadow-xl' : 'text-slate-400'}`}
                                    onClick={() => setFormData({ ...formData, role: 'student' })}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-4 px-6 rounded-2xl text-lg font-black transition-all ${formData.role === 'staff' ? 'bg-white text-rydset-600 shadow-xl' : 'text-slate-400'}`}
                                    onClick={() => setFormData({ ...formData, role: 'staff' })}
                                >
                                    Staff
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-6 top-6 text-slate-400 group-focus-within:text-accent transition-colors" size={24} />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email (rajagiri.edu.in)"
                            required
                            className="input-field !h-20 !pl-16 !text-lg !font-bold !bg-slate-50 !border-2 !border-slate-50 focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 transition-all"
                            onChange={handleChange}
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-6 top-6 text-slate-400 group-focus-within:text-accent transition-colors" size={24} />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            className="input-field !h-20 !pl-16 !text-lg !font-bold !bg-slate-50 !border-2 !border-slate-50 focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 transition-all"
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-20 bg-rydset-600 hover:bg-rydset-700 text-white rounded-[2rem] font-black text-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-rydset-600/10 mt-12"
                    >
                        {loading ? <Loader2 className="animate-spin" size={32} /> : (isSignUp ? 'Create My Account' : 'Sign In Now')}
                    </button>
                </form>

                <div className="mt-12 text-center text-lg">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setError('')
                            setSuccess('')
                        }}
                        className="text-slate-400 font-bold hover:text-rydset-600 transition-colors"
                    >
                        {isSignUp
                            ? "Already have an account? Sign In"
                            : "Don't have an account? Start Sharing"}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
