import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { History, Calendar, Clock, CheckCircle, AlertCircle, Loader2, Pencil, Plus, X, Download, FileText } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { jsPDF } from 'jspdf'

export default function StoricoOre() {
  const { profile, refreshProfile } = useAuth()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // States for Add Manual Shift Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addStartDate, setAddStartDate] = useState('')
  const [addStartTime, setAddStartTime] = useState('')
  const [addEndDate, setAddEndDate] = useState('')
  const [addEndTime, setAddEndTime] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // States for Edit Shift Modal
  const [editingShift, setEditingShift] = useState(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const handleOpenAddModal = () => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const timeStr = format(now, 'HH:mm')
    
    setAddStartDate(todayStr)
    setAddStartTime(timeStr)
    setAddEndDate(todayStr)
    // Default end time to 8 hours later
    const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    setAddEndDate(format(eightHoursLater, 'yyyy-MM-dd'))
    setAddEndTime(format(eightHoursLater, 'HH:mm'))
    
    setAddError(null)
    setIsAddModalOpen(true)
  }

  const handleOpenEditModal = (shift) => {
    setEditingShift(shift)
    setEditStartDate(getLocalDateString(shift.start_time))
    setEditStartTime(getLocalTimeString(shift.start_time))
    setEditEndDate(getLocalDateString(shift.end_time))
    setEditEndTime(getLocalTimeString(shift.end_time))
    setEditError(null)
    setShowDeleteConfirm(false)
  }

  const handleDeleteShift = async () => {
    setEditLoading(true)
    setEditError(null)
    try {
      const { error: apiError } = await api.deleteClockedShift(editingShift.id)
      if (apiError) throw apiError

      setEditingShift(null)
      setShowDeleteConfirm(false)
      await loadShifts()
    } catch (err) {
      console.error(err)
      setEditError(err.message || 'Errore durante l\'eliminazione del turno. Potrebbe essere necessario il permesso dell\'amministratore.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)

    try {
      if (!addStartDate || !addStartTime) {
        throw new Error('Inserisci data e ora di inizio.')
      }
      
      const start = new Date(`${addStartDate}T${addStartTime}`)
      if (isNaN(start.getTime())) {
        throw new Error('Data o ora di inizio non valida.')
      }

      let end = null
      if (addEndDate && addEndTime) {
        end = new Date(`${addEndDate}T${addEndTime}`)
        if (isNaN(end.getTime())) {
          throw new Error('Data o ora di fine non valida.')
        }
        if (end <= start) {
          throw new Error('La data/ora di fine deve essere successiva a quella di inizio.')
        }
      }

      const { error: apiError } = await api.addManualClockedShift(
        profile.id,
        start.toISOString(),
        end ? end.toISOString() : null,
        0
      )

      if (apiError) throw apiError

      setIsAddModalOpen(false)
      await loadShifts()
    } catch (err) {
      console.error(err)
      setAddError(err.message || 'Si è verificato un errore durante l\'aggiunta del turno.')
    } finally {
      setAddLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)

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

      setEditingShift(null)
      await loadShifts()
    } catch (err) {
      console.error(err)
      setEditError(err.message || 'Si è verificato un errore durante la modifica del turno.')
    } finally {
      setEditLoading(false)
    }
  }

  const loadShifts = async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    try {
      // Refresh profile to get the most updated credito_surplus
      await refreshProfile()
      
      const { data, error: apiError } = await api.fetchClockedShifts(profile.id)
      if (apiError) throw apiError
      setShifts(data || [])
    } catch (err) {
      console.error(err)
      setError('Impossibile caricare lo storico dei turni.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShifts()
  }, [profile?.id])

  const formatDecimalHoursToHHMM = (decimalHours) => {
    const totalMinutes = Math.round(decimalHours * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}`
  }

  // Calcoli delle statistiche
  const calculateStats = () => {
    let oreDaConvalidare = 0
    let turniTotali = 0
    let turniConvalidati = 0
    let turniDaConvalidare = 0

    shifts.forEach(s => {
      if (s.end_time) {
        const durationHours = (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
        turniTotali += 1
        if (s.pagato) {
          turniConvalidati += 1
        } else {
          turniDaConvalidare += 1
          oreDaConvalidare += durationHours
        }
      }
    })

    return {
      oreDaConvalidare: formatDecimalHoursToHHMM(oreDaConvalidare),
      turniTotali,
      turniConvalidati,
      turniDaConvalidare
    }
  }

  const stats = calculateStats()

  const formatShiftDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'eeee dd MMMM yyyy', { locale: it })
    } catch (e) {
      return dateStr
    }
  }

  const formatShiftTime = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'HH:mm')
    } catch (e) {
      return ''
    }
  }

  const getDurationString = (start, end) => {
    if (!end) return 'In corso'
    const diffMs = new Date(end) - new Date(start)
    const totalMinutes = Math.round(diffMs / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const pad = (num) => String(num).padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}`
  }

  const handleDownloadPDF = () => {
    const unvalidatedShifts = shifts.filter(s => s.end_time && !s.pagato)
    if (unvalidatedShifts.length === 0) {
      alert('Non ci sono turni da convalidare da scaricare.')
      return
    }

    const sortedShifts = [...unvalidatedShifts].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    let totalDecimalHours = 0
    sortedShifts.forEach(s => {
      totalDecimalHours += (new Date(s.end_time) - new Date(s.start_time)) / (1000 * 60 * 60)
    })
    const totalOreFormatted = formatDecimalHoursToHHMM(totalDecimalHours)

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const contentWidth = pageWidth - margin * 2

    const userName = `${profile?.nome || ''} ${profile?.cognome || ''}`.trim() || profile?.username || 'Dipendente/Volontario'
    const roleText = profile?.ruolo === 'admin' ? 'Amministratore' : (profile?.ruolo === 'dipendente' ? 'Dipendente' : 'Volontario')
    const qualificaText = profile?.qualifica ? ` - ${profile.qualifica}` : ''
    const generationDateStr = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })

    let currentY = 15

    const drawHeader = (isFirstPage) => {
      // Header banner
      doc.setFillColor(30, 41, 59) // slate-800
      doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'F')

      // Title & Subtitle
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('GM TURNI', margin + 6, currentY + 9)

      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(199, 210, 254) // indigo-200
      doc.text('RIEPILOGO TURNI DA CONVALIDARE', margin + 6, currentY + 16)

      // Right timestamp
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184) // slate-400
      doc.text(`Data Stampa: ${generationDateStr}`, pageWidth - margin - 6, currentY + 9, { align: 'right' })

      currentY += 26

      if (isFirstPage) {
        // User Info & Summary Card
        doc.setFillColor(248, 250, 252) // slate-50
        doc.setDrawColor(226, 232, 240) // slate-200
        doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD')

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 41, 59)
        doc.text(`Operatore: ${userName}`, margin + 5, currentY + 7)

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text(`Ruolo: ${roleText}${qualificaText}`, margin + 5, currentY + 14)

        // Summary values
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(79, 70, 229) // indigo-600
        doc.text(`Turni da convalidare: ${sortedShifts.length}`, pageWidth - margin - 5, currentY + 7, { align: 'right' })

        doc.setFontSize(9.5)
        doc.setTextColor(217, 119, 6) // amber-600
        doc.text(`Totale Ore: ${totalOreFormatted}`, pageWidth - margin - 5, currentY + 14, { align: 'right' })

        currentY += 25
      }
    }

    const drawTableHeader = () => {
      doc.setFillColor(51, 65, 85) // slate-700
      doc.rect(margin, currentY, contentWidth, 8, 'F')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)

      doc.text('#', margin + 3, currentY + 5.5)
      doc.text('DATA', margin + 12, currentY + 5.5)
      doc.text('INIZIO', margin + 65, currentY + 5.5)
      doc.text('FINE', margin + 95, currentY + 5.5)
      doc.text('DURATA', margin + 125, currentY + 5.5)
      doc.text('STATO', margin + 155, currentY + 5.5)

      currentY += 8
    }

    drawHeader(true)
    drawTableHeader()

    sortedShifts.forEach((shift, index) => {
      // Check page break
      if (currentY > pageHeight - 38) {
        doc.addPage()
        currentY = 15
        drawHeader(false)
        drawTableHeader()
      }

      const isEven = index % 2 === 0
      if (isEven) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, currentY, contentWidth, 7, 'F')
      }

      doc.setDrawColor(241, 245, 249)
      doc.line(margin, currentY + 7, margin + contentWidth, currentY + 7)

      doc.setTextColor(51, 65, 85)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(String(index + 1), margin + 3, currentY + 4.8)

      let dateFormatted = ''
      try {
        dateFormatted = format(parseISO(shift.start_time), 'EEE dd/MM/yyyy', { locale: it })
      } catch (e) {
        dateFormatted = shift.start_time
      }
      doc.text(dateFormatted, margin + 12, currentY + 4.8)

      doc.text(formatShiftTime(shift.start_time), margin + 65, currentY + 4.8)
      doc.text(formatShiftTime(shift.end_time), margin + 95, currentY + 4.8)

      doc.setFont('helvetica', 'bold')
      doc.text(getDurationString(shift.start_time, shift.end_time), margin + 125, currentY + 4.8)

      doc.setTextColor(217, 119, 6) // amber-600
      doc.setFont('helvetica', 'normal')
      doc.text('Da convalidare', margin + 155, currentY + 4.8)

      currentY += 7
    })

    // Check space for total row & signatures
    if (currentY > pageHeight - 42) {
      doc.addPage()
      currentY = 20
    } else {
      currentY += 3
    }

    // Totals Box
    doc.setFillColor(241, 245, 249) // slate-100
    doc.setDrawColor(203, 213, 225) // slate-300
    doc.roundedRect(margin, currentY, contentWidth, 9, 1, 1, 'FD')

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('TOTALE ORE DA CONVALIDARE:', margin + 5, currentY + 6)

    doc.setFontSize(10)
    doc.setTextColor(217, 119, 6)
    doc.text(totalOreFormatted, margin + 125, currentY + 6)

    currentY += 16

    // Signatures
    if (currentY > pageHeight - 30) {
      doc.addPage()
      currentY = 25
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)

    doc.text('Firma Dipendente / Volontario:', margin + 5, currentY)
    doc.line(margin + 5, currentY + 10, margin + 60, currentY + 10)

    doc.text('Firma Responsabile / Amministrazione:', pageWidth - margin - 65, currentY)
    doc.line(pageWidth - margin - 65, currentY + 10, pageWidth - margin - 5, currentY + 10)

    // Footer page numbering
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `GM Turni - Documento di riepilogo turni da convalidare  |  Pagina ${i} di ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
    }

    const safeName = (profile?.cognome ? `${profile.cognome}_${profile.nome || ''}` : profile?.username || 'Turni').replace(/\s+/g, '_')
    const fileName = `Turni_Da_Convalidare_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    doc.save(fileName)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-400">Caricamento storico ore...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-6">
      {/* Intestazione */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Storico Ore
          </h2>
          <p className="text-xs text-slate-400">Riepilogo e storico dei turni di lavoro effettuati</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={stats.turniDaConvalidare === 0}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 rounded-2xl text-xs font-bold shadow-md transition-all duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Scarica PDF turni da convalidare"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Scarica PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/10 transition-all duration-200 flex-shrink-0"
            title="Aggiungi turno manuale"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards Riepilogo */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-3xl flex flex-col gap-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ore da Convalidare</span>
          <span className="text-2xl font-black text-amber-400 font-mono">{stats.oreDaConvalidare}</span>
          <span className="text-[9px] text-slate-500 leading-none">In attesa di convalida</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-3xl flex flex-col gap-1 shadow-md">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stato Turni</span>
          <span className="text-2xl font-black text-indigo-400 font-mono">{stats.turniConvalidati} / {stats.turniTotali}</span>
          <span className="text-[9px] text-slate-500 leading-none">{stats.turniDaConvalidare} da convalidare</span>
        </div>
      </div>

      {/* Lista Turni */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Elenco Timbrature</h3>
        
        {shifts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-850 p-8 rounded-3xl text-center flex flex-col items-center gap-2.5">
            <Clock className="w-8 h-8 text-slate-600" />
            <span className="text-xs font-semibold text-slate-400">Nessun turno registrato in storico.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shifts.map((shift) => {
              const isCompleted = !!shift.end_time
              const isPagato = shift.pagato
              return (
                <div
                  key={shift.id}
                  className={`bg-slate-900 border transition-all duration-300 p-4 rounded-3xl flex flex-col gap-3 ${
                    isPagato 
                      ? 'opacity-55 border-slate-900/80 shadow-none' 
                      : 'border-slate-800/80 shadow-md hover:border-slate-700/60'
                  }`}
                >
                  {/* Header riga */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-200 capitalize truncate">
                        {formatShiftDate(shift.start_time)}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatShiftTime(shift.start_time)}
                        {isCompleted ? ` - ${formatShiftTime(shift.end_time)}` : ' (In corso)'}
                      </span>
                    </div>

                    {/* Badge Stato & Edit Button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(!isPagato || profile?.ruolo === 'admin') && (
                        <button
                          onClick={() => handleOpenEditModal(shift)}
                          className="p-1 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-slate-200 transition-colors flex items-center justify-center border border-slate-800/40 hover:border-slate-700/60"
                          title="Modifica data e ora"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isPagato ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 text-emerald-450" />
                          Convalidato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3 text-amber-400 animate-pulse" />
                          Da convalidare
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dettagli della durata */}
                  <div className="flex items-center justify-between border-t border-slate-800/50 pt-2.5 mt-0.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Durata</span>
                      <span className="text-xs font-semibold text-slate-300 font-mono">
                        {getDurationString(shift.start_time, shift.end_time)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALE DI AGGIUNTA TURNO MANUALE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-slide-up relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100 font-bold">Aggiungi Turno</h3>
            </div>

            {addError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
              {/* Inizio */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Inizio Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={addStartDate}
                    onChange={(e) => setAddStartDate(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={addStartTime}
                    onChange={(e) => setAddStartTime(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Fine */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fine Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={addEndDate}
                    onChange={(e) => setAddEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={addEndTime}
                    onChange={(e) => setAddEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-none">Lascia vuoto se il turno è ancora in corso.</span>
              </div>



              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-700 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 py-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/15 disabled:opacity-50 transition-all duration-200"
                >
                  {addLoading ? 'Salvataggio...' : 'Conferma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DI MODIFICA TURNO */}
      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-slide-up relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingShift(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-indigo-400">
              <div className="p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <Pencil className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100 font-bold">Modifica Turno</h3>
            </div>

            {editingShift.pagato && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-2xl text-[10px] font-medium leading-relaxed">
                ⚠️ <strong>Attenzione:</strong> Questo turno è già stato convalidato. Modificando data/ora, i conteggi storici potrebbero risultare disallineati rispetto ai dettagli nel database.
              </div>
            )}

            {editError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              {/* Inizio */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Inizio Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Fine */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Fine Turno</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none"
                  />
                </div>
                <span className="text-[9px] text-slate-500 leading-none">Lascia vuoto se il turno è ancora in corso.</span>
              </div>



              {showDeleteConfirm ? (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex flex-col gap-2.5 mt-2 animate-fade-in">
                  <span className="text-[10px] font-bold text-rose-300">
                    Sei sicuro di voler eliminare definitivamente questo turno?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      No, annulla
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteShift}
                      disabled={editLoading}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-extrabold shadow-md shadow-rose-600/15 transition-colors"
                    >
                      {editLoading ? 'Eliminazione...' : 'Sì, elimina'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingShift(null)}
                      className="flex-1 py-2.5 border border-slate-700 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex-1 py-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/15 disabled:opacity-50 transition-all duration-200"
                    >
                      {editLoading ? 'Salvataggio...' : 'Conferma'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold transition-all duration-200"
                  >
                    Elimina Turno
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
