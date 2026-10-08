import "dotenv/config"; 
import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import {
  streamText,
  UIMessage,
  UIMessageChunk,
  LanguageModel,
  convertToModelMessages,
  tool,
  stepCountIs,
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";
import { searchDocuments } from "./search.js";
import { processPdfFile } from "./process-pdf.js";

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL ,
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY || ""}`,
  },
});

const primaryModelName = process.env.MODEL || "openrouter/free";
const fallbackModelName = process.env.OLLAMA_MODEL || "gpt-oss:120b";

type Candidate = { name: string; model: () => LanguageModel };

const candidates: Candidate[] = [
  {
    name: `OpenRouter (${primaryModelName})`,
    model: () => openrouter(primaryModelName),
  },
  {
    name: `Ollama Cloud (${fallbackModelName})`,
    model: () => ollama(fallbackModelName),
  },
];

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

const SYSTEM_PROMPT = `
You are a helpful assistant with access to a knowledge base.
When the user's question may be related to the knowledge base,
always search the knowledge base before answering. Use the searchKnowledgeBase
tool and answer based on its results. Keep the answer concise.
`;

app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { messages }: { messages: UIMessage[] } = req.body;
    const modelMessages = await convertToModelMessages(messages);

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        for (const c of candidates) {
          console.log(`[Chat] Trying provider ${c.name}...`);

          let lastError = "";
          let committed = false; 
          const buffer: UIMessageChunk[] = [];

          try {
            const result = streamText({
              model: c.model(),
              messages: modelMessages,
              tools,
              system: SYSTEM_PROMPT,
              stopWhen: stepCountIs(5),
              onError: ({ error }) => {
                lastError =
                  error instanceof Error ? error.message : String(error);
              },
            });

            const reader = result.toUIMessageStream().getReader();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                if (committed) {
                  writer.write(value);
                  continue;
                }

                if (value.type === "error") break;

                buffer.push(value);

                if (value.type !== "start" && value.type !== "start-step") {
                  committed = true;
                  buffer.forEach((chunk) => writer.write(chunk));
                }
              }
            } finally {
              if (!committed) await reader.cancel().catch(() => {});
            }

            if (committed) return; 

            console.warn(
              `[Chat] ${c.name} failed: ${lastError || "no response"}. Switching to next provider...`
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (committed) {
              console.error(`[Chat] ${c.name} broke mid-stream: ${msg}`);
              writer.write({
                type: "error",
                errorText: "The response was interrupted. Please try again.",
              });
              return;
            }

            console.warn(
              `[Chat] ${c.name} threw: ${msg}. Switching to next provider...`
            );
          }
        }

        writer.write({
          type: "error",
          errorText: "All models are failed right now. Please try again later.",
        });
      },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
  } catch (error) {
    console.error("Error streaming chat completion:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream chat completion" });
    }
  }
});

app.post(
  "/api/process-pdf",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
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
  }
);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
