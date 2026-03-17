import { useState } from 'react'
import { db } from '../lib/firebase'
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Send, Loader2, MessageSquare, ShieldCheck } from 'lucide-react'
export default function RatingModal({ 
    booking, 
    onClose, 
    onSuccess,
    userRole = 'passenger' // 'passenger' | 'driver'
}) {
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isRatingDriver = userRole === 'passenger'
    const rateeId = isRatingDriver 
        ? (booking.ride.driver_id || (booking.ride.driver && booking.ride.driver.uid)) 
        : booking.passenger_id
        
    const rateeName = isRatingDriver 
        ? booking.ride.driver?.name 
        : booking.passenger?.name

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a rating')
            return
        }

        setLoading(true)
        setError('')

        try {
            if (!rateeId) throw new Error("Could not identify the user being rated.")

            // 1. Save the new rating
            await addDoc(collection(db, 'ratings'), {
                booking_id: booking.id,
                rater_id: isRatingDriver ? booking.passenger_id : booking.ride.driver_id,
                ratee_id: rateeId,
                rating: rating,
                comment: comment,
                role_rated: isRatingDriver ? 'driver' : 'passenger',
                created_at: serverTimestamp()
            })

            // 2. Mark booking as rated by this user
            const updateField = isRatingDriver ? 'passenger_rated' : 'driver_rated'
            await updateDoc(doc(db, 'bookings', booking.id), { [updateField]: true })

            // 3. Update the ratee's cumulative profile rating
            const profileRef = doc(db, 'profiles', rateeId)
            const profileSnap = await getDoc(profileRef)
            
            if (profileSnap.exists()) {
                const pData = profileSnap.data()
                const currentCount = pData.rating_count || 0
                const currentAvg = pData.average_rating || 0
                
                // Calculate new cumulative average
                const newCount = currentCount + 1
                const newAvg = ((currentAvg * currentCount) + rating) / newCount
                
                const profileUpdates = {
                    average_rating: Number(newAvg.toFixed(2)),
                    rating_count: newCount
                }
                
                // Flag user if rating is less than 3 stars
                if (rating < 3) {
                    profileUpdates.flagged = true
                    profileUpdates.flagged_reason = 'Low rating received'
                }

                await updateDoc(profileRef, profileUpdates)
            }

            onSuccess()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-lg p-8 md:p-12 rounded-[3.5rem] shadow-2xl shadow-rydset-900/20 border border-slate-100 relative"
            >
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-400 transition-all hover:rotate-90"
                >
                    <X size={24} />
                </button>

                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-accent/20 rounded-[2rem] flex items-center justify-center text-rydset-600 mx-auto shadow-xl shadow-accent/10">
                        <Star size={40} className="fill-accent" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                            {isRatingDriver ? 'Rate Your Trip' : 'Rate Your Passenger'}
                        </h2>
                        <p className="text-slate-500 font-medium">
                            How was your {isRatingDriver ? 'ride with' : 'experience with'} <span className="text-rydset-600 font-bold">{rateeName}</span>?
                        </p>
                    </div>

                    {/* Star Rating Logic */}
                    <div className="flex justify-center gap-3 py-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                onClick={() => setRating(star)}
                                className="transition-all duration-300 transform hover:scale-125 focus:outline-none"
                            >
                                <Star
                                    size={42}
                                    className={`${(hover || rating) >= star
                                        ? 'fill-accent text-accent'
                                        : 'text-slate-200'
                                        } transition-colors`}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <MessageSquare className="absolute left-5 top-5 text-slate-300 group-focus-within:text-accent transition-colors" size={20} />
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tell us more about your experience (optional)..."
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] p-5 pl-14 min-h-[140px] focus:bg-white focus:border-accent outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300"
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm font-bold bg-red-50 py-3 px-6 rounded-full inline-block border border-red-100">
                                {error}
                            </p>
                        )}

                        <div className="pt-4">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || rating === 0}
                                className="w-full h-18 bg-rydset-600 hover:bg-rydset-700 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-rydset-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        Submit Rating <Send size={22} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                            <ShieldCheck size={14} className="text-accent" /> Secure Feedback Loop
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
