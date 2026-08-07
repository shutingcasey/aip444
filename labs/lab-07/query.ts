import { retrieveAndRerank } from './rag.js';

const query = process.argv.slice(2).join(' ').trim();

if (!query) {
  console.error('Usage: npx tsx query.ts "<your question>"');
  process.exit(1);
}

async function main() {
  console.log(`Query: "${query}"\n`);

  const results = await retrieveAndRerank(query, { nCandidates: 25, topN: 5 });

  if (results.length === 0) {
    console.log('No results found.');
    return;
  }

  results.forEach((r, i) => {
    const similarity = 1 - r.distance;
    console.log(`#${i + 1} [rerank: ${r.rerankScore.toFixed(4)}] [similarity: ${similarity.toFixed(4)}] [chroma rank: ${r.chromaRank}]`);
    console.log(`   source: ${r.source}`);
    console.log(`   breadcrumb: ${r.breadcrumb}`);
    console.log(`   ${r.content.slice(0, 200).replace(/\n/g, ' ')}...`);
    console.log('');
  });
}

main();
