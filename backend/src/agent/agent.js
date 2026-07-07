import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { 
  tickerResolver, 
  getFinancialSummary, 
  getFinancialStatements, 
  getCompanyNews, 
  webSearch 
} from './tools.js';

// Setup available tools list
const tools = [
  tickerResolver,
  getFinancialSummary,
  getFinancialStatements,
  getCompanyNews,
  webSearch
];

/**
 * Helper to dynamically construct the LLM chat client based on environment credentials.
 */
function getLLM(onTokenStream = null) {
  const temperature = 0.2;
  
  // Validate Gemini key format - AI Studio developer keys start with 'AIzaSy'
  const hasValidGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIzaSy');
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (hasValidGeminiKey) {
    console.log('[Agent Config] Initializing Google Gemini LLM.');
    return new ChatGoogleGenerativeAI({
      modelName: 'gemini-1.5-pro',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: temperature,
    });
  } else if (hasOpenAIKey) {
    console.log('[Agent Config] Initializing OpenAI LLM (Gemini key was missing or invalid).');
    return new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: temperature,
    });
  } else if (process.env.GEMINI_API_KEY) {
    // Last resort fallback if they only provided the AQ. key and no OpenAI key
    console.log('[Agent Config] Initializing Google Gemini LLM with provided key (format checks failed).');
    return new ChatGoogleGenerativeAI({
      modelName: 'gemini-1.5-pro',
      apiKey: process.env.GEMINI_API_KEY,
      temperature: temperature,
    });
  } else {
    throw new Error('No LLM credentials found. Please set GEMINI_API_KEY or OPENAI_API_KEY in your environment.');
  }
}

/**
 * Creates custom callbacks to stream agent actions/thoughts back to the frontend SSE stream.
 */
function createStreamingCallbacks(onLog) {
  return [
    {
      handleAgentAction: (action) => {
        // Triggered when agent decides to call a tool
        const toolName = action.tool;
        const toolInput = JSON.stringify(action.toolInput);
        
        let message = `[Agent thought]: Decided to execute tool: "${toolName}"`;
        if (toolName === 'ticker_resolver') {
          message = `[Search] Resolving ticker symbol for "${action.toolInput.companyName}"...`;
        } else if (toolName === 'get_financial_summary') {
          message = `[Financials] Loading key stats & ratios for symbol "${action.toolInput.ticker}"...`;
        } else if (toolName === 'get_financial_statements') {
          message = `[Statements] Extracting 3-year Revenue, Balance sheet, and Cash Flow metrics for "${action.toolInput.ticker}"...`;
        } else if (toolName === 'get_company_news') {
          message = `[News] Scraping recent corporate announcements and business articles for "${action.toolInput.ticker}"...`;
        } else if (toolName === 'web_search') {
          message = `[Web Search] Querying public reports for: "${action.toolInput.query}"...`;
        }
        
        onLog({ type: 'status', message, data: { tool: toolName, input: action.toolInput } });
      },
      
      handleToolEnd: (output, runId, parentRunId, tags) => {
        // Triggered when a tool returns data
        onLog({ type: 'status', message: `[System] Tool executed successfully. Read data length: ${output.length} bytes.` });
      },
      
      handleAgentEnd: (action) => {
        // Triggered when agent finishes reasoning and returns final answer
        onLog({ type: 'status', message: `[Agent thought]: Analysis complete. Synthesizing final recommendation...` });
      },

      handleLLMStart: (llm, prompts) => {
        // Triggered when LLM is querying
        onLog({ type: 'status', message: `[Reasoning] Agent is consulting the LLM model...` });
      }
    }
  ];
}

/**
 * Simulation mode when API keys are absent. Gives a high-fidelity visual preview.
 */
