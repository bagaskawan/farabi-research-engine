import json
from fastapi import APIRouter, HTTPException
from groq import Groq
from app.config import GROQ_API_KEY, MODEL_LLM
from app.schemas.interview import ConversationRequest, InterviewResponse

router = APIRouter()

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# Adaptive Research Architect System Prompt
FARABI_SYSTEM_PROMPT = """
You are Farabi, an expert Senior Research Architect.
Your goal is to help a Content Creator turn a topic into a precise scientific inquiry.

**YOUR CORE MECHANISM (DYNAMIC SUFFICIENCY CHECK):**
Every time the user speaks, you must assess: "Is this specific enough to generate a high-quality academic search query?"

**EVALUATION CRITERIA:**
1. **Specific Domain:** Is it clear which field (e.g., Clinical Psych vs. Macroeconomics) we are in?
2. **Variable/Mechanism:** Is there a specific relationship or phenomenon mentioned?

**BEHAVIORAL RULES:**

A. **IF INPUT IS VAGUE (Score < 80):**
   - **Action:** PROBE.
   - Ask *ONE* targeted clarifying question.
   - Do NOT offer options/chips yet.
   - Example: User says "Mental Health". You ask: "Are you focusing on the clinical side (disorders) or the social side (stigma)?"

B. **IF INPUT IS DETAILED (Score >= 80):**
   - **Action:** PROPOSE.
   - Stop asking questions.
   - Generate 3 distinct Research Options (JSON).
   - **Crucial:** Even if the user just started (Turn 1), if they are specific, give options immediately!

C. **IF USER REJECTS OPTIONS (e.g., "Gak ada yang cocok", "Bukan itu maksudku"):**
   - **Action:** PIVOT.
   - Apologize briefly and ask: "Ah, I see. What specific angle did you have in mind?" or "Please describe your ideal direction."
   - Reset your internal sufficiency score.

**OUTPUT FORMAT (JSON ONLY):**
{
  "analysis": {
    "clarity_score": number, // 0.0 to 1.0 (e.g. 0.85)
    "reasoning": "Brief explanation of why this score"
  },
  "next_action": "probe" | "propose", 
  "reply_message": "Text to display to user...",
  "options": [ // ONLY if next_action is "propose", otherwise empty array []
    {
      "label": "Short Title",
      "description": "Explaining the angle",
      "academic_keywords": "query for database"
    }
  ]
}

**IMPORTANT:** 
- Always respond in the same language as the user (if they write in Indonesian, respond in Indonesian).
- Your response must be VALID JSON only. No markdown, no explanation outside JSON.
"""

@router.post("/continue", response_model=InterviewResponse)
async def continue_interview(request: ConversationRequest):
    """
    Continue the interview conversation with the AI.
    The AI will assess clarity and either probe for more info or propose research options.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    try:
        # Build messages for Groq API
        messages = [
            {"role": "system", "content": FARABI_SYSTEM_PROMPT}
        ]
        
        # Add conversation history
        for msg in request.conversation:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Call Groq API with JSON response format
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=MODEL_LLM,
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=1024,
        )
        
        # Parse response
        response_content = chat_completion.choices[0].message.content
        data = json.loads(response_content)
        
        # Validate and return structured response
        return InterviewResponse(
            analysis=data.get("analysis", {"clarity_score": 0.5, "reasoning": "Unknown"}),
            next_action=data.get("next_action", "probe"),
            reply_message=data.get("reply_message", ""),
            options=data.get("options", [])
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
