import React, { useState, useEffect } from 'react';
import { Appointment, Doctor, Patient, AIOptimizedScheduleResult } from '../types';
import { 
  Calendar, Clock, User, Heart, Star, Sparkles, CheckCircle2, 
  AlertCircle, Loader2, PlayCircle, PlusCircle, Check, LogIn, LogOut, Activity
} from 'lucide-react';

export default function SchedulerTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Booking states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [notes, setNotes] = useState('');

  // AI Optimizer States
  const [aiSymptoms, setAiSymptoms] = useState('');
  const [aiPreferredSpecialty, setAiPreferredSpecialty] = useState('Internal Medicine');
  const [aiPreferredDay, setAiPreferredDay] = useState('Monday');
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [aiResult, setAiResult] = useState<AIOptimizedScheduleResult | null>(null);

  // Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSwipeDoctor = async (doctorId: string, action: 'IN' | 'OUT') => {
    try {
      const res = await fetch(`/api/doctors/${doctorId}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast('success', `Badge swipe card processed successfully.`);
        await fetchData();
      } else {
        showToast('error', 'Badge reader connection timeout.');
      }
    } catch (err: any) {
      showToast('error', 'Hardware bridge error: ' + err.message);
    }
  };

  const swipeLogs = doctors.flatMap(doc => 
    (doc.swipeHistory || []).map(item => ({
      docId: doc.id,
      docName: doc.name,
      docAvatar: doc.avatar,
      docSpecialty: doc.specialty,
      action: item.action,
      time: item.time
    }))
  ).sort((a, b) => b.time.localeCompare(a.time));

  const fetchData = async () => {
    try {
      const [apptsRes, docsRes, patsRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/doctors'),
        fetch('/api/patients'),
      ]);

      if (apptsRes.ok) setAppointments(await apptsRes.json());
      if (docsRes.ok) setDoctors(await docsRes.json());
      if (patsRes.ok) setPatients(await patsRes.json());
    } catch (err) {
      console.error('Error fetching scheduling datasets:', err);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId || !appointmentDate || !appointmentTime) {
      showToast('error', 'Please complete all scheduling fields.');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    const doctor = doctors.find(d => d.id === selectedDoctorId);

    if (!patient || !doctor) return;

    const payload = {
      patientId: selectedPatientId,
      patientName: patient.name,
      doctorId: selectedDoctorId,
      doctorName: doctor.name,
      date: appointmentDate,
      time: appointmentTime,
      symptoms: symptomsInput || patient.symptoms,
      notes,
      waitMetricScore: Math.floor(Math.random() * 3) + 7, // mock optimization score (7-10) for standard bookings
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('success', `Appointment confirmed with ${doctor.name}.`);
        await fetchData();
        // Clear form
        setSelectedPatientId('');
        setSelectedDoctorId('');
        setAppointmentDate('');
        setAppointmentTime('');
        setSymptomsInput('');
        setNotes('');
      } else {
        showToast('error', 'Failed to book appointment.');
      }
    } catch (err: any) {
      showToast('error', 'Booking error: ' + err.message);
    }
  };

  const triggerOptimization = async () => {
    setAiOptimizing(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/ai/optimize-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: aiSymptoms,
          preferredSpecialty: aiPreferredSpecialty,
          preferredDay: aiPreferredDay,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setAiResult(result);
        showToast('success', 'AI schedule and wait-times optimized.');
      } else {
        showToast('error', 'AI Scheduling Optimization failed.');
      }
    } catch (err: any) {
      showToast('error', 'AI Optimizer error: ' + err.message);
    } finally {
      setAiOptimizing(false);
    }
  };

  const applyAIRecommendation = (rec: any) => {
    // Populate scheduling form with recommendation details
    setSelectedDoctorId(rec.doctorId);
    setSymptomsInput(aiSymptoms);
    setNotes(`Optimized Slot via AI scheduling. Day: ${rec.day}. Wait-efficiency Score: ${rec.waitScore}/10.`);
    
    // Auto populate next occurrence of recommended day in booking fields
    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysOfWeek.indexOf(rec.day);
    if (targetDayIndex !== -1) {
      const distance = (targetDayIndex + 7 - today.getDay()) % 7;
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + (distance === 0 ? 7 : distance));
      setAppointmentDate(targetDate.toISOString().split('T')[0]);
    }
    
    // Parse timeslot (e.g., 10:30)
    const timeMatch = rec.timeSlot.match(/\d{2}:\d{2}/);
    if (timeMatch) {
      setAppointmentTime(timeMatch[0]);
    } else {
      setAppointmentTime('09:00');
    }

    showToast('success', `Applied slot for ${rec.doctorName}. Adjust date & choose patient to finalize.`);
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment slot?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Appointment slot released.');
        await fetchData();
      }
    } catch (err: any) {
      showToast('error', 'Cancellation failed.');
    }
  };

  return (
    <div id="scheduler-tab" className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-md animate-fade-in ${
          toast.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-teal-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Left Area: Doctor Rosters & Booking Engine (7 Cols) */}
      <div className="xl:col-span-7 space-y-6">
        {/* Doctor Rosters & Check-In Swipe Board */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Doctor In/Out Status Board</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Real-time RFID swipe-card log tracking clinic availability.</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Hardware RFID Link Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => {
              const isCheckedIn = doc.attendanceStatus !== 'Out';
              return (
                <div 
                  key={doc.id} 
                  className={`border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 ${
                    isCheckedIn 
                      ? 'border-emerald-200 bg-emerald-50/20 shadow-xs' 
                      : 'border-slate-100 bg-slate-50/40 text-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <img src={doc.avatar} alt={doc.name} className="w-8.5 h-8.5 rounded-full object-cover border border-slate-200" />
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{doc.name}</h4>
                          <p className="text-[9px] text-teal-600 font-medium">{doc.specialty}</p>
                        </div>
                      </div>
                      
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                        isCheckedIn 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isCheckedIn ? 'IN' : 'OUT'}
                      </span>
                    </div>
                    
                    {/* Schedule details */}
                    <div className="space-y-1 mt-2 bg-white/60 p-2 rounded-lg border border-slate-100 text-[10px]">
                      <span className="text-[8px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">Allocated Hours</span>
                      {doc.schedule.map((sched, sIdx) => (
                        <div key={sIdx} className="flex justify-between items-center text-slate-600 font-mono text-[9px]">
                          <span>{sched.day.substring(0, 3)}</span>
                          <span>{sched.hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Availability:</span>
                      <span className={`font-semibold ${
                        doc.availability === 'Available' ? 'text-emerald-600' :
                        doc.availability === 'On Call' ? 'text-amber-600' :
                        doc.availability === 'In Surgery' ? 'text-indigo-600' :
                        'text-slate-500'
                      }`}>
                        {doc.availability}
                      </span>
                    </div>

                    {doc.lastSwipeTime && (
                      <span className="text-[8px] font-mono text-slate-400 block truncate">
                        Last Swipe: {doc.lastSwipeTime}
                      </span>
                    )}

                    {/* Interactive Swipe Trigger */}
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleSwipeDoctor(doc.id, 'IN')}
                        disabled={isCheckedIn}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          isCheckedIn 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        }`}
                      >
                        <LogIn className="w-2.5 h-2.5" />
                        <span>Swipe IN</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSwipeDoctor(doc.id, 'OUT')}
                        disabled={!isCheckedIn}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          !isCheckedIn 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        <LogOut className="w-2.5 h-2.5" />
                        <span>Swipe OUT</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Swipe Card Event History Log Feed */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-900 text-slate-300">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 border-b border-slate-900 pb-2">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              Live RFID Card Swipe Transaction Ledger
            </h4>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto font-mono text-[10px] pr-1">
              {swipeLogs.length === 0 ? (
                <p className="text-slate-500 italic text-center py-4">RFID Reader awaiting first swipe interaction...</p>
              ) : (
                swipeLogs.map((log, index) => (
                  <div key={index} className="flex items-start justify-between py-1 border-b border-slate-900/40 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                        log.action === 'IN' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {log.action}
                      </span>
                      <span>
                        <strong className="text-white">{log.docName}</strong> ({log.docSpecialty})
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Booking Engine */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Schedule Clinical Appointment</h3>
          <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Patient *</label>
              <select
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Choose Patient Record --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Physician *</label>
              <select
                required
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Choose Attending Staff --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Appointment Date *</label>
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Session Start Time *</label>
              <input
                type="time"
                required
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Symptom Context</label>
              <input
                type="text"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder="Indicate primary reasons for session (or logs from patient file)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Attending Notes / Clinical Instruction</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes for physician review before patient is seated..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 placeholder:text-slate-400"
              />
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-teal-900/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Confirm Clinical Booking</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Area: AI Appointment Slot Optimizer & Scheduled List (5 Cols) */}
      <div className="xl:col-span-5 space-y-6">
        {/* Gemini Predictive Schedule Optimizer */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-5 text-white border border-indigo-900/40 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Predictive Wait-Time Optimizer
                <span className="text-[9px] font-normal bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">AI Core</span>
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">Optimizes physician schedules and mitigates peak congestion.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 pt-4 border-t border-indigo-900/30">
            <div>
              <label className="block text-[9px] uppercase font-semibold text-indigo-300 mb-1">Enter Patient Symptoms</label>
              <input
                type="text"
                value={aiSymptoms}
                onChange={(e) => setAiSymptoms(e.target.value)}
                placeholder="e.g. Chest tightness or asthma follow-up"
                className="w-full bg-slate-950/40 border border-indigo-800/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-semibold text-indigo-300 mb-1">Specialty Specialty</label>
                <select
                  value={aiPreferredSpecialty}
                  onChange={(e) => setAiPreferredSpecialty(e.target.value)}
                  className="w-full bg-slate-950/40 border border-indigo-800/40 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <option className="text-slate-900" value="Internal Medicine">Internal Medicine</option>
                  <option className="text-slate-900" value="Cardiology">Cardiology</option>
                  <option className="text-slate-900" value="Pulmonology">Pulmonology</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-semibold text-indigo-300 mb-1">Day Preference</label>
                <select
                  value={aiPreferredDay}
                  onChange={(e) => setAiPreferredDay(e.target.value)}
                  className="w-full bg-slate-950/40 border border-indigo-800/40 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <option className="text-slate-900" value="Monday">Monday</option>
                  <option className="text-slate-900" value="Tuesday">Tuesday</option>
                  <option className="text-slate-900" value="Wednesday">Wednesday</option>
                  <option className="text-slate-900" value="Thursday">Thursday</option>
                  <option className="text-slate-900" value="Friday">Friday</option>
                </select>
              </div>
            </div>

            <button
              onClick={triggerOptimization}
              disabled={aiOptimizing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950 cursor-pointer"
            >
              {aiOptimizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating peak clinic logs...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Forecast Optimized Slots</span>
                </>
              )}
            </button>
          </div>

          {/* AI Recommendations Output */}
          {aiResult && (
            <div className="mt-5 pt-4 border-t border-indigo-900/40 space-y-4">
              <div>
                <h5 className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Top Wait-Efficiency Slots</h5>
                <div className="space-y-2 mt-2">
                  {aiResult.recommendedSlots.map((rec, rIdx) => (
                    <div key={rIdx} className="bg-slate-950/40 border border-indigo-900/30 p-2.5 rounded-xl flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white">{rec.doctorName}</span>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-mono">
                            Wait Score: {rec.waitScore}/10
                          </span>
                        </div>
                        <p className="text-[10px] text-indigo-200 mt-1 font-mono">{rec.day} @ {rec.timeSlot}</p>
                        <p className="text-[10px] text-slate-300 mt-1 italic leading-relaxed">
                          {rec.reasoning}
                        </p>
                      </div>

                      <button
                        onClick={() => applyAIRecommendation(rec)}
                        className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Apply this slot"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/20 border border-indigo-900/20 p-3 rounded-lg text-[10px] text-slate-300 space-y-1.5">
                <p><strong>Clinic Peak Prediction:</strong> {aiResult.peakHoursAnalysis}</p>
                <p><strong>Utilization Directive:</strong> {aiResult.utilizationInsight}</p>
              </div>
            </div>
          )}
        </div>

        {/* Current Scheduled Sessions List */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-[320px] flex flex-col">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Scheduled Sessions Directory</h3>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No current appointments booked.</p>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-800">{appt.patientName}</span>
                      <span className="text-[9px] text-slate-400 font-mono">({appt.patientId})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{appt.doctorName}</span>
                    </div>
                    <div className="flex items-center gap-3.5 text-[10px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {appt.date}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-teal-600 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {appt.time}
                      </span>
                    </div>
                    {appt.notes && (
                      <p className="text-[10px] text-slate-400 mt-1.5 italic max-w-xs truncate">{appt.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCancelAppointment(appt.id)}
                      className="text-[9px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel Slot
                    </button>
                    {appt.waitMetricScore && (
                      <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
                        Wait Score: {appt.waitMetricScore}/10
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
