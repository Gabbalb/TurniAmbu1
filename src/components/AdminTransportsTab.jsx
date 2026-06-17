import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { Search, RefreshCw, Truck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export default function AdminTransportsTab() {
  const [transports, setTransports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'attivo' | 'terminato'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const loadTransports = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: apiErr } = await api.fetchTransportsList()
      if (apiErr) throw apiErr
      setTransports(data || [])
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare i dati dei trasporti.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransports()
  }, [])

  // Filtered transports memo
  const filteredTransports = useMemo(() => {
    return transports.filter(t => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const patientName = (t.paziente_cognome_nome || '').toLowerCase()
        const fromName = (t.da_nome || t.da_via || '').toLowerCase()
        const toName = (t.a_nome || t.a_via || '').toLowerCase()
        const notes = (t.note || '').toLowerCase()
        
        if (
          !patientName.includes(query) &&
          !fromName.includes(query) &&
          !toName.includes(query) &&
          !notes.includes(query)
        ) {
          return false
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && t.stato !== statusFilter) {
        return false
      }

      // 3. Date Filters
      if (startDate && t.data < startDate) return false
      if (endDate && t.data > endDate) return false

      return true
    })
  }, [transports, searchQuery, statusFilter, startDate, endDate])

  const formatDateString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'dd/MM/yyyy', { locale: it })
    } catch (e) {
      return isoString
    }
  }

  const formatTimeString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'HH:mm', { locale: it })
    } catch (e) {
      return ''
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-400" />
            Registro Trasporti
          </h2>
          <p className="text-xs text-slate-400 leading-normal">
            Visualizza, monitora e filtra lo storico di tutte le schede di trasporto compilate dagli operatori.
          </p>
        </div>

        <button
          onClick={loadTransports}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna Lista
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-wrap gap-4 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[240px] space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cerca Paziente o Luogo</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Cerca per nome, destinazione, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9 pr-4 py-3 text-xs font-semibold text-slate-200 outline-none transition-all placeholder:text-slate-700"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-40 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stato</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-3 text-xs font-semibold text-slate-200 outline-none transition-all"
          >
            <option value="all">Tutti gli stati</option>
            <option value="attivo">Attivi</option>
            <option value="terminato">Terminati</option>
          </select>
        </div>

        {/* Date Start */}
        <div className="w-44 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Da Data</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none transition-all"
          />
        </div>

        {/* Date End */}
        <div className="w-44 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">A Data</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Transports Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase select-none">
                <th className="py-3.5 px-4">Stato</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Ora Servizio</th>
                <th className="py-3.5 px-4">Paziente</th>
                <th className="py-3.5 px-4">Percorso</th>
                <th className="py-3.5 px-4">Mezzo (Targa)</th>
                <th className="py-3.5 px-4">Km Iniziali/Finali</th>
                <th className="py-3.5 px-4">Pagamento / Importo</th>
                <th className="py-3.5 px-4">Compilato Da</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTransports.map(t => {
                const isTerminated = t.stato === 'terminato'
                const formattedVehicle = t.vehicles 
                  ? `${t.vehicles.nome} (${t.vehicles.targa || ''})` 
                  : (t.vehicle_id ? `Mezzo #${t.vehicle_id}` : '-')

                // Render Route details cleanly
                const renderLocation = (type, structure, dept, address) => {
                  if (type === 'Abitazione') return address || '-'
                  return `${structure || '-'} ${dept ? `[${dept}]` : ''}`
                }

                // Render compiled operator username
                const operatorName = t.profiles 
                  ? `${t.profiles.nome || ''} ${t.profiles.cognome || ''}`.trim() || t.profiles.username
                  : '-'

                return (
                  <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-4 font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isTerminated 
                          ? 'text-slate-400 bg-slate-850 border border-slate-800' 
                          : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      }`}>
                        {t.stato.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold">{formatDateString(t.data)}</td>
                    <td className="py-4 px-4 font-semibold font-mono text-slate-200">
                      {t.ora_servizio ? t.ora_servizio.slice(0, 5) : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-slate-100">{t.paziente_cognome_nome || 'N/D'}</span>
                        {t.paziente_telefono && <span className="text-[10px] text-slate-500">Tel: {t.paziente_telefono}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex flex-col text-left text-[11px] leading-relaxed">
                        <span><strong className="text-slate-400">Da:</strong> {renderLocation(t.da_tipo_luogo, t.da_nome, t.da_reparto, t.da_via)}</span>
                        <span><strong className="text-slate-400">A:</strong> {renderLocation(t.a_tipo_luogo, t.a_nome, t.a_reparto, t.a_via)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-400">{formattedVehicle}</td>
                    <td className="py-4 px-4 font-mono font-medium">
                      {t.km_iniziali !== null ? t.km_iniziali : '-'} / {t.km_finali !== null ? t.km_finali : '-'}
                      {t.km_finali && t.km_iniziali && (
                        <span className="text-[10px] text-emerald-400 block font-sans">
                          (+{Number(t.km_finali) - Number(t.km_iniziali)} km)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col text-left font-medium">
                        <span className="capitalize">{t.tipo_pagamento || '-'}</span>
                        {t.importo !== null && <span className="text-slate-200 font-bold font-mono">€ {Number(t.importo).toFixed(2)}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-semibold">{operatorName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredTransports.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 font-bold">
              Nessun trasporto trovato.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
