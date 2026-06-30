import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "database.json");

// Helper to safely read database
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Error reading database:", error);
  }
  // Fallback default structure
  return { patients: [], doctors: [], appointments: [], billing: [], inventory: [] };
}

// Helper to safely write database
function writeDB(data: any) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}

// Initialize Gemini SDK with telemetry header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to retry Gemini operations with exponential backoff on transient errors
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message || "";
    const isTransient = 
      error.status === 503 || 
      error.status === 429 || 
      errorMsg.includes("503") || 
      errorMsg.includes("429") || 
      errorMsg.includes("UNAVAILABLE") ||
      errorMsg.includes("demand") ||
      errorMsg.includes("busy") ||
      errorMsg.includes("overloaded");

    if (retries > 0 && isTransient) {
      console.warn(`Gemini API transient error: ${errorMsg}. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // ------------------------------------------------------------------
  // HOSPITAL RECORDS CRUD ENDPOINTS
  // ------------------------------------------------------------------

  // Patients API
  app.get("/api/patients", (req, res) => {
    const db = readDB();
    res.json(db.patients || []);
  });

  app.post("/api/patients", (req, res) => {
    const db = readDB();
    const newPatient = {
      id: `pat-${Date.now()}`,
      vitals: { bp: "120/80", hr: 75, temp: 98.6, spo2: 98 },
      status: "Stable",
      admissionDate: new Date().toISOString().split("T")[0],
      symptoms: "",
      labResults: "",
      medicalHistory: "",
      ...req.body,
    };
    db.patients.push(newPatient);
    writeDB(db);
    res.status(201).json(newPatient);
  });

  app.put("/api/patients/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.patients.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Patient not found" });
    }
    db.patients[index] = { ...db.patients[index], ...req.body };
    writeDB(db);
    res.json(db.patients[index]);
  });

  app.delete("/api/patients/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.patients = db.patients.filter((p: any) => p.id !== id);
    // Also remove associated appointments and billing
    db.appointments = db.appointments.filter((a: any) => a.patientId !== id);
    writeDB(db);
    res.json({ message: "Patient deleted successfully" });
  });

  // Doctors API
  app.get("/api/doctors", (req, res) => {
    const db = readDB();
    // Ensure all doctors have default In/Out status if not present
    const updatedDocs = (db.doctors || []).map((d: any) => {
      if (!d.attendanceStatus) d.attendanceStatus = d.availability === 'Off Duty' ? 'Out' : 'In';
      if (!d.swipeHistory) d.swipeHistory = [];
      return d;
    });
    res.json(updatedDocs);
  });

  app.put("/api/doctors/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.doctors.findIndex((d: any) => d.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    db.doctors[index] = { ...db.doctors[index], ...req.body };
    writeDB(db);
    res.json(db.doctors[index]);
  });

  app.post("/api/doctors/:id/swipe", (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'IN' | 'OUT'
    if (action !== 'IN' && action !== 'OUT') {
      return res.status(400).json({ error: "Invalid action. Must be 'IN' or 'OUT'." });
    }
    const db = readDB();
    const index = db.doctors.findIndex((d: any) => d.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullDate = new Date().toISOString().split('T')[0];
    const timestamp = `${fullDate} ${now}`;
    
    const doc = db.doctors[index];
    doc.attendanceStatus = action === 'IN' ? 'In' : 'Out';
    doc.lastSwipeTime = timestamp;
    
    if (!doc.swipeHistory) {
      doc.swipeHistory = [];
    }
    doc.swipeHistory.unshift({ action, time: timestamp });
    if (doc.swipeHistory.length > 15) {
      doc.swipeHistory = doc.swipeHistory.slice(0, 15);
    }
    
    // Auto-update availability based on swipe
    if (action === 'OUT') {
      doc.availability = 'Off Duty';
    } else {
      doc.availability = 'Available';
    }
    
    db.doctors[index] = doc;
    writeDB(db);
    res.json(doc);
  });

  app.put("/api/patients/:id/vitals", (req, res) => {
    const { id } = req.params;
    const { bp, hr, temp, spo2 } = req.body;
    const db = readDB();
    const index = db.patients.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Patient not found" });
    }
    
    db.patients[index].vitals = {
      bp: bp || db.patients[index].vitals.bp,
      hr: hr !== undefined ? Number(hr) : db.patients[index].vitals.hr,
      temp: temp !== undefined ? Number(temp) : db.patients[index].vitals.temp,
      spo2: spo2 !== undefined ? Number(spo2) : db.patients[index].vitals.spo2,
    };
    
    writeDB(db);
    res.json(db.patients[index]);
  });

  // Appointments API
  app.get("/api/appointments", (req, res) => {
    const db = readDB();
    res.json(db.appointments || []);
  });

  app.post("/api/appointments", (req, res) => {
    const db = readDB();
    const newAppt = {
      id: `appt-${Date.now()}`,
      status: "Scheduled",
      ...req.body,
    };
    db.appointments.push(newAppt);
    writeDB(db);
    res.status(201).json(newAppt);
  });

  app.put("/api/appointments/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.appointments.findIndex((a: any) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    db.appointments[index] = { ...db.appointments[index], ...req.body };
    writeDB(db);
    res.json(db.appointments[index]);
  });

  app.delete("/api/appointments/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.appointments = db.appointments.filter((a: any) => a.id !== id);
    writeDB(db);
    res.json({ message: "Appointment deleted" });
  });

  // Billing API
  app.get("/api/billing", (req, res) => {
    const db = readDB();
    res.json(db.billing || []);
  });

  app.post("/api/billing", (req, res) => {
    const db = readDB();
    const subtotal = (req.body.items || []).reduce((acc: number, item: any) => acc + (Number(item.cost) || 0), 0);
    const insuranceCover = Number(req.body.insuranceCover) || 0;
    const amountDue = Math.max(0, subtotal - insuranceCover);

    const newBill = {
      id: `bill-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      items: req.body.items || [],
      subtotal,
      insuranceCover,
      amountDue,
      status: req.body.status || "Unpaid",
      patientId: req.body.patientId,
      patientName: req.body.patientName,
    };
    db.billing.push(newBill);
    writeDB(db);
    res.status(201).json(newBill);
  });

  app.put("/api/billing/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.billing.findIndex((b: any) => b.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Bill not found" });
    }
    db.billing[index] = { ...db.billing[index], ...req.body };
    writeDB(db);
    res.json(db.billing[index]);
  });

  // Inventory API
  app.get("/api/inventory", (req, res) => {
    const db = readDB();
    res.json(db.inventory || []);
  });

  app.post("/api/inventory", (req, res) => {
    const db = readDB();
    const newItem = {
      id: `inv-${Date.now()}`,
      status: req.body.quantity <= 0 ? "Out of Stock" : req.body.quantity <= req.body.minRequired ? "Low Stock" : "In Stock",
      ...req.body,
    };
    db.inventory.push(newItem);
    writeDB(db);
    res.status(201).json(newItem);
  });

  app.put("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const index = db.inventory.findIndex((item: any) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Item not found" });
    }

    const updated = { ...db.inventory[index], ...req.body };
    updated.status = updated.quantity <= 0 ? "Out of Stock" : updated.quantity <= updated.minRequired ? "Low Stock" : "In Stock";

    db.inventory[index] = updated;
    writeDB(db);
    res.json(updated);
  });

  app.delete("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.inventory = db.inventory.filter((item: any) => item.id !== id);
    writeDB(db);
    res.json({ message: "Inventory item deleted" });
  });

  // Stats Aggregator API
  app.get("/api/stats", (req, res) => {
    const db = readDB();
    const patientsCount = db.patients.filter((p: any) => p.status !== "Discharged").length;
    const occupancyRate = Math.min(100, Math.round((patientsCount / 10) * 100)); // Assume 10 total beds for this calculation
    const activeDoctors = db.doctors.filter((d: any) => d.availability === "Available" || d.availability === "On Call" || d.availability === "In Surgery").length;
    const lowStockItemsCount = db.inventory.filter((item: any) => item.status === "Low Stock" || item.status === "Out of Stock").length;
    const totalRevenue = db.billing.filter((b: any) => b.status === "Paid").reduce((acc: number, b: any) => acc + (b.subtotal || 0), 0);

    res.json({
      occupancyRate,
      activeDoctors,
      lowStockItemsCount,
      totalRevenue,
    });
  });

  // ------------------------------------------------------------------
  // SERVER-SIDE GEMINI AI PREDICTIVE & NLP ENDPOINTS
  // ------------------------------------------------------------------

  // 1. Patient Risk Prediction (Readmission or Complications likelihood)
  app.post("/api/ai/predict-risk", async (req, res) => {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const db = readDB();
    const patient = db.patients.find((p: any) => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    try {
      const prompt = `
        You are an advanced clinical analytics agent. Analyze this patient's records to estimate readmission risk and potential complications.
        
        Patient Name: ${patient.name}
        Age: ${patient.age}
        Gender: ${patient.gender}
        Admission Date: ${patient.admissionDate}
        Current Status: ${patient.status}
        Vitals: BP ${patient.vitals.bp}, HR ${patient.vitals.hr} bpm, Temp ${patient.vitals.temp} F, SpO2 ${patient.vitals.spo2}%
        Symptoms: ${patient.symptoms}
        Lab Results: ${patient.labResults}
        Medical History: ${patient.medicalHistory}

        You must predict:
        1. Readmission probability (0 to 100).
        2. General risk category ('Low', 'Medium', 'High').
        3. Potential complications.
        4. Specific preventive/follow-up measures.
        5. Clinical justification (justification).
      `;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: {
                type: Type.STRING,
                enum: ["Low", "Medium", "High"],
                description: "Predicted clinical risk level.",
              },
              readmissionProbability: {
                type: Type.INTEGER,
                description: "Percentage score (0 to 100) of readmission likelihood within 30 days.",
              },
              potentialComplications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of highly probable complications to watch for.",
              },
              preventiveMeasures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Actionable nurse/physician steps to prevent readmission.",
              },
              justification: {
                type: Type.STRING,
                description: "A professional 2-3 sentence clinical justification of this risk calculation.",
              },
            },
            required: ["riskLevel", "readmissionProbability", "potentialComplications", "preventiveMeasures", "justification"],
          },
        },
      }));

      const resultText = response.text || "{}";
      const resultObj = JSON.parse(resultText);

      // Save predictions in DB for persistence
      const index = db.patients.findIndex((p: any) => p.id === patientId);
      if (index !== -1) {
        db.patients[index].complicationRisk = resultObj.riskLevel;
        db.patients[index].readmissionProbability = resultObj.readmissionProbability;
        db.patients[index].aiRiskAnalysis = `${resultObj.justification}\n\nRecommended Steps:\n${resultObj.preventiveMeasures.map((m: string) => `- ${m}`).join("\n")}`;
        writeDB(db);
      }

      res.json(resultObj);
    } catch (error: any) {
      console.error("Gemini risk prediction error:", error);
      res.status(500).json({ error: "Failed to perform AI risk prediction", details: error.message });
    }
  });

  // 2. Medical Report Summarization (NLP summarization of patient clinical records)
  app.post("/api/ai/summarize-report", async (req, res) => {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    const db = readDB();
    const patient = db.patients.find((p: any) => p.id === patientId);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    try {
      const prompt = `
        You are a clinical NLP systems summarizer. Convert this detailed, unstructured patient record into a highly structured, concise diagnostic executive summary for active doctors on rounds.
        Keep it concise, accurate, and structured. Highlight critical symptoms or abnormal labs.

        Patient Name: ${patient.name} (${patient.age} y/o, ${patient.gender}, ${patient.bloodType})
        Current Vitals: BP ${patient.vitals.bp}, HR ${patient.vitals.hr}, Temp ${patient.vitals.temp}, SpO2 ${patient.vitals.spo2}%
        Admitted Status: ${patient.status}
        Symptoms reported: ${patient.symptoms}
        Lab / Imaging Results: ${patient.labResults}
        Medical History: ${patient.medicalHistory}
      `;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an elite clinical scribe. Summarize the patient medical record. Avoid fluff, use professional medical terms, organize with short markdown headers, and output clear bullet points. Add warning indicators if vitals or labs are highly abnormal (e.g., SpO2 < 93% or elevated Troponins/WBC).",
        },
      }));

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("Gemini summarizer error:", error);
      res.status(500).json({ error: "Failed to summarize clinical record", details: error.message });
    }
  });

  // 3. Appointment & Schedule Optimization (reduces wait times by predicting peak load and best doctors)
  app.post("/api/ai/optimize-schedule", async (req, res) => {
    const { symptoms, preferredSpecialty, preferredDay } = req.body;

    const db = readDB();
    const doctors = db.doctors || [];
    const appointments = db.appointments || [];

    try {
      const prompt = `
        You are a Hospital Scheduling Optimizer. Your objective is to reduce patient wait times and optimize doctor utilization.
        
        Symptom Description: ${symptoms || "General follow-up"}
        Specialty Requested: ${preferredSpecialty || "Internal Medicine"}
        Preferred Day: ${preferredDay || "Any day"}

        Current Active Doctor Staff list:
        ${JSON.stringify(doctors.map((d: any) => ({ id: d.id, name: d.name, specialty: d.specialty, schedule: d.schedule, availability: d.availability })))}

        Current Appointed slots count list:
        ${JSON.stringify(appointments.map((a: any) => ({ doctorId: a.doctorId, date: a.date, time: a.time, status: a.status })))}

        Predict peak clinic load, analyze doctor suitability based on symptoms, and output the top 3 optimized appointment recommendations in JSON format.
        Each recommendation must contain: doctorId, doctorName, day, timeSlot, waitScore (1 to 10, where 10 means highly optimized/very short wait time due to low peak/high doctor availability), and reasoning.
      `;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedSlots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    doctorId: { type: Type.STRING },
                    doctorName: { type: Type.STRING },
                    day: { type: Type.STRING },
                    timeSlot: { type: Type.STRING },
                    waitScore: { type: Type.INTEGER, description: "Wait score 1 to 10." },
                    reasoning: { type: Type.STRING, description: "Why this slot is optimized." },
                  },
                  required: ["doctorId", "doctorName", "day", "timeSlot", "waitScore", "reasoning"],
                },
              },
              peakHoursAnalysis: {
                type: Type.STRING,
                description: "Brief analysis of peak clinic load (e.g. mornings vs mid-day).",
              },
              utilizationInsight: {
                type: Type.STRING,
                description: "Insight on how to balance patient volumes among available specialties.",
              },
            },
            required: ["recommendedSlots", "peakHoursAnalysis", "utilizationInsight"],
          },
        },
      }));

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Gemini scheduling optimizer error:", error);
      res.status(500).json({ error: "Failed to optimize schedule", details: error.message });
    }
  });

  // 4. Disease Diagnosis Support (analyzes symptoms, vitals, labs and suggests possible conditions)
  app.post("/api/ai/diagnose-support", async (req, res) => {
    const { symptoms, vitals, labResults } = req.body;
    if (!symptoms) {
      return res.status(400).json({ error: "Symptoms are required" });
    }

    try {
      const prompt = `
        You are a clinical decision support system tool. Provide differential diagnosis suggestions for education and clinical consideration, based strictly on the provided symptoms, vitals, and lab results.
        
        Symptoms: ${symptoms}
        Vitals: ${JSON.stringify(vitals || {})}
        Lab Results: ${labResults || "None entered"}

        Return a JSON report listing up to 3 possible conditions with probability levels, matching symptoms, and explanations. 
        Also list recommended laboratory tests, specialist referrals, and a mandatory caution disclaimer.
      `;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conditions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of possible condition." },
                    probability: { type: Type.INTEGER, description: "Likelihood percentage (1 to 100)." },
                    matchingSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
                    explanation: { type: Type.STRING, description: "Brief explanation connecting symptoms/labs to condition." },
                  },
                  required: ["name", "probability", "matchingSymptoms", "explanation"],
                },
              },
              recommendedLabs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Additional laboratory tests, imaging, or checks needed.",
              },
              specialistReferrals: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Medical specialties patient should consult.",
              },
              cautionDisclaimer: {
                type: Type.STRING,
                description: "Standard clinical disclaimer stating this is AI-assisted support, not a definitive diagnosis.",
              },
            },
            required: ["conditions", "recommendedLabs", "specialistReferrals", "cautionDisclaimer"],
          },
        },
      }));

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Gemini diagnosis support error:", error);
      res.status(500).json({ error: "Failed to evaluate symptoms", details: error.message });
    }
  });

  // 4b. Live Telemetry Analysis (analyzes dynamic physiologic feed & provides quick report)
  app.post("/api/ai/live-time-analysis", async (req, res) => {
    const { vitals, symptoms, patientName } = req.body;
    try {
      const prompt = `
        You are an advanced clinical telemetry monitoring analyzer. Provide a professional live-time report on the patient's physiological state based on current vitals stream and reported symptoms.
        
        Patient Context: ${patientName || "Unknown/unspecified patient"}
        Current Vitals: ${JSON.stringify(vitals || {})}
        Reported Symptoms: ${symptoms || "None entered"}

        Analyze cardiovascular state (heart rate, blood pressure), respiratory efficiency (oxygen saturation), and autonomic/vital stability. Identify any clinically relevant anomalies, evaluate triage severity level ("Routine Monitoring", "Close Observation", "Immediate Intervention"), recommend timeframe action, and provide a holistic summary.
      `;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cardiovascularStatus: { type: Type.STRING, description: "Detailed summary of heart rate, rhythm hints, and blood pressure state." },
              respiratoryStatus: { type: Type.STRING, description: "Detailed summary of SpO2 and general respiratory condition." },
              autonomicStabilityScore: { type: Type.INTEGER, description: "An overall clinical stability score from 0 to 100." },
              detectedAnomalies: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of specific physiological deviations or warnings."
              },
              clinicalTriageLevel: { 
                type: Type.STRING, 
                enum: ["Routine Monitoring", "Close Observation", "Immediate Intervention"],
                description: "The triage urgency level."
              },
              timeFrameAction: { type: Type.STRING, description: "Recommended clinical response time or concrete next step." },
              physiologicalSummary: { type: Type.STRING, description: "Holistic, highly concise clinical synthesis of the live telemetry." }
            },
            required: [
              "cardiovascularStatus", 
              "respiratoryStatus", 
              "autonomicStabilityScore", 
              "detectedAnomalies", 
              "clinicalTriageLevel", 
              "timeFrameAction", 
              "physiologicalSummary"
            ]
          }
        }
      }));

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Gemini live telemetry analysis error:", error);
      res.status(500).json({ error: "Failed to perform live-time telemetry analysis", details: error.message });
    }
  });

  // 5. Clinical Advisor Assistant Chatbot
  app.post("/api/ai/chat", async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Message history is required" });
    }

    try {
      // Map frontend messages into the proper format for gemini chats
      // [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
      const chatHistory = messages.slice(0, -1).map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const latestMessage = messages[messages.length - 1]?.content || "";

      // Initialize a multi-turn chat using the official SDK
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        history: chatHistory,
        config: {
          systemInstruction: `
            You are a state-of-the-art Clinical Advisor Chatbot inside the St. Jude Hospital Management System.
            Your role is to assist healthcare professionals (Doctors, Nurses, Administrators) with:
            1. Answering clinical questions using established healthcare protocols.
            2. Recommending medical reference information for medications, lab results, and patient management.
            3. Helping with administrative hospital workflow tips (e.g. inventory alerts, billing audits, schedule optimization).
            
            Keep your tone highly professional, precise, helpful, and concise.
            Always remind users when necessary that clinical choices are ultimately the clinician's responsibility.
          `,
        },
      });

      const response = await withRetry(() => chat.sendMessage({ message: latestMessage }));
      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Gemini advisor chat error:", error);
      res.status(500).json({ error: "Failed to communicate with Clinical Assistant", details: error.message });
    }
  });

  // ------------------------------------------------------------------
  // VITE & STATIC FILES SERVING MIDDLEWARE
  // ------------------------------------------------------------------

  // Vite development setup vs production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hospital Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
