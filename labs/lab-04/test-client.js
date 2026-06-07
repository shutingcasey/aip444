import { readFile } from 'node:fs/promises';
import path from 'node:path';

// TODO: define a path to a notes file for testing...
const notesPath = 'notes.md';

async function main() {
  try {
    // 1. Read the notes file (make sure this file exists!)
    console.log(`📖 Reading notes from: ${notesPath}`);
    const notesContent = await readFile(notesPath, 'utf-8');

    // 2. Prepare the payload
    const payload = {
      notes: notesContent,
      cards: 2,
    };

    console.log('⚡ Sending request to server...');
    const startTime = performance.now();

    // 3. Send POST request
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const endTime = performance.now();
    console.log(`⏱️  Request took ${(endTime - startTime) / 1000}s`);

    // 4. Handle Response
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 5. Pretty Print the JSON
    console.log('\n✅ Success! Received Structured Data:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();