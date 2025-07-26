# Life Copilot - AI-Powered Life Planning Tool

A visual life planning tool that uses AI to help you manage goals, create projects, and make decisions based on how they align with your life vision.

## Features

- **Visual Life Map**: See your goals and projects plotted on a 2D graph based on their semantic relationships
- **AI Assistant**: Chat with an AI copilot that helps you create and manage your life plans
- **Decision Analysis**: Ask "should I do X or Y?" and see how different options align with your existing goals
- **Real-time Updates**: Watch your life map update in real-time as you chat with the AI
- **No Authentication Required**: Simple, personal tool that works without sign-in

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Convex (serverless functions + database)
- **AI**: OpenAI GPT-4 + Embeddings
- **Visualization**: ReactFlow
- **Chat**: Vercel AI SDK

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd planny
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Convex

Create a new Convex project:

```bash
npx convex dev
```

This will:
- Create a new Convex project
- Generate a `.env.local` file with your `VITE_CONVEX_URL`
- Start the Convex dev server

### 4. Set up OpenAI API Key

Add your OpenAI API key to the Convex environment:

```bash
npx convex env set OPENAI_API_KEY "your-openai-api-key"
```

### 5. Run the development server

In a new terminal:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the app.

## How to Use

1. **Start a conversation**: The chat interface will appear on the bottom right
2. **Create goals**: Tell the AI about your life goals (e.g., "Create a goal to become a machine learning expert")
3. **Add projects**: Create projects that support your goals (e.g., "Create a project to take an ML course")
4. **Analyze decisions**: Ask questions like "Should I take a job at a startup or big tech?" to see how options align with your goals
5. **Explore the map**: Watch as your goals, projects, and decisions appear on the visual map

## AI Tools Available

The AI assistant can:
- `createGoal`: Create new life goals
- `createProject`: Create projects linked to goals
- `evaluateOption`: Analyze how a potential decision aligns with your goals
- `listGoals/listProjects`: View your existing goals and projects
- `updateGoal/updateProject`: Modify existing items
- `deleteGoal/deleteProject`: Remove items from your map

## Architecture

- **Embeddings**: Each goal and project is converted to a 1536-dimensional embedding using OpenAI
- **Coordinate Mapping**: High-dimensional embeddings are projected to 2D coordinates for visualization
- **Vector Search**: Similar goals and projects are found using Convex's vector search
- **Thread-scoped Analysis**: Temporary entities for decision analysis are scoped to conversation threads

## Development

### Project Structure

```
planny/
├── src/
│   ├── App.tsx              # Main app with graph visualization
│   └── components/
│       └── ChatOverlay.tsx  # Chat interface
├── convex/
│   ├── schema.ts           # Database schema
│   ├── goals.ts            # Goal CRUD operations
│   ├── projects.ts         # Project CRUD operations
│   ├── tempEntities.ts     # Temporary entity operations
│   ├── embeddings.ts       # Embedding generation
│   ├── agentTools.ts       # AI agent tools
│   ├── agents.ts           # Agent configuration
│   ├── chat.ts             # Chat endpoints
│   └── http.ts             # HTTP routing
└── package.json
```

### Adding New Features

1. **New entity types**: Add to schema.ts and create corresponding CRUD files
2. **New AI capabilities**: Add tools in agentTools.ts and register in agents.ts
3. **New visualizations**: Modify App.tsx to render different node types

## License

MIT
