import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "./_generated/api";
import * as agentTools from "./agentTools";

// Create the life copilot agent
export const lifeCopilotAgent = new Agent(components.agent, {
    // The chat completions model to use
    chat: openai.chat("gpt-4o-mini"),

    // System instructions for the agent
    instructions: `You are a Life Copilot AI assistant that helps users plan and navigate their life goals and projects.

Your role is to:
1. Help users define and organize their life goals
2. Create actionable projects that support those goals
3. Analyze decisions and opportunities to see how they align with existing goals
4. Provide guidance on what to focus on based on their life map

When users ask "should I do X or Y?", use the evaluateOption tool to add each option to their life map. The tool will show how each option aligns with their goals. Based on the alignment scores and positions on the map, explain which option better supports their life vision and why.

The life map visualizes goals as green circles and projects as blue squares. Temporary decision options appear as dashed boxes. The closer items are on the map, the more semantically related they are.

Always be encouraging and help users see how different opportunities connect to their larger life vision.`,

    // All the tools available to the agent
    tools: {
        // Goal management
        createGoal: agentTools.createGoal,
        listGoals: agentTools.listGoals,
        updateGoal: agentTools.updateGoal,
        deleteGoal: agentTools.deleteGoal,

        // Project management
        createProject: agentTools.createProject,
        listProjects: agentTools.listProjects,
        updateProject: agentTools.updateProject,
        deleteProject: agentTools.deleteProject,
        linkProjectToGoal: agentTools.linkProjectToGoal,

        // Decision analysis
        evaluateOption: agentTools.evaluateOption,
        clearTempEntities: agentTools.clearTempEntities,
    },

    // Embedding model for RAG (if needed)
    textEmbedding: openai.embedding("text-embedding-3-small"),

    // Max steps for tool execution
    maxSteps: 10,

    // Max retries for failed tool calls
    maxRetries: 3,
}); 