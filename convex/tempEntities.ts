import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Create a temporary entity for decision analysis
export const create = mutation({
    args: {
        threadId: v.string(),
        type: v.string(), // "goal", "project", "event"
        name: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        // Create temp entity with placeholder embedding and coordinates
        const tempEntityId = await ctx.db.insert("tempEntities", {
            threadId: args.threadId,
            type: args.type,
            name: args.name,
            description: args.description,
            embedding: new Array(1536).fill(0), // Placeholder
            coordinates: { x: 0, y: 0 }, // Placeholder
        });

        // Schedule embedding generation and similarity analysis
        await ctx.scheduler.runAfter(0, internal.tempEntities.analyzeEntity, {
            tempEntityId,
        });

        return tempEntityId;
    },
});

// Read temp entities for a thread
export const listByThread = query({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const entities = await ctx.db
            .query("tempEntities")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .collect();

        return entities.map(entity => ({
            _id: entity._id,
            _creationTime: entity._creationTime,
            type: entity.type,
            name: entity.name,
            description: entity.description,
            coordinates: entity.coordinates,
            similarityScores: entity.similarityScores,
        }));
    },
});

// Get a single temp entity
export const get = query({
    args: {
        tempEntityId: v.id("tempEntities"),
    },
    handler: async (ctx, args) => {
        const entity = await ctx.db.get(args.tempEntityId);
        if (!entity) return null;

        return {
            _id: entity._id,
            _creationTime: entity._creationTime,
            threadId: entity.threadId,
            type: entity.type,
            name: entity.name,
            description: entity.description,
            coordinates: entity.coordinates,
            similarityScores: entity.similarityScores,
        };
    },
});

// Update a temp entity
export const update = mutation({
    args: {
        tempEntityId: v.id("tempEntities"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        type: v.optional(v.string()),
        embedding: v.optional(v.array(v.number())),
        coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
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
    },
    handler: async (ctx, args) => {
        const { tempEntityId, ...updates } = args;

        const entity = await ctx.db.get(tempEntityId);
        if (!entity) throw new Error("Temp entity not found");

        const needsNewAnalysis = updates.description && updates.description !== entity.description;

        await ctx.db.patch(tempEntityId, updates);

        if (needsNewAnalysis) {
            await ctx.scheduler.runAfter(0, internal.tempEntities.analyzeEntity, {
                tempEntityId,
            });
        }
    },
});

// Delete a temp entity
export const remove = mutation({
    args: {
        tempEntityId: v.id("tempEntities"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tempEntityId);
    },
});

// Clear all temp entities for a thread
export const clearThread = mutation({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const entities = await ctx.db
            .query("tempEntities")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .collect();

        for (const entity of entities) {
            await ctx.db.delete(entity._id);
        }
    },
});

// Internal: Analyze temp entity and calculate similarities
export const analyzeEntity = internalAction({
    args: {
        tempEntityId: v.id("tempEntities"),
    },
    handler: async (ctx, args) => {
        const entity = await ctx.runQuery(api.tempEntities.get, {
            tempEntityId: args.tempEntityId,
        });
        if (!entity) return;

        // Generate embedding
        const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
            text: `${entity.name}: ${entity.description}`,
        });

        // Get user ID from thread (assuming thread is linked to a user)
        // For now, we'll fetch all goals and projects
        // In production, you'd want to link threads to users properly

        // Collect all existing embeddings for coordinate calculation
        const allGoals: Doc<"goals">[] = await ctx.runQuery(api.goals.list, {});
        const allProjects: Doc<"projects">[] = await ctx.runQuery(api.projects.list, {});

        const existingEmbeddings = [
            ...allGoals.map(g => ({ id: g._id, embedding: g.embedding })),
            ...allProjects.map(p => ({ id: p._id, embedding: p.embedding })),
        ];

        // Calculate coordinates in the existing space
        const { newCoordinates } = await ctx.runAction(internal.embeddings.calculateCoordinates, {
            embeddings: existingEmbeddings,
            newEmbedding: embedding,
        });

        // Calculate similarity scores with goals and projects
        const goalScores = [];
        for (const goal of allGoals) {
            const score = await ctx.runAction(internal.embeddings.calculateSimilarity, {
                embedding1: embedding,
                embedding2: goal.embedding,
            });
            goalScores.push({ id: goal._id, score });
        }

        const projectScores = [];
        for (const project of allProjects) {
            const score = await ctx.runAction(internal.embeddings.calculateSimilarity, {
                embedding1: embedding,
                embedding2: project.embedding,
            });
            projectScores.push({ id: project._id, score });
        }

        // Sort by score and keep top 5
        goalScores.sort((a, b) => b.score - a.score);
        projectScores.sort((a, b) => b.score - a.score);

        // Update temp entity with analysis results
        await ctx.runMutation(api.tempEntities.update, {
            tempEntityId: args.tempEntityId,
            embedding,
            coordinates: newCoordinates || { x: 0, y: 0 },
            similarityScores: {
                goals: goalScores.slice(0, 5),
                projects: projectScores.slice(0, 5),
            },
        });
    },
}); 