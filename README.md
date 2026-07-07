# AURA: AI Investment Research Agent

AURA (Autonomous Utility Research Analyst) is a high-fidelity, AI-powered investment research agent. It takes a company name, resolves it to a ticker, fetches real-time market data, pulls 4 years of annual financial statements, extracts recent news, and evaluates the company against a selected investment profile. It then issues a final recommendation ("INVEST", "PASS", or "WARNING") with a detailed financial thesis, comparative tables, pros/cons, and interactive progress gauges.

---

## Overview

AURA is split into:
1. **React Frontend Dashboard**: A glassmorphic, responsive dark-themed dashboard. It displays a live-streaming agent console (showing exact thought paths) and transitions to a detailed report view (ratios, pros vs. cons, liquidity/growth gauges, and raw annual statement highlights).
2. **Node.js Express Backend**: Hosts Server-Sent Events (SSE) routes to stream agent status updates dynamically as the research tools execute.
3. **LangChain.js Agent Engine**: Implements a tool-calling agent with a flexible LLM driver (supporting Google Gemini or OpenAI) and custom Yahoo Finance tools.
4. **Resilient Sandbox Fallback**: If LLM API credentials are not set, the backend automatically activates **Simulation / Demo Mode**, running the complete agent telemetry stream with realistic delays and returning high-fidelity mockup reports.

---

## How to Run It

### Prerequisites
* **Node.js** (v20 or higher)
* **npm** (v10 or higher)

### Setup Steps
1. Open your terminal in the project root directory.
2. Run the bulk installer script to install root, backend, and frontend dependencies in one command:
   ```bash
   npm run install:all
   ```

### Configuration & API Keys
1. Navigate to the `backend` folder.
2. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your preferred LLM provider key (provide at least one):
   * `GEMINI_API_KEY`: Google Gemini Key (Recommended model: `gemini-1.5-pro` or `gemini-1.5-flash`)
   * `OPENAI_API_KEY`: OpenAI Key (Model: `gpt-4o-mini`)
   * (Optional) `TAVILY_API_KEY`: To enable general web queries for the search tool.

> [!NOTE]
> If both `GEMINI_API_KEY` and `OPENAI_API_KEY` are omitted, the app will run in **Demo / Simulation Mode** automatically. You do NOT need to sign up for financial data API keys (like Alpha Vantage/Polygon) — Yahoo Finance tools execute natively without keys.

### Running the Application
To start both the frontend and backend servers concurrently, run:
```bash
npm run dev
```
* **Frontend**: Accessible at `http://localhost:5173`
* **Backend**: Running at `http://localhost:5000`

### Developer Testing Utilities (CLI)
You can run the backend scrapers and agents directly inside the terminal:
* **Test isolated Yahoo Finance tools** (fetches real-world symbols, financials, news without API keys):
  ```bash
  node backend/src/test-tools.js
  ```
* **Test the agent pipeline** (executes simulation or real agent runs directly to console stdout):
  ```bash
  npm run test-agent --prefix backend "Apple" "Defensive Value"
  ```

---

## How It Works: Approach & Architecture

### Execution Flow
1. **User Request**: The user enters a company name (e.g., "Nvidia") and selects an objective profile (e.g., "Aggressive Growth").
2. **SSE Handshake**: React initiates a `EventSource` connection to `/api/research/stream`.
3. **Agent Activation**: The backend instantiates a LangChain `AgentExecutor` with a customized system prompt aligned to the selected mandate.
4. **Tool Selection Loop**: The agent operates a ReAct cycle using the custom tools:
   * **`ticker_resolver`**: Searches Yahoo Finance directory to convert the query into a stock ticker symbol (e.g. `NVDA`).
   * **`get_financial_summary`**: Queries Yahoo quotes for price, market cap, beta, margins, trailing/forward P/E, PEG, debt ratios, and dividend yields.
   * **`get_financial_statements`**: Queries the Yahoo time-series API to pull the last 4 years of annual revenues, balance sheets, and cash flows.
   * **`get_company_news`**: Scrapes recent corporate press releases and publications for sentiment.
   * **`web_search`** (Optional): Uses Tavily if available to look up macro news or competitor delays.
