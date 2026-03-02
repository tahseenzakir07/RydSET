import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, MapPin, IndianRupee, CreditCard, ChevronRight, X, Loader2, CheckCircle2, User, Phone, Map, ShieldCheck, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function MyBookings() {
    const { user } = useAuth()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        if (user) fetchBookings()
    }, [user])

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          *,
          ride:rides(
            source,
            destination,
            departure_time,
            driver:profiles(name, phone)
          )
        `)
                .eq('passenger_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setBookings(data)
        } catch (error) {
            console.error('Error fetching bookings:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const cancelBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to cancel this booking?')) return

        setProcessingId(bookingId)
        try {
            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId)

            if (error) throw error
            setBookings(bookings.filter(b => b.id !== bookingId))
        } catch (error) {
            alert(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    const handlePayment = async (bookingId) => {
        setProcessingId(bookingId)
        // Mocking payment gateway delay
        setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('bookings')
                    .update({ payment_status: 'paid' })
                    .eq('id', bookingId)

                if (error) throw error
                fetchBookings()
                alert('Payment Successful! Your ride is confirmed.')
            } catch (error) {
                alert(error.message)
            } finally {
                setProcessingId(null)
            }
        }, 1500)
    }

    return (
        <div className="max-w-5xl mx-auto px-4 pb-20">
            <div className="mb-12">
                <h1 className="text-5xl font-black text-rydset-600 tracking-tight mb-4">My Trips</h1>
                <p className="text-slate-500 font-medium text-lg italic">"A journey of a thousand miles begins with a single share."</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-accent" size={48} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading your adventures...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {bookings.map((booking) => (
                        <BookingCard
                            key={booking.id}
                            booking={booking}
                            onCancel={() => cancelBooking(booking.id)}
                            onPay={() => handlePayment(booking.id)}
                            isProcessing={processingId === booking.id}
                        />
                    ))}
                    {bookings.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-rydset-900/5"
                        >
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                                <Map size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">No active bookings</h3>
                            <p className="text-slate-400 font-medium">Your travel history is currently empty.</p>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    )
}

function BookingCard({ booking, onCancel, onPay, isProcessing }) {
    const { ride } = booking
    const date = new Date(ride.departure_time).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    })
    const time = new Date(ride.departure_time).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    })

    const isConfirmed = booking.status === 'confirmed'
    const isPaid = booking.payment_status === 'paid'

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-rydset-900/5 group"
        >
            <div className="flex flex-col lg:flex-row">
                {/* Status Column */}
                <div className="lg:w-48 bg-rydset-600 p-8 flex lg:flex-col justify-between items-center text-center">
                    <div className="space-y-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${isConfirmed ? 'bg-accent text-rydset-600' : 'bg-orange-500 text-white'}`}>
                            {isConfirmed ? <CheckCircle2 size={32} /> : <Loader2 className="animate-spin" size={32} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                            <p className={`font-black uppercase tracking-tighter ${isConfirmed ? 'text-accent' : 'text-orange-400'}`}>
                                {booking.status}
                            </p>
                        </div>
                    </div>
                    {isPaid && (
                        <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                            <ShieldCheck size={14} className="text-accent" />
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">Paid</span>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 md:p-12 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-rydset-100 rounded-lg flex items-center justify-center text-rydset-600">
                                    <MapPin size={18} />
                                </div>
                                <h3 className="text-xl font-black text-rydset-600 tracking-tight">Route</h3>
                            </div>
                            <div className="relative pl-6 space-y-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                                <div className="relative">
                                    <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-accent ring-4 ring-accent/10" />
                                    <p className="text-sm font-bold text-rydset-600">{ride.source}</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[27px] top-1 w-1.5 h-1.5 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                                    <p className="text-sm font-bold text-slate-800">{ride.destination}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-rydset-100 rounded-lg flex items-center justify-center text-rydset-600">
                                    <Calendar size={18} />
                                </div>
                                <h3 className="text-xl font-black text-rydset-600 tracking-tight">Schedule</h3>
                            </div>
                            <div className="flex gap-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                    <p className="font-black text-slate-900 text-lg">{date}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                                    <p className="font-black text-rydset-600 text-lg">{time}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-accent/10 group-hover:text-rydset-600 transition-colors">
                                <User size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Driver</p>
                                <p className="font-black text-slate-800 leading-tight">{ride.driver?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-accent/10 group-hover:text-rydset-600 transition-colors">
                                <Phone size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Contact</p>
                                <p className="font-black text-slate-800 leading-tight">{ride.driver?.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fare & Actions Column */}
                <div className="lg:w-72 bg-slate-50 p-8 md:p-12 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Fare</p>
                        <p className="text-5xl font-black text-rydset-600 tracking-tighter mb-1">₹{booking.total_fare}</p>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-tight">{booking.distance_km?.toFixed(1)} KM Trip • Verified Fare</p>
                    </div>

                    <div className="space-y-4 lg:mt-0 mt-10">
                        {isConfirmed && !isPaid && (
                            <button
                                onClick={onPay}
                                disabled={isProcessing}
                                className="w-full h-16 bg-rydset-600 hover:bg-rydset-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-rydset-600/10 active:scale-95 transition-all"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> :
                                    <><CreditCard size={24} /> Pay Now</>}
                            </button>
                        )}

                        <button
                            onClick={onCancel}
                            disabled={isProcessing || isPaid}
                            className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-100 active:scale-95'}`}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> :
                                <><X size={18} /> Cancel Booking</>}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
