import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
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

  const isLoggingIn = useRef(false)
  const profileSubscriptionRef = useRef(null)

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

  // Imposta la sottoscrizione real-time per il profilo dell'utente
  const setupProfileSubscription = (userId) => {
    if (profileSubscriptionRef.current) {
      supabase.removeChannel(profileSubscriptionRef.current)
    }

    const sub = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          const updatedProfile = payload.new
          
          // Se l'utente è un admin, controlla se il session_token è stato modificato da un altro accesso
          if (updatedProfile.ruolo === 'admin' || updatedProfile.stato === 'admin') {
            const localToken = localStorage.getItem('admin_session_token')
            if (updatedProfile.session_token && updatedProfile.session_token !== localToken) {
              supabase.auth.signOut({ scope: 'local' }).then(() => {
                setUser(null)
                setProfile(null)
                localStorage.removeItem('admin_session_token')
                sessionStorage.removeItem('admin_notified_session')
                setError("Hai effettuato l'accesso da un altro dispositivo. Sessione chiusa.")
              })
              return
            }
          }

          setProfile(updatedProfile)
          
          // Se l'admin disattiva l'utente, effettua il logout forzato
          if (!updatedProfile.attivo) {
            supabase.auth.signOut({ scope: 'local' }).then(() => {
              setUser(null)
              setProfile(null)
              localStorage.removeItem('admin_session_token')
              sessionStorage.removeItem('admin_notified_session')
              setError("Il tuo account è stato disattivato dall'amministratore.")
            })
          }
        }
      )
      .subscribe()

    profileSubscriptionRef.current = sub
  }

  // Effettua il login
  const login = async (username, password) => {
    setError(null)
    setLoading(true)
    isLoggingIn.current = true
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
        await supabase.auth.signOut({ scope: 'local' })
        throw new Error('Questo account è stato disattivato.')
      }

      // Se l'utente è un admin, genera e aggiorna il session_token
      if (userProfile.ruolo === 'admin' || userProfile.stato === 'admin') {
        const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem('admin_session_token', newToken)
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ session_token: newToken })
          .eq('id', userProfile.id)
        
        if (updateError) {
          throw new Error("Impossibile salvare la sessione nel database: " + updateError.message)
        }
        
        userProfile.session_token = newToken
        setupProfileSubscription(userProfile.id)
      } else {
        // Se non è admin, assicuriamoci di pulire eventuali vecchi canali
        if (profileSubscriptionRef.current) {
          supabase.removeChannel(profileSubscriptionRef.current)
          profileSubscriptionRef.current = null
        }
      }

      setUser(data.user)
      setProfile(userProfile)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      isLoggingIn.current = false
      setLoading(false)
    }
  }

  // Effettua il logout
  const logout = async () => {
    setError(null)
    setLoading(true)
    try {
      localStorage.removeItem('admin_session_token')
      sessionStorage.removeItem('admin_notified_session')
      await supabase.auth.signOut({ scope: 'local' })
      setUser(null)
      setProfile(null)
      if (profileSubscriptionRef.current) {
        supabase.removeChannel(profileSubscriptionRef.current)
        profileSubscriptionRef.current = null
      }
    } catch (err) {
      console.error('Errore durante il logout:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let initialized = false

    const handleAuth = async (session) => {
      if (!session?.user) {
        setUser(null)
        setProfile(null)
        localStorage.removeItem('admin_session_token')
        sessionStorage.removeItem('admin_notified_session')
        if (profileSubscriptionRef.current) {
          supabase.removeChannel(profileSubscriptionRef.current)
          profileSubscriptionRef.current = null
        }
        setLoading(false)
        return
      }

      // Se stiamo effettuando l'accesso (login attivo), non eseguiamo i controlli in questo listener
      if (isLoggingIn.current) {
        return
      }

      try {
        const userProfile = await fetchProfile(session.user.id)
        if (userProfile && userProfile.attivo) {
          // Se l'utente è un admin, controlla il session_token
          if (userProfile.ruolo === 'admin' || userProfile.stato === 'admin') {
            let localToken = localStorage.getItem('admin_session_token')
            if (!localToken && !userProfile.session_token) {
              localToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
              localStorage.setItem('admin_session_token', localToken)
              
              await supabase
                .from('profiles')
                .update({ session_token: localToken })
                .eq('id', userProfile.id)
              
              userProfile.session_token = localToken
            } else if (userProfile.session_token !== localToken) {
              // Mismatch! Forza logout (accesso da altro dispositivo)
              await supabase.auth.signOut({ scope: 'local' })
              setUser(null)
              setProfile(null)
              localStorage.removeItem('admin_session_token')
              sessionStorage.removeItem('admin_notified_session')
              setError("Hai effettuato l'accesso da un altro dispositivo. Sessione chiusa.")
              setLoading(false)
              return
            }
          }

          setUser(session.user)
          setProfile(userProfile)
          setupProfileSubscription(session.user.id)
          setError(null)
        } else if (userProfile && !userProfile.attivo) {
          await supabase.auth.signOut({ scope: 'local' })
          setUser(null)
          setProfile(null)
          localStorage.removeItem('admin_session_token')
          sessionStorage.removeItem('admin_notified_session')
          setError('Questo account è stato disattivato.')
        }
      } catch (err) {
        console.error('Errore durante gestione auth:', err)
      } finally {
        setLoading(false)
      }
    }

    // Ascolta i cambiamenti di stato autenticazione di Supabase
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          initialized = true
          setUser(null)
          setProfile(null)
          localStorage.removeItem('admin_session_token')
          sessionStorage.removeItem('admin_notified_session')
          if (profileSubscriptionRef.current) {
            supabase.removeChannel(profileSubscriptionRef.current)
            profileSubscriptionRef.current = null
          }
          setLoading(false)
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (event === 'INITIAL_SESSION' && initialized) return
          initialized = true
          await handleAuth(session)
        }
      }
    )

    // Fallback getSession per garantire l'avvio della sessione
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized) {
        initialized = true
        handleAuth(session)
      }
    })

    return () => {
      authSubscription.unsubscribe()
      if (profileSubscriptionRef.current) {
        supabase.removeChannel(profileSubscriptionRef.current)
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

  // Polling e focus check per velocizzare e forzare lo sloggamento se session_token cambia
  useEffect(() => {
    if (!user || !(profile?.ruolo === 'admin' || profile?.stato === 'admin')) {
      return
    }

    const checkSessionToken = async () => {
      try {
        const userProfile = await fetchProfile(user.id)
        if (userProfile) {
          const localToken = localStorage.getItem('admin_session_token')
          if (userProfile.session_token && userProfile.session_token !== localToken) {
            await supabase.auth.signOut({ scope: 'local' })
            setUser(null)
            setProfile(null)
            localStorage.removeItem('admin_session_token')
            sessionStorage.removeItem('admin_notified_session')
            setError("Hai effettuato l'accesso da un altro dispositivo. Sessione chiusa.")
          }
        }
      } catch (err) {
        console.error("Errore durante il controllo periodico del token:", err)
      }
    }

    // Controlla periodicamente ogni 10 secondi per massima reattività
    const intervalId = setInterval(checkSessionToken, 10000)

    // Controlla immediatamente quando l'utente torna alla scheda/finestra (focus o visibilità)
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSessionToken()
      }
    }

    window.addEventListener('focus', handleFocusOrVisibility)
    document.addEventListener('visibilitychange', handleFocusOrVisibility)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', handleFocusOrVisibility)
      document.removeEventListener('visibilitychange', handleFocusOrVisibility)
    }
  }, [user, profile])

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
