import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();


/**
 * Format raw monetary values into human-readable strings (e.g., $1.2B, $450.5M)
 */
function formatAmount(value) {
  if (value === undefined || value === null) return 'N/A';
  const absVal = Math.abs(value);
  if (absVal >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (absVal >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (absVal >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (absVal >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Tool 1: Ticker Resolver
 * Resolves a company name (e.g. "Apple") to its ticker symbol (e.g. "AAPL").
 */
export const tickerResolver = tool(
  async ({ companyName }) => {
    try {
      const results = await yahooFinance.search(companyName);
      if (!results || !results.quotes || results.quotes.length === 0) {
        return `Could not find any ticker symbol for "${companyName}". Ask the user to provide the exact ticker.`;
      }
      
      // Filter for stock equities first, if available
      const equities = results.quotes.filter(q => q.quoteType === 'EQUITY');
      const bestMatch = equities.length > 0 ? equities[0] : results.quotes[0];
      
      return JSON.stringify({
        ticker: bestMatch.symbol,
        name: bestMatch.longname || bestMatch.shortname,
        exchange: bestMatch.exchange,
        type: bestMatch.quoteType,
        sector: bestMatch.sector || 'N/A',
        industry: bestMatch.industry || 'N/A',
      }, null, 2);
    } catch (error) {
      return `Error resolving ticker for "${companyName}": ${error.message}`;
    }
  },
  {
    name: 'ticker_resolver',
    description: 'Finds the stock ticker symbol, company name, and industry for a given company name.',
    schema: z.object({
      companyName: z.string().describe('The name of the company to search for (e.g. "Nvidia")'),
    }),
  }
);

/**
 * Tool 2: Financial Summary
 * Fetches real-time price info, valuation ratios, and margins.
 */
export const getFinancialSummary = tool(
  async ({ ticker }) => {
    try {
      const quote = await yahooFinance.quote(ticker);
      
      // Fetch key stats and financial data
      let details = {};
      try {
        details = await yahooFinance.quoteSummary(ticker, {
          modules: ['financialData', 'defaultKeyStatistics']
        });
      } catch (e) {
        // Fallback to basic quote if quoteSummary fails
      }

      const fd = details.financialData || {};
      const ks = details.defaultKeyStatistics || {};

      return JSON.stringify({
        ticker: ticker,
        name: quote.longName || quote.shortName || ticker,
        currentPrice: quote.regularMarketPrice,
        currency: quote.currency,
        marketCap: formatAmount(quote.marketCap),
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        peRatio: quote.trailingPE || 'N/A',
        forwardPeRatio: quote.forwardPE || 'N/A',
        pegRatio: ks.pegRatio || 'N/A',
        eps: quote.epsTrailingTwelveMonths || 'N/A',
        dividendYield: quote.dividendYield ? `${(quote.dividendYield).toFixed(2)}%` : 'N/A',
        beta: ks.beta || 'N/A',
        debtToEquity: fd.debtToEquity || 'N/A',
        currentRatio: fd.currentRatio || 'N/A',
        profitMargin: fd.profitMargins ? `${(fd.profitMargins * 100).toFixed(2)}%` : 'N/A',
        operatingMargin: fd.operatingMargins ? `${(fd.operatingMargins * 100).toFixed(2)}%` : 'N/A',
        returnOnEquity: fd.returnOnEquity ? `${(fd.returnOnEquity * 100).toFixed(2)}%` : 'N/A',
        revenueGrowth: fd.revenueGrowth ? `${(fd.revenueGrowth * 100).toFixed(2)}%` : 'N/A',
      }, null, 2);
    } catch (error) {
      return `Error fetching financial summary for ${ticker}: ${error.message}`;
    }
  },
  {
    name: 'get_financial_summary',
    description: 'Fetches real-time market data, valuation multiples (P/E, PEG), margins, and leverage ratios for a ticker symbol.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol (e.g. "AAPL")'),
    }),
  }
);

/**
 * Tool 3: Financial Statements
 * Fetches recent 3-4 years of Income Statement, Balance Sheet, and Cash Flow metrics.
 */
export const getFinancialStatements = tool(
  async ({ ticker }) => {
    try {
      // Fetch annual historical statements using the new fundamentalsTimeSeries endpoint
      const currentYear = new Date().getFullYear();
      const period1 = `${currentYear - 4}-01-01`; // Get last 4 years of data
      
      const rawData = await yahooFinance.fundamentalsTimeSeries(ticker, {
        period1,
        module: 'all',
        type: 'annual'
      });

      if (!rawData || rawData.length === 0) {
        return `No annual statement data found for "${ticker}".`;
      }

      // Sort statements chronological ascending (oldest to newest)
      const sortedData = rawData.sort((a, b) => new Date(a.date) - new Date(b.date));

      const statementTrends = {
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

      return JSON.stringify(statementTrends, null, 2);
    } catch (error) {
      return `Error fetching financial statements for ${ticker}: ${error.message}. Falls back to current metrics.`;
    }
  },
  {
    name: 'get_financial_statements',
    description: 'Fetches annual historical revenues, net income, balance sheet levels (assets/liabilities/cash), and cash flows (FCF) for the last 3-4 years.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol (e.g. "AAPL")'),
    }),
  }
);

/**
 * Tool 4: Company News
 * Retrieves recent news and sentiment items for a company ticker.
 */
export const getCompanyNews = tool(
  async ({ ticker }) => {
    try {
      // search returns both quotes and news
      const results = await yahooFinance.search(ticker);
      if (!results || !results.news || results.news.length === 0) {
        return `No news articles found for "${ticker}".`;
      }

      const formattedNews = results.news.map(article => ({
        title: article.title,
        publisher: article.publisher,
        publishedAt: new Date(article.providerPublishTime * 1000).toLocaleDateString(),
        link: article.link
      })).slice(0, 10); // Limit to top 10 news items

      return JSON.stringify(formattedNews, null, 2);
    } catch (error) {
      return `Error fetching news for ${ticker}: ${error.message}`;
    }
  },
  {
    name: 'get_company_news',
    description: 'Retrieves current stock market news articles, press releases, and publications related to a company symbol.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol (e.g. "AAPL")'),
    }),
  }
);

/**
 * Tool 5: General Web Search (Tavily Fallback)
 * Allows the agent to look up external web queries if API keys are set.
 */
export const webSearch = tool(
  async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      // Fallback: Perform a search query using yahooFinance.search
      try {
        const result = await yahooFinance.search(query);
        const articles = result.news || [];
        if (articles.length === 0) {
          return `Tavily API key is missing, and Yahoo Finance Search returned no relevant external pages for "${query}".`;
        }
        return `Tavily API key is missing. Reverted to Yahoo Finance news scraper. Found matches:\n` +
          JSON.stringify(articles.slice(0, 5).map(a => ({ title: a.title, link: a.link })), null, 2);
      } catch (err) {
        return `Tavily API key is missing, and fallback Yahoo Search failed: ${err.message}`;
      }
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: 'basic',
          max_results: 5
        })
      });
      const data = await response.json();
      if (data.results) {
        return JSON.stringify(data.results.map(r => ({
          title: r.title,
          content: r.content,
          url: r.url
        })), null, 2);
      }
      return `No web results found for "${query}" via Tavily.`;
    } catch (error) {
      return `Error performing web search for "${query}": ${error.message}`;
    }
  },
  {
    name: 'web_search',
    description: 'Searches the web for articles, market rumors, competitor stats, regulatory releases, or analyst opinions.',
    schema: z.object({
      query: z.string().describe('The search query (e.g. "nvidia blackwell launch delays")'),
    }),
  }
);
