import { v } from "convex/values";
import { mutation, httpAction, internalAction, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { lifeCopilotAgent } from "./agents";

// Create a new thread
export const createThread = mutation({
    args: {},
    returns: v.object({ threadId: v.string() }),
    handler: async (ctx): Promise<{ threadId: string }> => {
        // Create thread without user association
        const { threadId } = await lifeCopilotAgent.createThread(ctx, {});

        return { threadId };
    },
});

// Send a message and get streaming response
export const sendMessageHttpStream = httpAction(async (ctx, request) => {
    const { message, threadId } = await request.json();

    console.log({ message, threadId });

    // Continue the thread with the agent
    const { thread } = await lifeCopilotAgent.continueThread(ctx, {
        threadId,
    });

    // Stream the response
    const result = await thread.streamText({
        messages: [message],
        maxSteps: 10,
    });

    const response = result.toDataStreamResponse();
    response.headers.set("Message-Id", result.messageId);
    return response;
});

// Get all data for visualization
export const getVisualizationData = query({
    args: {
        threadId: v.string(),
    },
    returns: v.object({
        goals: v.array(v.object({
            id: v.string(),
            name: v.string(),
            description: v.string(),
            coordinates: v.object({ x: v.number(), y: v.number() }),
            status: v.optional(v.string()),
        })),
        projects: v.array(v.object({
            id: v.string(),
            name: v.string(),
            description: v.string(),
            coordinates: v.object({ x: v.number(), y: v.number() }),
            goalIds: v.array(v.string()),
            status: v.optional(v.string()),
        })),
        tempEntities: v.array(v.object({
            id: v.string(),
            type: v.string(),
            name: v.string(),
            description: v.string(),
            coordinates: v.object({ x: v.number(), y: v.number() }),
            similarityScores: v.optional(v.object({
                goals: v.array(v.object({
                    id: v.id("goals"),
                    score: v.number()
                })),
                projects: v.array(v.object({
                    id: v.id("projects"),
                    score: v.number()
                })),
            })),
        })),
    }),
    handler: async (ctx, args) => {
        // Get all goals
        const goals = await ctx.db
            .query("goals")
            .collect();

        // Get all projects
        const projects = await ctx.db
            .query("projects")
            .collect();

        // Get thread's temp entities
        const tempEntities = await ctx.db
            .query("tempEntities")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .collect();

        return {
            goals: goals.map(g => ({
                id: g._id,
                name: g.name,
                description: g.description,
                coordinates: g.coordinates,
                status: g.status,
            })),
            projects: projects.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                coordinates: p.coordinates,
                goalIds: p.goalIds,
                status: p.status,
            })),
            tempEntities: tempEntities.map(e => ({
                id: e._id,
                type: e.type,
                name: e.name,
                description: e.description,
                coordinates: e.coordinates,
                similarityScores: e.similarityScores,
            })),
        };
    },
}); 