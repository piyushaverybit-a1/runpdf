import { extractText } from "unpdf";
import { DB } from "./db-config.js";
import { documents } from "./db-schema.js";
import { generateEmbeddings } from "./embeddings.js";
import { chunkContent } from "./chunking.js";

export async function processPdfFile(fileBuffer: Uint8Array | Buffer) {
  try {
    const { text } = await extractText(fileBuffer);
    const fullText = Array.isArray(text) ? text.join("\n") : text;

    if (!fullText || fullText.trim().length === 0) {
      return {
        success: false,
        error: "No text found in PDF",
      };
    }

    const chunks = await chunkContent(fullText);
    const embeddings = await generateEmbeddings(chunks);

    const records = chunks.map((chunk: string, index: number) => ({
      content: chunk,
      embedding: embeddings[index]!,
    }));
    await DB.delete(documents);
    await DB.insert(documents).values(records);

    return {
      success: true,
      message: `Created ${records.length} searchable chunks`,
    };
  } catch (error) {
    console.error("PDF processing error", error);
    return {
      success: false,
      error: "Failed to process PDF",
    };
  }
}
