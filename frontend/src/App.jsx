import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, History, RefreshCw, Layers } from 'lucide-react';
import SearchBox from './components/SearchBox';
import AgentTerminal from './components/AgentTerminal';
import Dashboard from './components/Dashboard';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Load research history from localStorage on startup
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('aura_research_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error('Failed to load history from localStorage:', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newResult) => {
    if (!newResult || !newResult.companyProfile?.ticker) return;
    
    setHistory(prev => {
      // Avoid duplicate symbol entries in recent list
      const filtered = prev.filter(item => item.ticker !== newResult.companyProfile.ticker);
      const updated = [
        {
          ticker: newResult.companyProfile.ticker,
          name: newResult.companyProfile.name,
          decision: newResult.decision,
          date: new Date().toLocaleDateString(),
          data: newResult
        },
        ...filtered
      ].slice(0, 10); // Keep last 10 entries
      
      localStorage.setItem('aura_research_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = (companyName, profile) => {
    setIsLoading(true);
    setLogs([]);
    setResult(null);

    // Create backend SSE connection (with cache-busting timestamp to prevent browsers from caching previous 404s)
    const baseApi = import.meta.env.VITE_API_URL || '';
    const cleanApi = baseApi.endsWith('/') ? baseApi.slice(0, -1) : baseApi;
    const backendUrl = `${cleanApi}/api/research/stream?companyName=${encodeURIComponent(companyName)}&profile=${encodeURIComponent(profile)}&t=${Date.now()}`;
    
    console.log(`Connecting to SSE stream: ${backendUrl}`);
    const eventSource = new EventSource(backendUrl);

    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          setLogs(prev => [...prev, data.message]);
        }
      } catch (err) {
        console.error('Error parsing SSE status:', err);
      }
    });

    eventSource.addEventListener('result', (event) => {
      try {
        const data = JSON.parse(event.data);
        setResult(data);
        saveToHistory(data);
      } catch (err) {
        console.error('Error parsing SSE result:', err);
        setLogs(prev => [...prev, '[Error] Failed to parse final research result.']);
      }
    });

    eventSource.addEventListener('done', (event) => {
      setLogs(prev => [...prev, '[Success] Research completed. Hydrated dashboard charts.']);
      setIsLoading(false);
      eventSource.close();
    });

    eventSource.onerror = (error) => {
      console.error('EventSource connection error:', error);
      setLogs(prev => [...prev, '[Error] SSE connection failed. Confirm the backend API server is online.']);
      setIsLoading(false);
      eventSource.close();
    };
  };

  const loadHistoryItem = (item) => {
    if (isLoading) return;
    setResult(item.data);
    setLogs([`[System] Loaded cached research report for ${item.name} (${item.ticker}) from local storage history.`]);
  };

  const clearHistory = () => {
    localStorage.removeItem('aura_research_history');
    setHistory([]);
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-container">
          <Layers size={24} color="#6366f1" />
          <span className="logo-text">AURA</span>
          <span className="logo-tag">Research Agent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Sparkles size={14} color="#f59e0b" />
          <span>LangChain + Node.js Engine</span>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="main-content">
        {/* Left Side: Inputs & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SearchBox onSearch={handleSearch} isLoading={isLoading} />
          
          {/* Recent Queries Cards */}
          {history.length > 0 && (
            <div className="glass-panel history-card">
              <h3 className="history-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <History size={15} />
                  Recent Research
                </span>
                <button 
                  onClick={clearHistory}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </h3>
              <ul className="history-list">
                {history.map((item, idx) => (
                  <li 
                    key={idx} 
                    className="history-item"
                    onClick={() => loadHistoryItem(item)}
                  >
                    <div>
                      <span className="history-ticker">{item.ticker}</span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <span className={`history-badge ${item.decision.toLowerCase()}`}>
                      {item.decision}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Terminal for Sidebar if result is loaded */}
          {result && logs.length > 0 && (
            <AgentTerminal logs={logs} isLoading={isLoading} />
          )}
        </div>

        {/* Right Side: Main Display area */}
        <div style={{ minWidth: 0 }}>
          {isLoading && !result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <RefreshCw className="pulsing-glow" size={32} color="var(--primary)" style={{ animation: 'spin 2s linear infinite', marginBottom: '1rem' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Analyzing Market Landscape</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  The agent is executing tools, scraping financials, reviewing filings, and synthesizing an investment thesis. Follow the live reasoning log below.
                </p>
              </div>
              <AgentTerminal logs={logs} isLoading={isLoading} />
            </div>
          ) : !isLoading && logs.length > 0 && !result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--accent-pass)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem', color: 'var(--accent-pass)' }}>Research Failed</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  The research agent encountered a connection or server error during execution. Please review the diagnostic log below.
                </p>
              </div>
              <AgentTerminal logs={logs} isLoading={isLoading} />
            </div>
          ) : result ? (
            <Dashboard data={result} />
          ) : (
            /* Welcome Overlay Panel */
            <div className="glass-panel welcome-card">
              <div className="welcome-icon-container">
                <Shield size={36} />
              </div>
              <h2 className="welcome-title">AI Investment Research Agent</h2>
              <p className="welcome-desc">
                Welcome to AURA. Enter a company name and choose an investment mandate. The agent will autonomously resolve ticker symbols, analyze balance sheets, calculate metrics, search public news channels, and write a structured thesis.
              </p>
              <div style={{ borderTop: '1px solid var(--border-color)', width: '100%', margin: '1.5rem 0' }} />
              <div className="welcome-suggestions">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', width: '100%', marginBottom: '0.5rem' }}>
                  Quick Mandates:
                </span>
                <span className="suggestion-pill" onClick={() => handleSearch('Nvidia', 'Aggressive Growth')}>
                  NVIDIA (Growth)
                </span>
                <span className="suggestion-pill" onClick={() => handleSearch('Apple', 'Defensive Value')}>
                  Apple (Value)
                </span>
                <span className="suggestion-pill" onClick={() => handleSearch('Coca-Cola', 'Dividend/Income')}>
                  Coca-Cola (Dividend)
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* App CSS Animation Definitions for Spin */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
