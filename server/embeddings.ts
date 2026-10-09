import { embed, embedMany } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import dotenv from "dotenv";

dotenv.config();

const embeddingKey = process.env.OPENROUTER_EMBEDDING_API_KEY;
const embeddingModel = process.env.EMBEDDING_MODEL;

if (!embeddingKey) {
  throw new Error("OPENROUTER_EMBEDDING_API_KEY is missing");
}

if (!embeddingModel) {
  throw new Error("EMBEDDING_MODEL is missing");
}

const openrouter = createOpenRouter({
  apiKey: embeddingKey,
});

const model = openrouter.embedding(embeddingModel);

export async function generateEmbedding(text: string) {
  const input = text.replace(/\n/g, " ").trim();

  const { embedding } = await embed({
    model,
    value: input,
  });

  return embedding;
}

export async function generateEmbeddings(texts: string[]) {
  const inputs = texts.map((text) =>
    text.replace(/\n/g, " ").trim()
  );

  const { embeddings } = await embedMany({
    model,
    values: inputs,
  });

  return embeddings;
}