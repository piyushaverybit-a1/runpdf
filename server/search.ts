import { DB } from "./db-config.js";
import { documents } from "./db-schema.js";
import { generateEmbedding } from "./embeddings.js";
import { sql, desc, cosineDistance } from "drizzle-orm";

export async function searchDocuments(
  query: string,
  limit: number = 5,
  // threshold: number = 0.5
) {
  const embedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(
    documents.embedding,
    embedding
  )})`;

  const similarDocuments = await DB
    .select({
      id: documents.id,
      content: documents.content,
      similarity,
    })
    .from(documents)
    .orderBy(desc(similarity))
    .limit(limit);

  return similarDocuments;
}
