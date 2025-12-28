from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import interview, semantic_scholar, research_pipeline, projects
from app.config import FRONTEND_URL

app = FastAPI(
    title="Farabi Research Engine API",
    description="Backend API for the Adaptive Research Architect system",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(semantic_scholar.router, prefix="/semantic-scholar", tags=["Semantic Scholar"])
app.include_router(research_pipeline.router, prefix="/research", tags=["Research Pipeline"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])

@app.get("/")
async def root():
    return {"message": "Farabi Research Engine API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
