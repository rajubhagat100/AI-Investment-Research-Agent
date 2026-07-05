import dotenv from 'dotenv';
import { 
  tickerResolver, 
  getFinancialSummary, 
  getFinancialStatements, 
  getCompanyNews 
} from './agent/tools.js';

dotenv.config();

console.log('==================================================');
console.log('  Testing Financial Tools in Isolation (Real Data)');
console.log('==================================================\n');

async function runTests() {
  try {
    // Test 1: Ticker Resolution
    console.log('1. Testing ticker_resolver for "Microsoft"...');
    const resolverResult = await tickerResolver.invoke({ companyName: 'Microsoft' });
    console.log('Result:');
    console.log(resolverResult);
    console.log('--------------------------------------------------\n');

    // Parse ticker from result
    const parsed = JSON.parse(resolverResult);
    const ticker = parsed.ticker;

    if (!ticker) {
      throw new Error('Failed to resolve ticker symbol for Microsoft.');
    }

    // Test 2: Get Financial Summary
    console.log(`2. Testing get_financial_summary for "${ticker}"...`);
    const summaryResult = await getFinancialSummary.invoke({ ticker });
    console.log('Result:');
    console.log(summaryResult);
    console.log('--------------------------------------------------\n');

    // Test 3: Get Financial Statements
    console.log(`3. Testing get_financial_statements for "${ticker}"...`);
    const statementsResult = await getFinancialStatements.invoke({ ticker });
    console.log('Result (truncated):');
    console.log(statementsResult.substring(0, 1000) + '...');
    console.log('--------------------------------------------------\n');

    // Test 4: Get Company News
    console.log(`4. Testing get_company_news for "${ticker}"...`);
    const newsResult = await getCompanyNews.invoke({ ticker });
    console.log('Result (truncated):');
    console.log(newsResult.substring(0, 1000) + '...');
    console.log('--------------------------------------------------\n');

    console.log('==================================================');
    console.log('  All Financial Tools Working Correctly!');
    console.log('==================================================');
  } catch (error) {
    console.error('Tools Testing Failed:', error);
    process.exit(1);
  }
}

runTests();
