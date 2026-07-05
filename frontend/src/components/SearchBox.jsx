import React, { useState } from 'react';
import { Search, Compass, TrendingUp, ShieldAlert, Award, Leaf } from 'lucide-react';

const MANDATE_PROFILES = [
  { id: 'Aggressive Growth', label: 'Growth', icon: TrendingUp, desc: 'High expansion, technology edge, market TAM.' },
  { id: 'Defensive Value', label: 'Value', icon: Compass, desc: 'Robust balance sheets, stable FCF, low debt.' },
  { id: 'Dividend/Income', label: 'Dividend', icon: Award, desc: 'Predictable yields, reliable payouts, solid payout ratios.' },
  { id: 'ESG/Sustainable', label: 'Sustainable', icon: Leaf, desc: 'High governance, environmental transition alignment.' }
];

const SUGGESTIONS = [
  { name: 'Nvidia', profile: 'Aggressive Growth' },
  { name: 'Tesla', profile: 'Aggressive Growth' },
  { name: 'Apple', profile: 'Defensive Value' },
  { name: 'Costco', profile: 'Defensive Value' },
  { name: 'Coca-Cola', profile: 'Dividend/Income' },
  { name: 'NextEra Energy', profile: 'ESG/Sustainable' }
];

export default function SearchBox({ onSearch, isLoading }) {
  const [query, setQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('Aggressive Growth');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim(), selectedProfile);
  };

  const handleSuggestionClick = (name, profile) => {
    if (isLoading) return;
    setQuery(name);
    setSelectedProfile(profile);
    onSearch(name, profile);
  };

  return (
    <div className="search-sidebar">
      {/* Search Input & Mandate Form */}
      <div className="glass-panel search-card">
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
          Research Terminal
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* Company Query */}
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <div className="input-wrapper">
              <Search size={18} className="input-icon" />
              <input
                type="text"
                placeholder="e.g. Nvidia, Apple, Tesla..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                className="search-input"
                required
              />
            </div>
          </div>

          {/* Mandate Profile */}
          <div className="form-group">
            <label className="form-label">Investment Mandate</label>
            <div className="mandate-grid">
              {MANDATE_PROFILES.map((p) => {
                const IconComponent = p.icon;
                const isActive = selectedProfile === p.id;
                return (
                  <div
                    key={p.id}
                    className={`mandate-option ${isActive ? 'active' : ''}`}
                    onClick={() => !isLoading && setSelectedProfile(p.id)}
                    title={p.desc}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <IconComponent size={14} />
                      <span>{p.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="btn-search pulsing-glow"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Analyzing Assets...' : 'Run Agent Research'}
          </button>
        </form>
      </div>

      {/* Suggested Ideas List */}
      <div className="glass-panel history-card">
        <h3 className="history-title">
          <span>Investment Ideas</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Select a stock recommendation candidate below to initialize a pre-configured research report:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s.name, s.profile)}
                disabled={isLoading}
                className="suggestion-pill"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