5. **SSE Telemetry**: Every time a tool is called or the LLM reasons, status logs are formatted and written directly to the active SSE stream.
6. **Result Synthesis**: The LLM compiles all findings, grades the company's metrics against the mandate, and outputs a strict JSON report schema.
7. **Hydration**: The backend catches the agent output, queries Yahoo's annual statements in parallel, and appends the exact time-series data structures to the payload before serving the final `result` event.
8. **UI Render**: React shuts the stream, parses the JSON payload, and renders the charts, gauges, and comparison grids on the dashboard.

---

## Key Decisions & Trade-offs

### 1. Ingestion: Yahoo Finance (`yahoo-finance2`) vs. Paid Financial APIs
* **Decision**: We chose `yahoo-finance2` over APIs like Alpha Vantage, Polygon.io, or FMP.
* **Pros**: It is completely free, requires **zero API key registration**, and has no rate limits or sandbox constraints. This guarantees the application works immediately out-of-the-box for reviewers.
* **Trade-off**: Yahoo Finance scrapers are unofficial and rely on HTML parsing and internal endpoints. If Yahoo changes its internal schemas, the library can break (though it is actively maintained). To mitigate this, we wrapped all tool executions in robust try-catch fallbacks.

### 2. Upgrading to `fundamentalsTimeSeries`
* **Decision**: In late 2024, Yahoo Finance deprecated the legacy submodules inside `quoteSummary` (e.g., `balanceSheetHistory`), returning empty datasets. We refactored our tools to use the newer `fundamentalsTimeSeries` endpoint with the options `type: 'annual', module: 'all'`.
* **Pros**: It successfully retrieves 4 years of actual, complete historical statements (Assets, Liabilities, FCF, Revenues) without returning empty arrays.
* **Trade-off**: The keys returned are highly granular and require a manual formatter to normalize properties (e.g., mapping `totalLiabilitiesNetMinorityInterest` as liabilities).

### 3. Server-Sent Events (SSE) vs. WebSockets
* **Decision**: We chose Server-Sent Events (`EventSource`) to stream intermediate logs.
* **Pros**: SSE is unidirectional, lightweight, runs natively over HTTP/S without extra libraries (like Socket.io), and handles reconnection automatically. It is the perfect choice for streaming text logs from server to client.
* **Trade-off**: SSE does not support upstream client messages once open. Since the agent only needs company names on start, bidirectional WebSockets were unnecessary.

### 4. Interactive Simulation Sandbox
* **Decision**: If LLM API keys are absent, we run a high-fidelity visual simulator instead of throwing a fatal error.
* **Pros**: This ensures the app is immediately reviewable, showing realistic console scroll animations and letting the reviewer inspect the dashboard layouts, responsive gauges, and statement history grids.

---

## Example Runs (Simulated or Real outputs)

### 1. NVIDIA Corporation (NVDA) - Mandate: Aggressive Growth
* **Recommendation**: **INVEST**
* **Target Price**: $165.00
* **Risk Rating**: High
* **Executive Summary**: Nvidia represents a strong investment opportunity for growth-focused profiles. The firm has a near-monopoly on high-end AI acceleration hardware (Blackwell & Hopper architectures). Valuation multiples are high (P/E ~70x), but high revenue growth (180% YoY) and net operating margins exceeding 50% justify this premium.
* **Financial Health**: Growth: 95%, Profitability: 92%, Liquidity: 80%, Solvency: 75%.
* **Pros**:
  * Undisputed leader in AI GPU computing with massive capital expenditures backlog.
  * Exceptional cash generation with Free Cash Flow yield expanding rapidly.
  * Strong competitive moat created by CUDA software ecosystem.
