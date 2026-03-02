import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

// Fix for default marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

export default function MapPicker({ onSourceChange, onDestinationChange, initialSource, initialDestination }) {
    const [source, setSource] = useState(initialSource || null)
    const [destination, setDestination] = useState(initialDestination || null)
    const [route, setRoute] = useState([])
    const [distance, setDistance] = useState(0)

    // Kerala / Kochi center
    const center = [9.9312, 76.2673]

    function LocationMarker() {
        useMapEvents({
            click(e) {
                if (!source) {
                    setSource(e.latlng)
                    onSourceChange(e.latlng)
                } else if (!destination) {
                    setDestination(e.latlng)
                    onDestinationChange(e.latlng)
                } else {
                    // Reset both
                    setSource(e.latlng)
                    setDestination(null)
                    onSourceChange(e.latlng)
                    onDestinationChange(null)
                    setRoute([])
                    setDistance(0)
                }
            },
        })

        return (
            <>
                {source && <Marker position={source}><L.Tooltip permanent direction="top">Source</L.Tooltip></Marker>}
                {destination && <Marker position={destination}><L.Tooltip permanent direction="top">Destination</L.Tooltip></Marker>}
            </>
        )
    }

    useEffect(() => {
        if (source && destination) {
            calculateRoute()
        }
    }, [source, destination])

    const calculateRoute = async () => {
        // Simple OSRM API call (public)
        try {
            const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`)
            const data = await resp.json()
            if (data.routes && data.routes[0]) {
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
                setRoute(coords)
                setDistance(data.routes[0].distance / 1000) // KM
            }
        } catch (err) {
            console.error("Route calculation error:", err)
        }
    }

    return (
        <div className="space-y-4">
            <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-white/10">
                <MapContainer center={center} zoom={13} scrollWheelZoom={true} className="h-full w-full">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {source && <Marker position={source}><L.Tooltip permanent direction="top">Source</L.Tooltip></Marker>}
                    {destination && <Marker position={destination}><L.Tooltip permanent direction="top">Destination</L.Tooltip></Marker>}
                    {route.length > 0 && <Polyline positions={route} color="#152822" weight={4} opacity={0.8} />}
                    <LocationMarker />
                </MapContainer>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-500 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="font-bold">{!source ? "Select Source on Map" : !destination ? "Select Destination on Map" : "Route Locked"}</p>
                {distance > 0 && <p className="font-black text-rydset-600 bg-accent/20 px-3 py-1 rounded-full border border-accent/20">Approx. {distance.toFixed(2)} km</p>}
            </div>
        </div>
    )
}
