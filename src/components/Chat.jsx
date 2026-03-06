import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/firebase'
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore'
import { Send, User as UserIcon, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Chat({ rideId, currentUser, otherUser, onClose }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const scrollRef = useRef(null)

    useEffect(() => {
        if (!rideId) {
            setLoading(false)
            return
        }

        const messagesRef = collection(db, 'messages')
        const q = query(
            messagesRef,
            where('ride_id', '==', rideId),
            orderBy('created_at', 'asc')
        )

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))

            // Sorting manually because local writes might not have timestamps yet
            const sortedMsgs = msgs.sort((a, b) => {
                const timeA = a.created_at?.toMillis?.() || Date.now()
                const timeB = b.created_at?.toMillis?.() || Date.now()
                return timeA - timeB
            })

            setMessages(sortedMsgs)
            setLoading(false)
        }, (err) => {
            console.error("Chat error:", err)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [rideId])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const messageData = {
            ride_id: rideId,
            sender_id: currentUser.uid,
            sender_name: currentUser.name,
            text: newMessage.trim(),
            created_at: serverTimestamp()
        }

        setNewMessage('')
        try {
            await addDoc(collection(db, 'messages'), messageData)
        } catch (err) {
            console.error("Error sending message:", err)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[600px] border border-slate-100"
            >
                {/* Header */}
                <div className="p-8 bg-rydset-600 text-white flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-rydset-600">
                            <UserIcon size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">{otherUser?.name || 'Chat'}</h3>
                            <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Ride Discussion</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Messages */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50"
                >
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="animate-spin text-rydset-600" size={32} />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No messages yet</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender_id === currentUser.uid ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] p-5 rounded-[2rem] shadow-sm ${msg.sender_id === currentUser.uid
                                    ? 'bg-rydset-600 text-white rounded-br-none'
                                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                                    }`}>
                                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                    <p className={`text-[10px] mt-2 font-black uppercase tracking-tighter ${msg.sender_id === currentUser.uid ? 'text-accent/60' : 'text-slate-300'
                                        }`}>
                                        {msg.created_at?.toDate() ? new Date(msg.created_at.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <form
                    onSubmit={handleSendMessage}
                    className="p-6 bg-white border-t border-slate-100 flex gap-4"
                >
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 h-14 bg-slate-50 border-transparent rounded-[1.5rem] px-6 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-rydset-600/5 transition-all outline-none"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="w-14 h-14 bg-rydset-600 text-white rounded-2xl flex items-center justify-center hover:bg-rydset-700 transition-all shadow-lg shadow-rydset-600/20 active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
