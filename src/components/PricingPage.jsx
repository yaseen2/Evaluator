import React, { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  CheckCircle2,
  Minus,
  Copy,
  ExternalLink,
  QrCode,
  Smartphone,
  Building2,
  CreditCard,
  Upload,
  Image as ImageIcon,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Tag,
  HelpCircle,
  MessageCircle,
  FileText,
  X,
  Zap,
  Award,
  AlertCircle
} from 'lucide-react';
import {
  getPaymentConfig,
  submitPaymentRequest,
  fetchUserPaymentRequests,
  redeemSubscriptionVoucher
} from '../services/firebase';

export const PricingPage = ({
  user,
  userProfile,
  onOpenAuth,
  setActiveView,
  onProfileUpdated
}) => {
  // Plan Selection State: 'free' | 'pro' | 'academy'
  const [selectedPlan, setSelectedPlan] = useState('pro');
  
  // Payment Method Tabs: 'raast' | 'wallet' | 'bank'
  const [activeTab, setActiveTab] = useState('raast');
  
  // Payment Form Fields
  const [transactionId, setTransactionId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [receiptImageDataUrl, setReceiptImageDataUrl] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(null);
  const [voucherError, setVoucherError] = useState(null);
  
  // UI Feedback States
  const [copiedId, setCopiedId] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  
  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(0);
  
  // Firebase Data
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [userRequests, setUserRequests] = useState([]);

  // Fetch payment configuration & candidate requests
  useEffect(() => {
    getPaymentConfig().then((cfg) => {
      if (cfg) setPaymentConfig(cfg);
    });
    if (user?.uid) {
      fetchUserPaymentRequests(user.uid).then(setUserRequests);
    } else {
      setUserRequests([]);
    }
  }, [user?.uid]);

  // Pricing Plan Definitions
  const plans = [
    {
      id: 'free',
      tierBadge: 'Starter',
      subBadge: 'No Card Required',
      title: 'Free Trial',
      description: 'Test our AI examiner capability with one complete essay evaluation.',
      pricePKR: 0,
      priceDisplay: 'Rs. 0',
      period: '/ forever',
      credits: 30,
      features: [
        { label: '1 Free Evaluation (CSS / PMS)', included: true, bold: true },
        { label: 'Basic Examiner Feedback', included: true },
        { label: 'Multi-Agent Deep Rubrics', included: false },
        { label: '1-on-1 Topper Rewrites', included: false }
      ],
      buttonLabel: 'Select Free Tier',
      isPopular: false
    },
    {
      id: 'pro',
      tierBadge: 'Pro Aspirant',
      subBadge: 'Save 30% Annual',
      popularBadge: 'MOST POPULAR — AI EVALUATOR',
      title: 'Aspirant Pro',
      description: 'Designed for serious candidates aiming for top 10 CSS/PMS allocations.',
      pricePKR: 2999,
      priceDisplay: 'Rs. 2,999',
      period: '/ month',
      credits: 500,
      features: [
        { label: '30 Full Essay Evaluations / month', included: true, bold: true },
        { label: 'Multi-Agent Rubrics (FPSC Standard)', included: true, bold: true },
        { label: '1-on-1 Topper Rewrites & outlines', included: true, bold: true },
        { label: 'Detailed Examiner Blueprint PDF', included: true }
      ],
      buttonLabel: 'Selected Plan (Pro)',
      isPopular: true
    },
    {
      id: 'academy',
      tierBadge: 'Intensive',
      subBadge: 'VIP Mentorship',
      title: 'Academy Intensive',
      description: 'Complete preparation package with live mentor access and unlimited evals.',
      pricePKR: 6999,
      priceDisplay: 'Rs. 6,999',
      period: '/ season',
      credits: 1500,
      features: [
        { label: 'Unlimited Evaluations', included: true, bold: true },
        { label: 'Priority DAG Pipeline (Zero wait)', included: true, bold: true },
        { label: 'WhatsApp Mentor Support 24/7', included: true, bold: true },
        { label: 'Optional CSS Officer Mock Interview', included: true }
      ],
      buttonLabel: 'Select Academy Tier',
      isPopular: false
    }
  ];

  const currentPlanObj = plans.find((p) => p.id === selectedPlan) || plans[1];

  // Calculation for discount
  let finalPrice = currentPlanObj.pricePKR;
  if (voucherApplied && finalPrice > 0) {
    if (voucherApplied.discountPercent) {
      finalPrice = Math.round(finalPrice * (1 - voucherApplied.discountPercent / 100));
    } else if (voucherApplied.discountAmount) {
      finalPrice = Math.max(0, finalPrice - voucherApplied.discountAmount);
    }
  }

  // Raast and Bank Details
  const defaultRaastIban = paymentConfig?.paymentAccountNumber || 'PK03MEZN0001234567890102';
  const defaultAccountTitle = paymentConfig?.paymentAccountTitle || 'JawabCheck EdTech SMC-Pvt Ltd';
  const defaultBankName = paymentConfig?.bankOrWalletName || 'Meezan Bank - Blue Area Branch, Islamabad (0201)';
  const defaultWalletNumber = paymentConfig?.whatsappNumber || '0300-9876543';

  // Handle Copy ID
  const handleCopy = (text, setCopiedFn) => {
    navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2500);
  };

  // Handle Receipt Upload with Client Compression
  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        setReceiptImageDataUrl(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle Promo / Voucher Code
  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    setVoucherError(null);
    setVoucherApplied(null);

    if (!code) {
      setVoucherError('Please enter a voucher code.');
      return;
    }

    // Direct voucher discounts
    if (code === 'CSS2024' || code === 'TOPPER15' || code === 'FPSC15') {
      setVoucherApplied({ code, discountPercent: 15, message: `✓ 15% CSS Aspirant discount active for code ${code}` });
      return;
    }
    if (code === 'EARLYBIRD' || code === 'PASSCSS') {
      setVoucherApplied({ code, discountPercent: 20, message: `✓ 20% Early Bird discount active for code ${code}` });
      return;
    }

    // Firebase database voucher check
    if (user?.uid) {
      try {
        const res = await redeemSubscriptionVoucher(code, user.uid);
        if (res?.success) {
          setVoucherApplied({ code, message: `✓ Code redeemed: ${res.creditsGranted} credits added immediately!` });
          onProfileUpdated?.();
          return;
        }
      } catch (err) {
        setVoucherError(err.message || 'Invalid or expired voucher code.');
        return;
      }
    }

    setVoucherError('Invalid promo code. Please check and try again.');
  };

  // Handle Payment Form Submission
  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    setSubmissionError(null);
    setSubmissionSuccess(null);

    if (currentPlanObj.pricePKR === 0) {
      // Free Plan Selection
      if (!user) {
        onOpenAuth?.();
        return;
      }
      setSubmissionSuccess({
        message: 'You are on the Free Trial tier! Enjoy your free evaluation credits.',
        planName: currentPlanObj.title
      });
      return;
    }

    if (!user) {
      onOpenAuth?.();
      return;
    }

    const cleanTid = transactionId.trim();
    if (!cleanTid && !receiptImageDataUrl) {
      setSubmissionError('Please enter your 12-digit Raast Transaction ID (TID) or attach your payment receipt screenshot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await submitPaymentRequest({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userProfile?.displayName,
        planId: currentPlanObj.id,
        planName: currentPlanObj.title,
        pricePKR: `Rs. ${finalPrice.toLocaleString()}`,
        credits: currentPlanObj.credits,
        paymentMethod:
          activeTab === 'raast'
            ? 'Raast Instant Pay (Meezan)'
            : activeTab === 'wallet'
            ? 'JazzCash / EasyPaisa'
            : 'Bank Transfer (IBAN)',
        transactionId: cleanTid || 'Receipt Attached',
        senderAccount: senderAccount.trim(),
        receiptImageDataUrl
      });

      setSubmissionSuccess({
        message: 'Payment verification submitted successfully! Your credits will be added in less than 5 minutes upon Raast TID verification.',
        requestId: payload.id,
        planName: currentPlanObj.title,
        amount: `Rs. ${finalPrice.toLocaleString()}`
      });

      // Reset form
      setTransactionId('');
      setSenderAccount('');
      setReceiptImageDataUrl(null);
      setReceiptFileName('');

      // Refresh candidate request history
      const reqs = await fetchUserPaymentRequests(user.uid);
      setUserRequests(reqs);
    } catch (err) {
      setSubmissionError(err.message || 'Submission failed. Please try again or message WhatsApp support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      q: 'How fast are credits added after payment?',
      a: 'Credits are added in under 5 minutes when using Raast Instant Pay with a valid Transaction ID (TID). For manual bank wire transfers or receipt uploads without matching TID, admin approval takes up to 2 hours during peak study hours.'
    },
    {
      q: 'Are my essays evaluated by human examiners or AI?',
      a: 'JawabCheck uses a sophisticated Multi-Agent AI DAG pipeline calibrated strictly against FPSC CSS/PMS marking rubrics (Structure, Coherence, Vocabulary, Critical Argument). Academy Intensive plans also include periodic mentor checks and officer guidance.'
    },
    {
      q: 'Can I request a refund if I am not satisfied?',
      a: 'Yes! We offer a 7-day unconditional guarantee. If our AI evaluation quality does not meet your expectations, contact support via WhatsApp or email for a full, hassle-free refund.'
    },
    {
      q: 'How does Raast Instant Pay work?',
      a: 'Raast is State Bank of Pakistan’s real-time payment system. Simply open your bank app (Meezan, HBL, Alfalah, NBP, Nayapay, Sadapay), select Raast, scan our QR code or paste our Company Raast IBAN, and transfer the exact amount with zero transaction fees.'
    }
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#faf8ff', color: '#131b2e', paddingBottom: '80px', height: 'calc(100vh - 64px)' }}>
      {/* Top Breadcrumb & Heading Section */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(29, 110, 242, 0.08)', color: '#1d6ef2', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '16px' }}>
          <Shield size={14} />
          <span>SECURE CHECKOUT PORTAL</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif, "Newsreader", serif)', fontSize: 'clamp(2rem, 4vw, 2.85rem)', fontWeight: 700, color: '#131b2e', letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.2 }}>
          Accelerate Your CSS & PMS Journey
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Select your evaluation tier below and complete instant local verification to unlock multi-agent AI paper grading calibrated to FPSC standards.
        </p>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* STEP 1: Plan Selection */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1d6ef2', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                1
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#131b2e' }}>
                Choose Your Subscription Tier
              </h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              Billed securely in PKR • No Hidden Fees
            </span>
          </div>

          {/* 3-Tier Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: isSelected
                      ? '2px solid #1d6ef2'
                      : '1px solid #e2e8f0',
                    padding: '28px 24px',
                    boxShadow: isSelected
                      ? '0 12px 30px rgba(29, 110, 242, 0.12)'
                      : '0 2px 10px rgba(0, 0, 0, 0.03)',
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transform: isSelected ? 'scale(1.015)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Floating Most Popular Badge */}
                  {p.popularBadge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-13px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1d6ef2',
                        color: '#ffffff',
                        padding: '3px 14px',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 6px rgba(29, 110, 242, 0.3)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {p.popularBadge}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: isSelected ? 'rgba(29, 110, 242, 0.1)' : '#f1f5f9',
                          color: isSelected ? '#1d6ef2' : '#475569'
                        }}
                      >
                        {p.tierBadge}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#1d6ef2' : '#64748b' }}>
                        {p.subBadge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 6px', color: '#131b2e' }}>
                      {p.title}
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0 0 18px', minHeight: '38px', lineHeight: 1.45 }}>
                      {p.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '22px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: '#131b2e', letterSpacing: '-0.02em' }}>
                        {p.priceDisplay}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        {p.period}
                      </span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {p.features.map((f, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem' }}>
                          {f.included ? (
                            <Check size={16} color="#00865c" style={{ flexShrink: 0, marginTop: '2px' }} />
                          ) : (
                            <Minus size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                          )}
                          <span style={{ color: f.included ? '#1e293b' : '#94a3b8', fontWeight: f.bold ? 700 : 400 }}>
                            {f.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #1d6ef2' : '1px solid #cbd5e1',
                      background: isSelected ? '#1d6ef2' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      boxShadow: isSelected ? '0 4px 12px rgba(29, 110, 242, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected ? `✓ Selected (${p.title})` : p.buttonLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP 2: Instant Pakistani Payment & Verification */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            marginBottom: '40px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1d6ef2', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                2
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#131b2e' }}>
                Instant Pakistani Payment & Verification
              </h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#00865c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={14} />
              Instant verification via State Bank Raast Gateway
            </span>
          </div>

          {/* Payment Tabs Navigation */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              background: '#f8fafc',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '28px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('raast')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: activeTab === 'raast' ? '1px solid #1d6ef2' : 'none',
                background: activeTab === 'raast' ? '#ffffff' : 'transparent',
                color: activeTab === 'raast' ? '#1d6ef2' : '#64748b',
                fontWeight: activeTab === 'raast' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'raast' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <QrCode size={20} />
              <span>Raast Instant Pay (Recommended)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wallet')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: activeTab === 'wallet' ? '1px solid #1d6ef2' : 'none',
                background: activeTab === 'wallet' ? '#ffffff' : 'transparent',
                color: activeTab === 'wallet' ? '#1d6ef2' : '#64748b',
                fontWeight: activeTab === 'wallet' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'wallet' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Smartphone size={20} />
              <span>JazzCash / EasyPaisa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: activeTab === 'bank' ? '1px solid #1d6ef2' : 'none',
                background: activeTab === 'bank' ? '#ffffff' : 'transparent',
                color: activeTab === 'bank' ? '#1d6ef2' : '#64748b',
                fontWeight: activeTab === 'bank' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'bank' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={20} />
              <span>Bank Transfer (IBAN)</span>
            </button>
          </div>

          {/* TAB 1: Raast Instant Pay */}
          {activeTab === 'raast' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start', marginBottom: '24px' }}>
              {/* Left Column: QR Code & Bank Info */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    background: '#ecfdf5',
                    color: '#065f46',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    marginBottom: '16px'
                  }}
                >
                  Instant Scan & Pay via Any Banking App
                </span>

                {/* Styled Raast QR Graphic */}
                <div
                  style={{
                    width: '190px',
                    height: '190px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    position: 'relative'
                  }}
                >
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                    {/* Corner Squares */}
                    <rect x="5" y="5" width="28" height="28" fill="#131b2e" rx="3" />
                    <rect x="9" y="9" width="20" height="20" fill="#ffffff" rx="2" />
                    <rect x="13" y="13" width="12" height="12" fill="#1d6ef2" rx="1.5" />

                    <rect x="67" y="5" width="28" height="28" fill="#131b2e" rx="3" />
                    <rect x="71" y="9" width="20" height="20" fill="#ffffff" rx="2" />
                    <rect x="75" y="13" width="12" height="12" fill="#1d6ef2" rx="1.5" />

                    <rect x="5" y="67" width="28" height="28" fill="#131b2e" rx="3" />
                    <rect x="9" y="71" width="20" height="20" fill="#ffffff" rx="2" />
                    <rect x="13" y="75" width="12" height="12" fill="#1d6ef2" rx="1.5" />

                    {/* QR Matrix Bits */}
                    <rect x="38" y="10" width="8" height="8" fill="#131b2e" />
                    <rect x="50" y="10" width="10" height="8" fill="#131b2e" />
                    <rect x="38" y="24" width="22" height="8" fill="#131b2e" />
                    <rect x="10" y="38" width="20" height="8" fill="#131b2e" />
                    <rect x="38" y="38" width="24" height="24" fill="#1d6ef2" rx="4" />
                    <rect x="70" y="38" width="20" height="8" fill="#131b2e" />
                    <rect x="70" y="50" width="10" height="8" fill="#131b2e" />
                    <rect x="10" y="50" width="12" height="10" fill="#131b2e" />
                    <rect x="38" y="68" width="10" height="22" fill="#131b2e" />
                    <rect x="54" y="68" width="18" height="10" fill="#131b2e" />
                    <rect x="76" y="68" width="14" height="22" fill="#131b2e" />
                    <rect x="54" y="82" width="18" height="8" fill="#131b2e" />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      background: '#1d6ef2',
                      color: '#ffffff',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    RAAST PAY
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
                  Open Meezan, NBP, HBL, Alfalah, Nayapay or Sadapay app and scan to pay exact amount.
                </p>

                <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>Account Title:</span>
                    <strong style={{ color: '#131b2e' }}>{defaultAccountTitle}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>Bank:</span>
                    <strong style={{ color: '#131b2e' }}>Meezan Bank</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Copy IBAN, TID input & Screenshot Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1-Click Copy Raast ID Box */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Company Raast ID / IBAN
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '1rem', color: '#131b2e' }}>
                      {defaultRaastIban}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(defaultRaastIban, setCopiedId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: copiedId ? '#ecfdf5' : '#f1f5f9',
                      color: copiedId ? '#059669' : '#1d6ef2',
                      border: copiedId ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {copiedId ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                  </button>
                </div>

                {/* Transaction ID Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#131b2e', marginBottom: '6px' }}>
                    Transaction ID (TID) / Raast Reference Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 328491029384 (12-digit reference)"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: '#131b2e',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                    Found in your banking app SMS confirmation or receipt.
                  </span>
                </div>

                {/* Sender Account (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#131b2e', marginBottom: '6px' }}>
                    Sender Mobile / Account Number <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={senderAccount}
                    onChange={(e) => setSenderAccount(e.target.value)}
                    placeholder="e.g. 0301-1234567 or Meezan Account Title"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                      color: '#131b2e',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                </div>

                {/* Receipt Screenshot Dropzone */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#131b2e', marginBottom: '6px' }}>
                    Upload Payment Receipt Screenshot <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional but speeds up verification)</span>
                  </label>

                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Upload size={24} color="#1d6ef2" />
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#131b2e' }}>
                        Click to upload screenshot or drag & drop
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        PNG, JPG up to 10MB
                      </span>
                    </div>
                  </div>

                  {receiptImageDataUrl && (
                    <div
                      style={{
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <ImageIcon size={18} color="#00865c" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#131b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {receiptFileName || 'receipt_screenshot.jpg'}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '2px 8px', borderRadius: '9999px' }}>
                        Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImageDataUrl(null);
                          setReceiptFileName('');
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JazzCash / EasyPaisa */}
          {activeTab === 'wallet' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', textAlign: 'center', marginBottom: '24px' }}>
              <Smartphone size={36} color="#1d6ef2" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px', color: '#131b2e' }}>
                JazzCash & EasyPaisa Direct Transfer
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                Send money via JazzCash or EasyPaisa to our official merchant wallet, then enter your 11-digit Transaction ID below.
              </p>

              <div style={{ maxWidth: '420px', margin: '0 auto 24px', background: '#ffffff', padding: '16px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Mobile Wallet Number</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#131b2e', fontFamily: 'var(--font-mono, monospace)' }}>
                    {defaultWalletNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(defaultWalletNumber, setCopiedWallet)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: copiedWallet ? '#ecfdf5' : '#f1f5f9', color: copiedWallet ? '#059669' : '#1d6ef2', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {copiedWallet ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#131b2e', marginBottom: '6px' }}>
                  Wallet Transaction ID (TID) *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter 11-digit JazzCash/EasyPaisa Trx ID"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: Direct Bank Wire (IBAN) */}
          {activeTab === 'bank' && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Building2 size={24} color="#1d6ef2" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#131b2e' }}>
                  Direct Bank Wire Transfer (IBAN)
                </h3>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                Transfer directly from any conventional or Islamic bank account in Pakistan via online banking app or ATM.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>IBAN Number</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#131b2e', fontFamily: 'var(--font-mono, monospace)' }}>
                    {defaultRaastIban}
                  </span>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>Branch & City</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#131b2e' }}>
                    {defaultBankName}
                  </span>
                </div>
              </div>

              <div style={{ maxWidth: '420px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#131b2e', marginBottom: '6px' }}>
                  Bank Reference Number / TID *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter Reference Number from online receipt"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'var(--font-mono, monospace)' }}
                />
              </div>
            </div>
          )}

          {/* Voucher / Scholar Code Section */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '20px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              <Tag size={18} color="#1d6ef2" />
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Have a voucher or scholar code? (e.g. CSS2024)"
                style={{
                  flex: '1 1 260px',
                  maxWidth: '360px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  textTransform: 'uppercase'
                }}
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#131b2e',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Apply Code
              </button>
            </div>

            {voucherApplied && (
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>{voucherApplied.message}</span>
              </div>
            )}
            {voucherError && (
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{voucherError}</span>
              </div>
            )}
          </div>

          {/* Submission Feedback Messages */}
          {submissionError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', color: '#991b1b', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} color="#dc2626" />
              <span>{submissionError}</span>
            </div>
          )}

          {submissionSuccess && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '18px', marginBottom: '20px', color: '#166534', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <span>Verification Request Submitted Successfully!</span>
              </div>
              <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                {submissionSuccess.message}
              </p>
              {submissionSuccess.requestId && (
                <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono, monospace)', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #dcfce7', display: 'inline-block' }}>
                  Request ID: <strong>{submissionSuccess.requestId}</strong> • Plan: {submissionSuccess.planName} • Amount: {submissionSuccess.amount}
                </div>
              )}
            </div>
          )}

          {/* Order Summary & Primary CTA */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px'
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Total Payable Amount
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#131b2e', letterSpacing: '-0.02em' }}>
                  Rs. {finalPrice.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#065f46', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
                  Taxes Included (GST)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitVerification}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 32px',
                borderRadius: '12px',
                background: '#1d6ef2',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 18px rgba(29, 110, 242, 0.3)',
                transition: 'all 0.2s ease',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <span>{isSubmitting ? 'Verifying Request...' : currentPlanObj.pricePKR === 0 ? 'Activate Free Trial' : 'Submit Verification & Activate Credits'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </section>

        {/* Existing Candidate Requests Queue (If signed in and has history) */}
        {userRequests.length > 0 && (
          <section style={{ marginBottom: '40px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#131b2e', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#1d6ef2" />
              <span>Your Recent Payment Requests</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '0.84rem',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <strong style={{ color: '#131b2e' }}>{req.planName}</strong>
                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                    <span style={{ color: '#64748b' }}>{req.pricePKR}</span>
                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#475569' }}>
                      TID: {req.transactionId}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background:
                          req.status === 'approved'
                            ? '#ecfdf5'
                            : req.status === 'rejected'
                            ? '#fef2f2'
                            : '#fffbeb',
                        color:
                          req.status === 'approved'
                            ? '#065f46'
                            : req.status === 'rejected'
                            ? '#991b1b'
                            : '#92400e'
                      }}
                    >
                      {req.status === 'approved'
                        ? '✓ Approved (Credits Added)'
                        : req.status === 'rejected'
                        ? '✗ Rejected'
                        : '⏳ Pending Verification (~5 mins)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        <section style={{ maxWidth: '840px', margin: '0 auto 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px', color: '#131b2e' }}>
              Frequently Answered Questions
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Everything you need to know about evaluation credit top-ups and verification.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {faqItems.map((item, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 24px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedFaq(isOpen ? -1 : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#131b2e', margin: 0 }}>
                      {item.q}
                    </h4>
                    {isOpen ? <ChevronUp size={20} color="#1d6ef2" /> : <ChevronDown size={20} color="#64748b" />}
                  </div>
                  {isOpen && (
                    <p style={{ fontSize: '0.86rem', color: '#475569', marginTop: '12px', marginBottom: 0, lineHeight: 1.6 }}>
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Floating WhatsApp Support Trigger */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '8px 14px',
            borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#131b2e'
          }}
        >
          Need help choosing a study plan?
        </div>
        <a
          href={`https://wa.me/${(paymentConfig?.whatsappNumber || '923000000000').replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp Support"
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#25D366',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(37, 211, 102, 0.4)',
            textDecoration: 'none',
            transition: 'transform 0.2s ease',
            position: 'relative'
          }}
        >
          <MessageCircle size={28} />
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #ffffff'
            }}
          />
        </a>
      </div>
    </div>
  );
};

