import React, { useEffect, useRef } from 'react';

export default function AgentTerminal({ logs, isLoading }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Auto scroll to bottom of logs
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Color coordinate logs based on tag prefixes
  const renderFormattedRow = (log, index) => {
    let color = '#10b981'; // default terminal green
    if (log.startsWith('[Failure]') || log.startsWith('[Error]')) {
      color = '#ef4444'; // Red
    } else if (log.startsWith('[Initiating]') || log.startsWith('[Parsing]')) {
      color = '#6366f1'; // Indigo/Purple
    } else if (log.startsWith('[Search]') || log.startsWith('[Web Search]')) {
      color = '#a5b4fc'; // Light Indigo
    } else if (log.startsWith('[Financials]')) {
      color = '#10b981'; // Green
    } else if (log.startsWith('[Statements]')) {
      color = '#34d399'; // Emerald
    } else if (log.startsWith('[News]')) {
      color = '#f59e0b'; // Amber
    } else if (log.startsWith('[Reasoning]')) {
      color = '#f472b6'; // Pink
    } else if (log.startsWith('[System]')) {
      color = '#9ca3af'; // Gray
    }

    return (
      <div key={index} className="terminal-row" style={{ color }}>
        {log}
      </div>
    );
  };

  return (
    <div className="glass-panel terminal-card">
      <div className="terminal-header">
        <div className="terminal-window-buttons">
          <div className="terminal-dot red" />
          <div className="terminal-dot yellow" />
          <div className="terminal-dot green" />
        </div>
        <div className="terminal-title">agent_executor.sh</div>
        <div style={{ width: '42px' }} /> {/* Spacer */}
      </div>
      
      <div className="terminal-body">
        {logs.length === 0 ? (
          <div className="terminal-row" style={{ color: '#6b7280' }}>
            // System idle. Waiting for company search...
          </div>
        ) : (
          logs.map((log, index) => renderFormattedRow(log, index))
        )}
        
        {isLoading && (
          <div className="terminal-row">
            <span className="terminal-cursor" />
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
