/**
 * Centralized Platform Subscription Plans & Credit Quotas
 * Single source of truth for PricingPage, Firebase Services, AdminConsole, and Sidebar.
 */

export const PLATFORM_PLANS = [
  {
    id: 'free',
    tierBadge: 'Starter',
    subBadge: 'No Card Required',
    title: 'Free Trial',
    name: 'Free Trial',
    description: 'Test our AI examiner capability with one complete essay evaluation.',
    pricePKR: 0,
    priceDisplay: 'Rs. 0',
    period: '/ forever',
    credits: 30,
    features: [
      { label: '1 Free Diagnostic Evaluation (CSS / PMS)', included: true, bold: true },
      { label: 'Basic Examiner Feedback & Deductions', included: true },
      { label: 'Multi-Agent Rubrics (FPSC Standard)', included: false },
      { label: '1-on-1 Topper Model Rewrites', included: false }
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
    name: 'Aspirant Pro',
    description: 'Designed for serious candidates aiming for top 10 CSS/PMS allocations.',
    pricePKR: 2999,
    priceDisplay: 'Rs. 2,999',
    period: '/ month',
    credits: 500,
    features: [
      { label: '500 Token-Synced Credits (~20–25 Full Essays)', included: true, bold: true },
      { label: 'Multi-Agent Rubrics (FPSC Standard)', included: true, bold: true },
      { label: '1-on-1 Topper Rewrites & Outline Upgrades', included: true, bold: true },
      { label: 'Detailed Examiner Blueprint PDF Export', included: true }
    ],
    buttonLabel: 'Selected Plan (Pro)',
    isPopular: true
  },
  {
    id: 'academy',
    tierBadge: 'Intensive',
    subBadge: 'VIP Mentorship',
    title: 'Academy Intensive',
    name: 'Academy Intensive',
    description: 'Comprehensive evaluation pass with full subject coverage and priority queue.',
    pricePKR: 6999,
    priceDisplay: 'Rs. 6,999',
    period: '/ exam pass',
    credits: 1500,
    features: [
      { label: '1,500 Token-Synced Credits (~65+ Full Essays)', included: true, bold: true },
      { label: 'All 47 Official FPSC Compulsory & Optional Subjects', included: true, bold: true },
      { label: 'Priority Gemini 3.8 Flash DAG Pipeline', included: true, bold: true },
      { label: 'Dedicated WhatsApp Mentor Diagnostic Review', included: true }
    ],
    buttonLabel: 'Upgrade to Intensive',
    isPopular: false
  }
];

export const getPlanById = (id) => {
  return PLATFORM_PLANS.find((p) => p.id === id) || PLATFORM_PLANS[0];
};

