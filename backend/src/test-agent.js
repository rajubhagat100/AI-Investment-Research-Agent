import dotenv from 'dotenv';
import { runInvestmentResearch } from './agent/agent.js';

// Load environment variables
dotenv.config();

// Get company name from CLI arguments or default to Tesla
const companyName = process.argv[2] || 'Tesla';
const profile = process.argv[3] || 'Aggressive Growth';

console.log(`==================================================`);
console.log(`  Starting CLI Investment Research Agent Test Run`);
console.log(`  Company: ${companyName}`);
console.log(`  Profile: ${profile}`);
console.log(`==================================================\n`);

async function test() {
  try {
    const result = await runInvestmentResearch(companyName, profile, (logEvent) => {
      if (logEvent.type === 'status') {
        console.log(logEvent.message);
      } else if (logEvent.type === 'result') {
        console.log('\n--- AGENT GENERATED STRUCTURED RESULT ---');
        console.log(JSON.stringify(logEvent.data, null, 2));
      }
    });
    
    console.log('\n==================================================');
    console.log('  Agent Test Run Completed Successfully!');
    console.log('==================================================');
  } catch (error) {
    console.error('\nAgent Test Run Failed:', error);
    process.exit(1);
  }
}

test();
