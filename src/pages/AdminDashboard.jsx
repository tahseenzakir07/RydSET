import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, User, Car, Check, X, Loader2, AlertCircle, Users, Ban, CheckCircle2, ShieldOff, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AdminDashboard() {
    const { user, profile, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'approvals'

    const setActiveTab = (tab) => {
        setSearchParams({ tab })
    }

    // Driver approvals state
    const [requests, setRequests] = useState([])
    const [approvalLoading, setApprovalLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)

    // Users management state
    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [blockLoading, setBlockLoading] = useState(null)

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchPendingRequests()
        }
    }, [profile])

    useEffect(() => {
        if (profile?.role === 'admin' && activeTab === 'users') {
            fetchAllUsers()
        }
    }, [activeTab, profile])

    const fetchPendingRequests = async () => {
        try {
            const q = query(collection(db, 'profiles'), where('driver_status', '==', 'pending'))
            const snapshot = await getDocs(q)
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            setRequests(data)
        } catch (error) {
            console.error('Error fetching requests:', error)
        } finally {
            setApprovalLoading(false)
        }
    }

    const fetchAllUsers = async () => {
        setUsersLoading(true)
        try {
            const snapshot = await getDocs(collection(db, 'profiles'))
            const data = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.id !== user.uid) // exclude self
            // Sort: blocked first, then alphabetical
            data.sort((a, b) => {
                if (a.is_blocked && !b.is_blocked) return -1
                if (!a.is_blocked && b.is_blocked) return 1
                return (a.name || '').localeCompare(b.name || '')
            })
            setUsers(data)
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setUsersLoading(false)
        }
    }

    const handleAction = async (userId, action) => {
        setActionLoading(userId)
        try {
            await updateDoc(doc(db, 'profiles', userId), { driver_status: action })
            setRequests(prev => prev.filter(r => r.id !== userId))
        } catch (error) {
            console.error('Error updating status:', error)
            if (error.code === 'permission-denied') {
                alert('Permission Denied: Please update your Firestore Security Rules.')
            } else {
                alert('Failed to update status: ' + error.message)
            }
        } finally {
            setActionLoading(null)
        }
    }

    const handleToggleBlock = async (targetUser) => {
        const newBlocked = !targetUser.is_blocked
        setBlockLoading(targetUser.id)
        try {
            await updateDoc(doc(db, 'profiles', targetUser.id), {
                is_blocked: newBlocked,
                blocked_at: newBlocked ? new Date().toISOString() : null,
                blocked_by: newBlocked ? user.uid : null
            })
            setUsers(prev => prev.map(u =>
                u.id === targetUser.id ? { ...u, is_blocked: newBlocked } : u
            ))
        } catch (error) {
            console.error('Error toggling block:', error)
            if (error.code === 'permission-denied') {
                alert('Permission Denied: Ensure your Firestore rules allow admins to update all profiles.')
            } else {
                alert('Failed to update user: ' + error.message)
            }
        } finally {
            setBlockLoading(null)
        }
    }

    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-rydset-600" size={40} />
        </div>
    )

    if (profile?.role !== 'admin') return <Navigate to="/dashboard" />

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto pb-20 px-4 space-y-8"
        >
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 bg-rydset-600/10 px-4 py-2 rounded-full text-rydset-600 text-sm font-black uppercase tracking-widest mb-4 border border-rydset-600/20">
                    <ShieldCheck size={16} /> Admin Panel
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
                <p className="text-slate-500 font-medium text-lg mt-2">Manage drivers and users across the platform.</p>
            </div>

            {/* Tab Bar */}
            <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200 w-fit">
                <button
                    onClick={() => setActiveTab('approvals')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'approvals' ? 'bg-white text-rydset-600 shadow-lg shadow-rydset-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Car size={16} /> Driver Approvals
                    {requests.length > 0 && (
                        <span className="bg-rydset-600 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-black">
                            {requests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-rydset-600 shadow-lg shadow-rydset-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Users size={16} /> Manage Users
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'approvals' ? (
                    <motion.div key="approvals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {approvalLoading ? (
                            <div className="flex justify-center p-20">
                                <Loader2 className="animate-spin text-rydset-600" size={40} />
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="bg-white p-16 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50 text-center">
                                <div className="w-24 h-24 bg-rydset-50 rounded-full flex items-center justify-center text-rydset-300 mx-auto mb-6">
                                    <Check size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">All Caught Up!</h3>
                                <p className="text-slate-500 mt-2">There are no pending driver requests to review right now.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {requests.map((req) => (
                                    <div key={req.id} className="bg-white p-8 rounded-[3rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50 flex flex-col">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-16 h-16 bg-rydset-50 rounded-2xl flex items-center justify-center text-rydset-600">
                                                <User size={32} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{req.name || 'Unknown User'}</h3>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Approval</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 rounded-[2rem] p-6 mb-8 flex-1 border border-slate-100/50">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Model</p>
                                                        <p className="font-bold text-slate-700">{req.vehicle_info?.model}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reg Number</p>
                                                        <p className="font-bold text-slate-700">{req.vehicle_info?.number_plate}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">License No.</p>
                                                        <p className="font-bold text-slate-700">{req.vehicle_info?.license}</p>
                                                    </div>
                                                </div>
                                                
                                                {req.vehicle_info?.image_url && (
                                                    <div className="mt-4 pt-4 border-t border-slate-200/50">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vehicle Image</p>
                                                        <div className="w-full h-40 bg-white rounded-2xl overflow-hidden border border-slate-200">
                                                            <img src={req.vehicle_info.image_url} alt="Vehicle" className="w-full h-full object-cover" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mt-auto">
                                            <button
                                                onClick={() => handleAction(req.id, 'rejected')}
                                                disabled={actionLoading === req.id}
                                                className="flex-1 h-16 bg-red-50 hover:bg-red-100 text-red-600 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 border border-red-100"
                                            >
                                                {actionLoading === req.id ? <Loader2 className="animate-spin" /> : <X size={20} />} Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'approved')}
                                                disabled={actionLoading === req.id}
                                                className="flex-1 h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/20"
                                            >
                                                {actionLoading === req.id ? <Loader2 className="animate-spin" /> : <Check size={20} />} Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {usersLoading ? (
                            <div className="flex justify-center p-20">
                                <Loader2 className="animate-spin text-rydset-600" size={40} />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="bg-white p-16 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50 text-center">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
                                    <Users size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">No Users Found</h3>
                                <p className="text-slate-500 mt-2">No other users are registered on the platform yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {users.map((u) => (
                                    <motion.div
                                        key={u.id}
                                        layout
                                        className={`bg-white p-6 rounded-[2.5rem] shadow-xl border transition-all ${u.is_blocked ? 'border-red-100 shadow-red-900/5' : 'border-rydset-50/50 shadow-rydset-900/5'}`}
                                    >
                                        <div className="flex items-start gap-4 mb-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${u.is_blocked ? 'bg-red-50 text-red-400' : 'bg-rydset-50 text-rydset-600'}`}>
                                                <User size={28} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-slate-900 truncate">{u.name || 'Unknown'}</h3>
                                                <p className="text-xs text-slate-400 font-medium truncate">{u.email}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {/* Role badge */}
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                                        {u.role || 'student'}
                                                    </span>
                                                    {/* Driver status badge */}
                                                    {u.driver_status === 'approved' && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Car size={10} /> Driver
                                                        </span>
                                                    )}
                                                    {/* Blocked badge */}
                                                    {u.is_blocked && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Ban size={10} /> Blocked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => navigate(`/profile/${u.id}`)}
                                                className="w-full h-10 rounded-[1rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 bg-rydset-50 hover:bg-rydset-100 text-rydset-600 border border-rydset-100"
                                            >
                                                <ExternalLink size={14} /> View Profile
                                            </button>
                                            <button
                                                onClick={() => handleToggleBlock(u)}
                                                disabled={blockLoading === u.id}
                                                className={`w-full h-10 rounded-[1rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                                    u.is_blocked
                                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                        : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100'
                                                }`}
                                            >
                                                {blockLoading === u.id ? (
                                                    <Loader2 className="animate-spin" size={16} />
                                                ) : u.is_blocked ? (
                                                    <><CheckCircle2 size={16} /> Unblock User</>
                                                ) : (
                                                    <><Ban size={16} /> Block User</>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
