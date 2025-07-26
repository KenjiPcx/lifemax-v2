# CLAUDE.md

This file provides guidance to you when working with code in this repository.
Use it as your memory, write back to it with your progress

## Idea

Life Copilot
- Create projects and goals and plot them on an vector space
- Chatbot as the main UI tool
- Create tools to crud these entities
- Render the project and goals with coordinates based on their vector space

### User stories
- Initialization: User initializes their goal is to launch a great "B2B" SaaS, and also listed down some of their previous completed projects, so we plot all of them down, then we can see how far the user is from their current position to their goal in the map 
- Should I do go to X event tonight or grind? AI figures out what are some possible resources that could be obtained from the event and them plot them on the graph, then based on visuals, we decide that its not really in the same direction so we conclude with "no"
- What should I do next? AI provides pathways and plots them on the map, user can see potential events to look for or take on

### Features
- Should I do X hackathon vs Y hackathon
- What should I do next
- What habits should I do
- What should I read
- Accountability partner on whatsapp or alternative

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

### Other Details
This app is made for a user to model their life compass through the use of embeddings as a map
We have a lot of noise, a lot of decisions, but we need a life compass, users will talk to an AI life planner agent, and then instead of the AI just giving generic advice, it will call a tool to visualize where this new entity (goal, project, event) lies on your map and whether or not you should go and do that side quest

The idea is every action we take should be on the direction of the compass, otherwise we need strong justification to do something which is not on the roadmap, this is mainly for ideas or things to work on, not really day to day life, because if we put chores here, it will always be against your compass

But there is a lot of noise in the space now, 10 events happening concurrently, 10 friends asking you out, 10 ideas to work on, I just want to prioritize and build an accountability partner out of it

## Development Commands

### Development workflow
Always design and propose your solution first, talking about the different ways to implement, their pros and cons, or ask clarifying questions to get my confirmation before proceeding

Never call the run commands to build and dev the app, let me do that myself

### Convex tips
Never use the return field for queries, actions or mutations

### Development Server
```bash
npm run dev          # Start both frontend and backend in parallel
npm run dev:frontend # Start Next.js frontend only
npm run dev:backend  # Start Convex backend only
```

### Build and Deploy
```bash
npm run build  # Build Next.js app for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

### Setup
```bash
npm install    # Install dependencies
npm run predev # Initialize Convex, run setup script, open dashboard
```

## Architecture Overview

This is a life planning application built with Next.js, Convex, and AI agents. The core architecture consists of:

### Frontend (Next.js App Router)
- **app/**: Next.js app directory with pages and layouts
- **components/**: React components including UI components and chat overlay
- Uses Tailwind CSS v4 for styling
- Convex Auth for authentication

### Backend (Convex)
- **convex/schema.ts**: Database schema with three main tables:
  - `goals`: High-level life objectives with embeddings and coordinates
  - `projects`: Concrete actions linked to goals
  - `tempEntities`: Temporary decision analysis entities (thread-scoped)
- **convex/agents.ts**: AI agent configuration using @convex-dev/agent
- **convex/agentTools.ts**: Tool functions for the AI agent
- **convex/chat.ts**: Chat functionality with streaming responses

### AI Agent System
The application uses a "Life Copilot" agent that:
- Helps users define and organize life goals
- Creates actionable projects supporting those goals
- Analyzes decisions using semantic similarity via OpenAI embeddings
- Visualizes goals (green circles) and projects (blue squares) on a 2D map
- Shows temporary decision options as dashed boxes

### Key Technical Details
- Uses OpenAI embeddings (text-embedding-3-small, 1536 dimensions) for semantic similarity
- Vector indexes on all entity types for similarity search
- Coordinate-based visualization system for the life map
- Thread-based conversations with persistent state
- Streaming chat responses via HTTP actions

### Data Flow
1. User interacts via chat interface
2. Messages sent to Convex agent via HTTP streaming
3. Agent uses tools to create/update goals and projects
4. Embeddings generated for semantic positioning
5. Visualization data queried and displayed on frontend map

## Package Manager
This project uses `pnpm` with specific build dependencies configured in `pnpm.onlyBuiltDependencies`.

## Environment Setup
The `setup.mjs` script handles Convex Auth environment configuration and should only run once per setup.