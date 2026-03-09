import { useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { MessageCircle, Calendar, Clock, MapPin, IndianRupee, CreditCard, ChevronRight, X, Loader2, CheckCircle2, User, Phone, Map, ShieldCheck, Mail, Star, Check, Ban, Play, Armchair, Car } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import RatingModal from '../components/RatingModal'
import Chat from '../components/Chat'

export default function MyBookings() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('trips') // trips | rides
    const [bookings, setBookings] = useState([]) // As passenger
    const [rideRequests, setRideRequests] = useState([]) // Bookings for my rides
    const [myOffers, setMyOffers] = useState([]) // Rides I have created
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)
    const [ratingBooking, setRatingBooking] = useState(null)
    const [activeChat, setActiveChat] = useState(null)
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        if (!user) return

        fetchProfile()

        const bookingsRef = collection(db, 'bookings')

        // Listener for Passenger Trips
        const qTrips = query(
            bookingsRef,
            where('passenger_id', '==', user.uid)
        )
        const unsubscribeTrips = onSnapshot(qTrips, async (snapshot) => {
            const bookingsData = await Promise.all(snapshot.docs.map(async (bookingDoc) => {
                const data = bookingDoc.data()
                const rideSnap = await getDoc(doc(db, 'rides', data.ride_id))
                const rideData = rideSnap.exists() ? rideSnap.data() : null

                let driverData = null
                if (rideData) {
                    const driverSnap = await getDoc(doc(db, 'profiles', rideData.driver_id))
                    driverData = driverSnap.exists() ? driverSnap.data() : { name: 'Unknown', phone: 'N/A' }
                }

                return {
                    id: bookingDoc.id,
                    ...data,
                    ride: rideData ? { ...rideData, driver: driverData } : null
                }
            }))
            // Client-side sort by created_at desc
            setBookings(bookingsData.filter(b => b.ride !== null).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        })

        // Listener for Driver Requests
        const qRides = query(
            bookingsRef,
            where('driver_id', '==', user.uid)
        )
        const unsubscribeRides = onSnapshot(qRides, async (snapshot) => {
            const requestsData = await Promise.all(snapshot.docs.map(async (bookingDoc) => {
                const data = bookingDoc.data()
                const rideSnap = await getDoc(doc(db, 'rides', data.ride_id))
                const rideData = rideSnap.exists() ? rideSnap.data() : null

                const passengerSnap = await getDoc(doc(db, 'profiles', data.passenger_id))
                const passengerData = passengerSnap.exists() ? passengerSnap.data() : { name: 'Unknown', phone: 'N/A' }

                return {
                    id: bookingDoc.id,
                    ...data,
                    ride: rideData,
                    passenger: passengerData
                }
            }))
            // Client-side sort by created_at desc
            setRideRequests(requestsData.filter(r => r.ride !== null).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
            setLoading(false)
        })

        // Listener for Driver's Offered Rides
        const qMyOffers = query(
            collection(db, 'rides'),
            where('driver_id', '==', user.uid),
            orderBy('departure_time', 'desc')
        )
        const unsubscribeMyOffers = onSnapshot(qMyOffers, (snapshot) => {
            const offersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            // Filter out completed rides or older than 12h if needed, but usually we show history too
            setMyOffers(offersData)
        })

        return () => {
            unsubscribeTrips()
            unsubscribeRides()
            unsubscribeMyOffers()
        }
    }, [user])

    const fetchProfile = async () => {
        const snap = await getDoc(doc(db, 'profiles', user.uid))
        if (snap.exists()) setProfile(snap.data())
    }

    // Real-time handles these now
    const fetchBookings = () => { }
    const fetchRideRequests = () => { }

    const handleAcceptRequest = async (bookingId, rideId) => {
        setProcessingId(bookingId)
        try {
            const batch = writeBatch(db)
            const rideRef = doc(db, 'rides', rideId)
            const rideSnap = await getDoc(rideRef)

            if (!rideSnap.exists()) throw new Error('Ride no longer exists.')
            const currentSeats = rideSnap.data().seats_available

            if (currentSeats <= 0) {
                throw new Error('No seats available for this ride anymore.')
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

            // 1. Update Booking Status
            batch.update(doc(db, 'bookings', bookingId), {
                status: 'accepted',
                otp_code: otpCode
            })

            // 2. Reduce Ride Seats immediately
            batch.update(rideRef, {
                seats_available: Math.max(0, currentSeats - 1)
            })

            await batch.commit()
            alert('Request accepted! Seat reserved and passenger notified.')
        } catch (error) {
            alert(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    const handleRejectRequest = async (bookingId) => {
        if (!confirm('Are you sure you want to reject this request?')) return
        setProcessingId(bookingId)
        try {
            await updateDoc(doc(db, 'bookings', bookingId), { status: 'rejected' })
        } catch (error) {
            alert(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    const handleWithdrawRequest = async (bookingId) => {
        if (!confirm('Are you sure you want to withdraw your request?')) return
        setProcessingId(bookingId)
        try {
            await updateDoc(doc(db, 'bookings', bookingId), { status: 'cancelled' })
            alert('Request withdrawn successfully.')
        } catch (error) {
            alert(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    const handleStartRide = async (bookingId, enteredOtp, correctOtp) => {
        if (enteredOtp !== correctOtp) {
            alert('Invalid OTP. Please ask the passenger for the correct code.')
            return
        }

        setProcessingId(bookingId)
        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'started',
                started_at: new Date().toISOString()
            })
            alert('Passenger picked up! Ride started.')
        } catch (error) {
            alert(error.message)
        } finally {
            setProcessingId(null)
        }
    }

    const handleEndTrip = async (bookingId) => {
        if (!confirm('Mark this passenger\'s trip as completed?')) return
        setProcessingId(bookingId)
        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'completed',
                ended_at: new Date().toISOString()
            })
            alert('Passenger trip completed!')
        } catch (error) {
            console.error("Error in handleEndTrip:", error)
            alert(`Permission Error: Could not mark trip as completed. (${error.message})`)
        } finally {
            setProcessingId(null)
        }
    }

    const handleUpdateRideStatus = async (rideId, newStatus) => {
        setProcessingId(rideId)
        try {
            // 1. Update the Ride document first
            try {
                console.log(`Updating ride ${rideId} to status: ${newStatus} at ${new Date().toISOString()}`)
                await updateDoc(doc(db, 'rides', rideId), {
                    status: newStatus,
                    ...(newStatus === 'started' ? { started_at: new Date().toISOString() } : {}),
                    ...(newStatus === 'completed' ? { ended_at: new Date().toISOString() } : {})
                })
                console.log(`Successfully updated ride ${rideId} to ${newStatus}`)
            } catch (rideError) {
                console.error("Permission error updating RIDE document:", rideError)
                alert(`Access Denied: You don't have permission to update this ride's status. (${rideError.message})`)
                return; // Stop here if we can't even update the ride
            }

            // 2. Handle associated Bookings separately
            if (newStatus === 'completed' || newStatus === 'cancelled') {
                console.log(`Querying bookings for ride ${rideId} with driver ${user.uid}`)
                const bookingsRef = collection(db, 'bookings')
                const q = query(
                    bookingsRef,
                    where('ride_id', '==', rideId),
                    where('driver_id', '==', user.uid), // Added explicit driver_id filter for security rules
                    where('status', 'in', ['pending', 'accepted', 'started'])
                )

                let snap;
                try {
                    snap = await getDocs(q)
                    console.log(`Found ${snap.size} bookings to update`)
                } catch (queryError) {
                    console.error("Permission error querying bookings:", queryError)
                    // If we can't query bookings, we still want to finish the ride update alert
                    alert("Ride status updated, but could not update passenger statuses (Permission denied).")
                    return;
                }
                if (!snap.empty) {
                    const batch = writeBatch(db)
                    snap.docs.forEach(bDoc => {
                        const currentStatus = bDoc.data().status
                        let bNewStatus = newStatus

                        if (newStatus === 'completed') {
                            // Only complete if they were picked up, otherwise reject or stay as is
                            if (currentStatus === 'started') {
                                bNewStatus = 'completed'
                                console.log(`Preparing batch update for booking ${bDoc.id} to ${bNewStatus} with ended_at`)
                                batch.update(bDoc.ref, {
                                    status: bNewStatus,
                                    ended_at: new Date().toISOString()
                                })
                            } else if (currentStatus === 'pending' || currentStatus === 'accepted') {
                                bNewStatus = 'rejected'
                                console.log(`Preparing batch update for booking ${bDoc.id} to ${bNewStatus}`)
                                batch.update(bDoc.ref, { status: bNewStatus })
                            } else return // skip
                        } else if (newStatus === 'cancelled') {
                            bNewStatus = 'cancelled'
                            console.log(`Preparing batch update for booking ${bDoc.id} to ${bNewStatus}`)
                            batch.update(bDoc.ref, { status: bNewStatus })
                        }
                    })

                    try {
                        await batch.commit()
                        console.log("Bookings batch update successful")
                    } catch (batchError) {
                        console.error("Permission error or failure updating passenger bookings:", batchError)
                        // Note: We don't alert here because the RIDE status was already successfully updated.
                        // The user can see the individual booking status in the UI anyway.
                    }
                }
            }
            alert(`Ride ${newStatus === 'started' ? 'started' : newStatus === 'completed' ? 'ended' : 'cancelled'} successfully!`)
        } catch (error) {
            console.error(`Root error in handleUpdateRideStatus:`, error)
            alert(`Error: ${error.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 pb-20">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-rydset-600 tracking-tight mb-4">My Rides Hub</h1>
                    <p className="text-slate-500 font-medium text-lg italic">Coordination is the key to perfect carpooling.</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200">
                    <button
                        onClick={() => setActiveTab('trips')}
                        className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'trips' ? 'bg-white text-rydset-600 shadow-lg shadow-rydset-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        My Requests & Trips
                    </button>
                    <button
                        onClick={() => setActiveTab('rides')}
                        className={`px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'rides' ? 'bg-white text-rydset-600 shadow-lg shadow-rydset-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        My Offers
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="animate-spin text-accent" size={48} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing with the network...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {activeTab === 'trips' ? (
                        bookings.map((booking) => (
                            <PassengerTripCard
                                key={booking.id}
                                booking={booking}
                                onWithdraw={() => handleWithdrawRequest(booking.id)}
                                onPay={() => { }}
                                onRate={() => setRatingBooking(booking)}
                                onChat={() => setActiveChat(booking)}
                            />
                        ))
                    ) : (
                        <div className="space-y-12">
                            {/* Offered Rides Section */}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-rydset-600 flex items-center gap-3">
                                    <Car size={24} /> My Scheduled Rides
                                </h2>
                                {myOffers.map((ride) => {
                                    const activeBookingsCount = rideRequests.filter(req =>
                                        req.ride_id === ride.id &&
                                        (req.status === 'accepted' || req.status === 'started')
                                    ).length;

                                    return (
                                        <RideOfferCard
                                            key={ride.id}
                                            ride={ride}
                                            activeBookingsCount={activeBookingsCount}
                                            isProcessing={processingId === ride.id}
                                            onStart={() => handleUpdateRideStatus(ride.id, 'started')}
                                            onEnd={() => handleUpdateRideStatus(ride.id, 'completed')}
                                            onCancel={() => {
                                                if (confirm('Are you sure you want to cancel this ride? This will notify all booked passengers.')) {
                                                    handleUpdateRideStatus(ride.id, 'cancelled')
                                                }
                                            }}
                                        />
                                    );
                                })}
                                {myOffers.length === 0 && <p className="text-slate-400 italic">No rides offered yet.</p>}
                            </div>

                            <div className="h-px bg-slate-100" />

                            {/* Bookings Section */}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-black text-rydset-600 flex items-center gap-3">
                                    <User size={24} /> Passenger Requests
                                </h2>
                                {rideRequests.map((request) => (
                                    <DriverRideCard
                                        key={request.id}
                                        request={request}
                                        isProcessing={processingId === request.id}
                                        onAccept={() => handleAcceptRequest(request.id, request.ride_id)}
                                        onReject={() => handleRejectRequest(request.id)}
                                        onStart={(otp) => handleStartRide(request.id, otp, request.otp_code)}
                                        onEndTrip={() => handleEndTrip(request.id)}
                                        onChat={() => setActiveChat(request)}
                                    />
                                ))}
                                {rideRequests.length === 0 && <p className="text-slate-400 italic">No passenger requests yet.</p>}
                            </div>
                        </div>
                    )}

                    {((activeTab === 'trips' && bookings.length === 0) || (activeTab === 'rides' && myOffers.length === 0 && rideRequests.length === 0)) && (
                        <div className="py-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-rydset-900/5">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                                <Map size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Nothing here yet</h3>
                            <p className="text-slate-400 font-medium">Try searching for a ride or offering one to see it here.</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {ratingBooking && (
                    <RatingModal
                        booking={ratingBooking}
                        onClose={() => setRatingBooking(null)}
                        onSuccess={() => {
                            setRatingBooking(null)
                            fetchBookings()
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {activeChat && (
                    <Chat
                        rideId={activeChat.ride_id}
                        currentUser={{ uid: user.uid, name: profile?.name || user.email }}
                        otherUser={{ name: activeTab === 'trips' ? activeChat.ride?.driver?.name : activeChat.passenger?.name }}
                        onClose={() => setActiveChat(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function PassengerTripCard({ booking, onRate, onWithdraw, onChat }) {
    const { ride } = booking
    const isAccepted = booking.status === 'accepted'
    const isStarted = booking.status === 'started'
    const isCompleted = booking.status === 'completed' || booking.status === 'confirmed'
    const isPending = booking.status === 'pending'

    return (
        <motion.div layout className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-rydset-900/5 flex flex-col md:flex-row">
            <div className={`md:w-48 p-8 flex flex-col items-center justify-center text-center space-y-4 ${isStarted ? 'bg-accent text-rydset-600' : isAccepted ? 'bg-rydset-600 text-white' : isPending ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                {isStarted ? <Play size={32} /> : isAccepted ? <CheckCircle2 size={32} /> : isPending ? <Loader2 className="animate-spin" size={32} /> : <Clock size={32} />}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Trip Status</p>
                    <p className="font-black uppercase tracking-tight text-sm">{booking.status}</p>
                </div>
            </div>

            <div className="flex-1 p-8 md:p-10">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-rydset-600">
                            <MapPin size={18} />
                            <span className="font-black text-xs uppercase tracking-widest">Your Route</span>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-slate-400 text-xs">PICKUP</p>
                            <p className="font-black text-slate-900">{booking.passenger_pickup}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-slate-400 text-xs">DROPOFF</p>
                            <p className="font-black text-slate-900">{booking.passenger_dropoff}</p>
                        </div>
                    </div>

                    <div className="md:text-right space-y-4">
                        <div className="flex items-center md:justify-end gap-2 text-rydset-600">
                            <User size={18} />
                            <span className="font-black text-xs uppercase tracking-widest">Driver</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{ride.driver?.name}</p>
                        <p className="text-sm font-bold text-slate-400">{ride.driver?.phone}</p>
                    </div>
                </div>

                {(booking.started_at || booking.ended_at || ride.started_at || ride.ended_at) && (
                    <div className="mt-8 flex flex-wrap gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                        {(booking.started_at || ride.started_at) && (
                            <div className="flex items-center gap-2">
                                <Play size={14} className="text-rydset-600" />
                                <p className="text-xs font-bold text-slate-500">
                                    Started @ {new Date(booking.started_at || ride.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                        {(booking.ended_at || ride.ended_at) && (
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-red-500" />
                                <p className="text-xs font-bold text-slate-500">
                                    Ended @ {new Date(booking.ended_at || ride.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {isAccepted && (
                    <div className="mt-8 p-6 bg-accent/10 border-2 border-accent/20 rounded-[1.5rem] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Mail size={24} className="text-rydset-600" />
                            <div>
                                <p className="font-black text-rydset-600 leading-none">Your Ride OTP</p>
                                <p className="text-xs text-slate-500 font-medium">Give this to the driver to start the ride</p>
                            </div>
                        </div>
                        <p className="text-3xl font-black tracking-[0.2em] text-rydset-600 bg-white px-6 py-2 rounded-xl shadow-sm border border-accent/20">{booking.otp_code}</p>
                    </div>
                )}
            </div>

            <div className="md:w-64 bg-slate-50 p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-center gap-4">
                <button onClick={onChat} className="w-full h-12 bg-white rounded-xl font-black text-xs uppercase tracking-widest text-rydset-600 border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                    <MessageCircle size={16} /> Chat
                </button>
                {isCompleted && !booking.rated && (
                    <button onClick={onRate} className="w-full h-12 bg-rydset-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rydset-600/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <Star size={16} /> Rate Trip
                    </button>
                )}
                {(isPending || isAccepted) && (
                    <button
                        onClick={onWithdraw}
                        className="w-full h-12 bg-white text-red-500 border border-red-100 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-red-50 active:scale-95"
                    >
                        <Ban size={16} /> Withdraw
                    </button>
                )}
            </div>
        </motion.div>
    )
}

function DriverRideCard({ request, onAccept, onReject, onStart, onEndTrip, isProcessing, onChat }) {
    const { passenger } = request
    const isPending = request.status === 'pending'
    const isAccepted = request.status === 'accepted'
    const isStarted = request.status === 'started'
    const isCompleted = request.status === 'completed'
    const [otpInput, setOtpInput] = useState('')

    return (
        <motion.div layout className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-rydset-900/5 flex flex-col md:flex-row">
            <div className={`md:w-48 p-8 flex flex-col items-center justify-center text-center space-y-4 ${isPending ? 'bg-orange-500 text-white' : isAccepted ? 'bg-rydset-600 text-white' : isCompleted ? 'bg-slate-100 text-slate-400' : 'bg-accent text-rydset-600'}`}>
                {isPending ? <Loader2 className="animate-spin" size={32} /> : isAccepted ? <CheckCircle2 size={32} /> : isCompleted ? <CheckCircle2 size={32} /> : <Play size={32} />}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Request Status</p>
                    <p className="font-black uppercase tracking-tight text-sm">{request.status}</p>
                </div>
            </div>

            <div className="flex-1 p-8 md:p-10">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-rydset-600">
                            <User size={18} />
                            <span className="font-black text-xs uppercase tracking-widest">Passenger</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{passenger.name}</p>
                        <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400">RSET STUDENT</div>
                            <p className="text-sm font-bold text-slate-400">⭐ 4.9</p>
                        </div>
                    </div>

                    <div className="md:text-right space-y-4">
                        <div className="flex items-center md:justify-end gap-2 text-rydset-600">
                            <MapPin size={18} />
                            <span className="font-black text-xs uppercase tracking-widest">Pickup Required</span>
                        </div>
                        <p className="font-black text-slate-900">{request.passenger_pickup}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase">→ TO {request.passenger_dropoff}</p>

                        {(request.started_at || request.ended_at) && (
                            <div className="flex flex-col items-end gap-1 mt-4">
                                {request.started_at && (
                                    <p className="text-[10px] font-black text-rydset-600 uppercase tracking-tighter">
                                        Picked up @ {new Date(request.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                                {request.ended_at && (
                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter">
                                        Dropped off @ {new Date(request.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex items-center md:justify-end gap-2 mt-2 text-accent">
                            <Armchair size={16} />
                            <span className="text-xs font-black uppercase">Ride Seats Left: {request.ride?.seats_available}</span>
                        </div>
                    </div>
                </div>

                {isAccepted && (
                    <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1">
                            <p className="font-black text-rydset-600 leading-none mb-1">Enter Passenger OTP</p>
                            <p className="text-xs text-slate-400 font-medium tracking-tight">Ask the passenger for their 6-digit code to start the ride.</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="000 000"
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value)}
                                className="w-32 h-12 bg-white border-2 border-slate-200 rounded-xl px-4 text-center font-black tracking-widest text-rydset-600 focus:border-accent outline-none"
                            />
                            <button
                                onClick={() => onStart(otpInput)}
                                disabled={isProcessing || otpInput.length < 6}
                                className="px-6 h-12 bg-rydset-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rydset-600/10 flex items-center gap-2 hover:bg-rydset-700 transition-all"
                            >
                                <Play size={16} /> Picked Up
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="md:w-64 bg-slate-50 p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-center gap-4">
                {isStarted ? (
                    <button
                        onClick={onEndTrip}
                        disabled={isProcessing}
                        className="w-full h-12 bg-rydset-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rydset-600/20 flex items-center justify-center gap-2 hover:bg-rydset-700 transition-all"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> End Trip</>}
                    </button>
                ) : (
                    <button onClick={onChat} className="w-full h-12 bg-white rounded-xl font-black text-xs uppercase tracking-widest text-rydset-600 border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <MessageCircle size={16} /> Chat
                    </button>
                )}

                {isPending && (
                    <>
                        <button
                            onClick={onAccept}
                            disabled={isProcessing}
                            className="w-full h-12 bg-rydset-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rydset-600/20 flex items-center justify-center gap-2 hover:bg-rydset-700 active:scale-95 transition-all"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <><Check size={16} /> Accept</>}
                        </button>
                        <button
                            onClick={onReject}
                            disabled={isProcessing}
                            className="w-full h-12 bg-white text-red-500 rounded-xl font-black text-xs uppercase tracking-widest border border-red-100 flex items-center justify-center gap-2 hover:bg-red-50 active:scale-95 transition-all"
                        >
                            <Ban size={16} /> Reject
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    )
}

function RideOfferCard({ ride, onStart, onEnd, onCancel, isProcessing, activeBookingsCount }) {
    const isPlanned = !ride.status || ride.status === 'planned'
    const isStarted = ride.status === 'started'
    const isCompleted = ride.status === 'completed'
    const isCancelled = ride.status === 'cancelled'

    const date = new Date(ride.departure_time).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    })
    const time = new Date(ride.departure_time).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <motion.div layout className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-xl shadow-rydset-900/5 flex flex-col md:flex-row">
            <div className={`md:w-48 p-8 flex flex-col items-center justify-center text-center space-y-4 ${isStarted ? 'bg-accent text-rydset-600' : isCompleted ? 'bg-slate-100 text-slate-400' : isCancelled ? 'bg-red-50 text-red-400' : 'bg-rydset-600 text-white'}`}>
                {isStarted ? <Play size={32} /> : isCompleted ? <CheckCircle2 size={32} /> : isCancelled ? <Ban size={32} /> : <Calendar size={32} />}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ride Status</p>
                    <p className="font-black uppercase tracking-tight text-sm">{ride.status || 'planned'}</p>
                </div>
            </div>

            <div className="flex-1 p-8 md:p-10">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-rydset-600">
                            <MapPin size={18} />
                            <span className="font-black text-xs uppercase tracking-widest">Route</span>
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-slate-900">{ride.source} → {ride.destination}</p>
                            <p className="text-sm font-bold text-slate-400">{date} at {time}</p>
                        </div>
                    </div>

                    <div className="md:text-right space-y-4">
                        <div className="flex items-center md:justify-end gap-2 text-rydset-600">
                            <Armchair size={18} />
                            <span className="font-black text-xs uppercase tracking-widest">Capacity</span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{ride.seats_available} Seats Left</p>
                    </div>
                </div>

                {(ride.started_at || ride.ended_at) && (
                    <div className="mt-6 flex flex-wrap gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        {ride.started_at && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center text-rydset-600">
                                    <Play size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Started At</p>
                                    <p className="text-sm font-bold text-slate-600">{new Date(ride.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        )}
                        {ride.ended_at && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ended At</p>
                                    <p className="text-sm font-bold text-slate-600">{new Date(ride.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 space-y-4">
                    <div className="flex flex-wrap gap-4">
                        {isPlanned ? (
                            <>
                                <button
                                    onClick={onStart}
                                    disabled={isProcessing}
                                    className="px-8 h-14 bg-rydset-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-rydset-600/20 flex items-center gap-3 hover:bg-rydset-700 transition-all active:scale-95"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : <><Play size={20} /> Start Ride</>}
                                </button>
                                <button
                                    onClick={onCancel}
                                    disabled={isProcessing}
                                    className="px-8 h-14 bg-white text-red-500 border border-red-100 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-red-50 transition-all active:scale-95"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : <><Ban size={20} /> Cancel Ride</>}
                                </button>
                            </>
                        ) : isStarted ? (
                            <button
                                onClick={onEnd}
                                disabled={isProcessing || activeBookingsCount > 0}
                                className={`px-8 h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-all ${activeBookingsCount > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95'}`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> End Ride</>}
                            </button>
                        ) : isCompleted ? (
                            <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                <CheckCircle2 size={20} className="text-green-500" />
                                <span className="font-black text-xs uppercase tracking-widest text-slate-400">Ride Status: Completed</span>
                            </div>
                        ) : isCancelled ? (
                            <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border border-red-100 rounded-2xl">
                                <Ban size={20} className="text-red-500" />
                                <span className="font-black text-xs uppercase tracking-widest text-red-400">Ride Status: Cancelled</span>
                            </div>
                        ) : null}
                    </div>

                    {isStarted && activeBookingsCount > 0 && (
                        <p className="text-xs font-bold text-orange-500 flex items-center gap-2">
                            <Info size={14} /> Please drop off all passengers (currently {activeBookingsCount}) before ending the ride.
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
