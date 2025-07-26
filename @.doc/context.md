# CONTEXT.md

## Recent Progress

### Chat Interface Redesign ✅
Successfully redesigned the chat interface to use ReactFlow as the main background with a floating input, similar to the inspiration components from `/components/inspiration/`. 

**Completed Tasks:**
- ✅ Created Convex queries for fetching goals and projects by user (`convex/goals.ts`, `convex/projects.ts`)
- ✅ Created combined visualization query (`convex/visualization.ts`) for rendering all data
- ✅ Built ReactFlow node components:
  - `GoalNode.tsx` - Green circles representing life objectives
  - `ProjectNode.tsx` - Blue squares representing concrete actions
  - `TempEntityNode.tsx` - Orange dashed boxes for decision analysis
- ✅ Created main `LifeGraph.tsx` component with ReactFlow integration
- ✅ Redesigned `ChatOverlay.tsx` to use floating input with background graph
- ✅ Installed required dependencies: `@xyflow/react`, `d3-force`, `lucide-react`, `@ai-sdk/react`, `framer-motion`
- ✅ Integrated real chat API with streaming responses
- ✅ Added HTTP endpoint for chat at `/api/chat`
- ✅ Connected authentication and user management
- ✅ Added floating assistant message display with animations

**New Architecture (Updated):**
- Full-screen ReactFlow graph showing goals (green), projects (blue), and temp entities (orange)
- Floating chat input at the bottom with glass-morphism styling
- Animated assistant responses that appear temporarily at the top
- Real-time streaming chat responses using @ai-sdk/react
- Proper authentication flow with sign-in redirect
- Thread management (simplified for now - single thread per session)

### Current Implementation Status

**Working Components:**
- Database schema with goals, projects, tempEntities, and visualization queries
- ReactFlow visualization with custom node types and proper TypeScript typing
- Streaming chat interface with real agent integration
- Node selection triggering contextual chat messages
- Authentication flow and loading states
- Responsive design with proper animations

**Simplified for MVP:**
- Thread management temporarily simplified (single thread per session)
- Thread selector removed until proper thread fetching is implemented
- Focus on core functionality over complex UI features

**Next Steps (Pending):**
1. **Test with Sample Data** - Create some test goals/projects to verify full workflow
2. **Fix Thread Management** - Implement proper thread fetching from agent system
3. **Add Graph Interactions** - Implement drag, zoom, and layout algorithms with d3-force
4. **Environment Setup** - Configure proper environment variables for production

## Life Copilot - Architecture Overview

This is a life planning application where users chat with an AI agent that visualizes decisions, goals, and projects on an interactive graph.

### Core Concept
Every action users consider appears as nodes on their "life graph":
- **Goals** (green circles): High-level life objectives
- **Projects** (blue squares): Concrete actions supporting goals  
- **TempEntities** (orange dashed): Temporary decision analysis items

The AI helps users see how new opportunities align with their existing direction, creating an accountability system through visualization.

### Technical Stack
- **Frontend**: Next.js with ReactFlow for graph visualization
- **Backend**: Convex with built-in authentication and real-time subscriptions
- **AI**: Agent system with tool functions for entity CRUD operations
- **Chat**: @ai-sdk/react with streaming responses
- **Visualization**: Embedding-based positioning with semantic similarity scoring
- **Styling**: Tailwind CSS with framer-motion animations

### Database Schema
```
goals: name, description, embedding, coordinates, userId, status
projects: name, description, goalIds, parentProjectId, embedding, coordinates, userId, status, completed
tempEntities: threadId, name, description, type, embedding, coordinates, userId, similarityScores
```

### Key Features Implemented
- Streaming chat conversations with AI agent
- Real-time graph updates as entities are created/modified
- Interactive node selection with contextual chat responses
- Authentication flow with proper loading states
- Responsive floating UI with glass-morphism design
- Thread-based conversations (simplified for MVP)

### API Endpoints
- `POST /api/chat` - Streaming chat with agent
- Convex mutations for creating threads and entities
- Convex queries for fetching visualization data

### File Structure
```
components/
├── LifeGraph.tsx           # Main ReactFlow visualization
├── ChatOverlay.tsx         # Full-screen chat interface with floating input
├── ChatInput.tsx           # Reusable chat input component
└── nodes/
    ├── GoalNode.tsx        # Green goal visualization
    ├── ProjectNode.tsx     # Blue project visualization  
    └── TempEntityNode.tsx  # Orange decision analysis

convex/
├── schema.ts              # Database schema definitions
├── goals.ts               # Goal CRUD operations
├── projects.ts            # Project CRUD operations
├── tempEntities.ts        # Temporary entity operations
├── visualization.ts       # Combined data fetching for graph
├── chat.ts                # Chat thread management and HTTP endpoint
├── agents.ts              # AI agent configuration
├── agentTools.ts          # Agent tool functions
└── http.ts                # HTTP routing configuration
```

### Current Status
The application now has a fully functional chat interface integrated with the life graph visualization. Users can chat with the AI agent, see responses appear as floating messages, and interact with nodes on the graph. The foundation is solid for testing and further development.

**Ready for Testing**: The core chat-to-graph workflow is now implemented and ready for manual testing with actual conversations. 