from pydantic import BaseModel
from typing import List, Optional, Literal

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ConversationRequest(BaseModel):
    conversation: List[ChatMessage]

class ResearchOption(BaseModel):
    label: str
    description: str

class AIAnalysis(BaseModel):
    clarity_score: float
    reasoning: str

class InterviewResponse(BaseModel):
    analysis: Optional[AIAnalysis] = None
    next_action: Literal["probe", "propose", "finalize"]
    reply_message: str
    options: List[ResearchOption] = []
    final_keywords: Optional[str] = None  # Final keywords for Semantic Scholar search
