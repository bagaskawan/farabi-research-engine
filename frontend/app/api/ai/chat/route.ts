import { NextRequest, NextResponse } from "next/server";
import { groq, INTERVIEWER_SYSTEM_PROMPT } from "@/lib/ai/groq";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Build messages array with system prompt
    const chatMessages = [
      { role: "system" as const, content: INTERVIEWER_SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseContent = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      content: responseContent,
      role: "assistant",
    });
  } catch (error) {
    console.error("Error in AI chat:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate AI response", details: errorMessage },
      { status: 500 }
    );
  }
}
