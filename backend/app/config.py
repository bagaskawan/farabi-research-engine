import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_LLM = "openai/gpt-oss-120b"

# Semantic Scholar API Configuration
SEMANTIC_SCHOLAR_KEY = os.getenv("SEMANTIC_SCHOLAR_KEY")

# Jina Reader Configuration (for full-text fetching)
JINA_API_KEY = os.getenv("JINA_API_KEY", "")  # Optional, free tier works without key
JINA_READER_URL = "https://r.jina.ai/"

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ROLE_KEY = os.getenv("SUPABASE_ROLE_KEY")

# CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
