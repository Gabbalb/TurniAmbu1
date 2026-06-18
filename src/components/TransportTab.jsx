import { useState } from 'react'
import { Truck } from 'lucide-react'

export default function TransportTab({
  activeTransport,
  profile,
  activeShift,
  activeShiftLoading,
  setView,
  setIsTransportDrawerOpen,
  startLoading,
  onStartNewTransport
}) {
  const [isConfirmingStart, setIsConfirmingStart] = useState(false)

  const handleConfirmStart = async () => {
    await onStartNewTransport()
    setIsConfirmingStart(false)
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-6 text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-400" />
          Servizio Trasporti
        </h2>
        <p className="text-xs text-slate-400 font-sans">Gestisci i trasporti sanitari e assistenziali</p>
      </div>
      
      {!activeTransport ? (
        <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl flex flex-col items-center gap-6 shadow-lg text-center mt-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <Truck className="w-8 h-8" />
          </div>
          
          <div className="space-y-2 flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-100 font-sans">Nessun trasporto attivo</h3>
            {profile?.ruolo !== 'admin' && !activeShiftLoading && !activeShift ? (
              <p className="text-xs text-rose-455 font-medium leading-relaxed max-w-xs font-sans bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-2xl mt-2">
                ⚠️ Per avviare un trasporto devi prima timbrare l'inizio del turno (turno attivo).
              </p>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
                Non hai schede di trasporto attive al momento. Per iniziare a compilarne una nuova, premi il pulsante sottostante.
              </p>
            )}
          </div>
          
          {profile?.ruolo !== 'admin' && !activeShiftLoading && !activeShift ? (
            <button
              onClick={() => setView('clock-shift')}
              className="w-full py-4 bg-gradient-to-tr from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans"
            >
              VAI A TIMBRA TURNO
            </button>
          ) : (
            <button
              onClick={() => setIsConfirmingStart(true)}
              className="w-full py-4 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 active:scale-95 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base font-sans"
            >
              INIZIA NUOVO TRASPORTO
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 shadow-lg text-center mt-4 animate-fade-in">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mx-auto">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 font-sans">Scheda di trasporto attiva</h3>
            <p className="text-xs text-slate-400 font-sans">
              Hai un trasporto in corso (Scheda #{activeTransport.id}). Clicca qui sotto per riaprire e completare la compilazione.
            </p>
          </div>
          
          <button
            onClick={() => setIsTransportDrawerOpen(true)}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
          >
            Apri Scheda
          </button>
        </div>
      )}

      {isConfirmingStart && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in text-center">
          <div className="bg-slate-900/90 border border-slate-800/80 p-6 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-100 font-sans">Nuovo Trasporto</h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-sans">
                  Confermi di voler attivare una nuova scheda di trasporto?
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsConfirmingStart(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={startLoading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 font-sans flex items-center justify-center gap-1.5"
              >
                {startLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creazione...
                  </>
                ) : (
                  'Sì, Attiva'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
