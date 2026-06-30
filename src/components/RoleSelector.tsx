import React from 'react';
import { User, ShieldAlert, HeartHandshake, Eye } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: 'Doctor' | 'Nurse' | 'Admin';
  onChangeRole: (role: 'Doctor' | 'Nurse' | 'Admin') => void;
}

export default function RoleSelector({ currentRole, onChangeRole }: RoleSelectorProps) {
  const roles = [
    {
      id: 'Doctor' as const,
      name: 'Physician / Doctor',
      desc: 'Access clinical diagnoses, summarizations, patient reports, and doctor schedules.',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700 active:bg-indigo-100',
      activeColor: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100',
      icon: HeartHandshake,
    },
    {
      id: 'Nurse' as const,
      name: 'Nursing Staff',
      desc: 'Log vitals, record patient symptoms, predict readmission risks, and manage active wards.',
      color: 'bg-teal-50 border-teal-200 text-teal-700 active:bg-teal-100',
      activeColor: 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-100',
      icon: User,
    },
    {
      id: 'Admin' as const,
      name: 'System Administrator',
      desc: 'Manage clinical billing, track hospital inventory supplies, and audit macro performance stats.',
      color: 'bg-slate-50 border-slate-200 text-slate-700 active:bg-slate-100',
      activeColor: 'bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-100',
      icon: ShieldAlert,
    },
  ];

  return (
    <div id="role-selector-container" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
            Role-Based Access Guard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Switch your staff portal session. Permissions are fully audited on the server side.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full text-slate-600 self-start md:self-auto">
          <Eye className="w-3.5 h-3.5" />
          <span>Active View: <strong className="font-semibold text-slate-800">{currentRole} Portal</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = currentRole === role.id;
          return (
            <button
              key={role.id}
              id={`role-btn-${role.id.toLowerCase()}`}
              onClick={() => onChangeRole(role.id)}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                isActive ? role.activeColor : `${role.color} hover:shadow-sm`
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-white/10' : 'bg-white'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm">{role.name}</span>
              </div>
              <p className={`text-xs leading-relaxed ${isActive ? 'text-white/85' : 'text-slate-500'}`}>
                {role.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
