import 'dotenv/config';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function serializeProduct(product: any): string {
  const title = product.title ?? '';
  const category = product.category ?? '';
  const description = product.description ?? '';
  const tags = Array.isArray(product.tags) ? product.tags.join(', ') : '';
  const brand = product.brand ?? '';

  return `Title: ${title} | Category: ${category} | Description: ${description} | Tags: ${tags} | Brand: ${brand}`;
}

export function dotProduct(vecA: number[], vecB: number[]): number {
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

export async function loadDatabase() {
  // 1. Read the JSON file
  const productsData = await readFile('products.json', 'utf-8');
  const products = JSON.parse(productsData);

  // 2. Read the TSV file
  const vectorsData = await readFile('vectors.tsv', 'utf-8');
  const lines = vectorsData.trim().split('\n');

  // 3. Attach vectors to products
  // We assume Line 0 of vectors.tsv matches products[0]
  const productsWithEmbeddings = products.map((product: any, index: number) => {
    const vectorString = lines[index];

    // Convert tab-separated values to a list of float numbers
    const vector = vectorString.split('\t').map(Number);

    return {
      ...product,
      embedding: vector,
    };
  });

  return productsWithEmbeddings;
}

export async function embedQuery(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: query,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

export async function rerankResults(
  query: string,
  candidates: any[],
  topN: number = 5
): Promise<any[]> {
  // Build document strings from candidates
  const documents = candidates.map((p) => serializeProduct(p));

  const response = await fetch('https://openrouter.ai/api/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'cohere/rerank-v3.5',
      query,
      documents,
      top_n: topN,
    }),
  });

  const data = await response.json();

  // Map results back to product objects,
  // attaching the rerank score
  return data.results.map((r: any) => ({
    ...candidates[r.index],
    rerankScore: r.relevance_score,
  }));
}

export async function searchProducts(
  query: string,
  products: any[],
  minScore: number = 0.30
): Promise<any[]> {
  // 1. Embed the query
  const queryEmbedding = await embedQuery(query);

  // 2. Calculate dot product against all products
  const scoredProducts = products.map((product: any) => ({
    ...product,
    vectorScore: dotProduct(queryEmbedding, product.embedding),
  }));

  // 3. Sort by score (descending)
  scoredProducts.sort((a: any, b: any) => b.vectorScore - a.vectorScore);

  // 4. Filter out anything below minScore
  const filteredProducts = scoredProducts.filter(
    (product: any) => product.vectorScore >= minScore
  );

  // 5. Attach the vector score to each candidate
  // (Already attached as vectorScore above)

  // 6. Take top 20 candidates (wider net)
  const candidates = filteredProducts.slice(0, 20);

  // console.log("\n=== Before Rerank (Vector Search) ===");

  // candidates.slice(0, 5).forEach((product: any, index: number) => {
  // console.log(
  //   `${index + 1}. ${product.title} (${product.vectorScore.toFixed(4)})`
  // );
  // });

  // 7. If no candidates, return []
  if (candidates.length === 0) {
    return [];
  }

  // 8. Rerank the candidates and return top 5
  return await rerankResults(query, candidates, 5);

  // const reranked = await rerankResults(query, candidates, 5);

  // console.log("\n=== After Rerank ===");

  // reranked.forEach((product: any, index: number) => {
  //   console.log(
  //     `${index + 1}. ${product.title} (Rerank: ${product.rerankScore.toFixed(
  //       4
  //     )})`
  //   );
  // });

  // return reranked;

}