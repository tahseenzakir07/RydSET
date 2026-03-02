import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, MapPin, Calendar, Clock, User, Armchair, ChevronRight, X, ShieldCheck, Loader2, IndianRupee, Leaf, Info, Map as MapIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'

export default function Dashboard() {
    const { user } = useAuth()
    const [rides, setRides] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedRide, setSelectedRide] = useState(null)

    useEffect(() => {
        fetchRides()
    }, [])

    const fetchRides = async () => {
        try {
            const { data, error } = await supabase
                .from('rides')
                .select(`
          *,
          driver:profiles(name, department, phone)
        `)
                .gt('seats_available', 0)
                .order('departure_time', { ascending: true })

            if (error) throw error
            setRides(data)
        } catch (error) {
            console.error('Error fetching rides:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredRides = rides.filter(ride =>
        ride.source.toLowerCase().includes(search.toLowerCase()) ||
        ride.destination.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Find a Ride</h1>
                    <p className="text-slate-500 font-medium text-lg">Discover exclusive rides within the Rajagiri academic network.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-4 text-rydset-600/50" size={20} />
                    <input
                        type="text"
                        placeholder="Search by source or destination..."
                        className="input-field pl-12 shadow-sm focus:border-accent focus:ring-accent/10 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRides.map((ride) => (
                        <RideCard
                            key={ride.id}
                            ride={ride}
                            onJoin={() => setSelectedRide(ride)}
                            isOwnRide={ride.driver_id === user?.id}
                        />
                    ))}
                    {filteredRides.length === 0 && (
                        <div className="col-span-full py-20 text-center glass rounded-2xl">
                            <p className="text-slate-400">No rides found matching your search.</p>
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {selectedRide && (
                    <JoinRideModal
                        ride={selectedRide}
                        onClose={() => setSelectedRide(null)}
                        onSuccess={() => {
                            setSelectedRide(null)
                            fetchRides()
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function RideCard({ ride, onJoin, isOwnRide }) {
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
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="group bg-white rounded-[3.5rem] border-2 border-slate-50 shadow-xl shadow-rydset-900/5 overflow-hidden hover:border-rydset-100 transition-all duration-500 p-10 md:p-12"
        >
            <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-rydset-600 rounded-2xl flex items-center justify-center text-accent shadow-2xl shadow-rydset-600/10 group-hover:scale-110 transition-transform">
                        <User size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-rydset-600 tracking-tight">{ride.driver?.name}</h3>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Verified RSET Driver</p>
                    </div>
                </div>
                <div className="bg-accent text-rydset-600 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-accent/20">
                    <ShieldCheck size={16} /> Eco Ride
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-400">
                        <MapPin size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Route</span>
                    </div>
                    <div className="relative pl-8 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-rydset-100">
                        <div className="relative">
                            <div className="absolute -left-[35px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/10" />
                            <p className="text-lg font-bold text-rydset-600 leading-tight">{ride.source}</p>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-[35px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                            <p className="text-lg font-bold text-slate-400 leading-tight">{ride.destination}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Calendar size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Schedule</span>
                    </div>
                    <div className="flex gap-10">
                        <div>
                            <p className="text-3xl font-black text-slate-900 leading-none">{date}</p>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{time}</p>
                        </div>
                        <div className="w-px h-12 bg-slate-100" />
                        <div>
                            <div className="flex items-center gap-2">
                                <Armchair className="text-accent" size={24} />
                                <p className="text-3xl font-black text-rydset-600 leading-none">{ride.seats_available}</p>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Seats Open</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t-2 border-slate-50">
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Fare</span>
                    <span className="text-5xl font-black text-rydset-600 tracking-tighter ml-2">₹{ride.price_per_km}</span>
                    <span className="text-lg font-bold text-slate-400 uppercase">/km</span>
                </div>

                {isOwnRide ? (
                    <button disabled className="h-16 px-10 bg-slate-50 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest border border-slate-100 cursor-not-allowed">
                        Your Active Ride
                    </button>
                ) : (
                    <button
                        onClick={onJoin}
                        className="h-18 px-12 bg-rydset-600 hover:bg-rydset-700 text-white rounded-[1.75rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-rydset-600/10 transition-all hover:scale-105 active:scale-95 group/btn"
                    >
                        Book Seat <ChevronRight size={24} className="group-hover/btn:translate-x-2 transition-transform" />
                    </button>
                )}
            </div>
        </motion.div>
    )
}

function JoinRideModal({ ride, onClose, onSuccess }) {
    const { user } = useAuth()
    const [step, setStep] = useState('review') // review | verify
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [generatedOtp, setGeneratedOtp] = useState('')
    const [routeInfo, setRouteInfo] = useState({ distance: 0, coords: [] })

    useEffect(() => {
        fetchRoute()
    }, [ride])

    const fetchRoute = async () => {
        try {
            const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${ride.from_lng},${ride.from_lat};${ride.to_lng},${ride.to_lat}?overview=full&geometries=geojson`)
            const data = await resp.json()
            if (data.routes && data.routes[0]) {
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
                setRouteInfo({
                    distance: data.routes[0].distance / 1000,
                    coords
                })
            }
        } catch (err) {
            console.error("Route calculation error:", err)
        }
    }

    const totalFare = (routeInfo.distance * ride.price_per_km).toFixed(2)

    const requestOTP = async () => {
        setLoading(true)
        setError('')
        try {
            // In a real production app, you'd use a Supabase Edge Function to send email.
            // For this demo, we'll generate a 6-digit code and store it in the pending booking.
            const code = Math.floor(100000 + Math.random() * 900000).toString()
            setGeneratedOtp(code)

            const { error } = await supabase
                .from('bookings')
                .insert({
                    ride_id: ride.id,
                    passenger_id: user.id,
                    otp_code: code,
                    status: 'pending',
                    distance_km: routeInfo.distance,
                    total_fare: parseFloat(totalFare)
                })

            if (error) {
                if (error.code === '23505') throw new Error('You have already booked this ride.')
                throw error
            }

            // Simulation: Telling user we sent an email
            // Normally: await supabase.functions.invoke('send-otp', { body: { email: user.email, otp: code } })
            setStep('verify')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const verifyOTP = async () => {
        setLoading(true)
        setError('')
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'confirmed' })
                .eq('ride_id', ride.id)
                .eq('passenger_id', user.id)
                .eq('otp_code', otp) // Securely verify OTP on server-side

            if (error) throw new Error('Invalid OTP code. Please try again.')
            onSuccess()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-2xl p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-rydset-900/20 border border-slate-100 max-h-[90vh] overflow-y-auto relative"
            >
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rydset-50 rounded-xl flex items-center justify-center text-rydset-600">
                            <Info size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trip Details</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl mb-8 flex items-center gap-3 text-sm font-bold">
                        <Info size={18} /> {error}
                    </div>
                )}

                {step === 'review' ? (
                    <div className="space-y-8">
                        <div className="h-72 w-full rounded-[2rem] overflow-hidden border border-rydset-100 shadow-inner bg-slate-50 grayscale-[0.3]">
                            <MapContainer center={[ride.from_lat, ride.from_lng]} zoom={12} className="h-full w-full">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={[ride.from_lat, ride.from_lng]} />
                                <Marker position={[ride.to_lat, ride.to_lng]} />
                                {routeInfo.coords.length > 0 && <Polyline positions={routeInfo.coords} color="#152822" weight={4} opacity={0.8} />}
                            </MapContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Distance</p>
                                <p className="text-2xl font-black text-slate-900">{routeInfo.distance.toFixed(2)} <span className="text-sm font-bold text-slate-400">km</span></p>
                            </div>
                            <div className="p-6 bg-rydset-100/50 rounded-[2rem] border border-rydset-100">
                                <p className="text-[10px] font-black text-rydset-600/50 uppercase tracking-widest mb-2">Total Fare</p>
                                <p className="text-2xl font-black text-rydset-600">₹{totalFare}</p>
                            </div>
                        </div>

                        <div className="bg-accent/10 p-6 rounded-[2rem] border border-accent/20 flex gap-5 items-center">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rydset-600 shadow-lg shadow-accent/20">
                                <ShieldCheck size={32} />
                            </div>
                            <div className="text-sm">
                                <p className="font-black text-rydset-600 text-base leading-tight">Secure Booking</p>
                                <p className="text-slate-500 font-medium mt-1">An OTP will be sent to your verified email to confirm this request.</p>
                            </div>
                        </div>

                        <button
                            onClick={requestOTP}
                            disabled={loading || routeInfo.distance === 0}
                            className="w-full btn-primary h-16 text-xl font-black flex items-center justify-center gap-3 shadow-rydset-500/30"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Confirm & Send OTP <ArrowRight size={22} />
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10 text-center py-4">
                        <div className="space-y-3">
                            <div className="w-20 h-20 bg-rydset-100 rounded-[2rem] flex items-center justify-center text-rydset-600 mx-auto mb-6 shadow-xl shadow-rydset-600/5">
                                <Mail size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-rydset-600">Verify Your Identity</h3>
                            <p className="text-slate-500 font-medium max-w-xs mx-auto">Enter the 6-digit code sent to <br /><span className="text-rydset-600 font-bold underline decoration-accent underline-offset-4">{user?.email}</span></p>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-accent blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="0 0 0 0 0 0"
                                className="relative w-full text-center text-5xl font-black tracking-[0.4em] h-24 bg-white border-2 border-slate-100 rounded-[2.5rem] focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all outline-none text-rydset-600 placeholder:text-slate-100"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>

                        <p className="text-xs font-bold text-rydset-600 bg-accent/20 px-4 py-2 rounded-full inline-block tracking-wide border border-accent/20">
                            DEBUG MODE: OTP is <span className="underline">{generatedOtp}</span>
                        </p>

                        <button
                            onClick={verifyOTP}
                            disabled={loading || otp.length < 6}
                            className="w-full btn-primary h-16 text-xl font-black flex items-center justify-center gap-3 shadow-rydset-500/30"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Complete Booking <CheckCircle2 size={24} />
                                </>
                            )}
                        </button>

                        <button
                            disabled={loading}
                            onClick={() => setStep('review')}
                            className="text-slate-400 hover:text-slate-600 font-bold text-sm tracking-wide"
                        >
                            Go Back to Review
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