* **Cons**:
  * High customer concentration risk (hyper-scalers represent 40% of sales).
  * Geopolitical export restrictions (limitations on shipping to China).
  * Supply bottlenecks (dependency on TSMC packaging capacities).

### 2. Apple Inc. (AAPL) - Mandate: Defensive Value
* **Recommendation**: **INVEST**
* **Target Price**: $260.00
* **Risk Rating**: Medium
* **Executive Summary**: Apple is a premier defensive asset. Operating cash flows remain robust, exceeding $110B annually. Hardware sales growth is moderate, but high-margin Services revenue (Apple One, App Store) continues to expand, insulating margins.
* **Financial Health**: Solvency: 85%, Liquidity: 82%, Profitability: 78%, Growth: 70%.
* **Pros**:
  * sticky ecosystem lock-in with 2.2B active devices.
  * Consistent share buyback programs and dividend increases.
  * Low debt leverage relative to earnings.
* **Cons**:
  * Flat hardware growth in key regions (like China).
  * Heightened antitrust regulatory reviews in the US and Europe.

### 3. Tesla Inc. (TSLA) - Mandate: Defensive Value
* **Recommendation**: **PASS**
* **Target Price**: $180.00
* **Risk Rating**: High
* **Executive Summary**: Tesla fails to meet the criteria for a Defensive Value mandate. Automotive gross margins have compressed from 28% to 17% due to EV price cutting, and free cash flows have experienced relative contraction. The valuation multiple remains speculative (P/E ~60x), indicating high downside volatility.
* **Financial Health**: Growth: 65%, Profitability: 70%, Liquidity: 75%, Solvency: 70%.
* **Pros**:
  * Strong cash cushion ($25B+) and brand presence.
  * Expanding energy storage storage segment.
* **Cons**:
  * Margin deterioration due to price competition.
  * High cyclicality of automotive sales.

---

## Deploying to Production: Vercel + Render

Because the agent leverages **Server-Sent Events (SSE)** to stream intermediate reasoning steps to the frontend, a traditional serverless host (like Vercel Serverless Functions) is **not recommended** for the backend since Vercel's free serverless lambdas buffer HTTP responses and time out after 10–15 seconds, breaking the SSE console stream.

Therefore, we recommend a **Split Deployment** strategy:
1. **Frontend (React)**: Deployed to **Vercel** (fully optimized for static React/Vite builds).
2. **Backend (Express)**: Deployed to **Render.com** (fully supports persistent HTTP connections for SSE).

---
## What We Would Improve with More Time

1. **Multi-Agent Consensus (Crew.ai style)**:
   * Implement multiple specialized agents (e.g., a **Chartered Financial Analyst** to evaluate balance sheets, a **Macro Economist** to assess inflation/rates, a **News Analyst** to look up scandals), and a **Portfolio Manager** agent that reads their reports and makes the final Invest/Pass call.
2. **Filing Scrapers (SEC EDGAR)**:
   * Build a tool to scrape 10-K and 10-Q text directly from the SEC EDGAR system to check for "Risk Factors" and off-balance-sheet footnotes.
3. **Interactive Q&A Session**:
   * Add a chat box below the dashboard allowing the user to ask follow-up questions to the agent (e.g. "Why did their operating margins decline in 2024?").
4. **PDF Generation**:
   * Add a button to download the synthesized investment thesis and charts as a formatted PDF dossier.

---

## Chat Logs
As mandated by the bonus guidelines, we have included the complete chronological conversational logs of the developer-AI chat sessions during the creation of this project. 
The logs are exported directly in the workspace as:
* **[chat_logs.jsonl](file:///c:/Users/bhaga/Desktop/aipro/chat_logs.jsonl)** (Raw JSON Lines format including all tool execution payloads, system messages, and reasoning transcripts).


## DEPLOYMENT LINKS
**VERCAL** https://ai-investment-research-agent-pi.vercel.app/
**RENDER** https://ai-investment-research-agent-backend-7p7m.onrender.com/

