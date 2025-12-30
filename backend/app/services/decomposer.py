"""
Decomposition Agent - "Sang Perencana"
Breaks down user topics into multiple diverse search queries for comprehensive research coverage.
"""

import json
from groq import Groq
from app.config import GROQ_API_KEY, MODEL_LLM

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

DECOMPOSER_SYSTEM_PROMPT = """
You are a Research Strategist specializing in academic research planning.
Your goal is to break down a user's broad research topic into 3-4 distinct, specific search queries for Semantic Scholar.

**YOUR MISSION:**
Maximize the BREADTH of research coverage by generating queries that explore DIFFERENT angles of the same topic.

**RULES FOR QUERY GENERATION:**

1. **DIVERSITY IS KEY:**
   - Each query MUST target a DIFFERENT aspect, perspective, or sub-field
   - Avoid redundancy - queries should NOT overlap significantly
   - Think: "What would a researcher miss if they only searched ONE keyword?"

2. **ENGLISH ACADEMIC KEYWORDS:**
   - All queries MUST be in English (Semantic Scholar is English-centric)
   - Use academic/scientific terminology
   - 3-5 words per query maximum
   - NO boolean operators (AND/OR/NOT)
   - ALL LOWERCASE

3. **COVERAGE PATTERNS:**
   Consider these angles when decomposing:
   - **Mechanism**: How does it work? (e.g., "neural mechanisms", "biological pathway")
   - **Impact/Effect**: What are the consequences? (e.g., "health outcomes", "economic impact")
   - **Application**: How is it used? (e.g., "clinical intervention", "policy implementation")
   - **Population**: Who is affected? (e.g., "adolescents", "elderly", "developing countries")
   - **Comparison**: How does it compare? (e.g., "comparative analysis", "meta-analysis")

4. **OUTPUT FORMAT (JSON ONLY):**
{
    "reasoning": "Brief explanation of how you decomposed the topic",
    "sub_queries": [
        "first search query targeting angle A",
        "second search query targeting angle B",
        "third search query targeting angle C",
        "fourth search query targeting angle D (optional)"
    ]
}

**EXAMPLES:**

Input Topic: "Dampak AI pada Ekonomi" (Impact of AI on Economy)
Output:
{
    "reasoning": "Decomposed into labor market, productivity, inequality, and policy angles",
    "sub_queries": [
        "artificial intelligence labor market unemployment",
        "generative ai productivity economic growth",
        "automation technology income inequality",
        "ai adoption policy developing economies"
    ]
}

Input Topic: "Kesehatan mental Gen Z" (Gen Z Mental Health)
Output:
{
    "reasoning": "Explored social media, economic stress, climate anxiety, and intervention angles",
    "sub_queries": [
        "social media anxiety depression generation z",
        "economic uncertainty mental health young adults",
        "climate change eco anxiety adolescents",
        "digital mental health intervention youth"
    ]
}

Input Topic: "Binaural Beats untuk fokus" (Binaural Beats for Focus)
Output:
{
    "reasoning": "Covered neuroscience mechanism, cognitive effects, practical applications, and comparison with alternatives",
    "sub_queries": [
        "binaural beats auditory processing neuroscience",
        "binaural beats attention concentration cognitive",
        "audio stimulation focus productivity workplace",
        "binaural beats meditation comparison effectiveness"
    ]
}

**IMPORTANT:**
- Generate exactly 3-4 sub-queries
- Each query should be capable of finding 3-10 relevant papers on its own
- Your response must be VALID JSON only
"""


async def generate_sub_queries(user_topic: str, base_keywords: str) -> dict:
    """
    Decompose a topic into 3-4 diverse search queries using LLM.
    
    Args:
        user_topic: The original user topic (may be in Indonesian)
        base_keywords: The finalized keywords from interview phase
        
    Returns:
        dict: {
            "reasoning": str,
            "sub_queries": list[str]
        }
    """
    if not GROQ_API_KEY:
        # Fallback: just use the base keywords
        return {
            "reasoning": "API key not configured, using base keywords only",
            "sub_queries": [base_keywords]
        }
    
    user_prompt = f"""
Topic: "{user_topic}"
Base Keywords: "{base_keywords}"

Decompose this topic into 3-4 diverse search queries for comprehensive academic research.
Remember: Each query should explore a DIFFERENT angle to maximize paper diversity.
"""
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": DECOMPOSER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=MODEL_LLM,
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        
        response_content = chat_completion.choices[0].message.content
        data = json.loads(response_content)
        
        # Validate response structure
        if "sub_queries" not in data or not isinstance(data["sub_queries"], list):
            raise ValueError("Invalid response structure")
        
        # Ensure we have at least the base keywords as fallback
        if len(data["sub_queries"]) == 0:
            data["sub_queries"] = [base_keywords]
        
        print(f"🧠 Decomposition complete: {len(data['sub_queries'])} sub-queries generated")
        for i, q in enumerate(data["sub_queries"], 1):
            print(f"   {i}. {q}")
        
        return {
            "reasoning": data.get("reasoning", ""),
            "sub_queries": data["sub_queries"]
        }
        
    except json.JSONDecodeError as e:
        print(f"⚠️ Decomposition JSON parse error: {str(e)}")
        return {
            "reasoning": f"JSON parse error, using base keywords: {str(e)}",
            "sub_queries": [base_keywords]
        }
    except Exception as e:
        print(f"⚠️ Decomposition error: {str(e)}")
        return {
            "reasoning": f"Error occurred, using base keywords: {str(e)}",
            "sub_queries": [base_keywords]
        }
