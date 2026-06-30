import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, Clipboard, LayoutDashboard, HeartHandshake, 
  PackageCheck, Bot, User, Key, Bell, HelpCircle, ShieldAlert 
} from 'lucide-react';
import RoleSelector from './components/RoleSelector';
import DashboardStats from './components/DashboardStats';
import PatientsTab from './components/PatientsTab';
import SchedulerTab from './components/SchedulerTab';
import DiagnosisTab from './components/DiagnosisTab';
import InventoryBillingTab from './components/InventoryBillingTab';
import ChatbotPanel from './components/ChatbotPanel';
import BedsideMonitorPortal from './components/BedsideMonitorPortal';

type TabId = 'dashboard' | 'patients' | 'scheduler' | 'diagnosis' | 'supplies';
type StaffRole = 'Doctor' | 'Nurse' | 'Admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [currentRole, setCurrentRole] = useState<StaffRole>('Doctor');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeBedsidePatientId, setActiveBedsidePatientId] = useState<string | null>(null);

  // Monitor QR Code URLs with view=vitals-portal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pId = urlParams.get('patientId');
    const view = urlParams.get('view');
    if (view === 'vitals-portal' && pId) {
      setActiveBedsidePatientId(pId);
    }
  }, []);

  if (activeBedsidePatientId) {
    return (
      <BedsideMonitorPortal 
        patientId={activeBedsidePatientId} 
        onBack={() => {
          // Clean search params out of the URL without page reload
          const url = new URL(window.location.href);
          url.searchParams.delete('patientId');
          url.searchParams.delete('view');
          window.history.pushState({}, '', url.toString());
          setActiveBedsidePatientId(null);
        }} 
      />
    );
  }

  const tabs = [
    { id: 'dashboard' as const, label: 'Analytics Hub', icon: LayoutDashboard },
    { id: 'patients' as const, label: 'Patient Directory', icon: Users },
    { id: 'scheduler' as const, label: 'AI Scheduler & Staff Monitor', icon: Clipboard },
    { id: 'diagnosis' as const, label: 'Diagnosis Advisor', icon: HeartHandshake },
    { id: 'supplies' as const, label: 'Finances & Supplies', icon: PackageCheck },
  ];

  return (
    <div id="hospital-app" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Upper Navigation Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Hospital Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <Activity className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-teal-600 uppercase">St. Jude Medical Group</span>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none mt-0.5">Hospital Management System</h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-xl text-xs text-slate-600">
              <Key className="w-4 h-4 text-slate-400" />
              <span>Identity Profile: <strong className="font-semibold text-slate-800">{currentRole} Portal</strong></span>
            </div>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer relative"
              title="Toggle Clinical AI Chat"
            >
              <Bot className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        
        {/* Role Switcher Auditing Tool */}
        <RoleSelector currentRole={currentRole} onChangeRole={setCurrentRole} />

        {/* Tab Selection Row */}
        <div className="flex flex-wrap border-b border-slate-200 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 -mb-px transition-all cursor-pointer ${
                  isActive
                    ? 'border-teal-600 text-teal-700 font-bold bg-white rounded-t-xl border-t border-x border-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-xl'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div id="tab-content-box" className="flex-1 min-h-[400px]">
          {activeTab === 'dashboard' && <DashboardStats />}
          {activeTab === 'patients' && (
            <PatientsTab 
              currentRole={currentRole} 
              onOpenLiveMonitor={(id) => setActiveBedsidePatientId(id)} 
            />
          )}
          {activeTab === 'scheduler' && <SchedulerTab />}
          {activeTab === 'diagnosis' && <DiagnosisTab />}
          {activeTab === 'supplies' && <InventoryBillingTab currentRole={currentRole} />}
        </div>
      </main>

      {/* Floating Interactive Advisor Bot Panel (Bottom Right) */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-end gap-4 transition-all duration-300 ${
        isChatOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0 pointer-events-none'
      }`}>
        {isChatOpen && (
          <div className="w-[380px] h-[550px] shadow-2xl">
            <ChatbotPanel onClose={() => setIsChatOpen(false)} />
          </div>
        )}
      </div>

      {/* Toggle Button for chat panel */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-full shadow-lg shadow-indigo-900/20 hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center cursor-pointer"
          title="Consult AI Advisor"
        >
          <Bot className="w-5.5 h-5.5 animate-pulse" />
        </button>
      )}

      {/* Page Footer */}
      <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          <span>© 2026 St. Jude Healthcare Group System. All rights reserved.</span>
          <div className="flex items-center gap-2 justify-center">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted HIPAA Compliant Session Hub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
