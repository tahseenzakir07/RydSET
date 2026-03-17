import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Car, User, LogOut, Search, PlusCircle, BookOpen, ShieldCheck } from 'lucide-react'

export default function Navbar() {
    const { user, profile, signOut } = useAuth()

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-rydset-50 px-6 py-4">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-rydset-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-rydset-600/10 group-hover:rotate-6 transition-transform duration-500">
                        <Car className="text-accent" size={32} />
                    </div>
                    <span className="text-3xl font-black tracking-tighter text-rydset-600">
                        RYD<span className="text-accent">SET</span>
                    </span>
                </Link>

                <div className="flex items-center gap-8">
                    {user ? (
                        <>
                            <div className="hidden lg:flex items-center gap-8">
                                {profile?.role === 'admin' && (
                                    <Link to="/admin" className="flex items-center gap-2 text-rydset-600 hover:text-rydset-700 font-bold transition-colors">
                                        <ShieldCheck size={18} />
                                        <span>Admin</span>
                                    </Link>
                                )}
                                <Link to="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-rydset-600 font-bold transition-colors">
                                    <Search size={18} />
                                    <span>Find Rides</span>
                                </Link>
                                <Link to="/create-ride" className="flex items-center gap-2 text-slate-600 hover:text-rydset-600 font-bold transition-colors">
                                    <PlusCircle size={18} />
                                    <span>Offer Ride</span>
                                </Link>
                                <Link to="/my-bookings" className="flex items-center gap-2 text-slate-600 hover:text-rydset-600 font-bold transition-colors">
                                    <BookOpen size={18} />
                                    <span>My Trips</span>
                                </Link>
                            </div>

                            <div className="h-8 w-px bg-slate-100 mx-2 hidden lg:block" />

                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <Link to="/profile" className="hover:opacity-75 transition-opacity block">
                                        <p className="text-sm font-black text-rydset-600 leading-tight">{profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Member'}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{profile?.role || 'User'}</p>
                                    </Link>
                                </div>
                                <button
                                    onClick={() => signOut()}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all duration-300 border border-slate-100"
                                    title="Sign Out"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link to="/login" className="btn-primary !h-12 !px-8 !py-0 !text-sm">
                            Start Sharing
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    )
}
