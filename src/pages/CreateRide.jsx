import { useState } from 'react'
import { auth, db } from '../lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Clock, Armchair, Car, Info, Loader2, IndianRupee, ArrowRight, Sparkles, Navigation, User } from 'lucide-react'
import MapPicker from '../components/MapPicker'
import LocationInput from '../components/LocationInput'
import { motion } from 'framer-motion'

export default function CreateRide() {
    const { user, profile, loading: authLoading, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [profileError, setProfileError] = useState(false)

    const [formData, setFormData] = useState({
        source: '',
        destination: '',
        from_lat: null,
        from_lng: null,
        to_lat: null,
        to_lng: null,
        departure_date: '',
        departure_time: '',
        vehicle_type: 'Car',
        seats_available: 3,
        price_per_km: 10,
        notes: '',
        route: [],
        route_distance: 0
    })

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleLocationChange = (type, latlng) => {
        if (latlng) {
            setFormData(prev => ({
                ...prev,
                [`${type}_lat`]: latlng.lat,
                [`${type}_lng`]: latlng.lng
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!profile) {
            setError('Your user profile was not found. This might be a temporary sync issue.')
            setProfileError(true)
            return
        }

        setLoading(true)
        setError('')

        try {
            // Default coordinates (Rajagiri area) if map selection is skipped
            const defaultLat = 9.9880
            const defaultLng = 76.3533

            const finalizedFromLat = formData.from_lat || defaultLat
            const finalizedFromLng = formData.from_lng || defaultLng
            const finalizedToLat = formData.to_lat || defaultLat
            const finalizedToLng = formData.to_lng || defaultLng

            const departureDatetime = new Date(`${formData.departure_date}T${formData.departure_time}`)

            if (departureDatetime < new Date()) {
                throw new Error('Departure time cannot be in the past.')
            }

            const docRef = await addDoc(collection(db, 'rides'), {
                driver_id: user.uid,
                driver_name: profile.name,
                source: formData.source,
                destination: formData.destination,
                from_lat: finalizedFromLat,
                from_lng: finalizedFromLng,
                to_lat: finalizedToLat,
                to_lng: finalizedToLng,
                departure_time: departureDatetime.toISOString(),
                vehicle_type: formData.vehicle_type,
                seats_available: parseInt(formData.seats_available),
                price_per_km: parseFloat(formData.price_per_km),
                notes: formData.notes,
                route: formData.route || [],
                route_distance: formData.route_distance || 0,
                status: 'planned',
                created_at: serverTimestamp()
            })
            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading Profile...</div>

    if (profile?.driver_status !== 'approved') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto pt-20 px-4 text-center"
            >
                <div className="w-24 h-24 bg-rydset-50 rounded-[2rem] flex items-center justify-center text-rydset-400 mx-auto mb-8 shadow-inner border border-slate-100/50">
                    <Car className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Driver Verification Required</h1>
                <p className="text-slate-500 font-medium text-lg mb-8 max-w-lg mx-auto">
                    To maintain safety and trust in our community, you must register your vehicle and be approved before offering rides.
                </p>
                <button
                    onClick={() => navigate('/profile')}
                    className="inline-flex items-center gap-3 bg-rydset-600 hover:bg-rydset-700 text-white px-8 py-4 rounded-[1.5rem] font-black text-lg transition-all shadow-xl shadow-rydset-600/20 active:scale-95 hover:scale-105"
                >
                    <User size={20} /> Complete Your Profile
                </button>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto pb-20 px-4"
        >
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full text-rydset-600 text-sm font-black uppercase tracking-widest mb-4 border border-accent/20">
                    <Sparkles size={16} /> Community First
                </div>
                <h1 className="text-5xl font-black text-rydset-600 tracking-tight mb-4">Offer a Ride</h1>
                <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">Set your route, choose your price, and help your fellow Rajagarians commute comfortably.</p>
            </div>

            <div className="bg-white p-8 md:p-16 rounded-[3.5rem] shadow-2xl shadow-rydset-900/5 border border-rydset-50/50">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-[2rem] mb-10 flex flex-col gap-2 text-sm font-bold">
                        <div className="flex items-center gap-4">
                            <Info size={20} /> {error}
                        </div>
                        {profileError && (
                            <button
                                onClick={() => {
                                    setError('')
                                    setProfileError(false)
                                    refreshProfile()
                                }}
                                className="w-fit ml-9 mt-2 px-6 py-2 bg-rydset-600 text-white rounded-xl text-sm font-bold hover:bg-rydset-700 transition-all shadow-lg shadow-rydset-600/10"
                            >
                                Retry Loading Profile
                            </button>
                        )}
                        {profileError && (
                            <p className="pl-9 font-medium text-red-500/80 italic text-xs">
                                Tip: Ensure your Firestore Security Rules are published in the Firebase Console.
                            </p>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* Routing Section */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rydset-600 rounded-xl flex items-center justify-center text-accent shadow-lg shadow-rydset-600/20">
                                <Navigation size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-rydset-600 tracking-tight">Route & Map</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <LocationInput
                                label="Start Location"
                                placeholder="Enter Landmark/Point"
                                value={formData.source}
                                onChange={(val) => setFormData({ ...formData, source: val })}
                                onSelect={({ name, lat, lon }) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        source: name,
                                        from_lat: lat,
                                        from_lng: lon
                                    }))
                                }}
                            />
                            <LocationInput
                                label="End Location"
                                placeholder="Enter Landmark/Point"
                                value={formData.destination}
                                onChange={(val) => setFormData({ ...formData, destination: val })}
                                onSelect={({ name, lat, lon }) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        destination: name,
                                        to_lat: lat,
                                        to_lng: lon
                                    }))
                                }}
                            />
                        </div>

                        <div className="rounded-[2.5rem] overflow-hidden border-4 border-slate-50 shadow-inner grayscale-[0.2] hover:grayscale-0 transition-all duration-500">
                            <MapPicker
                                initialSource={formData.from_lat ? { lat: formData.from_lat, lng: formData.from_lng } : null}
                                initialDestination={formData.to_lat ? { lat: formData.to_lat, lng: formData.to_lng } : null}
                                onSourceChange={(latlng) => handleLocationChange('from', latlng)}
                                onDestinationChange={(latlng) => handleLocationChange('to', latlng)}
                                onRouteUpdate={({ coords, distance }) => setFormData(prev => ({ ...prev, route: coords, route_distance: distance }))}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="group relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Departure Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                <input
                                    type="date"
                                    name="departure_date"
                                    required
                                    className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="group relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Time</label>
                            <div className="relative">
                                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                <input
                                    type="time"
                                    name="departure_time"
                                    required
                                    className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="group relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Price per KM</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                <input
                                    type="number"
                                    name="price_per_km"
                                    min="0"
                                    step="0.5"
                                    required
                                    className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                    defaultValue="10"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="group relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Vehicle Type</label>
                            <div className="relative">
                                <Car className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                <select
                                    name="vehicle_type"
                                    className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold appearance-none cursor-pointer"
                                    onChange={handleChange}
                                >
                                    <option value="Car">Car</option>
                                    <option value="Bike">Bike</option>
                                </select>
                            </div>
                        </div>

                        <div className="group relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Available Seats</label>
                            <div className="relative">
                                <Armchair className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600" size={20} />
                                <input
                                    type="number"
                                    name="seats_available"
                                    min="1"
                                    max="10"
                                    required
                                    className="input-field !h-16 !pl-16 !rounded-2xl !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold"
                                    defaultValue="3"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="group relative">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Additional Notes</label>
                        <textarea
                            name="notes"
                            placeholder="Tell passengers about luggage space, music preferences, or specific pickup spots..."
                            className="input-field !h-32 !p-8 !rounded-[2.5rem] !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 font-bold transition-all resize-none"
                            onChange={handleChange}
                        />
                    </div>

                    <div className="bg-rydset-600 p-8 md:p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 group/btn relative overflow-hidden shadow-2xl shadow-rydset-600/10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <p className="text-accent font-black uppercase tracking-widest text-[10px] mb-2">Ready to go?</p>
                            <h3 className="text-3xl font-black tracking-tight">Post your ride offer now.</h3>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative z-10 w-full md:w-auto h-20 px-12 bg-white hover:bg-rydset-50 text-rydset-600 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    Publish Ride <ArrowRight size={28} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </motion.div>
    )
}
