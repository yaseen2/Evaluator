import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CreditCard,
  Key,
  RefreshCw,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Search,
  Zap,
  FileCheck,
  TrendingUp,
  Clock,
  Ticket,
  X
} from 'lucide-react';
import {
  createSubscriptionVoucher,
  fetchAllVouchers,
  fetchAllCandidates,
  adminGrantCreditsToUser,
  savePlatformGeminiConfig,
  getPlatformGeminiConfig,
  savePaymentConfig,
  getPaymentConfig,
  fetchAllPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest
} from '../services/firebase';
import { AVAILABLE_MODELS, getStoredApiKey } from '../services/geminiApi';

export const AdminConsole = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'candidates' | 'vouchers' | 'settings'
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateTierFilter, setCandidateTierFilter] = useState('all'); // 'all' | 'free' | 'pro' | 'academy'

  // Interactive States
  const [copiedCode, setCopiedCode] = useState(null);
  const [toppedUpUid, setToppedUpUid] = useState(null);
  const [processingReqId, setProcessingReqId] = useState(null);
  const [receiptModalUrl, setReceiptModalUrl] = useState(null);

  // Custom Voucher Form
  const [customVoucherCode, setCustomVoucherCode] = useState('');
  const [customVoucherCredits, setCustomVoucherCredits] = useState(500);
  const [customVoucherTier, setCustomVoucherTier] = useState('pro');

  // Platform Gemini Config State
  const [platformKey, setPlatformKey] = useState('');
  const [platformModel, setPlatformModel] = useState('auto');

  // Payment & Direct Checkout Config State
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [bankOrWalletName, setBankOrWalletName] = useState('JazzCash / EasyPaisa / RAAST');
  const [paymentAccountTitle, setPaymentAccountTitle] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [aspirantCheckoutUrl, setAspirantCheckoutUrl] = useState('');
  const [proCheckoutUrl, setProCheckoutUrl] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, voucherList, candidateList, geminiCfg, payCfg] = await Promise.all([
        fetchAllPaymentRequests(),
        fetchAllVouchers(),
        fetchAllCandidates(),
        getPlatformGeminiConfig(),
        getPaymentConfig()
      ]);
      setPaymentRequests(reqList);
      setVouchers(voucherList);
      setCandidates(candidateList);

      if (geminiCfg?.apiKey) {
        setPlatformKey(geminiCfg.apiKey);
        setPlatformModel(geminiCfg.defaultModel || 'auto');
      } else if (getStoredApiKey()) {
        setPlatformKey(getStoredApiKey());
      }

      if (payCfg) {
        setWhatsappNumber(payCfg.whatsappNumber || '');
        setBankOrWalletName(payCfg.bankOrWalletName || 'JazzCash / EasyPaisa / RAAST');
        setPaymentAccountTitle(payCfg.paymentAccountTitle || '');
        setPaymentAccountNumber(payCfg.paymentAccountNumber || '');
        setAspirantCheckoutUrl(payCfg.aspirantCheckoutUrl || '');
        setProCheckoutUrl(payCfg.proCheckoutUrl || '');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Executive KPIs
  const pendingPaymentsCount = paymentRequests.filter((r) => r.status === 'pending').length;
  const approvedRevenuePKR = paymentRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => {
      const num = parseInt(String(r.pricePKR || '0').replace(/[^0-9]/g, ''), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  const paidSubscribersCount = candidates.filter(
    (c) => c.role !== 'admin' && (c.tier === 'pro' || c.tier === 'academy' || c.tier === 'aspirant')
  ).length;
  const totalPapersEvaluated = candidates.reduce((acc, c) => acc + Number(c.evaluationsCount || 0), 0);
  const totalPlatformTokens = candidates.reduce((acc, c) => acc + Number(c.totalTokensConsumed || 0), 0);
  const totalPlatformCreditsUsed = candidates.reduce((acc, c) => acc + Number(c.totalCreditsUsed || 0), 0);

  // Handlers
  const handleApproveRequest = async (reqId) => {
    setProcessingReqId(reqId);
    try {
      const approved = await approvePaymentRequest(reqId);
      setPaymentRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'approved', approvedAt: approved.approvedAt } : r))
      );
      setCandidates((prev) =>
        prev.map((c) =>
          c.uid === approved.userId ? { ...c, credits: approved.updatedCredits, tier: approved.planId } : c
        )
      );
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectRequest = async (reqId) => {
    setProcessingReqId(reqId);
    try {
      await rejectPaymentRequest(reqId);
      setPaymentRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r)));
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleGenerateVoucher = async (credits, tier, label, customCode = '') => {
    setLoading(true);
    try {
      const created = await createSubscriptionVoucher({ credits, tier, label, customCode });
      setVouchers((prev) => [created, ...prev]);
      setCustomVoucherCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGrant = async (uid, credits, tier) => {
    setLoading(true);
    try {
      const updated = await adminGrantCreditsToUser(uid, credits, tier);
      setCandidates((prev) => prev.map((c) => (c.uid === uid ? { ...c, ...updated } : c)));
      setToppedUpUid(uid);
      setTimeout(() => setToppedUpUid(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        savePlatformGeminiConfig({
          apiKey: platformKey,
          defaultModel: platformModel
        }),
        savePaymentConfig({
          whatsappNumber,
          bankOrWalletName,
          paymentAccountTitle,
          paymentAccountNumber,
          aspirantCheckoutUrl,
          proCheckoutUrl
        })
      ]);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Lists
  const filteredPayments = paymentRequests.filter((req) => {
    if (paymentFilter !== 'all' && req.status !== paymentFilter) return false;
    if (!paymentSearch.trim()) return true;
    const q = paymentSearch.toLowerCase();
    return (
      (req.userName || '').toLowerCase().includes(q) ||
      (req.userEmail || '').toLowerCase().includes(q) ||
      (req.transactionId || '').toLowerCase().includes(q) ||
      (req.senderAccount || '').toLowerCase().includes(q)
    );
  });

  const filteredCandidates = candidates.filter((c) => {
    if (candidateTierFilter !== 'all' && (c.tier || 'free') !== candidateTierFilter) return false;
    if (!candidateSearch.trim()) return true;
    const q = candidateSearch.toLowerCase();
    return (
      (c.displayName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 text-slate-900 min-h-full h-full py-8 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Admin Header */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  SaaS Owner Control Center
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Platform Operations &amp; Admin Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Syncing...' : 'Refresh Cloud Data'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('hub')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1d6ef2] hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <FileCheck size={14} />
              <span>Evaluation Hub</span>
            </button>
          </div>
        </div>

        {/* 5-Card Executive KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            onClick={() => {
              setActiveTab('payments');
              setPaymentFilter('pending');
            }}
            className={`rounded-2xl p-4 border shadow-2xs cursor-pointer transition-all ${
              pendingPaymentsCount > 0
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200/50'
                : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Pending Queue</span>
              <Clock size={16} className={pendingPaymentsCount > 0 ? 'text-amber-600' : 'text-slate-400'} />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {pendingPaymentsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {pendingPaymentsCount > 0 ? 'Requires TID verification' : 'All payments cleared'}
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Approved Revenue</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-700">
              Rs. {approvedRevenuePKR.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {paymentRequests.filter((r) => r.status === 'approved').length} verified transactions
            </p>
          </div>

          <div
            onClick={() => setActiveTab('candidates')}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs cursor-pointer hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Candidates</span>
              <Users size={16} className="text-[#1d6ef2]" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {candidates.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {paidSubscribersCount} Paid Pro/Academy • {Math.max(0, candidates.length - paidSubscribersCount)} Free
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Papers Graded</span>
              <FileCheck size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {totalPapersEvaluated}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Across all CSS/PMS subjects
            </p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Token Telemetry</span>
              <Zap size={16} className="text-amber-500 fill-current" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900">
              {(totalPlatformTokens / 1000).toFixed(1)}k
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalPlatformCreditsUsed} platform credits burned
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/90 p-1.5 rounded-2xl shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-[#1d6ef2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={16} />
            <span>Payment Queue</span>
            {pendingPaymentsCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'payments' ? 'bg-white text-[#1d6ef2]' : 'bg-amber-500 text-white'
                }`}
              >
                {pendingPaymentsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'candidates'
                ? 'bg-[#1d6ef2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users size={16} />
            <span>Candidate CRM ({candidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vouchers')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'vouchers'
                ? 'bg-[#1d6ef2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Ticket size={16} />
            <span>Vouchers ({vouchers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#1d6ef2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Key size={16} />
            <span>AI &amp; Bank Settings</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: PAYMENT VERIFICATION QUEUE                            */}
        {/* ============================================================ */}
        {activeTab === 'payments' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search by candidate name, email, or TID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#1d6ef2] focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPaymentFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      paymentFilter === status
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                No payment verification requests match your current filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((req) => (
                  <div
                    key={req.id}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      req.status === 'pending'
                        ? 'bg-amber-50/40 border-amber-200/90'
                        : 'bg-slate-50/50 border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {req.userName || 'CSS Candidate'}
                        </span>
                        <span className="text-xs text-slate-500">({req.userEmail})</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1d6ef2] border border-blue-200/60">
                          {req.planName} • {req.pricePKR} (+{req.credits} Credits)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span>
                          <strong>Method:</strong> {req.paymentMethod}
                        </span>
                        <span>
                          <strong>TID:</strong>{' '}
                          <code className="font-mono font-bold text-[#1d6ef2] bg-blue-50/80 px-1.5 py-0.5 rounded">
                            {req.transactionId}
                          </code>
                        </span>
                        {req.senderAccount && (
                          <span>
                            <strong>Sender:</strong> {req.senderAccount}
                          </span>
                        )}
                        <span className="text-slate-400">
                          {req.createdAt?.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {req.receiptImageDataUrl && (
                        <button
                          type="button"
                          onClick={() => setReceiptModalUrl(req.receiptImageDataUrl)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#1d6ef2] text-slate-700 hover:text-[#1d6ef2] text-xs font-bold transition-colors cursor-pointer"
                        >
                          <ImageIcon size={14} />
                          <span>Inspect Receipt</span>
                        </button>
                      )}

                      {req.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={processingReqId === req.id}
                            onClick={() => handleApproveRequest(req.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 size={14} />
                            <span>
                              {processingReqId === req.id
                                ? 'Approving...'
                                : `Approve (+${req.credits} Credits)`}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={processingReqId === req.id}
                            onClick={() => handleRejectRequest(req.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>Decline</span>
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {req.status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span>
                            {req.status === 'approved'
                              ? `Approved (+${req.credits} Credits)`
                              : 'Declined'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CANDIDATE CRM DIRECTORY                               */}
        {/* ============================================================ */}
        {activeTab === 'candidates' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  placeholder="Search candidates by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#1d6ef2] focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {['all', 'free', 'pro', 'academy'].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setCandidateTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      candidateTierFilter === tier
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                No candidates match your search criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCandidates.map((c) => (
                  <div
                    key={c.uid}
                    className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {c.displayName || 'CSS Candidate'}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            c.role === 'admin'
                              ? 'bg-amber-100 text-amber-900'
                              : c.tier === 'academy'
                              ? 'bg-purple-100 text-purple-800'
                              : c.tier === 'pro'
                              ? 'bg-blue-100 text-[#1d6ef2]'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {c.role === 'admin' ? 'Admin' : c.tier || 'free'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span>{c.email}</span>
                        <span>•</span>
                        <span>
                          Papers Graded: <strong className="text-slate-800">{c.evaluationsCount || 0}</strong>
                        </span>
                        {c.totalTokensConsumed ? (
                          <>
                            <span>•</span>
                            <span>Tokens: {(c.totalTokensConsumed / 1000).toFixed(1)}k</span>
                          </>
                        ) : null}
                        <span>•</span>
                        <span>
                          Balance:{' '}
                          <strong className="text-emerald-600 font-mono">
                            {c.role === 'admin' ? '∞' : `${c.credits ?? 0} Credits`}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {c.role !== 'admin' && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {toppedUpUid === c.uid && (
                          <span className="text-xs font-bold text-emerald-600 mr-1">
                            ✓ Credits Added!
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDirectGrant(c.uid, 100, c.tier || 'pro')}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          +100 Boost
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDirectGrant(c.uid, 500, 'pro')}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1d6ef2] border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          +500 Pro
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleDirectGrant(c.uid, 1500, 'academy')}
                          className="px-3 py-1.5 rounded-xl bg-[#1d6ef2] hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          +1,500 Academy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: VOUCHERS & PROMO CODE ENGINE                          */}
        {/* ============================================================ */}
        {activeTab === 'vouchers' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                1-Click Instant Voucher Generators
              </h3>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGenerateVoucher(100, 'pro', 'Starter Boost (100 Credits)')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Generate +100 Credits Code</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleGenerateVoucher(500, 'pro', 'Aspirant Pro (500 Credits • Rs. 2,999)')
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1d6ef2] hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Generate +500 Pro Code (Rs. 2,999)</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleGenerateVoucher(1500, 'academy', 'Academy Intensive (1,500 Credits • Rs. 6,999)')
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Generate +1,500 Academy Code (Rs. 6,999)</span>
                </button>
              </div>
            </div>

            {/* Custom Voucher Builder */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Custom Code Name (Optional)
                </label>
                <input
                  type="text"
                  value={customVoucherCode}
                  onChange={(e) => setCustomVoucherCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAHORE-ACADEMY-500"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Credits
                </label>
                <input
                  type="number"
                  value={customVoucherCredits}
                  onChange={(e) => setCustomVoucherCredits(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Target Tier
                </label>
                <select
                  value={customVoucherTier}
                  onChange={(e) => setCustomVoucherTier(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="pro">Aspirant Pro</option>
                  <option value="academy">Academy Intensive</option>
                </select>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleGenerateVoucher(
                    customVoucherCredits,
                    customVoucherTier,
                    `Custom ${customVoucherTier.toUpperCase()} (${customVoucherCredits} Credits)`,
                    customVoucherCode
                  )
                }
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Create Custom Code
              </button>
            </div>

            {/* Vouchers List */}
            <div className="space-y-2.5">
              {vouchers.map((v) => (
                <div
                  key={v.code}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <code className="font-mono font-extrabold text-sm text-[#1d6ef2]">
                        {v.code}
                      </code>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          v.isRedeemed
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {v.isRedeemed ? 'Redeemed' : 'Available'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {v.label} • +{v.credits} Credits
                      {v.isRedeemed && v.redeemedByEmail ? ` • Used by ${v.redeemedByEmail}` : ''}
                    </p>
                  </div>

                  {!v.isRedeemed && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(v.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#1d6ef2] text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      {copiedCode === v.code ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PLATFORM AI ENGINE & PAYMENT SETTINGS                 */}
        {/* ============================================================ */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Master Gemini AI Engine */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 text-[#1d6ef2] font-bold text-base">
                <Key size={18} />
                <h2>Subscriber Master Gemini AI Engine</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This master key and model power evaluations for all signed-in candidates using platform credits.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Default Subscriber Gemini Model
                </label>
                <select
                  value={platformModel}
                  onChange={(e) => setPlatformModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Platform Master Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={platformKey}
                  onChange={(e) => setPlatformKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            {/* RAAST / Bank / Wallet Checkout Details */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 text-[#1d6ef2] font-bold text-base">
                <CreditCard size={18} />
                <h2>RAAST / Bank / Mobile Wallet Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Wallet Number
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="0300-XXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank / Wallet Name
                  </label>
                  <input
                    type="text"
                    value={bankOrWalletName}
                    onChange={(e) => setBankOrWalletName(e.target.value)}
                    placeholder="Meezan Bank / RAAST"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Title
                  </label>
                  <input
                    type="text"
                    value={paymentAccountTitle}
                    onChange={(e) => setPaymentAccountTitle(e.target.value)}
                    placeholder="Account Holder Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IBAN / RAAST Account Number
                  </label>
                  <input
                    type="text"
                    value={paymentAccountNumber}
                    onChange={(e) => setPaymentAccountNumber(e.target.value)}
                    placeholder="PK..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1d6ef2] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition-all"
                >
                  {configSaved ? (
                    <>
                      <Check size={16} />
                      <span>Saved All Settings to Cloud!</span>
                    </>
                  ) : (
                    <span>Save AI &amp; Payment Settings</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Lightbox Modal */}
      {receiptModalUrl && (
        <div
          onClick={() => setReceiptModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Payment Receipt Verification</span>
              <button
                type="button"
                onClick={() => setReceiptModalUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-900/5 flex justify-center max-h-[75vh] overflow-auto">
              <img
                src={receiptModalUrl}
                alt="Payment Receipt"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

