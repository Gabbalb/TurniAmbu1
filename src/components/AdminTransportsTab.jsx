import React, { useState, useEffect, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { api } from '../lib/api'
import { Search, RefreshCw, Truck, X, Edit, Trash2, Download, User, Calendar, Clock, MapPin, DollarSign, CheckCircle, Save, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

// Parse hidden JSON metadata from note field
const parseExternalCrewFromNotes = (noteText) => {
  if (!noteText) return { notes: '', ce_esterno: '', as_esterno: '' }
  const match = noteText.match()
  if (match) {
    try {
      const meta = JSON.parse(match[1])
      const notes = noteText.replace().trim()
      return { notes, ce_esterno: meta.ce_esterno || '', as_esterno: meta.as_esterno || '' }
    } catch (e) {
      return { notes: noteText, ce_esterno: '', as_esterno: '' }
    }
  }
  return { notes: noteText, ce_esterno: '', as_esterno: '' }
}

// Build note text appending hidden JSON metadata
const buildNotesWithExternalCrew = (userNotes, ceEsterno, asEsterno) => {
  const notesPart = (userNotes || '').trim()
  if (!ceEsterno && !asEsterno) return notesPart
  const meta = { ce_esterno: ceEsterno || '', as_esterno: asEsterno || '' }
  return `${notesPart}\n\n`
}

const formatDateString = (isoString) => {
  if (!isoString) return ''
  try {
    return format(parseISO(isoString), 'dd/MM/yyyy', { locale: it })
  } catch (e) {
    return isoString
  }
}

const formatDateTimeString = (isoString) => {
  if (!isoString) return ''
  try {
    return format(parseISO(isoString), 'dd/MM/yyyy HH:mm', { locale: it })
  } catch (e) {
    return isoString
  }
}

export default function AdminTransportsTab() {
  const [transports, setTransports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'attivo' | 'terminato'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Detail / Edit States
  const [selectedTransportId, setSelectedTransportId] = useState(null)
  const [selectedTransport, setSelectedTransport] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Users and Vehicles lists for dropdowns
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers] = useState([])

  // Edit form states
  const [editForm, setEditForm] = useState({
    paziente_cognome_nome: '',
    paziente_telefono: '',
    paziente_codice_fiscale: '',
    data: '',
    ora_servizio: '',
    stato: 'attivo',
    tipo_trasporto: 'dimissione',
    altro_descrizione: '',
    variante_ar: '',
    vehicle_id: '',
    km_iniziali: '',
    km_finali: '',
    tipo_pagamento: '',
    importo: '',
    da_tipo_luogo: 'ospedale',
    da_nome: '',
    da_reparto: '',
    da_via: '',
    a_tipo_luogo: 'abitazione',
    a_nome: '',
    a_reparto: '',
    a_via: '',
    note: '',
    ce_user_id: '',
    ce_esterno: '',
    is_ce_esterno: false,
    as_user_id: '',
    as_esterno: '',
    is_as_esterno: false
  })

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
    const loadAssets = async () => {
      try {
        const { data: vehs } = await api.fetchVehicles()
        setVehicles(vehs || [])
        const { data: profs } = await api.fetchProfiles()
        setUsers(profs || [])
      } catch (err) {
        console.error(err)
      }
    }
    loadAssets()
  }, [])

  const handleOpenDetail = async (transportId) => {
    setSelectedTransportId(transportId)
    setIsDetailOpen(true)
    setIsEditing(false)
    setDeleteConfirm(false)
    setDetailLoading(true)
    try {
      const { data, error } = await api.fetchTransportDetail(transportId)
      if (error) throw error
      setSelectedTransport(data)
      
      // Populate edit form
      const { notes, ce_esterno, as_esterno } = parseExternalCrewFromNotes(data.note)
      const activeCe = data.crew?.find(c => c.ruolo === 'CE' && c.attivo)
      const activeAs = data.crew?.find(c => c.ruolo === 'AS' && c.attivo)
      
      setEditForm({
        paziente_cognome_nome: data.paziente_cognome_nome || '',
        paziente_telefono: data.paziente_telefono || '',
        paziente_codice_fiscale: data.paziente_codice_fiscale || '',
        data: data.data || '',
        ora_servizio: data.ora_servizio ? data.ora_servizio.slice(0, 5) : '',
        stato: data.stato || 'attivo',
        tipo_trasporto: data.tipo_trasporto || 'dimissione',
        altro_descrizione: data.altro_descrizione || '',
        variante_ar: data.variante_ar || '',
        vehicle_id: data.vehicle_id || '',
        km_iniziali: data.km_iniziali !== null ? String(data.km_iniziali) : '',
        km_finali: data.km_finali !== null ? String(data.km_finali) : '',
        tipo_pagamento: data.tipo_pagamento || '',
        importo: data.importo !== null ? String(data.importo) : '',
        da_tipo_luogo: data.da_tipo_luogo || 'ospedale',
        da_nome: data.da_nome || '',
        da_reparto: data.da_reparto || '',
        da_via: data.da_via || '',
        a_tipo_luogo: data.a_tipo_luogo || 'abitazione',
        a_nome: data.a_nome || '',
        a_reparto: data.a_reparto || '',
        a_via: data.a_via || '',
        note: notes,
        ce_user_id: activeCe?.user_id || '',
        ce_esterno: ce_esterno || '',
        is_ce_esterno: !!ce_esterno,
        as_user_id: activeAs?.user_id || '',
        as_esterno: as_esterno || '',
        is_as_esterno: !!as_esterno
      })
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare i dettagli del trasporto.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    setSaveLoading(true)
    try {
      const fullNote = buildNotesWithExternalCrew(
        editForm.note, 
        editForm.is_ce_esterno ? editForm.ce_esterno : '', 
        editForm.is_as_esterno ? editForm.as_esterno : ''
      )
      
      const transportUpdates = {
        paziente_cognome_nome: editForm.paziente_cognome_nome || null,
        paziente_telefono: editForm.paziente_telefono || null,
        paziente_codice_fiscale: editForm.paziente_codice_fiscale || null,
        data: editForm.data,
        ora_servizio: editForm.ora_servizio ? `${editForm.ora_servizio}:00` : null,
        stato: editForm.stato,
        tipo_trasporto: editForm.tipo_trasporto,
        altro_descrizione: editForm.tipo_trasporto === 'altro' ? editForm.altro_descrizione : null,
        variante_ar: (editForm.tipo_trasporto === 'visita' || editForm.tipo_trasporto === 'altro') ? (editForm.variante_ar || null) : null,
        vehicle_id: editForm.vehicle_id ? Number(editForm.vehicle_id) : null,
        km_iniziali: editForm.km_iniziali !== '' ? Number(editForm.km_iniziali) : null,
        km_finali: editForm.km_finali !== '' ? Number(editForm.km_finali) : null,
        tipo_pagamento: editForm.tipo_pagamento || null,
        importo: (editForm.tipo_pagamento && editForm.tipo_pagamento !== 'convenzione' && editForm.importo !== '') ? Number(editForm.importo) : null,
        da_tipo_luogo: editForm.da_tipo_luogo,
        da_nome: editForm.da_tipo_luogo !== 'abitazione' ? editForm.da_nome : null,
        da_reparto: editForm.da_tipo_luogo !== 'abitazione' ? editForm.da_reparto : null,
        da_via: editForm.da_tipo_luogo === 'abitazione' ? editForm.da_via : null,
        a_tipo_luogo: editForm.a_tipo_luogo,
        a_nome: editForm.a_tipo_luogo !== 'abitazione' ? editForm.a_nome : null,
        a_reparto: editForm.a_tipo_luogo !== 'abitazione' ? editForm.a_reparto : null,
        a_via: editForm.a_tipo_luogo === 'abitazione' ? editForm.a_via : null,
        note: fullNote || null
      }

      // Update transports table fields
      const { error: tErr } = await api.updateTransportFields(selectedTransportId, transportUpdates)
      if (tErr) throw tErr

      // Update CE crew member
      const activeCe = selectedTransport.crew?.find(c => c.ruolo === 'CE' && c.attivo)
      if (editForm.is_ce_esterno) {
        if (activeCe) {
          await api.updateTransportCrewMember(selectedTransportId, 'CE', null)
        }
      } else {
        if (editForm.ce_user_id !== (activeCe?.user_id || '')) {
          await api.updateTransportCrewMember(selectedTransportId, 'CE', editForm.ce_user_id || null)
        }
      }

      // Update AS crew member
      const activeAs = selectedTransport.crew?.find(c => c.ruolo === 'AS' && c.attivo)
      if (editForm.is_as_esterno) {
        if (activeAs) {
          await api.updateTransportCrewMember(selectedTransportId, 'AS', null)
        }
      } else {
        if (editForm.as_user_id !== (activeAs?.user_id || '')) {
          await api.updateTransportCrewMember(selectedTransportId, 'AS', editForm.as_user_id || null)
        }
      }

      // Reload detail and main list
      await handleOpenDetail(selectedTransportId)
      loadTransports()
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      alert('Errore durante il salvataggio delle modifiche.')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteTransport = async () => {
    try {
      const { error } = await api.deleteTransport(selectedTransportId)
      if (error) throw error
      setIsDetailOpen(false)
      loadTransports()
    } catch (err) {
      console.error(err)
      alert('Errore durante la cancellazione del trasporto.')
    }
  }

  const handlePrintPDF = () => {
    if (!selectedTransport) return

    const vehicle = vehicles.find(v => v.id === selectedTransport.vehicle_id)
    const vehicleName = vehicle ? `${vehicle.nome}${vehicle.targa ? ` (${vehicle.targa})` : ''}` : 'N/D'

    const activeCe = selectedTransport.crew?.find(c => c.ruolo === 'CE' && c.attivo)
    const activeAs = selectedTransport.crew?.find(c => c.ruolo === 'AS' && c.attivo)

    const { notes: cleanNotes, ce_esterno, as_esterno } = parseExternalCrewFromNotes(selectedTransport.note)

    const ceUser = activeCe?.user_id ? users.find(usr => usr.id === activeCe.user_id) : null
    const ceName = ceUser ? `${ceUser.nome} ${ceUser.cognome}` : (ce_esterno ? `${ce_esterno} (Esterno)` : 'N/D')

    const asUser = activeAs?.user_id ? users.find(usr => usr.id === activeAs.user_id) : null
    const asName = asUser ? `${asUser.nome} ${asUser.cognome}` : (as_esterno ? `${as_esterno} (Esterno)` : 'N/D')

    const dayStr = selectedTransport.data
      ? format(parseISO(selectedTransport.data), 'dd-MM-yyyy')
      : 'N-D'
    const timeStr = selectedTransport.ora_servizio
      ? selectedTransport.ora_servizio.slice(0, 5).replace(':', '-')
      : 'N-D'
    const patientNameClean = (selectedTransport.paziente_cognome_nome || 'N-D')
      .trim()
      .replace(/[\s\W]+/g, '_')

    const pdfFilename = `GM_${dayStr}_${timeStr}_${patientNameClean}`

    const originalTitle = document.title
    document.title = pdfFilename
    window.print()
    setTimeout(() => { document.title = originalTitle }, 1000)
  }

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

  return (
    <>
    <div className="space-y-6 animate-fade-in text-left bg-slate-50 p-6 rounded-3xl border border-slate-200">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            Registro Trasporti
          </h2>
          <p className="text-xs text-slate-500 leading-normal">
            Visualizza, monitora e filtra lo storico di tutte le schede di trasporto compilate dagli operatori.
          </p>
        </div>

        <button
          onClick={loadTransports}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna Lista
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-wrap gap-4 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[240px] space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cerca Paziente o Luogo</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Cerca per nome, destinazione, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/80 rounded-xl pl-9 pr-4 py-3 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-40 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Stato</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/80 rounded-xl px-3 py-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:bg-white cursor-pointer"
          >
            <option value="all">Tutti gli stati</option>
            <option value="attivo">Attivi</option>
            <option value="terminato">Terminati</option>
          </select>
        </div>

        {/* Date Start */}
        <div className="w-44 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Da Data</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:bg-white"
          />
        </div>

        {/* Date End */}
        <div className="w-44 space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">A Data</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all focus:bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-4 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Transports Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase select-none">
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
            <tbody className="divide-y divide-slate-150 text-slate-700">
              {filteredTransports.map(t => {
                const isTerminated = t.stato === 'terminato'
                const formattedVehicle = t.vehicles 
                  ? `${t.vehicles.nome}${t.vehicles.targa ? ` (${t.vehicles.targa})` : ''}` 
                  : (t.vehicle_id ? `Mezzo #${t.vehicle_id}` : '-')

                // Render Route details cleanly
                const renderLocation = (type, structure, dept, address) => {
                  if (type === 'abitazione') return address || '-'
                  return `${structure || '-'} ${dept ? `[${dept}]` : ''}`
                }

                // Render compiled operator username
                const operatorName = t.profiles 
                  ? `${t.profiles.nome || ''} ${t.profiles.cognome || ''}`.trim() || t.profiles.username
                  : '-'

                return (
                  <tr 
                    key={t.id} 
                    onClick={() => handleOpenDetail(t.id)} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4 font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isTerminated 
                          ? 'text-slate-500 bg-slate-100 border border-slate-200' 
                          : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      }`}>
                        {t.stato.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold">{formatDateString(t.data)}</td>
                    <td className="py-4 px-4 font-semibold font-mono text-slate-800">
                      {t.ora_servizio ? t.ora_servizio.slice(0, 5) : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-900">{t.paziente_cognome_nome || 'N/D'}</span>
                        {t.paziente_telefono && <span className="text-[10px] text-slate-400">Tel: {t.paziente_telefono}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex flex-col text-left text-[11px] leading-relaxed">
                        <span><strong className="text-slate-400 font-medium">Da:</strong> {renderLocation(t.da_tipo_luogo, t.da_nome, t.da_reparto, t.da_via)}</span>
                        <span><strong className="text-slate-400 font-medium">A:</strong> {renderLocation(t.a_tipo_luogo, t.a_nome, t.a_reparto, t.a_via)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-500">{formattedVehicle}</td>
                    <td className="py-4 px-4 font-mono font-medium">
                      {t.km_iniziali !== null ? t.km_iniziali : '-'} / {t.km_finali !== null ? t.km_finali : '-'}
                      {t.km_finali && t.km_iniziali && (
                        <span className="text-[10px] text-emerald-600 block font-sans font-bold">
                          (+{Number(t.km_finali) - Number(t.km_iniziali)} km)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col text-left font-medium">
                        <span className="capitalize">{t.tipo_pagamento || '-'}</span>
                        {t.importo !== null && <span className="text-slate-900 font-bold font-mono">€ {Number(t.importo).toFixed(2)}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-semibold">{operatorName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredTransports.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-400 font-bold">
              Nessun trasporto trovato.
            </div>
          )}
        </div>
      </div>

      {/* Details / Edit Centered Floating Modal with backdrop blur */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in text-left">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                {isEditing ? `Modifica Trasporto #${selectedTransportId}` : `Dettagli Trasporto #${selectedTransportId}`}
              </h3>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-400 font-semibold">Caricamento dettagli...</span>
              </div>
            ) : selectedTransport ? (
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {isEditing ? (
                  /* ================= EDIT MODE (Premium Light Theme) ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-slate-800">
                    {/* Col 1 */}
                    <div className="space-y-4">
                      {/* Dati Paziente Box */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          Paziente
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Cognome e Nome *</label>
                            <input 
                              type="text"
                              value={editForm.paziente_cognome_nome}
                              onChange={e => setEditForm(prev => ({ ...prev, paziente_cognome_nome: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Telefono</label>
                              <input 
                                type="text"
                                value={editForm.paziente_telefono}
                                onChange={e => setEditForm(prev => ({ ...prev, paziente_telefono: e.target.value }))}
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Codice Fiscale</label>
                              <input 
                                type="text"
                                value={editForm.paziente_codice_fiscale}
                                onChange={e => setEditForm(prev => ({ ...prev, paziente_codice_fiscale: e.target.value }))}
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Equipaggio Box */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          Equipaggio
                        </h4>
                        {/* Capo Equipaggio */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Capo Equipaggio (CE)</label>
                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={editForm.is_ce_esterno}
                                onChange={e => setEditForm(prev => ({ ...prev, is_ce_esterno: e.target.checked }))}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                              Esterno
                            </label>
                          </div>
                          {editForm.is_ce_esterno ? (
                            <input 
                              type="text"
                              placeholder="Nome operatore esterno"
                              value={editForm.ce_esterno}
                              onChange={e => setEditForm(prev => ({ ...prev, ce_esterno: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                            />
                          ) : (
                            <select
                              value={editForm.ce_user_id}
                              onChange={e => setEditForm(prev => ({ ...prev, ce_user_id: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Nessuno</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Autista Soccorritore */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Autista / Soccorritore (AS)</label>
                            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={editForm.is_as_esterno}
                                onChange={e => setEditForm(prev => ({ ...prev, is_as_esterno: e.target.checked }))}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                              Esterno
                            </label>
                          </div>
                          {editForm.is_as_esterno ? (
                            <input 
                              type="text"
                              placeholder="Nome operatore esterno"
                              value={editForm.as_esterno}
                              onChange={e => setEditForm(prev => ({ ...prev, as_esterno: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                            />
                          ) : (
                            <select
                              value={editForm.as_user_id}
                              onChange={e => setEditForm(prev => ({ ...prev, as_user_id: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Nessuno</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Mezzo & Km */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          Mezzo e Chilometri
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Mezzo Utilizzato</label>
                            <select
                              value={editForm.vehicle_id}
                              onChange={e => setEditForm(prev => ({ ...prev, vehicle_id: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Nessuno</option>
                              {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.nome}{v.targa ? ` (${v.targa})` : ''}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Km Iniziali</label>
                              <input 
                                type="number"
                                value={editForm.km_iniziali}
                                onChange={e => setEditForm(prev => ({ ...prev, km_iniziali: e.target.value }))}
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Km Finali</label>
                              <input 
                                type="number"
                                value={editForm.km_finali}
                                onChange={e => setEditForm(prev => ({ ...prev, km_finali: e.target.value }))}
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pagamento */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                          Pagamento
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Metodo</label>
                            <select
                              value={editForm.tipo_pagamento}
                              onChange={e => {
                                const val = e.target.value
                                setEditForm(prev => ({
                                  ...prev,
                                  tipo_pagamento: val,
                                  importo: val === 'convenzione' ? '' : prev.importo
                                }))
                              }}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Nessuno</option>
                              <option value="contante">Contante</option>
                              <option value="pos">POS</option>
                              <option value="bonifico">Bonifico</option>
                              <option value="buono">Buono</option>
                              <option value="convenzione">Convenzione</option>
                              <option value="altro">Altro</option>
                            </select>
                          </div>
                          {editForm.tipo_pagamento !== 'convenzione' && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Importo (€)</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={editForm.importo}
                                onChange={e => setEditForm(prev => ({ ...prev, importo: e.target.value }))}
                                placeholder="0.00"
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="space-y-4">
                      {/* Partenza Da */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          Partenza (Da)
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo Luogo</label>
                            <select
                              value={editForm.da_tipo_luogo}
                              onChange={e => setEditForm(prev => ({ ...prev, da_tipo_luogo: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="ospedale">Ospedale</option>
                              <option value="struttura">Struttura (RSA/Clinica)</option>
                              <option value="abitazione">Abitazione</option>
                            </select>
                          </div>
                          {editForm.da_tipo_luogo === 'abitazione' ? (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Via / Indirizzo *</label>
                              <input 
                                type="text"
                                value={editForm.da_via}
                                onChange={e => setEditForm(prev => ({ ...prev, da_via: e.target.value }))}
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Struttura *</label>
                                <input 
                                  type="text"
                                  value={editForm.da_nome}
                                  onChange={e => setEditForm(prev => ({ ...prev, da_nome: e.target.value }))}
                                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Reparto</label>
                                <input 
                                  type="text"
                                  value={editForm.da_reparto}
                                  onChange={e => setEditForm(prev => ({ ...prev, da_reparto: e.target.value }))}
                                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Destinazione A */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-600" />
                          Destinazione (A)
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo Luogo</label>
                            <select
                              value={editForm.a_tipo_luogo}
                              onChange={e => setEditForm(prev => ({ ...prev, a_tipo_luogo: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="ospedale">Ospedale</option>
                              <option value="struttura">Struttura (RSA/Clinica)</option>
                              <option value="abitazione">Abitazione</option>
                            </select>
                          </div>
                          {editForm.a_tipo_luogo === 'abitazione' ? (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Via / Indirizzo *</label>
                              <input 
                                type="text"
                                value={editForm.a_via}
                                onChange={e => setEditForm(prev => ({ ...prev, a_via: e.target.value }))}
                                className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Struttura *</label>
                                <input 
                                  type="text"
                                  value={editForm.a_nome}
                                  onChange={e => setEditForm(prev => ({ ...prev, a_nome: e.target.value }))}
                                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Reparto</label>
                                <input 
                                  type="text"
                                  value={editForm.a_reparto}
                                  onChange={e => setEditForm(prev => ({ ...prev, a_reparto: e.target.value }))}
                                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dettagli Servizio */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          Dettagli Servizio
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Data *</label>
                            <input 
                              type="date"
                              value={editForm.data}
                              onChange={e => setEditForm(prev => ({ ...prev, data: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Ora Servizio *</label>
                            <input 
                              type="time"
                              value={editForm.ora_servizio}
                              onChange={e => setEditForm(prev => ({ ...prev, ora_servizio: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Stato</label>
                            <select
                              value={editForm.stato}
                              onChange={e => setEditForm(prev => ({ ...prev, stato: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="attivo">Attivo</option>
                              <option value="terminato">Terminato</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo Trasporto</label>
                            <select
                              value={editForm.tipo_trasporto}
                              onChange={e => setEditForm(prev => ({ ...prev, tipo_trasporto: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="dimissione">Dimissione</option>
                              <option value="ricovero">Ricovero</option>
                              <option value="visita">Visita</option>
                              <option value="trasferimento">Trasferimento</option>
                              <option value="altro">Altro</option>
                            </select>
                          </div>
                        </div>

                        {editForm.tipo_trasporto === 'altro' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Descrizione Altro *</label>
                            <input 
                              type="text"
                              value={editForm.altro_descrizione}
                              onChange={e => setEditForm(prev => ({ ...prev, altro_descrizione: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all"
                            />
                          </div>
                        )}

                        {(editForm.tipo_trasporto === 'visita' || editForm.tipo_trasporto === 'altro') && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Variante A/R</label>
                            <select
                              value={editForm.variante_ar}
                              onChange={e => setEditForm(prev => ({ ...prev, variante_ar: e.target.value }))}
                              className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Nessuna</option>
                              <option value="a_andata">Solo Andata</option>
                              <option value="a_ritorno">Solo Ritorno</option>
                              <option value="a_ar">Andata e Ritorno (A/R)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Note</label>
                        <textarea
                          rows="3"
                          value={editForm.note}
                          onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                          placeholder="Note aggiuntive..."
                          className="w-full bg-white border border-slate-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition-all resize-none placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= VIEW MODE (Premium Light Theme) ================= */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-slate-800">
                    {/* Col 1 */}
                    <div className="space-y-4">
                      {/* Dati Paziente */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          Paziente
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Cognome e Nome</span>
                            <span className="text-sm font-bold text-slate-900">{selectedTransport.paziente_cognome_nome || 'N/D'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Telefono</span>
                              <span className="text-xs font-semibold text-slate-800">{selectedTransport.paziente_telefono || 'N/D'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Codice Fiscale</span>
                              <span className="text-xs font-mono font-semibold text-slate-800">{selectedTransport.paziente_codice_fiscale || 'N/D'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Equipaggio */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          Equipaggio
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Capo Equipaggio (CE)</span>
                            <span className="text-xs font-semibold text-slate-800">
                              {(() => {
                                const activeCe = selectedTransport.crew?.find(c => c.ruolo === 'CE' && c.attivo)
                                const { ce_esterno } = parseExternalCrewFromNotes(selectedTransport.note)
                                if (activeCe?.user_id) {
                                  const u = users.find(usr => usr.id === activeCe.user_id)
                                  return u ? `${u.nome} ${u.cognome}` : `Utente #${activeCe.user_id}`
                                }
                                return ce_esterno ? `${ce_esterno} (Esterno)` : 'N/D'
                              })()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Autista / Soccorritore (AS)</span>
                            <span className="text-xs font-semibold text-slate-800">
                              {(() => {
                                const activeAs = selectedTransport.crew?.find(c => c.ruolo === 'AS' && c.attivo)
                                const { as_esterno } = parseExternalCrewFromNotes(selectedTransport.note)
                                if (activeAs?.user_id) {
                                  const u = users.find(usr => usr.id === activeAs.user_id)
                                  return u ? `${u.nome} ${u.cognome}` : `Utente #${activeAs.user_id}`
                                }
                                return as_esterno ? `${as_esterno} (Esterno)` : 'N/D'
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mezzo & Km */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="w-4 h-4" />
                          Mezzo e Chilometri
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Mezzo Utilizzato</span>
                            <span className="text-xs font-semibold text-slate-800">
                              {(() => {
                                const vehicle = vehicles.find(v => v.id === selectedTransport.vehicle_id)
                                return vehicle ? `${vehicle.nome}${vehicle.targa ? ` (${vehicle.targa})` : ''}` : (selectedTransport.vehicle_id ? `Mezzo #${selectedTransport.vehicle_id}` : 'N/D')
                              })()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Km Iniziali</span>
                            <span className="text-xs font-mono font-semibold text-slate-800">
                              {selectedTransport.km_iniziali !== null ? `${selectedTransport.km_iniziali} km` : 'N/D'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Km Finali</span>
                            <span className="text-xs font-mono font-semibold text-slate-800">
                              {selectedTransport.km_finali !== null ? `${selectedTransport.km_finali} km` : 'N/D'}
                            </span>
                          </div>
                          {selectedTransport.km_finali !== null && selectedTransport.km_iniziali !== null && (
                            <div className="col-span-2 border-t border-slate-200 pt-2 flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Distanza Percorsa</span>
                              <span className="text-xs font-bold text-emerald-600 font-mono">
                                +{Number(selectedTransport.km_finali) - Number(selectedTransport.km_iniziali)} km
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pagamento */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" />
                          Pagamento
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Metodo Pagamento</span>
                            <span className="text-xs font-bold text-slate-900 capitalize">{selectedTransport.tipo_pagamento || 'N/D'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Importo Riscosso</span>
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {selectedTransport.importo !== null ? `€ ${Number(selectedTransport.importo).toFixed(2)}` : 'Convenzione / N/D'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="space-y-4">
                      {/* Percorso */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          Percorso (Da / A)
                        </h4>
                        
                        {/* Partenza */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Partenza Da ({selectedTransport.da_tipo_luogo})</span>
                          </div>
                          <div className="pl-2.5 text-xs text-slate-800">
                            {selectedTransport.da_tipo_luogo === 'abitazione' ? (
                              <div className="font-semibold">{selectedTransport.da_via || 'N/D'}</div>
                            ) : (
                              <div>
                                <div className="font-bold text-slate-900">{selectedTransport.da_nome || 'N/D'}</div>
                                {selectedTransport.da_reparto && <div className="text-[10px] text-slate-500">Reparto: {selectedTransport.da_reparto}</div>}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Destinazione */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Destinazione A ({selectedTransport.a_tipo_luogo})</span>
                          </div>
                          <div className="pl-2.5 text-xs text-slate-800">
                            {selectedTransport.a_tipo_luogo === 'abitazione' ? (
                              <div className="font-semibold">{selectedTransport.a_via || 'N/D'}</div>
                            ) : (
                              <div>
                                <div className="font-bold text-slate-900">{selectedTransport.a_nome || 'N/D'}</div>
                                {selectedTransport.a_reparto && <div className="text-[10px] text-slate-500">Reparto: {selectedTransport.a_reparto}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dettagli Servizio */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-3">
                        <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Dettagli Servizio
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Data</span>
                            <span className="text-xs font-semibold text-slate-800">{formatDateString(selectedTransport.data)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Ora Servizio</span>
                            <span className="text-xs font-mono font-semibold text-slate-800">
                              {selectedTransport.ora_servizio ? selectedTransport.ora_servizio.slice(0, 5) : 'N/D'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Stato</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              selectedTransport.stato === 'terminato' 
                                ? 'text-slate-500 bg-slate-100 border border-slate-200' 
                                : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            }`}>
                              {selectedTransport.stato ? selectedTransport.stato.toUpperCase() : 'N/D'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Tipo Servizio</span>
                            <span className="text-xs font-semibold text-slate-800 capitalize">
                              {selectedTransport.tipo_trasporto || 'N/D'}
                              {selectedTransport.tipo_trasporto === 'altro' && selectedTransport.altro_descrizione ? ` (${selectedTransport.altro_descrizione})` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Data e Ora Inizio</span>
                            <span className="text-xs font-semibold text-slate-800">
                              {formatDateTimeString(selectedTransport.ora_inizio) || 'N/D'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Data e Ora Fine</span>
                            <span className="text-xs font-semibold text-slate-800">
                              {formatDateTimeString(selectedTransport.ora_fine) || 'Servizio attivo (in corso)'}
                            </span>
                          </div>
                          {selectedTransport.variante_ar && (
                            <div className="col-span-2">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Variante A/R</span>
                              <span className="text-xs font-semibold text-slate-800 capitalize">
                                {selectedTransport.variante_ar.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Note */}
                      <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-2">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Note del Servizio</span>
                        <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {(() => {
                            const { notes } = parseExternalCrewFromNotes(selectedTransport.note)
                            return notes || <span className="text-slate-400 font-semibold italic">Nessuna nota inserita.</span>
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-rose-600 font-bold">
                Dati non trovati.
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between p-6 border-t border-slate-100 bg-slate-50 gap-4">
              {/* Left Side Actions (Delete) */}
              <div>
                {!isEditing && selectedTransport && (
                  deleteConfirm ? (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Confermi la cancellazione?
                      </span>
                      <button 
                        onClick={handleDeleteTransport}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Sì, elimina
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Elimina Trasporto
                    </button>
                  )
                )}
              </div>

              {/* Right Side Actions (Edit, PDF, Save, Cancel) */}
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saveLoading}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salva Modifiche
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handlePrintPDF}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      Scarica PDF
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Modifica
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* SEZIONE STAMPA - visibile solo durante window.print() */}
    {selectedTransport && ReactDOM.createPortal((() => {
      const vehicle = vehicles.find(v => v.id === selectedTransport.vehicle_id)
      const vehicleName = vehicle ? `${vehicle.nome}${vehicle.targa ? ` (${vehicle.targa})` : ''}` : 'N/D'
      const activeCe = selectedTransport.crew?.find(c => c.ruolo === 'CE' && c.attivo)
      const activeAs = selectedTransport.crew?.find(c => c.ruolo === 'AS' && c.attivo)
      const { notes: cleanNotes, ce_esterno, as_esterno } = parseExternalCrewFromNotes(selectedTransport.note)
      const ceUser = activeCe?.user_id ? users.find(u => u.id === activeCe.user_id) : null
      const ceName = ceUser ? `${ceUser.nome} ${ceUser.cognome}` : (ce_esterno ? `${ce_esterno} (Esterno)` : 'N/D')
      const asUser = activeAs?.user_id ? users.find(u => u.id === activeAs.user_id) : null
      const asName = asUser ? `${asUser.nome} ${asUser.cognome}` : (as_esterno ? `${as_esterno} (Esterno)` : 'N/D')
      const isTerminated = selectedTransport.stato === 'terminato'

      const PRow = ({ label, value, mono }) => (
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
          <p className={`text-xs font-semibold text-slate-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value || 'N/D'}</p>
        </div>
      )
      const PSection = ({ title, children }) => (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-3">{title}</h3>
          {children}
        </div>
      )

      return (
        <div className="hidden print:block w-full text-slate-900 bg-white p-8 font-sans leading-relaxed text-left">

          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-0.5 border border-slate-300">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900">COOP GM Pubblica Assistenza</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1">Scheda Registro Trasporto</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Trasporto <span className="font-bold text-slate-800">#{selectedTransport.id}</span></p>
              <p className="text-xs text-slate-500">Data servizio: <span className="font-bold text-slate-800">{formatDateString(selectedTransport.data)}</span></p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isTerminated ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {selectedTransport.stato}
              </span>
            </div>
          </div>

          <PSection title="Paziente">
            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <PRow label="Cognome e Nome" value={selectedTransport.paziente_cognome_nome} />
              <PRow label="Codice Fiscale" value={selectedTransport.paziente_codice_fiscale} mono />
              <PRow label="Telefono" value={selectedTransport.paziente_telefono} />
            </div>
          </PSection>

          <PSection title="Equipaggio">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <PRow label="Capo Equipaggio (CE)" value={ceName} />
              <PRow label="Autista / Soccorritore (AS)" value={asName} />
            </div>
          </PSection>

          <PSection title="Servizio e Mezzo">
            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <PRow label="Data" value={formatDateString(selectedTransport.data)} />
              <PRow label="Ora Servizio" value={selectedTransport.ora_servizio ? selectedTransport.ora_servizio.slice(0, 5) : 'N/D'} />
              <PRow label="Km Iniziali" value={selectedTransport.km_iniziali !== null ? `${selectedTransport.km_iniziali} km` : 'N/D'} />
              <PRow label="Km Finali" value={selectedTransport.km_finali !== null ? `${selectedTransport.km_finali} km` : 'N/D'} />
              <div className="col-span-2"><PRow label="Mezzo Utilizzato" value={vehicleName} /></div>
              <div><PRow label="Data e Ora Inizio" value={formatDateTimeString(selectedTransport.ora_inizio)} /></div>
              <div><PRow label="Data e Ora Fine" value={formatDateTimeString(selectedTransport.ora_fine) || 'Servizio attivo (in corso)'} /></div>
            </div>
          </PSection>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <PSection title="Tipologia Trasporto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <PRow label="Tipo" value={(selectedTransport.tipo_trasporto || 'N/D').charAt(0).toUpperCase() + (selectedTransport.tipo_trasporto || '').slice(1)} />
                {selectedTransport.variante_ar && <PRow label="Variante A/R" value={selectedTransport.variante_ar.replace(/_/g, ' ')} />}
                {selectedTransport.tipo_trasporto === 'altro' && <PRow label="Descrizione" value={selectedTransport.altro_descrizione} />}
              </div>
            </PSection>
            <PSection title="Pagamento">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <PRow label="Metodo" value={selectedTransport.tipo_pagamento ? selectedTransport.tipo_pagamento.charAt(0).toUpperCase() + selectedTransport.tipo_pagamento.slice(1) : 'N/D'} />
                <PRow label="Importo Riscosso" value={selectedTransport.importo !== null ? `€ ${Number(selectedTransport.importo).toFixed(2)}` : 'Convenzionato / Gratis'} />
              </div>
            </PSection>
          </div>

          <PSection title="Percorso">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Partenza Da <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded uppercase">{selectedTransport.da_tipo_luogo}</span></p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {selectedTransport.da_tipo_luogo === 'abitazione' ? selectedTransport.da_via || 'N/D' : `${selectedTransport.da_nome || 'N/D'}${selectedTransport.da_reparto ? ` — ${selectedTransport.da_reparto}` : ''}`}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Destinazione A <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded uppercase">{selectedTransport.a_tipo_luogo}</span></p>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {selectedTransport.a_tipo_luogo === 'abitazione' ? selectedTransport.a_via || 'N/D' : `${selectedTransport.a_nome || 'N/D'}${selectedTransport.a_reparto ? ` — ${selectedTransport.a_reparto}` : ''}`}
                </p>
              </div>
            </div>
          </PSection>

          {cleanNotes && (
            <PSection title="Note del Servizio">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-mono">{cleanNotes}</div>
            </PSection>
          )}

          <div className="mt-12 grid grid-cols-2 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-4/5 border-b border-slate-900 mb-2 h-8" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Firma del Capo Equipaggio</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4/5 border-b border-slate-900 mb-2 h-8" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Firma dell'Amministratore</span>
            </div>
          </div>

        </div>
      )
    })(), document.body)}
    </>
  )
}