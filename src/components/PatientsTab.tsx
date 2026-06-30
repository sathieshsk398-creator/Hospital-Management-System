import React, { useState, useEffect } from 'react';
import { Patient, Vitals } from '../types';
import { 
  UserPlus, UserMinus, Search, Edit2, ShieldAlert, Heart, Activity, Thermometer, Droplet, 
  Sparkles, FileText, Loader2, Save, Trash2, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface PatientsTabProps {
  currentRole: 'Doctor' | 'Nurse' | 'Admin';
  onOpenLiveMonitor?: (patientId: string) => void;
}

export default function PatientsTab({ currentRole, onOpenLiveMonitor }: PatientsTabProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Edit & Create States
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form values
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(45);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodType, setBloodType] = useState('O+');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [status, setStatus] = useState<Patient['status']>('Stable');
  const [symptoms, setSymptoms] = useState('');
  const [labResults, setLabResults] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  
  // Vitals State
  const [bp, setBp] = useState('120/80');
  const [hr, setHr] = useState<number>(75);
  const [temp, setTemp] = useState<number>(98.6);
  const [spo2, setSpo2] = useState<number>(98);

  // AI Loading & Result States
  const [riskLoading, setRiskLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(() => {
      fetchPatients();
    }, 4000);
    return () => clearInterval(interval);
  }, [isEditing, isCreating, selectedPatient?.id]);

  const fetchPatients = async (overrideSelectedId?: string | null) => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
        
        const targetId = overrideSelectedId === null ? null : (overrideSelectedId || selectedPatient?.id);
        
        if (data.length === 0) {
          setSelectedPatient(null);
        } else if (!targetId) {
          setSelectedPatient(data[0]);
        } else {
          const updated = data.find((p: Patient) => p.id === targetId);
          if (updated) {
            setSelectedPatient(updated);
          } else {
            setSelectedPatient(data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsEditing(false);
    setIsCreating(false);
    setAiSummary(null);
  };

  const startCreatePatient = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPatient(null);
    setName('');
    setAge(40);
    setGender('Male');
    setBloodType('O+');
    setPhone('');
    setEmail('');
    setRoomNumber('');
    setStatus('Stable');
    setSymptoms('');
    setLabResults('');
    setMedicalHistory('');
    setBp('120/80');
    setHr(75);
    setTemp(98.6);
    setSpo2(98);
  };

  const startEditPatient = (p: Patient) => {
    setIsEditing(true);
    setIsCreating(false);
    setName(p.name);
    setAge(p.age);
    setGender(p.gender);
    setBloodType(p.bloodType);
    setPhone(p.phone);
    setEmail(p.email);
    setRoomNumber(p.roomNumber);
    setStatus(p.status);
    setSymptoms(p.symptoms);
    setLabResults(p.labResults);
    setMedicalHistory(p.medicalHistory);
    setBp(p.vitals.bp);
    setHr(p.vitals.hr);
    setTemp(p.vitals.temp);
    setSpo2(p.vitals.spo2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      age: Number(age),
      gender,
      bloodType,
      phone,
      email,
      roomNumber,
      status,
      symptoms,
      labResults,
      medicalHistory,
      vitals: { bp, hr: Number(hr), temp: Number(temp), spo2: Number(spo2) },
    };

    try {
      if (isCreating) {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const newPat = await res.json();
          showNotification('success', 'Patient record admitted successfully.');
          await fetchPatients();
          setSelectedPatient(newPat);
          setIsCreating(false);
        } else {
          showNotification('error', 'Failed to save patient.');
        }
      } else if (isEditing && selectedPatient) {
        const res = await fetch('/api/patients/' + selectedPatient.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updatedPat = await res.json();
          showNotification('success', 'Patient record updated.');
          await fetchPatients();
          setSelectedPatient(updatedPat);
          setIsEditing(false);
        } else {
          showNotification('error', 'Failed to update patient.');
        }
      }
    } catch (err: any) {
      showNotification('error', 'Network or server error occurred: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient record? This action is irreversible.')) return;
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('success', 'Patient record deleted successfully.');
        setSelectedPatient(null);
        await fetchPatients(null);
      } else {
        showNotification('error', 'Failed to delete patient record on the server.');
      }
    } catch (err: any) {
      showNotification('error', 'Failed to delete patient record: ' + err.message);
    }
  };

  const handleDischarge = async (id: string) => {
    const p = patients.find(pat => pat.id === id);
    if (!p) return;
    if (p.status === 'Discharged') {
      showNotification('error', 'Patient is already discharged.');
      return;
    }
    if (!confirm(`Are you sure you want to discharge ${p.name}? This will free their room assignment and mark their status as Discharged.`)) return;
    try {
      const payload = {
        ...p,
        status: 'Discharged' as const,
        roomNumber: '', // Clear the room assignment
      };
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showNotification('success', `${p.name} has been successfully discharged.`);
        await fetchPatients();
      } else {
        showNotification('error', 'Failed to discharge patient.');
      }
    } catch (err: any) {
      showNotification('error', 'Network or server error: ' + err.message);
    }
  };

  // Predictive AI Trigger
  const triggerRiskPrediction = async () => {
    if (!selectedPatient) return;
    setRiskLoading(true);
    try {
      const res = await fetch('/api/ai/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient.id }),
      });
      if (res.ok) {
        const result = await res.json();
        showNotification('success', `AI Risk assessment generated: ${result.riskLevel} Risk`);
        await fetchPatients();
      } else {
        showNotification('error', 'Could not compute predictive AI metrics. Check Gemini configuration.');
      }
    } catch (err: any) {
      showNotification('error', 'Error calling AI risk API: ' + err.message);
    } finally {
      setRiskLoading(false);
    }
  };

  // Clinical Report Summarization NLP trigger
  const triggerSummarization = async () => {
    if (!selectedPatient) return;
    setSummaryLoading(true);
    setAiSummary(null);
    try {
      const res = await fetch('/api/ai/summarize-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
        showNotification('success', 'NLP Clinical Summary generated successfully.');
      } else {
        showNotification('error', 'NLP summarization failed.');
      }
    } catch (err: any) {
      showNotification('error', 'Error calling AI summarization API: ' + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.roomNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="patients-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-md animate-fade-in ${
          notification.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-teal-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Left Column: Patient Directory (4 Cols) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-base">Patient Directory</h3>
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          {currentRole !== 'Doctor' && (
            <button
              onClick={startCreatePatient}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Admit Patient</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, room or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-700"
          />
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredPatients.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No matching patient records found.</p>
          ) : (
            filteredPatients.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectPatient(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectPatient(p);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedPatient?.id === p.id
                    ? 'border-teal-500 bg-teal-50/40 text-teal-900 shadow-sm'
                    : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs truncate text-slate-800">{p.name}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                      p.status === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                      p.status === 'Observation' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      p.status === 'Discharged' ? 'bg-slate-100 text-slate-600' :
                      'bg-teal-50 text-teal-600 border border-teal-100'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>Age {p.age}</span>
                    <span>•</span>
                    <span className="font-mono">{p.roomNumber || 'No Room'}</span>
                  </div>
                </div>
                
                {/* Visual Indicators & Discharge Option */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {p.complicationRisk && (
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      p.complicationRisk === 'High' ? 'bg-rose-100 text-rose-700' :
                      p.complicationRisk === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      AI {p.complicationRisk}
                    </span>
                  )}

                  {p.status !== 'Discharged' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDischarge(p.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Quick Discharge Patient"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Record Viewer / Form Editor (8 Cols) */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[500px]">
        {/* Editor Screen */}
        {(isCreating || isEditing) ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">
                  {isCreating ? 'Admit New Patient' : 'Edit Patient Clinical Records'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Fill in personal identity and current admission metrics.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setIsEditing(false); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Record</span>
                </button>
              </div>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Blood Type</label>
                <input
                  type="text"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  placeholder="e.g. O-"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Room Assignment</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. ICU-102"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Admission Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  <option value="Stable">Stable</option>
                  <option value="Critical">Critical</option>
                  <option value="Observation">Observation</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>
            </div>

            {/* Vitals Input Panel */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-500" />
                Vitals Logger (Mandatory on rounds)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={hr}
                    onChange={(e) => setHr(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Clinical Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Active Symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={2}
                  placeholder="Detail primary reasons for seeking care, discomfort level..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Laboratory and Imaging Results</label>
                <textarea
                  value={labResults}
                  onChange={(e) => setLabResults(e.target.value)}
                  rows={2}
                  placeholder="List WBC, CRP, Hematocrit, ECG readouts, CT results..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Medical Co-morbidities & History</label>
                <textarea
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  rows={2}
                  placeholder="Known allergies, surgeries, diabetic history..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 placeholder:text-slate-400"
                />
              </div>
            </div>
          </form>
        ) : selectedPatient ? (
          /* View Mode */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Patient ID: {selectedPatient.id}</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedPatient.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span>Age <strong className="text-slate-700">{selectedPatient.age}</strong></span>
                  <span>•</span>
                  <span>Gender <strong className="text-slate-700">{selectedPatient.gender}</strong></span>
                  <span>•</span>
                  <span>Blood Group <strong className="text-slate-700 font-mono">{selectedPatient.bloodType}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => onOpenLiveMonitor && onOpenLiveMonitor(selectedPatient.id)}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-rose-900/10 cursor-pointer hover:scale-[1.02] duration-150"
                  title="Launch live bedside telemetry monitor console"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Live Bedside Monitor</span>
                </button>
                {currentRole !== 'Doctor' && (
                  <button
                    onClick={() => startEditPatient(selectedPatient)}
                    className="flex items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Record</span>
                  </button>
                )}
                {selectedPatient.status !== 'Discharged' && (
                  <button
                    onClick={() => handleDischarge(selectedPatient.id)}
                    className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Discharge Patient and free room"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Discharge Patient</span>
                  </button>
                )}
                {(currentRole === 'Admin' || currentRole === 'Doctor') && (
                  <button
                    onClick={() => handleDelete(selectedPatient.id)}
                    className="flex items-center gap-1 border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                )}
              </div>
            </div>

            {/* Vitals Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                <div className="p-2 bg-rose-50 rounded-lg text-rose-500 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Blood Pressure</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{selectedPatient.vitals.bp || 'N/A'}</span>
                  <span className="text-[9px] text-slate-500 block">mmHg</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                <div className="p-2 bg-red-50 rounded-lg text-red-500 shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Heart Rate</span>
                  <span className="text-xs font-bold text-slate-800">{selectedPatient.vitals.hr || 'N/A'} <span className="text-[10px] font-normal text-slate-500">bpm</span></span>
                  <span className={`text-[9px] block ${selectedPatient.vitals.hr > 100 ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                    {selectedPatient.vitals.hr > 100 ? 'Elevated (Tachy)' : 'Normal'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-500 shrink-0">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Temperature</span>
                  <span className="text-xs font-bold text-slate-800">{selectedPatient.vitals.temp || 'N/A'} <span className="text-[10px] font-normal text-slate-500">°F</span></span>
                  <span className={`text-[9px] block ${selectedPatient.vitals.temp > 100 ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                    {selectedPatient.vitals.temp > 100 ? 'Fever State' : 'Normal'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500 shrink-0">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Oxygen (SpO2)</span>
                  <span className="text-xs font-bold text-slate-800">{selectedPatient.vitals.spo2 || 'N/A'} <span className="text-[10px] font-normal text-slate-500">%</span></span>
                  <span className={`text-[9px] block font-semibold ${selectedPatient.vitals.spo2 < 94 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {selectedPatient.vitals.spo2 < 94 ? 'Hypoxic Guard' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Predictive Analytics Panel */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white border border-slate-800 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      Clinical AI Risk Predictor
                      <span className="text-[10px] font-normal bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Gemini Insights</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">Evaluates readmission probabilities and post-discharge complications.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={triggerRiskPrediction}
                    disabled={riskLoading}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {riskLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Predicting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Assess Risk Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Prediction Results */}
              {selectedPatient.complicationRisk ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5 pt-5 border-t border-slate-800">
                  <div className="md:col-span-3 flex flex-col items-center justify-center text-center p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/40">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Readmission Chance</span>
                    <span className={`text-3xl font-extrabold mt-1.5 ${
                      selectedPatient.readmissionProbability && selectedPatient.readmissionProbability > 50 ? 'text-rose-400' :
                      selectedPatient.readmissionProbability && selectedPatient.readmissionProbability > 25 ? 'text-amber-400' :
                      'text-teal-400'
                    }`}>
                      {selectedPatient.readmissionProbability}%
                    </span>
                    <span className={`text-[10px] font-semibold uppercase mt-1 px-2 py-0.5 rounded-full ${
                      selectedPatient.complicationRisk === 'High' ? 'bg-rose-500/15 text-rose-300' :
                      selectedPatient.complicationRisk === 'Medium' ? 'bg-amber-500/15 text-amber-300' :
                      'bg-emerald-500/15 text-emerald-300'
                    }`}>
                      {selectedPatient.complicationRisk} Risk
                    </span>
                  </div>

                  <div className="md:col-span-9">
                    <h5 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">AI Justification & Care Directive</h5>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1.5 bg-slate-950/20 p-3 rounded-lg border border-slate-800/30 whitespace-pre-wrap">
                      {selectedPatient.aiRiskAnalysis}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-4 text-center py-2 border-t border-slate-800/50">
                  No predictions computed yet for this patient during this session.
                </p>
              )}
            </div>

            {/* Standard Clinical Fields & Report Summarization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Core Details */}
              <div className="space-y-4">
                <div className="border border-slate-100 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Symptoms</h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    {selectedPatient.symptoms || "No symptoms registered."}
                  </p>
                </div>

                <div className="border border-slate-100 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lab & Imaging Assays</h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    {selectedPatient.labResults || "No laboratory data entered yet."}
                  </p>
                </div>

                <div className="border border-slate-100 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comorbid Medical History</h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    {selectedPatient.medicalHistory || "None logged."}
                  </p>
                </div>
              </div>

              {/* Scribe / NLP Summarizer Panel */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-600" />
                      NLP Clinical Scribe Summary
                    </h4>
                    {currentRole === 'Doctor' && (
                      <button
                        onClick={triggerSummarization}
                        disabled={summaryLoading}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                      >
                        {summaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>Compile Summary</span>
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Convert lengthly historical lab results, clinical histories, and active symptoms into a condensed executive digest for quick round reviews.
                  </p>

                  <div className="bg-white border border-slate-200/60 p-4 rounded-xl text-xs text-slate-700 min-h-[180px] max-h-[300px] overflow-y-auto leading-relaxed prose prose-sm whitespace-pre-wrap">
                    {aiSummary ? (
                      aiSummary
                    ) : (
                      <span className="text-slate-400 italic flex flex-col items-center justify-center h-[140px] text-center">
                        {currentRole === 'Doctor' 
                          ? "Click 'Compile Summary' above to run the server-side NLP summarizer tool."
                          : "Only Physician / Doctor accounts possess privileges to compile scribe summaries on rounds."}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/40 text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-slate-400" />
                  <span>Clinical NLP engines are subject to validation audits.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full py-16 text-slate-400">
            <UserPlus className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm">No patient record selected.</p>
            <p className="text-xs mt-0.5">Please choose a patient from the directory on the left or admit a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
