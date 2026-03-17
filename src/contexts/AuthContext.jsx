import { useState, useEffect, createContext, useContext } from 'react'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [blockedError, setBlockedError] = useState(false)

    const fetchProfile = async (uid, retries = 3) => {
        try {
            const docRef = doc(db, 'profiles', uid)
            const docSnap = await getDoc(docRef)

            if (!docSnap.exists()) {
                if (retries > 0) {
                    console.warn(`Profile not found for ${uid}, retrying... (${retries} left)`)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    return fetchProfile(uid, retries - 1)
                }
                setProfile(null)
            } else {
                const data = docSnap.data()

                // If the user is blocked, sign them out immediately
                if (data.is_blocked === true) {
                    setBlockedError(true)
                    await firebaseSignOut(auth)
                    setProfile(null)
                    return
                }

                setBlockedError(false)
                setProfile({ id: docSnap.id, ...data })
            }
        } catch (error) {
            console.error('Error fetching profile:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const refreshProfile = () => {
        if (user) {
            setLoading(true)
            fetchProfile(user.uid)
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            if (firebaseUser) {
                fetchProfile(firebaseUser.uid)
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return unsubscribe
    }, [])

    const signOut = () => {
        setBlockedError(false)
        return firebaseSignOut(auth)
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, blockedError }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
