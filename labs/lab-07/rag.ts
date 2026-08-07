import { ChromaClient, type EmbeddingFunction } from 'chromadb';
import OpenAI from 'openai';
import 'dotenv/config';

const { OPENROUTER_API_KEY } = process.env;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Same embedding function used by the indexer, so queries land in the same
// vector space as the stored chunks.
export class OpenRouterEmbeddingFunction implements EmbeddingFunction {
  constructor(private model: string = 'openai/text-embedding-3-small') {}

  async generate(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }
}

const client = new ChromaClient({ host: 'localhost', port: 8000 });
const embeddingFunction = new OpenRouterEmbeddingFunction();

export async function getCollection() {
  return client.getOrCreateCollection({
    name: 'node-docs',
    embeddingFunction,
    configuration: { hnsw: { space: 'cosine' } },
  });
}

interface RerankApiResult {
  index: number;
  relevance_score: number;
}

async function rerank(
  query: string,
  documents: string[],
  topN: number
): Promise<RerankApiResult[]> {
  const response = await fetch('https://openrouter.ai/api/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'cohere/rerank-v3.5',
      query,
      documents,
      top_n: topN,
    }),
  });

  if (!response.ok) {
    throw new Error(`Rerank API error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { results: RerankApiResult[] };
  return data.results;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  breadcrumb: string;
  distance: number;
  chromaRank: number;
  rerankScore: number;
}

// Retrieve a wide net of candidates from Chroma, then rerank them down to
// the most relevant few using the Cohere rerank model.
export async function retrieveAndRerank(
  query: string,
  { nCandidates = 25, topN = 5 }: { nCandidates?: number; topN?: number } = {}
): Promise<RetrievedChunk[]> {
  const collection = await getCollection();

  const results = await collection.query({
    queryTexts: [query],
    nResults: nCandidates,
    include: ['documents', 'metadatas', 'distances'],
  });

  const ids = results.ids[0] ?? [];
  const documents = (results.documents[0] ?? []) as string[];
  const metadatas = (results.metadatas[0] ?? []) as Record<string, string>[];
  const distances = (results.distances?.[0] ?? []) as number[];

  if (documents.length === 0) {
    return [];
  }

  const reranked = await rerank(query, documents, topN);

  return reranked.map(({ index, relevance_score }) => ({
    id: ids[index]!,
    content: documents[index]!,
    source: metadatas[index]!.source!,
    breadcrumb: metadatas[index]!.breadcrumb!,
    distance: distances[index]!,
    chromaRank: index + 1,
    rerankScore: relevance_score,
  }));
}
