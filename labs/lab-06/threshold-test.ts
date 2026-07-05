import 'dotenv/config';
import { dotProduct, embedQuery, loadDatabase } from './utils';

async function testQuery(query: string) {
  const products = await loadDatabase();
  const queryEmbedding = await embedQuery(query);

  const results = products
    .map((product: any) => ({
      title: product.title,
      category: product.category,
      score: dotProduct(queryEmbedding, product.embedding),
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

  console.log(`\nQuery: ${query}`);
  console.log('Top 3 results:');

  results.forEach((result: any, index: number) => {
    console.log(
      `${index + 1}. ${result.title} (${result.category}) - ${result.score.toFixed(4)}`
    );
  });
}

async function main() {
  await testQuery('Nice smelling scent');
  await testQuery('A textbook on quantum physics');
}

main().catch(console.error);