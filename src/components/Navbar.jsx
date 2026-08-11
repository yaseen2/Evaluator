import React from 'react';
import { Settings, Upload, RefreshCw } from 'lucide-react';

export const Navbar = ({
  onOpenSettings,
  onOpenUpload,
  isEvaluating
}) => {
  return (
    <nav className="navbar">
      {/* Clean Brand Title */}
      <span className="brand-title">FPSC Evaluator</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Unified Settings Gear Button */}
        <button
          className="btn-minimal"
          onClick={onOpenSettings}
          title="Platform Settings (API Keys, Themes, Quotas)"
        >
          <Settings size={14} color="var(--accent-gold)" />
          <span>Settings</span>
        </button>

        {/* Primary Evaluation CTA */}
        <button className="btn-accent" onClick={onOpenUpload} disabled={isEvaluating}>
          {isEvaluating ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
          <span>{isEvaluating ? 'Evaluating...' : 'Evaluate Paper'}</span>
        </button>
      </div>
    </nav>
  );
};
