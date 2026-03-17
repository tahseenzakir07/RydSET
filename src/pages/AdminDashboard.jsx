import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, User, Car, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminDashboard() {
    const { user, profile, loading: authLoading } = useAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)

    useEffect(() => {
        if (profile?.role === 'admin') {
            fetchPendingRequests()
        }
    }, [profile])

    const fetchPendingRequests = async () => {
        try {
            const q = query(collection(db, 'profiles'), where('driver_status', '==', 'pending'))
            const snapshot = await getDocs(q)
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setRequests(data)
        } catch (error) {
            console.error('Error fetching requests:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (userId, action) => {
        setActionLoading(userId)
        try {
            const docRef = doc(db, 'profiles', userId)
            await updateDoc(docRef, {
                driver_status: action
            })
            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== userId))
        } catch (error) {
            console.error('Error updating status:', error)
            if (error.code === 'permission-denied') {
                alert('Permission Denied: Please update your Firestore Security Rules to allow admins to modify other users\' profiles.')
            } else {
                alert('Failed to update status: ' + error.message)
            }
        } finally {
            setActionLoading(null)
        }
    }

    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rydset-600" size={40} /></div>

    if (profile?.role !== 'admin') {
        return <Navigate to="/dashboard" />
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto pb-20 px-4 space-y-8"
        >
            <div className="mb-12">
                <div className="inline-flex items-center gap-2 bg-rydset-600/10 px-4 py-2 rounded-full text-rydset-600 text-sm font-black uppercase tracking-widest mb-4 border border-rydset-600/20">
                    <ShieldCheck size={16} /> Admin Panel
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Driver Approvals</h1>
                <p className="text-slate-500 font-medium text-lg mt-2">Review and verify vehicle details submitted by users.</p>
            </div>

            {loading ? (
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
    )
}
