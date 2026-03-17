import { useState, useEffect } from 'react'
import { auth, db } from '../lib/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { Search, MapPin, Calendar, Clock, User, Armchair, ChevronRight, X, ShieldCheck, Loader2, IndianRupee, Leaf, Info, Map as MapIcon, Mail, ArrowRight, CheckCircle2, Play, Car, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import LocationInput from '../components/LocationInput'

export default function Dashboard() {
    const { user } = useAuth()
    const [rides, setRides] = useState([])
    const [loading, setLoading] = useState(true)
    const [requestedRideIds, setRequestedRideIds] = useState(new Set())
    const [filters, setFilters] = useState({
        source: '',
        destination: '',
        source_lat: null,
        source_lng: null,
        dest_lat: null,
        dest_lng: null,
        date: '',
        time: ''
    })
    const [selectedRide, setSelectedRide] = useState(null)

    useEffect(() => {
        if (!user) return
        fetchRides()
        fetchUserRequests()
    }, [user])

    const fetchUserRequests = async () => {
        try {
            const bookingsRef = collection(db, 'bookings')
            const q = query(
                bookingsRef,
                where('passenger_id', '==', user?.uid)
            )
            const querySnapshot = await getDocs(q)
            const activeRequests = querySnapshot.docs
                .map(doc => doc.data())
                .filter(b => ['pending', 'accepted'].includes(b.status))
                .map(b => b.ride_id)
            
            setRequestedRideIds(new Set(activeRequests))
        } catch (error) {
            console.error('Error fetching user requests:', error)
        }
    }

    const fetchRides = async () => {
        try {
            const ridesRef = collection(db, 'rides')
            const q = query(
                ridesRef,
                where('status', 'in', ['planned', 'started']),
                orderBy('departure_time', 'asc')
            )
            const querySnapshot = await getDocs(q)

            const ridesData = await Promise.all(querySnapshot.docs.map(async (rideDoc) => {
                const data = rideDoc.data()

                // Expiration logic: 12 hours after scheduled time
                const departureDate = new Date(data.departure_time)
                const twelveHoursLater = new Date(departureDate.getTime() + 12 * 60 * 60 * 1000)
                if (new Date() > twelveHoursLater) return null

                if (data.seats_available <= 0) return null

                // Fetch driver profile
                const driverSnap = await getDoc(doc(db, 'profiles', data.driver_id))
                return {
                    id: rideDoc.id,
                    ...data,
                    driver: driverSnap.exists() ? driverSnap.data() : { name: 'Unknown Driver' }
                }
            }))

            setRides(ridesData.filter(Boolean))
        } catch (error) {
            console.error('Error fetching rides:', error.message)
            if (error.message.includes('index')) {
                alert("Rydset requires a Firestore index. Check your console for the link.")
            } else {
                alert("Error fetching rides: " + error.message)
            }
        } finally {
            setLoading(false)
        }
    }

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    const getClosestPoint = (point, route) => {
        if (!route || route.length === 0) return { index: -1, distance: Infinity }
        let minIdx = -1
        let minD = Infinity
        route.forEach((p, idx) => {
            // Handle both object {lat, lng} and array [lat, lng] for backward compatibility or different sources
            const pLat = p.lat !== undefined ? p.lat : p[0]
            const pLng = p.lng !== undefined ? p.lng : p[1]
            const d = getDistance(point.lat, point.lng, pLat, pLng)
            if (d < minD) {
                minD = d
                minIdx = idx
            }
        })
        return { index: minIdx, distance: minD }
    }

    const filteredRides = rides.filter(ride => {
        // Initial text matching for fallback or quick filtering
        const textSourceMatch = (ride.source || "").toLowerCase().includes((filters.source || "").toLowerCase())
        const textDestMatch = (ride.destination || "").toLowerCase().includes((filters.destination || "").toLowerCase())

        // Route-based coordinate matching (if coordinates available)
        let routeMatch = false
        if (filters.source_lat && filters.source_lng && filters.dest_lat && filters.dest_lng && ride.route?.length > 0) {
            const sMatch = getClosestPoint({ lat: filters.source_lat, lng: filters.source_lng }, ride.route)
            const dMatch = getClosestPoint({ lat: filters.dest_lat, lng: filters.dest_lng }, ride.route)

            // 5km buffer
            if (sMatch.distance <= 5 && dMatch.distance <= 5 && sMatch.index < dMatch.index) {
                routeMatch = true
            }
        }

        const matchSource = textSourceMatch || routeMatch
        const matchDest = textDestMatch || routeMatch

        let matchDate = true
        if (filters.date) {
            // Use local date (YYYY-MM-DD) instead of UTC toISOString()
            const d = new Date(ride.departure_time)
            const rideDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            matchDate = rideDate === filters.date
        }

        let matchTime = true
        if (filters.time) {
            const rideTime = new Date(ride.departure_time).toTimeString().slice(0, 5)
            const [filterH, filterM] = filters.time.split(':').map(Number)
            const [rideH, rideM] = rideTime.split(':').map(Number)
            const filterMinutes = filterH * 60 + filterM
            const rideMinutes = rideH * 60 + rideM
            matchTime = Math.abs(filterMinutes - rideMinutes) <= 60
        }

        return (routeMatch || (textSourceMatch && textDestMatch)) && matchDate && matchTime
    })

    return (
        <div className="space-y-8">
            <div className="mb-12">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Find a Ride</h1>
                    <p className="text-slate-500 font-medium text-lg">Discover exclusive rides within the Rajagiri academic network.</p>
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-2 bg-white/50 backdrop-blur-md p-2 rounded-[2.5rem] shadow-2xl shadow-rydset-900/10 border border-white/20">
                    <div className="flex-1 min-w-0">
                        <LocationInput
                            placeholder="From..."
                            className="!relative"
                            value={filters.source}
                            onChange={(val) => setFilters({ ...filters, source: val, source_lat: null, source_lng: null })}
                            onSelect={({ name, lat, lon }) => setFilters({ ...filters, source: name, source_lat: lat, source_lng: lon })}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <LocationInput
                            placeholder="To..."
                            className="!relative"
                            value={filters.destination}
                            onChange={(val) => setFilters({ ...filters, destination: val, dest_lat: null, dest_lng: null })}
                            onSelect={({ name, lat, lon }) => setFilters({ ...filters, destination: name, dest_lat: lat, dest_lng: lon })}
                        />
                    </div>
                    <div className="relative w-full md:w-44">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rydset-600/50" size={18} />
                        <input
                            type="date"
                            className="input-field !h-16 !pl-12 !pr-4 !text-xs !rounded-2xl shadow-none bg-white/50 border-transparent focus:bg-white"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        />
                    </div>
                    <div className="relative w-full md:w-36">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-rydset-600/50" size={18} />
                        <input
                            type="time"
                            className="input-field !h-16 !pl-12 !pr-4 !text-xs !rounded-2xl shadow-none bg-white/50 border-transparent focus:bg-white"
                            value={filters.time}
                            onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={fetchRides}
                        className="bg-rydset-600 text-white p-5 rounded-2xl hover:bg-rydset-700 transition-all active:scale-95 shadow-lg shadow-rydset-600/20"
                    >
                        <Search size={24} />
                    </button>
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
                            isOwnRide={ride.driver_id === user?.uid}
                            isRequested={requestedRideIds.has(ride.id)}
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
                        initialFilters={filters}
                        onClose={() => setSelectedRide(null)}
                        onSuccess={() => {
                            setSelectedRide(null)
                            fetchRides()
                            fetchUserRequests()
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function RideCard({ ride, onJoin, isOwnRide, isRequested }) {
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
                    {ride.driver?.vehicle_info?.image_url ? (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-rydset-600/10 group-hover:scale-110 transition-transform shrink-0">
                            <img src={ride.driver.vehicle_info.image_url} alt="Vehicle" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-rydset-600 rounded-2xl flex items-center justify-center text-accent shadow-2xl shadow-rydset-600/10 group-hover:scale-110 transition-transform shrink-0">
                            <User size={32} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-2xl font-black text-rydset-600 tracking-tight">{ride.driver?.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {ride.driver?.vehicle_info?.model || 'Verified RSET Driver'}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                            {ride.driver?.rating_count > 0 ? (
                                <p className="text-sm font-bold text-slate-600 flex items-center gap-1">
                                    <Star size={14} className="fill-amber-400 text-amber-400" /> {ride.driver.average_rating}
                                </p>
                            ) : (
                                <p className="text-[10px] font-black uppercase tracking-widest text-rydset-500 bg-rydset-50 px-2 py-0.5 rounded-full">New</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-accent text-rydset-600 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-accent/20">
                        <ShieldCheck size={16} /> Eco Ride
                    </div>
                    {ride.status === 'started' && (
                        <div className="bg-rydset-600 text-white px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-lg shadow-rydset-600/20 animate-pulse">
                            <Play size={16} />
                            {ride.started_at ? `Started @ ${new Date(ride.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In Progress'}
                        </div>
                    )}
                    {ride.status === 'completed' && (
                        <div className="bg-slate-100 text-slate-400 px-5 py-2 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {ride.ended_at ? `Ended @ ${new Date(ride.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Completed'}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="space-y-4 min-w-0">
                    <div className="flex items-center gap-3 text-slate-400">
                        <MapPin size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Route</span>
                    </div>
                    <div className="relative pl-8 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-rydset-100">
                        <div className="relative">
                            <div className="absolute -left-[35px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/10" />
                            <p className="text-lg font-bold text-rydset-600 leading-tight break-words">{ride.source}</p>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-[35px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                            <p className="text-lg font-bold text-slate-400 leading-tight break-words">{ride.destination}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Calendar size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Schedule</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 md:gap-8">
                        <div>
                            <p className="text-3xl font-black text-slate-900 leading-none">{date}</p>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{time}</p>
                        </div>
                        <div className="hidden sm:block w-px h-12 bg-slate-100" />
                        <div className="bg-rydset-50 p-4 rounded-2xl flex items-center gap-4 border border-rydset-100 shrink-0">
                            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-rydset-600 shadow-lg shadow-accent/10">
                                <Armchair size={28} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-rydset-600 leading-none">{ride.seats_available}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Seats Available</p>
                            </div>
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
                ) : isRequested ? (
                    <button disabled className="h-18 px-12 bg-slate-100 text-slate-400 rounded-[1.75rem] font-black text-xl flex items-center justify-center gap-3 shadow-inner border-2 border-slate-200 cursor-not-allowed">
                        Requested <CheckCircle2 size={24} />
                    </button>
                ) : (
                    <button
                        onClick={onJoin}
                        className="h-18 px-12 bg-rydset-600 hover:bg-rydset-700 text-white rounded-[1.75rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-rydset-600/10 transition-all hover:scale-105 active:scale-95 group/btn"
                    >
                        Request to Join <ChevronRight size={24} className="group-hover/btn:translate-x-2 transition-transform" />
                    </button>
                )}
            </div>
        </motion.div>
    )
}

function JoinRideModal({ ride, onClose, onSuccess, initialFilters }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [routeInfo, setRouteInfo] = useState({ distance: 0, coords: [] })

    // Passenger-specific trip details
    const [passengerTrip, setPassengerTrip] = useState({
        pickup: initialFilters.source || ride.source,
        dropoff: initialFilters.destination || ride.destination,
        pickup_lat: initialFilters.source_lat || ride.from_lat,
        pickup_lng: initialFilters.source_lng || ride.from_lng,
        dropoff_lat: initialFilters.dest_lat || ride.to_lat,
        dropoff_lng: initialFilters.dest_lng || ride.to_lng
    })

    const geocode = async (address) => {
        try {
            const trimmed = address.trim()
            if (!trimmed) return null
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}`)
            const data = await resp.json()
            if (data && data[0]) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                }
            }
            return null
        } catch (err) {
            console.error("Geocoding failed:", err)
            return null
        }
    }

    const handleRecalculate = async () => {
        setLoading(true)
        setError('')
        try {
            const p1 = await geocode(passengerTrip.pickup)
            const p2 = await geocode(passengerTrip.dropoff)

            const newPickupLat = p1?.lat || ride.from_lat
            const newPickupLng = p1?.lon || ride.from_lng
            const newDropoffLat = p2?.lat || ride.to_lat
            const newDropoffLng = p2?.lon || ride.to_lng

            setPassengerTrip(prev => ({
                ...prev,
                pickup_lat: newPickupLat,
                pickup_lng: newPickupLng,
                dropoff_lat: newDropoffLat,
                dropoff_lng: newDropoffLng
            }))

            await fetchRoute(newPickupLat, newPickupLng, newDropoffLat, newDropoffLng)
        } catch (err) {
            setError("Failed to recalculate route. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        handleRecalculate()
    }, [ride])

    const calculateApproxDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance * 1.3; // Approx road distance factor
    }

    const fetchRoute = async (pLat, pLng, dLat, dLng) => {
        // Set initial approximate distance immediately
        let approx = calculateApproxDistance(pLat, pLng, dLat, dLng)

        // If coordinates are same but locations are named differently, assume a default 5km distance
        if (approx < 0.1 && passengerTrip.pickup.toLowerCase() !== passengerTrip.dropoff.toLowerCase()) {
            approx = 5.0;
        }

        setRouteInfo(prev => ({ ...prev, distance: approx }))

        try {
            const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`)
            const data = await resp.json()
            if (data.routes && data.routes[0]) {
                const routeDistance = data.routes[0].distance / 1000
                const coords = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }))

                // If OSRM returns 0 but they are named differently, keep the 5km estimate
                const finalizedDistance = (routeDistance < 0.1 && passengerTrip.pickup.toLowerCase() !== passengerTrip.dropoff.toLowerCase())
                    ? 5.0
                    : routeDistance

                setRouteInfo({
                    distance: finalizedDistance,
                    coords
                })
            }
        } catch (err) {
            console.error("Route calculation error (using fallback):", err)
        }
    }

    const totalFare = (routeInfo.distance * ride.price_per_km).toFixed(2)

    const requestJoin = async () => {
        setLoading(true)
        setError('')
        try {
            const bookingData = {
                ride_id: ride.id,
                passenger_id: user.uid,
                driver_id: ride.driver_id,
                status: 'pending',
                passenger_pickup: passengerTrip.pickup,
                passenger_dropoff: passengerTrip.dropoff,
                distance_km: routeInfo.distance,
                total_fare: parseFloat(totalFare),
                created_at: new Date().toISOString()
            }

            await addDoc(collection(db, 'bookings'), bookingData)
            alert("Join request sent! Wait for the driver to accept.")
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

                <div className="space-y-8">
                    {/* Passenger Trip Overrides */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <LocationInput
                            label="My Pickup Point"
                            placeholder="Pickup address..."
                            value={passengerTrip.pickup}
                            onChange={(val) => setPassengerTrip({ ...passengerTrip, pickup: val })}
                            onSelect={({ name, lat, lon }) => {
                                const newTrip = {
                                    ...passengerTrip,
                                    pickup: name,
                                    pickup_lat: lat,
                                    pickup_lng: lon
                                }
                                setPassengerTrip(newTrip)
                                fetchRoute(lat, lon, passengerTrip.dropoff_lat, passengerTrip.dropoff_lng)
                            }}
                        />
                        <LocationInput
                            label="My Dropoff Point"
                            placeholder="Dropoff address..."
                            value={passengerTrip.dropoff}
                            onChange={(val) => setPassengerTrip({ ...passengerTrip, dropoff: val })}
                            onSelect={({ name, lat, lon }) => {
                                const newTrip = {
                                    ...passengerTrip,
                                    dropoff: name,
                                    dropoff_lat: lat,
                                    dropoff_lng: lon
                                }
                                setPassengerTrip(newTrip)
                                fetchRoute(passengerTrip.pickup_lat, passengerTrip.pickup_lng, lat, lon)
                            }}
                        />
                    </div>

                    <div className="h-72 w-full rounded-[2rem] overflow-hidden border border-rydset-100 shadow-inner bg-slate-50 grayscale-[0.3]">
                        <MapContainer center={[ride.from_lat, ride.from_lng]} zoom={12} className="h-full w-full">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[ride.from_lat, ride.from_lng]} />
                            <Marker position={[ride.to_lat, ride.to_lng]} />
                            {routeInfo.coords.length > 0 && <Polyline positions={routeInfo.coords.map(p => [p.lat, p.lng])} color="#152822" weight={4} opacity={0.8} />}
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

                    {ride.driver?.vehicle_info && (
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                            {ride.driver.vehicle_info.image_url ? (
                                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm shrink-0">
                                    <img src={ride.driver.vehicle_info.image_url} alt="Vehicle" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm shrink-0 border border-slate-100">
                                    <Car size={32} />
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver's Vehicle</p>
                                <p className="font-bold text-slate-700">{ride.driver.vehicle_info.model} • {ride.driver.vehicle_info.number_plate}</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-accent/10 p-6 rounded-[2rem] border border-accent/20 flex gap-5 items-center">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rydset-600 shadow-lg shadow-accent/20">
                            <ShieldCheck size={32} />
                        </div>
                        <div className="text-sm">
                            <p className="font-black text-rydset-600 text-base leading-tight">Secure Request</p>
                            <p className="text-slate-500 font-medium mt-1">The driver will review your request. You'll get an OTP once accepted.</p>
                        </div>
                    </div>

                    <button
                        onClick={requestJoin}
                        disabled={loading || routeInfo.distance === 0}
                        className="w-full btn-primary h-16 text-xl font-black flex items-center justify-center gap-3 shadow-rydset-500/30"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                Send Join Request <ArrowRight size={22} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
