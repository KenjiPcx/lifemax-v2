import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const { goalId, ...updates } = args;
        const goal = await ctx.db.get(goalId);

        if (!goal || goal.userId !== userId) {
            throw new Error("Goal not found or unauthorized");
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