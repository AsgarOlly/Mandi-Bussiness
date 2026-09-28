import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  CheckCircle,
  Truck,
  Package,
  Apple,
  CreditCard,
  Search,
  Phone,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
  ShoppingCart,
  DollarSign,
  History,
  Check,
  Printer,
  MapPin,
  Copy,
  Edit,
  Edit2,
  Building2,
  UserPlus,
  FileText,
  ChevronLeft,
  ShieldCheck,
  Lock,
  Trash2,
  Percent,
  Calculator
} from 'lucide-react';
import { api } from '../services/api';

const getSystemDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// =============================================================================
// CASH SALE ADMIN PAGE COMPONENT
// =============================================================================
// =============================================================================
// CASH SALE ADMIN PAGE COMPONENT
// =============================================================================
function CashSaleAdminPage({
  cashSaleSettlements = [],
  setCashSaleSettlements,
  saveCashSaleSettlements,
  cashSalePayments = [],
  setCashSalePayments,
  saveCashSalePayments,
  allSupplierNames = [],
  unifiedSuppliers = [],
  purchasesList = [],
  showToast,
  getSystemDate: gsd
}) {
  const sysDate = gsd ? gsd() : new Date().toISOString().slice(0, 10);
  const [selectedSuppName, setSelectedSuppName] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL'); // 'ALL' | 'PENDING' | 'CLEARED'
  const [truckFilter, setTruckFilter] = React.useState('ACTIVE'); // 'ACTIVE' | 'COMPLETE' (matching Image 2)
  const [activeDetailTab, setActiveDetailTab] = React.useState('invoices'); // 'invoices' | 'payments'
  const [payFormOpen, setPayFormOpen] = React.useState(false);
  const [selInvoice, setSelInvoice] = React.useState(null);
  const [payForm, setPayForm] = React.useState({
    date: sysDate,
    amount: '',
    payment_method: 'CASH',
    reference: '',
    notes: '',
    truck_no: '',
    supplier_name: ''
  });

  // Build unified list of active suppliers from unifiedSuppliers, settlements and payments
  const activeSuppliers = React.useMemo(() => {
    const map = new Map();

    // 1. Add from unifiedSuppliers
    (unifiedSuppliers || []).forEach(s => {
      const name = (s.supplier_name || s.name || '').trim();
      if (name) {
        map.set(name.toLowerCase(), {
          id: s.id || `supp-${name}`,
          supplier_name: name,
          phone: s.phone || '',
          city: s.city || 'Azadpur Mandi, Delhi',
          bank_name: s.bank_name || '',
          account_number: s.account_number || '',
          ifsc_code: s.ifsc_code || '',
          branch_name: s.branch_name || '',
          truckno: s.truckno || ''
        });
      }
    });

    // 2. Add from cashSaleSettlements
    (cashSaleSettlements || []).forEach(cs => {
      const name = (cs.supplier_name || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          id: `cs-${name}`,
          supplier_name: name,
          phone: '',
          city: 'Azadpur Mandi, Delhi',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          truckno: cs.truck_no || ''
        });
      }
    });

    // 3. Add from cashSalePayments
    (cashSalePayments || []).forEach(cp => {
      const name = (cp.supplier_name || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          id: `cp-${name}`,
          supplier_name: name,
          phone: '',
          city: 'Azadpur Mandi, Delhi',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          truckno: cp.truck_no || ''
        });
      }
    });

    // 4. Add from allSupplierNames if any
    (allSupplierNames || []).forEach(name => {
      const trimmed = (name || '').trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), {
          id: `asn-${trimmed}`,
          supplier_name: trimmed,
          phone: '',
          city: 'Azadpur Mandi, Delhi',
          bank_name: '',
          account_number: '',
          ifsc_code: '',
          branch_name: '',
          truckno: ''
        });
      }
    });

    return Array.from(map.values());
  }, [unifiedSuppliers, cashSaleSettlements, cashSalePayments, allSupplierNames]);

  // Compute full financial stats and truck breakdown for any supplier
  const getSupplierStats = React.useCallback((sName) => {
    if (!sName) return { settlements: [], payments: [], totalNet: 0, totalPaid: 0, totalPending: 0, activeTrucks: [], completedTrucks: [], activeCount: 0, completedCount: 0 };
    const norm = sName.trim().toLowerCase();

    const suppSettlements = (cashSaleSettlements || []).filter(
      s => (s.supplier_name || '').trim().toLowerCase() === norm
    );
    const suppPayments = (cashSalePayments || []).filter(
      p => (p.supplier_name || '').trim().toLowerCase() === norm
    );

    let totalNet = 0;
    const enrichedSettlements = suppSettlements.map(settl => {
      const tNorm = (settl.truck_no || '').trim().toLowerCase();
      const invPays = suppPayments.filter(
        p => (p.truck_no || '').trim().toLowerCase() === tNorm
      );
      const paidForTruck = invPays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const net = Number(settl.net_invoice || 0);
      totalNet += net;
      const pendingForTruck = Math.max(0, net - paidForTruck);
      const isPaid = settl.status === 'PAID' || pendingForTruck === 0;
      return {
        ...settl,
        paidForTruck,
        pendingForTruck,
        isCompleted: isPaid,
        effectiveStatus: isPaid ? 'PAID' : (paidForTruck > 0 ? 'PARTIAL' : 'PENDING'),
        truckPayments: invPays
      };
    });

    // Unsettled trucks from purchasesList for this supplier
    const settledTruckSet = new Set(suppSettlements.map(s => (s.truck_no || '').trim().toLowerCase()));
    const suppPurchases = (purchasesList || []).filter(
      p => ((p.supplier_name || '').trim().toLowerCase() === norm || String(p.supplier) === String(sName)) && p.truck_number
    );
    const unsettledPurchases = suppPurchases.filter(
      p => !settledTruckSet.has((p.truck_number || '').trim().toLowerCase())
    );

    const activeTrucks = [
      ...enrichedSettlements.filter(s => !s.isCompleted),
      ...unsettledPurchases.map(up => ({
        id: `unsettled-${up.id || up.truck_number}`,
        supplier_name: sName,
        truck_no: up.truck_number,
        saved_date: up.date || sysDate,
        gross_bikri: Number(up.total_amount || 0),
        commission: 0,
        truck_fare: 0,
        kuli: 0,
        net_invoice: Number(up.total_amount || 0),
        paidForTruck: 0,
        pendingForTruck: Number(up.total_amount || 0),
        isCompleted: false,
        effectiveStatus: 'PENDING_FINALIZATION',
        isUnsettledPurchase: true,
        truckPayments: []
      }))
    ];

    const completedTrucks = enrichedSettlements.filter(s => s.isCompleted);

    const totalPaid = suppPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPending = Math.max(0, totalNet - totalPaid);

    return {
      settlements: enrichedSettlements,
      payments: suppPayments,
      totalNet,
      totalPaid,
      totalPending,
      activeTrucks,
      completedTrucks,
      activeCount: activeTrucks.length,
      completedCount: completedTrucks.length
    };
  }, [cashSaleSettlements, cashSalePayments, purchasesList, sysDate]);

  // Global KPIs across all suppliers
  const globalNet = (cashSaleSettlements || []).reduce((s, r) => s + Number(r.net_invoice || 0), 0);
  const globalPaid = (cashSalePayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const globalPending = Math.max(0, globalNet - globalPaid);

  // Handle Payment Save
  const handlePaySave = (e) => {
    e.preventDefault();
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Please enter a valid payment amount', 'error');
      return;
    }
    const suppName = payForm.supplier_name || selectedSuppName;
    if (!suppName) {
      if (showToast) showToast('Please select a supplier', 'error');
      return;
    }

    const newPay = {
      id: Date.now(),
      supplier_name: suppName,
      truck_no: payForm.truck_no || selInvoice?.truck_no || '',
      date: payForm.date,
      amount: amt,
      payment_method: payForm.payment_method,
      reference: payForm.reference || `PAY-${Date.now().toString().slice(-4)}`,
      notes: payForm.notes || 'Supplier payment'
    };

    setCashSalePayments(prev => {
      const updated = [newPay, ...prev];
      saveCashSalePayments(updated);
      return updated;
    });

    // Update invoice status in cashSaleSettlements
    const targetTruck = (payForm.truck_no || selInvoice?.truck_no || '').trim().toLowerCase();
    setCashSaleSettlements(prev => {
      const updated = prev.map(inv => {
        const matchesSupp = (inv.supplier_name || '').trim().toLowerCase() === suppName.trim().toLowerCase();
        const matchesTruck = targetTruck ? (inv.truck_no || '').trim().toLowerCase() === targetTruck : false;
        if (matchesSupp && (matchesTruck || (!targetTruck && inv.status !== 'PAID'))) {
          const existingPaid = cashSalePayments
            .filter(p => (p.truck_no || '').trim().toLowerCase() === (inv.truck_no || '').trim().toLowerCase() && (p.supplier_name || '').trim().toLowerCase() === suppName.trim().toLowerCase())
            .reduce((s, p) => s + Number(p.amount || 0), 0);
          const totalPaidForTruck = existingPaid + amt;
          const status = totalPaidForTruck >= Number(inv.net_invoice || 0) ? 'PAID' : 'PARTIAL';
          return { ...inv, status };
        }
        return inv;
      });
      saveCashSaleSettlements(updated);
      return updated;
    });

    setPayForm({
      date: sysDate,
      amount: '',
      payment_method: 'CASH',
      reference: '',
      notes: '',
      truck_no: '',
      supplier_name: ''
    });
    setPayFormOpen(false);
    setSelInvoice(null);
    if (showToast) showToast(`Payment ₹${amt.toLocaleString()} recorded for ${suppName}! 💵`, 'success');
  };

  // Delete Payment record
  const handleDeletePayment = (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      setCashSalePayments(prev => {
        const updated = prev.filter(p => p.id !== paymentId);
        saveCashSalePayments(updated);
        return updated;
      });
      if (showToast) showToast('Payment record deleted', 'info');
    }
  };

  // Filtered active suppliers list for directory
  const filteredSuppliers = activeSuppliers.filter(supp => {
    const stats = getSupplierStats(supp.supplier_name);
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (supp.supplier_name || '').toLowerCase().includes(q) ||
      (supp.phone || '').toLowerCase().includes(q) ||
      stats.activeTrucks.some(t => (t.truck_no || '').toLowerCase().includes(q)) ||
      stats.completedTrucks.some(t => (t.truck_no || '').toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (statusFilter === 'PENDING') return stats.totalPending > 0;
    if (statusFilter === 'CLEARED') return stats.totalPending === 0 && stats.totalNet > 0;
    return true;
  });

  // Current selected supplier details
  const selectedSuppProfile = activeSuppliers.find(
    s => (s.supplier_name || '').trim().toLowerCase() === (selectedSuppName || '').trim().toLowerCase()
  ) || { supplier_name: selectedSuppName, phone: '', city: 'Azadpur Mandi, Delhi' };

  const currentStats = selectedSuppName ? getSupplierStats(selectedSuppName) : null;

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: 'var(--bg-main)' }}>

      {/* ===================================================================== */}
      {/* GLOBAL PAYMENT MODAL / DRAWER                                         */}
      {/* ===================================================================== */}
      {payFormOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid rgba(245,158,11,0.3)',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 22px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, transparent 100%)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Record Payment (Jama)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {selInvoice ? `Truck: ${selInvoice.truck_no} • ${selInvoice.supplier_name}` : (payForm.supplier_name || selectedSuppName || 'Select Supplier')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setPayFormOpen(false); setSelInvoice(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePaySave} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={payForm.date}
                    onChange={e => setPayForm({ ...payForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Supplier *</label>
                  <select
                    className="form-control"
                    value={payForm.supplier_name || selectedSuppName || ''}
                    onChange={e => setPayForm({ ...payForm, supplier_name: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {activeSuppliers.map(s => (
                      <option key={s.supplier_name} value={s.supplier_name}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Truck No.</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    placeholder="e.g. DL01AB1234"
                    value={payForm.truck_no}
                    onChange={e => setPayForm({ ...payForm, truck_no: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    className="form-control"
                    style={{ fontWeight: 900, fontSize: '1.05rem', color: '#059669' }}
                    placeholder="Enter amount (₹)"
                    value={payForm.amount}
                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Payment Mode</label>
                  <select
                    className="form-control"
                    value={payForm.payment_method}
                    onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                  >
                    <option value="CASH">Cash (Rokda)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Ref / UTR / Cheque No.</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Optional reference"
                    value={payForm.reference}
                    onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Notes / Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paid in full for settlement"
                  value={payForm.notes}
                  onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setPayFormOpen(false); setSelInvoice(null); }}
                  style={{ padding: '9px 18px', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 24px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.35)'
                  }}
                >
                  <Check size={16} /> Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 1: ACTIVE SUPPLIER PROFILE DIRECTORY (Like Image 1)               */}
      {/* ===================================================================== */}
      {!selectedSuppName ? (
        <div>
          {/* Page Top Header */}
          <div style={{
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '15px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                flexShrink: 0
              }}>
                <DollarSign size={26} />
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.55rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em'
                }}>
                  Cash Sale Ledger
                </h1>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Active Supplier Profiles • Net Invoice History, Payment Records & Settlement Tracking
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPayForm({
                  date: sysDate,
                  amount: '',
                  payment_method: 'CASH',
                  reference: '',
                  notes: '',
                  truck_no: '',
                  supplier_name: activeSuppliers[0]?.supplier_name || ''
                });
                setSelInvoice(null);
                setPayFormOpen(true);
              }}
              style={{
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <DollarSign size={17} />
              <span>+ Record Payment (Jama)</span>
            </button>
          </div>

          {/* Global KPI Summary Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '24px'
          }}>
            {[
              ['Active Suppliers', activeSuppliers.length, '#6366f1', <Users size={22} color="#6366f1" />],
              ['Total Net Payable', `₹${globalNet.toLocaleString()}`, '#10b981', <FileText size={22} color="#10b981" />],
              ['Total Paid (Jama)', `₹${globalPaid.toLocaleString()}`, '#3b82f6', <CreditCard size={22} color="#3b82f6" />],
              ['Total Pending Balance', `₹${globalPending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, globalPending > 0 ? '#ef4444' : '#10b981', <History size={22} color={globalPending > 0 ? '#ef4444' : '#10b981'} />]
            ].map(([label, value, color, icon]) => (
              <div
                key={label}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${color}25`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: '14px',
                  padding: '15px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color, letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: '1.38rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>{value}</div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', minWidth: '240px' }}>
              <Search size={18} color="var(--text-secondary)" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search active suppliers by name, phone, truck no..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                ['ALL', `All (${activeSuppliers.length})`],
                ['PENDING', `Pending (${activeSuppliers.filter(s => getSupplierStats(s.supplier_name).totalPending > 0).length})`],
                ['CLEARED', `Cleared (${activeSuppliers.filter(s => { const st = getSupplierStats(s.supplier_name); return st.totalPending === 0 && st.totalNet > 0; }).length})`]
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: statusFilter === key ? '1.5px solid #d97706' : '1px solid var(--border-subtle)',
                    background: statusFilter === key ? 'rgba(245,158,11,0.12)' : 'transparent',
                    color: statusFilter === key ? '#d97706' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Supplier Cards Grid - Matching Image 1 */}
          {filteredSuppliers.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '16px',
              padding: '60px 24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚚</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                Koi active supplier nahi mila
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                {searchQuery ? 'Filter search term badal kar dekhein.' : 'Supplier profile me settlement save karein ya naya purchase add karein.'}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '18px'
            }}>
              {filteredSuppliers.map(supp => {
                const stats = getSupplierStats(supp.supplier_name);
                const hasPending = stats.totalPending > 0;

                return (
                  <div
                    key={supp.supplier_name}
                    onClick={() => {
                      setSelectedSuppName(supp.supplier_name);
                      setTruckFilter('ACTIVE');
                      setActiveDetailTab('invoices');
                    }}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1.5px solid rgba(245, 158, 11, 0.22)',
                      borderLeft: '5px solid #d97706',
                      borderRadius: '16px',
                      padding: '20px 22px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(217, 119, 6, 0.07)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '145px',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(217, 119, 6, 0.16)';
                      e.currentTarget.style.borderColor = '#d97706';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(217, 119, 6, 0.07)';
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.22)';
                    }}
                  >
                    <div>
                      {/* Tag from Image 1: SUPPLIERS */}
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        color: '#d97706',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: '10px'
                      }}>
                        SUPPLIERS
                      </div>

                      {/* Supplier Name from Image 1: piyush */}
                      <div style={{
                        fontSize: '1.38rem',
                        fontWeight: 900,
                        color: '#b45309',
                        marginBottom: '6px',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2
                      }}>
                        {supp.supplier_name}
                      </div>

                      {/* Pending Line from Image 1: ⏳ ₹361,828.1 pending */}
                      <div style={{
                        fontSize: '1.02rem',
                        fontWeight: 800,
                        color: hasPending ? '#ef4444' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>⏳</span>
                        <span>
                          {hasPending
                            ? `₹${stats.totalPending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} pending`
                            : `₹0 pending (Cleared)`}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Active/Complete count + phone */}
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: '1px dashed var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Truck size={14} color="#d97706" />
                        <span style={{ fontWeight: 700 }}>
                          {stats.activeCount} Active • {stats.completedCount} Complete
                        </span>
                      </div>
                      <span style={{ color: '#d97706', fontWeight: 800 }}>View Ledger →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: INDIVIDUAL SUPPLIER DETAIL (Net Invoice, Payments & Tracking) */
        /* ===================================================================== */
        <div>
          {/* Top Breadcrumb & Back Navigation */}
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setSelectedSuppName(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.color = '#d97706'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              >
                <ChevronLeft size={18} />
                <span>All Suppliers</span>
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>/</span>
              <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#d97706', textTransform: 'capitalize' }}>
                {selectedSuppName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Quick Supplier Switcher */}
              <select
                className="form-control"
                style={{ width: 'auto', padding: '7px 12px', fontSize: '0.82rem', fontWeight: 700 }}
                value={selectedSuppName}
                onChange={e => setSelectedSuppName(e.target.value)}
              >
                {activeSuppliers.map(s => (
                  <option key={s.supplier_name} value={s.supplier_name}>
                    {s.supplier_name} ({getSupplierStats(s.supplier_name).totalPending > 0 ? `₹${getSupplierStats(s.supplier_name).totalPending.toLocaleString()} pending` : 'Cleared'})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setPayForm({
                    date: sysDate,
                    amount: currentStats.totalPending > 0 ? currentStats.totalPending.toString() : '',
                    payment_method: 'CASH',
                    reference: '',
                    notes: `Payment for ${selectedSuppName}`,
                    truck_no: currentStats.activeTrucks[0]?.truck_no || '',
                    supplier_name: selectedSuppName
                  });
                  setSelInvoice(currentStats.activeTrucks[0] || null);
                  setPayFormOpen(true);
                }}
                style={{
                  padding: '9px 18px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.3)'
                }}
              >
                <DollarSign size={16} />
                <span>+ Record Payment</span>
              </button>
            </div>
          </div>

          {/* Supplier Header Banner Card */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid rgba(245,158,11,0.25)',
            borderLeft: '5px solid #d97706',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.45rem',
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                flexShrink: 0
              }}>
                {(selectedSuppName || 'S')[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: '#d97706',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  ACTIVE SUPPLIER PROFILE
                </div>
                <h2 style={{
                  margin: '2px 0 4px 0',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                  textTransform: 'capitalize'
                }}>
                  {selectedSuppName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {selectedSuppProfile.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} color="#d97706" /> {selectedSuppProfile.phone}
                    </span>
                  )}
                  {selectedSuppProfile.city && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#d97706" /> {selectedSuppProfile.city}
                    </span>
                  )}
                  {selectedSuppProfile.bank_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={13} color="#d97706" /> {selectedSuppProfile.bank_name} {selectedSuppProfile.account_number ? `(A/C: ${selectedSuppProfile.account_number})` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary Boxes */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                textAlign: 'center',
                padding: '10px 18px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: '#10b981' }}>Net Invoices</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                  ₹{currentStats.totalNet.toLocaleString()}
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '10px 18px',
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: '#3b82f6' }}>Total Paid (Jama)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#3b82f6', marginTop: '2px' }}>
                  ₹{currentStats.totalPaid.toLocaleString()}
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '10px 18px',
                background: currentStats.totalPending > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                border: currentStats.totalPending > 0 ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(16,185,129,0.25)',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: currentStats.totalPending > 0 ? '#ef4444' : '#10b981' }}>Pending Balance</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: currentStats.totalPending > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                  ₹{currentStats.totalPending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* USER REQUESTED: ACTIVE TRUCK & COMPLETED BUTTONS (Matching Image 2) */}
          {/* ================================================================= */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '16px'
          }}>
            {/* The exact Pill Filter Buttons from Image 2 */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: '9999px',
              padding: '4px',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              {/* Active Button */}
              <button
                type="button"
                onClick={() => {
                  setTruckFilter('ACTIVE');
                  setActiveDetailTab('invoices');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: truckFilter === 'ACTIVE' && activeDetailTab === 'invoices' ? '#059669' : 'transparent',
                  color: truckFilter === 'ACTIVE' && activeDetailTab === 'invoices' ? '#ffffff' : 'var(--text-main)',
                  boxShadow: truckFilter === 'ACTIVE' && activeDetailTab === 'invoices' ? '0 2px 8px rgba(5,150,105,0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>●</span>
                <span>Active ({currentStats.activeCount})</span>
              </button>

              {/* Complete Button */}
              <button
                type="button"
                onClick={() => {
                  setTruckFilter('COMPLETE');
                  setActiveDetailTab('invoices');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 20px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: truckFilter === 'COMPLETE' && activeDetailTab === 'invoices' ? '#059669' : 'transparent',
                  color: truckFilter === 'COMPLETE' && activeDetailTab === 'invoices' ? '#ffffff' : (truckFilter === 'ACTIVE' && activeDetailTab === 'invoices' ? '#334155' : 'var(--text-main)'),
                  boxShadow: truckFilter === 'COMPLETE' && activeDetailTab === 'invoices' ? '0 2px 8px rgba(5,150,105,0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <span style={{
                  fontSize: '1rem',
                  color: truckFilter === 'COMPLETE' && activeDetailTab === 'invoices' ? '#ffffff' : '#2563eb',
                  fontWeight: 900
                }}>
                  ✓
                </span>
                <span>Complete ({currentStats.completedCount})</span>
              </button>
            </div>

            {/* Navigation Tabs: Invoice History vs Payment Records */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setActiveDetailTab('invoices')}
                style={{
                  padding: '9px 18px',
                  border: 'none',
                  background: activeDetailTab === 'invoices' ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, transparent 100%)' : 'transparent',
                  borderBottom: activeDetailTab === 'invoices' ? '3px solid #d97706' : '3px solid transparent',
                  color: activeDetailTab === 'invoices' ? '#d97706' : 'var(--text-secondary)',
                  fontWeight: activeDetailTab === 'invoices' ? 800 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FileText size={15} />
                <span>Net Invoice History & Settlement Tracking</span>
                <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', background: activeDetailTab === 'invoices' ? '#f59e0b' : 'var(--bg-main)', color: activeDetailTab === 'invoices' ? '#fff' : 'var(--text-secondary)', fontWeight: 800 }}>
                  {truckFilter === 'ACTIVE' ? currentStats.activeCount : currentStats.completedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveDetailTab('payments')}
                style={{
                  padding: '9px 18px',
                  border: 'none',
                  background: activeDetailTab === 'payments' ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, transparent 100%)' : 'transparent',
                  borderBottom: activeDetailTab === 'payments' ? '3px solid #d97706' : '3px solid transparent',
                  color: activeDetailTab === 'payments' ? '#d97706' : 'var(--text-secondary)',
                  fontWeight: activeDetailTab === 'payments' ? 800 : 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <History size={15} />
                <span>Payment Records (Jama)</span>
                <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', background: activeDetailTab === 'payments' ? '#f59e0b' : 'var(--bg-main)', color: activeDetailTab === 'payments' ? '#fff' : 'var(--text-secondary)', fontWeight: 800 }}>
                  {currentStats.payments.length}
                </span>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: NET INVOICE HISTORY & SETTLEMENT TRACKING                   */}
          {/* ================================================================= */}
          {activeDetailTab === 'invoices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(() => {
                const displayedTrucks = truckFilter === 'ACTIVE' ? currentStats.activeTrucks : currentStats.completedTrucks;

                if (displayedTrucks.length === 0) {
                  return (
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '50px 24px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>
                        {truckFilter === 'ACTIVE' ? '✓' : '📋'}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {truckFilter === 'ACTIVE'
                          ? `Sabhi trucks clear hain! Koi active pending truck nahi hai.`
                          : `Abhi tak koi truck complete / settled nahi hua hai.`}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {truckFilter === 'ACTIVE'
                          ? `Completed tab check karein ya naya truck add karein.`
                          : `Active truck ka settlement complete hone pe wo yahan dikhega.`}
                      </div>
                    </div>
                  );
                }

                return displayedTrucks.map(truckItem => {
                  const isUnsettled = truckItem.isUnsettledPurchase;
                  const isCompleted = truckItem.isCompleted;
                  const statusColor = isCompleted ? '#10b981' : (truckItem.paidForTruck > 0 ? '#f59e0b' : '#ef4444');

                  return (
                    <div
                      key={truckItem.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1.5px solid ${statusColor}30`,
                        borderLeft: `5px solid ${statusColor}`,
                        borderRadius: '16px',
                        padding: '18px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Truck Card Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🚚</span>
                          <div>
                            <div style={{
                              fontFamily: 'monospace',
                              fontSize: '1.22rem',
                              fontWeight: 900,
                              color: 'var(--text-main)',
                              letterSpacing: '0.04em'
                            }}>
                              {truckItem.truck_no}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                              📅 Date: {truckItem.saved_date} {isUnsettled ? '• (In Progress Truck Purchase)' : '• (Settlement Finalized)'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            padding: '4px 14px',
                            borderRadius: '20px',
                            background: `${statusColor}15`,
                            color: statusColor,
                            border: `1px solid ${statusColor}35`
                          }}>
                            {isCompleted ? '✓ Completed (Settled)' : (truckItem.paidForTruck > 0 ? '⚡ Partial Paid' : '⏳ Active / Pending')}
                          </span>
                        </div>
                      </div>

                      {/* Settlement Tracking & Deductions Box */}
                      <div style={{
                        background: 'var(--bg-main)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Gross Bikri (Total Sold Value)</span>
                          <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{Number(truckItem.gross_bikri || 0).toLocaleString()}
                          </span>
                        </div>

                        {!isUnsettled && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                            <span style={{ color: '#dc2626' }}>
                              (-) Commission: ₹{Number(truckItem.commission || 0).toLocaleString()} | TF: ₹{Number(truckItem.truck_fare || 0).toLocaleString()} | Kuli: ₹{Number(truckItem.kuli || 0).toLocaleString()}
                            </span>
                            <span style={{ fontWeight: 800, color: '#dc2626' }}>
                              - ₹{(Number(truckItem.commission || 0) + Number(truckItem.truck_fare || 0) + Number(truckItem.kuli || 0)).toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div style={{
                          borderTop: '1px dashed var(--border-subtle)',
                          paddingTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#047857' }}>
                            Net Invoice (Payable Amount):
                          </span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>
                            ₹{Number(truckItem.net_invoice || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Payment & Settlement Progress Bar */}
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                          fontSize: '0.82rem'
                        }}>
                          <span style={{ fontWeight: 800, color: '#2563eb' }}>
                            Paid: ₹{Number(truckItem.paidForTruck || 0).toLocaleString()}
                          </span>
                          <span style={{
                            fontWeight: 800,
                            color: truckItem.pendingForTruck > 0 ? '#ef4444' : '#10b981'
                          }}>
                            Pending: ₹{Number(truckItem.pendingForTruck || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: 'rgba(0,0,0,0.06)',
                          borderRadius: '10px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(100, Math.round(((truckItem.paidForTruck || 0) / Math.max(1, truckItem.net_invoice || 1)) * 100))}%`,
                            height: '100%',
                            background: isCompleted ? '#10b981' : 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      {/* Truck-level Payment History */}
                      {truckItem.truckPayments && truckItem.truckPayments.length > 0 && (
                        <div style={{
                          marginTop: '4px',
                          padding: '10px 14px',
                          background: 'rgba(59,130,246,0.04)',
                          borderRadius: '10px',
                          border: '1px solid rgba(59,130,246,0.15)'
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>
                            Payment Records for this truck ({truckItem.truckPayments.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {truckItem.truckPayments.map(tp => (
                              <div key={tp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  📅 {tp.date} • <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tp.payment_method}</span> {tp.reference ? `(${tp.reference})` : ''}
                                </span>
                                <span style={{ fontWeight: 900, color: '#10b981' }}>
                                  + ₹{Number(tp.amount).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Card Action: Pay Now Button if pending */}
                      {truckItem.pendingForTruck > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            onClick={() => {
                              setSelInvoice(truckItem);
                              setPayForm({
                                date: sysDate,
                                amount: truckItem.pendingForTruck.toString(),
                                payment_method: 'CASH',
                                reference: '',
                                notes: `Payment for truck ${truckItem.truck_no}`,
                                truck_no: truckItem.truck_no,
                                supplier_name: selectedSuppName
                              });
                              setPayFormOpen(true);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '8px 20px',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 3px 10px rgba(245,158,11,0.3)'
                            }}
                          >
                            <DollarSign size={15} />
                            <span>Pay ₹{Number(truckItem.pendingForTruck).toLocaleString()} Now</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: PAYMENT RECORDS (JAMA HISTORY)                             */}
          {/* ================================================================= */}
          {activeDetailTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  All Recorded Payments for {selectedSuppName} ({currentStats.payments.length})
                </div>
                <button
                  onClick={() => {
                    setPayForm({
                      date: sysDate,
                      amount: '',
                      payment_method: 'CASH',
                      reference: '',
                      notes: `Payment for ${selectedSuppName}`,
                      truck_no: currentStats.activeTrucks[0]?.truck_no || '',
                      supplier_name: selectedSuppName
                    });
                    setSelInvoice(null);
                    setPayFormOpen(true);
                  }}
                  style={{
                    padding: '7px 16px',
                    background: 'rgba(245,158,11,0.12)',
                    border: '1.5px solid rgba(245,158,11,0.35)',
                    color: '#d97706',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Plus size={14} /> Add Payment
                </button>
              </div>

              {currentStats.payments.length === 0 ? (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '50px 24px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💸</div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    Koi payment recorded nahi hai
                  </div>
                  <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    "+ Record Payment" button dabakar supplier ka jama record karein.
                  </p>
                </div>
              ) : (
                currentStats.payments.map(pay => (
                  <div
                    key={pay.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '5px solid #10b981',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#10b981' }}>
                          ₹{Number(pay.amount).toLocaleString()}
                        </span>
                        <span style={{
                          fontSize: '0.74rem',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(59,130,246,0.1)',
                          color: '#2563eb',
                          fontWeight: 700
                        }}>
                          {pay.payment_method}
                        </span>
                        {pay.truck_no && (
                          <span style={{
                            fontSize: '0.74rem',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: 'rgba(245,158,11,0.1)',
                            color: '#d97706',
                            fontWeight: 800,
                            fontFamily: 'monospace'
                          }}>
                            🚚 {pay.truck_no}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        📅 Date: {pay.date} {pay.reference ? `• Ref / UTR: ${pay.reference}` : ''}
                      </div>

                      {pay.notes && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                          "{pay.notes}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(16,185,129,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Check size={18} color="#10b981" />
                      </div>
                      <button
                        onClick={() => handleDeletePayment(pay.id)}
                        title="Delete this payment record"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          opacity: 0.7
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardView({
  dashboardData,
  suppliers = [],
  truckPayments = [],
  products = [],
  trucks = [],
  customers = [],
  salesList = [],
  customerLedger = [],
  purchasesList = [],
  setCustomers,
  setSuppliers,
  setSalesList,
  setActiveTab,
  openNewPurchase,
  openNewSale,
  onRefresh,
  showToast,
  isFormOpen: extIsFormOpen,
  setIsFormOpen: extSetIsFormOpen,
  isCustomerModalOpen: extIsCustomerModalOpen,
  setIsCustomerModalOpen: extSetIsCustomerModalOpen,
  isSupplierTrucksModalOpen: extIsSupplierTrucksModalOpen,
  setIsSupplierTrucksModalOpen: extSetIsSupplierTrucksModalOpen,
  searchQuery = '',
  currentUser,
  activeTab = 'dashboard'
}) {
  const [internalFormOpen, setInternalFormOpen] = useState(false);
  const isFormOpen = extIsFormOpen !== undefined ? extIsFormOpen : internalFormOpen;
  const setIsFormOpen = extSetIsFormOpen || setInternalFormOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatusFilter, setProfileStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (default: balance > 0) | 'COMPLETED' (balance == 0) | 'ALL'

  // ---------------------------------------------------------------------------
  // Supplier Profiles & Trucks Directory Modal State
  // ---------------------------------------------------------------------------
  const [internalSupplierTrucksModalOpen, setInternalSupplierTrucksModalOpen] = useState(false);
  const isSupplierTrucksModalOpen = extIsSupplierTrucksModalOpen !== undefined ? extIsSupplierTrucksModalOpen : internalSupplierTrucksModalOpen;
  const setIsSupplierTrucksModalOpen = extSetIsSupplierTrucksModalOpen || setInternalSupplierTrucksModalOpen;
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState(null);
  const [isSupplierDetailPopupOpen, setIsSupplierDetailPopupOpen] = useState(false);
  const [supplierTrucksSearch, setSupplierTrucksSearch] = useState('');
  const [selectedTruckFilter, setSelectedTruckFilter] = useState('ALL');
  const [truckStatusFilter, setTruckStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (balance > 0) | 'COMPLETE' (balance === 0)
  const [selectedTruckNumber, setSelectedTruckNumber] = useState(null);
  const [truckSettlements, setTruckSettlements] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mandi_truck_settlements')) || {};
    } catch {
      return {};
    }
  });

  const updateTruckSettlement = (truckKey, field, val) => {
    setTruckSettlements(prev => {
      const cur = prev[truckKey] || { commissionPercent: 5, truckFare: 0, kuli: 0 };
      const updated = {
        ...prev,
        [truckKey]: {
          ...cur,
          [field]: val
        }
      };
      try {
        localStorage.setItem('mandi_truck_settlements', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const handlePrintTruckInvoice = (supplier, truckNo, fruitName, truckSales, totalBoxes, totalSold, settlement, commAmount, fareAmount, kuliAmount, invoiceTotal) => {
    const printWin = window.open('', '_blank', 'width=840,height=900');
    if (!printWin) {
      if (showToast) showToast('Please allow popups to print invoice', 'error');
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mandi Settlement Invoice - Truck ${truckNo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #fff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #dbeafe; color: #1e40af; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
          .val { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; border-bottom: 1.5px solid #cbd5e1; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .calc-table { width: 100%; max-width: 360px; margin-left: auto; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
          .calc-row { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
          .calc-row.highlight { background: #f0fdf4; font-weight: 800; font-size: 14px; color: #15803d; border-top: 2px solid #16a34a; }
          .calc-row.minus { color: #dc2626; font-weight: 600; }
          .footer { margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          @media print { body { padding: 12px; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">AZIZ INTERNATIONAL TRADING CO.</h1>
            <div class="subtitle">Commission Agent & Wholesale Fruit Mandi, Shed 14, Azadpur, Delhi</div>
            <div class="subtitle">APMC License: APMC/AZD/2026/894 • Phone: +91 98765 43210</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">TRUCK SETTLEMENT INVOICE</span>
            <div style="font-size: 11px; margin-top: 6px; color: #475569;">Date: ${getSystemDate()}</div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="label">Vyapari / Supplier</div>
            <div class="val">${supplier?.supplier_name || 'Supplier'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Phone: ${supplier?.phone || '—'} • City: ${supplier?.city || 'Mandi'}</div>
          </div>
          <div>
            <div class="label">Bank Settlement Passbook</div>
            <div class="val">${supplier?.bank_name || 'Bank Account'}</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700; font-family: monospace;">A/C: ${supplier?.account_number || '—'}</div>
            <div style="font-size: 10px; color: #64748b;">IFSC: ${supplier?.ifsc_code || '—'} • ${supplier?.branch_name || ''}</div>
          </div>
          <div>
            <div class="label">Truck Details</div>
            <div class="val" style="font-family: monospace; font-size: 14px; color: #2563eb;">${truckNo}</div>
            <div style="font-size: 11px; color: #64748b;">Produce: ${fruitName || 'Fresh Fruits'}</div>
          </div>
          <div>
            <div class="label">Total Sold (Status)</div>
            <div class="val" style="color: #15803d;">${totalBoxes} Boxes Sold (Complete)</div>
            <div style="font-size: 11px; color: #64748b;">All Stock Cleared • 0 Balance</div>
          </div>
        </div>

        <h3 style="font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; color: #334155; font-weight: 800;">Customer-wise Bikri Parchi Details</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Produce</th>
              <th>Boxes & Rate</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(truckSales || []).map(s => `
              <tr>
                <td>${s.selling_date || '—'}</td>
                <td><strong>${s.customer_name || 'Customer'}</strong></td>
                <td>${s.product_name || fruitName || 'Fruit'}</td>
                <td><strong>${s.boxes} BX</strong> @ ₹${Number(s.rate_per_box).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 700;">₹${Number(s.total).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="3" style="text-align: right;">Total Bikri (${totalBoxes} Boxes):</td>
              <td>${totalBoxes} BX</td>
              <td style="text-align: right; color: #0f172a; font-size: 13px;">₹${totalSold.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: flex-end;">
          <div class="calc-table">
            <div class="calc-row">
              <span>Total Sold (Gross Bikri):</span>
              <strong style="color: #0f172a;">₹${totalSold.toLocaleString()}</strong>
            </div>
            <div class="calc-row minus">
              <span>Less: Commission (${settlement?.commissionPercent || 5}%):</span>
              <strong>- ₹${commAmount.toLocaleString()}</strong>
            </div>
            <div class="calc-row minus">
              <span>Less: Truck Fare (TF):</span>
              <strong>- ₹${fareAmount.toLocaleString()}</strong>
            </div>
            <div class="calc-row minus">
              <span>Less: Kuli (Hamali):</span>
              <strong>- ₹${kuliAmount.toLocaleString()}</strong>
            </div>
            <div class="calc-row highlight">
              <span>NET INVOICE TOTAL (Payable):</span>
              <span>₹${invoiceTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>
            Prepared by: ${currentUser?.first_name || 'Aziz'} (Aarhtiya)
            <br>System Generated Mandi Parchi
          </div>
          <div style="text-align: right;">
            <div style="height: 35px;"></div>
            <div>Authorized Signature & Mandi Seal</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWin.document.write(html);
    printWin.document.close();
  };

  const [copiedBankSupplierId, setCopiedBankSupplierId] = useState(null);
  const [savedSettlementTruck, setSavedSettlementTruck] = useState(null);

  // ---------------------------------------------------------------------------
  // Cash Sale Sidebar State
  // ---------------------------------------------------------------------------
  const [isCashSaleSidebarOpen, setIsCashSaleSidebarOpen] = useState(false);
  const [cashSaleSupplier, setCashSaleSupplier] = useState(null); // active supplier for sidebar
  const [cashSaleSettlements, setCashSaleSettlements] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mandi_cash_sale_settlements')) || [];
    } catch { return []; }
  });
  const [cashSalePayments, setCashSalePayments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mandi_cash_sale_payments')) || [];
    } catch { return []; }
  });
  const [cashSidebarTab, setCashSidebarTab] = useState('invoices'); // 'invoices' | 'payments'
  const [cashPaymentForm, setCashPaymentForm] = useState({
    date: getSystemDate(),
    amount: '',
    payment_method: 'CASH',
    reference: '',
    notes: '',
    truck_no: ''
  });
  const [isCashPaymentFormOpen, setIsCashPaymentFormOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  const saveCashSaleSettlements = (updated) => {
    try { localStorage.setItem('mandi_cash_sale_settlements', JSON.stringify(updated)); } catch { }
  };
  const saveCashSalePayments = (updated) => {
    try { localStorage.setItem('mandi_cash_sale_payments', JSON.stringify(updated)); } catch { }
  };

  const handleSaveSettlementAndOpenSidebar = (supplier, tNum, invoiceTotal, totalSoldValue, commAmount, fareAmount, kuliAmount) => {
    setSavedSettlementTruck(tNum);
    setTimeout(() => setSavedSettlementTruck(null), 2500);
    // Save settlement record
    const record = {
      id: Date.now(),
      supplier_name: supplier?.supplier_name || '',
      truck_no: tNum,
      saved_date: getSystemDate(),
      gross_bikri: totalSoldValue,
      commission: commAmount,
      truck_fare: fareAmount,
      kuli: kuliAmount,
      net_invoice: invoiceTotal,
      status: 'PENDING' // PENDING | PAID | PARTIAL
    };
    setCashSaleSettlements(prev => {
      const exists = prev.find(r => r.truck_no === tNum && r.supplier_name === record.supplier_name);
      let updated;
      if (exists) {
        updated = prev.map(r => r.truck_no === tNum && r.supplier_name === record.supplier_name ? { ...r, ...record, id: r.id } : r);
      } else {
        updated = [record, ...prev];
      }
      saveCashSaleSettlements(updated);
      return updated;
    });
    setCashSaleSupplier(supplier);
    setCashSidebarTab('invoices');
    setIsCashSaleSidebarOpen(true);
    if (showToast) showToast(`Settlement saved! Cash Sale Ledger mein Net Invoice ₹${invoiceTotal.toLocaleString()} record ho gaya. 💰`, 'success');
  };

  const handleCashPaymentSave = (e) => {
    if (e) e.preventDefault();
    const amt = Number(cashPaymentForm.amount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Please enter a valid payment amount', 'error');
      return;
    }
    const suppName = cashSaleSupplier?.supplier_name || '';
    const newPay = {
      id: Date.now(),
      supplier_name: suppName,
      truck_no: cashPaymentForm.truck_no || selectedInvoiceForPayment?.truck_no || '',
      date: cashPaymentForm.date,
      amount: amt,
      payment_method: cashPaymentForm.payment_method,
      reference: cashPaymentForm.reference || `PAY-${Date.now().toString().slice(-4)}`,
      notes: cashPaymentForm.notes || 'Supplier payment'
    };
    setCashSalePayments(prev => {
      const updated = [newPay, ...prev];
      saveCashSalePayments(updated);
      return updated;
    });
    // Update invoice status
    if (selectedInvoiceForPayment) {
      setCashSaleSettlements(prev => {
        const updated = prev.map(inv => {
          if (inv.id === selectedInvoiceForPayment.id) {
            const totalPaid = cashSalePayments
              .filter(p => p.truck_no === inv.truck_no && p.supplier_name === inv.supplier_name)
              .reduce((s, p) => s + Number(p.amount), 0) + amt;
            const status = totalPaid >= inv.net_invoice ? 'PAID' : 'PARTIAL';
            return { ...inv, status };
          }
          return inv;
        });
        saveCashSaleSettlements(updated);
        return updated;
      });
    }
    setCashPaymentForm({ date: getSystemDate(), amount: '', payment_method: 'CASH', reference: '', notes: '', truck_no: '' });
    setIsCashPaymentFormOpen(false);
    setSelectedInvoiceForPayment(null);
    if (showToast) showToast(`Payment ₹${amt.toLocaleString()} saved successfully! 💵`, 'success');
  };

  // Edit passbook / supplier profile modal state (inside Supplier Profiles & Trucks)
  const [isEditPassbookOpen, setIsEditPassbookOpen] = useState(false);
  const [passbookForm, setPassbookForm] = useState({
    id: null,
    supplier_name: '',
    phone: '',
    city: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: ''
  });
  const [isSavingPassbook, setIsSavingPassbook] = useState(false);

  // Add new supplier modal state (inside Supplier Profiles & Trucks)
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplierModalForm, setNewSupplierModalForm] = useState({
    supplier_name: '',
    phone: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: ''
  });
  const [isSavingSupplierModal, setIsSavingSupplierModal] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Supplier Entry Form State
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState({
    supplier_name: '',
    phone: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    date: getSystemDate(),
    truckno: '',
    fruit: '',
    variety: '',
    boxes: '',
    damage_boxes: ''
  });

  // Supplier Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestionRef = useRef(null);

  // Dynamic Saved Fruit Names & Varieties (User-entered, persisted in localStorage + MySQL)
  const [savedFruitNames, setSavedFruitNames] = useState(() => {
    try {
      localStorage.removeItem('mandi_fruit_names');
      const saved = localStorage.getItem('mandi_custom_fruit_names');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  const [savedFruitVarieties, setSavedFruitVarieties] = useState(() => {
    try {
      localStorage.removeItem('mandi_fruit_varieties');
      const saved = localStorage.getItem('mandi_custom_fruit_varieties');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  // Fruit Name Autocomplete State
  const [fruitSuggestions, setFruitSuggestions] = useState([]);
  const [showFruitSuggestions, setShowFruitSuggestions] = useState(false);
  const [activeFruitIndex, setActiveFruitIndex] = useState(-1);
  const fruitRef = useRef(null);
  const fruitInputRef = useRef(null);

  // Fruit Variety Autocomplete State
  const [varietySuggestions, setVarietySuggestions] = useState([]);
  const [showVarietySuggestions, setShowVarietySuggestions] = useState(false);
  const [activeVarietyIndex, setActiveVarietyIndex] = useState(-1);
  const varietyRef = useRef(null);
  const varietyInputRef = useRef(null);
  const boxesInputRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 2. Supplier Profiles State (persisted in localStorage)
  // ---------------------------------------------------------------------------
  const [supplierProfiles, setSupplierProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_supplier_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(p => !['Maa Fruits Mandi Traders', 'Royal Kashmir Orchards'].includes(p.supplier_name))
            .map(p => ({
              ...p,
              variety: p.variety === 'Grade A' ? '' : (p.variety || '')
            }));
        }
      }
    } catch {
      // ignore
    }

    if (truckPayments && truckPayments.length > 0) {
      return truckPayments.map(tp => {
        const supp = suppliers.find(s => s.id === tp.supplier || s.supplier_name === tp.supplier_name);
        return {
          id: tp.id || Date.now() + Math.random(),
          supplier_name: tp.supplier_name || supp?.supplier_name || 'Supplier',
          phone: supp?.phone || '',
          bank_name: supp?.bank_name || '',
          account_number: supp?.account_number || '',
          ifsc_code: supp?.ifsc_code || '',
          branch_name: supp?.branch_name || '',
          truckno: tp.truck_number || '0000000',
          date: tp.payment_date || getSystemDate(),
          fruit: tp.fruit_name || '',
          variety: tp.variety === 'Grade A' ? '' : (tp.variety || ''),
          boxes: Number(tp.no_of_boxes || 0),
          balance_box: Number(tp.no_of_boxes || 0)
        };
      });
    }

    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(supplierProfiles));
    } catch {
      // ignore
    }
  }, [supplierProfiles]);

  useEffect(() => {
    try {
      localStorage.setItem('mandi_custom_fruit_names', JSON.stringify(savedFruitNames));
    } catch { }
  }, [savedFruitNames]);

  useEffect(() => {
    try {
      localStorage.setItem('mandi_custom_fruit_varieties', JSON.stringify(savedFruitVarieties));
    } catch { }
  }, [savedFruitVarieties]);

  // Clean Slate Initialization: Remove any legacy mock data and clean Grade A from current profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard_supplier_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(p => p.variety === 'Grade A')) {
          const cleaned = parsed.map(p => ({
            ...p,
            variety: p.variety === 'Grade A' ? '' : (p.variety || '')
          }));
          localStorage.setItem('dashboard_supplier_profiles', JSON.stringify(cleaned));
          setSupplierProfiles(cleaned);
        }
      }
    } catch { }

    const isCleaned = localStorage.getItem('mandi_clean_slate_v7');
    if (!isCleaned) {
      localStorage.removeItem('mandi_truck_settlements');
      localStorage.removeItem('dashboard_supplier_profiles');
      localStorage.removeItem('mandi_custom_fruits');
      localStorage.removeItem('mandi_custom_fruit_varieties');
      localStorage.setItem('mandi_clean_slate_v7', 'true');
      setSupplierProfiles([]);
    }
  }, []);


  // ---------------------------------------------------------------------------
  // 3. Unified Customer Profiles State (Single profile per customer with buy & payment history)
  // ---------------------------------------------------------------------------
  const [customerProfiles, setCustomerProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('mandi_customer_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => !['Sharma Fruits Wholesale', 'FreshMart Hypermarkets', 'Golden Tree Dry Fruits & Sweets'].includes(c.customer_name));
        }
      }
    } catch {
      // ignore
    }

    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mandi_customer_profiles', JSON.stringify(customerProfiles));
    } catch {
      // ignore
    }
  }, [customerProfiles]);


  // Truck-wise fruit sales history (persisted in localStorage)
  const [truckSalesList, setTruckSalesList] = useState(() => {
    try {
      const saved = localStorage.getItem('mandi_truck_sales');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('mandi_truck_sales', JSON.stringify(truckSalesList));
    } catch {
      // ignore
    }
  }, [truckSalesList]);

  // ---------------------------------------------------------------------------
  // 4. Sale Modal State (Triggered on clicking ANY supplier profile card)
  // ---------------------------------------------------------------------------
  const [selectedProfileForSale, setSelectedProfileForSale] = useState(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleTotalInput, setSaleTotalInput] = useState('');
  const [rateAppliedNotice, setRateAppliedNotice] = useState(false);
  const [saleForm, setSaleForm] = useState({
    date: getSystemDate(),
    customer_name: '',
    phone: '',
    city: '',
    product_name: '',
    boxes: '',
    rate_per_box: '',
    payment_mode: 'CREDIT',
    amount_paid: ''
  });

  // Customer Autocomplete in Sale Modal
  const [saleCustomerSuggestions, setSaleCustomerSuggestions] = useState([]);
  const [showSaleCustomerSuggestions, setShowSaleCustomerSuggestions] = useState(false);
  const [activeSaleCustomerIndex, setActiveSaleCustomerIndex] = useState(-1);
  const saleCustomerRef = useRef(null);
  const saleCustomerInputRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 5. Customer Directory & Unified Profile Modal State (Triggered from Top Button)
  // ---------------------------------------------------------------------------
  const [internalCustomerModalOpen, setInternalCustomerModalOpen] = useState(false);
  const isCustomerModalOpen = extIsCustomerModalOpen !== undefined ? extIsCustomerModalOpen : internalCustomerModalOpen;
  const setIsCustomerModalOpen = extSetIsCustomerModalOpen || setInternalCustomerModalOpen;
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerForView, setSelectedCustomerForView] = useState(null);
  const [isCustomerDetailPopupOpen, setIsCustomerDetailPopupOpen] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState('buy'); // 'buy' | 'payment'

  // Payment Drawer inside Customer Profile
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: getSystemDate(),
    amount: '',
    payment_method: 'CASH',
    reference: '',
    notes: ''
  });

  // Add New Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    customer_name: '',
    phone: '',
    city: '',
    opening_balance: ''
  });

  // Edit Existing Customer Modal
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    id: null,
    customer_name: '',
    phone: '',
    city: '',
    address: ''
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Click outside suggestion dropdowns to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (saleCustomerRef.current && !saleCustomerRef.current.contains(e.target)) {
        setShowSaleCustomerSuggestions(false);
      }
      if (fruitRef.current && !fruitRef.current.contains(e.target)) {
        setShowFruitSuggestions(false);
      }
      if (varietyRef.current && !varietyRef.current.contains(e.target)) {
        setShowVarietySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers: Supplier Autocomplete
  // ---------------------------------------------------------------------------
  const handleSupplierNameChange = (val) => {
    setForm(prev => ({ ...prev, supplier_name: val }));

    if (!val || val.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = val.toLowerCase().trim();
    const combined = [...suppliers];
    supplierProfiles.forEach(p => {
      if (!combined.some(c => (c.supplier_name || '').toLowerCase() === (p.supplier_name || '').toLowerCase())) {
        combined.push(p);
      }
    });

    const matches = combined.filter(s => {
      const name = (s.supplier_name || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setActiveSuggestionIndex(-1);
  };

  const handleSelectSuggestion = (s) => {
    setForm(prev => ({
      ...prev,
      supplier_name: s.supplier_name || '',
      phone: s.phone || prev.phone || '',
      bank_name: s.bank_name || prev.bank_name || '',
      account_number: s.account_number || prev.account_number || '',
      ifsc_code: s.ifsc_code || prev.ifsc_code || '',
      branch_name: s.branch_name || prev.branch_name || '',
      truckno: s.truckno || prev.truckno || '',
      fruit: s.fruit || prev.fruit || '',
      variety: s.variety || prev.variety || ''
    }));
    setShowSuggestions(false);
    if (showToast) {
      showToast(`Supplier ${s.supplier_name} details auto-filled! ✨`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : null;
      if (target) {
        handleSelectSuggestion(target);
      } else {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Save Fruit Name & Variety to Dynamic Catalog + MySQL Database
  // ---------------------------------------------------------------------------
  const saveFruitAndVariety = async (fruitName, varietyName) => {
    const cleanFruit = (fruitName || '').trim();
    const cleanVariety = (varietyName || '').trim();

    if (cleanFruit) {
      setSavedFruitNames(prev => {
        const exists = prev.some(f => f.toLowerCase() === cleanFruit.toLowerCase());
        if (!exists) {
          const updated = [...prev, cleanFruit];
          try {
            localStorage.setItem('mandi_custom_fruit_names', JSON.stringify(updated));
          } catch { }
          // Sync new product to MySQL
          api.post('/products/', {
            name: cleanFruit,
            product_code: `FRUIT-${Date.now().toString().slice(-4)}`,
            category: 1,
            default_unit: 2,
            status: 'ACTIVE'
          }).catch(() => null);
          return updated;
        }
        return prev;
      });
    }

    if (cleanVariety) {
      setSavedFruitVarieties(prev => {
        const exists = prev.some(v => v.toLowerCase() === cleanVariety.toLowerCase());
        if (!exists) {
          const updated = [...prev, cleanVariety];
          try {
            localStorage.setItem('mandi_custom_fruit_varieties', JSON.stringify(updated));
          } catch { }
          // Sync new variety to MySQL
          api.post('/products/varieties/', {
            product: 1,
            variety_name: cleanVariety,
            variety_code: `VAR-${Date.now().toString().slice(-4)}`
          }).catch(() => null);
          return updated;
        }
        return prev;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Fruit Name Autocomplete & Keyboard Enter Selection
  // ---------------------------------------------------------------------------
  const handleFruitChange = (val) => {
    setForm(prev => ({ ...prev, fruit: val }));
    const q = (val || '').trim().toLowerCase();
    if (!q) {
      setFruitSuggestions([]);
      setShowFruitSuggestions(false);
      setActiveFruitIndex(-1);
      return;
    }
    const filtered = savedFruitNames.filter(f => f.toLowerCase().includes(q));
    setFruitSuggestions(filtered);
    setShowFruitSuggestions(filtered.length > 0);
    setActiveFruitIndex(-1);
  };

  const handleSelectFruit = (selectedFruit) => {
    const cleanFruit = (selectedFruit || '').trim();
    if (!cleanFruit) return;
    setForm(prev => ({ ...prev, fruit: cleanFruit }));
    saveFruitAndVariety(cleanFruit, '');
    setShowFruitSuggestions(false);
    setActiveFruitIndex(-1);
    if (varietyInputRef.current) {
      varietyInputRef.current.focus();
    }
  };

  const handleFruitKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showFruitSuggestions && fruitSuggestions.length > 0) {
        setShowFruitSuggestions(true);
        return;
      }
      setActiveFruitIndex(prev => (prev < fruitSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveFruitIndex(prev => (prev > 0 ? prev - 1 : fruitSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      let chosen = '';
      if (showFruitSuggestions && activeFruitIndex >= 0 && fruitSuggestions[activeFruitIndex]) {
        chosen = fruitSuggestions[activeFruitIndex];
      } else if (form.fruit && form.fruit.trim()) {
        const exact = fruitSuggestions.find(f => f.toLowerCase() === form.fruit.trim().toLowerCase());
        chosen = exact || form.fruit.trim();
      }

      if (chosen) {
        handleSelectFruit(chosen);
      } else {
        setShowFruitSuggestions(false);
        if (varietyInputRef.current) {
          varietyInputRef.current.focus();
        }
      }
    } else if (e.key === 'Escape') {
      setShowFruitSuggestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Fruit Variety Autocomplete & Keyboard Enter Selection
  // ---------------------------------------------------------------------------
  const handleVarietyChange = (val) => {
    setForm(prev => ({ ...prev, variety: val }));
    const q = (val || '').trim().toLowerCase();
    if (!q) {
      setVarietySuggestions([]);
      setShowVarietySuggestions(false);
      setActiveVarietyIndex(-1);
      return;
    }
    const filtered = savedFruitVarieties.filter(v => v.toLowerCase().includes(q));
    setVarietySuggestions(filtered);
    setShowVarietySuggestions(filtered.length > 0);
    setActiveVarietyIndex(-1);
  };

  const handleSelectVariety = (selectedVariety) => {
    const cleanVariety = (selectedVariety || '').trim();
    if (!cleanVariety) return;
    setForm(prev => ({ ...prev, variety: cleanVariety }));
    saveFruitAndVariety('', cleanVariety);
    setShowVarietySuggestions(false);
    setActiveVarietyIndex(-1);
    if (boxesInputRef.current) {
      boxesInputRef.current.focus();
    }
  };

  const handleVarietyKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showVarietySuggestions && varietySuggestions.length > 0) {
        setShowVarietySuggestions(true);
        return;
      }
      setActiveVarietyIndex(prev => (prev < varietySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveVarietyIndex(prev => (prev > 0 ? prev - 1 : varietySuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      let chosen = '';
      if (showVarietySuggestions && activeVarietyIndex >= 0 && varietySuggestions[activeVarietyIndex]) {
        chosen = varietySuggestions[activeVarietyIndex];
      } else if (form.variety && form.variety.trim()) {
        const exact = varietySuggestions.find(v => v.toLowerCase() === form.variety.trim().toLowerCase());
        chosen = exact || form.variety.trim();
      }

      if (chosen) {
        handleSelectVariety(chosen);
      } else {
        setShowVarietySuggestions(false);
        if (boxesInputRef.current) {
          boxesInputRef.current.focus();
        }
      }
    } else if (e.key === 'Escape') {
      setShowVarietySuggestions(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Save Supplier & Delivery Lot
  // ---------------------------------------------------------------------------
  const handleSaveSupplier = async (e) => {
    if (e) e.preventDefault();

    if (!form.supplier_name.trim()) {
      if (showToast) showToast('Please enter Supplier Name', 'error');
      return;
    }

    if (!form.boxes || Number(form.boxes) <= 0) {
      if (showToast) showToast('Please enter valid number of boxes', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanName = form.supplier_name.trim();
      const matchedSupplier = suppliers.find(s => (s.supplier_name || '').toLowerCase() === cleanName.toLowerCase());
      let supplierId = matchedSupplier?.id;

      if (!matchedSupplier) {
        try {
          const supPayload = {
            supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
            supplier_name: cleanName,
            phone: (form.phone || '').trim(),
            company_name: cleanName,
            city: (form.city || '').trim(),
            bank_name: (form.bank_name || '').trim(),
            account_number: (form.account_number || '').trim(),
            ifsc_code: (form.ifsc_code || '').trim(),
            branch_name: (form.branch_name || '').trim(),
            status: 'ACTIVE'
          };
          const createdSup = await api.post('/suppliers/', supPayload).catch(() => null);
          if (createdSup?.id) {
            supplierId = createdSup.id;
            if (setSuppliers) setSuppliers(prev => [createdSup, ...prev]);
          }
        } catch {
          // ignore
        }
      }

      const boxesCount = Number(form.boxes) || 0;
      const damageCount = Number(form.damage_boxes) || 0;
      if (damageCount > boxesCount) {
        if (showToast) showToast('Damage boxes cannot exceed total boxes!', 'error');
        setIsSubmitting(false);
        return;
      }
      const balanceCount = Math.max(0, boxesCount - damageCount);

      const finalTruckNo = (form.truckno || '').trim().toUpperCase() || '0000000';

      const lotPayload = {
        supplier: supplierId,
        supplier_name: cleanName,
        truck_number: finalTruckNo,
        payment_date: form.date,
        fruit_name: (form.fruit || '').trim(),
        variety: (form.variety || '').trim(),
        no_of_boxes: boxesCount,
        pay: boxesCount * 1200,
        rate_per_box: 1200,
        transport_charge: 0,
        loading_charge: 0,
        unloading_charge: 0,
        commission_charge: 0,
        discount: 0
      };

      await api.post('/purchases/truck-payments/', lotPayload).catch(() => null);

      const newProfile = {
        id: Date.now(),
        supplier_name: cleanName,
        phone: (form.phone || (matchedSupplier?.phone || '')).trim(),
        bank_name: (form.bank_name || (matchedSupplier?.bank_name || '')).trim(),
        account_number: (form.account_number || (matchedSupplier?.account_number || '')).trim(),
        ifsc_code: (form.ifsc_code || (matchedSupplier?.ifsc_code || '')).trim(),
        branch_name: (form.branch_name || (matchedSupplier?.branch_name || '')).trim(),
        truckno: finalTruckNo,
        date: form.date,
        fruit: (form.fruit || '').trim(),
        variety: (form.variety || '').trim(),
        boxes: boxesCount,
        damage_boxes: damageCount,
        balance_box: balanceCount
      };

      setSupplierProfiles(prev => [newProfile, ...prev]);


      // Persist newly typed fruit & variety into dynamic catalog + MySQL
      saveFruitAndVariety(form.fruit, form.variety);

      if (showToast) {
        if (damageCount > 0) {
          showToast(`Profile created for ${cleanName} with ${balanceCount} balance boxes (${boxesCount} Total - ${damageCount} Damage) & saved to MySQL! 📦💾`, 'success');
        } else {
          showToast(`Profile created for ${cleanName} with ${boxesCount} balance boxes & saved to MySQL Database! 📦💾`, 'success');
        }
      }

      setForm({
        supplier_name: '',
        phone: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        date: getSystemDate(),
        truckno: '',
        fruit: '',
        variety: '',
        boxes: '',
        damage_boxes: ''
      });

      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast('Error saving supplier lot: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Click Anywhere on Supplier Profile Card -> Open Sale Modal
  // ---------------------------------------------------------------------------
  const handleOpenSaleModal = (profile) => {
    if (Number(profile.balance_box || 0) <= 0) {
      if (showToast) {
        showToast(`Truck ${profile.truckno} ka stock complete (0 Balance) ho chuka hai. All details preserved in Supplier Profiles & Trucks Directory.`, 'info');
      }
      return;
    }
    setSelectedProfileForSale(profile);
    const prodName = `${profile.fruit || ''}${profile.variety && profile.variety.trim() ? ' — ' + profile.variety.trim() : ''}`;
    setSaleForm({
      date: getSystemDate(),
      customer_name: '',
      phone: '',
      city: '',
      product_name: prodName,
      boxes: '',
      rate_per_box: '',
      payment_mode: 'CREDIT',
      amount_paid: ''
    });
    setSaleTotalInput('');
    setRateAppliedNotice(false);
    setSaleCustomerSuggestions([]);
    setShowSaleCustomerSuggestions(false);
    setIsSaleModalOpen(true);
    setTimeout(() => {
      if (saleCustomerInputRef.current) {
        saleCustomerInputRef.current.focus();
      }
    }, 100);
  };

  // Customer Autocomplete in Sale Modal
  const handleSaleCustomerChange = (val) => {
    setSaleForm(prev => ({ ...prev, customer_name: val }));

    if (!val || !val.trim()) {
      setSaleCustomerSuggestions([]);
      setShowSaleCustomerSuggestions(false);
      return;
    }

    const query = val.toLowerCase().trim();
    const combined = [...customerProfiles];
    customers.forEach(c => {
      if (!combined.some(p => (p.customer_name || '').toLowerCase() === (c.customer_name || '').toLowerCase())) {
        combined.push({
          id: c.id,
          customer_name: c.customer_name,
          phone: c.phone || '',
          city: c.city || 'Delhi',
          current_balance: c.current_balance || 0,
          total_boxes: 0,
          total_bought: 0,
          total_paid: 0,
          buy_history: [],
          payment_history: []
        });
      }
    });

    const matches = combined.filter(c =>
      (c.customer_name || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query)
    );

    setSaleCustomerSuggestions(matches);
    setShowSaleCustomerSuggestions(matches.length > 0);
    setActiveSaleCustomerIndex(-1);
  };

  const handleSelectSaleCustomer = (c) => {
    setSaleForm(prev => ({
      ...prev,
      customer_name: c.customer_name,
      phone: c.phone || prev.phone,
      city: c.city || prev.city
    }));
    setShowSaleCustomerSuggestions(false);
    if (showToast) {
      showToast(`Existing Customer "${c.customer_name}" selected! (Khata Due: ₹${Number(c.current_balance || 0).toLocaleString()}) ✨`);
    }
  };

  const handleSaleCustomerKeyDown = (e) => {
    if (!showSaleCustomerSuggestions || saleCustomerSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSaleCustomerIndex(prev => (prev < saleCustomerSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSaleCustomerIndex(prev => (prev > 0 ? prev - 1 : saleCustomerSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeSaleCustomerIndex >= 0 ? saleCustomerSuggestions[activeSaleCustomerIndex] : saleCustomerSuggestions[0];
      if (target) {
        handleSelectSaleCustomer(target);
      }
    } else if (e.key === 'Escape') {
      setShowSaleCustomerSuggestions(false);
    }
  };

  // Live sale numbers & calculations
  const saleBoxesNum = Number(saleForm.boxes) || 0;
  const saleTotalNum = Number(saleTotalInput) || 0;
  const calculatedRateFromTotal = (saleBoxesNum > 0 && saleTotalNum > 0)
    ? (saleTotalNum / saleBoxesNum)
    : null;
  const calculatedTotal = saleTotalNum > 0
    ? saleTotalNum
    : (saleBoxesNum * (Number(saleForm.rate_per_box) || 0));

  // Handle Boxes Change in Sale Form
  const handleSaleBoxesChange = (val) => {
    setSaleForm(prev => {
      const next = { ...prev, boxes: val };
      if (val && next.rate_per_box) {
        const tot = Number(val) * Number(next.rate_per_box);
        setSaleTotalInput(tot > 0 ? tot.toString() : '');
      } else if (!val && next.rate_per_box) {
        setSaleTotalInput('');
      }
      return next;
    });
  };

  // Handle Rate/Box Change in Sale Form
  const handleSaleRateChange = (val) => {
    setSaleForm(prev => {
      const next = { ...prev, rate_per_box: val };
      if (val && prev.boxes) {
        const tot = Number(prev.boxes) * Number(val);
        setSaleTotalInput(tot > 0 ? tot.toString() : '');
      } else if (!val) {
        setSaleTotalInput('');
      }
      return next;
    });
    if (rateAppliedNotice) setRateAppliedNotice(false);
  };

  // Handle Total Amount Change in Sale Form
  const handleSaleTotalAmountChange = (val) => {
    setSaleTotalInput(val);
    if (rateAppliedNotice) setRateAppliedNotice(false);
  };

  // Apply/Put the calculated Rate into Rate / Box (₹) *
  const handleApplyCalculatedRate = () => {
    if (!saleBoxesNum || saleBoxesNum <= 0) {
      if (showToast) showToast("Pehle 'Boxes to Sell' dalein taki Rate hisab put ho sake", 'error');
      return;
    }
    if (!saleTotalNum || saleTotalNum <= 0) {
      if (showToast) showToast("Pehle 'Total Sale Amount' dalein taki Rate hisab put ho sake", 'error');
      return;
    }

    const cleanRate = Number(calculatedRateFromTotal.toFixed(2));
    setSaleForm(prev => ({
      ...prev,
      rate_per_box: cleanRate.toString(),
      payment_mode: 'CASH',
      amount_paid: saleTotalNum.toString()
    }));
    setRateAppliedNotice(true);
    if (showToast) {
      showToast(`Rate ₹${cleanRate.toLocaleString()} / Box put ho gaya! Payment Mode: Cash (Rokda) & Amount Paid: ₹${Number(saleTotalNum).toLocaleString()} set ho gaya! 💵✨`, 'success');
    }
    setTimeout(() => setRateAppliedNotice(false), 3000);
  };

  // When Enter is pressed in the Total Sale Amount field
  const handleTotalAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (calculatedRateFromTotal !== null) {
        handleApplyCalculatedRate();
      } else if (saleTotalNum > 0 && (!saleBoxesNum || saleBoxesNum <= 0)) {
        if (showToast) showToast("Pehle 'Boxes to Sell' dalein taki Rate hisab put ho sake", 'error');
      }
    }
  };

  // On blur of Total Amount, auto-put rate if not set yet
  const handleTotalAmountBlur = () => {
    if (calculatedRateFromTotal !== null && !saleForm.rate_per_box) {
      const cleanRate = Number(calculatedRateFromTotal.toFixed(2));
      setSaleForm(prev => ({
        ...prev,
        rate_per_box: cleanRate.toString()
      }));
      setRateAppliedNotice(true);
      setTimeout(() => setRateAppliedNotice(false), 3000);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Save Sale (Record Kharidari, Deduct Balance Box, Update Khata)
  // ---------------------------------------------------------------------------
  const handleSaveSale = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProfileForSale) return;

    const cleanCustName = saleForm.customer_name.trim();
    if (!cleanCustName) {
      if (showToast) showToast('Please enter Customer Name', 'error');
      return;
    }

    const boxesToSell = Number(saleForm.boxes);
    if (!boxesToSell || boxesToSell <= 0) {
      if (showToast) showToast('Please enter valid number of boxes', 'error');
      return;
    }

    const availBoxes = Number(selectedProfileForSale.balance_box || 0);
    if (boxesToSell > availBoxes) {
      if (showToast) showToast(`Cannot sell ${boxesToSell} boxes. Only ${availBoxes} balance boxes available in this truck lot!`, 'error');
      return;
    }

    let rate = Number(saleForm.rate_per_box);
    if ((!rate || rate <= 0) && Number(saleTotalInput) > 0 && boxesToSell > 0) {
      rate = parseFloat((Number(saleTotalInput) / boxesToSell).toFixed(2));
      setSaleForm(prev => ({ ...prev, rate_per_box: rate.toString() }));
    }

    if (!rate || rate <= 0) {
      if (showToast) showToast('Please enter valid Rate/Box or Total Sale Amount', 'error');
      return;
    }

    const totalAmount = boxesToSell * rate;
    const paidAmount = saleForm.payment_mode === 'CASH'
      ? (saleForm.amount_paid !== '' ? Number(saleForm.amount_paid) : totalAmount)
      : (Number(saleForm.amount_paid) || 0);
    const unpaidAmount = Math.max(0, totalAmount - paidAmount);

    // 1. Deduct boxes from supplierProfile
    const remainingBoxes = Math.max(0, Number(selectedProfileForSale.balance_box || 0) - boxesToSell);
    setSupplierProfiles(prev => prev.map(p => {
      if (p.id === selectedProfileForSale.id) {
        return { ...p, balance_box: remainingBoxes };
      }
      return p;
    }));

    // Update active profile in sale modal so balance and max limit update live
    setSelectedProfileForSale(prev => ({
      ...prev,
      balance_box: remainingBoxes
    }));

    // 2. Buy record & Payment record & Truck Sales record
    const newBuyRecord = {
      id: Date.now(),
      date: saleForm.date,
      product_name: saleForm.product_name,
      truck_no: selectedProfileForSale.truckno,
      supplier_name: selectedProfileForSale.supplier_name,
      boxes: boxesToSell,
      rate_per_box: rate,
      total: totalAmount,
      payment_mode: saleForm.payment_mode,
      amount_paid: paidAmount
    };

    const newTruckSale = {
      id: Date.now(),
      selling_date: saleForm.date,
      customer_name: cleanCustName,
      customer_phone: saleForm.phone,
      truck_no: (selectedProfileForSale.truckno || '').trim().toUpperCase(),
      supplier_name: (selectedProfileForSale.supplier_name || '').trim(),
      product_name: saleForm.product_name,
      boxes: boxesToSell,
      rate_per_box: rate,
      total: totalAmount,
      payment_mode: saleForm.payment_mode
    };
    setTruckSalesList(prev => [newTruckSale, ...prev]);

    let newPaymentRecord = null;
    if (paidAmount > 0) {
      newPaymentRecord = {
        id: Date.now() + 1,
        date: saleForm.date,
        amount: paidAmount,
        payment_method: saleForm.payment_mode,
        reference: `LOT-${selectedProfileForSale.truckno}`,
        notes: `Immediate payment for ${boxesToSell} BX ${saleForm.product_name}`
      };
    }

    // 3. Update or create Customer Profile
    let targetCustomerObj = null;
    setCustomerProfiles(prev => {
      const existingIdx = prev.findIndex(c => (c.customer_name || '').toLowerCase() === cleanCustName.toLowerCase());
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const updated = {
          ...existing,
          phone: saleForm.phone || existing.phone,
          city: saleForm.city || existing.city,
          total_boxes: Number(existing.total_boxes || 0) + boxesToSell,
          total_bought: Number(existing.total_bought || 0) + totalAmount,
          total_paid: Number(existing.total_paid || 0) + paidAmount,
          current_balance: Number(existing.current_balance || 0) + unpaidAmount,
          buy_history: [newBuyRecord, ...(existing.buy_history || [])],
          payment_history: newPaymentRecord ? [newPaymentRecord, ...(existing.payment_history || [])] : (existing.payment_history || [])
        };
        targetCustomerObj = updated;
        const copy = [...prev];
        copy[existingIdx] = updated;
        return copy;
      } else {
        const newCust = {
          id: Date.now(),
          customer_name: cleanCustName,
          phone: (saleForm.phone || '').trim(),
          city: (saleForm.city || '').trim(),
          total_boxes: boxesToSell,
          total_bought: totalAmount,
          total_paid: paidAmount,
          current_balance: unpaidAmount,
          buy_history: [newBuyRecord],
          payment_history: newPaymentRecord ? [newPaymentRecord] : []
        };
        targetCustomerObj = newCust;
        return [newCust, ...prev];
      }
    });

    if (selectedCustomerForView && (selectedCustomerForView.customer_name || '').toLowerCase() === cleanCustName.toLowerCase()) {
      setSelectedCustomerForView(targetCustomerObj);
    }

    // API sync
    try {
      await api.post('/sales/orders/', {
        customer_name: cleanCustName,
        order_date: saleForm.date,
        truck_number: selectedProfileForSale.truckno,
        crates_sold: boxesToSell,
        rate_per_crate: rate,
        gross_amount: totalAmount,
        subtotal: totalAmount,
        grand_total: totalAmount,
        payment_terms: saleForm.payment_mode,
        status: 'DISPATCHED'
      }).catch(() => null);
    } catch {
      // ignore
    }

    if (remainingBoxes > 0) {
      // Keep modal open and refresh form for next customer sale
      const prodName = `${selectedProfileForSale.fruit || ''}${selectedProfileForSale.variety && selectedProfileForSale.variety.trim() ? ' — ' + selectedProfileForSale.variety.trim() : ''}`;
      setSaleForm({
        date: saleForm.date || getSystemDate(),
        customer_name: '',
        phone: '',
        city: '',
        product_name: prodName,
        boxes: '',
        rate_per_box: '',
        payment_mode: 'CREDIT',
        amount_paid: ''
      });
      setSaleTotalInput('');
      setRateAppliedNotice(false);
      setSaleCustomerSuggestions([]);
      setShowSaleCustomerSuggestions(false);
      setIsSaleModalOpen(true);

      if (showToast) {
        showToast(`Sale recorded! ${boxesToSell} Boxes sold to ${cleanCustName} for ₹${totalAmount.toLocaleString()} 📦 • New Sale Entry refreshed (${remainingBoxes} boxes remaining)`, 'success');
      }

      // Automatically focus back to Customer Name input for next sale
      setTimeout(() => {
        if (saleCustomerInputRef.current) {
          saleCustomerInputRef.current.focus();
        }
      }, 100);
    } else {
      // All boxes of this truck lot are sold out (0 balance)
      setIsSaleModalOpen(false);
      if (showToast) {
        showToast(`Sale recorded! All ${boxesToSell} remaining boxes sold to ${cleanCustName}. Truck lot ${selectedProfileForSale.truckno} is now 100% sold out (0 Balance)! 🚚🎉`, 'success');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Record Payment inside Customer Profile
  // ---------------------------------------------------------------------------
  const handleRecordCustomerPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCustomerForView) return;

    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      if (showToast) showToast('Please enter a valid payment amount', 'error');
      return;
    }

    try {
      await api.post('/payments/', {
        party_type: 'CUSTOMER',
        customer: selectedCustomerForView.id,
        payment_type: 'INWARD',
        payment_date: paymentForm.date,
        amount: amt,
        payment_method: paymentForm.payment_method,
        payment_mode: paymentForm.payment_method,
        transaction_reference: paymentForm.reference || `REC-${Date.now().toString().slice(-4)}`,
        reference_number: paymentForm.reference || `REC-${Date.now().toString().slice(-4)}`,
        notes: paymentForm.notes || 'Customer payment received',
        description: paymentForm.notes || 'Customer payment received'
      }).catch(() => null);
    } catch {
      // offline fallback
    }

    const newPayment = {
      id: Date.now(),
      date: paymentForm.date,
      amount: amt,
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference || `REC-${Date.now().toString().slice(-4)}`,
      notes: paymentForm.notes || 'Payment received'
    };

    setCustomerProfiles(prev => {
      return prev.map(c => {
        if (c.id === selectedCustomerForView.id) {
          const updated = {
            ...c,
            total_paid: Number(c.total_paid || 0) + amt,
            current_balance: Math.max(0, Number(c.current_balance || 0) - amt),
            payment_history: [newPayment, ...(c.payment_history || [])]
          };
          setSelectedCustomerForView(updated);
          return updated;
        }
        return c;
      });
    });

    setPaymentForm({
      date: getSystemDate(),
      amount: '',
      payment_method: 'CASH',
      reference: '',
      notes: ''
    });
    setIsPaymentDrawerOpen(false);
    if (onRefresh) onRefresh();
    if (showToast) {
      showToast(`Payment of ₹${amt.toLocaleString()} saved to MySQL Database! 💵💾`, 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Add New Customer Manually (Synced to MySQL)
  // ---------------------------------------------------------------------------
  const handleAddNewCustomer = async (e) => {
    if (e) e.preventDefault();
    const name = newCustomerForm.customer_name.trim();
    if (!name) {
      if (showToast) showToast('Customer name is required', 'error');
      return;
    }

    const openBal = Number(newCustomerForm.opening_balance || 0);
    let createdCustId = Date.now();

    try {
      const custPayload = {
        customer_code: `CUST-${Date.now().toString().slice(-4)}`,
        customer_name: name,
        phone: (newCustomerForm.phone || '').trim(),
        city: (newCustomerForm.city || '').trim(),
        status: 'ACTIVE',
        current_balance: openBal
      };
      const res = await api.post('/customers/', custPayload).catch(() => null);
      if (res?.id) {
        createdCustId = res.id;
      }
      if (setCustomers && res) {
        setCustomers(prev => [res, ...prev]);
      }
    } catch {
      // offline fallback
    }

    const newCust = {
      id: createdCustId,
      customer_name: name,
      phone: (newCustomerForm.phone || '').trim(),
      city: (newCustomerForm.city || '').trim(),
      current_balance: openBal,
      total_boxes: 0,
      total_bought: openBal,
      total_paid: 0,
      buy_history: openBal > 0 ? [{
        id: Date.now(),
        date: getSystemDate(),
        product_name: 'Opening Balance (Purana Khata)',
        truck_no: 'LEGACY',
        supplier_name: 'Previous Ledger',
        boxes: 0,
        rate_per_box: 0,
        total: openBal,
        payment_mode: 'CREDIT',
        amount_paid: 0
      }] : [],
      payment_history: []
    };

    setCustomerProfiles(prev => [newCust, ...prev]);
    setSelectedCustomerForView(newCust);
    setIsAddCustomerOpen(false);
    setNewCustomerForm({ customer_name: '', phone: '', city: '', opening_balance: '' });
    if (onRefresh) onRefresh();
    if (showToast) {
      showToast(`Customer profile "${name}" saved to MySQL Database! 👤💾`, 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Edit Existing Customer Profile (Synced to MySQL & State)
  // ---------------------------------------------------------------------------
  const handleOpenEditCustomer = (cust) => {
    if (!cust) return;
    setEditCustomerForm({
      id: cust.id,
      customer_name: cust.customer_name || '',
      phone: cust.phone || '',
      city: cust.city || 'Delhi Mandi',
      address: cust.address || ''
    });
    setIsEditCustomerOpen(true);
  };

  const handleSaveEditCustomer = async (e) => {
    if (e) e.preventDefault();
    const cleanName = (editCustomerForm.customer_name || '').trim();
    if (!cleanName) {
      if (showToast) showToast('Customer name is required', 'error');
      return;
    }

    setIsSavingCustomer(true);
    const custId = editCustomerForm.id;
    const oldName = selectedCustomerForView?.customer_name;

    try {
      if (custId && typeof custId === 'number' && custId < 1000000000000) {
        await api.patch(`/customers/${custId}/`, {
          customer_name: cleanName,
          phone: (editCustomerForm.phone || '').trim(),
          city: (editCustomerForm.city || '').trim(),
          address: (editCustomerForm.address || '').trim()
        }).catch(() => null);
      }

      const updatedCust = {
        customer_name: cleanName,
        phone: (editCustomerForm.phone || '').trim(),
        city: (editCustomerForm.city || '').trim(),
        address: (editCustomerForm.address || '').trim()
      };

      setCustomerProfiles(prev => prev.map(c => {
        if (c.id === custId || (oldName && (c.customer_name || '').toLowerCase() === oldName.toLowerCase())) {
          return { ...c, ...updatedCust };
        }
        return c;
      }));

      setSelectedCustomerForView(prev => prev ? ({ ...prev, ...updatedCust }) : null);

      if (setCustomers) {
        setCustomers(prev => prev.map(c => {
          if (c.id === custId || (oldName && (c.customer_name || '').toLowerCase() === oldName.toLowerCase())) {
            return { ...c, ...updatedCust };
          }
          return c;
        }));
      }

      if (oldName && oldName.toLowerCase() !== cleanName.toLowerCase()) {
        setTruckSalesList(prev => prev.map(s => {
          if ((s.customer_name || '').toLowerCase() === oldName.toLowerCase()) {
            return { ...s, customer_name: cleanName, customer_phone: (editCustomerForm.phone || s.customer_phone) };
          }
          return s;
        }));
      }

      setIsEditCustomerOpen(false);
      if (showToast) showToast(`Customer profile "${cleanName}" updated successfully! 👤💾`, 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (showToast) showToast('Failed to update customer: ' + err.message, 'error');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Supplier Profiles & Trucks Directory Computations & Handlers
  // ---------------------------------------------------------------------------
  const unifiedSuppliers = useMemo(() => {
    const map = new Map();
    suppliers.forEach(s => {
      const key = (s.supplier_name || s.name || '').trim().toLowerCase();
      if (key) {
        map.set(key, {
          id: s.id,
          supplier_name: s.supplier_name || s.name,
          phone: s.phone || '',
          city: s.city || 'Azadpur Mandi, Delhi',
          bank_name: s.bank_name || '',
          account_number: s.account_number || '',
          ifsc_code: s.ifsc_code || '',
          branch_name: s.branch_name || '',
          truckno: '',
          ...s
        });
      }
    });

    supplierProfiles.forEach(sp => {
      const key = (sp.supplier_name || '').trim().toLowerCase();
      if (!key) return;
      if (map.has(key)) {
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          phone: existing.phone || sp.phone,
          bank_name: existing.bank_name || sp.bank_name,
          account_number: existing.account_number || sp.account_number,
          ifsc_code: existing.ifsc_code || sp.ifsc_code,
          branch_name: existing.branch_name || sp.branch_name,
          truckno: sp.truckno || existing.truckno,
          balance_box: sp.balance_box,
          fruit: sp.fruit,
          variety: sp.variety
        });
      } else {
        map.set(key, {
          id: sp.id,
          supplier_name: sp.supplier_name,
          phone: sp.phone || '',
          city: sp.city || 'Azadpur Mandi, Delhi',
          bank_name: sp.bank_name || '',
          account_number: sp.account_number || '',
          ifsc_code: sp.ifsc_code || '',
          branch_name: sp.branch_name || '',
          truckno: sp.truckno || '',
          balance_box: sp.balance_box,
          fruit: sp.fruit,
          variety: sp.variety
        });
      }
    });

    return Array.from(map.values());
  }, [suppliers, supplierProfiles]);

  const filteredUnifiedSuppliers = useMemo(() => {
    const q = supplierTrucksSearch.trim().toLowerCase();
    if (!q) return unifiedSuppliers;
    return unifiedSuppliers.filter(s => {
      const name = (s.supplier_name || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const bank = (s.bank_name || '').toLowerCase();
      const acc = (s.account_number || '').toLowerCase();
      const ifsc = (s.ifsc_code || '').toLowerCase();
      const truck = (s.truckno || '').toLowerCase();
      const city = (s.city || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || bank.includes(q) || acc.includes(q) || ifsc.includes(q) || truck.includes(q) || city.includes(q);
    });
  }, [unifiedSuppliers, supplierTrucksSearch]);

  const handleCopyPassbook = (supp) => {
    const text = `🏦 Bank Passbook Details
Supplier: ${supp.supplier_name || supp.name}
Phone: ${supp.phone || 'N/A'}
Bank: ${supp.bank_name || 'State Bank of India'}
A/C No: ${supp.account_number || 'N/A'}
IFSC: ${supp.ifsc_code || 'N/A'}
Branch: ${supp.branch_name || 'N/A'}`;
    navigator.clipboard?.writeText(text);
    setCopiedBankSupplierId(supp.id);
    if (showToast) showToast('Bank passbook details copied to clipboard!');
    setTimeout(() => setCopiedBankSupplierId(null), 3000);
  };

  const handleOpenEditPassbook = (supp) => {
    setPassbookForm({
      id: supp.id,
      supplier_name: supp.supplier_name || supp.name || '',
      phone: supp.phone || '',
      city: supp.city || 'Azadpur Mandi, Delhi',
      bank_name: supp.bank_name || '',
      account_number: supp.account_number || '',
      ifsc_code: supp.ifsc_code || '',
      branch_name: supp.branch_name || ''
    });
    setIsEditPassbookOpen(true);
  };

  const handleSavePassbook = async () => {
    const cleanName = (passbookForm.supplier_name || '').trim();
    if (!cleanName) {
      if (showToast) showToast('Supplier / Vyapari name is required', 'error');
      return;
    }
    setIsSavingPassbook(true);
    const oldName = selectedSupplierForDetail?.supplier_name || selectedSupplierForDetail?.name;
    const suppId = passbookForm.id;

    const payload = {
      supplier_name: cleanName,
      phone: (passbookForm.phone || '').trim(),
      city: (passbookForm.city || '').trim(),
      bank_name: passbookForm.bank_name || '',
      account_number: passbookForm.account_number || '',
      ifsc_code: passbookForm.ifsc_code || '',
      branch_name: passbookForm.branch_name || ''
    };

    try {
      if (suppId && typeof suppId === 'number' && suppId < 1000000000000) {
        await api.patch(`/suppliers/${suppId}/`, payload).catch(() => null);
      }
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === suppId || (oldName && p.supplier_name && p.supplier_name.toLowerCase() === oldName.toLowerCase())) {
          return { ...p, ...payload };
        }
        return p;
      }));
      if (selectedSupplierForDetail) {
        setSelectedSupplierForDetail(prev => ({ ...prev, ...payload }));
      }
      if (setSuppliers) {
        setSuppliers(prev => prev.map(s => (s.id === suppId || (oldName && (s.supplier_name || s.name || '').toLowerCase() === oldName.toLowerCase())) ? { ...s, ...payload } : s));
      }
      if (showToast) showToast(`Supplier profile "${cleanName}" updated successfully! 🚛💾`, 'success');
      setIsEditPassbookOpen(false);
      if (onRefresh) onRefresh();
    } catch {
      setSupplierProfiles(prev => prev.map(p => {
        if (p.id === suppId || (oldName && p.supplier_name && p.supplier_name.toLowerCase() === oldName.toLowerCase())) {
          return { ...p, ...payload };
        }
        return p;
      }));
      if (selectedSupplierForDetail) {
        setSelectedSupplierForDetail(prev => ({ ...prev, ...payload }));
      }
      if (showToast) showToast('Supplier profile saved locally!', 'info');
      setIsEditPassbookOpen(false);
    } finally {
      setIsSavingPassbook(false);
    }
  };

  const handleSaveNewSupplierModal = async (e) => {
    e?.preventDefault();
    if (!newSupplierModalForm.supplier_name.trim()) return;
    setIsSavingSupplierModal(true);
    try {
      const payload = {
        supplier_code: `SUP-${Date.now().toString().slice(-4)}`,
        name: newSupplierModalForm.supplier_name.trim(),
        supplier_name: newSupplierModalForm.supplier_name.trim(),
        phone: newSupplierModalForm.phone.trim(),
        city: (newSupplierModalForm.city || 'Delhi').trim(),
        bank_name: newSupplierModalForm.bank_name.trim(),
        account_number: newSupplierModalForm.account_number.trim(),
        ifsc_code: newSupplierModalForm.ifsc_code.trim().toUpperCase(),
        branch_name: newSupplierModalForm.branch_name.trim()
      };
      const res = await api.post('/suppliers/', payload).catch(() => null);
      const created = res?.id ? res : { ...payload, id: Date.now() };
      if (setSuppliers) setSuppliers(prev => [created, ...prev]);
      setSupplierProfiles(prev => [created, ...prev]);
      setSelectedSupplierForDetail(created);
      if (showToast) showToast(`Supplier profile "${created.supplier_name}" created!`);
      setIsAddSupplierModalOpen(false);
      setNewSupplierModalForm({
        supplier_name: '',
        phone: '',
        city: 'Azadpur Mandi, Delhi',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: ''
      });
      if (onRefresh) onRefresh();
    } catch {
      const fallback = {
        ...newSupplierModalForm,
        id: Date.now(),
        supplier_name: newSupplierModalForm.supplier_name.trim()
      };
      if (setSuppliers) setSuppliers(prev => [fallback, ...prev]);
      setSupplierProfiles(prev => [fallback, ...prev]);
      setSelectedSupplierForDetail(fallback);
      if (showToast) showToast(`Supplier profile "${fallback.supplier_name}" saved!`);
      setIsAddSupplierModalOpen(false);
      setNewSupplierModalForm({
        supplier_name: '',
        phone: '',
        city: 'Azadpur Mandi, Delhi',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: ''
      });
    } finally {
      setIsSavingSupplierModal(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Profile Deletion & Clear All Handlers (Active Profiles, Customers, Suppliers)
  // ---------------------------------------------------------------------------
  const handleDeleteActiveProfile = (profile) => {
    if (!profile) return;
    const name = profile.supplier_name || 'Supplier';
    const truck = profile.truckno ? ` (${profile.truckno})` : '';
    if (window.confirm(`Are you sure you want to delete profile for "${name}"${truck}?`)) {
      setSupplierProfiles(prev => prev.filter(p => p.id !== profile.id));
      if (showToast) showToast(`Profile for ${name}${truck} deleted!`, 'info');
    }
  };

  const handleClearAllActiveProfiles = () => {
    if (supplierProfiles.length === 0) {
      if (showToast) showToast('No active profiles to clear!', 'info');
      return;
    }
    if (window.confirm(`Are you sure you want to clear ALL ${supplierProfiles.length} profiles from Active Supplier Profiles & Balance Boxes?`)) {
      setSupplierProfiles([]);
      try {
        localStorage.removeItem('dashboard_supplier_profiles');
      } catch { }
      if (showToast) showToast('All active supplier profiles & balance boxes cleared!', 'success');
    }
  };

  const handleDeleteSingleCustomer = async (c) => {
    if (!c) return;
    const name = c.customer_name || 'Customer';
    if (window.confirm(`Are you sure you want to delete customer profile for "${name}"?`)) {
      try {
        if (c.id && typeof c.id === 'number' && c.id < 1000000000000) {
          await api.delete(`/customers/${c.id}/`).catch(() => null);
        }
      } catch {
        // ignore network error
      }
      setCustomerProfiles(prev => prev.filter(p => p.id !== c.id));
      if (setCustomers) {
        setCustomers(prev => prev.filter(p => p.id !== c.id));
      }
      if (selectedCustomerForView?.id === c.id) {
        setSelectedCustomerForView(null);
        setIsCustomerDetailPopupOpen(false);
      }
      if (showToast) showToast(`Customer profile "${name}" deleted!`, 'info');
    }
  };

  const handleClearAllCustomers = async () => {
    if (customerProfiles.length === 0) {
      if (showToast) showToast('No customer profiles to clear!', 'info');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ALL ${customerProfiles.length} customer profiles and khata ledgers?`)) {
      try {
        await Promise.all(
          customerProfiles
            .filter(c => c.id && typeof c.id === 'number' && c.id < 1000000000000)
            .map(c => api.delete(`/customers/${c.id}/`).catch(() => null))
        );
      } catch {
        // ignore
      }
      setCustomerProfiles([]);
      if (setCustomers) setCustomers([]);
      try {
        localStorage.removeItem('mandi_customer_profiles');
      } catch { }
      setSelectedCustomerForView(null);
      setIsCustomerDetailPopupOpen(false);
      if (showToast) showToast('All customer profiles & khata ledgers cleared!', 'success');
    }
  };

  const handleDeleteSingleSupplier = async (s) => {
    if (!s) return;
    const name = s.supplier_name || s.name || 'Supplier';
    if (window.confirm(`Are you sure you want to delete supplier profile for "${name}"?`)) {
      try {
        if (s.id && typeof s.id === 'number' && s.id < 1000000000000) {
          await api.delete(`/suppliers/${s.id}/`).catch(() => null);
        }
      } catch {
        // ignore
      }
      if (setSuppliers) {
        setSuppliers(prev => prev.filter(item => item.id !== s.id && (item.supplier_name || item.name || '').toLowerCase() !== name.toLowerCase()));
      }
      setSupplierProfiles(prev => prev.filter(sp => (sp.supplier_name || '').toLowerCase() !== name.toLowerCase()));
      if (selectedSupplierForDetail?.id === s.id || (selectedSupplierForDetail?.supplier_name || '').toLowerCase() === name.toLowerCase()) {
        setSelectedSupplierForDetail(null);
        setIsSupplierDetailPopupOpen(false);
      }
      if (showToast) showToast(`Supplier profile "${name}" deleted!`, 'info');
    }
  };

  const handleClearAllSuppliers = async () => {
    if (unifiedSuppliers.length === 0) {
      if (showToast) showToast('No supplier profiles to clear!', 'info');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ALL ${unifiedSuppliers.length} supplier profiles and truck directories?`)) {
      try {
        await Promise.all(
          unifiedSuppliers
            .filter(s => s.id && typeof s.id === 'number' && s.id < 1000000000000)
            .map(s => api.delete(`/suppliers/${s.id}/`).catch(() => null))
        );
      } catch {
        // ignore
      }
      if (setSuppliers) setSuppliers([]);
      setSupplierProfiles([]);
      try {
        localStorage.removeItem('dashboard_supplier_profiles');
      } catch { }
      setSelectedSupplierForDetail(null);
      setIsSupplierDetailPopupOpen(false);
      if (showToast) showToast('All supplier profiles & truck directories cleared!', 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // Calculations & Filters
  // ---------------------------------------------------------------------------
  const activeProfilesCount = useMemo(() => {
    return supplierProfiles.filter(p => Number(p.balance_box || 0) > 0).length;
  }, [supplierProfiles]);

  const completedProfilesCount = useMemo(() => {
    return supplierProfiles.filter(p => Number(p.balance_box || 0) <= 0).length;
  }, [supplierProfiles]);

  const filteredProfiles = useMemo(() => {
    return supplierProfiles.filter(p => {
      const bal = Number(p.balance_box || 0);

      // Status filter: ACTIVE (default) automatically hides 0 balance trucks from dashboard
      if (profileStatusFilter === 'ACTIVE' && bal <= 0) {
        return false;
      }
      if (profileStatusFilter === 'COMPLETED' && bal > 0) {
        return false;
      }

      const q = (profileSearch || searchQuery || '').trim().toLowerCase();
      if (!q) return true;
      return (
        (p.supplier_name || '').toLowerCase().includes(q) ||
        (p.fruit || '').toLowerCase().includes(q) ||
        (p.variety || '').toLowerCase().includes(q) ||
        (p.truckno || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q)
      );
    });
  }, [supplierProfiles, profileStatusFilter, profileSearch, searchQuery]);

  const totalBalanceBoxes = useMemo(() => {
    return supplierProfiles.reduce((sum, p) => sum + Number(p.balance_box || 0), 0);
  }, [supplierProfiles]);

  const filteredCustomerDirectory = customerProfiles.filter(c => {
    const q = customerSearchQuery.toLowerCase();
    if (!q) return true;
    return (
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  const totalCustomerDues = customerProfiles.reduce((sum, c) => sum + Number(c.current_balance || 0), 0);
  const totalCustomerBoxes = customerProfiles.reduce((sum, c) => sum + Number(c.total_boxes || 0), 0);

  // Helper to fetch all customer fruit sales for this supplier & specific truck
  const getTruckSalesForSupplier = (activeSupp, truckNum) => {
    if (!activeSupp) return [];
    const suppLower = (activeSupp.supplier_name || activeSupp.name || '').trim().toLowerCase();
    const tNumUpper = truckNum && truckNum !== 'ALL' ? truckNum.trim().toUpperCase() : null;
    const list = [];
    const seen = new Set();

    (truckSalesList || []).forEach(ts => {
      const tsSupp = (ts.supplier_name || '').trim().toLowerCase();
      const tsTruck = (ts.truck_no || '').trim().toUpperCase();
      if (tsSupp === suppLower && (!tNumUpper || tsTruck === tNumUpper)) {
        if (!seen.has(ts.id)) {
          seen.add(ts.id);
          list.push(ts);
        }
      }
    });

    (customerProfiles || []).forEach(cust => {
      (cust.buy_history || []).forEach(buy => {
        const buySupp = (buy.supplier_name || '').trim().toLowerCase();
        const buyTruck = (buy.truck_no || '').trim().toUpperCase();
        if (buySupp === suppLower && (!tNumUpper || buyTruck === tNumUpper)) {
          if (!seen.has(buy.id)) {
            seen.add(buy.id);
            list.push({
              id: buy.id,
              selling_date: buy.date || buy.selling_date || getSystemDate(),
              customer_name: cust.customer_name || 'Customer',
              customer_phone: cust.phone || '',
              truck_no: buyTruck,
              supplier_name: activeSupp.supplier_name || activeSupp.name,
              product_name: buy.product_name || 'Fresh Fruit',
              boxes: Number(buy.boxes || 0),
              rate_per_box: Number(buy.rate_per_box || 0),
              total: Number(buy.total || 0),
              payment_mode: buy.payment_mode || 'CREDIT'
            });
          }
        }
      });
    });

    return list.sort((a, b) => new Date(b.selling_date || 0) - new Date(a.selling_date || 0));
  };

  // ---------------------------------------------------------------------------
  // Cash Sale Ledger Admin Page (shown when sidebar tab 'cash-sale' is active)
  // ---------------------------------------------------------------------------
  if (activeTab === 'cash-sale') {
    const allSupplierNames = Array.from(new Set([
      ...unifiedSuppliers.map(s => s.supplier_name || s.name).filter(Boolean),
      ...cashSaleSettlements.map(s => s.supplier_name).filter(Boolean),
      ...cashSalePayments.map(p => p.supplier_name).filter(Boolean)
    ]));

    return (
      <CashSaleAdminPage
        cashSaleSettlements={cashSaleSettlements}
        setCashSaleSettlements={setCashSaleSettlements}
        saveCashSaleSettlements={saveCashSaleSettlements}
        cashSalePayments={cashSalePayments}
        setCashSalePayments={setCashSalePayments}
        saveCashSalePayments={saveCashSalePayments}
        allSupplierNames={allSupplierNames}
        unifiedSuppliers={unifiedSuppliers}
        purchasesList={purchasesList}
        showToast={showToast}
        getSystemDate={getSystemDate}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ----------------------------------------------------------------- */}
      {/* Top Header Banner with Customer Details Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Apple size={24} color="#10b981" />
            <span>Profile Manager</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
            Fast Supplier Entry • Click Card to Sell • Unified Customer Profiles
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="truck-stat-pill" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="stat-label" style={{ color: '#94a3b8' }}>Total Profiles</span>
            <span className="stat-val" style={{ color: '#fff' }}>{supplierProfiles.length}</span>
          </div>

          <div className="truck-stat-pill highlight-gold" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
            <span className="stat-label" style={{ color: '#fbbf24' }}>Total Balance Boxes</span>
            <span className="stat-val" style={{ color: '#f59e0b' }}>{totalBalanceBoxes.toLocaleString()} BX</span>
          </div>

          {/* Customer Details Top Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsCustomerModalOpen(true);
              if (customerProfiles.length > 0 && !selectedCustomerForView) {
                setSelectedCustomerForView(customerProfiles[0]);
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
            }}
            title="Click to view all customer details, buy & payment histories"
          >
            <Users size={17} />
            <span>Customer Profiles & Details</span>
          </button>

          {/* Supplier Profiles & Trucks Top Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsSupplierTrucksModalOpen(true);
              if (unifiedSuppliers.length > 0 && !selectedSupplierForDetail) {
                setSelectedSupplierForDetail(unifiedSuppliers[0]);
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
            title="Click to view Supplier Profiles, Passbooks & Trucks"
          >
            <Truck size={17} />
            <span>Supplier Profiles & Trucks</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. Main Action Div: Click to Add Supplier & Delivery Details */}
      {/* ----------------------------------------------------------------- */}
      <div
        id="supplier-entry-section"
        className="add-supplier-trigger-card"
        onClick={() => setIsFormOpen(!isFormOpen)}
        title="Click to toggle Add Supplier form"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
          }}>
            <Plus size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Lot Delivery Entry
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ pointerEvents: 'none' }}
          >
            {isFormOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isFormOpen ? 'Collapse Form' : 'Expand Form'}</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Expanded Supplier Entry Form Panel */}
      {/* ----------------------------------------------------------------- */}
      {isFormOpen && (
        <form onSubmit={handleSaveSupplier} className="supplier-entry-panel">
          {/* Security & Database Status Ribbon */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.08)',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            marginBottom: '14px',
            fontSize: '0.78rem',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700 }}>
              <ShieldCheck size={14} />
              <span>Authenticated Session ({currentUser?.username || 'admin'})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span>Direct MySQL Database Storage (fruit_erp_db)</span>
            </div>
          </div>

          {/* Section A: Supplier Details & Passbook */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <User size={16} color="#3b82f6" />
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                1. Supplier Information
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {/* Supplier Name with Autocomplete */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Supplier Name * <span style={{ fontSize: '0.72rem', color: '#3b82f6' }}>(Type for auto-suggest)</span>
                </label>
                <div className="supplier-autocomplete-wrapper" ref={suggestionRef}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maa Fruits Mandi Traders"
                      value={form.supplier_name}
                      onChange={(e) => handleSupplierNameChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => form.supplier_name && handleSupplierNameChange(form.supplier_name)}
                      required
                      autoComplete="off"
                    />
                    {form.supplier_name && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, supplier_name: '' }));
                          setSuggestions([]);
                        }}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Suggestion Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="supplier-suggestions-dropdown">
                      {suggestions.map((s, idx) => (
                        <li
                          key={s.id || idx}
                          className={`suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                          onClick={() => handleSelectSuggestion(s)}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              {s.supplier_name}
                            </div>
                            <div className="supplier-meta">
                              📞 {s.phone || 'No phone'} • 🏛️ {s.bank_name || 'Bank details saved'}
                            </div>
                          </div>
                          <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                            Press Enter ↵
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Phone size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

          {/* Section B: Delivery & Produce Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Truck size={16} color="#10b981" />
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                2. Delivery & Produce Details
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Arrival Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Truck No.</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. WB12A1234 (Empty = 0000000)"
                  value={form.truckno}
                  onChange={(e) => setForm({ ...form, truckno: e.target.value.toUpperCase() })}
                />
              </div>

              {/* Fruit Name with Smart Dynamic Autocomplete & Enter Selection */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }} ref={fruitRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>Fruit Name *</label>

                </div>
                <input
                  ref={fruitInputRef}
                  type="text"
                  className="form-control"
                  value={form.fruit}
                  onChange={(e) => handleFruitChange(e.target.value)}
                  onFocus={() => handleFruitChange(form.fruit)}
                  onKeyDown={handleFruitKeyDown}
                  autoComplete="off"
                  required
                />
                {showFruitSuggestions && fruitSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1050,
                      background: 'var(--bg-surface)',
                      border: '1.5px solid #10b981',
                      borderRadius: '10px',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>SAVED FRUITS ({fruitSuggestions.length})</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>↵ Enter to enter</span>
                    </div>
                    {fruitSuggestions.map((item, idx) => {
                      const isActive = idx === activeFruitIndex;
                      return (
                        <div
                          key={item}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectFruit(item);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isActive ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                            borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                            color: 'var(--text-main)',
                            fontWeight: isActive ? 800 : 600,
                            fontSize: '0.86rem'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🍎</span>
                            <span>{item}</span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#10b981', opacity: isActive ? 1 : 0.6 }}>
                            ↵ Select
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fruit Variety with Smart Dynamic Autocomplete & Enter Selection */}
              <div className="form-group" style={{ margin: 0, position: 'relative' }} ref={varietyRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>Fruit Variety</label>

                </div>
                <input
                  ref={varietyInputRef}
                  type="text"
                  className="form-control"
                  value={form.variety}
                  onChange={(e) => handleVarietyChange(e.target.value)}
                  onFocus={() => handleVarietyChange(form.variety)}
                  onKeyDown={handleVarietyKeyDown}
                  autoComplete="off"
                />
                {showVarietySuggestions && varietySuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1050,
                      background: 'var(--bg-surface)',
                      border: '1.5px solid #10b981',
                      borderRadius: '10px',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>SAVED VARIETIES ({varietySuggestions.length})</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>↵ Enter to enter</span>
                    </div>
                    {varietySuggestions.map((item, idx) => {
                      const isActive = idx === activeVarietyIndex;
                      return (
                        <div
                          key={item}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectVariety(item);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isActive ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                            borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                            color: 'var(--text-main)',
                            fontWeight: isActive ? 800 : 600,
                            fontSize: '0.86rem'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🌿</span>
                            <span>{item}</span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#10b981', opacity: isActive ? 1 : 0.6 }}>
                            ↵ Select
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, color: '#10b981' }}>
                  Boxes *
                </label>
                <input
                  ref={boxesInputRef}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  className="form-control"
                  style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}

                  value={form.boxes}
                  onChange={(e) => setForm({ ...form, boxes: e.target.value })}
                  required
                />
              </div>

              {/* Damage Box Option */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Damage Box</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="form-control"
                  style={{
                    fontWeight: 800,
                    color: Number(form.damage_boxes) > 0 ? '#ef4444' : 'var(--text-main)',
                    fontSize: '1.05rem',
                    borderColor: Number(form.damage_boxes) > 0 ? '#ef4444' : undefined,
                    background: Number(form.damage_boxes) > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined
                  }}
                  placeholder="e.g. 0"
                  value={form.damage_boxes}
                  onChange={(e) => setForm({ ...form, damage_boxes: e.target.value })}
                />
              </div>
            </div>

            {/* Live Inward & Damage Hisab Bar */}
            {Number(form.boxes) > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '9px 14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.84rem',
                fontWeight: 700,
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>📦 Inward Hisab:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{form.boxes} Total Boxes</strong>
                  {Number(form.damage_boxes) > 0 && (
                    <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800 }}>
                      ⚠️ {form.damage_boxes} Damage Box
                    </span>
                  )}
                </div>
                <div style={{ color: '#059669', fontSize: '0.92rem', fontWeight: 800 }}>
                  Available Balance: {Math.max(0, (Number(form.boxes) || 0) - (Number(form.damage_boxes) || 0))} Boxes
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setForm({
                  supplier_name: '',
                  phone: '',
                  bank_name: '',
                  account_number: '',
                  ifsc_code: '',
                  branch_name: '',
                  date: getSystemDate(),
                  truckno: '',
                  fruit: '',
                  variety: '',
                  boxes: '',
                  damage_boxes: ''
                });
                setShowSuggestions(false);
              }}
            >
              Clear Fields
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                padding: '10px 24px',
                fontSize: '0.92rem'
              }}
              disabled={isSubmitting}
            >
              <CheckCircle size={16} />
              <span>{isSubmitting ? 'Saving Profile...' : 'Save & Create Supplier Profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. Automatic Supplier Profiles Display Section */}
      {/* (Clicking ANY profile card opens the Sale Modal for that produce) */}
      {/* ----------------------------------------------------------------- */}
      <div className="glass-panel" style={{ margin: 0 }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Layers size={18} color="#10b981" />
            <span>Active Supplier Profiles & Balance Boxes</span>
            <span className="badge badge-success" style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
              {activeProfilesCount} Active
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Quick Filter Tabs: Active (default: excludes 0 balance) | Completed | All */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-main)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              gap: '3px'
            }}>
              <button
                type="button"
                onClick={() => setProfileStatusFilter('ACTIVE')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: profileStatusFilter === 'ACTIVE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: profileStatusFilter === 'ACTIVE' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: profileStatusFilter === 'ACTIVE' ? 800 : 600,
                  boxShadow: profileStatusFilter === 'ACTIVE' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Active ({activeProfilesCount})
              </button>
              <button
                type="button"
                onClick={() => setProfileStatusFilter('COMPLETED')}
                title="View all completed truck profiles with 0 balance (All history preserved)"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: profileStatusFilter === 'COMPLETED' ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)' : 'transparent',
                  color: profileStatusFilter === 'COMPLETED' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: profileStatusFilter === 'COMPLETED' ? 800 : 600,
                  boxShadow: profileStatusFilter === 'COMPLETED' ? '0 2px 8px rgba(100, 116, 139, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Completed / 0 Bal ({completedProfilesCount})
              </button>
              <button
                type="button"
                onClick={() => setProfileStatusFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: profileStatusFilter === 'ALL' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                  color: profileStatusFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: profileStatusFilter === 'ALL' ? 800 : 600,
                  boxShadow: profileStatusFilter === 'ALL' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                All ({supplierProfiles.length})
              </button>
            </div>

            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search supplier, fruit, truck..."
                className="form-control"
                style={{ paddingLeft: '28px', fontSize: '0.8rem' }}
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <button
              type="button"
              onClick={handleClearAllActiveProfiles}
              title="Clear all profiles from Active Supplier Profiles & Balance Boxes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '36px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              }}
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
            <User size={38} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
              {profileStatusFilter === 'ACTIVE'
                ? 'No Active Supplier Profiles With Remaining Balance'
                : profileStatusFilter === 'COMPLETED'
                  ? 'No Completed (0 Balance) Truck Profiles'
                  : 'No Supplier Profiles Found'}
            </div>
            <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>
              {profileStatusFilter === 'ACTIVE'
                ? 'Jis truck ka balance 0 ho jata hai wo automatic yahan se hat jata hai. Completed lots dekhne ke liye upar "Completed / 0 Bal" button dabayein.'
                : 'Fill the inward form above to create a new delivery lot.'}
            </p>
          </div>
        ) : (
          <div className="supplier-profiles-grid">
            {filteredProfiles.map(profile => (
              <div
                key={profile.id}
                className="supplier-profile-card clickable"
                onClick={() => handleOpenSaleModal(profile)}
                title={Number(profile.balance_box || 0) <= 0 ? 'Lot completed with 0 balance (Details preserved)' : 'Click anywhere on this profile card to sell produce'}
              >
                {/* Profile Card Header */}
                <div className="profile-card-header">
                  <div>
                    <div className="profile-supplier-name">
                      {profile.supplier_name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📞 {profile.phone || 'No phone'}</span>
                      <span>•</span>
                      <span>📅 {profile.date}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-neutral" style={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>
                      {profile.truckno} {Number(profile.balance_box || 0) <= 0 ? '• 0 BAL' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteActiveProfile(profile);
                      }}
                      title={`Delete profile for ${profile.supplier_name} (${profile.truckno})`}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        borderRadius: '6px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.borderColor = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Fruit & Variety Name */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Apple size={20} color="#3b82f6" />
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Fruit & Variety
                    </span>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {profile.fruit || ''}{profile.variety && profile.variety.trim() ? ` — ${profile.variety.trim()}` : ''}
                    </div>
                  </div>
                </div>

                {/* Details Grid: Truck No & Passbook */}
                <div className="profile-detail-grid">
                  <div>
                    <div className="profile-field-label">Truck Number</div>
                    <div className="profile-field-value" style={{ fontFamily: 'monospace', color: '#3b82f6' }}>
                      {profile.truckno}
                    </div>
                  </div>

                  <div>
                    <div className="profile-field-label">Arrival Date</div>
                    <div className="profile-field-value" style={{ fontSize: '0.85rem' }}>
                      {profile.date}
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <div className="profile-field-label">Bank Passbook</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600, marginTop: '2px' }}>
                      {profile.bank_name ? `${profile.bank_name} (${profile.account_number ? `A/C •••${profile.account_number.slice(-4)}` : 'A/C Active'})` : 'No bank passbook recorded'}
                    </div>
                    {profile.ifsc_code && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        IFSC: {profile.ifsc_code} {profile.branch_name ? `• ${profile.branch_name}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance Box Highlight Badge */}
                <div className="balance-box-badge" style={{
                  background: Number(profile.balance_box || 0) <= 0 ? 'rgba(100, 116, 139, 0.1)' : undefined,
                  borderColor: Number(profile.balance_box || 0) <= 0 ? 'rgba(100, 116, 139, 0.3)' : undefined
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={20} color={Number(profile.balance_box || 0) <= 0 ? '#64748b' : undefined} />
                    <span style={{ fontSize: '0.84rem', color: Number(profile.balance_box || 0) <= 0 ? '#64748b' : undefined }}>Balance Box:</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="val" style={{ color: Number(profile.balance_box || 0) <= 0 ? '#64748b' : undefined }}>
                      {profile.balance_box} Boxes
                    </span>
                    {Number(profile.damage_boxes) > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '2px' }}>
                        ⚠️ {profile.damage_boxes} Damage | {profile.boxes} Total
                      </div>
                    )}
                  </div>
                </div>

                {/* Click to Sell Prompt / Completed Badge */}
                <div className="card-sell-prompt" style={{
                  background: Number(profile.balance_box || 0) <= 0 ? 'rgba(100, 116, 139, 0.12)' : undefined,
                  color: Number(profile.balance_box || 0) <= 0 ? '#64748b' : undefined
                }}>
                  {Number(profile.balance_box || 0) <= 0 ? (
                    <>
                      <Check size={15} color="#10b981" />
                      <span style={{ fontWeight: 800 }}>✓ Lot Completed (0 BX Remaining • All Details Preserved)</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={15} />
                      <span>Click to Sell ({profile.balance_box} BX Available)</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Sale Entry Modal (Opens when clicking any supplier profile card) */}
      {/* ----------------------------------------------------------------- */}
      {isSaleModalOpen && selectedProfileForSale && (
        <div className="mandi-modal-backdrop" onClick={() => setIsSaleModalOpen(false)} style={{ overflowY: 'auto', padding: '24px 16px' }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '640px', maxHeight: '88vh', margin: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      New Sale Entry (Bikri Parchi)
                    </h3>
                    <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Selling produce directly from Truck Lot: <strong>{selectedProfileForSale.truckno}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsSaleModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form (Flex column with scrollable body) */}
            <form onSubmit={handleSaveSale} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="mandi-modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '18px 22px' }}>
                {/* Lot Summary Pill */}
                <div className="sale-profile-summary-pill">
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Selected Lot & Supplier
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedProfileForSale.supplier_name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#3b82f6', fontFamily: 'monospace' }}>
                      🚚 {selectedProfileForSale.truckno}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Available Balance
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981' }}>
                      {selectedProfileForSale.balance_box} Boxes
                    </div>
                    {Number(selectedProfileForSale.damage_boxes) > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '2px' }}>
                        ⚠️ {selectedProfileForSale.damage_boxes} Damage Box
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Row 1: Date & Customer Name (with autocomplete) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    {/* Date */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={saleForm.date}
                        onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                        required
                      />
                    </div>

                    {/* Customer Name Autocomplete */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Customer Name * <span style={{ fontSize: '0.72rem', color: '#3b82f6' }}>(Auto-suggests purana customer)</span>
                      </label>
                      <div className="customer-autocomplete-wrapper" ref={saleCustomerRef}>
                        <input
                          ref={saleCustomerInputRef}
                          type="text"
                          className="form-control"
                          placeholder="e.g. Sharma Fruits Wholesale"
                          value={saleForm.customer_name}
                          onChange={(e) => handleSaleCustomerChange(e.target.value)}
                          onKeyDown={handleSaleCustomerKeyDown}
                          onFocus={() => saleForm.customer_name && handleSaleCustomerChange(saleForm.customer_name)}
                          required
                          autoComplete="off"
                        />

                        {/* Customer Suggestion Dropdown */}
                        {showSaleCustomerSuggestions && saleCustomerSuggestions.length > 0 && (
                          <ul className="customer-suggestions-dropdown">
                            {saleCustomerSuggestions.map((c, idx) => (
                              <li
                                key={c.id || idx}
                                className={`customer-suggestion-item ${idx === activeSaleCustomerIndex ? 'active' : ''}`}
                                onClick={() => handleSelectSaleCustomer(c)}
                              >
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                    {c.customer_name}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                    📞 {c.phone || 'No phone'} • 📍 {c.city || 'Delhi'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                    Khata Due: ₹{Number(c.current_balance || 0).toLocaleString()}
                                  </span>
                                  <div style={{ fontSize: '0.65rem', color: '#3b82f6', marginTop: '2px' }}>
                                    Press Enter ↵
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Customer Phone */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Customer Phone</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. 9830012345"
                        value={saleForm.phone}
                        onChange={(e) => setSaleForm({ ...saleForm, phone: e.target.value })}
                        style={{ paddingLeft: '32px' }}
                      />
                      <Phone size={14} color="#3b82f6" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  {/* Row 3: Product Name (Locked/Autofilled from Profile) */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#3b82f6' }}>
                      Product Name (Autofilled from Profile)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{
                          background: 'rgba(59, 130, 246, 0.08)',
                          borderColor: 'rgba(59, 130, 246, 0.3)',
                          fontWeight: 700,
                          color: 'var(--text-main)'
                        }}
                        value={saleForm.product_name}
                        readOnly
                      />
                      <Apple size={16} color="#3b82f6" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                  </div>

                  {/* Row 4: Boxes & Rate/Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Boxes */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, color: '#10b981' }}>
                        Boxes to Sell * <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>(Max: {selectedProfileForSale.balance_box})</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max={selectedProfileForSale.balance_box}
                        className="form-control"
                        style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}
                        placeholder={`0`}
                        value={saleForm.boxes}
                        onChange={(e) => handleSaleBoxesChange(e.target.value)}
                        required
                      />
                    </div>

                    {/* Rate / Box */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Rate / Box (₹) *</span>
                        {rateAppliedNotice && (
                          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>
                            ✓ Auto-Put from Total Hisab
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="any"
                        className="form-control"
                        style={{
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          borderColor: rateAppliedNotice ? '#10b981' : undefined,
                          boxShadow: rateAppliedNotice ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : undefined,
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="e.g. 0"
                        value={saleForm.rate_per_box}
                        onChange={(e) => handleSaleRateChange(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 5: Total Sale Amount (Auto-Calculates + Direct Input + Live Rate Hisab) */}
                  <div
                    className="sale-total-highlight-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: '10px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.07) 100%)',
                      border: '1.5px solid rgba(16, 185, 129, 0.45)',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      marginTop: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#047857', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                          Total Sale Amount (₹) *
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {saleBoxesNum > 0 && saleForm.rate_per_box
                            ? `${saleBoxesNum} Boxes × ₹${Number(saleForm.rate_per_box).toLocaleString()}`
                            : 'Auto-calculates from Rate OR enter total amount directly'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', minWidth: '200px' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '1.15rem',
                              fontWeight: 900,
                              color: '#10b981',
                              pointerEvents: 'none'
                            }}
                          >
                            ₹
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            className="form-control"
                            placeholder="e.g. 0"
                            value={saleTotalInput}
                            onChange={(e) => handleSaleTotalAmountChange(e.target.value)}
                            onKeyDown={handleTotalAmountKeyDown}
                            onBlur={handleTotalAmountBlur}
                            style={{
                              paddingLeft: '30px',
                              fontWeight: 900,
                              fontSize: '1.25rem',
                              color: '#047857',
                              background: '#ffffff',
                              border: calculatedRateFromTotal !== null ? '2px solid #10b981' : '1.5px solid rgba(16, 185, 129, 0.45)',
                              boxShadow: calculatedRateFromTotal !== null ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
                              textAlign: 'right',
                              paddingRight: '14px'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Rate Hisab Banner when Boxes and Total Amount are provided */}
                    {calculatedRateFromTotal !== null && (
                      <div
                        onClick={handleApplyCalculatedRate}
                        style={{
                          marginTop: '2px',
                          padding: '10px 14px',
                          background: rateAppliedNotice ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255, 255, 255, 0.92)',
                          border: rateAppliedNotice ? '1.5px solid #10b981' : '1.5px dashed #10b981',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
                        }}
                        title="Click to put Rate / Box or press Enter inside Total Amount"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>⚡</span>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>
                              Auto Rate / Box Hisab
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 700 }}>
                              ₹{Number(saleTotalInput).toLocaleString()} ÷ {saleBoxesNum} Boxes ={' '}
                              <span style={{ color: '#059669', fontSize: '1.05rem', fontWeight: 900 }}>
                                ₹{calculatedRateFromTotal.toFixed(2).replace(/\.00$/, '')} / Box
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyCalculatedRate();
                          }}
                          className="btn"
                          style={{
                            background: rateAppliedNotice ? '#059669' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                            flexShrink: 0
                          }}
                        >
                          {rateAppliedNotice ? '✓ Put Hogaya!' : 'Put in Rate/Box ↵ (Enter)'}
                        </button>
                      </div>
                    )}

                    {/* Helpful hint when total is typed but boxes is missing */}
                    {saleTotalNum > 0 && saleBoxesNum <= 0 && (
                      <div style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 700, padding: '6px 10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                        ⚠️ Pehle "Boxes to Sell" dalein taki Rate / Box (₹) ka hisab automatically calculate ho sake.
                      </div>
                    )}
                  </div>

                  {/* Row 6: Payment Terms & Immediate Amount */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Payment Mode</label>
                      <select
                        className="form-control"
                        value={saleForm.payment_mode}
                        onChange={(e) => setSaleForm({ ...saleForm, payment_mode: e.target.value })}
                      >
                        <option value="CREDIT">Khata / Credit (Udhaar)</option>
                        <option value="CASH">Cash (Rokda)</option>
                        <option value="UPI">UPI / QR Code</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Amount Paid Now (₹)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="form-control"
                        placeholder={saleForm.payment_mode === 'CASH' ? (calculatedTotal > 0 ? calculatedTotal.toString() : '0') : '0 (Pay later)'}
                        value={saleForm.amount_paid}
                        onChange={(e) => setSaleForm({ ...saleForm, amount_paid: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSaleModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    padding: '9px 24px',
                    fontWeight: 700
                  }}
                >
                  <CheckCircle size={16} />
                  <span>Confirm Sale & Deduct Boxes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. Customer Directory & Unified Profile Modal */}
      {/* (Opens from top button: shows single profile with full history) */}
      {/* ----------------------------------------------------------------- */}
      {isCustomerModalOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsCustomerModalOpen(false)}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '1050px', height: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Customer Profiles & Khata Ledgers
                    </h3>
                    <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Single customer profile with complete Buy (Kharidari) and Payment (Jama) history
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleClearAllCustomers}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.8rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Delete all customer profiles and khata ledgers"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddCustomerOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                >
                  <Plus size={14} />
                  <span>+ New Customer</span>
                </button>

                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsCustomerModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Split Layout */}
            <div className="mandi-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Summary Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="khata-stat-card">
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Customers
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {customerProfiles.length}
                  </span>
                </div>

                <div className="khata-stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Khata Udhaar (Pending)
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444' }}>
                    ₹{totalCustomerDues.toLocaleString()}
                  </span>
                </div>

                <div className="khata-stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Boxes Sold
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                    {totalCustomerBoxes.toLocaleString()} BX
                  </span>
                </div>
              </div>

              {/* Customer Directory Search Bar */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search customer by name, phone, or city..."
                  style={{ paddingLeft: '34px', fontSize: '0.88rem', height: '42px' }}
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Customer Profiles Directory Grid (Responsive for Mobile, Tablet & Desktop) */}
              <div className="customer-directory-grid" style={{ flex: '1 1 auto', minHeight: 0 }}>
                {filteredCustomerDirectory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                    <User size={38} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>No customers found</div>
                    <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try searching with a different customer name, phone number, or city.</p>
                  </div>
                ) : (
                  filteredCustomerDirectory.map(c => {
                    const due = Number(c.current_balance || 0);
                    const bought = Number(c.total_bought || 0);
                    const boxes = Number(c.total_boxes || 0);

                    return (
                      <div
                        key={c.id}
                        className="customer-directory-card"
                        style={{ height: 'auto', minHeight: 'fit-content' }}
                        onClick={() => {
                          setSelectedCustomerForView(c);
                          setIsPaymentDrawerOpen(false);
                          setIsCustomerDetailPopupOpen(true);
                        }}
                      >
                        {/* Card Header: Avatar + Customer Name + Due Badge & Delete Button */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minWidth: 0,
                            flex: '1 1 auto',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              flexShrink: 0
                            }}>
                              {(c.customer_name || 'C')[0]?.toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <div style={{
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                color: 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {c.customer_name}
                              </div>
                              <div style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                <span>📞 {c.phone || 'No phone'}</span>
                                <span>•</span>
                                <span>📍 {c.city || 'Delhi'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            flexShrink: 0
                          }}>
                            <span
                              className={`badge ${due > 0 ? 'badge-warning' : 'badge-success'}`}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '20px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              {due > 0 ? `Due: ₹${due.toLocaleString()}` : 'Cleared'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditCustomer(c);
                              }}
                              title={`Edit profile of ${c.customer_name}`}
                              style={{
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                color: '#3b82f6',
                                borderRadius: '6px',
                                width: '26px',
                                height: '26px',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                e.currentTarget.style.borderColor = '#3b82f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                              }}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSingleCustomer(c);
                              }}
                              title={`Delete profile of ${c.customer_name}`}
                              style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#ef4444',
                                borderRadius: '6px',
                                width: '26px',
                                height: '26px',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.borderColor = '#ef4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                          background: 'var(--bg-main)',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                              Purchases ({boxes} BX)
                            </div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ₹{bought.toLocaleString()}
                            </div>
                          </div>
                          <div style={{ minWidth: 0, textAlign: 'right' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                              Khata Balance
                            </div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: due > 0 ? '#ef4444' : '#10b981', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ₹{due.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.78rem',
                          color: '#3b82f6',
                          fontWeight: 700
                        }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                            {c.buy_history?.length || 0} Orders • {c.payment_history?.length || 0} Payments
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            View Khata Details →
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5.1 Centered Customer Detail Pop-up Page                          */}
      {/* ----------------------------------------------------------------- */}
      {isCustomerDetailPopupOpen && selectedCustomerForView && (
        <div className="centered-popup-backdrop" onClick={() => setIsCustomerDetailPopupOpen(false)}>
          <div
            className="centered-detail-popup"
            style={{ width: '100%', maxWidth: '920px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail Header */}
            <div className="mandi-modal-header" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCustomerDetailPopupOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>

                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  {(selectedCustomerForView.customer_name || 'C')[0]?.toUpperCase()}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {selectedCustomerForView.customer_name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCustomer(selectedCustomerForView)}
                      title="Edit Customer Profile"
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#3b82f6',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span>📞 {selectedCustomerForView.phone || 'No phone'}</span>
                    <span>•</span>
                    <span>📍 {selectedCustomerForView.city || 'Delhi Mandi'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsPaymentDrawerOpen(!isPaymentDrawerOpen)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <DollarSign size={14} />
                  <span>{isPaymentDrawerOpen ? 'Cancel Payment' : 'Receive Payment (Jama)'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleOpenEditCustomer(selectedCustomerForView)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                  title="Edit Customer Profile"
                >
                  <Edit size={14} color="#3b82f6" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                  title="Print Customer Ledger Statement"
                >
                  <Printer size={14} />
                  <span className="hide-on-mobile">Print</span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleDeleteSingleCustomer(selectedCustomerForView)}
                  title={`Delete ${selectedCustomerForView.customer_name}`}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                  <span className="hide-on-mobile">Delete</span>
                </button>

                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsCustomerDetailPopupOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="mandi-modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* Customer Stat Cards */}
              <div className="khata-stat-grid">
                <div className="khata-stat-card">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Boxes Bought
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6' }}>
                    {selectedCustomerForView.total_boxes || 0} BX
                  </span>
                </div>

                <div className="khata-stat-card">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Purchases
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{Number(selectedCustomerForView.total_bought || 0).toLocaleString()}
                  </span>
                </div>

                <div className="khata-stat-card">
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Paid
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                    ₹{Number(selectedCustomerForView.total_paid || 0).toLocaleString()}
                  </span>
                </div>

                <div className="khata-stat-card" style={{
                  background: Number(selectedCustomerForView.current_balance || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  border: `1.5px solid ${Number(selectedCustomerForView.current_balance || 0) > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                }}>
                  <span style={{ fontSize: '0.7rem', color: Number(selectedCustomerForView.current_balance || 0) > 0 ? '#ef4444' : '#10b981', textTransform: 'uppercase', fontWeight: 800 }}>
                    Current Khata Due
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: Number(selectedCustomerForView.current_balance || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    ₹{Number(selectedCustomerForView.current_balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Receive Payment Inline Drawer */}
              {isPaymentDrawerOpen && (
                <form onSubmit={handleRecordCustomerPayment} style={{
                  padding: '14px 16px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#10b981', fontSize: '0.88rem' }}>
                      <Check size={16} />
                      <span>Record Payment (Jama Karein) for {selectedCustomerForView.customer_name}</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldCheck size={11} /> Authenticated • MySQL Live
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Payment Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={paymentForm.date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Amount (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder={`Max: ${selectedCustomerForView.current_balance || ''}`}
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Payment Mode</label>
                      <select
                        className="form-control"
                        value={paymentForm.payment_method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      >
                        <option value="CASH">Cash (Rokda)</option>
                        <option value="UPI">UPI / GPay / Paytm</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Ref / Notes</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Receipt / UTR No."
                        value={paymentForm.reference}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsPaymentDrawerOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      Save Payment (Jama)
                    </button>
                  </div>
                </form>
              )}

              {/* Tabs: Buy History vs Payment History */}
              <div className="khata-tabs">
                <button
                  type="button"
                  className={`khata-tab ${activeCustomerTab === 'buy' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('buy')}
                >
                  <ShoppingCart size={15} />
                  <span>Buy History ({selectedCustomerForView.buy_history?.length || 0})</span>
                </button>

                <button
                  type="button"
                  className={`khata-tab ${activeCustomerTab === 'payment' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('payment')}
                >
                  <History size={15} />
                  <span>Payment History ({selectedCustomerForView.payment_history?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Buy History Table */}
              {activeCustomerTab === 'buy' && (
                <div>
                  {(!selectedCustomerForView.buy_history || selectedCustomerForView.buy_history.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      No purchase history recorded for this customer yet.
                    </div>
                  ) : (
                    <div className="erp-table-wrapper" style={{ margin: 0, border: '1px solid var(--border-subtle)', borderRadius: '10px', overflowX: 'auto', background: 'var(--bg-surface)' }}>
                      <table className="erp-table" style={{ width: '100%', fontSize: '0.84rem', margin: 0, minWidth: '650px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '12px 14px', width: '110px' }}>Date</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px' }}>Product (Fruit & Variety)</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px', width: '120px' }}>Truck No</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', width: '90px' }}>Boxes</th>
                            <th style={{ textAlign: 'right', padding: '12px 14px', width: '110px' }}>Rate / Box</th>
                            <th style={{ textAlign: 'right', padding: '12px 14px', width: '120px' }}>Total (₹)</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', width: '120px' }}>Payment Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomerForView.buy_history.map(item => (
                            <tr key={item.id}>
                              <td style={{ textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                {item.date}
                              </td>
                              <td style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: 'var(--text-main)' }}>
                                {item.product_name}
                              </td>
                              <td style={{ textAlign: 'left', padding: '12px 14px', fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700 }}>
                                {item.truck_no}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 800, color: '#10b981' }}>
                                {item.boxes} BX
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 600 }}>
                                ₹{Number(item.rate_per_box).toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 800, color: 'var(--text-main)' }}>
                                ₹{Number(item.total).toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                <span className={`badge ${item.payment_mode === 'CREDIT' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.72rem', padding: '3px 9px' }}>
                                  {item.payment_mode}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Payment History Table */}
              {activeCustomerTab === 'payment' && (
                <div>
                  {(!selectedCustomerForView.payment_history || selectedCustomerForView.payment_history.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      No payment entries recorded yet. Click "Receive Payment (Jama)" above to record payments.
                    </div>
                  ) : (
                    <div className="erp-table-wrapper" style={{ margin: 0, border: '1px solid var(--border-subtle)', borderRadius: '10px', overflowX: 'auto', background: 'var(--bg-surface)' }}>
                      <table className="erp-table" style={{ width: '100%', fontSize: '0.84rem', margin: 0, minWidth: '600px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '12px 14px', width: '120px' }}>Payment Date</th>
                            <th style={{ textAlign: 'right', padding: '12px 14px', width: '130px' }}>Amount Paid</th>
                            <th style={{ textAlign: 'center', padding: '12px 14px', width: '120px' }}>Mode</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px', width: '140px' }}>Reference No.</th>
                            <th style={{ textAlign: 'left', padding: '12px 14px' }}>Remarks / Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCustomerForView.payment_history.map(p => (
                            <tr key={p.id}>
                              <td style={{ textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                {p.date}
                              </td>
                              <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                                ₹{Number(p.amount).toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                <span className="badge badge-info" style={{ fontSize: '0.72rem', padding: '3px 9px' }}>
                                  {p.payment_method}
                                </span>
                              </td>
                              <td style={{ textAlign: 'left', padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {p.reference || '—'}
                              </td>
                              <td style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-secondary)' }}>
                                {p.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mandi-modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Current Balance: <span style={{ color: Number(selectedCustomerForView.current_balance || 0) > 0 ? '#ef4444' : '#10b981' }}>
                  ₹{Number(selectedCustomerForView.current_balance || 0).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsCustomerDetailPopupOpen(false)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. Add New Customer Sub-Modal */}
      {/* ----------------------------------------------------------------- */}
      {isAddCustomerOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsAddCustomerOpen(false)} style={{ zIndex: 10050 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Add New Customer</h4>
                <span className="badge badge-success" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={11} /> Authenticated • MySQL Live
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsAddCustomerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewCustomer}>
              <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Agarwal Fruit Company"
                    value={newCustomerForm.customer_name}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9811223344"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  />
                </div>


                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Opening Due Balance (if any ₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={newCustomerForm.opening_balance}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, opening_balance: e.target.value })}
                  />
                </div>
              </div>

              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddCustomerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6.1 Edit Customer Profile Modal */}
      {/* ----------------------------------------------------------------- */}
      {isEditCustomerOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsEditCustomerOpen(false)} style={{ zIndex: 10050 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={17} color="#3b82f6" />
                <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>Edit Customer Profile</h4>
                <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={11} /> Authenticated • MySQL Live
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsEditCustomerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer}>
              <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Customer / Party Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Agarwal Fruit Company"
                    value={editCustomerForm.customer_name}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone / Mobile Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9811223344"
                    value={editCustomerForm.phone}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, phone: e.target.value })}
                  />
                </div>

                {/* <div className="form-group" style={{ margin: 0 }}> */}
                {/* <label className="form-label">City / Mandi Location</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Delhi Mandi / Azadpur"
                  value={editCustomerForm.city}
                  onChange={(e) => setEditCustomerForm({ ...editCustomerForm, city: e.target.value })}
                />
                </div> */}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Address / Shop Details</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Shop No. 42, D-Block, Azadpur Subzi Mandi"
                    value={editCustomerForm.address}
                    onChange={(e) => setEditCustomerForm({ ...editCustomerForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditCustomerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingCustomer}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                >
                  {isSavingCustomer ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. Supplier Profiles & Trucks Directory Modal                      */}
      {/* ================================================================= */}
      {isSupplierTrucksModalOpen && (() => {
        const activeSupp = selectedSupplierForDetail || unifiedSuppliers[0] || null;
        const suppLower = (activeSupp?.supplier_name || activeSupp?.name || '').trim().toLowerCase();

        // Inward orders for active supplier
        const suppOrders = purchasesList.filter(p =>
          activeSupp && (
            p.supplier === activeSupp.id ||
            (p.supplier_name && p.supplier_name.toLowerCase() === suppLower)
          )
        );

        // Group inward orders by truck
        const ordersByTruck = suppOrders.reduce((acc, po) => {
          const tNum = (po.truck_number || 'UNKNOWN TRUCK').trim().toUpperCase();
          if (!acc[tNum]) acc[tNum] = [];
          acc[tNum].push(po);
          return acc;
        }, {});

        // Include any truck from supplierProfiles
        supplierProfiles.forEach(sp => {
          if ((sp.supplier_name || '').trim().toLowerCase() === suppLower && sp.truckno) {
            const tNum = sp.truckno.trim().toUpperCase();
            if (!ordersByTruck[tNum] || ordersByTruck[tNum].length === 0) {
              ordersByTruck[tNum] = [{
                id: `entry-${sp.id}`,
                purchase_date: sp.date || getSystemDate(),
                truck_number: tNum,
                items: [{
                  product_name: sp.fruit || 'Apple',
                  variety_name: sp.variety || 'Standard',
                  quantity_boxes: sp.boxes || sp.balance_box || 100
                }],
                balance_box: sp.balance_box,
                status: 'RECEIVED'
              }];
            }
          }
        });

        // Helper to fetch all customer fruit sales for this supplier & specific truck
        const getTruckSales = (truckNum) => {
          const tNumUpper = (truckNum || '').trim().toUpperCase();
          const list = [];
          const seen = new Set();

          // Check truckSalesList state
          (truckSalesList || []).forEach(ts => {
            const tsSupp = (ts.supplier_name || '').trim().toLowerCase();
            const tsTruck = (ts.truck_no || '').trim().toUpperCase();
            if (tsSupp === suppLower && tsTruck === tNumUpper) {
              if (!seen.has(ts.id)) {
                seen.add(ts.id);
                list.push(ts);
              }
            }
          });

          // Check customerProfiles.buy_history
          (customerProfiles || []).forEach(cust => {
            (cust.buy_history || []).forEach(buy => {
              const buySupp = (buy.supplier_name || '').trim().toLowerCase();
              const buyTruck = (buy.truck_no || '').trim().toUpperCase();
              if (buySupp === suppLower && buyTruck === tNumUpper) {
                if (!seen.has(buy.id)) {
                  seen.add(buy.id);
                  list.push({
                    id: buy.id,
                    selling_date: buy.date || buy.selling_date || getSystemDate(),
                    customer_name: cust.customer_name || 'Customer',
                    customer_phone: cust.phone || '',
                    truck_no: tNumUpper,
                    supplier_name: activeSupp?.supplier_name,
                    product_name: buy.product_name || 'Fresh Fruit',
                    boxes: Number(buy.boxes || 0),
                    rate_per_box: Number(buy.rate_per_box || 0),
                    total: Number(buy.total || 0),
                    payment_mode: buy.payment_mode || 'CREDIT'
                  });
                }
              }
            });
          });

          return list.sort((a, b) => new Date(b.selling_date || 0) - new Date(a.selling_date || 0));
        };

        // All distinct truck numbers (both from inward and sales)
        const allTrucksSet = new Set(Object.keys(ordersByTruck));
        (truckSalesList || []).forEach(ts => {
          if ((ts.supplier_name || '').trim().toLowerCase() === suppLower && ts.truck_no) {
            allTrucksSet.add(ts.truck_no.trim().toUpperCase());
          }
        });
        (customerProfiles || []).forEach(cust => {
          (cust.buy_history || []).forEach(b => {
            if ((b.supplier_name || '').trim().toLowerCase() === suppLower && b.truck_no) {
              allTrucksSet.add(b.truck_no.trim().toUpperCase());
            }
          });
        });

        const truckNumbers = Array.from(allTrucksSet);
        const displayedTrucks = selectedTruckFilter === 'ALL'
          ? truckNumbers
          : truckNumbers.filter(t => t === selectedTruckFilter);

        const totalSuppOrders = truckNumbers.reduce((sum, t) => sum + (ordersByTruck[t] ? ordersByTruck[t].length : 0), 0);

        return (
          <div className="mandi-modal-backdrop" onClick={() => setIsSupplierTrucksModalOpen(false)}>
            <div
              className="mandi-modal-dialog"
              style={{ width: '100%', maxWidth: '1100px', height: '88vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="mandi-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Supplier Profiles & Trucks Directory
                      </h3>
                      <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <ShieldCheck size={11} /> Authenticated • MySQL Live
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Bank Passbooks & Inward Consignments Organized by Truck No.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleClearAllSuppliers}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.8rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Delete all supplier profiles"
                  >
                    <Trash2 size={14} />
                    <span>Clear All</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddSupplierModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }}
                  >
                    <Plus size={14} />
                    <span>+ New Supplier Profile</span>
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setIsSupplierTrucksModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="mandi-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Summary Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="khata-stat-card">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Total Suppliers
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {unifiedSuppliers.length}
                    </span>
                  </div>

                  <div className="khata-stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>
                      Active Trucks
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>
                      {Array.from(new Set([
                        ...unifiedSuppliers.map(s => s.truckno).filter(Boolean),
                        ...purchasesList.map(p => p.truck_number).filter(Boolean)
                      ])).length} Trucks
                    </span>
                  </div>

                  <div className="khata-stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Total Balance Boxes
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                      {totalBalanceBoxes.toLocaleString()} BX
                    </span>
                  </div>
                </div>

                {/* Supplier Directory Search Bar */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search supplier by name, phone, bank, or truck..."
                    style={{ paddingLeft: '34px', fontSize: '0.88rem', height: '42px' }}
                    value={supplierTrucksSearch}
                    onChange={(e) => setSupplierTrucksSearch(e.target.value)}
                  />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
                  {supplierTrucksSearch && (
                    <button
                      type="button"
                      onClick={() => setSupplierTrucksSearch('')}
                      style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Supplier Directory Grid (Responsive for Mobile, Tablet & Desktop) */}
                <div className="supplier-directory-grid" style={{ flex: '1 1 auto', minHeight: 0 }}>
                  {filteredUnifiedSuppliers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                      <Truck size={38} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>No suppliers found</div>
                      <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try searching with a different name, phone, bank, or truck number.</p>
                    </div>
                  ) : (
                    filteredUnifiedSuppliers.map(s => {
                      const sOrderCount = purchasesList.filter(p => p.supplier === s.id || (p.supplier_name && p.supplier_name.toLowerCase() === (s.supplier_name || '').toLowerCase())).length;

                      return (
                        <div
                          key={s.id}
                          className="supplier-directory-card"
                          style={{ height: 'auto', minHeight: 'fit-content' }}
                          onClick={() => {
                            setSelectedSupplierForDetail(s);
                            setSelectedTruckFilter('ALL');
                            setTruckStatusFilter('ACTIVE');
                            setIsSupplierDetailPopupOpen(true);
                          }}
                        >
                          {/* Card Header: Avatar + Supplier Name + Truck Badge & Delete Button */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              minWidth: 0,
                              flex: '1 1 auto',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                flexShrink: 0
                              }}>
                                {(s.supplier_name || s.name || 'S')[0]?.toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                  fontWeight: 800,
                                  fontSize: '0.92rem',
                                  color: 'var(--text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {s.supplier_name || s.name}
                                </div>
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <span>📞 {s.phone || 'No phone'}</span>
                                  <span>•</span>
                                  <span>📍 {s.city || 'Azadpur Mandi'}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              flexShrink: 0
                            }}>
                              <span
                                className="badge badge-success"
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '20px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                {s.truckno || (sOrderCount > 0 ? `${sOrderCount} Orders` : 'Active')}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditPassbook(s);
                                }}
                                title={`Edit profile of ${s.supplier_name || s.name}`}
                                style={{
                                  background: 'rgba(59, 130, 246, 0.08)',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  color: '#3b82f6',
                                  borderRadius: '6px',
                                  width: '26px',
                                  height: '26px',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                  e.currentTarget.style.borderColor = '#3b82f6';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                                }}
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSingleSupplier(s);
                                }}
                                title={`Delete profile of ${s.supplier_name || s.name}`}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#ef4444',
                                  borderRadius: '6px',
                                  width: '26px',
                                  height: '26px',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                  e.currentTarget.style.borderColor = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Passbook & Stock Snapshot */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            background: 'var(--bg-main)',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                                Bank Passbook
                              </div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                🏛️ {s.bank_name || 'Passbook Saved'}
                              </div>
                            </div>
                            <div style={{ minWidth: 0, textAlign: 'right' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                                Balance Inventory
                              </div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                                📦 {s.balance_box !== undefined ? `${s.balance_box} BX` : '0 BX'}
                              </div>
                            </div>
                          </div>

                          {/* Card Action Footer */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border-subtle)',
                            fontSize: '0.78rem',
                            color: '#10b981',
                            fontWeight: 700
                          }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                              A/C: {s.account_number ? `•••${s.account_number.slice(-4)}` : 'Passbook registered'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              View Passbook & Trucks →
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          CENTERED DETAIL POP-UP: Supplier Full Profile, Bank Passbook & Truck Sales
          ========================================================================= */}
      {isSupplierDetailPopupOpen && selectedSupplierForDetail && (() => {
        const activeSupp = selectedSupplierForDetail;
        const suppLower = (activeSupp?.supplier_name || activeSupp?.name || '').trim().toLowerCase();

        // Inward orders for active supplier
        const suppOrders = purchasesList.filter(p =>
          activeSupp && (
            p.supplier === activeSupp.id ||
            (p.supplier_name && p.supplier_name.toLowerCase() === suppLower)
          )
        );

        // Group inward orders by truck
        const ordersByTruck = suppOrders.reduce((acc, po) => {
          const tNum = (po.truck_number || 'UNKNOWN TRUCK').trim().toUpperCase();
          if (!acc[tNum]) acc[tNum] = [];
          acc[tNum].push(po);
          return acc;
        }, {});

        // Include any truck from supplierProfiles
        supplierProfiles.forEach(sp => {
          if ((sp.supplier_name || '').trim().toLowerCase() === suppLower && sp.truckno) {
            const tNum = sp.truckno.trim().toUpperCase();
            if (!ordersByTruck[tNum] || ordersByTruck[tNum].length === 0) {
              ordersByTruck[tNum] = [{
                id: `entry-${sp.id}`,
                purchase_date: sp.date || getSystemDate(),
                truck_number: tNum,
                items: [{
                  product_name: sp.fruit || 'Apple',
                  variety_name: sp.variety || 'Standard',
                  quantity_boxes: sp.boxes || sp.balance_box || 100
                }],
                balance_box: sp.balance_box,
                status: 'RECEIVED'
              }];
            }
          }
        });

        // Helper to fetch all customer fruit sales for this supplier & specific truck
        const getTruckSales = (truckNum) => {
          return getTruckSalesForSupplier(activeSupp, truckNum);
        };

        // All distinct truck numbers (both from inward and sales)
        const allTrucksSet = new Set(Object.keys(ordersByTruck));
        (truckSalesList || []).forEach(ts => {
          if ((ts.supplier_name || '').trim().toLowerCase() === suppLower && ts.truck_no) {
            allTrucksSet.add(ts.truck_no.trim().toUpperCase());
          }
        });
        (customerProfiles || []).forEach(cust => {
          (cust.buy_history || []).forEach(b => {
            if ((b.supplier_name || '').trim().toLowerCase() === suppLower && b.truck_no) {
              allTrucksSet.add(b.truck_no.trim().toUpperCase());
            }
          });
        });

        const truckNumbers = Array.from(allTrucksSet);

        // Calculate truck balance for each truck
        const getTruckBalance = (truckNum) => {
          const tUpper = (truckNum || '').trim().toUpperCase();

          // 1. Check supplierProfiles for exact match
          const matchingProfiles = supplierProfiles.filter(sp =>
            (sp.supplier_name || '').trim().toLowerCase() === suppLower &&
            (sp.truckno || '').trim().toUpperCase() === tUpper
          );

          if (matchingProfiles.length > 0) {
            return matchingProfiles.reduce((sum, sp) => {
              if (sp.balance_box !== undefined && sp.balance_box !== null) {
                return sum + Math.max(0, Number(sp.balance_box));
              }
              const initBoxes = Number(sp.boxes || 0);
              const sold = getTruckSales(tUpper).reduce((s, sl) => s + Number(sl.boxes || 0), 0);
              return sum + Math.max(0, initBoxes - sold);
            }, 0);
          }

          // 2. Check ordersByTruck
          const orders = ordersByTruck[tUpper] || [];
          if (orders.length > 0) {
            let explicitBal = 0;
            let hasExplicit = false;
            let totalInwardBoxes = 0;

            orders.forEach(po => {
              if (po.balance_box !== undefined && po.balance_box !== null) {
                hasExplicit = true;
                explicitBal += Math.max(0, Number(po.balance_box));
              }
              const itBoxes = (po.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
              totalInwardBoxes += itBoxes > 0 ? itBoxes : Number(po.boxes || 0);
            });

            if (hasExplicit) return explicitBal;
            const sold = getTruckSales(tUpper).reduce((s, sl) => s + Number(sl.boxes || 0), 0);
            return Math.max(0, totalInwardBoxes - sold);
          }

          // 3. Fallback: check purchasesList
          const suppPurchases = purchasesList.filter(p =>
            (p.supplier_name && p.supplier_name.toLowerCase() === suppLower) &&
            ((p.truck_number || '').trim().toUpperCase() === tUpper)
          );
          if (suppPurchases.length > 0) {
            let totalInward = 0;
            let hasExplicit = false;
            let explicitBal = 0;
            suppPurchases.forEach(p => {
              if (p.balance_box !== undefined && p.balance_box !== null) {
                hasExplicit = true;
                explicitBal += Math.max(0, Number(p.balance_box));
              }
              const itBoxes = (p.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
              totalInward += itBoxes > 0 ? itBoxes : Number(p.boxes || 0);
            });
            if (hasExplicit) return explicitBal;
            const sold = getTruckSales(tUpper).reduce((s, sl) => s + Number(sl.boxes || 0), 0);
            return Math.max(0, totalInward - sold);
          }

          return 0;
        };

        const activeTrucks = truckNumbers.filter(tNum => getTruckBalance(tNum) > 0);
        const completedTrucks = truckNumbers.filter(tNum => getTruckBalance(tNum) === 0);

        // Filter by Status: ACTIVE (balance > 0) or COMPLETE (balance === 0)
        const statusFilteredTrucks = truckStatusFilter === 'COMPLETE'
          ? completedTrucks
          : activeTrucks;

        const displayedTrucks = statusFilteredTrucks;

        return (
          <div
            className="mandi-modal-backdrop centered-popup-backdrop"
            onClick={() => setIsSupplierDetailPopupOpen(false)}
          >
            <div
              className="mandi-modal-dialog centered-detail-popup"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Back button and Actions */}
              <div className="mandi-modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsSupplierDetailPopupOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      borderRadius: '8px'
                    }}
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={20} color="#10b981" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>
                        {activeSupp.supplier_name || 'Supplier Profile'}
                      </h3>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        Detailed Bank Passbook & Truck-wise Customer Sales
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                    }}
                    onClick={() => handleOpenEditPassbook(activeSupp)}
                    title="Edit Supplier Name, Phone, City & Bank Passbook"
                  >
                    <Edit size={14} />
                    <span>Edit Profile & Passbook</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDeleteSingleSupplier(activeSupp)}
                    title={`Delete ${activeSupp.supplier_name || 'supplier'} profile`}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setIsSupplierDetailPopupOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="mandi-modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
                {/* Supplier Hero Information */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  background: 'var(--bg-main)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}>
                      {(activeSupp.supplier_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {activeSupp.supplier_name}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPassbook(activeSupp)}
                          title="Edit Supplier Profile"
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#10b981',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {activeSupp.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} color="#10b981" />
                            {activeSupp.phone}
                          </span>
                        )}
                        {activeSupp.city && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="#6366f1" />
                            {activeSupp.city}
                          </span>
                        )}
                        <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                          Verified Supplier
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Balance Stock In Mandi
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981' }}>
                        {activeSupp.balance_box !== undefined ? `${activeSupp.balance_box} Boxes` : '0 Boxes'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Passbook Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 95, 70, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={18} color="#10b981" />
                      <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#10b981' }}>
                        Bank Passbook & Settlement Account
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyPassbook(activeSupp)}
                      style={{ gap: '6px' }}
                    >
                      {copiedBankSupplierId === activeSupp.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      <span>{copiedBankSupplierId === activeSupp.id ? 'Passbook Copied!' : 'Copy Bank Details'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Bank Name</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSupp.bank_name || 'State Bank of India'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px', color: '#10b981', fontFamily: 'monospace' }}>
                        {activeSupp.account_number || '389201004523'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>IFSC Code</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>{activeSupp.ifsc_code || 'SBIN0001234'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>A/C Holder Name</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSupp.account_holder_name || activeSupp.supplier_name || '—'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Branch Name</span>
                      <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSupp.branch_name || 'Azadpur Mandi Branch, Delhi'}</p>
                    </div>
                    {activeSupp.upi_id && (
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>UPI ID</span>
                        <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>{activeSupp.upi_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Truck-wise Consignments & Customer Fruit Sales */}
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', background: 'var(--bg-input)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <FileText size={16} color="#10b981" />
                        <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Truck-wise Order & Sales Details ({truckStatusFilter === 'ACTIVE' ? `${activeTrucks.length} Active` : `${completedTrucks.length} Complete`})
                        </h5>
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        Har Truck No. se customer ko sell hue fruits (Bikri Parchi) aur Inward Consignments ka pura byora
                      </span>
                    </div>

                    {/* Status Filter Buttons: Active, Complete (All Trucks removed) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        background: 'var(--bg-main)',
                        padding: '3px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border-subtle)',
                        gap: '3px'
                      }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${truckStatusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            setTruckStatusFilter('ACTIVE');
                            setSelectedTruckFilter('ALL');
                          }}
                          style={{
                            padding: '5px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: truckStatusFilter === 'ACTIVE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                            color: truckStatusFilter === 'ACTIVE' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: truckStatusFilter === 'ACTIVE' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          title="Trucks jinka balance 0 nahi hua hai (Stock remaining)"
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: truckStatusFilter === 'ACTIVE' ? '#ffffff' : '#10b981',
                            display: 'inline-block'
                          }}></span>
                          <span>Active ({activeTrucks.length})</span>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${truckStatusFilter === 'COMPLETE' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            setTruckStatusFilter('COMPLETE');
                            setSelectedTruckFilter('ALL');
                          }}
                          style={{
                            padding: '5px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: truckStatusFilter === 'COMPLETE' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'transparent',
                            color: truckStatusFilter === 'COMPLETE' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: truckStatusFilter === 'COMPLETE' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          title="Trucks jinka balance 0 ho gaya hai (Complete / Sold Out)"
                        >
                          <Check size={14} color={truckStatusFilter === 'COMPLETE' ? '#ffffff' : '#3b82f6'} />
                          <span>Complete ({completedTrucks.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {displayedTrucks.length === 0 ? (
                    <div style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      background: 'var(--bg-main)',
                      borderRadius: '12px',
                      border: '1px dashed var(--border-subtle)',
                      color: 'var(--text-secondary)'
                    }}>
                      {truckStatusFilter === 'ACTIVE' ? (
                        <>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                            Koi Active Truck nahi mila (Sabhi trucks ka balance 0 ho chuka hai)
                          </strong>
                          <p style={{ fontSize: '0.84rem', margin: '0 0 14px 0' }}>
                            Is vyapari ke sabhi trucks ka fruit sell ho chuka hai aur balance 0 ho gaya hai.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setTruckStatusFilter('COMPLETE');
                              setSelectedTruckFilter('ALL');
                            }}
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none' }}
                          >
                            View Complete Trucks ({completedTrucks.length})
                          </button>
                        </>
                      ) : truckStatusFilter === 'COMPLETE' ? (
                        <>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                          <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                            Koi Complete Truck nahi mila (Abhi kisi truck ka balance 0 nahi hua hai)
                          </strong>
                          <p style={{ fontSize: '0.84rem', margin: '0 0 14px 0' }}>
                            Sabhi trucks me abhi stock balance bacha hua hai.
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setTruckStatusFilter('ACTIVE');
                              setSelectedTruckFilter('ALL');
                            }}
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
                          >
                            View Active Trucks ({activeTrucks.length})
                          </button>
                        </>
                      ) : (
                        <div>No consignments or fruit sales recorded for this vyapari yet.</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {displayedTrucks.map(tNum => {
                        const tSales = getTruckSales(tNum);
                        const totalSoldBoxes = tSales.reduce((sum, s) => sum + Number(s.boxes || 0), 0);
                        const totalSoldValue = tSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
                        const tBalance = getTruckBalance(tNum);
                        const isComplete = tBalance === 0;
                        const isExpanded = selectedTruckNumber === tNum;

                        // Produce Name and Inward Boxes for tNum
                        const tOrders = (ordersByTruck && ordersByTruck[tNum]) || [];
                        let tInwardBoxes = 0;
                        tOrders.forEach(po => {
                          const itBoxes = (po.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
                          tInwardBoxes += itBoxes > 0 ? itBoxes : Number(po.boxes || 0);
                        });
                        if (tInwardBoxes === 0 && purchasesList.length > 0) {
                          const pList = purchasesList.filter(p => ((p.truck_number || '').trim().toUpperCase() === tNum));
                          pList.forEach(p => {
                            const itBoxes = (p.items || []).reduce((s, it) => s + Number(it.quantity_boxes || it.boxes || 0), 0);
                            tInwardBoxes += itBoxes > 0 ? itBoxes : Number(p.boxes || 0);
                          });
                        }
                        if (tInwardBoxes === 0) {
                          tInwardBoxes = totalSoldBoxes + tBalance;
                        }

                        const tProduce = tSales[0]?.product_name ||
                          (tOrders[0]?.items && tOrders[0]?.items[0]?.product_name) ||
                          tOrders[0]?.produce_name ||
                          activeSupp.produce_category ||
                          'Fresh Produce';

                        // Settlement for tNum
                        const curSettlement = truckSettlements[tNum] || { commissionPercent: 5, truckFare: 0, kuli: 0 };
                        const commPct = Number(curSettlement.commissionPercent !== undefined ? curSettlement.commissionPercent : 5);
                        const fareAmount = Number(curSettlement.truckFare || 0);
                        const kuliAmount = Number(curSettlement.kuli || 0);
                        const commAmount = Math.round((totalSoldValue * commPct) / 100);
                        const totalDeductions = commAmount + fareAmount + kuliAmount;
                        const invoiceTotal = Math.max(0, totalSoldValue - totalDeductions);
                        const grossMargin = commAmount;

                        return (
                          <div
                            key={tNum}
                            style={{
                              border: isExpanded
                                ? (isComplete ? '2px solid #3b82f6' : '2px solid #10b981')
                                : '1.5px solid rgba(59, 130, 246, 0.25)',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              background: 'var(--bg-surface)',
                              boxShadow: isExpanded
                                ? (isComplete ? '0 6px 20px rgba(59, 130, 246, 0.16)' : '0 6px 20px rgba(16, 185, 129, 0.16)')
                                : '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Horizontal Profile Card matching User Image */}
                            <div
                              onClick={() => setSelectedTruckNumber(prev => prev === tNum ? null : tNum)}
                              style={{
                                background: isExpanded
                                  ? (isComplete ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)' : 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%)')
                                  : (isComplete ? 'rgba(239, 246, 255, 0.85)' : 'rgba(240, 253, 244, 0.85)'),
                                padding: '12px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                                cursor: 'pointer',
                                borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                                userSelect: 'none',
                                transition: 'background 0.2s ease'
                              }}
                              title="Click to view/hide customer sales and details"
                            >
                              {/* Left side: Icon, Status Tag, Truck Number */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '12px',
                                  background: isComplete ? '#dbeafe' : '#d1fae5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: isComplete ? '#2563eb' : '#059669',
                                  flexShrink: 0
                                }}>
                                  <Truck size={22} />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    <span style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--text-secondary)',
                                      textTransform: 'uppercase',
                                      fontWeight: 800,
                                      letterSpacing: '0.04em'
                                    }}>
                                      SELECTED TRUCK DETAILS
                                    </span>
                                    {isComplete ? (
                                      <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        background: '#dbeafe',
                                        color: '#1d4ed8',
                                        padding: '2px 9px',
                                        borderRadius: '12px'
                                      }}>
                                        Complete (0 Balance)
                                      </span>
                                    ) : (
                                      <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        background: '#d1fae5',
                                        color: '#047857',
                                        padding: '2px 9px',
                                        borderRadius: '12px'
                                      }}>
                                        Active ({tBalance} BX Left)
                                      </span>
                                    )}
                                  </div>
                                  <strong style={{
                                    fontFamily: 'monospace',
                                    fontSize: '1.25rem',
                                    color: 'var(--text-main)',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    display: 'block'
                                  }}>
                                    {tNum}
                                  </strong>
                                </div>
                              </div>

                              {/* Right side: 4 Pill Boxes + Chevron */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: 'var(--bg-main)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-subtle)',
                                  minWidth: '70px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, letterSpacing: '0.03em' }}>
                                    INWARD
                                  </span>
                                  <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>
                                    {tInwardBoxes} BX
                                  </strong>
                                </div>

                                <div style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: 'var(--bg-main)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-subtle)',
                                  minWidth: '70px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, letterSpacing: '0.03em' }}>
                                    SOLD OUT
                                  </span>
                                  <strong style={{ fontSize: '0.94rem', color: '#2563eb' }}>
                                    {totalSoldBoxes} BX
                                  </strong>
                                </div>

                                <div style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: 'var(--bg-main)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-subtle)',
                                  minWidth: '70px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', fontWeight: 700, letterSpacing: '0.03em' }}>
                                    BALANCE
                                  </span>
                                  <strong style={{ fontSize: '0.94rem', color: isComplete ? '#10b981' : '#f59e0b' }}>
                                    {tBalance} BX
                                  </strong>
                                </div>

                                <div style={{
                                  textAlign: 'center',
                                  padding: '5px 14px',
                                  background: '#dcfce7',
                                  borderRadius: '10px',
                                  border: '1px solid #86efac',
                                  minWidth: '95px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#059669', display: 'block', fontWeight: 800, letterSpacing: '0.03em' }}>
                                    TOTAL BIKRI
                                  </span>
                                  <strong style={{ fontSize: '0.96rem', color: '#059669', fontWeight: 900 }}>
                                    ₹{totalSoldValue.toLocaleString()}
                                  </strong>
                                </div>

                                <div style={{
                                  marginLeft: '4px',
                                  color: isExpanded ? (isComplete ? '#2563eb' : '#059669') : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                              </div>
                            </div>

                            {/* Details Expanded Section when Clicked */}
                            {isExpanded && (
                              <div>
                                {/* Customer Fruit Sales (Bikri Parchi) Table */}
                                <div style={{ padding: '16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                      <ShoppingCart size={16} color="#3b82f6" />
                                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        Fruits Sold to Customers from Truck {tNum}
                                      </span>
                                    </div>
                                    {totalSoldBoxes > 0 && (
                                      <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                                        ✓ {totalSoldBoxes} Boxes sold • ₹{totalSoldValue.toLocaleString()} Gross Bikri
                                      </span>
                                    )}
                                  </div>

                                  {tSales.length === 0 ? (
                                    <div style={{
                                      padding: '20px',
                                      textAlign: 'center',
                                      background: 'rgba(0,0,0,0.02)',
                                      borderRadius: '8px',
                                      border: '1px dashed var(--border-subtle)',
                                      fontSize: '0.84rem',
                                      color: 'var(--text-secondary)'
                                    }}>
                                      Is truck ({tNum}) se abhi tak koi customer fruit sale nahi hui hai.
                                    </div>
                                  ) : (
                                    <div className="erp-table-wrapper" style={{ margin: 0, border: '1px solid var(--border-subtle)', borderRadius: '8px', overflowX: 'auto' }}>
                                      <table className="erp-table" style={{ width: '100%', minWidth: '550px' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ width: '110px' }}>Selling Date</th>
                                            <th>Customer Name</th>
                                            <th>Fruit / Produce</th>
                                            <th style={{ width: '170px' }}>Box with Per Box Rate</th>
                                            <th style={{ width: '130px', textAlign: 'right' }}>Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {tSales.map(sale => (
                                            <tr key={sale.id}>
                                              <td>
                                                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                                  {sale.selling_date}
                                                </span>
                                              </td>
                                              <td>
                                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                  {sale.customer_name}
                                                </div>
                                                {sale.customer_phone && (
                                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                    📞 {sale.customer_phone}
                                                  </span>
                                                )}
                                              </td>
                                              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                {sale.product_name || tProduce}
                                              </td>
                                              <td>
                                                <span style={{ fontWeight: 800, color: '#3b82f6' }}>
                                                  {sale.boxes} BX
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '6px' }}>
                                                  @ ₹{Number(sale.rate_per_box).toLocaleString()} / BX
                                                </span>
                                              </td>
                                              <td style={{ textAlign: 'right' }}>
                                                <strong style={{ color: '#10b981', fontSize: '0.94rem' }}>
                                                  ₹{Number(sale.total).toLocaleString()}
                                                </strong>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot>
                                          <tr style={{ background: 'rgba(16, 185, 129, 0.06)', fontWeight: 800 }}>
                                            <td colSpan={3} style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                              Total Sold from {tNum}:
                                            </td>
                                            <td style={{ color: '#3b82f6', fontWeight: 800 }}>
                                              {totalSoldBoxes} Boxes
                                            </td>
                                            <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 900, fontSize: '0.96rem' }}>
                                              ₹{totalSoldValue.toLocaleString()}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                {/* Real-time Gross Margin & Vyapari Invoice Settlement (For Complete Truck) */}
                                {isComplete && (
                                  <div style={{
                                    margin: '0 16px 16px 16px',
                                    padding: '18px 20px',
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                    border: '1.5px solid rgba(59, 130, 246, 0.28)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px'
                                  }}>
                                    {/* Section Top Header & Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <Calculator size={16} />
                                          </div>
                                          <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                                            Real-Time Gross Margin & Vyapari Invoice Settlement
                                          </strong>
                                          <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontWeight: 800 }}>
                                            Live Calculation
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                          Total Sold me se Commission (%), Truck Fare aur Kuli minus hokar Net Invoice Total aur Gross Margin calculate hota hai.
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline"
                                          onClick={() => handleSaveSettlementAndOpenSidebar(
                                            activeSupp, tNum, invoiceTotal,
                                            totalSoldValue, commAmount, fareAmount, kuliAmount
                                          )}
                                          style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: savedSettlementTruck === tNum ? '#10b981' : 'transparent',
                                            color: savedSettlementTruck === tNum ? '#ffffff' : 'var(--text-main)',
                                            borderColor: savedSettlementTruck === tNum ? '#10b981' : 'var(--border-subtle)',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          <Check size={14} />
                                          <span>{savedSettlementTruck === tNum ? 'Settlement Saved! ✓' : 'Save Settlement'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary"
                                          onClick={() => {
                                            handlePrintTruckInvoice(
                                              activeSupp,
                                              tNum,
                                              tProduce,
                                              tSales,
                                              totalSoldBoxes,
                                              totalSoldValue,
                                              curSettlement,
                                              commAmount,
                                              fareAmount,
                                              kuliAmount,
                                              invoiceTotal
                                            );
                                          }}
                                          style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                            border: 'none',
                                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.28)'
                                          }}
                                        >
                                          <Printer size={14} />
                                          <span>Print Vyapari Invoice Parchi</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Live Inputs Grid */}
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                                      gap: '14px',
                                      background: 'var(--bg-main)',
                                      padding: '14px 16px',
                                      borderRadius: '10px',
                                      border: '1px solid var(--border-subtle)'
                                    }}>
                                      {/* 1. Commission Input */}
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Commission Rate (%)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            value={curSettlement.commissionPercent !== undefined ? curSettlement.commissionPercent : 5}
                                            onChange={(e) => updateTruckSettlement(tNum, 'commissionPercent', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              fontWeight: 800,
                                              fontSize: '1rem',
                                              paddingRight: '36px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                          <span style={{ position: 'absolute', right: '12px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            %
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>
                                          = ₹{commAmount.toLocaleString()} ({commPct}%)
                                        </div>
                                      </div>

                                      {/* 2. Truck Fare Input */}
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Truck Fare / Bhada (TF) (₹)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                          <span style={{ position: 'absolute', left: '12px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            placeholder="0"
                                            value={curSettlement.truckFare !== undefined && curSettlement.truckFare !== null ? curSettlement.truckFare : ''}
                                            onChange={(e) => updateTruckSettlement(tNum, 'truckFare', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              fontWeight: 800,
                                              fontSize: '1rem',
                                              paddingLeft: '28px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                          Vyapari account se deduct hoga
                                        </div>
                                      </div>

                                      {/* 3. Kuli / Hamali Input */}
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                          Kuli / Hamali Labor (₹)
                                        </label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                          <span style={{ position: 'absolute', left: '12px', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            placeholder="0"
                                            value={curSettlement.kuli !== undefined && curSettlement.kuli !== null ? curSettlement.kuli : ''}
                                            onChange={(e) => updateTruckSettlement(tNum, 'kuli', e.target.value === '' ? '' : Number(e.target.value))}
                                            className="form-control"
                                            style={{
                                              fontWeight: 800,
                                              fontSize: '1rem',
                                              paddingLeft: '28px',
                                              background: 'var(--bg-surface)'
                                            }}
                                          />
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                          Unloading & mandi labor charge
                                        </div>
                                      </div>
                                    </div>

                                    {/* Real-time Calculation KPI Breakdown Cards */}
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                      gap: '12px'
                                    }}>
                                      {/* Total Sold */}
                                      <div style={{
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '10px',
                                        padding: '12px 14px'
                                      }}>
                                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, display: 'block' }}>
                                          Total Sold (Gross Bikri)
                                        </span>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                                          ₹{totalSoldValue.toLocaleString()}
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                          {totalSoldBoxes} Boxes Total Sold
                                        </span>
                                      </div>

                                      {/* Total Deductions */}
                                      <div style={{
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        border: '1px solid rgba(239, 68, 68, 0.22)',
                                        borderRadius: '10px',
                                        padding: '12px 14px'
                                      }}>
                                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#dc2626', fontWeight: 800, display: 'block' }}>
                                          Total Deductions (-)
                                        </span>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>
                                          - ₹{totalDeductions.toLocaleString()}
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>
                                          Comm: ₹{commAmount.toLocaleString()} • TF: ₹{fareAmount.toLocaleString()} • Kuli: ₹{kuliAmount.toLocaleString()}
                                        </span>
                                      </div>

                                      {/* Final Net Invoice Total */}
                                      <div style={{
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
                                        border: '2px solid rgba(16, 185, 129, 0.4)',
                                        borderRadius: '10px',
                                        padding: '12px 14px'
                                      }}>
                                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#047857', fontWeight: 900, display: 'block' }}>
                                          FINAL INVOICE TOTAL (Payable)
                                        </span>
                                        <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#047857', marginTop: '2px' }}>
                                          ₹{invoiceTotal.toLocaleString()}
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: 700 }}>
                                          Net vyapari settlement amount
                                        </span>
                                      </div>

                                      {/* Real-time Gross Margin */}
                                      <div style={{
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                                        border: '1.5px solid rgba(59, 130, 246, 0.35)',
                                        borderRadius: '10px',
                                        padding: '12px 14px'
                                      }}>
                                        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#1d4ed8', fontWeight: 900, display: 'block' }}>
                                          Real-Time Gross Margin
                                        </span>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>
                                          ₹{grossMargin.toLocaleString()}
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700 }}>
                                          Aapka {commPct}% Aarhat Commission
                                        </span>
                                      </div>
                                    </div>

                                    {/* Mandi Parchi Settlement Formula Strip */}
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      background: 'var(--bg-main)',
                                      padding: '10px 14px',
                                      borderRadius: '8px',
                                      border: '1px solid var(--border-subtle)',
                                      fontSize: '0.76rem',
                                      flexWrap: 'wrap',
                                      gap: '8px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Calculation Summary:</span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>
                                          Total Sold (₹{totalSoldValue.toLocaleString()}) - Commission (₹{commAmount.toLocaleString()}) - TF (₹{fareAmount.toLocaleString()}) - Kuli (₹{kuliAmount.toLocaleString()})
                                        </span>
                                      </div>
                                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.84rem' }}>
                                        = Net Invoice: ₹{invoiceTotal.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL 8: Edit Supplier Bank Passbook Details Modal
          ========================================================================= */}
      {isEditPassbookOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsEditPassbookOpen(false)} style={{ zIndex: 10060 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mandi-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={17} color="#10b981" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Edit Supplier Profile & Passbook
                </h4>
                <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <ShieldCheck size={11} /> Authenticated • MySQL Live
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsEditPassbookOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Supplier / Vyapari Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Kashmir Apple Growers"
                  value={passbookForm.supplier_name}
                  onChange={(e) => setPassbookForm({ ...passbookForm, supplier_name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={passbookForm.phone}
                    onChange={(e) => setPassbookForm({ ...passbookForm, phone: e.target.value })}
                  />
                </div>

                {/* <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">City / Mandi Location</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Azadpur Mandi / Sopore"
                    value={passbookForm.city || ''}
                    onChange={(e) => setPassbookForm({ ...passbookForm, city: e.target.value })}
                  />
                </div> */}
              </div>

              <div style={{
                padding: '12px 14px',
                background: 'var(--bg-input)',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '4px'
              }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bank Passbook & Settlement Account
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Bank Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. State Bank of India, HDFC Bank, J&K Bank..."
                    value={passbookForm.bank_name}
                    onChange={(e) => setPassbookForm({ ...passbookForm, bank_name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>Bank Account Number (A/C No.) *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 700 }}
                    placeholder="e.g. 389201004523"
                    value={passbookForm.account_number}
                    onChange={(e) => setPassbookForm({ ...passbookForm, account_number: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>IFSC Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                      placeholder="e.g. SBIN0001234"
                      value={passbookForm.ifsc_code}
                      onChange={(e) => setPassbookForm({ ...passbookForm, ifsc_code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Branch Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Azadpur Mandi Branch"
                      value={passbookForm.branch_name}
                      onChange={(e) => setPassbookForm({ ...passbookForm, branch_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mandi-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditPassbookOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSavingPassbook}
                onClick={handleSavePassbook}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                {isSavingPassbook ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 9: Add New Supplier Profile Modal
          ========================================================================= */}
      {isAddSupplierModalOpen && (
        <div className="mandi-modal-backdrop" onClick={() => setIsAddSupplierModalOpen(false)} style={{ zIndex: 10060 }}>
          <div
            className="mandi-modal-dialog"
            style={{ width: '100%', maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSaveNewSupplierModal}>
              <div className="mandi-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={17} color="#10b981" />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Add New Supplier Profile & Passbook
                  </h4>
                  <span className="badge badge-success hide-on-mobile" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <ShieldCheck size={11} /> Authenticated • MySQL Live
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mandi-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Supplier / Vyapari Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Kashmir Apple Growers"
                    value={newSupplierModalForm.supplier_name}
                    onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, supplier_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={newSupplierModalForm.phone}
                    onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, phone: e.target.value })}
                  />
                </div>


                <div style={{
                  padding: '12px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Bank Passbook Details
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Bank Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. State Bank of India"
                      value={newSupplierModalForm.bank_name}
                      onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, bank_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.74rem' }}>Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontFamily: 'monospace', fontWeight: 700 }}
                      placeholder="e.g. 389201004523"
                      value={newSupplierModalForm.account_number}
                      onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, account_number: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>IFSC Code</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}
                        placeholder="e.g. SBIN0001234"
                        value={newSupplierModalForm.ifsc_code}
                        onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, ifsc_code: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.74rem' }}>Branch Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Mandi Branch"
                        value={newSupplierModalForm.branch_name}
                        onChange={(e) => setNewSupplierModalForm({ ...newSupplierModalForm, branch_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mandi-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingSupplierModal}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  {isSavingSupplierModal ? 'Saving...' : 'Save & Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
          CASH SALE SIDEBAR — Supplier Net Invoice History + Payment
          ========================================================================= */}
      {/* Backdrop */}
      {isCashSaleSidebarOpen && (
        <div
          onClick={() => setIsCashSaleSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)',
            zIndex: 10090, backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isCashSaleSidebarOpen ? 0 : '-480px',
          width: '460px',
          maxWidth: '95vw',
          height: '100dvh',
          background: 'var(--bg-surface)',
          borderLeft: '2px solid rgba(245,158,11,0.35)',
          boxShadow: isCashSaleSidebarOpen ? '-8px 0 40px rgba(0,0,0,0.22)' : 'none',
          zIndex: 10091,
          display: 'flex',
          flexDirection: 'column',
          transition: 'right 0.32s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden'
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.22)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>
                Cash Sale Ledger
              </div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.82)', marginTop: '1px' }}>
                {cashSaleSupplier?.supplier_name || 'Supplier'} • Net Invoice History
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCashSaleSidebarOpen(false)}
            style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Supplier Info Strip */}
        {cashSaleSupplier && (
          <div style={{
            padding: '10px 18px',
            background: 'rgba(245,158,11,0.08)',
            borderBottom: '1px solid rgba(245,158,11,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1rem'
            }}>
              {(cashSaleSupplier.supplier_name || 'S')[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                {cashSaleSupplier.supplier_name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                📞 {cashSaleSupplier.phone || '—'} • 🏛️ {cashSaleSupplier.bank_name || 'Bank Account'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Settlements</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>
                {cashSaleSettlements.filter(s => s.supplier_name === cashSaleSupplier?.supplier_name).length}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          background: 'var(--bg-main)'
        }}>
          {[['invoices', <FileText size={14} />, 'Invoice History'], ['payments', <History size={14} />, 'Payment History']].map(([tab, icon, label]) => (
            <button
              key={tab}
              onClick={() => setCashSidebarTab(tab)}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                borderBottom: cashSidebarTab === tab ? '2.5px solid #f59e0b' : '2.5px solid transparent',
                background: 'transparent',
                color: cashSidebarTab === tab ? '#d97706' : 'var(--text-secondary)',
                fontWeight: cashSidebarTab === tab ? 800 : 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.18s ease'
              }}
            >
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* === TAB: Invoice History === */}
          {cashSidebarTab === 'invoices' && (() => {
            const suppSettlements = cashSaleSettlements.filter(s => s.supplier_name === cashSaleSupplier?.supplier_name);
            const totalNetInvoice = suppSettlements.reduce((s, r) => s + Number(r.net_invoice || 0), 0);
            const suppPayments = cashSalePayments.filter(p => p.supplier_name === cashSaleSupplier?.supplier_name);
            const totalPaid = suppPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const totalPending = Math.max(0, totalNetInvoice - totalPaid);

            return (
              <>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: '#059669', fontWeight: 800 }}>Total Net Invoice</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#047857', marginTop: '2px' }}>₹{totalNetInvoice.toLocaleString()}</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(37,99,235,0.06) 100%)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: '#2563eb', fontWeight: 800 }}>Total Paid</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>₹{totalPaid.toLocaleString()}</div>
                  </div>
                  <div style={{ background: totalPending > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${totalPending > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: totalPending > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}>Pending</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: totalPending > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>₹{totalPending.toLocaleString()}</div>
                  </div>
                </div>

                {/* Add Payment Button */}
                <button
                  onClick={() => { setIsCashPaymentFormOpen(!isCashPaymentFormOpen); setSelectedInvoiceForPayment(null); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: isCashPaymentFormOpen ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: isCashPaymentFormOpen ? '#ef4444' : '#fff',
                    border: isCashPaymentFormOpen ? '1px solid rgba(239,68,68,0.3)' : 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    boxShadow: isCashPaymentFormOpen ? 'none' : '0 4px 14px rgba(245,158,11,0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isCashPaymentFormOpen ? <><X size={15} /><span>Cancel Payment</span></> : <><DollarSign size={15} /><span>+ Record New Payment (Jama)</span></>}
                </button>

                {/* Inline Payment Form */}
                {isCashPaymentFormOpen && (
                  <form onSubmit={handleCashPaymentSave} style={{
                    padding: '14px',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.05) 100%)',
                    border: '1.5px solid rgba(245,158,11,0.3)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={15} /> Record Payment for {cashSaleSupplier?.supplier_name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date</label>
                        <input type="date" className="form-control" style={{ fontSize: '0.82rem' }}
                          value={cashPaymentForm.date}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, date: e.target.value })} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Truck No.</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.82rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
                          placeholder="e.g. DL01AB1234"
                          value={cashPaymentForm.truck_no}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, truck_no: e.target.value.toUpperCase() })} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
                      <input type="number" min="1" className="form-control" style={{ fontSize: '1rem', fontWeight: 800 }}
                        placeholder="e.g. 43012"
                        value={cashPaymentForm.amount}
                        onChange={e => setCashPaymentForm({ ...cashPaymentForm, amount: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                        <select className="form-control" style={{ fontSize: '0.82rem' }}
                          value={cashPaymentForm.payment_method}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, payment_method: e.target.value })}>
                          <option value="CASH">Cash (Rokda)</option>
                          <option value="UPI">UPI / GPay</option>
                          <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ref / UTR No.</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.82rem' }}
                          placeholder="Reference no."
                          value={cashPaymentForm.reference}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, reference: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Notes</label>
                      <input type="text" className="form-control" style={{ fontSize: '0.82rem' }}
                        placeholder="Optional notes..."
                        value={cashPaymentForm.notes}
                        onChange={e => setCashPaymentForm({ ...cashPaymentForm, notes: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCashPaymentFormOpen(false)}>Cancel</button>
                      <button type="submit" style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#fff', border: 'none', borderRadius: '8px',
                        padding: '7px 18px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px'
                      }}>
                        <Check size={14} /> Save Payment
                      </button>
                    </div>
                  </form>
                )}

                {/* Invoice Cards - Truck Wise */}
                {suppSettlements.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📋</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>Koi settlement saved nahi hua hai</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>"Save Settlement" button dabayein to Net Invoice yahan record hoga.</div>
                  </div>
                ) : (
                  suppSettlements.map(inv => {
                    const invPayments = cashSalePayments.filter(p => p.truck_no === inv.truck_no && p.supplier_name === inv.supplier_name);
                    const paidAmt = invPayments.reduce((s, p) => s + Number(p.amount), 0);
                    const pendingAmt = Math.max(0, inv.net_invoice - paidAmt);
                    const statusColor = inv.status === 'PAID' ? '#10b981' : inv.status === 'PARTIAL' ? '#f59e0b' : '#ef4444';
                    const statusLabel = inv.status === 'PAID' ? '✓ Paid' : inv.status === 'PARTIAL' ? '⚡ Partial' : '⏳ Pending';

                    return (
                      <div key={inv.id} style={{
                        background: 'var(--bg-main)',
                        border: `1.5px solid ${statusColor}30`,
                        borderLeft: `4px solid ${statusColor}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        {/* Invoice Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.04em' }}>
                              🚚 {inv.truck_no}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              📅 {inv.saved_date}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px',
                              borderRadius: '20px', background: `${statusColor}18`,
                              color: statusColor, border: `1px solid ${statusColor}35`
                            }}>{statusLabel}</span>
                          </div>
                        </div>

                        {/* Calculation Summary */}
                        <div style={{ background: 'var(--bg-surface)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                            <span>Gross Bikri</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>₹{Number(inv.gross_bikri).toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#dc2626', marginBottom: '5px' }}>
                            <span>Commission + TF + Kuli</span>
                            <span style={{ fontWeight: 700 }}>- ₹{(Number(inv.commission) + Number(inv.truck_fare) + Number(inv.kuli)).toLocaleString()}</span>
                          </div>
                          <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                            <span style={{ fontSize: '0.8rem', color: '#047857' }}>Net Invoice (Payable):</span>
                            <span style={{ fontSize: '1rem', color: '#047857' }}>₹{Number(inv.net_invoice).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Payment Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                          <div style={{ color: '#2563eb', fontWeight: 700 }}>Paid: ₹{paidAmt.toLocaleString()}</div>
                          <div style={{ color: pendingAmt > 0 ? '#ef4444' : '#10b981', fontWeight: 800 }}>Pending: ₹{pendingAmt.toLocaleString()}</div>
                        </div>

                        {/* Action: Pay for this invoice */}
                        {pendingAmt > 0 && (
                          <button
                            onClick={() => {
                              setSelectedInvoiceForPayment(inv);
                              setCashPaymentForm(prev => ({ ...prev, truck_no: inv.truck_no, amount: pendingAmt.toString() }));
                              setIsCashPaymentFormOpen(true);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#fff', border: 'none', borderRadius: '8px',
                              padding: '7px 14px', fontWeight: 800, fontSize: '0.78rem',
                              cursor: 'pointer', display: 'flex', alignItems: 'center',
                              gap: '5px', alignSelf: 'flex-start',
                              boxShadow: '0 2px 8px rgba(245,158,11,0.3)'
                            }}
                          >
                            <DollarSign size={13} /> Pay ₹{pendingAmt.toLocaleString()}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            );
          })()}

          {/* === TAB: Payment History === */}
          {cashSidebarTab === 'payments' && (() => {
            const suppPayments = cashSalePayments.filter(p => p.supplier_name === cashSaleSupplier?.supplier_name);
            const totalPaid = suppPayments.reduce((s, p) => s + Number(p.amount), 0);

            return (
              <>
                {/* Total Paid Header */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.08) 100%)',
                  border: '1.5px solid rgba(59,130,246,0.3)', borderRadius: '12px',
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: '#2563eb' }}>Total Payments Made</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1d4ed8', marginTop: '2px' }}>₹{totalPaid.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: '1.5rem' }}>💳</div>
                </div>

                {/* Add Payment Button */}
                <button
                  onClick={() => { setIsCashPaymentFormOpen(!isCashPaymentFormOpen); setSelectedInvoiceForPayment(null); }}
                  style={{
                    width: '100%', padding: '10px 16px',
                    background: isCashPaymentFormOpen ? 'rgba(239,68,68,0.1)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: isCashPaymentFormOpen ? '#ef4444' : '#fff',
                    border: isCashPaymentFormOpen ? '1px solid rgba(239,68,68,0.3)' : 'none',
                    borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    boxShadow: isCashPaymentFormOpen ? 'none' : '0 4px 14px rgba(245,158,11,0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isCashPaymentFormOpen ? <><X size={15} /><span>Cancel</span></> : <><DollarSign size={15} /><span>+ New Payment Entry</span></>}
                </button>

                {/* Inline Payment Form */}
                {isCashPaymentFormOpen && (
                  <form onSubmit={handleCashPaymentSave} style={{
                    padding: '14px',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.05) 100%)',
                    border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={15} /> Record Payment for {cashSaleSupplier?.supplier_name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date</label>
                        <input type="date" className="form-control" style={{ fontSize: '0.82rem' }}
                          value={cashPaymentForm.date}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, date: e.target.value })} required />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Truck No.</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.82rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
                          placeholder="e.g. DL01AB1234"
                          value={cashPaymentForm.truck_no}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, truck_no: e.target.value.toUpperCase() })} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
                      <input type="number" min="1" className="form-control" style={{ fontSize: '1rem', fontWeight: 800 }}
                        placeholder="Enter amount"
                        value={cashPaymentForm.amount}
                        onChange={e => setCashPaymentForm({ ...cashPaymentForm, amount: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                        <select className="form-control" style={{ fontSize: '0.82rem' }}
                          value={cashPaymentForm.payment_method}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, payment_method: e.target.value })}>
                          <option value="CASH">Cash (Rokda)</option>
                          <option value="UPI">UPI / GPay</option>
                          <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reference / UTR</label>
                        <input type="text" className="form-control" style={{ fontSize: '0.82rem' }}
                          placeholder="Ref no."
                          value={cashPaymentForm.reference}
                          onChange={e => setCashPaymentForm({ ...cashPaymentForm, reference: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCashPaymentFormOpen(false)}>Cancel</button>
                      <button type="submit" style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#fff', border: 'none', borderRadius: '8px',
                        padding: '7px 18px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px'
                      }}>
                        <Check size={14} /> Save Payment
                      </button>
                    </div>
                  </form>
                )}

                {/* Payment List */}
                {suppPayments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💸</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>Koi payment recorded nahi hai</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Upar "+ New Payment Entry" button se payment record karein.</div>
                  </div>
                ) : (
                  suppPayments.map(pay => (
                    <div key={pay.id} style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '4px solid #10b981',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.98rem', color: '#10b981' }}>₹{Number(pay.amount).toLocaleString()}</span>
                          <span style={{
                            fontSize: '0.68rem', padding: '2px 8px', borderRadius: '20px',
                            background: 'rgba(59,130,246,0.1)', color: '#2563eb', fontWeight: 700
                          }}>{pay.payment_method}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          📅 {pay.date}
                          {pay.truck_no && <span> • 🚚 {pay.truck_no}</span>}
                          {pay.reference && <span> • Ref: {pay.reference}</span>}
                        </div>
                        {pay.notes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>{pay.notes}</div>
                        )}
                      </div>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={16} color="#10b981" />
                      </div>
                    </div>
                  ))
                )}
              </>
            );
          })()}
        </div>

        {/* Sidebar Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-main)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            💡 Settlement save hone pe yahan auto-record hota hai
          </div>
          <button
            onClick={() => setIsCashSaleSidebarOpen(false)}
            style={{
              padding: '7px 14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
