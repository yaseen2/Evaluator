import React from 'react';
import { X, ShieldAlert, Info, ArrowRight } from 'lucide-react';

export const AlertModal = ({ isOpen, onClose, title, message, type = 'warning', actionLabel, onAction }) => {
  if (!isOpen) return null;

  const isError = type === 'error' || type === 'warning';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          height: 'auto',
          padding: '1.5rem',
          background: 'var(--bg-panel)',
          border: isError ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-strong)',
          boxShadow: isError ? '0 20px 50px rgba(0, 0, 0, 0.4)' : '0 20px 50px rgba(0, 0, 0, 0.35)',
          borderRadius: 'var(--radius-lg)',
          animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isError ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                border: isError ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isError ? '#f59e0b' : '#10b981'
              }}
            >
              {isError ? <ShieldAlert size={22} /> : <Info size={22} />}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                {title || 'Notice'}
              </h4>
              <span style={{ fontSize: '0.72rem', color: isError ? 'var(--accent-gold)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                {isError ? 'Action Required Before Evaluation' : 'System Notification'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Message */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn-minimal" onClick={onClose}>
            Dismiss
          </button>

          {actionLabel && (
            <button
              className="btn-accent"
              onClick={() => {
                onClose();
                if (onAction) onAction();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{actionLabel}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
