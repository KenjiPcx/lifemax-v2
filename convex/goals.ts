import { v } from "convex/values";
import { query, mutation, internalQuery, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Get all goals for the current user
export const listByUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const goals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return goals;
    },
});

// Get all goals for a specific user (internal query for embeddings)
export const listByUserInternal = internalQuery({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const goals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        return goals;
    },
});

// Get a single goal by ID
export const get = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== userId) {
            return null;
        }

        return goal;
    },
});

// Create a new goal
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const goalId = await ctx.db.insert("goals", {
            userId,
            name: args.name,
            description: args.description,
            embedding: new Array(1536).fill(0), // Placeholder, will be updated by embedding generation
            coordinates: { x: 0, y: 0 }, // Placeholder, will be updated by coordinate calculation
            status: "active",
        });

        return goalId;
    },
});

// Update a goal
export const update = mutation({
    args: {
        goalId: v.id("goals"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        embedding: v.optional(v.array(v.float64())),
        coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
    },
    handler: async (ctx, args) => {
        const { goalId, ...updates } = args;
        const goal = await ctx.db.get(goalId);

        if (!goal) {
            throw new Error("Goal not found");
        }

        await ctx.db.patch(goalId, updates);
    },
});

// Delete a goal
export const remove = mutation({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== userId) {
            throw new Error("Goal not found or unauthorized");
        }

        await ctx.db.delete(args.goalId);
    },
});

// Internal: Generate embedding for a goal
export const generateEmbeddingForGoal = internalAction({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const goal = await ctx.runQuery(api.goals.get, {
            goalId: args.goalId,
        });
        if (!goal) return;

        // Generate embedding from description + goal context + frequency
        const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
            text: `${goal.name}: ${goal.description}`,
        });

        // Get all habits for the same user for coordinate calculation
        const allGoals = await ctx.runQuery(internal.goals.listByUserInternal, {
            userId: goal.userId,
        });

        // Calculate new coordinates for all habits
        const embeddings = allGoals.map((g: any) => ({
            id: g._id,
            embedding: g._id === args.goalId ? embedding : g.embedding,
        }));

        const { coordinates } = await ctx.runAction(internal.embeddings.calculateCoordinates, {
            embeddings,
        });

        // Update all habit coordinates
        for (const coord of coordinates) {
            await ctx.runMutation(api.goals.update, {
                goalId: coord.id as any,
                coordinates: { x: coord.x, y: coord.y },
            });
        }

        // Update the habit's embedding
        await ctx.runMutation(api.goals.update, {
            goalId: args.goalId,
            embedding,
        });
    },
});