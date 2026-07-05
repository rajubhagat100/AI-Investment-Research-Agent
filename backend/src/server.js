import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runInvestmentResearch } from './agent/agent.js';

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

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
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

  // Setup headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering in proxy servers like Nginx
  });

  // Flush headers immediately
  res.write('\n');

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
