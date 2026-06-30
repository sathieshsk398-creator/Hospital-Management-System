import React, { useState, useEffect } from 'react';
import { AIDiagnosisResult, Patient } from '../types';
import { 
  Sparkles, HeartHandshake, AlertTriangle, ShieldAlert, Plus, 
  Trash2, Loader2, PlayCircle, Clipboard, Activity, FileDown, UserCheck,
  Heart, Check, Pause, Play, RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function DiagnosisTab() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [symptoms, setSymptoms] = useState('');
  const [bp, setBp] = useState('120/80');
  const [hr, setHr] = useState<number>(75);
  const [temp, setTemp] = useState<number>(98.6);
  const [spo2, setSpo2] = useState<number>(98);
  const [labResults, setLabResults] = useState('');

  // Fetch patient profiles on mount
  useEffect(() => {
    async function loadPatients() {
      setLoadingPatients(true);
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        }
      } catch (err) {
        console.error("Failed to load patient profiles for selector:", err);
      } finally {
        setLoadingPatients(false);
      }
    }
    loadPatients();
  }, []);

  const handleSelectPatientProfile = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (!patientId) {
      handleClear();
      return;
    }
    const target = patients.find(p => p.id === patientId);
    if (target) {
      setSymptoms(target.symptoms || '');
      setBp(target.vitals?.bp || '120/80');
      setHr(target.vitals?.hr || 75);
      setTemp(target.vitals?.temp || 98.6);
      setSpo2(target.vitals?.spo2 || 98);
      setLabResults(target.labResults || '');
      // Reset diagnostic status to prompt a fresh analysis
      setDiagnosisResult(null);
      setErrorMsg(null);
    }
  };

  // AI Diagnosis output state
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<AIDiagnosisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Telemetry Simulation States
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [liveHr, setLiveHr] = useState(75);
  const [liveSpo2, setLiveSpo2] = useState(98);
  const [liveBp, setLiveBp] = useState('120/80');
  const [liveTemp, setLiveTemp] = useState(98.6);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  // Live Analysis & Reporting States
  const [analyzingLive, setAnalyzingLive] = useState(false);
  const [liveAnalysisResult, setLiveAnalysisResult] = useState<any | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'differential' | 'telemetry'>('differential');

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Synchronize live starting values when form inputs/patient switches change
  useEffect(() => {
    setLiveHr(hr);
  }, [hr]);
  useEffect(() => {
    setLiveSpo2(spo2);
  }, [spo2]);
  useEffect(() => {
    setLiveBp(bp);
  }, [bp]);
  useEffect(() => {
    setLiveTemp(temp);
  }, [temp]);

  // Live physiological fluctuation thread
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setLiveHr(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(45, Math.min(170, prev + delta));
      });

      setLiveSpo2(prev => {
        if (Math.random() > 0.8) {
          const delta = Math.random() > 0.5 ? 1 : -1;
          return Math.max(80, Math.min(100, prev + delta));
        }
        return prev;
      });

      setLiveTemp(prev => {
        if (Math.random() > 0.7) {
          const delta = Math.random() > 0.5 ? 0.1 : -0.1;
          return Number(Math.max(95, Math.min(106, prev + delta)).toFixed(1));
        }
        return prev;
      });

      setLiveBp(prev => {
        const parts = prev.split('/');
        if (parts.length === 2) {
          const sys = parseInt(parts[0]);
          const dia = parseInt(parts[1]);
          if (!isNaN(sys) && !isNaN(dia)) {
            const sysDelta = Math.random() > 0.5 ? 1 : -1;
            const diaDelta = Math.random() > 0.5 ? 1 : -1;
            return `${Math.max(90, Math.min(190, sys + sysDelta))}/${Math.max(50, Math.min(110, dia + diaDelta))}`;
          }
        }
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Dynamic clinical logs generator
  useEffect(() => {
    if (!isLiveStreaming) return;

    const generateLog = () => {
      const timestamp = new Date().toLocaleTimeString();
      let logText = '';
      const r = Math.random();

      if (liveHr > 105) {
        logText = `Tachycardia alert: HR at ${liveHr} bpm. Standard sinus rhythm hyperactive.`;
      } else if (liveHr < 55) {
        logText = `Bradycardia notice: HR at ${liveHr} bpm. Hemodynamic state resting.`;
      } else if (liveSpo2 < 93) {
        logText = `Hypoxia warning: SpO2 dipped to ${liveSpo2}%. Monitor airway expansion closely.`;
      } else if (r < 0.25) {
        logText = `Standard dual-channel ECG rhythm verified at ${liveHr} bpm.`;
      } else if (r < 0.5) {
        logText = `Arterial tension baseline recorded at ${liveBp} mmHg.`;
      } else if (r < 0.75) {
        logText = `Thermal telemetry reads ${liveTemp}°F. Normal homeostasis index.`;
      } else {
        logText = `Oxygen tissue saturation verified at ${liveSpo2}% SpO2.`;
      }

      setLiveLogs(prev => [`[${timestamp}] ${logText}`, ...prev.slice(0, 8)]);
    };

    generateLog();
    const logInterval = setInterval(generateLog, 6000);
    return () => clearInterval(logInterval);
  }, [isLiveStreaming, liveHr, liveSpo2, liveBp, liveTemp]);

  // High-performance EKG & Pleth Waveform Canvas Rendering thread
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)'; // Neon cyan accent grid lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 15) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }
    };

    let points: number[] = new Array(width).fill(height * 0.4);

    const render = () => {
      if (!isLiveStreaming) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      drawGrid();

      points.shift();
      
      const pulseSpeed = 60000 / liveHr;
      const cycle = Date.now() % pulseSpeed;
      const progress = cycle / pulseSpeed;
      
      let targetY = height * 0.4;
      
      if (progress > 0.08 && progress < 0.12) {
        targetY = (height * 0.4) - 3; // P wave
      } else if (progress >= 0.12 && progress < 0.14) {
        targetY = height * 0.4;
      } else if (progress >= 0.14 && progress < 0.16) {
        targetY = (height * 0.4) + 2; // Q wave
      } else if (progress >= 0.16 && progress < 0.19) {
        targetY = (height * 0.4) - 18; // R spike
      } else if (progress >= 0.19 && progress < 0.22) {
        targetY = (height * 0.4) + 7; // S wave
      } else if (progress >= 0.22 && progress < 0.26) {
        targetY = height * 0.4;
      } else if (progress >= 0.26 && progress < 0.32) {
        targetY = (height * 0.4) - 5; // T wave
      } else {
        targetY = (height * 0.4) + (Math.sin(Date.now() / 40) * 0.3);
      }

      points.push(targetY);

      // Draw Cyan EKG line
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 2;
      ctx.beginPath();
      ctx.moveTo(0, points[0]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(i, points[i]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw Emerald PPG / Oxygen Wave
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, (height * 0.78) + Math.sin(Date.now() / 150) * 4);
      for (let i = 1; i < points.length; i++) {
        const offset = Math.sin((Date.now() + i * 12) / 140) * 3;
        const pulseEffect = progress > 0.18 && progress < 0.42 ? Math.sin((progress - 0.18) * Math.PI) * -6 : 0;
        ctx.lineTo(i, (height * 0.78) + offset + pulseEffect);
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLiveStreaming, liveHr]);

  // Synchronize Live Snapshots back to Form Values
  const handleCaptureSnapshot = () => {
    setHr(liveHr);
    setSpo2(liveSpo2);
    setBp(liveBp);
    setTemp(liveTemp);
  };

  // Generate Real-time AI Telemetry Assessment
  const handleGenerateLiveAnalysis = async () => {
    setAnalyzingLive(true);
    setLiveError(null);
    setLiveAnalysisResult(null);
    setRightTab('telemetry'); // Automatically focus the telemetry results tab

    const activePatient = patients.find(p => p.id === selectedPatientId);

    try {
      const res = await fetch('/api/ai/live-time-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vitals: {
            bp: liveBp,
            hr: liveHr,
            temp: liveTemp,
            spo2: liveSpo2
          },
          symptoms: symptoms || "Passive telemetry stream evaluation. Standard continuous baseline monitoring.",
          patientName: activePatient ? activePatient.name : "Admitted Telemetry Bedstream"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLiveAnalysisResult(data);
      } else {
        const errData = await res.json();
        setLiveError(errData.error || "Failed to finalize live physiologic telemetry analysis report.");
      }
    } catch (err: any) {
      setLiveError(`Telemetry analysis communication fault: ${err.message || err}`);
    } finally {
      setAnalyzingLive(false);
    }
  };

  // Download Live Telemetry report to PDF
  const handleDownloadLivePDF = () => {
    if (!liveAnalysisResult) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let y = 15;

    const checkPageOverflow = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Cyan top accent bar
    doc.setFillColor(6, 182, 212);
    doc.rect(margin, y, contentWidth, 2, 'F');
    y += 8;

    // Header Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("REAL-TIME PHYSIOLOGICAL TELEMETRY & STABILITY REPORT", margin, y);
    y += 6;

    // Stamp
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const nowStamp = new Date().toLocaleString();
    const activePatient = patients.find(p => p.id === selectedPatientId);
    doc.text(`Patient Profile: ${activePatient ? activePatient.name : "Passive Baseline Telemetry"}  |  Generated: ${nowStamp}`, margin, y);
    y += 8;

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // Snapshots table
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("1. TELEMETRY SIGNAL SNAPSHOT", margin, y);
    y += 5;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 14, 'S');

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const colW = contentWidth / 4;
    doc.text(`Heart Rate: ${liveHr} bpm`, margin + 4, y + 8.5);
    doc.text(`Blood Pressure: ${liveBp} mmHg`, margin + colW + 4, y + 8.5);
    doc.text(`SpO2 Oxygen: ${liveSpo2}%`, margin + (colW * 2) + 4, y + 8.5);
    doc.text(`Core Temp: ${liveTemp} °F`, margin + (colW * 3) + 4, y + 8.5);
    y += 22;

    // Stability evaluation
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. CARDIOVASCULAR & RESPIRATORY ANALYSIS", margin, y);
    y += 6;

    // Stability Score Box
    doc.setFillColor(240, 253, 250);
    doc.rect(margin, y, contentWidth, 16, 'F');
    doc.setDrawColor(13, 148, 136);
    doc.rect(margin, y, contentWidth, 16, 'S');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 118, 110);
    doc.text(`Physiologic Stability Index: ${liveAnalysisResult.autonomicStabilityScore} / 100`, margin + 6, y + 7);
    doc.text(`Triage Level Recommendation: ${liveAnalysisResult.clinicalTriageLevel.toUpperCase()}`, margin + 6, y + 12);
    y += 22;

    // CV
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Cardiovascular Assessment:", margin, y);
    y += 4.5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const cvWrapped = doc.splitTextToSize(liveAnalysisResult.cardiovascularStatus, contentWidth);
    doc.text(cvWrapped, margin, y);
    y += (cvWrapped.length * 4.5) + 6;

    // Resp
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Respiratory Assessment:", margin, y);
    y += 4.5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const respWrapped = doc.splitTextToSize(liveAnalysisResult.respiratoryStatus, contentWidth);
    doc.text(respWrapped, margin, y);
    y += (respWrapped.length * 4.5) + 6;

    // Warnings / anomalies
    if (liveAnalysisResult.detectedAnomalies && liveAnalysisResult.detectedAnomalies.length > 0) {
      checkPageOverflow(20);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(225, 29, 72);
      doc.text("Detected Physiologic Anomalies / Waveform Alerts:", margin, y);
      y += 5;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      liveAnalysisResult.detectedAnomalies.forEach((anom: string) => {
        const anomWrapped = doc.splitTextToSize(`• ${anom}`, contentWidth);
        checkPageOverflow(anomWrapped.length * 4.5);
        doc.text(anomWrapped, margin, y);
        y += (anomWrapped.length * 4.5);
      });
      y += 6;
    }

    // Dynamic Summary
    checkPageOverflow(20);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("3. CLINICAL DIRECTIVE & ACTION PROTOCOL", margin, y);
    y += 5;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const synthesisWrapped = doc.splitTextToSize(liveAnalysisResult.physiologicalSummary, contentWidth);
    checkPageOverflow(synthesisWrapped.length * 4.5);
    doc.text(synthesisWrapped, margin, y);
    y += (synthesisWrapped.length * 4.5) + 5;

    const actionWrapped = doc.splitTextToSize(`Clinical Priority Interval: ${liveAnalysisResult.timeFrameAction}`, contentWidth);
    checkPageOverflow(actionWrapped.length * 4.5);
    doc.text(actionWrapped, margin, y);
    y += (actionWrapped.length * 4.5) + 10;

    // Disclaimer
    checkPageOverflow(25);
    doc.setFillColor(254, 243, 199);
    doc.rect(margin, y, contentWidth, 15, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.rect(margin, y, contentWidth, 15, 'S');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text("LIVE TELEMETRY INTERPRETATION NOTICE:", margin + 4, y + 4.5);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.text("This real-time telemetry assessment provides immediate clinical decision assistance and waveform summaries. It represents dynamic physiologic signals and is intended as visual reference support, not a primary diagnostic platform.", margin + 4, y + 8.5);

    const filename = `Clinical_Telemetry_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setErrorMsg('Symptom descriptions are mandatory for clinical assessment.');
      return;
    }

    setDiagnosing(true);
    setDiagnosisResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/diagnose-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          vitals: { bp, hr, temp, spo2 },
          labResults,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setDiagnosisResult(result);
      } else {
        const errData = await res.json();
        const detailsStr = errData.details ? `: ${errData.details}` : '';
        setErrorMsg(`${errData.error || 'The diagnostic service is currently unavailable.'}${detailsStr}`);
      }
    } catch (err: any) {
      setErrorMsg(`Network or configuration fault: ${err.message || err}. Check that your Gemini API key is valid.`);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleClear = () => {
    setSelectedPatientId('');
    setSymptoms('');
    setBp('120/80');
    setHr(75);
    setTemp(98.6);
    setSpo2(98);
    setLabResults('');
    setDiagnosisResult(null);
    setErrorMsg(null);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    let y = 15;

    // Helper to check for page overflow
    const checkPageOverflow = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Rose Top Decorative bar
    doc.setFillColor(225, 29, 72); // Rose-600
    doc.rect(margin, y, contentWidth, 2, 'F');
    y += 8;

    // Header Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // Slate-900
    if (diagnosisResult) {
      doc.text("CLINICAL DIAGNOSIS & DECISION SUPPORT REPORT", margin, y);
    } else {
      doc.text("CLINICAL FINDINGS & SYMPTOM LOG REPORT", margin, y);
    }
    y += 6;

    // Subtitle / Stamp
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    const nowStamp = new Date().toLocaleString();
    doc.text(`Generated: ${nowStamp}  |  MedAssist AI Diagnostics Platform`, margin, y);
    y += 8;

    // Line separator
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // Optional: Patient Profile block
    const activePatient = patients.find(p => p.id === selectedPatientId);
    if (activePatient) {
      checkPageOverflow(30);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PATIENT PROFILE", margin, y);
      y += 6;

      doc.setFillColor(248, 250, 252); // Slate-50
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const patColW = contentWidth / 3;
      doc.text(`Name: ${activePatient.name}`, margin + 4, y + 6);
      doc.text(`Age / Gender: ${activePatient.age} / ${activePatient.gender}`, margin + patColW + 4, y + 6);
      doc.text(`Blood Type: ${activePatient.bloodType}`, margin + (patColW * 2) + 4, y + 6);
      
      doc.text(`Room: ${activePatient.roomNumber || 'N/A'}`, margin + 4, y + 13);
      doc.text(`Admission: ${activePatient.admissionDate ? new Date(activePatient.admissionDate).toLocaleDateString() : 'N/A'}`, margin + patColW + 4, y + 13);
      doc.text(`ID: ${activePatient.id.slice(0, 8)}...`, margin + (patColW * 2) + 4, y + 13);
      y += 24;

      if (activePatient.medicalHistory) {
        checkPageOverflow(15);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Past Medical History:", margin, y);
        y += 4.5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const historyWrapped = doc.splitTextToSize(activePatient.medicalHistory, contentWidth);
        checkPageOverflow(historyWrapped.length * 4.5);
        doc.text(historyWrapped, margin, y);
        y += (historyWrapped.length * 4.5) + 6;
      }
    }

    // 1. Clinical inputs section
    checkPageOverflow(20);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("1. CLINICAL DATA INPUTS", margin, y);
    y += 6;

    // Symptoms Subtitle
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text("Presenting Symptoms:", margin, y);
    y += 4.5;

    // Symptoms description
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate-700
    const symptomsWrapped = doc.splitTextToSize(symptoms || "No symptoms entered.", contentWidth);
    checkPageOverflow(symptomsWrapped.length * 4.5);
    doc.text(symptomsWrapped, margin, y);
    y += (symptomsWrapped.length * 4.5) + 6;

    // Vitals table box
    checkPageOverflow(25);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Patient Physiological Vitals:", margin, y);
    y += 4.5;

    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 12, 'S');

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const colW = contentWidth / 4;
    doc.text(`BP: ${bp}`, margin + 4, y + 7.5);
    doc.text(`Heart Rate: ${hr} bpm`, margin + colW + 4, y + 7.5);
    doc.text(`Temp: ${temp} °F`, margin + (colW * 2) + 4, y + 7.5);
    doc.text(`SpO2: ${spo2}%`, margin + (colW * 3) + 4, y + 7.5);
    y += 18;

    // Lab Results if any
    if (labResults) {
      checkPageOverflow(15);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Laboratory Assays & Imaging Diagnostics:", margin, y);
      y += 4.5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const labWrapped = doc.splitTextToSize(labResults, contentWidth);
      checkPageOverflow(labWrapped.length * 4.5);
      doc.text(labWrapped, margin, y);
      y += (labWrapped.length * 4.5) + 8;
    }

    if (diagnosisResult) {
      // 2. AI Differential Results Section
      checkPageOverflow(15);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, margin + contentWidth, y);
      y += 8;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("2. AI DIFFERENTIAL ASSESSMENT SUGGESTIONS", margin, y);
      y += 6;

      // List out conditions
      diagnosisResult.conditions.forEach((cond, idx) => {
        checkPageOverflow(30);

        // Name & Probability
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(225, 29, 72); // Rose-600
        doc.text(`${idx + 1}. ${cond.name}`, margin, y);
        
        doc.setTextColor(15, 23, 42);
        const scoreStr = `Probability Score: ${cond.probability}%`;
        const scoreX = margin + contentWidth - doc.getTextWidth(scoreStr);
        doc.text(scoreStr, scoreX, y);
        y += 5;

        // Explanation
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const explWrapped = doc.splitTextToSize(cond.explanation, contentWidth);
        checkPageOverflow(explWrapped.length * 4);
        doc.text(explWrapped, margin, y);
        y += (explWrapped.length * 4) + 4;

        // Matching Symptoms
        checkPageOverflow(10);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Matched Symptoms:", margin, y);
        y += 4;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const matchedString = cond.matchingSymptoms.join(", ");
        const matchWrapped = doc.splitTextToSize(matchedString, contentWidth);
        checkPageOverflow(matchWrapped.length * 4);
        doc.text(matchWrapped, margin, y);
        y += (matchWrapped.length * 4) + 6;
      });

      // 3. Recommended diagnostics & specialist referrals
      checkPageOverflow(25);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, margin + contentWidth, y);
      y += 8;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("3. DIRECTIVES & RECOMMENDATIONS", margin, y);
      y += 6;

      // Side by side layouts
      const splitWidth = (contentWidth / 2) - 4;
      const rightColX = margin + (contentWidth / 2) + 4;

      let colY1 = y;
      let colY2 = y;

      // Labs Column
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Recommended Diagnostics:", margin, colY1);
      colY1 += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      diagnosisResult.recommendedLabs.forEach(lab => {
        checkPageOverflow(5);
        const labLines = doc.splitTextToSize(`• ${lab}`, splitWidth);
        doc.text(labLines, margin, colY1);
        colY1 += (labLines.length * 4);
      });

      // Referrals Column
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Specialist Referrals:", rightColX, colY2);
      colY2 += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      diagnosisResult.specialistReferrals.forEach(ref => {
        checkPageOverflow(5);
        const refLines = doc.splitTextToSize(`• ${ref}`, splitWidth);
        doc.text(refLines, rightColX, colY2);
        colY2 += (refLines.length * 4);
      });

      y = Math.max(colY1, colY2) + 10;

      // Disclaimer Block
      checkPageOverflow(25);
      doc.setFillColor(254, 243, 199); // Amber-100
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setDrawColor(245, 158, 11); // Amber-500
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14); // Amber-800
      doc.text("CLINICAL CLINICIAN DISCLAIMER:", margin + 4, y + 5);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      const discLines = doc.splitTextToSize(
        diagnosisResult.cautionDisclaimer || "This differential assistance report is designed for informational backup. It should only be evaluated by a licensed practitioner and is not a clinical replacement for laboratory assays and professional round checks.",
        contentWidth - 8
      );
      doc.text(discLines, margin + 4, y + 9);
    } else {
      // If no AI assessment yet, provide an information notice block
      checkPageOverflow(25);
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setDrawColor(59, 130, 246); // Blue-500
      doc.rect(margin, y, contentWidth, 18, 'S');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.text("INFORMATION NOTICE:", margin + 4, y + 5);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138);
      const noticeLines = doc.splitTextToSize(
        "This report only contains documented clinical findings and symptoms. An AI Differential Assessment has not yet been processed for this data. To generate an AI assessment report, click the 'Run Differential Assessment' button inside the MedAssist platform.",
        contentWidth - 8
      );
      doc.text(noticeLines, margin + 4, y + 9);
    }

    // Save PDF
    const reportType = diagnosisResult ? "Clinical_Analysis_Report" : "Clinical_Findings_Report";
    const filename = `${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  return (
    <div id="diagnosis-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Input Column (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 bg-rose-50 rounded-lg text-rose-500">
              <Clipboard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Differential Diagnosis Aid</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Clinical decision tool for medical professionals.</p>
            </div>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4">
            {/* Quick Profile Load Dropdown */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  Quick-Load Admitted Patient Profile
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => handleSelectPatientProfile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
                >
                  <option value="">-- Select Active Admitted Patient to Auto-Fill --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Age {p.age}, Room {p.roomNumber} - {p.status})
                    </option>
                  ))}
                </select>
                {selectedPatientId && (
                  <div className="mt-1.5 text-[9.5px] text-rose-600 font-bold font-mono flex items-center gap-1.5 pl-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    Loaded active records for {patients.find(p => p.id === selectedPatientId)?.name}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Patient Symptoms *</label>
              <textarea
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={4}
                placeholder="List patient symptoms in detail (e.g., localized swelling in left ankle, radiating leg pain, throbbing warmth...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-rose-500 placeholder:text-slate-400 leading-relaxed"
              />
            </div>

            {/* Vitals */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-rose-500" />
                Current Vitals Check
              </label>
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={bp}
                    onChange={(e) => setBp(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">HR (bpm)</label>
                  <input
                    type="number"
                    value={hr}
                    onChange={(e) => setHr(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-semibold text-slate-400 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Lab / Imaging Findings (Optional)</label>
              <textarea
                value={labResults}
                onChange={(e) => setLabResults(e.target.value)}
                rows={3}
                placeholder="Include WBC counts, Troponin levels, CRP assay, ultrasound summaries, chest film readouts..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-rose-500 placeholder:text-slate-400 leading-relaxed"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Download current clinical findings and assessment as a PDF report"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Report</span>
              </button>
              <button
                type="submit"
                disabled={diagnosing}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-rose-900/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {diagnosing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing clinical inputs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Differential Assessment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Physiological Telemetry Monitor */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {isLiveStreaming && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isLiveStreaming ? 'bg-cyan-500' : 'bg-slate-500'}`}></span>
              </span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                  Live Physiological Telemetry
                </h3>
                <p className="text-[10px] text-slate-400">Continuous high-frequency bedside simulation stream.</p>
              </div>
            </div>

            {/* Wave Player Controls */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isLiveStreaming 
                    ? 'text-cyan-400 hover:bg-slate-700 hover:text-cyan-300' 
                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title={isLiveStreaming ? 'Pause Real-Time Telemetry Stream' : 'Resume Real-Time Telemetry Stream'}
              >
                {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="p-1 rounded text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1"
                title="Capture current live telemetry snapshot & sync to traditional AI form"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Sync Vitals</span>
              </button>
            </div>
          </div>

          {/* Scrolling Waveform Area */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <canvas
              ref={canvasRef}
              width={400}
              height={110}
              className="w-full h-[110px] block"
            />
            {/* Overlay indicators */}
            <div className="absolute top-2 left-3 flex items-center gap-4 text-[9px] font-mono tracking-wider text-slate-400 select-none">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                <span>ECG-II (DIALIZED)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>PPG-SATELLITE</span>
              </div>
            </div>
            {!isLiveStreaming && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Pause className="w-4 h-4 text-slate-400" />
                  Waveform Paused
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Numeric Vital Displays */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* HR block */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center relative overflow-hidden group">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">HR</span>
                <Heart className={`w-3.5 h-3.5 text-rose-500 shrink-0 ${isLiveStreaming ? 'animate-pulse' : ''}`} />
              </div>
              <span className="text-xl font-extrabold font-mono text-rose-500 block">
                {liveHr}
              </span>
              <span className="text-[8px] text-slate-500 font-semibold block">bpm</span>
            </div>

            {/* BP block */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center relative overflow-hidden">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">BP</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              </div>
              <span className="text-xl font-extrabold font-mono text-cyan-400 block tracking-tight">
                {liveBp}
              </span>
              <span className="text-[8px] text-slate-500 font-semibold block">mmHg</span>
            </div>

            {/* SpO2 block */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center relative overflow-hidden">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">SpO2</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              </div>
              <span className="text-xl font-extrabold font-mono text-emerald-400 block">
                {liveSpo2}%
              </span>
              <span className="text-[8px] text-slate-500 font-semibold block">perfusion</span>
            </div>

            {/* Temp block */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center relative overflow-hidden">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TEMP</span>
                <span className="text-[10px] text-amber-400 shrink-0">°F</span>
              </div>
              <span className="text-xl font-extrabold font-mono text-amber-400 block">
                {liveTemp}
              </span>
              <span className="text-[8px] text-slate-500 font-semibold block">core therm</span>
            </div>
          </div>

          {/* Dynamic logs display */}
          <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-xl">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Live Clinical Monitor Events
            </span>
            <div className="h-[90px] overflow-y-auto font-mono text-[9px] leading-relaxed text-slate-300 space-y-1 scrollbar-thin">
              {liveLogs.length > 0 ? (
                liveLogs.map((log, index) => {
                  let alertStyle = 'text-slate-300';
                  if (log.includes('alert') || log.includes('warning') || log.includes('Tachycardia') || log.includes('Hypoxia')) {
                    alertStyle = 'text-rose-400 font-semibold';
                  } else if (log.includes('notice') || log.includes('Bradycardia')) {
                    alertStyle = 'text-amber-400';
                  }
                  return (
                    <div key={index} className={`truncate border-b border-slate-900/40 pb-0.5 last:border-0 ${alertStyle}`}>
                      {log}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 italic">Initiating continuous vital signals...</div>
              )}
            </div>
          </div>

          {/* Call-to-action Stream Report generator */}
          <button
            type="button"
            onClick={handleGenerateLiveAnalysis}
            disabled={analyzingLive}
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/20"
          >
            {analyzingLive ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Continuous Live Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Generate Live Telemetry Analysis Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Diagnosis Results Column (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[450px] flex flex-col">
        {/* Interactive Tab Switcher */}
        <div className="flex border-b border-slate-150 mb-5 pb-0.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRightTab('differential')}
            className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-[2px] flex items-center gap-1.5 ${
              rightTab === 'differential'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>AI Differential Suggestions</span>
            {diagnosisResult && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRightTab('telemetry')}
            className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-[2px] flex items-center gap-1.5 ${
              rightTab === 'telemetry'
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Telemetry Report</span>
            {liveAnalysisResult && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {rightTab === 'telemetry' ? (
          liveAnalysisResult ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-base">Real-Time Telemetry Analysis</h3>
                  <p className="text-xs text-slate-500 mt-0.5">High-frequency clinical report from the active patient stream.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleDownloadLivePDF}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    title="Export telemetry results to a clinical PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Report PDF</span>
                  </button>
                  <span className="text-[10px] bg-cyan-50 text-cyan-600 border border-cyan-100 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Live Analysis
                  </span>
                </div>
              </div>

              {/* Autonomic stability index and triage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gauge card */}
                <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl flex items-center gap-4">
                  {/* Neomorphic radial progress bar representation */}
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        className="stroke-slate-200"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        className="stroke-cyan-500 transition-all duration-1000"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={175}
                        strokeDashoffset={175 - (175 * liveAnalysisResult.autonomicStabilityScore) / 100}
                      />
                    </svg>
                    <span className="absolute text-sm font-black font-mono text-slate-800">
                      {liveAnalysisResult.autonomicStabilityScore}%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Autonomic Stability</h4>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {liveAnalysisResult.autonomicStabilityScore >= 80 ? 'Physiologically stable baseline.' : 
                       liveAnalysisResult.autonomicStabilityScore >= 50 ? 'Mild physiological distress.' : 
                       'Critical physiological instability.'}
                    </p>
                  </div>
                </div>

                {/* Triage card */}
                <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
                  liveAnalysisResult.clinicalTriageLevel === 'Immediate Intervention'
                    ? 'bg-rose-50 border-rose-200'
                    : liveAnalysisResult.clinicalTriageLevel === 'Close Observation'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className={`p-2 rounded-xl ${
                    liveAnalysisResult.clinicalTriageLevel === 'Immediate Intervention'
                      ? 'bg-rose-100 text-rose-600 animate-bounce'
                      : liveAnalysisResult.clinicalTriageLevel === 'Close Observation'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Clinical Triage Level</h4>
                    <span className={`text-xs font-black block uppercase tracking-wide mt-0.5 ${
                      liveAnalysisResult.clinicalTriageLevel === 'Immediate Intervention'
                        ? 'text-rose-700'
                        : liveAnalysisResult.clinicalTriageLevel === 'Close Observation'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}>
                      {liveAnalysisResult.clinicalTriageLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action recommendation */}
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                <span className="font-bold text-slate-800 uppercase text-[9px] bg-slate-200 px-1.5 py-0.5 rounded shrink-0">Priority Action</span>
                <span className="font-medium text-slate-700">{liveAnalysisResult.timeFrameAction}</span>
              </div>

              {/* Assessments */}
              <div className="space-y-4">
                {/* Cardiovascular assessment */}
                <div className="border border-slate-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <Heart className="w-4 h-4 animate-pulse" />
                    <span>Cardiovascular Evaluation</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {liveAnalysisResult.cardiovascularStatus}
                  </p>
                </div>

                {/* Respiratory assessment */}
                <div className="border border-slate-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 text-cyan-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <Activity className="w-4 h-4" />
                    <span>Respiratory Assessment</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {liveAnalysisResult.respiratoryStatus}
                  </p>
                </div>

                {/* Detected anomalies */}
                {liveAnalysisResult.detectedAnomalies && liveAnalysisResult.detectedAnomalies.length > 0 && (
                  <div className="border border-rose-100 bg-rose-50/20 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>Detected Anomalies & Warnings</span>
                    </div>
                    <ul className="space-y-1.5">
                      {liveAnalysisResult.detectedAnomalies.map((anom: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                          <span>{anom}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Synthesis Summary */}
                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-2 shadow-inner">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Holistic Physiologic Synthesis</h4>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {liveAnalysisResult.physiologicalSummary}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-24 text-slate-400">
              {analyzingLive ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-3" />
                  <p className="text-sm font-bold text-slate-700">Analyzing live high-frequency bedstream telemetry...</p>
                  <p className="text-xs mt-1 max-w-sm text-slate-500 leading-relaxed">Evaluating dynamic cardiovascular stability & respiratory indexes via Gemini 2.5.</p>
                </div>
              ) : (
                <>
                  <Activity className="w-12 h-12 text-slate-200 mb-3" />
                  <p className="text-sm">Continuous Bedstream Report Offline</p>
                  <p className="text-xs mt-1 max-w-sm leading-relaxed text-slate-500">
                    Click the <strong className="text-cyan-500">Generate Live Telemetry Analysis Report</strong> button under the EKG screen on the left to review instant clinical insights.
                  </p>
                </>
              )}
            </div>
          )
        ) : (
          /* DIFFERENTIAL DIAGNOSIS AI VIEW */
          diagnosisResult ? (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-base">Suggested Clinical Conditions</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Statistical predictions based on diagnostic symptoms & vitals.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    title="Export results to a professional clinical PDF report"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download PDF Report</span>
                  </button>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gemini Assessed
                  </span>
                </div>
              </div>

              {/* Differential suggestions */}
              <div className="space-y-4">
                {diagnosisResult.conditions.map((cond, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{cond.name}</h4>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{cond.explanation}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-extrabold block ${
                          cond.probability > 70 ? 'text-rose-600' :
                          cond.probability > 40 ? 'text-amber-600' :
                          'text-teal-600'
                        }`}>
                          {cond.probability}%
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">Confidence</span>
                      </div>
                    </div>

                    {/* Matching symptoms */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Matching Symptom Logs</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {cond.matchingSymptoms.map((sym, sIdx) => (
                          <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Labs and Referrals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                <div className="border border-slate-100 p-4 rounded-xl">
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2.5">Recommended Diagnostics</h5>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {diagnosisResult.recommendedLabs.map((lab, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                        <span>{lab}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-slate-100 p-4 rounded-xl">
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2.5">Suggested Referrals</h5>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {diagnosisResult.specialistReferrals.map((ref, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                        <span>{ref}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] leading-relaxed text-amber-800 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Support Disclaimer:</strong> {diagnosisResult.cautionDisclaimer || "This differential assistance report is designed for informational backup. It should only be evaluated by a licensed practitioner and is not a clinical replacement for laboratory assays and professional round checks."}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-24 text-slate-400">
              <HeartHandshake className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm">Differential Decision Engine Idle</p>
              <p className="text-xs mt-1 max-w-sm leading-relaxed">
                Fill in patient symptoms, active vital profiles, and lab findings in the form to generate suggestions.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
