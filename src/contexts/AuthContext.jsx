import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async (id, retries = 3) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                if (retries > 0 && (error.code === 'PGRST116' || error.message.includes('JSON'))) {
                    console.warn(`Profile not found for ${id}, retrying... (${retries} left)`)
                    await new Promise(resolve => setTimeout(resolve, 1500))
                    return fetchProfile(id, retries - 1)
                }
                throw error
            }
            setProfile(data)
        } catch (error) {
            console.error('Error fetching profile:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const refreshProfile = () => {
        if (user) {
            setLoading(true)
            fetchProfile(user.id)
        }
    }

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) console.error("Session fetch error:", error)
            const session = data?.session
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else setLoading(false)
        })

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else {
                setProfile(null)
                setLoading(false)
            }
        })

        const subscription = data?.subscription

        return () => subscription?.unsubscribe()
    }, [])

    const signOut = () => supabase.auth.signOut()

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
