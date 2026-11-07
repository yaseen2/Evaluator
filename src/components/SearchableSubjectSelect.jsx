import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, BookOpen } from 'lucide-react';

export const OFFICIAL_FPSC_SUBJECTS = [
  // A: CSS COMPULSORY SUBJECTS (600 MARKS)
  { code: '01', group: 'CSS Compulsory Subjects (600 Marks)', name: 'English Essay' },
  { code: '02', group: 'CSS Compulsory Subjects (600 Marks)', name: 'English (Precis and Composition)' },
  { code: '03', group: 'CSS Compulsory Subjects (600 Marks)', name: 'General Science & Ability' },
  { code: '04', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Current Affairs' },
  { code: '05', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Pakistan Affairs' },
  { code: '06', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Islamic Studies' },
  { code: '06-B', group: 'CSS Compulsory Subjects (600 Marks)', name: 'Comparative Study of Major Religions (For Non Muslims)' },

  // PMS COMPULSORY & PROVINCIAL SUBJECTS (PPSC / KPPSC / SPSC / BPSC)
  { code: 'PMS-01', group: 'PMS Compulsory Subjects (PPSC / KPPSC / SPSC / BPSC)', name: 'PMS English Essay' },
  { code: 'PMS-02', group: 'PMS Compulsory Subjects (PPSC / KPPSC / SPSC / BPSC)', name: 'PMS English (Precis, Comprehension & Translation)' },
  { code: 'PMS-03', group: 'PMS Compulsory Subjects (PPSC / KPPSC / SPSC / BPSC)', name: 'PMS Pakistan Studies' },
  { code: 'PMS-04', group: 'PMS Compulsory Subjects (PPSC / KPPSC / SPSC / BPSC)', name: 'PMS Islamic Studies / Ethics' },
  { code: 'PMS-05', group: 'PMS Compulsory Subjects (PPSC / KPPSC / SPSC / BPSC)', name: 'PMS General Knowledge & Everyday Science' },
  { code: 'PMS-06', group: 'PMS Compulsory Subjects (PPSC / KPPSC / SPSC / BPSC)', name: 'PMS Urdu (Essay, Precis & Comprehension)' },

  // Group-I (200 Marks)
  { code: '11', group: 'Group-I: CSS/PMS Optional (200 Marks)', name: 'Accountancy & Auditing' },
  { code: '12', group: 'Group-I: CSS/PMS Optional (200 Marks)', name: 'Economics' },
  { code: '13', group: 'Group-I: CSS/PMS Optional (200 Marks)', name: 'Computer Science' },
  { code: '14', group: 'Group-I: CSS/PMS Optional (200 Marks)', name: 'Political Science' },
  { code: '15', group: 'Group-I: CSS/PMS Optional (200 Marks)', name: 'International Relations' },

  // Group-II (200/100 Marks)
  { code: '16', group: 'Group-II: CSS/PMS Optional (200 Marks)', name: 'Physics' },
  { code: '17', group: 'Group-II: CSS/PMS Optional (200 Marks)', name: 'Chemistry' },
  { code: '18', group: 'Group-II: CSS/PMS Optional (100 Marks)', name: 'Applied Mathematics' },
  { code: '19', group: 'Group-II: CSS/PMS Optional (100 Marks)', name: 'Pure Mathematics' },
  { code: '20', group: 'Group-II: CSS/PMS Optional (100 Marks)', name: 'Statistics' },
  { code: '21', group: 'Group-II: CSS/PMS Optional (100 Marks)', name: 'Geology' },

  // Group-III (100 Marks)
  { code: '22', group: 'Group-III: CSS/PMS Optional (100 Marks)', name: 'Business Administration' },
  { code: '23', group: 'Group-III: CSS/PMS Optional (100 Marks)', name: 'Public Administration' },
  { code: '24', group: 'Group-III: CSS/PMS Optional (100 Marks)', name: 'Governance & Public Policies' },
  { code: '25', group: 'Group-III: CSS/PMS Optional (100 Marks)', name: 'Town Planning & Urban Management' },

  // Group-IV (100 Marks)
  { code: '26', group: 'Group-IV: CSS/PMS Optional (100 Marks)', name: 'History of Pakistan & India' },
  { code: '27', group: 'Group-IV: CSS/PMS Optional (100 Marks)', name: 'Islamic History & Culture' },
  { code: '28', group: 'Group-IV: CSS/PMS Optional (100 Marks)', name: 'British History' },
  { code: '29', group: 'Group-IV: CSS/PMS Optional (100 Marks)', name: 'European History' },
  { code: '30', group: 'Group-IV: CSS/PMS Optional (100 Marks)', name: 'History of USA' },

  // Group-V (100 Marks)
  { code: '31', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'Gender Studies' },
  { code: '32', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'Environmental Sciences' },
  { code: '33', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'Agriculture & Forestry' },
  { code: '34', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'Botany' },
  { code: '35', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'Zoology' },
  { code: '36', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'English Literature' },
  { code: '37', group: 'Group-V: CSS/PMS Optional (100 Marks)', name: 'Urdu Literature' },

  // Group-VI (100 Marks)
  { code: '38', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'Law' },
  { code: '39', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'Constitutional Law' },
  { code: '40', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'International Law' },
  { code: '41', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'Muslim Law & Jurisprudence' },
  { code: '42', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'Mercantile Law' },
  { code: '43', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'Criminology' },
  { code: '44', group: 'Group-VI: CSS/PMS Optional (100 Marks)', name: 'Philosophy' },

  // Group-VII (100 Marks)
  { code: '45', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Journalism & Mass Communication' },
  { code: '46', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Psychology' },
  { code: '47', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Geography' },
  { code: '48', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Sociology' },
  { code: '48-B', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Social Work (PMS Optional)' },
  { code: '49', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Anthropology' },
  { code: '50', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Punjabi' },
  { code: '51', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Sindhi' },
  { code: '52', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Pashto' },
  { code: '53', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Balochi' },
  { code: '54', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Persian' },
  { code: '55', group: 'Group-VII: CSS/PMS Optional (100 Marks)', name: 'Arabic' }
];

export const SearchableSubjectSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSubjects = OFFICIAL_FPSC_SUBJECTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-sans)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={15} color="var(--accent-gold)" />
          <span style={{ fontWeight: 600 }}>{value || 'Islamic History & Culture'}</span>
        </div>
        <ChevronDown size={14} color="var(--text-muted)" />
      </div>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            animation: 'popIn 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-panel)', border: '1px solid var(--border-strong)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search 50+ CSS & PMS subjects (e.g. PMS Essay, IR, British History)..."
                autoFocus
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
            </div>
          </div>

          {/* Subject Options Scroll List */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((s, idx) => {
                const isSelected = value === s.name;
                const showGroupHeader = idx === 0 || filteredSubjects[idx - 1].group !== s.group;

                return (
                  <React.Fragment key={`${s.code}-${s.name}`}>
                    {showGroupHeader && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase', padding: '6px 10px 2px 10px', letterSpacing: '0.04em', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', marginTop: idx > 0 ? '4px' : 0 }}>
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
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)',
                        background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'background 0.1s'
                      }}
                      className="subject-option-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>
                          #{s.code}
                        </span>
                        <span>{s.name}</span>
                      </div>
                      {isSelected && <Check size={14} color="var(--accent-gold)" />}
                    </div>
                  </React.Fragment>
                );
              })
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No official CSS or PMS syllabus subject matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
