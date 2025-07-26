import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Create a new goal
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        // Create goal with placeholder embedding and coordinates
        const goalId = await ctx.db.insert("goals", {
            name: args.name,
            description: args.description,
            embedding: new Array(1536).fill(0), // Placeholder
            coordinates: { x: 0, y: 0 }, // Placeholder
            status: "active",
            createdAt: Date.now(),
        });

        // Schedule embedding generation
        await ctx.scheduler.runAfter(0, internal.goals.generateEmbeddingForGoal, {
            goalId,
        });

        return goalId;
    },
});

// Read all goals
export const list = query({
    args: {},
    handler: async (ctx) => {
        const goals = await ctx.db
            .query("goals")
            .collect();

        return goals;
    },
});

// Get a single goal
export const get = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const goal = await ctx.db.get(args.goalId);
        if (!goal) return null;

        return {
            _id: goal._id,
            _creationTime: goal._creationTime,
            name: goal.name,
            description: goal.description,
            coordinates: goal.coordinates,
            status: goal.status,
        };
    },
});

// Update a goal
export const update = mutation({
    args: {
        goalId: v.id("goals"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
        embedding: v.optional(v.array(v.number())),
    },
    handler: async (ctx, args) => {
        const { goalId, ...updates } = args;

        // If description changed, we need to regenerate embedding
        const goal = await ctx.db.get(goalId);
        if (!goal) throw new Error("Goal not found");

        const needsNewEmbedding = updates.description && updates.description !== goal.description;

        await ctx.db.patch(goalId, updates);

        if (needsNewEmbedding) {
            await ctx.scheduler.runAfter(0, internal.goals.generateEmbeddingForGoal, {
                goalId,
            });
        }
    },
});

// Delete a goal
export const remove = mutation({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.goalId);

        // TODO: Recalculate coordinates for remaining goals
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
        if (!goal) return null;

        // Generate embedding from description
        const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
            text: `${goal.name}: ${goal.description}`,
        });

        // Get all goals for coordinate calculation
        const allGoals = await ctx.runQuery(api.goals.list, {});

        // Calculate new coordinates for all goals
        const embeddings = allGoals.map((g: Doc<"goals">) => ({
            id: g._id,
            embedding: g._id === args.goalId ? embedding : g.embedding,
        }));

        const { coordinates } = await ctx.runAction(internal.embeddings.calculateCoordinates, {
            embeddings,
        });

        // Update all goal coordinates
        for (const coord of coordinates) {
            await ctx.runMutation(api.goals.update, {
                goalId: coord.id,
                coordinates: { x: coord.x, y: coord.y },
            });
        }

        // Update the goal's embedding
        await ctx.runMutation(api.goals.update, {
            goalId: args.goalId,
            embedding,
        });
    },
});

// // Find similar goals using vector search
// export const findSimilar = action({
//     args: {
//         goalId: v.id("goals"),
//         limit: v.optional(v.number()),
//     },
//     returns: v.array(v.object({
//         _id: v.id("goals"),
//         score: v.number(),
//         name: v.string(),
//         description: v.string(),
//     })),
//     handler: async (ctx, args) => {
//         // Get the goal's embedding
//         const goal = await ctx.runQuery(internal.goals.getGoalWithEmbedding, {
//             goalId: args.goalId,
//         });

//         if (!goal) throw new Error("Goal not found");

//         // Vector search
//         const results = await ctx.vectorSearch("goals", "by_embedding", {
//             vector: goal.embedding,
//             limit: args.limit ?? 5,
//         });

//         // Load goal details
//         const similarGoals = [];
//         for (const result of results) {
//             if (result._id === args.goalId) continue; // Skip self

//             const similarGoal = await ctx.runQuery(api.goals.get, {
//                 goalId: result._id,
//             });

//             if (similarGoal) {
//                 similarGoals.push({
//                     _id: result._id,
//                     score: result._score,
//                     name: similarGoal.name,
//                     description: similarGoal.description,
//                 });
//             }
//         }

//         return similarGoals;
//     },
// });

// Internal query to get goal with embedding
export const getGoalWithEmbedding = internalQuery({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const goal = await ctx.db.get(args.goalId);
        if (!goal) return null;

        return {
            embedding: goal.embedding,
        };
    },
}); 