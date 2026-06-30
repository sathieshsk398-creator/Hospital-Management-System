import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, Clipboard, AlertTriangle, TrendingUp, 
  DollarSign, ShieldCheck, HeartHandshake, FileText, CheckCircle2,
  UserPlus, Plus, X, Loader2, Check, Sparkles
} from 'lucide-react';
import { HospitalStats, Patient, Appointment, InventoryItem, Billing } from '../types';

export default function DashboardStats() {
  const [stats, setStats] = useState<HospitalStats>({
    occupancyRate: 0,
    activeDoctors: 0,
    lowStockItemsCount: 0,
    totalRevenue: 0,
  });

  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [lowStockSupplies, setLowStockSupplies] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Register New Patient States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState<number>(35);
  const [newPatientGender, setNewPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [newPatientBloodType, setNewPatientBloodType] = useState('O+');
  const [newPatientRoom, setNewPatientRoom] = useState('A-101');
  const [newPatientStatus, setNewPatientStatus] = useState<'Stable' | 'Critical' | 'Observation'>('Stable');
  const [symptoms, setSymptoms] = useState('');
  const [bp, setBp] = useState('120/80');
  const [hr, setHr] = useState<number>(75);
  const [temp, setTemp] = useState<number>(98.6);
  const [spo2, setSpo2] = useState<number>(98);
  const [labResults, setLabResults] = useState('');

  // Interactive feedback states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegisterNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      setActionMessage({ type: 'error', text: 'Patient Name is mandatory for directory admission.' });
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const newProfile = {
        name: newPatientName.trim(),
        age: Number(newPatientAge),
        gender: newPatientGender,
        bloodType: newPatientBloodType,
        roomNumber: newPatientRoom,
        status: newPatientStatus,
        phone: '+1 (555) 019-2831',
        email: `${newPatientName.toLowerCase().replace(/\s+/g, '')}@medassist-clinic.com`,
        symptoms,
        vitals: {
          bp,
          hr: Number(hr),
          temp: Number(temp),
          spo2: Number(spo2)
        },
        labResults,
        medicalHistory: 'No chronic history logged. Initial diagnosis pending.'
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });

      if (res.ok) {
        const savedPatient = await res.json();
        setActionMessage({ type: 'success', text: `Successfully admitted & saved ${savedPatient.name} to the Patient Directory!` });
        
        // Refresh dashboard data so they see the new patient in the bed list instantly!
        fetchDashboardData();

        setTimeout(() => {
          setShowAddModal(false);
          // Clear states
          setNewPatientName('');
          setNewPatientAge(35);
          setNewPatientGender('Male');
          setNewPatientBloodType('O+');
          setNewPatientRoom('A-101');
          setNewPatientStatus('Stable');
          setSymptoms('');
          setBp('120/80');
          setHr(75);
          setTemp(98.6);
          setSpo2(98);
          setLabResults('');
          setActionMessage(null);
        }, 1500);
      } else {
        setActionMessage({ type: 'error', text: 'Failed to register new patient on server.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Admission bridge error: ${err.message || err}` });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [statsRes, patsRes, apptsRes, invRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/patients'),
        fetch('/api/appointments'),
        fetch('/api/inventory'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (patsRes.ok) {
        const pats = await patsRes.json();
        setRecentPatients(pats.slice(0, 3));
      }
      if (apptsRes.ok) {
        const appts = await apptsRes.json();
        setRecentAppointments(appts.slice(0, 3));
      }
      if (invRes.ok) {
        const inv = await invRes.json();
        const low = inv.filter((item: any) => item.status === 'Low Stock' || item.status === 'Out of Stock');
        setLowStockSupplies(low.slice(0, 3));
      }
    } catch (err) {
      console.error('Error compiling dashboard analytics:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Activity className="w-5 h-5 animate-spin text-teal-600" />
        <span className="text-sm font-semibold">Consolidating live St. Jude KPI datasets...</span>
      </div>
    );
  }

  return (
    <div id="dashboard-stats" className="space-y-6">
      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bed Occupancy Rate</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-1.5">{stats.occupancyRate}%</span>
            <span className="text-[9.5px] text-teal-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Optimal capacity tracking</span>
            </span>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Clinical Staff */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">On-Duty Physicians</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-1.5">{stats.activeDoctors}</span>
            <span className="text-[9.5px] text-slate-500 font-normal mt-1 block">Attending specialist categories</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock supplies alert */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Supply Stock Depletion</span>
            <span className={`text-2xl font-extrabold block mt-1.5 ${stats.lowStockItemsCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {stats.lowStockItemsCount} items
            </span>
            <span className={`text-[9.5px] font-semibold flex items-center gap-1 mt-1 ${stats.lowStockItemsCount > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-600'}`}>
              {stats.lowStockItemsCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Restock recommended</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Adequate buffer reserves</span>
                </>
              )}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${stats.lowStockItemsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Paid Revenue */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Gross Audited Revenue</span>
            <span className="text-2xl font-extrabold text-slate-800 block mt-1.5">${stats.totalRevenue.toLocaleString()}</span>
            <span className="text-[9.5px] text-teal-600 font-semibold flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Paid transactions only</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Directory Activity Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Active Wards Admissions */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Admitted Bed Monitoring</h3>
            <button
              onClick={() => {
                setShowAddModal(true);
                setActionMessage(null);
              }}
              className="p-1.5 hover:bg-slate-50 border border-slate-100 rounded-lg text-teal-600 hover:text-teal-700 transition-all cursor-pointer flex items-center gap-1"
              title="Add New Patient Entry"
            >
              <UserPlus className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Admit</span>
            </button>
          </div>
          <div className="space-y-3">
            {recentPatients.map((pat) => (
              <div key={pat.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-800">{pat.name}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                      {pat.roomNumber || 'No Room'}
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-[9.5px] text-slate-500 mt-1 font-mono">
                    <span>BP: {pat.vitals.bp}</span>
                    <span>•</span>
                    <span>SpO2: {pat.vitals.spo2}%</span>
                  </div>
                </div>

                <span className={`text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  pat.status === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' :
                  pat.status === 'Observation' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-teal-50 text-teal-600 border border-teal-100'
                }`}>
                  {pat.status}
                </span>
              </div>
            ))}
            {recentPatients.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No patients admitted in directory.</p>
            )}
          </div>
        </div>

        {/* Column 2: Scheduled Appointments */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Round Schedules</h3>
          <div className="space-y-3">
            {recentAppointments.map((appt) => (
              <div key={appt.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-xs text-slate-800">{appt.patientName}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Attending: {appt.doctorName}</p>
                  </div>
                  <span className="text-[9.5px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono font-semibold px-2 py-0.5 rounded-full">
                    {appt.time}
                  </span>
                </div>
              </div>
            ))}
            {recentAppointments.length === 0 && (
              <p className="text-xs text-slate-400 py-6 text-center">No active round slots scheduled.</p>
            )}
          </div>
        </div>

        {/* Column 3: Low supplies Alert */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Supply Depletion Monitor</h3>
          <div className="space-y-3">
            {lowStockSupplies.map((item) => (
              <div key={item.id} className="p-3 bg-amber-50/30 border border-amber-100/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-800">{item.name}</span>
                  <div className="flex gap-2.5 text-[9.5px] text-slate-500 mt-1">
                    <span>Category: <strong className="font-normal text-slate-600">{item.category}</strong></span>
                    <span>•</span>
                    <span>Loc: <strong className="font-normal text-slate-600">{item.location}</strong></span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-800 block">{item.quantity}</span>
                  <span className="text-[9px] text-rose-500 font-bold uppercase block">Min: {item.minRequired}</span>
                </div>
              </div>
            ))}
            {lowStockSupplies.length === 0 && (
              <div className="py-6 text-center text-emerald-600 flex flex-col items-center gap-1">
                <ShieldCheck className="w-7 h-7" />
                <p className="text-xs font-semibold">All supplies are safely stocked.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admissions Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Admit & Register New Patient</h3>
                  <p className="text-[10px] text-slate-500">Add an active profile to the clinical directories.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleRegisterNewPatient} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Age</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={150}
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Room */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Room Number</label>
                  <input
                    type="text"
                    required
                    value={newPatientRoom}
                    onChange={(e) => setNewPatientRoom(e.target.value)}
                    placeholder="e.g. B-205"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                {/* Blood Type */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Blood Type</label>
                  <input
                    type="text"
                    required
                    value={newPatientBloodType}
                    onChange={(e) => setNewPatientBloodType(e.target.value)}
                    placeholder="e.g. AB-"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                {/* Status */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Admission Status</label>
                  <select
                    value={newPatientStatus}
                    onChange={(e) => setNewPatientStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
                  >
                    <option value="Stable">Stable</option>
                    <option value="Observation">Observation</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Vitals Check */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  Initial Vitals
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">BP (mmHg)</label>
                    <input
                      type="text"
                      required
                      value={bp}
                      onChange={(e) => setBp(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">HR (bpm)</label>
                    <input
                      type="number"
                      required
                      value={hr}
                      onChange={(e) => setHr(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">Temp (°F)</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      required
                      value={spo2}
                      onChange={(e) => setSpo2(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Active Symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={2}
                  placeholder="e.g. Mild chest discomfort, dry cough, dizziness upon standing..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              {/* Lab Results */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Lab / Imaging Findings (Optional)</label>
                <textarea
                  value={labResults}
                  onChange={(e) => setLabResults(e.target.value)}
                  rows={2}
                  placeholder="e.g. Normal blood counts. EKG shows normal sinus rhythm."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-teal-500 placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              {/* Action Feedbacks */}
              {actionMessage && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  actionMessage.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {actionMessage.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium leading-relaxed">{actionMessage.text}</span>
                </div>
              )}

              {/* Submit / Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Admit Patient</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
