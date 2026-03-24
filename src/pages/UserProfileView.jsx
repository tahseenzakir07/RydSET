import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../lib/firebase'
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import {
    User, Star, Car, Mail, ShieldCheck, CheckCircle2, Clock, XCircle,
    MapPin, Calendar, Armchair, Loader2, ArrowLeft, MessageSquare, Quote,
    History, Ticket
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function UserProfileView() {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { profile: viewerProfile } = useAuth()
    const isAdmin = viewerProfile?.role === 'admin'

    const [profile, setProfile] = useState(null)
    const [reviews, setReviews] = useState([])
    const [ridesOffered, setRidesOffered] = useState([])
    const [ridesJoined, setRidesJoined] = useState([])
    const [loading, setLoading] = useState(true)
    const [historyLoading, setHistoryLoading] = useState(true)
    const [timeFilter, setTimeFilter] = useState('all') // '1m' | '3m' | '1y' | 'all'

    useEffect(() => {
        if (userId) {
            fetchProfile()
        }
    }, [userId])

    const fetchProfile = async () => {
        setLoading(true)
        try {
            const profileSnap = await getDoc(doc(db, 'profiles', userId))
            if (profileSnap.exists()) {
                setProfile({ id: profileSnap.id, ...profileSnap.data() })
            }

            // Fetch reviews
            const ratingsSnap = await getDocs(
                query(collection(db, 'ratings'), where('ratee_id', '==', userId))
            )
            const rawReviews = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            const enriched = await Promise.all(rawReviews.map(async (r) => {
                try {
                    const raterSnap = await getDoc(doc(db, 'profiles', r.rater_id))
                    return { ...r, rater_name: raterSnap.exists() ? raterSnap.data().name : 'Anonymous' }
                } catch {
                    return { ...r, rater_name: 'Anonymous' }
                }
            }))
            enriched.sort((a, b) => {
                const aTime = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at).getTime()
                const bTime = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at).getTime()
                return bTime - aTime
            })
            setReviews(enriched)
        } catch (err) {
            console.error('Error fetching profile:', err)
        } finally {
            setLoading(false)
        }

        // Fetch ride history (ONLY for admins or self)
        if (isAdmin || userId === viewerProfile?.uid) {
            setHistoryLoading(true)
            try {
                // Rides offered as driver
                const offeredSnap = await getDocs(
                    query(collection(db, 'rides'), where('driver_id', '==', userId))
                )
                const offeredData = offeredSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                offeredData.sort((a, b) => {
                    const aTime = new Date(a.departure_time).getTime()
                    const bTime = new Date(b.departure_time).getTime()
                    return bTime - aTime
                })
                setRidesOffered(offeredData)

                // Rides joined as passenger
                const bookingsSnap = await getDocs(
                    query(collection(db, 'bookings'), where('passenger_id', '==', userId))
                )
                const bookingsRaw = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

                // Enrich with ride info
                const enrichedBookings = await Promise.all(bookingsRaw.map(async (b) => {
                    try {
                        const rideSnap = await getDoc(doc(db, 'rides', b.ride_id))
                        return { ...b, ride: rideSnap.exists() ? rideSnap.data() : null }
                    } catch {
                        return { ...b, ride: null }
                    }
                }))
                enrichedBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                setRidesJoined(enrichedBookings.filter(b => b.ride !== null))
            } catch (err) {
                console.error('Error fetching ride history:', err)
            } finally {
                setHistoryLoading(false)
            }
        }
    }

    const filterByTime = (items, dateField) => {
        if (timeFilter === 'all') return items
        const now = new Date()
        let cutoff = new Date()
        if (timeFilter === '1m') cutoff.setMonth(now.getMonth() - 1)
        if (timeFilter === '3m') cutoff.setMonth(now.getMonth() - 3)
        if (timeFilter === '1y') cutoff.setFullYear(now.getFullYear() - 1)

        return items.filter(item => {
            const d = new Date(item[dateField])
            return d >= cutoff
        })
    }

    const filteredOffered = filterByTime(ridesOffered, 'departure_time')
    const filteredJoined = filterByTime(ridesJoined, 'created_at')

    const formatDate = (ts) => {
        if (!ts) return '—'
        const d = ts?.toDate ? ts.toDate() : new Date(ts)
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const formatDateTime = (ts) => {
        if (!ts) return '—'
        const d = ts?.toDate ? ts.toDate() : new Date(ts)
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
            ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }

    const renderStatusBadge = (p) => {
        if (p?.role === 'admin') return (
            <span className="inline-flex items-center gap-1.5 bg-rydset-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-md shadow-rydset-600/20">
                <ShieldCheck size={13} /> Admin
            </span>
        )
        switch (p?.driver_status) {
            case 'approved': return (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    <CheckCircle2 size={13} /> Approved Driver
                </span>
            )
            case 'pending': return (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    <Clock size={13} /> Pending Approval
                </span>
            )
            case 'rejected': return (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    <XCircle size={13} /> Application Rejected
                </span>
            )
            default: return (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                    <User size={13} /> Passenger
                </span>
            )
        }
    }

    const statusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
            case 'started': return 'bg-rydset-50 text-rydset-600 border-rydset-100'
            case 'cancelled': return 'bg-red-50 text-red-500 border-red-100'
            case 'accepted': return 'bg-blue-50 text-blue-600 border-blue-100'
            default: return 'bg-slate-50 text-slate-500 border-slate-100'
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-rydset-600" size={40} />
        </div>
    )

    if (!profile) return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                <User size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">User Not Found</h2>
            <p className="text-slate-400 mb-8">This profile does not exist or has been removed.</p>
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 font-black text-rydset-600 hover:underline">
                <ArrowLeft size={18} /> Go Back
            </button>
        </div>
    )

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto pb-20 px-4 space-y-8"
        >
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-rydset-600 font-black text-sm uppercase tracking-widest transition-colors"
            >
                <ArrowLeft size={16} /> Back
            </button>

            {/* ── Profile Card ── */}
            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50 flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="w-28 h-28 bg-rydset-50 rounded-[2rem] flex items-center justify-center text-rydset-600 shrink-0">
                    <User size={56} />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                        {profile.name || 'Unnamed User'}
                    </h1>

                    {/* Email — visible to admins or self only */}
                    {(isAdmin || profile.id === viewerProfile?.uid) && (
                        <div className="flex items-center gap-2 text-slate-400 font-medium text-sm mb-4 justify-center md:justify-start">
                            <Mail size={15} /> {profile.email || '—'}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start mt-3">
                        {renderStatusBadge(profile)}
                        {profile.rating_count > 0 ? (
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 px-4 py-1.5 rounded-full text-xs font-black">
                                <Star size={13} className="fill-amber-400 text-amber-400" />
                                {profile.average_rating} <span className="opacity-60">({profile.rating_count})</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 border border-slate-100 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                                ⭐ New on Rydset
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Vehicle Info (if driver) ── */}
            {(profile.driver_status === 'approved' || profile.driver_status === 'pending') && profile.vehicle_info && (
                <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-rydset-50 rounded-2xl flex items-center justify-center text-rydset-600">
                            <Car size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Vehicle Details</h2>
                            <p className="text-slate-400 font-medium text-sm">Registered vehicle information</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {profile.vehicle_info.image_url ? (
                            <div className="w-full md:w-48 h-36 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
                                <img src={profile.vehicle_info.image_url} alt="Vehicle" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-full md:w-48 h-36 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-200 shrink-0">
                                <Car size={40} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 w-full">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Model</p>
                                <p className="font-bold text-slate-700">{profile.vehicle_info.model || '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reg Number</p>
                                <p className="font-bold text-slate-700">{profile.vehicle_info.number_plate || '—'}</p>
                            </div>
                            {(isAdmin || profile.id === viewerProfile?.uid) && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">License No.</p>
                                    <p className="font-bold text-slate-700">{profile.vehicle_info.license || '—'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Ride History (ONLY if admin or self) ── */}
            {(isAdmin || profile.id === viewerProfile?.uid) && (
                <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rydset-50 rounded-2xl flex items-center justify-center text-rydset-600">
                                <History size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Ride History</h2>
                                <p className="text-slate-400 font-medium text-sm">Rides offered and trips taken</p>
                            </div>
                        </div>

                        {/* History Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                                className="appearance-none bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 pr-10 font-black text-xs uppercase tracking-widest text-slate-600 focus:border-rydset-600 outline-none cursor-pointer transition-all"
                            >
                                <option value="all">All Time</option>
                                <option value="1m">Last Month</option>
                                <option value="3m">Last 3 Months</option>
                                <option value="1y">Last Year</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <Clock size={14} />
                            </div>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin text-rydset-600" size={32} />
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Rides Offered */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Car size={16} className="text-rydset-600" />
                                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Rides Offered</h3>
                                    <span className="ml-auto text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{filteredOffered.length}</span>
                                </div>
                                {filteredOffered.length === 0 ? (
                                    <p className="text-slate-400 text-sm italic pl-2">No rides found for this period.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredOffered.slice(0, 10).map((ride) => (
                                            <div key={ride.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <MapPin size={15} className="text-rydset-400 shrink-0" />
                                                    <p className="font-bold text-slate-700 text-sm">
                                                        {ride.source} <span className="text-slate-400">→</span> {ride.destination}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                                        <Calendar size={12} />
                                                        {formatDateTime(ride.departure_time)}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColor(ride.status || 'planned')}`}>
                                                        {ride.status || 'planned'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredOffered.length > 10 && (
                                            <p className="text-xs text-slate-400 text-center font-bold pt-1">+ {filteredOffered.length - 10} more rides</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* Rides Joined */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Ticket size={16} className="text-rydset-600" />
                                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Rides Joined</h3>
                                    <span className="ml-auto text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{filteredJoined.length}</span>
                                </div>
                                {filteredJoined.length === 0 ? (
                                    <p className="text-slate-400 text-sm italic pl-2">No trips found for this period.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredJoined.slice(0, 10).map((booking) => (
                                            <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <MapPin size={15} className="text-rydset-400 shrink-0" />
                                                    <p className="font-bold text-slate-700 text-sm">
                                                        {booking.passenger_pickup} <span className="text-slate-400">→</span> {booking.passenger_dropoff}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                                        <Calendar size={12} />
                                                        {formatDate(booking.created_at)}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColor(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredJoined.length > 10 && (
                                            <p className="text-xs text-slate-400 text-center font-bold pt-1">+ {filteredJoined.length - 10} more trips</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Reviews Section ── */}
            <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl shadow-rydset-900/5 border border-rydset-50/50">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Reviews</h2>
                        <p className="text-slate-400 font-medium text-sm">What others say about this user</p>
                    </div>
                </div>

                {reviews.length === 0 ? (
                    <div className="py-10 text-center bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="w-14 h-14 bg-white border border-slate-100 rounded-[1.25rem] flex items-center justify-center text-slate-200 mx-auto mb-3">
                            <Star size={28} />
                        </div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No reviews yet</p>
                        <p className="text-slate-400 text-sm mt-1">Reviews appear here after completed rides.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex flex-col gap-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-rydset-50 rounded-xl flex items-center justify-center text-rydset-600 shrink-0">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 leading-none">{review.rater_name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                {review.role_rated === 'driver' ? 'Rated as Driver' : 'Rated as Passenger'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star
                                                    key={s}
                                                    size={15}
                                                    className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400">{formatDate(review.created_at)}</p>
                                    </div>
                                </div>
                                {review.comment ? (
                                    <div className="flex gap-3 bg-white rounded-2xl p-4 border border-slate-100">
                                        <Quote size={16} className="text-rydset-300 shrink-0 mt-0.5" />
                                        <p className="text-slate-600 font-medium leading-relaxed text-sm italic">{review.comment}</p>
                                    </div>
                                ) : (
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
