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
    academic_keywords: str

class AIAnalysis(BaseModel):
    clarity_score: float
    reasoning: str

class InterviewResponse(BaseModel):
    analysis: AIAnalysis
    next_action: Literal["probe", "propose"]
    reply_message: str
    options: List[ResearchOption]
