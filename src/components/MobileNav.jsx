import { Link, useLocation } from 'react-router-dom'
import { Search, PlusCircle, BookOpen, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'

export default function MobileNav() {
    const { user } = useAuth()
    const location = useLocation()

    if (!user) return null

    const navItems = [
        { path: '/dashboard', label: 'Find', icon: Search },
        { path: '/create-ride', label: 'Offer', icon: PlusCircle },
        { path: '/my-bookings', label: 'My Trips', icon: BookOpen },
        { path: '/profile', label: 'Profile', icon: User },
    ]

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-rydset-50 px-4 pb-safe pt-2 shadow-[0_-10px_40px_-15px_rgba(21,40,34,0.1)]">
            <div className="flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="relative flex flex-col items-center gap-1 p-2 min-w-[70px] transition-all"
                        >
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-rydset-600 text-accent shadow-lg shadow-rydset-600/20' : 'text-slate-400 hover:text-rydset-600'}`}
                            >
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </motion.div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-rydset-600' : 'text-slate-400'}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-active-pill"
                                    className="absolute -top-2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_10px_rgba(171,234,147,0.8)]"
                                />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
