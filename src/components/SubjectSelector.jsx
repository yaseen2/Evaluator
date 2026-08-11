import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, BookOpen } from 'lucide-react';

export const CSS_SUBJECT_GROUPS = [
  {
    category: 'Compulsory Subjects (100 Marks Each)',
    subjects: [
      'English Essay',
      'English Precis & Composition',
      'Islamic Studies',
      'Pakistan Affairs',
      'Current Affairs',
      'General Science & Ability'
    ]
  },
  {
    category: 'Group I: Economics, IR & Governance (200/100 Marks)',
    subjects: [
      'Economics',
      'International Relations',
      'Political Science',
      'Accountancy & Auditing'
    ]
  },
  {
    category: 'Group II: Physical & Computational Sciences',
    subjects: [
      'Physics',
      'Chemistry',
      'Applied Mathematics',
      'Pure Mathematics',
      'Statistics',
      'Computer Science'
    ]
  },
  {
    category: 'Group III: Public Admin & Town Planning',
    subjects: [
      'Public Administration',
      'Governance & Public Policies',
      'Town Planning & Urban Management'
    ]
  },
  {
    category: 'Group IV: History',
    subjects: [
      'History of Pakistan & India',
      'Islamic History & Culture',
      'History of USA',
      'European History',
      'British History'
    ]
  },
  {
    category: 'Group V: Social & Environmental Sciences',
    subjects: [
      'Economics II',
      'Gender Studies',
      'Environmental Sciences',
      'Criminology',
      'Agriculture & Forestry'
    ]
  },
  {
    category: 'Group VI: Law & Jurisprudence',
    subjects: [
      'Law',
      'Constitutional Law',
      'International Law',
      'Muslim Law & Jurisprudence',
      'Mercantile Law'
    ]
  },
  {
    category: 'Group VII: Humanities & Regional Languages',
    subjects: [
      'Sociology',
      'Journalism & Mass Communication',
      'Psychology',
      'Geography',
      'Anthropology',
      'Punjabi',
      'Pashto',
      'Sindhi',
      'Balochi',
      'Persian',
      'Arabic'
    ]
  }
];

export const SubjectSelector = ({ activeSubject, setActiveSubject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGroups = CSS_SUBJECT_GROUPS.map(group => ({
    ...group,
    subjects: group.subjects.filter(subj =>
      subj.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.subjects.length > 0);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          padding: '5px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.15s'
        }}
      >
        <BookOpen size={13} color="var(--accent-gold)" />
        <span>{activeSubject}</span>
        <ChevronDown size={12} color="var(--text-muted)" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '300px',
            maxHeight: '380px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search Bar */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
            <input
              type="text"
              placeholder="Search 45+ CSS subjects (e.g. Economics, IR)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 28px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Subjects List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {filteredGroups.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No subjects found
              </div>
            ) : (
              filteredGroups.map((group, idx) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', letterSpacing: '0.04em' }}>
                    {group.category}
                  </div>
                  {group.subjects.map(subj => (
                    <button
                      key={subj}
                      onClick={() => {
                        setActiveSubject(subj);
                        setIsOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: activeSubject === subj ? 'var(--bg-card-hover)' : 'transparent',
                        color: activeSubject === subj ? 'var(--accent-gold)' : 'var(--text-primary)',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{subj}</span>
                      {activeSubject === subj && <Check size={12} color="var(--accent-gold)" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
