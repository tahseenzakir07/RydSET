import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'

export default function LocationInput({ label, placeholder, value, onChange, onSelect, className = "" }) {
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const wrapperRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef])

    const fetchSuggestions = async (query) => {
        if (query.length < 3) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }
        setLoading(true)
        try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`)
            const data = await resp.json()
            setSuggestions(data)
            setShowSuggestions(true)
        } catch (err) {
            console.error("Autocomplete error:", err)
        } finally {
            setLoading(false)
        }
    }

    const timeoutRef = useRef(null)

    const handleInputChange = (e) => {
        const val = e.target.value
        onChange(val)

        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            fetchSuggestions(val)
        }, 500)
    }

    const handleSelect = (s) => {
        const lat = parseFloat(s.lat)
        const lon = parseFloat(s.lon)

        if (isNaN(lat) || isNaN(lon)) {
            console.error("Invalid coordinates from suggestion:", s)
            return
        }

        onSelect({
            name: s.display_name,
            lat,
            lon
        })
        setShowSuggestions(false)
    }

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && (
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block transition-colors">
                    {label}
                </label>
            )}
            <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-rydset-600/40" size={20} />
                <input
                    type="text"
                    placeholder={placeholder}
                    className="input-field !h-16 !pl-16 !pr-10 !rounded-[2rem] !bg-slate-50 border-transparent focus:!bg-white focus:!border-accent/30 focus:!ring-accent/5 transition-all font-bold w-full"
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                />
                {loading && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-rydset-600/40" size={16} />
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl shadow-rydset-900/10 border border-slate-100 overflow-hidden py-2">
                    {suggestions.map((s, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className="w-full px-8 py-4 text-left hover:bg-slate-50 flex items-start gap-4 transition-colors"
                            onClick={() => handleSelect(s)}
                        >
                            <MapPin className="mt-1 text-rydset-600/30 flex-shrink-0" size={16} />
                            <div>
                                <p className="text-sm font-bold text-slate-900 line-clamp-1">{s.display_name.split(',')[0]}</p>
                                <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{s.display_name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