async function runSimulation(companyName, investmentProfile, onLog) {
  onLog({ type: 'status', message: '[Initiating] Initializing Simulation Research Agent (No API keys found)...' });
  await new Promise(r => setTimeout(r, 800));
  
  // Format Helper
  const formatAmount = (value) => {
    if (value === undefined || value === null) return 'N/A';
    const absVal = Math.abs(value);
    if (absVal >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (absVal >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (absVal >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (absVal >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  let resolvedTicker = companyName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'MOCK';
  let resolvedName = companyName;
  let sector = 'Technology / Consumer Discretionary';
  let industry = 'Growth Infrastructure';
  
  onLog({ type: 'status', message: `[Search] Resolving ticker symbol for "${companyName}"...` });
  try {
    const searchResult = await yahooFinance.search(companyName);
    if (searchResult.quotes && searchResult.quotes.length > 0) {
      const bestMatch = searchResult.quotes.filter(q => q.quoteType === 'EQUITY')[0] || searchResult.quotes[0];
      resolvedTicker = bestMatch.symbol;
      resolvedName = bestMatch.longname || bestMatch.shortname || companyName;
      sector = bestMatch.sector || sector;
      industry = bestMatch.industry || industry;
    }
  } catch (err) {
    console.error('Simulation resolution error:', err);
  }
  
  onLog({ type: 'status', message: `[Search] Symbol resolved to "${resolvedTicker}" (${resolvedName})` });
  await new Promise(r => setTimeout(r, 1000));

  onLog({ type: 'status', message: `[Financials] Loading key stats & ratios for symbol "${resolvedTicker}"...` });
  
  let currentPrice = 120.00;
  let marketCap = 'N/A';
  let peRatio = 'N/A';
  let eps = 1.5;
  let dividendYield = '0.00%';
  
  try {
    const quote = await yahooFinance.quote(resolvedTicker);
    currentPrice = quote.regularMarketPrice || currentPrice;
    marketCap = quote.marketCap ? formatAmount(quote.marketCap) : 'N/A';
    peRatio = quote.trailingPE || 'N/A';
    eps = quote.epsTrailingTwelveMonths !== undefined ? quote.epsTrailingTwelveMonths : eps;
    dividendYield = quote.dividendYield ? `${(quote.dividendYield).toFixed(2)}%` : '0.00%';
  } catch (err) {
    console.error('Simulation quote error:', err);
  }
  
  await new Promise(r => setTimeout(r, 1000));

  onLog({ type: 'status', message: `[Statements] Extracting 3-year Revenue, Balance sheet, and Cash Flow metrics for "${resolvedTicker}"...` });
  
  // Fetch real annual statement revenue trend or use realistic template
  let annualRevenueAndIncome = [
    { year: 2025, revenue: '$45.2B', grossProfit: '$28.4B', operatingIncome: '$10.2B', netIncome: '$8.4B' },
    { year: 2024, revenue: '$39.8B', grossProfit: '$24.6B', operatingIncome: '$8.9B', netIncome: '$7.1B' },
    { year: 2023, revenue: '$35.1B', grossProfit: '$21.2B', operatingIncome: '$7.8B', netIncome: '$6.2B' }
  ];
  
  try {
    const currentYear = new Date().getFullYear();
    const rawData = await yahooFinance.fundamentalsTimeSeries(resolvedTicker, {
      period1: `${currentYear - 3}-01-01`,
      module: 'all',
      type: 'annual'
    });
    if (rawData && rawData.length > 0) {
      const sortedData = rawData.sort((a, b) => new Date(a.date) - new Date(b.date));
      annualRevenueAndIncome = sortedData.map(item => ({
        year: new Date(item.date).getFullYear(),
        revenue: formatAmount(item.totalRevenue),
        grossProfit: formatAmount(item.grossProfit || (item.totalRevenue - (item.costOfRevenue || 0))),
        operatingIncome: formatAmount(item.operatingIncome),
        netIncome: formatAmount(item.netIncome),
      }));
    }
  } catch (err) {
    // Keep mock
  }

  await new Promise(r => setTimeout(r, 1200));

  onLog({ type: 'status', message: `[News] Scraping recent corporate announcements and business articles for "${resolvedTicker}"...` });
  await new Promise(r => setTimeout(r, 1000));

  onLog({ type: 'status', message: '[Reasoning] Simulating analyst reasoning and synthesizing investment thesis...' });
  await new Promise(r => setTimeout(r, 1200));
  
  // Decide whether to PASS based on negative EPS or explicit loss-makers/high-risk names
  const lowerName = companyName.toLowerCase();
  const isLossMaking = (eps !== undefined && eps < 0) || 
                      lowerName.includes('vodafone') || 
                      lowerName.includes('idea') || 
                      lowerName.includes('swiggy');
                      
  const isPass = isLossMaking || lowerName.includes('indusind') || lowerName.includes('zomato');
  
  const decision = isPass ? 'PASS' : 'INVEST';
  const riskRating = isLossMaking ? 'High' : (investmentProfile.includes('Growth') ? 'Medium' : 'Low');
  const targetPrice = isPass ? `$${(currentPrice * 0.82).toFixed(2)}` : `$${(currentPrice * 1.18).toFixed(2)}`;

  const mockResult = {
    companyProfile: {
      name: resolvedName,
      ticker: resolvedTicker,
      sector: sector,
      industry: industry,
      currentPrice: currentPrice,
      currency: resolvedTicker.endsWith('.NS') || resolvedTicker.endsWith('.BO') ? 'INR' : 'USD',
      marketCap: marketCap,
      peRatio: peRatio,
      dividendYield: investmentProfile.includes('Dividend') ? '3.42%' : dividendYield
    },
    decision: decision,
    targetPrice: targetPrice,
    riskRating: riskRating,
    executiveSummary: isPass 
      ? `Simulation Report: We recommend a PASS on ${resolvedName} (${resolvedTicker}) under the "${investmentProfile}" mandate. The company is currently experiencing material operational challenges. ${isLossMaking ? `Specifically, the firm is reporting net losses (EPS: ${eps}), showing capital dilution and cash burn.` : `The firm displays elevated bad loan provisions and asset-quality headwinds, failing to satisfy our safety and valuation thresholds.`}`
      : `Simulation Report: We recommend an INVEST decision for ${resolvedName} (${resolvedTicker}) under the "${investmentProfile}" mandate. The company exhibits robust operational efficiency, strong market share, and healthy margin execution, supporting long-term valuation appreciation.`,
    financialHealth: {
      liquidity: { 
        score: isPass ? 45 : 82, 
        explanation: isPass 
          ? `Quick ratio of 0.85 reflects potential short-term liquidity constraints under active cash burn.` 
          : `Quick ratio is 1.62, representing strong coverage of near-term liabilities with liquid cash reserves.` 
      },
      profitability: { 
        score: isPass ? 25 : 78, 
        explanation: isPass 
          ? `Negative trailing EPS of ${eps} shows persistent net losses and profit margins erosion.` 
          : `Return on Equity (ROE) sits at 18.4%, while operating margins remain steady.` 
      },
      growth: { 
        score: isPass ? 40 : 85, 
        explanation: isPass 
          ? `Revenue expansion is offset by high operational costs and lack of scale efficiency.` 
          : `Revenues grew 14.5% YoY in the last quarter, supported by core product demand.` 
      },
      solvency: { 
        score: isPass ? 50 : 72, 
        explanation: isPass 
          ? `Debt-to-equity ratios are elevated, introducing leverage risks during unprofitable phases.` 
          : `Debt-to-equity ratio of 0.85 indicates reasonable leverage coverage.` 
      }
    },
    pros: isPass ? [
      `Recognized consumer brand with a large active customer base.`,
      `Active turnaround strategies aiming to optimize pricing structures.`
    ] : [
      `Robust product pipeline with strong pricing power and brand recall.`,
      `Healthy capital allocation strategy focusing on high-ROI organic growth.`,
      `Growing base of recurring subscription service revenue.`
    ],
    cons: isPass ? [
      `Persistent net losses and negative EPS indicating lack of near-term profitability.`,
      `Weakening margins and cash burn straining liquidity buffers.`,
      `Intense competition from low-cost peers limiting pricing leverage.`
    ] : [
      `High valuation multiples relative to historical sector averages.`,
      `Regulatory pressures in foreign markets introducing compliance uncertainty.`
    ],
    detailedAnalysis: {
      financials: isPass 
        ? `Under the financial assessment, the company maintains stable assets but carries a high leverage relative to operating cash flows. Negative margins (with trailing EPS of ${eps}) indicate that revenues are currently insufficient to cover administrative and interest outlays, leading to potential capital dilution.`
        : `Financial review shows strong balance sheet execution. The company maintains stable assets. Net revenues show an upward trend over the last three years, which matches the target Profile requirements. Cash flow operations are positive, providing adequate flexibility for investments.`,
      moat: isPass 
        ? `While the firm has a recognized brand, it lacks a sustainable competitive moat. Low switching costs and aggressive pricing from well-funded peers limit margins expansion.`
        : `The business maintains a strong competitive position. High switching costs and product integrations create a sticky customer base, forming a defensive moat that shields market share from peer entrants.`,
      risks: isPass 
        ? `Key risks are elevated. For loss-making startups and heavily leveraged companies, debt servicing and capital preservation are major vulnerabilities. Macroeconomic tightening could trigger solvency concerns.`
        : `Key risks include macroeconomic headwinds, inflationary wage pressures, and potential disruptions in supply distribution. Under speculative mandates, these risks represent potential downside volatility.`
    },
    historicalStatements: {
      annualRevenueAndIncome: annualRevenueAndIncome,
      annualBalanceSheet: [
        { year: 2025, totalAssets: '$68.4B', totalLiabilities: '$28.2B', equity: '$40.2B', cashAndShortTermInvestments: '$12.5B' },
        { year: 2024, totalAssets: '$58.1B', totalLiabilities: '$24.6B', equity: '$33.5B', cashAndShortTermInvestments: '$10.2B' },
        { year: 2023, totalAssets: '$49.5B', totalLiabilities: '$21.1B', equity: '$28.4B', cashAndShortTermInvestments: '$8.9B' }
      ],
      annualCashFlow: [
        { year: 2025, operatingCashFlow: '$12.4B', capitalExpenditures: '$3.2B', freeCashFlow: '$9.2B' },
        { year: 2024, operatingCashFlow: '$10.1B', capitalExpenditures: '$2.8B', freeCashFlow: '$7.3B' },
        { year: 2023, operatingCashFlow: '$8.5B', capitalExpenditures: '$2.4B', freeCashFlow: '$6.1B' }
      ]
    }
  };

  onLog({ type: 'result', data: mockResult });
  return mockResult;
}

/**
 * Runs the complete investment research flow for a company.
 * Streams intermediate steps and returns a structured JSON investment thesis.
 */
export async function runInvestmentResearch(companyName, investmentProfile = 'Growth', onLog) {
  // If no API keys are present, switch to visual demo mode automatically
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return runSimulation(companyName, investmentProfile, onLog);
  }

  try {
    onLog({ type: 'status', message: `[Initiating] Initializing Research Agent for "${companyName}" under "${investmentProfile}" mandate...` });

    const llm = getLLM();
    
    // Define the agent prompt
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a senior investment research analyst and fund manager. Your objective is to conduct thorough financial research on the company requested by the user, and make a clear decision on whether to INVEST or PASS (or give a WARNING for speculative profiles), along with a rich, detailed investment thesis.
        
        The research must be tailored to the selected investment mandate/profile: "{investmentProfile}".
        Mandates guidelines:
        - "Aggressive Growth": Focus on high revenue growth, expanding TAM, market share, and technological edge. Willing to accept high P/E or negative earnings if cash flow / growth is exceptional.
        - "Defensive Value": Focus on strong balance sheet, positive free cash flows, low debt-to-equity, attractive valuations (low P/E or high PEG margin), and stable earnings.
        - "Dividend/Income": Focus on high dividend yield, stable payouts, low dividend payout ratio, and predictable business model.
        - "ESG/Sustainable": Focus on high corporate governance, clean energy or green transition alignment, ethical business operations, alongside sound financial sustainability.

        Your research path MUST include:
        1. Resolve the company name to its stock ticker.
        2. Fetch the financial summary (valuation multiples, prices, beta, margins, leverage).
        3. Fetch the annual financial statements (income trend, balance sheet safety, Free Cash Flow).
        4. Fetch recent news to identify recent business headwinds/tailwinds, product launches, or scandals.
        5. (Optional) Run web searches to fetch competitive analysis or macroeconomic headwinds if required.

        After gathering all details, synthesize your analysis and output a single, complete JSON object.
        CRITICAL: Your final output must be VALID JSON and ONLY the JSON object. Do not include any conversational text before or after the JSON.
        You may format the JSON inside markdown code blocks, i.e.:
        \`\`\`json
        {{
          "companyProfile": {{
            "name": "Full Company Name",
            "ticker": "TICKER",
            "sector": "Sector",
            "industry": "Industry",
            "currentPrice": 0.00,
            "currency": "USD",
            "marketCap": "Market Cap",
            "peRatio": "P/E Ratio",
            "dividendYield": "Div Yield"
          }},
          "decision": "INVEST", // Must be "INVEST", "PASS", or "WARNING"
          "targetPrice": "Estimated 12-Month Target Price (e.g. $150.00)",
          "riskRating": "Medium", // Must be "Low", "Medium", "High", or "Extreme"
          "executiveSummary": "A concise, professional 3-4 sentence paragraph summarizing the decision, primary catalysts, and core risks.",
          "financialHealth": {{
            "liquidity": {{ "score": 80, "explanation": "Quick ratio is 1.5, meaning ample short-term coverage..." }},
            "profitability": {{ "score": 90, "explanation": "ROE is 25% and profit margins are rising..." }},
            "growth": {{ "score": 70, "explanation": "Revenues are growing at 12% YoY, led by services..." }},
            "solvency": {{ "score": 85, "explanation": "Debt is low and interest coverage is over 10x..." }}
          }},
          "pros": [
            "Pro point 1 with reasoning",
            "Pro point 2 with reasoning",
            "Pro point 3 with reasoning"
          ],
          "cons": [
            "Con point 1 with reasoning",
            "Con point 2 with reasoning",
            "Con point 3 with reasoning"
          ],
          "detailedAnalysis": {{
            "financials": "Write a detailed 2-paragraph analysis of their balance sheet, debt levels, cash flow trends, and valuation multiples compared to historical averages.",
            "moat": "Write a detailed 1-2 paragraph analysis of their competitive advantages, market share, and growth drivers (especially in the context of the requested {investmentProfile} profile).",
            "risks": "Write a detailed 1-2 paragraph analysis of regulatory threats, competitor pressure, supply chain bottlenecks, or valuation risks."
          }}
        }}
        \`\`\`

        Ensure you do not hallucinate any figures. If a tool fails to return details (e.g., historical statements are blank), state that in your analysis and rely on the metrics that you DO have.
        Begin your research process now. Start by resolving the ticker symbol.`
      ],
      ['human', 'Conduct investment research for: {companyName}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const agent = createToolCallingAgent({
      llm,
      tools,
      prompt
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      callbacks: createStreamingCallbacks(onLog)
    });

    const result = await agentExecutor.invoke({
      companyName,
      investmentProfile
    });

    // Parse the JSON output
    const outputText = result.output;
    onLog({ type: 'status', message: `[Parsing] Parsing structured investment report...` });
    
    // Extract JSON block if LLM wrapped it in markdown code blocks
    let jsonText = outputText.trim();
    if (jsonText.includes('```json')) {
      const startIdx = jsonText.indexOf('```json') + 7;
      const endIdx = jsonText.lastIndexOf('```');
      jsonText = jsonText.substring(startIdx, endIdx).trim();
    } else if (jsonText.startsWith('```')) {
      const startIdx = jsonText.indexOf('```') + 3;
      const endIdx = jsonText.lastIndexOf('```');
      jsonText = jsonText.substring(startIdx, endIdx).trim();
    }
    
    try {
      const parsedData = JSON.parse(jsonText);
      
      // Inject raw historical statement data if available to render table in frontend
      try {
        const ticker = parsedData.companyProfile?.ticker || companyName;
        if (ticker && ticker !== 'N/A') {
          onLog({ type: 'status', message: `[System] Hydrating historical trend tables for "${ticker}"...` });
          
          const currentYear = new Date().getFullYear();
          const period1 = `${currentYear - 4}-01-01`;
          
          const rawData = await yahooFinance.fundamentalsTimeSeries(ticker, {
            period1,
            module: 'all',
            type: 'annual'
          });

          if (rawData && rawData.length > 0) {
            const sortedData = rawData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Format Helper
            const formatAmount = (value) => {
              if (value === undefined || value === null) return 'N/A';
              const absVal = Math.abs(value);
              if (absVal >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
              if (absVal >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
              if (absVal >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
              if (absVal >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
              return `$${value.toFixed(2)}`;
            };

            parsedData.historicalStatements = {
              annualRevenueAndIncome: sortedData.map(item => ({
                year: new Date(item.date).getFullYear(),
                revenue: formatAmount(item.totalRevenue),
                grossProfit: formatAmount(item.grossProfit || (item.totalRevenue - (item.costOfRevenue || 0))),
                operatingIncome: formatAmount(item.operatingIncome),
                netIncome: formatAmount(item.netIncome),
              })),
              annualBalanceSheet: sortedData.map(item => ({
                year: new Date(item.date).getFullYear(),
                totalAssets: formatAmount(item.totalAssets),
                totalLiabilities: formatAmount(item.totalLiabilitiesNetMinorityInterest || item.totalLiab),
                equity: formatAmount(item.commonStockEquity || item.stockholdersEquity),
                cashAndShortTermInvestments: formatAmount(item.cashCashEquivalentsAndShortTermInvestments || item.cash),
              })),
              annualCashFlow: sortedData.map(item => {
                const operatingCash = item.operatingCashFlow || 0;
                const capex = Math.abs(item.capitalExpenditure || 0);
                const fcf = item.freeCashFlow || (operatingCash - capex);
                return {
                  year: new Date(item.date).getFullYear(),
                  operatingCashFlow: formatAmount(operatingCash),
                  capitalExpenditures: formatAmount(capex),
                  freeCashFlow: formatAmount(fcf),
                };
              }),
            };
          }
        }
      } catch (hydrationError) {
        console.warn('Hydration of statements failed:', hydrationError.message);
      }

      onLog({ type: 'result', data: parsedData });
      return parsedData;
    } catch (parseError) {
      console.error('Failed to parse JSON returned by LLM. Raw text:', outputText);
      onLog({ 
        type: 'status', 
        message: `[Error] LLM output did not match valid JSON. Attempting text recovery...` 
      });
      
      // Return a basic structure wrapping the raw text to prevent UI crash
      const recoveryData = {
        companyProfile: { name: companyName, ticker: 'N/A' },
        decision: 'WARNING',
        targetPrice: 'N/A',
        riskRating: 'High',
        executiveSummary: 'The agent completed the research but output could not be parsed into a dashboard layout. Please check the raw logs below.',
        financialHealth: {
          liquidity: { score: 50, explanation: 'N/A' },
          profitability: { score: 50, explanation: 'N/A' },
          growth: { score: 50, explanation: 'N/A' },
          solvency: { score: 50, explanation: 'N/A' }
        },
        pros: ['See detailed analysis'],
        cons: ['See detailed analysis'],
        detailedAnalysis: {
          financials: 'Raw Output:\n' + outputText,
          moat: 'Error parsing structured response.',
          risks: 'Error parsing structured response.'
        }
      };
      
      onLog({ type: 'result', data: recoveryData });
      return recoveryData;
    }
  } catch (err) {
    onLog({ type: 'error', message: `[Failure] Investment research run failed: ${err.message}` });
    throw err;
  }
}
