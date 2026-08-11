import React from 'react';
import { X, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export const AnnotationCallout = ({ annotation, onClose, onApplyFix }) => {
  if (!annotation) return null;

  return (
    <div className="teacher-callout">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {annotation.category}
        </span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', padding: 0 }}>
          <X size={14} />
        </button>
      </div>

      <p style={{ margin: '4px 0 8px 0', color: '#7f1d1d' }}>
        {annotation.comment}
      </p>

      {annotation.suggestion && (
        <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '4px', border: '1px dashed #f59e0b', fontSize: '1.05rem', color: '#1e293b' }}>
          <strong>Suggested Fix:</strong>
          <p style={{ margin: '2px 0 0 0', fontStyle: 'italic' }}>
            "{annotation.suggestion}"
          </p>
        </div>
      )}
    </div>
  );
};
