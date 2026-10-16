import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { streamText, UIMessage, UIMessageChunk,LanguageModel, convertToModelMessages,
tool,stepCountIs, createUIMessageStream, pipeUIMessageStreamToResponse, wrapLanguageModel,} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";
import { searchDocuments } from "./search.js";
import { processPdfFile } from "./process-pdf.js";
import { checkOutputGuardrail } from "./guardrails.js";
import { keyId,recordRequest,seedUsage,getKeyUsage,getSummary,LIMIT_PER_DAY} from "./usage.js";

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });
let chatRequestCount = 0;
let keyCounter = 0;
const temperature = 0;

app.use(cors());
app.use(express.json());

const openrouterKeys = (process.env.OPENROUTER_API_KEY || "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

console.log(`[Init] Loaded ${openrouterKeys.length} OpenRouter key(s)`);
const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY || ""}`,
  },
});

const primaryModelName = process.env.MODEL;
const fallbackModelName = process.env.OLLAMA_MODEL;

type Candidate = {
  name: string;
  id?: string; 
  model: () => LanguageModel;
};

// Har real call ko file mein count karta hai
function withUsageTracking(
  model: LanguageModel,
  id: string,
  label: string
): LanguageModel {
  const    log = () => {
    recordRequest(id);
    const u = getKeyUsage(id);
  };

  return wrapLanguageModel({
    model: model as any,
    middleware: {
      wrapStream: async ({ doStream }) => {
        log();
        return doStream();
      },
      wrapGenerate: async ({ doGenerate }) => {
        log();
        return doGenerate();
      },
    },
  });
}

const SYSTEM_PROMPT = `
You are a helpful assistant with access to a knowledge base.
When the user's question may be related to the knowledge base,
always search the knowledge base before answering. Use the searchKnowledgeBase
tool and answer based on its results. Keep the answer concise.
`;

app.get("/api/usage", (_req: Request, res: Response) => {
  res.json(getSummary(openrouterKeys));
});

app.post("/api/usage/seed", (req: Request, res: Response) => {
  const { key, usedToday } = req.body;
  const apiKey = openrouterKeys[Number(key) - 1];

  if (!apiKey || !Number.isFinite(Number(usedToday))) {
    return res.status(400).json({ error: "Invalid key number or usedToday" });
  }

  seedUsage(keyId(apiKey), Number(usedToday));
  return res.json(getSummary(openrouterKeys));
});

app.post("/api/chat", async (req: Request, res: Response) => {
  // const requestNumber = ++chatRequestCount;
  // const requestId = `${Date.now()}-${requestNumber}`;
  try {
    const { messages }: { messages: UIMessage[] } = req.body;
    const lastUserMessage = [...(messages ?? [])]
      .reverse()
      .find((message) => message.role === "user");
    const userQuery =
      lastUserMessage?.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as any).text)
        .join(" ") ?? "";
        
    const modelMessages = await convertToModelMessages(messages);

    const allKeys = openrouterKeys.map((key, i) => ({
      key,
      id: keyId(key),
      label: `OpenRouter key ${i + 1}/${openrouterKeys.length}`,
    }));

    const availableKeys = allKeys.filter(({ id, label }) => {
      const u = getKeyUsage(id);
      if (u.available <= 0) {
        console.warn(
          `[Chat] Skipping ${label}: no quota left ` +
            `(minute ${u.usedMinute}, day ${u.usedDay})`
        );
        return false;
      }
      return true;
    });

    // Bachi hui keys mein round-robin
    const total = availableKeys.length;
    const startIndex = total > 0 ? keyCounter++ % total : 0;

    const orderedKeys = Array.from({ length: total },
      (_, i) => availableKeys[(startIndex + i) % total]
    );

    const candidates: Candidate[] = [
      ...orderedKeys.map(({ key, id, label }) => ({
        name: label,
        id,
        model: () =>
          withUsageTracking(
            createOpenRouter({ apiKey: key })(primaryModelName!),
            id,
            label
          ),
      })),
      {
        name: `Ollama Cloud (${fallbackModelName})`,
        model: () => ollama(fallbackModelName!),
      },
    ];

    // Keep retrieval context isolated to this HTTP request. The tool is
    // created here because a global tool would mix context across requests.
    let retrievedContext = "";
    const requestTools = {
      searchKnowledgeBase: tool({
        description: "Search the knowledge base for relevant information.",
        inputSchema: z.object({
          query: z.string().describe("The search query to find relevant documents."),
        }),
        execute: async ({ query }) => {
          try {
            const results = await searchDocuments(query);
            if (results.length === 0) {
              return "No relevant information found in the knowledge base.";
            }
            const context = results
              .map((result: any, index: number) => `[${index + 1}] ${result.content}`)
              .join("\n\n");
            retrievedContext += `${retrievedContext ? "\n\n" : ""}${context}`;
            return context;
          } catch (error) {
            console.error("Search error:", error);
            return "Error searching the knowledge base.";
          }
        },
      }),
    };

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
              tools: requestTools,
              system: SYSTEM_PROMPT,
              temperature,
              stopWhen: stepCountIs(0),
              onFinish: ({ usage, steps, finishReason, response }) => {
              },
              onError: ({ error }) => {
                lastError =
                  error instanceof Error
                    ? error.message
                    : String(error);
              },
            });

            const reader = result.toUIMessageStream().getReader();
            let answerText = "";

            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                if (value.type === "error") {
                  lastError =
                    lastError ||
                    (value as any).errorText ||
                    "Stream returned an error";
                  break;
                }

                buffer.push(value);
                if (value.type === "text-delta") {
                  answerText += value.delta;
                }
              }
            } finally {
              if (!committed) {
                await reader.cancel().catch(() => {});
              }
            }

            if (lastError) {
              // A provider error before anything is sent is safe to retry.
            } else if (buffer.length > 0) {
              const outputDecision = await checkOutputGuardrail(
                c.model(),
                userQuery,
                answerText,
                retrievedContext,
              );

              if (!outputDecision.safe || !outputDecision.supported) {
                console.warn("[Guardrail] Answer blocked:", outputDecision.reason);
                const messageId = crypto.randomUUID();
                const textId = crypto.randomUUID();
                const refusal =
                  "I couldn't verify that answer safely against the available information. Please rephrase your question or provide more relevant document content.";
                writer.write({ type: "start", messageId });
                writer.write({ type: "text-start", id: textId });
                writer.write({ type: "text-delta", id: textId, delta: refusal });
                writer.write({ type: "text-end", id: textId });
                writer.write({ type: "finish" });
                return;
              }

              console.log(`[Chat] Using ${c.name}`);
              buffer.forEach((chunk) => writer.write(chunk));
              committed = true;
              return;
            }

            // Daily limit ka error aaya to key ko "full" mark karo
            // (pehli baar lastError log mein dekh ke regex adjust kar lena)
            if (c.id && /per-day|daily/i.test(lastError)) {
              seedUsage(c.id, LIMIT_PER_DAY);
            }

            console.warn(
              `[Chat] ${c.name} failed: ${
                lastError || "no response"
              }. Switching to next provider...`
            );
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : String(err);

            if (committed) {
              console.error(
                `[Chat] ${c.name} broke mid-stream: ${msg}`
              );

              writer.write({
                type: "error",
                errorText:
                  "The response was interrupted. Please try again.",
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
          errorText:
            "All models have failed right now. Please try again later.",
        });
      },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
  } catch (error) {
    console.error("Error streaming chat completion:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to stream chat completion",
      });
    }
  }
});

app.post("/api/process-pdf", upload.single("pdf"), async (req: Request, res: Response) =>
   { try{
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
