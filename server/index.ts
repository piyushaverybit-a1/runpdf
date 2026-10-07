import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { searchDocuments } from "./search.js";
import { processPdfFile } from "./process-pdf.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const tools = {
  searchKnowledgeBase: tool({
    description: "Search the knowledge base for relevant information.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant documents."),
    }),
    execute: async ({ query }) => {
      try {
        const results = await searchDocuments(query);

        if (results.length === 0) {
          return "No relevant information found in the knowledge base.";
        }

        return results
          .map((result: any, index: number) => `[${index + 1}] ${result.content}`)
          .join("\n\n");
      } catch (error) {
        console.error("Search error:", error);
        return "Error searching the knowledge base.";
      }
    },
  }),
};

app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { messages }: { messages: UIMessage[] } = req.body;

    const result = streamText({
      model: openrouter(process.env.MODEL!),
      messages: await convertToModelMessages(messages),
      tools,
      system: `
        You are a helpful assistant with access to a knowledge base.
        When the user's question may be related to the knowledge base,
        always search the knowledge base before answering.Use the searchKnowledgeBase
         tool and answer based on its results.Keep the answer concise.
      `,
      stopWhen: stepCountIs(5),
    });

    const uiResponse = result.toUIMessageStreamResponse();

    res.status(uiResponse.status);
    uiResponse.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });

    if (uiResponse.body) {
      const reader = uiResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Error streaming chat completion", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream chat completion" });
    }
  }
});

app.post("/api/process-pdf", upload.single("pdf"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No PDF file provided",
      });
    }

    const result = await processPdfFile(req.file.buffer);
    return res.json(result);
  } catch (error) {
    console.error("PDF upload error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to process PDF",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
