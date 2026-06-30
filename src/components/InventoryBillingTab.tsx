import React, { useState, useEffect } from 'react';
import { Billing, InventoryItem, Patient } from '../types';
import { 
  DollarSign, Package, PlusCircle, RotateCw, CheckCircle2, 
  AlertTriangle, ArrowUpRight, Search, ShieldAlert, Loader2, Save 
} from 'lucide-react';

interface InventoryBillingTabProps {
  currentRole: 'Doctor' | 'Nurse' | 'Admin';
}

export default function InventoryBillingTab({ currentRole }: InventoryBillingTabProps) {
  const [billing, setBilling] = useState<Billing[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Toggle View
  const [subTab, setSubTab] = useState<'Billing' | 'Inventory'>('Billing');

  // New Invoice Form
  const [patientId, setPatientId] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCost, setItemCost] = useState<number>(0);
  const [invoiceItems, setInvoiceItems] = useState<Array<{ description: string; cost: number }>>([]);
  const [insuranceCover, setInsuranceCover] = useState<number>(0);
  const [isCreatingBill, setIsCreatingBill] = useState(false);

  // New Inventory Item Form
  const [invName, setInvName] = useState('');
  const [invCategory, setInvCategory] = useState<InventoryItem['category']>('Medication');
  const [invQty, setInvQty] = useState<number>(100);
  const [invMin, setInvMin] = useState<number>(20);
  const [invUnit, setInvUnit] = useState('Units');
  const [invLoc, setInvLoc] = useState('Pharmacy Floor 1');
  const [isAddingInv, setIsAddingInv] = useState(false);

  // Search
  const [invSearch, setInvSearch] = useState('');

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [billRes, invRes, patsRes] = await Promise.all([
        fetch('/api/billing'),
        fetch('/api/inventory'),
        fetch('/api/patients')
      ]);

      if (billRes.ok) setBilling(await billRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (patsRes.ok) setPatients(await patsRes.json());
    } catch (err) {
      console.error('Error fetching inventory and billing:', err);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Billing Handlers
  const addInvoiceItem = () => {
    if (!itemDesc.trim() || itemCost <= 0) return;
    setInvoiceItems((prev) => [...prev, { description: itemDesc, cost: Number(itemCost) }]);
    setItemDesc('');
    setItemCost(0);
  };

  const removeInvoiceItem = (idx: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || invoiceItems.length === 0) {
      showToast('error', 'Please choose a patient and add at least one line item.');
      return;
    }

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const payload = {
      patientId,
      patientName: patient.name,
      items: invoiceItems,
      insuranceCover: Number(insuranceCover),
      status: 'Unpaid'
    };

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('success', 'Invoice generated successfully.');
        setIsCreatingBill(false);
        setInvoiceItems([]);
        setPatientId('');
        setInsuranceCover(0);
        await fetchData();
      } else {
        showToast('error', 'Could not save invoice.');
      }
    } catch (err) {
      showToast('error', 'Billing service connection error.');
    }
  };

  const handlePayBill = async (billId: string) => {
    try {
      const res = await fetch(`/api/billing/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' }),
      });

      if (res.ok) {
        showToast('success', 'Invoice payment audited and verified.');
        await fetchData();
      }
    } catch (err) {
      showToast('error', 'Failed to update bill payment.');
    }
  };

  // Inventory Handlers
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim() || invQty < 0) {
      showToast('error', 'Complete all inventory descriptions.');
      return;
    }

    const payload = {
      name: invName,
      category: invCategory,
      quantity: Number(invQty),
      minRequired: Number(invMin),
      unit: invUnit,
      location: invLoc
    };

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('success', `${invName} registered in stock.`);
        setIsAddingInv(false);
        setInvName('');
        setInvQty(100);
        setInvMin(20);
        setInvUnit('Units');
        setInvLoc('Pharmacy Floor 1');
        await fetchData();
      }
    } catch (err) {
      showToast('error', 'Inventory registration error.');
    }
  };

  const handleRestock = async (item: InventoryItem, count: number) => {
    const updatedQty = item.quantity + count;
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: updatedQty }),
      });

      if (res.ok) {
        showToast('success', `Restocked ${count} ${item.unit} to ${item.name}.`);
        await fetchData();
      }
    } catch (err) {
      showToast('error', 'Failed to update stock quantity.');
    }
  };

  const filteredInventory = inventory.filter((item) => 
    item.name.toLowerCase().includes(invSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(invSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(invSearch.toLowerCase())
  );

  return (
    <div id="inventory-billing-tab" className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm max-w-md animate-fade-in ${
          toast.type === 'success' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-teal-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Subtab Toggle */}
      <div className="flex border-b border-slate-100 pb-px">
        <button
          onClick={() => setSubTab('Billing')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            subTab === 'Billing'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Billing & Financial Audit</span>
        </button>
        <button
          onClick={() => setSubTab('Inventory')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            subTab === 'Inventory'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Hospital Supplies & Inventory</span>
        </button>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* BILLING SUB-TAB SCREEN */}
      {/* ----------------------------------------------------------- */}
      {subTab === 'Billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Billing Form / Left Column (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Generate Financial Invoice</h3>
              {currentRole !== 'Admin' && (
                <span className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 font-mono font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Read-Only Role
                </span>
              )}
            </div>

            {currentRole === 'Admin' ? (
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Discharging Patient *</label>
                  <select
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Patient Record --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                </div>

                {/* Line item builder */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-3">Add Billable Services / Items</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-3">
                    <div className="md:col-span-8">
                      <input
                        type="text"
                        placeholder="Service description (e.g. Bed Charge, Lab panel)"
                        value={itemDesc}
                        onChange={(e) => setItemDesc(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <input
                        type="number"
                        placeholder="Cost ($)"
                        value={itemCost || ''}
                        onChange={(e) => setItemCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addInvoiceItem}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[11px] py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    + Add to Line Items
                  </button>
                </div>

                {/* Items preview list */}
                {invoiceItems.length > 0 && (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Invoice Preview</span>
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-700 py-1 border-b border-slate-200/50 last:border-0">
                        <span className="truncate max-w-[200px]">{item.description}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold font-mono">${item.cost}</span>
                          <button
                            type="button"
                            onClick={() => removeInvoiceItem(idx)}
                            className="text-[9px] text-red-500 hover:text-red-700 font-bold px-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Insurance Contribution ($)</label>
                  <input
                    type="number"
                    value={insuranceCover || ''}
                    onChange={(e) => setInsuranceCover(Number(e.target.value))}
                    placeholder="Coverage coverage, if any"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-900/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Generate Final Invoice</span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400">
                <ShieldAlert className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Access Restricted</p>
                <p className="text-[10px] max-w-xs mt-1 text-slate-400 leading-relaxed">
                  Only System Administrator credentials possess permission to formulate billings, post financial transactions, and verify insurance claims.
                </p>
              </div>
            )}
          </div>

          {/* Billing Audit Directory / Right Column (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col h-[500px]">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Financial Ledger & Invoices</h3>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {billing.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-20">No billing ledger records exists.</p>
              ) : (
                billing.map((bill) => (
                  <div key={bill.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-start gap-4 hover:border-slate-200 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800">{bill.patientName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({bill.patientId})</span>
                      </div>
                      
                      <p className="text-[9px] font-mono text-slate-400 mt-1 uppercase">Bill ID: {bill.id} • {bill.date}</p>
                      
                      {/* Sub-items description */}
                      <p className="text-[11px] text-slate-500 mt-1.5 truncate max-w-sm">
                        Items: {bill.items.map(i => `${i.description} ($${i.cost})`).join(', ')}
                      </p>

                      {/* Pricing grid */}
                      <div className="flex gap-4 mt-2.5 pt-2 border-t border-slate-200/50 text-[10px] text-slate-500">
                        <span>Subtotal: <strong className="text-slate-700 font-mono">${bill.subtotal}</strong></span>
                        <span>Insurance Cover: <strong className="text-emerald-600 font-mono">-${bill.insuranceCover}</strong></span>
                        <span>Due: <strong className="text-indigo-700 font-mono font-bold">${bill.amountDue}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                        bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        bill.status === 'Unpaid' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {bill.status}
                      </span>

                      {(bill.status !== 'Paid' && currentRole === 'Admin') && (
                        <button
                          onClick={() => handlePayBill(bill.id)}
                          className="text-[9px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* INVENTORY SUB-TAB SCREEN */}
      {/* ----------------------------------------------------------- */}
      {subTab === 'Inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inventory Register / Left Column (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 text-sm mb-4 pb-2 border-b border-slate-100">Register Supply Stock</h3>
            
            {currentRole !== 'Doctor' ? (
              <form onSubmit={handleAddInventory} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="e.g. Propofol Emulsion, N95 Masks"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Category</label>
                    <select
                      value={invCategory}
                      onChange={(e) => setInvCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-700 focus:outline-none"
                    >
                      <option value="Medication">Medication</option>
                      <option value="PPE">PPE</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Surgical Supplies">Surgical Supplies</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Unit Type</label>
                    <input
                      type="text"
                      value={invUnit}
                      onChange={(e) => setInvUnit(e.target.value)}
                      placeholder="e.g. Vials, Boxes"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Initial Qty</label>
                    <input
                      type="number"
                      value={invQty}
                      onChange={(e) => setInvQty(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Min Required Qty</label>
                    <input
                      type="number"
                      value={invMin}
                      onChange={(e) => setInvMin(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Supply Location</label>
                  <input
                    type="text"
                    value={invLoc}
                    onChange={(e) => setInvLoc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-teal-900/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Register Supply Item</span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400">
                <ShieldAlert className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Access Restricted</p>
                <p className="text-[10px] max-w-xs mt-1 text-slate-400 leading-relaxed">
                  Physicians lack write-permissions for supply registry management. Switch role to Nurse or Admin to add new stock items.
                </p>
              </div>
            )}
          </div>

          {/* Inventory Register Directory / Right Column (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h3 className="font-semibold text-slate-800 text-sm">Supply Directory</h3>
              <div className="relative w-full md:w-48 shrink-0">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter supplies..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1 text-[11px] focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredInventory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-20">No supply items found.</p>
              ) : (
                filteredInventory.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center gap-4 hover:border-slate-200 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{item.name}</span>
                        <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-medium px-2 py-0.5 rounded-full uppercase">
                          {item.category}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        <span>Loc: <strong className="text-slate-600 font-normal">{item.location}</strong></span>
                        <span>•</span>
                        <span>Stock ID: <strong className="text-slate-600 font-mono font-normal">{item.id}</strong></span>
                      </div>

                      <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-slate-200/50 text-[10.5px]">
                        <span className="text-slate-600">
                          Active Qty: <strong className="text-slate-800 font-bold">{item.quantity}</strong> {item.unit}
                        </span>
                        <span className="text-slate-500 font-normal">
                          Min Req: {item.minRequired}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2.5 shrink-0">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'Low Stock' ? 'bg-amber-100 text-amber-700 font-semibold animate-pulse' :
                        'bg-red-100 text-red-700 font-bold'
                      }`}>
                        {item.status}
                      </span>

                      {currentRole !== 'Doctor' && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => handleRestock(item, 50)}
                            className="text-[9.5px] font-bold text-teal-600 hover:text-white hover:bg-teal-600 px-2 py-1 rounded-lg transition-all cursor-pointer"
                            title="Restock 50 units"
                          >
                            +50
                          </button>
                          <button
                            onClick={() => handleRestock(item, 100)}
                            className="text-[9.5px] font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 px-2 py-1 rounded-lg transition-all cursor-pointer"
                            title="Restock 100 units"
                          >
                            +100
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
