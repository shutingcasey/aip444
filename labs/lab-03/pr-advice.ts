import dotenv from 'dotenv';

// Locate and load .env
dotenv.config();

// Read API Key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Validate API Key
if (!OPENROUTER_API_KEY) {
  console.log('❌ Error: OPENROUTER_API_KEY not found');
  process.exit(1);
}

console.log('✅ API Key loaded successfully');