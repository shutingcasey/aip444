import 'dotenv/config';
import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { serializeProduct } from './utils';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

function cleanTSV(value: string | undefined): string {
  return (value ?? '').replace(/\t/g, ' ').replace(/\n/g, ' ');
}

async function main() {
  console.log('Fetching products...');

  const response = await fetch('https://dummyjson.com/products?limit=200');
  const data = await response.json();

  const products = data.products;

  console.log(`Fetched ${products.length} products`);

  await writeFile('products.json', JSON.stringify(products, null, 2));

  console.log('Saved products.json');

  const serializedProducts = products.map(serializeProduct);

  console.log('Creating embeddings...');

  const embeddingResponse = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: serializedProducts,
    encoding_format: 'float',
  });

  const vectorsTSV = embeddingResponse.data
    .map((item) => item.embedding.join('\t'))
    .join('\n');

  await writeFile('vectors.tsv', vectorsTSV);

  console.log('Saved vectors.tsv');

  const metadataRows = [
    'Title\tCategory',
    ...products.map((product: any) => {
      const title = cleanTSV(product.title);
      const category = cleanTSV(product.category);
      return `${title}\t${category}`;
    }),
  ];

  await writeFile('metadata.tsv', metadataRows.join('\n'));

  console.log('Saved metadata.tsv');
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});