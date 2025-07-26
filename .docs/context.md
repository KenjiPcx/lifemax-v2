# Idea

Life Copilot
- Create projects and goals and plot them on an vector space
- Chatbot as the main UI tool
- Create tools to crud these entities
- Render the project and goals with coordinates based on their vector space

## Features
- Should I do X hackathon vs Y hackathon
- What should I do next
- What habits should I do
- What should I read
- Accountability partner

## Development workflow
Always plan first about what youre gonna do like a proper project manager and ask for my confirmation before working

## Current Implementation Plan

### Architecture
- Convex backend with built-in agent system
- Three entity types: Goals, Projects, TempEntities
- All entities have embeddings (1536D) and 2D coordinates
- TempEntities are thread-scoped for decision analysis
- Chat overlay on ReactFlow graph visualization

### Database Schema
- goals: name, description, embedding, coordinates, userId
- projects: name, description, goalIds, embedding, coordinates, userId  
- tempEntities: threadId, name, description, type, embedding, coordinates

### Agent Tools
- CRUD operations for all three entity types
- Vector search for finding similar entities
- Coordinate recalculation for visualization
- Thread-specific temporary entity management

### Progress
- [x] Plan architecture
- [x] Set up Convex schema
- [x] Implement embedding generation
- [x] Create agent tools
- [x] Build chat interface
- [x] Integrate ReactFlow visualization
- [x] Remove user authentication (simplified for personal use)

## Implementation Complete! 🎉

The Life Copilot tool is now fully implemented with:

1. **Backend (Convex)**:
   - Database schema for goals, projects, and temp entities
   - Vector embeddings and search capabilities
   - CRUD operations for all entities
   - AI agent with tools for managing life plans
   - HTTP streaming chat endpoint
   - No authentication required - simplified for personal use

2. **Frontend (React)**:
   - ReactFlow graph visualization
   - Chat overlay with Vercel AI SDK
   - Real-time updates of entities on the graph
   - Different node styles for goals, projects, and temp entities

3. **AI Features**:
   - OpenAI GPT-4 powered assistant
   - Embedding generation for semantic similarity
   - Decision analysis tools
   - Goal alignment scoring

To run the app:
1. Install dependencies: `npm install`
2. Set up Convex: `npx convex dev`
3. Add OpenAI key: `npx convex env set OPENAI_API_KEY "your-key"`
4. Run frontend: `npm run dev`

## Latest Update
- Removed all user authentication requirements
- Simplified the codebase for personal use
- All goals and projects are now shared across all sessions
- Thread-based temp entities still provide session-specific analysis