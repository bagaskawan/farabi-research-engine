import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_LLM = "llama-3.3-70b-versatile"

# Semantic Scholar API Configuration
SEMANTIC_SCHOLAR_KEY = os.getenv("SEMANTIC_SCHOLAR_KEY")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ROLE_KEY = os.getenv("SUPABASE_ROLE_KEY")

# CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
