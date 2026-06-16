import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  error: null,
  setError: () => {}
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mappa username a email interna
  const getEmailFromUsername = (username) => {
    return `${username.trim().toLowerCase()}@app.internal`
  }

  // Carica il profilo dell'utente dal DB public
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Errore nel caricamento del profilo:', err.message)
      return null
    }
  }

  // Effettua il login
  const login = async (username, password) => {
    setError(null)
    setLoading(true)
    try {
      const email = getEmailFromUsername(username)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          throw new Error('Username o password non validi.')
        }
        throw authError
      }

      // Recupera il profilo subito
      const userProfile = await fetchProfile(data.user.id)
      
      if (!userProfile) {
        throw new Error("Impossibile caricare il profilo dell'utente.")
      }

      if (!userProfile.attivo) {
        await supabase.auth.signOut()
        throw new Error('Questo account è stato disattivato.')
      }

      setUser(data.user)
      setProfile(userProfile)
      return { success: true }
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }

  // Effettua il logout
  const logout = async () => {
    setError(null)
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('Errore durante il logout:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let profileSubscription = null

    // Controlla la sessione all'avvio
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id)
          
          if (userProfile && userProfile.attivo) {
            setUser(session.user)
            setProfile(userProfile)
            
            // Abilita la sottoscrizione real-time per rilevare disattivazioni o cambi ruolo
            profileSubscription = supabase
              .channel(`profile-${session.user.id}`)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'profiles',
                  filter: `id=eq.${session.user.id}`
                },
                (payload) => {
                  const updatedProfile = payload.new
                  setProfile(updatedProfile)
                  
                  // Se l'admin disattiva l'utente, effettua il logout forzato
                  if (!updatedProfile.attivo) {
                    supabase.auth.signOut().then(() => {
                      setUser(null)
                      setProfile(null)
                      setError('Il tuo account è stato disattivato dall\'amministratore.')
                    })
                  }
                }
              )
              .subscribe()
          } else if (userProfile && !userProfile.attivo) {
            // Se l'account è inattivo, forza il logout
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            setError('Questo account è stato disattivato.')
          }
        }
      } catch (err) {
        console.error('Errore durante inizializzazione auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Ascolta i cambiamenti di stato autenticazione di Supabase
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await fetchProfile(session.user.id)
          if (userProfile && userProfile.attivo) {
            setUser(session.user)
            setProfile(userProfile)
            setError(null)
          } else if (userProfile && !userProfile.attivo) {
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            setError('Questo account è stato disattivato.')
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          if (profileSubscription) {
            supabase.removeChannel(profileSubscription)
          }
        }
        setLoading(false)
      }
    )

    return () => {
      authSubscription.unsubscribe()
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription)
      }
    }
  }, [])

  const refreshProfile = async () => {
    if (user?.id) {
      const userProfile = await fetchProfile(user.id)
      if (userProfile) {
        setProfile(userProfile)
      }
    }
  }

  // Notifica accesso admin su Telegram
  useEffect(() => {
    if (profile && (profile.ruolo === 'admin' || profile.stato === 'admin')) {
      const alreadyNotified = sessionStorage.getItem('admin_notified_session')
      if (!alreadyNotified) {
        sessionStorage.setItem('admin_notified_session', 'true')
        
        const getDeviceFriendlyName = () => {
          const ua = navigator.userAgent
          let os = "Dispositivo Sconosciuto"
          
          if (/android/i.test(ua)) {
            const androidMatch = ua.match(/Android\s+([0-9\.]+)/i)
            const androidVer = androidMatch ? `Android ${androidMatch[1]}` : "Android"
            const modelMatch = ua.match(/Android\s+[0-9\.]+;\s+([^;)]+)/i)
            const model = modelMatch ? modelMatch[1].split('Build/')[0].trim() : ""
            os = model ? `${androidVer} (${model})` : androidVer
          } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
            const iosMatch = ua.match(/OS\s+([0-9_]+)\s+like/i) || ua.match(/iPhone OS\s+([0-9_]+)/i)
            const iosVer = iosMatch ? iosMatch[1].replace(/_/g, '.') : ""
            const isIpad = /iPad/.test(ua)
            const name = isIpad ? "iPad" : "iPhone"
            os = iosVer ? `${isIpad ? 'iPadOS' : 'iOS'} ${iosVer} su ${name}` : `${isIpad ? 'iPadOS' : 'iOS'} su ${name}`
          } else if (/Macintosh/i.test(ua)) {
            const macMatch = ua.match(/Mac OS X\s+([0-9_]+)/i)
            const macVer = macMatch ? macMatch[1].replace(/_/g, '.') : ""
            os = macVer ? `macOS ${macVer}` : "macOS"
          } else if (/Windows/i.test(ua)) {
            const winMatch = ua.match(/Windows NT\s+([0-9\.]+)/i)
            let winVer = "Windows"
            if (winMatch) {
              const ntVer = winMatch[1]
              if (ntVer === "10.0") winVer = "Windows 10/11"
              else if (ntVer === "6.3") winVer = "Windows 8.1"
              else if (ntVer === "6.2") winVer = "Windows 8"
              else if (ntVer === "6.1") winVer = "Windows 7"
              else winVer = `Windows NT ${ntVer}`
            }
            os = winVer
          } else if (/Linux/i.test(ua)) {
            os = "Linux"
          }

          let browser = "Browser Sconosciuto"
          if (/chrome|crios/i.test(ua) && !/edge|opr/i.test(ua)) browser = "Chrome"
          else if (/safari/i.test(ua) && !/chrome|crios|edge|opr/i.test(ua)) browser = "Safari"
          else if (/firefox|iceweasel/i.test(ua)) browser = "Firefox"
          else if (/edge/i.test(ua)) browser = "Edge"
          else if (/opr/i.test(ua)) browser = "Opera"

          return `${os} con browser ${browser}`
        }

        const notifyAccess = async () => {
          const deviceName = getDeviceFriendlyName()
          const nomeCognome = profile.nome && profile.cognome ? `${profile.nome} ${profile.cognome}` : profile.username
          const msg = `l'amministratore ${nomeCognome} si è collegato all'interfaccia admin tramite il dispositivo e ${deviceName}`
          
          try {
            await supabase.from('notifications').insert([
              {
                tipo: 'accesso_admin',
                messaggio: msg,
                creato_da: profile.username
              }
            ])
          } catch (err) {
            console.error('Errore nell\'invio della notifica di accesso admin:', err)
          }
        }

        notifyAccess()
      }
    }
  }, [profile])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        logout,
        error,
        setError,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
