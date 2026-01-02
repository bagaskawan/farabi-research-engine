import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText } from "ai";
import {
  aiDocumentFormats,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
const LLM_MODEL = "openai/gpt-oss-120b";

// Create Groq client with API key from environment
const groq = createGroq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, toolDefinitions } = await req.json();

    // Use Groq's Llama model for the AI operations
    const result = streamText({
      model: groq(LLM_MODEL),
      system: aiDocumentFormats.html.systemPrompt,
      messages: convertToModelMessages(injectDocumentStateMessages(messages)),
      tools: toolDefinitionsToToolSet(toolDefinitions),
      toolChoice: "required",
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[BlockNote AI] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process AI request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
