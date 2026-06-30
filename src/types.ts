export interface Vitals {
  bp: string;       // e.g., "120/80"
  hr: number;       // e.g., 75
  temp: number;     // e.g., 98.6
  spo2: number;     // e.g., 98
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodType: string;
  phone: string;
  email: string;
  admissionDate: string;
  status: 'Stable' | 'Critical' | 'Observation' | 'Discharged';
  roomNumber: string;
  vitals: Vitals;
  symptoms: string;
  labResults: string;
  medicalHistory: string;
  complicationRisk?: 'Low' | 'Medium' | 'High' | null;
  readmissionProbability?: number | null; // as a percentage, e.g. 15
  aiRiskAnalysis?: string | null;
}

export interface DoctorSchedule {
  day: string; // e.g., "Monday"
  hours: string; // e.g., "09:00 - 17:00"
  maxAppointments: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  avatar: string;
  schedule: DoctorSchedule[];
  availability: 'Available' | 'On Call' | 'In Surgery' | 'Off Duty';
  attendanceStatus?: 'In' | 'Out';
  lastSwipeTime?: string;
  swipeHistory?: { action: 'IN' | 'OUT'; time: string }[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  symptoms: string;
  notes: string;
  waitMetricScore?: number | null; // e.g. 1 to 10 (10 being highly optimized/low wait)
}

export interface BillingItem {
  description: string;
  cost: number;
}

export interface Billing {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  items: BillingItem[];
  subtotal: number;
  insuranceCover: number;
  amountDue: number;
  status: 'Paid' | 'Unpaid' | 'Pending Insurance';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Medication' | 'PPE' | 'Equipment' | 'Surgical Supplies';
  quantity: number;
  minRequired: number;
  unit: string;
  location: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface HospitalStats {
  occupancyRate: number; // e.g. 78 (%)
  activeDoctors: number;
  lowStockItemsCount: number;
  totalRevenue: number;
}

export interface AIChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface AIRiskAnalysisResult {
  riskLevel: 'Low' | 'Medium' | 'High';
  readmissionProbability: number;
  potentialComplications: string[];
  preventiveMeasures: string[];
  justification: string;
}

export interface AIDiagnosisResult {
  conditions: {
    name: string;
    probability: number; // e.g. 75
    matchingSymptoms: string[];
    explanation: string;
  }[];
  recommendedLabs: string[];
  specialistReferrals: string[];
  cautionDisclaimer: string;
}

export interface AIOptimizedScheduleResult {
  recommendedSlots: {
    doctorId: string;
    doctorName: string;
    day: string;
    timeSlot: string;
    waitScore: number; // 1-10 scale
    reasoning: string;
  }[];
  peakHoursAnalysis: string;
  utilizationInsight: string;
}

export interface LiveTimeAnalysisResult {
  cardiovascularStatus: string;
  respiratoryStatus: string;
  autonomicStabilityScore: number;
  detectedAnomalies: string[];
  clinicalTriageLevel: 'Routine Monitoring' | 'Close Observation' | 'Immediate Intervention';
  timeFrameAction: string;
  physiologicalSummary: string;
}
