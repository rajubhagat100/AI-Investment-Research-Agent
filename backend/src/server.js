import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { runInvestmentResearch } from './agent/agent.js';

// Force Node.js to resolve IPv4 addresses first to avoid socket connection failures to Google APIs on Render
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend dev server
app.use(cors({
  origin: '*', // Allow any origin in development, but you can pin it to the frontend URL if desired
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json());

// Root landing page to guide users to Vercel
app.get('/', (req, res) => {
  const targetUrl = req.headers.referer || 'https://ai-investment-research-agent-pi.vercel.app';
  res.send(`
    <html>
      <head>
        <title>AURA Backend API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #060913; color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          a { color: #6366f1; text-decoration: none; border-bottom: 2px solid #6366f1; padding-bottom: 2px; font-weight: 600; transition: all 0.2s; }
          a:hover { color: #a5b4fc; border-color: #a5b4fc; }
          .card { background: rgba(17, 24, 39, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); padding: 3rem; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); max-width: 450px; }
          h2 { font-size: 1.8rem; margin-top: 0; color: #a5b4fc; }
          p { color: #9ca3af; line-height: 1.6; margin-bottom: 1.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>AURA Research Agent API</h2>
          <p>This is the server-side API processing engine. To perform stock research and access the interactive dashboard, please open the client portal:</p>
          <p style="font-size: 1.1rem; margin-bottom: 0;">
            <a href="${targetUrl}" target="_blank">Open AURA Frontend Dashboard &rarr;</a>
          </p>
        </div>
      </body>
    </html>
  `);
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    llmProvider: process.env.GEMINI_API_KEY ? 'Gemini' : (process.env.OPENAI_API_KEY ? 'OpenAI' : 'None configured')
  });
});

/**
 * Server-Sent Events (SSE) Route to stream live agent research steps and thoughts.
 * Usage: GET /api/research/stream?companyName=Nvidia&profile=Growth
 */
app.get('/api/research/stream', async (req, res) => {
  const { companyName, profile } = req.query;

  if (!companyName) {
    return res.status(400).json({ error: 'companyName query parameter is required' });
  }

  const investmentProfile = profile || 'Growth';

  // Setup headers for Server-Sent Events (preserving CORS headers from middleware)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in proxy servers like Nginx

  // Flush headers immediately
  res.flushHeaders();

  console.log(`[SSE Stream] Starting research for "${companyName}" with profile "${investmentProfile}"`);

  // Helper to send formatted SSE messages
  const sendSSE = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush(); // Flush if using compression/gzip middleware
  };

  let isActive = true;

  req.on('close', () => {
    console.log(`[SSE Stream] Client disconnected from stream for "${companyName}"`);
    isActive = false;
  });

  try {
    await runInvestmentResearch(companyName, investmentProfile, (logEvent) => {
      if (!isActive) return;
      
      // logEvent is { type: 'status' | 'result' | 'error', message?: string, data?: any }
      if (logEvent.type === 'status') {
        sendSSE('status', { message: logEvent.message });
      } else if (logEvent.type === 'result') {
        sendSSE('result', logEvent.data);
      }
    });

    if (isActive) {
      sendSSE('done', { success: true });
      res.end();
    }
  } catch (error) {
    console.error('[SSE Stream Error] Agent run failed:', error);
    if (isActive) {
      sendSSE('error', { message: error.message || 'Investment research agent encountered an error.' });
      res.end();
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  AI Investment Agent Backend Server running on:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`==================================================`);
});
