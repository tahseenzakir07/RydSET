import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, updateDoc, collection, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { User, ShieldCheck, Mail, Loader2, Car, Image as ImageIcon, ChevronRight, Hash, CheckCircle2, Clock, XCircle, Star, MessageSquare, Quote } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Profile() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [reviews, setReviews] = useState([])
    const [reviewsLoading, setReviewsLoading] = useState(true)

    const [formData, setFormData] = useState({
        vehicle_model: '',
        vehicle_number: '',
        license_number: '',
        vehicle_image_url: ''
    })

    useEffect(() => {
        if (user?.uid) {
            fetchReviews(user.uid)
        }
    }, [user])

    const fetchReviews = async (uid) => {
        setReviewsLoading(true)
        try {
            const q = query(
                collection(db, 'ratings'),
                where('ratee_id', '==', uid)
            )
            const snapshot = await getDocs(q)
            const rawReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

            // Fetch rater names
            const enriched = await Promise.all(rawReviews.map(async (r) => {
                try {
                    const raterSnap = await getDoc(doc(db, 'profiles', r.rater_id))
                    const raterName = raterSnap.exists() ? raterSnap.data().name : 'Anonymous'
                    return { ...r, rater_name: raterName }
                } catch {
                    return { ...r, rater_name: 'Anonymous' }
                }
            }))

            // Sort by created_at desc (client-side since no index needed)
            enriched.sort((a, b) => {
                const aTime = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at).getTime()
                const bTime = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at).getTime()
                return bTime - aTime
            })

            setReviews(enriched)
        } catch (err) {
            console.error('Failed to fetch reviews:', err)
        } finally {
            setReviewsLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const docRef = doc(db, 'profiles', user.uid)
            const isAutoApprove = profile?.role === 'admin'
            const newStatus = isAutoApprove ? 'approved' : 'pending'
            
            await updateDoc(docRef, {
                vehicle_info: {
                    model: formData.vehicle_model,
                    number_plate: formData.vehicle_number,
                    license: formData.license_number,
                    image_url: formData.vehicle_image_url
                },
                driver_status: newStatus
            })
            setSuccess(isAutoApprove ? 'Vehicle details saved and verified!' : 'Registration submitted successfully! Please wait for admin approval.')
            refreshProfile()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rydset-600" size={40} /></div>

    const renderStatusBadge = () => {
        if (profile?.role === 'admin') {
            return (
                <div className="bg-rydset-600 text-white px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-baseline gap-2 shadow-lg shadow-rydset-600/20">
                    <ShieldCheck size={16} className="translate-y-0.5" /> System Admin
                </div>
            )
        }

        switch (profile?.driver_status) {
            case 'approved':
                return (
                    <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-baseline gap-2">
                        <CheckCircle2 size={16} className="translate-y-0.5" /> Approved Driver
                    </div>
                )
            case 'pending':
                return (
                    <div className="bg-amber-50 text-amber-600 border border-amber-100 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-baseline gap-2">
                        <Clock size={16} className="translate-y-0.5" /> Pending Approval
                    </div>
                )
            case 'rejected':
                return (
                    <div className="bg-red-50 text-red-600 border border-red-100 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-baseline gap-2">
                        <XCircle size={16} className="translate-y-0.5" /> Application Rejected
                    </div>
                )
            default:
                return (
                    <div className="bg-slate-50 text-slate-500 border border-slate-100 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-baseline gap-2">
                        <User size={16} className="translate-y-0.5" /> Passenger Only
                    </div>
                )
        }
    }

    const formatDate = (ts) => {
        if (!ts) return ''
        const d = ts?.toDate ? ts.toDate() : new Date(ts)
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto pb-20 px-4 space-y-8"
        >
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">My Profile</h1>
                <p className="text-slate-500 font-medium text-lg mt-2">Manage your account and driver status.</p>
            </div>

            {/* User Info Card */}
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50 flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="w-32 h-32 bg-rydset-50 rounded-[2rem] flex items-center justify-center text-rydset-600 shrink-0">
                    <User size={64} />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{profile?.name || user?.email?.split('@')[0]}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 font-medium mb-6">
                        <div className="flex items-center gap-2">
                            <Mail size={18} /> {user?.email}
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                        {profile?.rating_count > 0 ? (
                            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-bold border border-amber-100">
                                <Star size={16} className="fill-amber-400 text-amber-400" /> 
                                {profile.average_rating} <span className="text-amber-500/70 text-xs translate-y-px">({profile.rating_count} ratings)</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-slate-100">
                                ⭐ New on Rydset
                            </div>
                        )}
                    </div>
                    {renderStatusBadge()}
                </div>
            </div>

            {/* Driver Registration Section */}
            {(profile?.driver_status === undefined || profile?.driver_status === 'rejected') && (
                <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50">
                    <div className="mb-10">
                        <h3 className="text-2xl font-black text-rydset-600 tracking-tight mb-2">Register as a Driver</h3>
                        <p className="text-slate-500 font-medium">To offer rides, you must register your vehicle and be approved by an administrator.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-[2rem] mb-8 text-sm font-bold flex items-center gap-3">
                            <XCircle size={20} /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-6 rounded-[2rem] mb-8 text-sm font-bold flex items-center gap-3">
                            <CheckCircle2 size={20} /> {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group relative">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Vehicle Model</label>
                                <div className="relative">
                                    <Car className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                    <input
                                        type="text"
                                        name="vehicle_model"
                                        required
                                        placeholder="e.g. Maruti Suzuki Swift"
                                        className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                        value={formData.vehicle_model}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="group relative">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Registration Number</label>
                                <div className="relative">
                                    <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                    <input
                                        type="text"
                                        name="vehicle_number"
                                        required
                                        placeholder="e.g. KL 07 AB 1234"
                                        className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                        value={formData.vehicle_number}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="group relative">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Driving License Number</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                    <input
                                        type="text"
                                        name="license_number"
                                        required
                                        placeholder="License Number"
                                        className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                        value={formData.license_number}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="group relative">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Vehicle Image URL</label>
                                <div className="relative">
                                    <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                    <input
                                        type="url"
                                        name="vehicle_image_url"
                                        required
                                        placeholder="https://example.com/image.jpg"
                                        className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                        value={formData.vehicle_image_url}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-16 px-10 bg-rydset-600 hover:bg-rydset-700 text-white rounded-[1.75rem] font-black text-lg flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-rydset-600/20 w-full md:w-auto justify-center"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Submit for Approval'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {/* Show Vehicle details if pending or approved */}
            {(profile?.driver_status === 'pending' || profile?.driver_status === 'approved') && profile?.vehicle_info && (
                 <div className="bg-slate-50 p-8 md:p-12 rounded-[3.5rem] mt-8 border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start">
                     {profile.vehicle_info.image_url ? (
                         <div className="w-48 h-32 rounded-3xl overflow-hidden shrink-0 bg-white border border-slate-200">
                             <img src={profile.vehicle_info.image_url} alt="Vehicle" className="w-full h-full object-cover" />
                         </div>
                     ) : (
                         <div className="w-48 h-32 rounded-3xl shrink-0 bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                             <Car size={40} />
                         </div>
                     )}
                     <div className="space-y-4 flex-1 w-full">
                         <h3 className="text-xl font-black text-slate-800">Your Vehicle Details</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</p>
                                <p className="font-bold text-slate-700">{profile.vehicle_info.model}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reg Number</p>
                                <p className="font-bold text-slate-700">{profile.vehicle_info.number_plate}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">License</p>
                                <p className="font-bold text-slate-700">{profile.vehicle_info.license}</p>
                            </div>
                         </div>
                     </div>
                 </div>
            )}

            {/* ── My Reviews Section ── */}
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">My Reviews</h3>
                        <p className="text-slate-500 font-medium text-sm">What others say about riding with you</p>
                    </div>
                </div>

                {reviewsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-rydset-600" size={32} />
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-200 mx-auto mb-4">
                            <Star size={32} />
                        </div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No reviews yet</p>
                        <p className="text-slate-400 text-sm mt-1">Complete rides to start collecting reviews.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {reviews.map((review) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex flex-col gap-4"
                            >
                                {/* Header row: reviewer + stars + date */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-rydset-50 rounded-xl flex items-center justify-center text-rydset-600 shrink-0">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 leading-none">{review.rater_name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                {review.role_rated === 'driver' ? 'Rated you as Driver' : 'Rated you as Passenger'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {/* Star row */}
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star
                                                    key={s}
                                                    size={16}
                                                    className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">{formatDate(review.created_at)}</p>
                                    </div>
                                </div>

                                {/* Comment */}
                                {review.comment && (
                                    <div className="flex gap-3 bg-white rounded-2xl p-4 border border-slate-100">
                                        <Quote size={18} className="text-rydset-300 shrink-0 mt-0.5" />
                                        <p className="text-slate-600 font-medium leading-relaxed text-sm italic">{review.comment}</p>
                                    </div>
                                )}
                                {!review.comment && (
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">No written review</p>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
