import React, { useState } from 'react'
import { api } from '../lib/api'
import { format, parseISO } from 'date-fns'
import { Search, Clock, Edit2, RefreshCw, X } from 'lucide-react'

export default function AdminHoursTab({
  employees,
  selectedEmployee,
  setSelectedEmployee,
  selectedShiftIds,
  setSelectedShiftIds,
  decimalToHHMM,
  formatItalianDateTime,
  onRefresh,
  printStartDate,
  setPrintStartDate,
  printMaxHours,
  setPrintMaxHours,
  printStatusFilter,
  setPrintStatusFilter,
  handlePrintPDF
}) {
  const [empSearch, setEmpSearch] = useState('')
  const [empLoading, setEmpLoading] = useState(false)

  // Validation confirmation modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  // Single shift editing modal state
  const [editingShift, setEditingShift] = useState(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editShiftLoading, setEditShiftLoading] = useState(false)
  const [editShiftError, setEditShiftError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Date/Time helper functions locally
  const getLocalDateString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'yyyy-MM-dd')
    } catch (e) {
      return ''
    }
  }

  const getLocalTimeString = (isoString) => {
    if (!isoString) return ''
    try {
      return format(parseISO(isoString), 'HH:mm')
    } catch (e) {
      return ''
    }
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    return `${emp.nome} ${emp.cognome} ${emp.username}`.toLowerCase().includes(empSearch.toLowerCase())
  })

  // Selection handler
  const selectEmployeeForValidation = (emp) => {
    const updated = employees.find(e => e.id === emp.id)
    setSelectedEmployee(updated || emp)
    setSelectedShiftIds([])
  }

  // Toggle single shift selection
  const handleToggleShiftSelection = (shiftId) => {
    if (selectedShiftIds.includes(shiftId)) {
      setSelectedShiftIds(prev => prev.filter(id => id !== shiftId))
    } else {
      setSelectedShiftIds(prev => [...prev, shiftId])
    }
  }

  // Convalida Ore
  const handleConfirmPayment = async () => {
    if (!selectedEmployee || selectedShiftIds.length === 0) return

    setEmpLoading(true)
    try {
      const { error } = await api.payShifts(
        selectedEmployee.id,
        selectedShiftIds,
        0,
        0
      )

      if (error) throw error

      alert('Ore convalidate registrate con successo!')
      setPaymentModalOpen(false)
      setSelectedShiftIds([])
      onRefresh()
    } catch (err) {
      alert("Errore nella convalida: " + err.message)
    } finally {
      setEmpLoading(false)
    }
  }

  // Modifica Orario Timbratura Singola (Apertura Modale)
  const handleOpenEditShiftModal = (shift) => {
    setEditingShift(shift)
    setEditStartDate(getLocalDateString(shift.start_time))
    setEditStartTime(getLocalTimeString(shift.start_time))
    setEditEndDate(getLocalDateString(shift.end_time))
    setEditEndTime(getLocalTimeString(shift.end_time))
    setEditShiftError(null)
    setShowDeleteConfirm(false)
  }

  const handleEditShiftSubmit = async (e) => {
    e.preventDefault()
    setEditShiftLoading(true)
    setEditShiftError(null)

    try {
      if (!editStartDate || !editStartTime) {
        throw new Error('Inserisci data e ora di inizio.')
      }

      const start = new Date(`${editStartDate}T${editStartTime}`)
      if (isNaN(start.getTime())) {
        throw new Error('Data o ora di inizio non valida.')
      }

      let end = null
      if (editEndDate && editEndTime) {
        end = new Date(`${editEndDate}T${editEndTime}`)
        if (isNaN(end.getTime())) {
          throw new Error('Data o ora di fine non valida.')
        }
        if (end <= start) {
          throw new Error('La data/ora di fine deve essere successiva a quella di inizio.')
        }
      }

      const { error: apiError } = await api.updateClockedShift(
        editingShift.id,
        start.toISOString(),
        end ? end.toISOString() : null,
        0
      )

      if (apiError) throw apiError

      alert('Timbratura aggiornata con successo!')
      setEditingShift(null)
      setSelectedShiftIds([])
      onRefresh()
    } catch (err) {
      setEditShiftError(err.message)
    } finally {
      setEditShiftLoading(false)
    }
  }

  const handleDeleteClockedShift = async () => {
    setEditShiftLoading(true)
    setEditShiftError(null)
    try {
      const { error: apiError } = await api.deleteClockedShift(editingShift.id)
      if (apiError) throw apiError

      alert('Timbratura eliminata con successo!')
      setEditingShift(null)
      setShowDeleteConfirm(false)
      setSelectedShiftIds([])
      onRefresh()
    } catch (err) {
      setEditShiftError(err.message)
    } finally {
      setEditShiftLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in font-sans">
      
      {/* Employee Selection List */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-4 text-left font-sans">
        <div className="pb-2 border-b border-slate-800/60">
          <h3 className="text-base font-bold text-slate-100">Personale Dipendente</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Seleziona un dipendente per convalidare le timbrature orarie</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cerca dipendente..."
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none transition-all placeholder:text-slate-600 font-sans"
          />
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[480px] pr-1">
          {filteredEmployees.filter(e => e.stato === 'dipendente' || e.ruolo === 'dipendente').map(emp => (
            <button
              key={emp.id}
              onClick={() => selectEmployeeForValidation(emp)}
              className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                selectedEmployee?.id === emp.id
                  ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-bold text-slate-200 truncate font-sans">
                  {emp.nome && emp.cognome ? `${emp.nome} ${emp.cognome}` : emp.username}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {emp.unpaidHours > 0 ? (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/15 px-2 py-0.5 rounded text-[9px] font-bold">
                    {emp.unpaidHours.toFixed(1)}h ({decimalToHHMM(emp.unpaidHours)}) da convalidare
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold">
                    Convalidato
                  </span>
                )}
              </div>
            </button>
          ))}

          {filteredEmployees.filter(e => e.stato === 'dipendente' || e.ruolo === 'dipendente').length === 0 && (
            <div className="text-center py-8 text-slate-600 font-bold">
              Nessun dipendente censito nel sistema
            </div>
          )}
        </div>
      </div>

      {/* Employee Clocked Shifts Table (Center/Right Wide) */}
      <div className="xl:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-5 text-left min-h-[500px] font-sans">
        {selectedEmployee ? (
          <>
            {/* Header with totals */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60 font-sans">
              <div>
                <h3 className="text-lg font-bold text-slate-100 font-sans">
                  Ore e Timbrature: {selectedEmployee.nome} {selectedEmployee.cognome}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">Username: <span className="font-mono text-slate-400">{selectedEmployee.username}</span></span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">Codice Fiscale: <span className="font-mono text-slate-400">{selectedEmployee.codice_fiscale || 'N/D'}</span></span>
                </div>
              </div>

              {/* Print button */}
              <button
                onClick={handlePrintPDF}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700/60 shadow flex items-center gap-1.5 cursor-pointer font-sans"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect><polyline points="6 9 6 2 18 2 18 9"></polyline></svg>
                <span>Stampa Foglio Presenze</span>
              </button>
            </div>

            {/* Stats boxes */}
            <div className="grid grid-cols-3 gap-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl font-sans">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore Totali Registrate</span>
                <span className="text-base font-extrabold text-slate-200 mt-1">{(selectedEmployee.totalHours || 0).toFixed(2)}h</span>
                <span className="text-[10px] text-slate-500">({decimalToHHMM(selectedEmployee.totalHours || 0)})</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore da Convalidare</span>
                <span className="text-base font-extrabold text-amber-400 mt-1">{(selectedEmployee.unpaidHours || 0).toFixed(2)}h</span>
                <span className="text-[10px] text-amber-500">({decimalToHHMM(selectedEmployee.unpaidHours || 0)})</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ore Convalidate</span>
                <span className="text-base font-extrabold text-emerald-400 mt-1">
                  {(selectedEmployee.totalHours - selectedEmployee.unpaidHours || 0).toFixed(2)}h
                </span>
                <span className="text-[10px] text-emerald-500">({decimalToHHMM(selectedEmployee.totalHours - selectedEmployee.unpaidHours || 0)})</span>
              </div>
            </div>

            {/* Filtri Stampa PDF */}
            <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-2xl flex flex-col gap-3 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-xs font-bold text-indigo-400">Filtri Stampa PDF</span>
                <span className="text-[10px] text-slate-500 font-semibold italic">Personalizza il foglio presenze prima di stamparlo</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Data Inizio</label>
                  <input
                    type="date"
                    value={printStartDate}
                    onChange={(e) => setPrintStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Limite Ore (Ultime N ore)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Es: 40 (Nessun limite)"
                    value={printMaxHours}
                    onChange={(e) => setPrintMaxHours(e.target.value)}
                    className="bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Stato Convalida</label>
                  <select
                    value={printStatusFilter}
                    onChange={(e) => setPrintStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition-all cursor-pointer"
                  >
                    <option value="unconvalidated">Solo da convalidare</option>
                    <option value="convalidated">Solo convalidate</option>
                    <option value="all">Tutte le timbrature</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action area for selected shifts */}
            {selectedShiftIds.length > 0 && (
              <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 animate-slide-up font-sans">
                <span className="text-xs font-bold text-indigo-300">
                  {selectedShiftIds.length} timbrature selezionate per la convalida
                </span>
                
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer font-sans"
                >
                  Convalida Selezionati
                </button>
              </div>
            )}

            {/* Clocked Shifts Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedShiftIds.length === (selectedEmployee.shifts?.filter(s => !s.pagato).length || 0) && (selectedEmployee.shifts?.filter(s => !s.pagato).length || 0) > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedShiftIds(selectedEmployee.shifts?.filter(s => !s.pagato).map(s => s.id) || [])
                          } else {
                            setSelectedShiftIds([])
                          }
                        }}
                        className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 accent-indigo-600 rounded cursor-pointer font-sans"
                      />
                    </th>
                    <th className="py-2.5 px-3">Inizio Turno (Entrata)</th>
                    <th className="py-2.5 px-3">Fine Turno (Uscita)</th>
                    <th className="py-2.5 px-3 text-center">Durata (Decimale)</th>
                    <th className="py-2.5 px-3 text-center">Durata (HH:MM)</th>
                    <th className="py-2.5 px-3 text-center">Stato</th>
                    <th className="py-2.5 px-3 text-right">Modifica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                  {selectedEmployee.shifts?.map(shift => {
                    const duration = shift.end_time 
                      ? (new Date(shift.end_time) - new Date(shift.start_time)) / (1000 * 60 * 60)
                      : 0

                    return (
                      <tr key={shift.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="py-3 px-3 text-center">
                          {!shift.pagato ? (
                            <input
                              type="checkbox"
                              checked={selectedShiftIds.includes(shift.id)}
                              onChange={() => handleToggleShiftSelection(shift.id)}
                              className="w-3.5 h-3.5 bg-slate-950 border border-slate-800 accent-indigo-600 rounded cursor-pointer"
                            />
                          ) : (
                            <span className="text-emerald-500 font-bold">✓</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-200">
                          {formatItalianDateTime(shift.start_time)}
                        </td>
                        <td className="py-3 px-3 text-slate-200">
                          {shift.end_time ? formatItalianDateTime(shift.end_time) : (
                            <span className="text-amber-400 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/15 text-[10px] animate-pulse-subtle">
                              Attivo in corso
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {shift.end_time ? `${duration.toFixed(2)} ore` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {shift.end_time ? decimalToHHMM(duration) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {shift.pagato ? (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/15 text-[9px] font-bold">CONVALIDATO</span>
                          ) : (
                            <span className="text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/15 text-[9px] font-bold">DA CONVALIDARE</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenEditShiftModal(shift)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                            title="Modifica Turno Timbratura"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {(!selectedEmployee.shifts || selectedEmployee.shifts.length === 0) && (
                <div className="text-center py-16 text-slate-500 font-bold">
                  Nessun turno timbrato o registrato per questo dipendente.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-3">
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-slate-300 font-sans">Seleziona un dipendente</span>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-sans">
              Scegli un dipendente nella colonna di sinistra per caricarne il riepilogo orario, verificare le timbrature orarie, stampare il resoconto o effettuarne la convalida.
            </p>
          </div>
        )}
      </div>

      {/* MODALE DI CONVALIDA (DIPENDENTI) */}
      {paymentModalOpen && selectedEmployee && (() => {
        const selectedShiftsHrs = selectedEmployee.shifts
          ?.filter(s => selectedShiftIds.includes(s.id))
          .reduce((sum, s) => {
            if (s.end_time) {
              const hrs = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
              return sum + hrs
            }
            return sum
          }, 0) || 0;

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-left shadow-2xl animate-scale-up font-sans">
              <h3 className="text-base font-extrabold text-slate-100 font-sans">Conferma Convalida Turni</h3>
              
              <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
                Stai per convalidare definitivamente <strong>{selectedShiftIds.length}</strong> timbrature per il dipendente <strong>{selectedEmployee.nome} {selectedEmployee.cognome}</strong>. 
              </p>

              <div className="bg-slate-950 p-4 rounded-2xl flex flex-col gap-2 border border-slate-800 font-sans">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Timbrature Selezionate:</span>
                  <span className="font-bold text-slate-200">{selectedShiftIds.length} turni</span>
                </div>
                <div className="h-px bg-slate-800 my-1" />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Totale Ore (Decimale):</span>
                  <span className="font-bold text-slate-200 font-mono">{selectedShiftsHrs.toFixed(2)} h</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Totale Ore (HH:MM):</span>
                  <span className="font-bold text-slate-200 font-mono">{decimalToHHMM(selectedShiftsHrs)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1 font-sans">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={empLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {empLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Convalida...</span>
                    </>
                  ) : (
                    <span>Conferma Convalida</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODALE DI MODIFICA TIMBRATURA SINGOLA */}
      {editingShift && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 text-left shadow-2xl animate-scale-up font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-slate-100 font-sans">Modifica Timbratura Oraria</h3>
              <button 
                onClick={() => setEditingShift(null)}
                className="text-slate-500 hover:text-slate-300 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editShiftError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-[10px] font-bold font-sans">
                ⚠️ {editShiftError}
              </div>
            )}

            <form onSubmit={handleEditShiftSubmit} className="flex flex-col gap-3.5 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Inizio *</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ora Inizio *</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Fine</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ora Fine</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-500 italic">
                Lasciare vuoto Data/Ora Fine se il dipendente non ha ancora timbrato l'uscita (stato attivo in corso).
              </div>

              {showDeleteConfirm ? (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex flex-col gap-2 mt-2 font-sans">
                  <span className="text-[10px] font-bold text-rose-300">Vuoi davvero ELIMINARE definitivamente questa timbratura? Questa azione è irreversibile.</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-slate-800 text-slate-300 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer font-sans"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteClockedShift}
                      disabled={editShiftLoading}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      {editShiftLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Sì, elimina</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    Elimina timbratura
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingShift(null)}
                      className="bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer font-sans"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={editShiftLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                    >
                      {editShiftLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Salva</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
