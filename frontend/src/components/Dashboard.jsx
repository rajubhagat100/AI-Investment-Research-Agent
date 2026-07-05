import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  DollarSign, 
  ShieldAlert, 
  Briefcase, 
  Activity, 
  FileText,
  BarChart3
} from 'lucide-react';

export default function Dashboard({ data }) {
  const [activeTab, setActiveTab] = useState('financials');

  if (!data) return null;

  const {
    companyProfile = {},
    decision = 'PASS',
    targetPrice = 'N/A',
    riskRating = 'N/A',
    executiveSummary = '',
    financialHealth = {},
    pros = [],
    cons = [],
    detailedAnalysis = {},
    historicalStatements = null
  } = data;

  const name = companyProfile.name || 'Unknown Company';
  const ticker = companyProfile.ticker || 'N/A';
  const sector = companyProfile.sector || 'N/A';
  const industry = companyProfile.industry || 'N/A';
  const currentPrice = companyProfile.currentPrice || 'N/A';
  const marketCap = companyProfile.marketCap || 'N/A';
  const peRatio = companyProfile.peRatio || 'N/A';
  const dividendYield = companyProfile.dividendYield || 'N/A';
  const currency = companyProfile.currency || 'USD';

  // Helper to format P/E ratio to 2 decimal places
  const formatPE = (pe) => {
    if (pe === 'N/A' || pe === undefined || pe === null) return 'N/A';
    const num = parseFloat(pe);
    return isNaN(num) ? pe : num.toFixed(2);
  };

  // Determine classes for styling based on recommendation
  let decisionClass = 'pass-card';
  let DecisionIcon = XCircle;
  if (decision === 'INVEST') {
    decisionClass = 'invest-card';
    DecisionIcon = CheckCircle2;
  } else if (decision === 'WARNING') {
    decisionClass = 'warning-card';
    DecisionIcon = AlertTriangle;
  }

  // Get score class for gauges
  const getScoreColorClass = (score) => {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  };

  const getScoreBarClass = (score) => {
    if (score >= 80) return 'score-high-bar';
    if (score >= 50) return 'score-medium-bar';
    return 'score-low-bar';
  };

  return (
    <div className="dashboard-container">
      {/* 1. Main Recommendation Card */}
      <div className={`glass-panel recommendation-card ${decisionClass}`}>
        <div className="rec-banner-glow" />
        
        <div className="decision-badge-container">
          <DecisionIcon size={64} style={{ marginBottom: '0.25rem' }} />
          <span className="decision-huge-text">{decision}</span>
          <span className="decision-label">Agent Recommendation</span>
        </div>

        <div className="rec-metrics-grid">
          <div className="rec-metric-item">
            <span className="rec-metric-label">Target Price (12M)</span>
            <span className="rec-metric-val">{targetPrice}</span>
          </div>
          <div className="rec-metric-item">
            <span className="rec-metric-label">Risk Rating</span>
            <span className="rec-metric-val" style={{ 
              color: riskRating.toLowerCase() === 'low' ? 'var(--accent-invest)' : 
                     riskRating.toLowerCase() === 'medium' ? 'var(--accent-warning)' : 'var(--accent-pass)'
            }}>
              {riskRating}
            </span>
          </div>
          <div className="rec-metric-item">
            <span className="rec-metric-label">Stock Price</span>
            <span className="rec-metric-val">
              {currentPrice !== 'N/A' ? `${currency === 'USD' ? '$' : ''}${currentPrice} ${currency}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Company Profile Details */}
      <div className="glass-panel profile-card">
        <div className="profile-header">
          <div>
            <h2 className="profile-title-name">{name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {sector} • {industry}
            </p>
          </div>
          <span className="profile-ticker-tag">{ticker}</span>
        </div>

        <div className="profile-grid">
          <div className="profile-stat-box">
            <div className="profile-stat-label">Market Cap</div>
            <div className="profile-stat-val">{marketCap}</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-label">P/E Ratio (Trailing)</div>
            <div className="profile-stat-val">{formatPE(peRatio)}</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-label">Dividend Yield</div>
            <div className="profile-stat-val">{dividendYield}</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-label">Analyst Thesis</div>
            <div className="profile-stat-val" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>Comprehensive</div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Briefcase size={18} color="var(--primary)" />
          Executive Thesis
        </h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          {executiveSummary}
        </p>
      </div>

      {/* 3. Pros and Cons Grid */}
      <div className="pros-cons-grid">
        <div className="glass-panel pros-cons-card pros-card">
          <h3 className="pros-cons-title">
            <TrendingUp size={18} />
            Growth Catalysts & Pros
          </h3>
          <ul className="pros-cons-list">
            {pros.map((pro, index) => (
              <li key={index} className="pros-cons-item">{pro}</li>
            ))}
          </ul>
        </div>

        <div className="glass-panel pros-cons-card cons-card">
          <h3 className="pros-cons-title">
            <TrendingDown size={18} />
            Headwinds & Risks
          </h3>
          <ul className="pros-cons-list">
            {cons.map((con, index) => (
              <li key={index} className="pros-cons-item">{con}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Financial Health Scorecard */}
      <div className="glass-panel scorecard-card">
        <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="var(--primary)" />
          Financial Health Scorecard
        </h3>
        <div className="scorecard-grid">
          {Object.entries(financialHealth).map(([key, value]) => {
            const score = value.score || 0;
            const scoreClass = getScoreColorClass(score);
            const barClass = getScoreBarClass(score);
            return (
              <div key={key} className="gauge-item">
                <div className="gauge-header">
                  <span className="gauge-title">{key}</span>
                  <span className={`gauge-score ${scoreClass}`}>{score}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className={`progress-bar-fill ${barClass}`} 
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="gauge-desc">{value.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Detailed Reports Tabs */}
      <div className="glass-panel details-card">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`}
            onClick={() => setActiveTab('financials')}
          >
            <DollarSign size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
            Financial Health
          </button>
          <button 
            className={`tab-btn ${activeTab === 'moat' ? 'active' : ''}`}
            onClick={() => setActiveTab('moat')}
          >
            <Briefcase size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
            Moat & Competitive Position
          </button>
          <button 
            className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
            onClick={() => setActiveTab('risks')}
          >
            <ShieldAlert size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
            Regulatory & Competitor Risks
          </button>
          {historicalStatements && (
            <button 
              className={`tab-btn ${activeTab === 'statements' ? 'active' : ''}`}
              onClick={() => setActiveTab('statements')}
            >
              <BarChart3 size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
              Statement History
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'financials' && (
            <div className="markdown-text">
              <p style={{ whiteSpace: 'pre-wrap' }}>{detailedAnalysis.financials}</p>
            </div>
          )}
          {activeTab === 'moat' && (
            <div className="markdown-text">
              <p style={{ whiteSpace: 'pre-wrap' }}>{detailedAnalysis.moat}</p>
            </div>
          )}
          {activeTab === 'risks' && (
            <div className="markdown-text">
              <p style={{ whiteSpace: 'pre-wrap' }}>{detailedAnalysis.risks}</p>
            </div>
          )}
          {activeTab === 'statements' && historicalStatements && (
            <div>
              {/* Revenue & Margin Table */}
              {historicalStatements.annualRevenueAndIncome && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Income Statement Highlights</h4>
                  <div className="table-container">
                    <table className="trend-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Revenue</th>
                          <th>Gross Profit</th>
                          <th>Operating Income</th>
                          <th>Net Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalStatements.annualRevenueAndIncome.map((row, idx) => (
                          <tr key={idx}>
                            <td className="trend-year">{row.year}</td>
                            <td>{row.revenue}</td>
                            <td>{row.grossProfit}</td>
                            <td>{row.operatingIncome}</td>
                            <td>{row.netIncome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Balance Sheet Table */}
              {historicalStatements.annualBalanceSheet && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Balance Sheet Highlights</h4>
                  <div className="table-container">
                    <table className="trend-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Total Assets</th>
                          <th>Total Liabilities</th>
                          <th>Total Equity</th>
                          <th>Cash / Short-term Inv</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalStatements.annualBalanceSheet.map((row, idx) => (
                          <tr key={idx}>
                            <td className="trend-year">{row.year}</td>
                            <td>{row.totalAssets}</td>
                            <td>{row.totalLiabilities}</td>
                            <td>{row.equity}</td>
                            <td>{row.cashAndShortTermInvestments}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cash Flow Table */}
              {historicalStatements.annualCashFlow && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Cash Flow Highlights</h4>
                  <div className="table-container">
                    <table className="trend-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Operating Cash Flow</th>
                          <th>Capital Expenditure</th>
                          <th>Free Cash Flow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalStatements.annualCashFlow.map((row, idx) => (
                          <tr key={idx}>
                            <td className="trend-year">{row.year}</td>
                            <td>{row.operatingCashFlow}</td>
                            <td>{row.capitalExpenditures}</td>
                            <td style={{ color: 'var(--accent-invest)', fontWeight: '600' }}>{row.freeCashFlow}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
