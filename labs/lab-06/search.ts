import 'dotenv/config';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { loadDatabase, searchProducts } from './utils';

async function main() {
  // Load Data: Call loadDatabase() at startup.
  const products = await loadDatabase();

  console.log('Product search is ready!');
  console.log('Type "exit" to quit.\n');

  const rl = readline.createInterface({ input, output });

  while (true) {
    // User Loop: Continuously ask the user
    const query = await rl.question('What are you looking for? ');

    if (query.toLowerCase() === 'exit') {
      break;
    }

    // Search: Call searchProducts with the user's query
    const results = await searchProducts(query, products);

    // Display: If no results are found
    if (results.length === 0) {
      console.log("I'm sorry, we don't have anything like that in stock.\n");
      continue;
    }

    // Display: If results are found
    console.log(`\nFound ${results.length} matches:`);

    results.forEach((product: any, index: number) => {
      const rerankScore = product.rerankScore?.toFixed(2) ?? 'N/A';
      const vectorScore = product.vectorScore?.toFixed(2) ?? 'N/A';

      console.log(
        `${index + 1}. [Rerank: ${rerankScore} | Vector: ${vectorScore}] ${product.title} - $${product.price}`
      );
    });

    console.log('');
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});