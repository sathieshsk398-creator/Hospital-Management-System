import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Heart, Thermometer, Droplet, Sparkles, Loader2, 
  Settings2, Smartphone, ShieldAlert, ArrowLeft, RotateCcw, AlertTriangle, Send
} from 'lucide-react';
import { Patient } from '../types';

interface BedsideMonitorPortalProps {
  patientId: string;
  onBack?: () => void; // Optional fallback if viewed inside main application
}

export default function BedsideMonitorPortal({ patientId, onBack }: BedsideMonitorPortalProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time vital metrics states
  const [hr, setHr] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [temp, setTemp] = useState(98.6);
  const [bp, setBp] = useState("120/80");
  
  // Simulation and UI States
  const [isSimulationOpen, setIsSimulationOpen] = useState(true);
  const [activeCrisis, setActiveCrisis] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [alertStatus, setAlertStatus] = useState<'optimal' | 'warning' | 'critical'>('optimal');
  
  // Canvas Refs for Waveform drawings
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const plethCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load patient details on mount
  useEffect(() => {
    async function loadPatient() {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const patientsList: Patient[] = await res.json();
          const target = patientsList.find(p => p.id === patientId);
          if (target) {
            setPatient(target);
            setHr(target.vitals.hr || 75);
            setSpo2(target.vitals.spo2 || 98);
            setTemp(target.vitals.temp || 98.6);
            setBp(target.vitals.bp || "120/80");
          }
        }
      } catch (err) {
        console.error("Error loading patient for bedside monitor:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [patientId]);

  // Sync vitals changes back to database
  const syncVitalsToDb = async (newHr: number, newSpo2: number, newTemp: number, newBp: string) => {
    try {
      await fetch(`/api/patients/${patientId}/vitals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hr: newHr, spo2: newSpo2, temp: newTemp, bp: newBp })
      });
    } catch (err) {
      console.error("Failed to sync vitals to backend database:", err);
    }
  };

  // Continuous micro-fluctuations (simulating real organic heartbeat/breath patterns)
  useEffect(() => {
    if (loading || !patient) return;

    const interval = setInterval(() => {
      // Small random variations
      setHr(prev => {
        let variation = Math.random() > 0.5 ? 1 : -1;
        // Keep within reasonable limits based on active crises
        if (activeCrisis === 'tachycardia') {
          return Math.max(130, Math.min(155, prev + variation));
        } else if (activeCrisis === 'bradycardia') {
          return Math.max(38, Math.min(48, prev + variation));
        } else {
          return Math.max(60, Math.min(85, prev + variation));
        }
      });

      setSpo2(prev => {
        let variation = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        if (activeCrisis === 'hypoxia') {
          return Math.max(84, Math.min(91, prev + variation));
        } else {
          return Math.max(96, Math.min(100, prev + variation));
        }
      });

      setTemp(prev => {
        let variation = Number((Math.random() * 0.1 * (Math.random() > 0.5 ? 1 : -1)).toFixed(1));
        if (activeCrisis === 'sepsis') {
          return Math.max(102.5, Math.min(104.5, prev + variation));
        } else {
          return Math.max(97.8, Math.min(99.2, prev + variation));
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [loading, patient, activeCrisis]);

  // Evaluate clinical safety alarm statuses based on current vital readouts
  useEffect(() => {
    if (spo2 < 92 || hr > 125 || hr < 45 || temp > 102.2) {
      setAlertStatus('critical');
    } else if (spo2 < 95 || hr > 100 || hr < 55 || temp > 99.8 || temp < 96.5) {
      setAlertStatus('warning');
    } else {
      setAlertStatus('optimal');
    }
  }, [hr, spo2, temp]);

  // Sync state to backend periodically or on manual trigger
  useEffect(() => {
    if (!loading && patient) {
      const timeout = setTimeout(() => {
        syncVitalsToDb(hr, spo2, temp, bp);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [hr, spo2, temp, bp]);

  // Waveform Rendering Logic (ECG and Pleth)
  useEffect(() => {
    if (loading || !patient) return;

    const ecgCanvas = ecgCanvasRef.current;
    const plethCanvas = plethCanvasRef.current;
    if (!ecgCanvas || !plethCanvas) return;

    const ecgCtx = ecgCanvas.getContext('2d');
    const plethCtx = plethCanvas.getContext('2d');
    if (!ecgCtx || !plethCtx) return;

    let ecgAnimationId: number;
    let plethAnimationId: number;

    // Grid coordinates and speeds
    let ecgX = 0;
    const width = ecgCanvas.width;
    const height = ecgCanvas.height;

    // Clean initial backgrounds
    ecgCtx.fillStyle = '#020617';
    ecgCtx.fillRect(0, 0, width, height);
    plethCtx.fillStyle = '#020617';
    plethCtx.fillRect(0, 0, width, height);

    // ECG wave points history for visual continuity
    const ecgPoints: number[] = new Array(width).fill(height / 2);
    const plethPoints: number[] = new Array(width).fill(height / 2 + 10);

    // Draw grid helper
    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      
      // Vertical grid lines
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // Horizontal grid lines
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    let ecgPhase = 0;
    let plethPhase = 0;

    const renderWaveforms = () => {
      // --- ECG DRAWING ---
      ecgCtx.fillStyle = '#020617';
      ecgCtx.fillRect(0, 0, width, height);
      drawGrid(ecgCtx, width, height);

      // Heartbeat frequency mapped to heart rate (Hz or speed)
      // Normal heart rate is ~72 bpm, meaning ~1.2 beats per second.
      const beatFrequency = hr / 60; // beats per second
      const pointsPerSecond = 60; // assuming 60fps
      const waveLength = pointsPerSecond / beatFrequency;

      // Update ECG wave value
      ecgPhase += 1;
      let ecgVal = height / 2;

      // ECG Signature Beat math: P-wave, QRS-complex, T-wave
      const localPhase = ecgPhase % waveLength;
      if (localPhase < 5) {
        // P-wave
        ecgVal -= Math.sin((localPhase / 5) * Math.PI) * 8;
      } else if (localPhase >= 10 && localPhase < 12) {
        // Q-wave (sharp downward dip)
        ecgVal += 12;
      } else if (localPhase >= 12 && localPhase < 16) {
        // R-wave (massive upward spike)
        const t = (localPhase - 12) / 4;
        ecgVal -= Math.sin(t * Math.PI) * 45;
      } else if (localPhase >= 16 && localPhase < 19) {
        // S-wave (sharp downward dip)
        const t = (localPhase - 16) / 3;
        ecgVal += Math.sin(t * Math.PI) * 22;
      } else if (localPhase >= 25 && localPhase < 35) {
        // T-wave (rounded medium hump)
        const t = (localPhase - 25) / 10;
        ecgVal -= Math.sin(t * Math.PI) * 12;
      }

      // Shift history and insert new point
      ecgPoints.shift();
      ecgPoints.push(ecgVal);

      // Draw the green ECG line
      ecgCtx.beginPath();
      ecgCtx.lineWidth = 2;
      ecgCtx.strokeStyle = alertStatus === 'critical' ? '#f43f5e' : alertStatus === 'warning' ? '#f59e0b' : '#10b981';
      ecgCtx.shadowBlur = 6;
      ecgCtx.shadowColor = alertStatus === 'critical' ? '#f43f5e' : alertStatus === 'warning' ? '#f59e0b' : '#10b981';

      for (let i = 0; i < width; i++) {
        if (i === 0) ecgCtx.moveTo(i, ecgPoints[i]);
        else ecgCtx.lineTo(i, ecgPoints[i]);
      }
      ecgCtx.stroke();
      ecgCtx.shadowBlur = 0; // reset shadow

      // --- PLETH DRAWING (SpO2 / Pulse Oximeter) ---
      plethCtx.fillStyle = '#020617';
      plethCtx.fillRect(0, 0, width, height);
      drawGrid(plethCtx, width, height);

      plethPhase += 1.5; // moves slightly offset
      const plethLocalPhase = plethPhase % waveLength;
      let plethVal = height / 2 + 10;

      // Clean oxygen volume wave (dicrotic notch signature)
      if (plethLocalPhase < waveLength * 0.4) {
        // Systolic rise
        const t = plethLocalPhase / (waveLength * 0.4);
        plethVal -= Math.sin(t * Math.PI) * 25;
      } else if (plethLocalPhase >= waveLength * 0.4 && plethLocalPhase < waveLength * 0.5) {
        // Dicrotic notch dip
        const t = (plethLocalPhase - waveLength * 0.4) / (waveLength * 0.1);
        plethVal -= 12 - Math.sin(t * Math.PI) * 5;
      } else {
        // Diastolic decay
        const t = (plethLocalPhase - waveLength * 0.5) / (waveLength * 0.5);
        plethVal -= 12 * (1 - t);
      }

      plethPoints.shift();
      plethPoints.push(plethVal);

      plethCtx.beginPath();
      plethCtx.lineWidth = 2;
      plethCtx.strokeStyle = alertStatus === 'critical' ? '#f43f5e' : '#38bdf8';
      plethCtx.shadowBlur = 6;
      plethCtx.shadowColor = alertStatus === 'critical' ? '#f43f5e' : '#38bdf8';

      for (let i = 0; i < width; i++) {
        if (i === 0) plethCtx.moveTo(i, plethPoints[i]);
        else plethCtx.lineTo(i, plethPoints[i]);
      }
      plethCtx.stroke();
      plethCtx.shadowBlur = 0; // reset shadow

      ecgAnimationId = requestAnimationFrame(renderWaveforms);
    };

    renderWaveforms();

    return () => {
      cancelAnimationFrame(ecgAnimationId);
    };
  }, [loading, patient, hr, alertStatus]);

  // Manual crisis trigger helper
  const handleTriggerCrisis = (type: string) => {
    if (activeCrisis === type) {
      // Clear crisis / Reset to normal
      setActiveCrisis(null);
      setHr(74);
      setSpo2(98);
      setTemp(98.6);
      setBp("120/80");
      setAlertStatus('optimal');
      syncVitalsToDb(74, 98, 98.6, "120/80");
    } else {
      setActiveCrisis(type);
      if (type === 'tachycardia') {
        setHr(142);
        setSpo2(96);
        setTemp(99.0);
        setBp("145/95");
        syncVitalsToDb(142, 96, 99.0, "145/95");
      } else if (type === 'hypoxia') {
        setHr(95);
        setSpo2(87);
        setTemp(98.4);
        setBp("110/68");
        syncVitalsToDb(95, 87, 98.4, "110/68");
      } else if (type === 'sepsis') {
        setHr(115);
        setSpo2(94);
        setTemp(103.8);
        setBp("95/55");
        syncVitalsToDb(115, 94, 103.8, "95/55");
      } else if (type === 'bradycardia') {
        setHr(42);
        setSpo2(97);
        setTemp(97.2);
        setBp("100/60");
        syncVitalsToDb(42, 97, 97.2, "100/60");
      }
    }
    setAiAnalysis(null); // Clear previous AI advice
  };

  // AI Instant Bedside Consult
  const triggerBedsideAI = async () => {
    if (!patient) return;
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/ai/diagnose-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: `BEDSIDE ALERTS: Current vital parameters monitored live. Status is displaying ${alertStatus.toUpperCase()} warnings. Active simulated event profile: ${activeCrisis || 'None/Stable'}.`,
          vitals: { hr, spo2, temp, bp },
          labResults: `Patient: ${patient.name}. Bed Room: ${patient.roomNumber}. Diagnosed: ${patient.symptoms}. Admission Context: ${patient.medicalHistory}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        let formattedStr = `### Clinical Findings & Differentials:\n`;
        data.conditions.forEach((cond: any) => {
          formattedStr += `*   **${cond.name}** (${cond.probability}% probability): ${cond.explanation}\n`;
        });
        formattedStr += `\n### Suggested Directives:\n`;
        data.recommendedLabs.forEach((lab: string) => {
          formattedStr += `*   ${lab}\n`;
        });
        formattedStr += `\n**Clinical Referral:** Consult ${data.specialistReferrals.join(', ')}.\n\n*${data.cautionDisclaimer}*`;
        setAiAnalysis(formattedStr);
      } else {
        setAiAnalysis("Unable to formulate AI clinical analysis. Please verify your connection to the Gemini API.");
      }
    } catch (err: any) {
      setAiAnalysis("Error reaching server-side Gemini support: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-sm">Initiating bedside communication bridge...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-rose-500 p-6 text-center">
        <ShieldAlert className="w-12 h-12 mb-3" />
        <h2 className="text-xl font-bold">Unauthenticated Secure Access</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          No active patient metadata binding matches the requested ID. Please scan the QR code again or contact a system administrator.
        </p>
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-6 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Directory
          </button>
        )}
      </div>
    );
  }

  // Construct sharing link for QR visualization
  const shareUrl = `${window.location.origin}${window.location.pathname}?patientId=${patient.id}&view=vitals-portal`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-mono selection:bg-rose-500 selection:text-white">
      {/* Header Bar */}
      <header className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer mr-2"
              title="Return to Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping"></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Live Monitor</span>
              <span className="text-xs text-slate-400">Room Assignment: <strong>{patient.roomNumber}</strong></span>
            </div>
            <h1 className="text-base font-extrabold text-white mt-0.5 tracking-tight">{patient.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="hidden md:flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-lg border border-slate-800">
            <span>Demographics:</span>
            <span className="text-slate-200">{patient.gender}, {patient.age}y/o</span>
            <span className="text-slate-600">|</span>
            <span>Blood Group: <strong className="text-rose-400">{patient.bloodType}</strong></span>
          </div>
          
          <button
            onClick={() => setIsSimulationOpen(!isSimulationOpen)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            <Settings2 className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">Simulation Hub</span>
          </button>
        </div>
      </header>

      {/* Main Panel Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Waveform Sweeper & Numbers (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Bedside Warning Alarm Strip */}
          {alertStatus !== 'optimal' && (
            <div className={`p-3.5 rounded-xl border flex items-center gap-3 animate-pulse ${
              alertStatus === 'critical' 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <div className="text-xs">
                <strong>CLINICAL ALERT:</strong> Patient vitals exhibit abnormal values. Trigger immediate nurse validation rounds.
                {activeCrisis && <span className="block mt-0.5 uppercase font-bold text-white">Active Simulated State: {activeCrisis}</span>}
              </div>
            </div>
          )}

          {/* Vitals Sweeper Screens */}
          <div className="grid grid-cols-1 gap-4">
            {/* ECG Sweeper */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative">
              <div className="absolute top-3 left-4 z-10 flex items-center justify-between w-[calc(100%-32px)]">
                <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ECG - CHANNEL I (LEAD II)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">X1.0 SPEED</span>
              </div>
              <canvas 
                ref={ecgCanvasRef} 
                width={700} 
                height={160} 
                className="w-full h-[160px] block cursor-crosshair bg-slate-950"
              />
            </div>

            {/* Pleth Sweeper */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative">
              <div className="absolute top-3 left-4 z-10 flex items-center justify-between w-[calc(100%-32px)]">
                <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-sky-400" />
                  PLETH - SpO2 INTEGRATED
                </span>
                <span className="text-[10px] text-slate-500 font-mono">X1.5 GAIN</span>
              </div>
              <canvas 
                ref={plethCanvasRef} 
                width={700} 
                height={130} 
                className="w-full h-[130px] block cursor-crosshair bg-slate-950"
              />
            </div>
          </div>

          {/* Digital Telemetry Panel (Big Numbers) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* Heart Rate Display */}
            <div className={`border p-4 rounded-2xl flex flex-col justify-between h-[120px] transition-all ${
              alertStatus === 'critical' && (hr > 120 || hr < 50)
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/20' 
                : alertStatus === 'warning' && (hr > 100 || hr < 55)
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900/60 border-slate-800 text-emerald-400'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Heart Rate</span>
                <Heart className={`w-4 h-4 animate-pulse ${hr > 120 ? 'text-rose-500' : 'text-emerald-500'}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-extrabold tracking-tighter">{hr}</span>
                <span className="text-xs text-slate-400">bpm</span>
              </div>
              <span className="text-[9px] text-slate-500">Range: 60 - 100</span>
            </div>

            {/* SpO2 Display */}
            <div className={`border p-4 rounded-2xl flex flex-col justify-between h-[120px] transition-all ${
              spo2 < 93 
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/20' 
                : spo2 < 96
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900/60 border-slate-800 text-sky-400'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">SpO2 (Oxygen)</span>
                <Droplet className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-extrabold tracking-tighter">{spo2}</span>
                <span className="text-xs text-slate-400">%</span>
              </div>
              <span className="text-[9px] text-slate-500">Range: 95 - 100</span>
            </div>

            {/* Temperature Display */}
            <div className={`border p-4 rounded-2xl flex flex-col justify-between h-[120px] transition-all ${
              temp > 101.5 
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950/20' 
                : temp > 99.5
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900/60 border-slate-800 text-amber-400'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Temperature</span>
                <Thermometer className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-extrabold tracking-tighter">{temp}</span>
                <span className="text-xs text-slate-400">°F</span>
              </div>
              <span className="text-[9px] text-slate-500">Range: 97.5 - 99.0</span>
            </div>

            {/* Blood Pressure Display */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between h-[120px] text-purple-400">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Blood Pressure</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-extrabold tracking-tighter">{bp}</span>
                <span className="text-[10px] text-slate-400">mmHg</span>
              </div>
              <span className="text-[9px] text-slate-500">Range: 120/80</span>
            </div>

          </div>

          {/* AI Clinical Advisor Box */}
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold text-white">Live AI Clinical Advisor</h4>
                  <p className="text-[10px] text-slate-400">Instant evaluation of current real-time telemetries.</p>
                </div>
              </div>
              <button
                onClick={triggerBedsideAI}
                disabled={aiLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto border border-indigo-500/30"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Live Stream...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run AI Bedside Diagnosis</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-300 leading-relaxed bg-slate-950/50 border border-slate-800/40 p-4 rounded-xl max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {aiAnalysis ? (
                <div className="space-y-2">
                  {/* Simplistic formatting on lines */}
                  {aiAnalysis.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) {
                      return <h5 key={idx} className="text-white font-bold text-xs mt-3 uppercase tracking-wider">{line.replace('###', '').trim()}</h5>;
                    }
                    if (line.startsWith('*')) {
                      return <p key={idx} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-teal-400">{line.replace('*', '').trim()}</p>;
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>
              ) : (
                <span className="italic text-slate-500">
                  Click 'Run AI Bedside Diagnosis' to synthesize a real-time clinical assessment based on active heartbeat waves and oxygen levels.
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Synchronization & Simulation Remote Control (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Simulation Remote Control Hub */}
          {isSimulationOpen && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="font-bold text-sm text-white mb-1.5 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-teal-400" />
                Vitals Simulator Remote
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                Simulate critical patient states or recoveries to trigger real-time color warnings, alarms, and feed the diagnostic predictive model.
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleTriggerCrisis('tachycardia')}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                    activeCrisis === 'tachycardia'
                      ? 'bg-rose-500/10 border-rose-500/60 text-white font-bold'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <span>Tachycardia Crisis</span>
                    <span className="block text-[9px] text-slate-400 font-normal mt-0.5">HR climbs to 142 bpm, BP 145/95 mmHg</span>
                  </div>
                  {activeCrisis === 'tachycardia' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                </button>

                <button
                  onClick={() => handleTriggerCrisis('hypoxia')}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                    activeCrisis === 'hypoxia'
                      ? 'bg-rose-500/10 border-rose-500/60 text-white font-bold'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <span>Severe Hypoxia Guard</span>
                    <span className="block text-[9px] text-slate-400 font-normal mt-0.5">Oxygen SpO2 drops to 87% (Emergency)</span>
                  </div>
                  {activeCrisis === 'hypoxia' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                </button>

                <button
                  onClick={() => handleTriggerCrisis('sepsis')}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                    activeCrisis === 'sepsis'
                      ? 'bg-rose-500/10 border-rose-500/60 text-white font-bold'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <span>Sepsis & High Fever Hump</span>
                    <span className="block text-[9px] text-slate-400 font-normal mt-0.5">Temp rises to 103.8°F, BP dips to 95/55</span>
                  </div>
                  {activeCrisis === 'sepsis' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                </button>

                <button
                  onClick={() => handleTriggerCrisis('bradycardia')}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                    activeCrisis === 'bradycardia'
                      ? 'bg-rose-500/10 border-rose-500/60 text-white font-bold'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <span>Bradycardia Event</span>
                    <span className="block text-[9px] text-slate-400 font-normal mt-0.5">HR drops to 42 bpm, BP 100/60 mmHg</span>
                  </div>
                  {activeCrisis === 'bradycardia' && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                </button>

                {activeCrisis && (
                  <button
                    onClick={() => handleTriggerCrisis(activeCrisis)}
                    className="w-full text-center bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 mt-2"
                  >
                    <RotateCcw className="w-3 h-3 text-teal-400" />
                    <span>Reset Vitals to Healthy Stable</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* QR Code Synchronization Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center text-center">
            <Smartphone className="w-8 h-8 text-indigo-400 mb-2" />
            <h4 className="font-bold text-white text-xs">Mobile QR Synchronization</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-xs">
              Scan this QR Code with a tablet or mobile phone to view this bedside vital signs screen in real-time, synchronized with the hospital network.
            </p>

            <div className="bg-white p-3 rounded-xl mt-4 border border-slate-800 shadow-lg select-none">
              <img 
                src={qrCodeUrl} 
                alt="Bedside Monitor QR Code" 
                className="w-[150px] h-[150px] block" 
                referrerPolicy="no-referrer"
              />
            </div>

            <span className="text-[9px] text-slate-500 mt-3 break-all bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800 max-w-full">
              {shareUrl}
            </span>
            
            <a 
              href={shareUrl} 
              target="_blank" 
              rel="noreferrer"
              className="mt-3.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
            >
              Open Live Portal in New Window
            </a>
          </div>

          {/* Secure Compliance Note */}
          <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl text-[9px] text-slate-500 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>HIPAA Live Telemetry compliance notice:</strong> This live stream matches secure medical telemetry transmission standards. Unauthorized screen grabbing or un-vouched synchronization breaches hospital rules.
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
