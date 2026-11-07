import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, BookOpen, X } from 'lucide-react';

export const OFFICIAL_FPSC_SUBJECTS = [
  // A: CSS COMPULSORY SUBJECTS (600 MARKS)
  { code: '01', group: 'CSS Compulsory Subjects (600 Marks)', name: 'English Essay' },
  { code: '02', group: 'CSS Compulsory Subjects (600 Marks)', name: 'English (Precis and Composition)' },
  { code: '03', group: 'CSS Compulsory Subjects (600 Marks)', name: 'General Science & Ability' },
  { code: '04', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Current Affairs' },
  { code: '05', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Pakistan Affairs' },
  { code: '06', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Islamic Studies' },
  { code: '07', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Comparative Study of Major Religions (For Non-Muslims)' },

  // Group-I (200 Marks)
  { code: '11', group: 'Group-I: Optional Subjects (200 Marks)', name: 'Accountancy & Auditing' },
  { code: '12', group: 'Group-I: Optional Subjects (200 Marks)', name: 'Economics' },
  { code: '13', group: 'Group-I: Optional Subjects (200 Marks)', name: 'Computer Science' },
  { code: '14', group: 'Group-I: Optional Subjects (200 Marks)', name: 'Political Science' },
  { code: '15', group: 'Group-I: Optional Subjects (200 Marks)', name: 'International Relations' },

  // Group-II (200/100 Marks)
  { code: '16', group: 'Group-II: Optional Subjects (200 Marks)', name: 'Physics' },
  { code: '17', group: 'Group-II: Optional Subjects (200 Marks)', name: 'Chemistry' },
  { code: '18', group: 'Group-II: Optional Subjects (100 Marks)', name: 'Applied Mathematics' },
  { code: '19', group: 'Group-II: Optional Subjects (100 Marks)', name: 'Pure Mathematics' },
  { code: '20', group: 'Group-II: Optional Subjects (100 Marks)', name: 'Statistics' },
  { code: '21', group: 'Group-II: Optional Subjects (100 Marks)', name: 'Geology' },

  // Group-III (100 Marks)
  { code: '22', group: 'Group-III: Optional Subjects (100 Marks)', name: 'Business Administration' },
  { code: '23', group: 'Group-III: Optional Subjects (100 Marks)', name: 'Public Administration' },
  { code: '24', group: 'Group-III: Optional Subjects (100 Marks)', name: 'Governance & Public Policies' },
  { code: '25', group: 'Group-III: Optional Subjects (100 Marks)', name: 'Town Planning & Urban Management' },

  // Group-IV (100 Marks)
  { code: '26', group: 'Group-IV: Optional Subjects (100 Marks)', name: 'History of Pakistan & India' },
  { code: '27', group: 'Group-IV: Optional Subjects (100 Marks)', name: 'Islamic History & Culture' },
  { code: '28', group: 'Group-IV: Optional Subjects (100 Marks)', name: 'British History' },
  { code: '29', group: 'Group-IV: Optional Subjects (100 Marks)', name: 'European History' },
  { code: '30', group: 'Group-IV: Optional Subjects (100 Marks)', name: 'History of USA' },

  // Group-V (100 Marks)
  { code: '31', group: 'Group-V: Optional Subjects (100 Marks)', name: 'Gender Studies' },
  { code: '32', group: 'Group-V: Optional Subjects (100 Marks)', name: 'Environmental Sciences' },
  { code: '33', group: 'Group-V: Optional Subjects (100 Marks)', name: 'Agriculture & Forestry' },
  { code: '34', group: 'Group-V: Optional Subjects (100 Marks)', name: 'Botany' },
  { code: '35', group: 'Group-V: Optional Subjects (100 Marks)', name: 'Zoology' },
  { code: '36', group: 'Group-V: Optional Subjects (100 Marks)', name: 'English Literature' },
  { code: '37', group: 'Group-V: Optional Subjects (100 Marks)', name: 'Urdu Literature' },

  // Group-VI (100 Marks)
  { code: '38', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'Law' },
  { code: '39', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'Constitutional Law' },
  { code: '40', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'International Law' },
  { code: '41', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'Muslim Law & Jurisprudence' },
  { code: '42', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'Mercantile Law' },
  { code: '43', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'Criminology' },
  { code: '44', group: 'Group-VI: Optional Subjects (100 Marks)', name: 'Philosophy' },

  // Group-VII (100 Marks)
  { code: '45', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Journalism & Mass Communication' },
  { code: '46', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Psychology' },
  { code: '47', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Geography' },
  { code: '48', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Sociology' },
  { code: '49', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Anthropology' },
  { code: '50', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Punjabi' },
  { code: '51', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Sindhi' },
  { code: '52', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Pashto' },
  { code: '53', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Balochi' },
  { code: '54', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Persian' },
  { code: '55', group: 'Group-VII: Optional Subjects (100 Marks)', name: 'Arabic' }
];

export const SearchableSubjectSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input WITHOUT scrolling the parent modal container
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  }, [isOpen]);

  const filteredSubjects = OFFICIAL_FPSC_SUBJECTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSubjectObj = OFFICIAL_FPSC_SUBJECTS.find((s) => s.name === value);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
    } else if (e.key === 'Enter' && filteredSubjects.length > 0) {
      e.preventDefault();
      onChange(filteredSubjects[0].name);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          background: 'var(--bg-panel)',
          border: isOpen ? '1px solid var(--accent-blue)' : '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '0.84rem',
          fontFamily: 'var(--font-sans)',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <BookOpen size={15} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          {selectedSubjectObj && (
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-blue)',
                background: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.22)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              #{selectedSubjectObj.code}
            </span>
          )}
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value || 'Islamic History & Culture'}
          </span>
        </div>
        <ChevronDown
          size={15}
          color="var(--text-muted)"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease'
          }}
        />
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 10050,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 18px 40px -8px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            animation: 'popIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--accent-blue)',
                boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.1)',
                padding: '6px 10px',
                borderRadius: '6px'
              }}
            >
              <Search size={14} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search 47 official FPSC CSS subjects (e.g. Essay, IR, Criminology)..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus({ preventScroll: true });
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Subject Options Scroll List */}
          <div style={{ maxHeight: '218px', overflowY: 'auto', padding: '6px' }}>
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((s, idx) => {
                const isSelected = value === s.name;
                const showGroupHeader = idx === 0 || filteredSubjects[idx - 1].group !== s.group;

                return (
                  <React.Fragment key={`${s.code}-${s.name}`}>
                    {showGroupHeader && (
                      <div
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: 'var(--accent-blue)',
                          textTransform: 'uppercase',
                          padding: '7px 8px 4px 8px',
                          letterSpacing: '0.04em',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          marginTop: idx > 0 ? '4px' : 0
                        }}
                      >
                        {s.group}
                      </div>
                    )}
                    <div
                      onClick={() => {
                        onChange(s.name);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '0.81rem',
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                        background: isSelected ? 'rgba(2, 132, 199, 0.09)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: isSelected ? 600 : 450,
                        transition: 'background 0.12s ease'
                      }}
                      className="subject-option-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.67rem',
                            fontFamily: 'var(--font-mono)',
                            color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
                            background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'var(--bg-card)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: isSelected ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid var(--border)',
                            minWidth: '34px',
                            textAlign: 'center',
                            flexShrink: 0
                          }}
                        >
                          #{s.code}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </span>
                      </div>
                      {isSelected && <Check size={14} color="var(--accent-blue)" style={{ flexShrink: 0 }} />}
                    </div>
                  </React.Fragment>
                );
              })
            ) : (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No official FPSC CSS subject matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
