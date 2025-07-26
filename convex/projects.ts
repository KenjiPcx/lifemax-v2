import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Create a new project
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        goalIds: v.array(v.id("goals")),
    },
    returns: v.id("projects"),
    handler: async (ctx, args) => {
        // Verify goals exist
        for (const goalId of args.goalIds) {
            const goal = await ctx.db.get(goalId);
            if (!goal) {
                throw new Error(`Invalid goal: ${goalId}`);
            }
        }

        // Create project with placeholder embedding and coordinates
        const projectId = await ctx.db.insert("projects", {
            name: args.name,
            description: args.description,
            goalIds: args.goalIds,
            embedding: new Array(1536).fill(0), // Placeholder
            coordinates: { x: 0, y: 0 }, // Placeholder
            status: "planning",
            createdAt: Date.now(),
        });

        // Schedule embedding generation
        await ctx.scheduler.runAfter(0, internal.projects.generateEmbeddingForProject, {
            projectId,
        });

        return projectId;
    },
});

// Read all projects
export const list = query({
    args: {},
    returns: v.array(v.object({
        _id: v.id("projects"),
        _creationTime: v.number(),
        name: v.string(),
        description: v.string(),
        goalIds: v.array(v.id("goals")),
        coordinates: v.object({ x: v.number(), y: v.number() }),
        status: v.optional(v.string()),
    })),
    handler: async (ctx) => {
        const projects = await ctx.db
            .query("projects")
            .collect();

        return projects.map(project => ({
            _id: project._id,
            _creationTime: project._creationTime,
            name: project.name,
            description: project.description,
            goalIds: project.goalIds,
            coordinates: project.coordinates,
            status: project.status,
        }));
    },
});

// Get projects by goal
export const listByGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    returns: v.array(v.object({
        _id: v.id("projects"),
        name: v.string(),
        description: v.string(),
        status: v.optional(v.string()),
    })),
    handler: async (ctx, args) => {
        // Note: This won't use the index efficiently since goalIds is an array
        // In production, you might want a separate junction table
        const projects = await ctx.db
            .query("projects")
            .collect();

        return projects
            .filter(p => p.goalIds.includes(args.goalId))
            .map(project => ({
                _id: project._id,
                name: project.name,
                description: project.description,
                status: project.status,
            }));
    },
});

// Get a single project
export const get = query({
    args: {
        projectId: v.id("projects"),
    },
    returns: v.union(
        v.object({
            _id: v.id("projects"),
            _creationTime: v.number(),
            name: v.string(),
            description: v.string(),
            goalIds: v.array(v.id("goals")),
            coordinates: v.object({ x: v.number(), y: v.number() }),
            status: v.optional(v.string()),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) return null;

        return {
            _id: project._id,
            _creationTime: project._creationTime,
            name: project.name,
            description: project.description,
            goalIds: project.goalIds,
            coordinates: project.coordinates,
            status: project.status,
        };
    },
});

// Update a project
export const update = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        goalIds: v.optional(v.array(v.id("goals"))),
        status: v.optional(v.string()),
        coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
        embedding: v.optional(v.array(v.number())),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { projectId, ...updates } = args;

        const project = await ctx.db.get(projectId);
        if (!project) throw new Error("Project not found");

        // Verify new goals if provided
        if (updates.goalIds) {
            for (const goalId of updates.goalIds) {
                const goal = await ctx.db.get(goalId);
                if (!goal) {
                    throw new Error(`Invalid goal: ${goalId}`);
                }
            }
        }

        const needsNewEmbedding = updates.description && updates.description !== project.description;

        await ctx.db.patch(projectId, updates);

        if (needsNewEmbedding) {
            await ctx.scheduler.runAfter(0, internal.projects.generateEmbeddingForProject, {
                projectId,
            });
        }

        return null;
    },
});

// Delete a project
export const remove = mutation({
    args: {
        projectId: v.id("projects"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.delete(args.projectId);

        // TODO: Recalculate coordinates for remaining projects

        return null;
    },
});

// Link a project to additional goals
export const linkToGoal = mutation({
    args: {
        projectId: v.id("projects"),
        goalId: v.id("goals"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        const goal = await ctx.db.get(args.goalId);
        if (!goal) {
            throw new Error("Invalid goal");
        }

        if (!project.goalIds.includes(args.goalId)) {
            await ctx.db.patch(args.projectId, {
                goalIds: [...project.goalIds, args.goalId],
            });
        }

        return null;
    },
});

// Unlink a project from a goal
export const unlinkFromGoal = mutation({
    args: {
        projectId: v.id("projects"),
        goalId: v.id("goals"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        await ctx.db.patch(args.projectId, {
            goalIds: project.goalIds.filter(id => id !== args.goalId),
        });

        return null;
    },
});

// Internal: Generate embedding for a project
export const generateEmbeddingForProject = internalAction({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.runQuery(api.projects.get, {
            projectId: args.projectId,
        });
        if (!project) return;

        // Include linked goal names in the embedding text
        let goalContext = "";
        for (const goalId of project.goalIds) {
            const goal = await ctx.runQuery(api.goals.get, { goalId });
            if (goal) {
                goalContext += ` [Goal: ${goal.name}]`;
            }
        }

        // Generate embedding from description + goal context
        const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
            text: `${project.name}: ${project.description}${goalContext}`,
        });

        // Get all projects for coordinate calculation
        const allProjects = await ctx.runQuery(api.projects.list, {});

        // Calculate new coordinates for all projects
        const embeddings = allProjects.map((p: any) => ({
            id: p._id,
            embedding: p._id === args.projectId ? embedding : p.embedding,
        }));

        const { coordinates } = await ctx.runAction(internal.embeddings.calculateCoordinates, {
            embeddings,
        });

        // Update all project coordinates
        for (const coord of coordinates) {
            await ctx.runMutation(api.projects.update, {
                projectId: coord.id as any,
                coordinates: { x: coord.x, y: coord.y },
            });
        }

        // Update the project's embedding
        await ctx.runMutation(api.projects.update, {
            projectId: args.projectId,
            embedding,
        });
    },
});

// Find similar projects using vector search
export const findSimilar = action({
    args: {
        projectId: v.id("projects"),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.object({
        _id: v.id("projects"),
        score: v.number(),
        name: v.string(),
        description: v.string(),
        goalIds: v.array(v.id("goals")),
    })),
    handler: async (ctx, args) => {
        // Get the project's embedding
        const project = await ctx.runQuery(internal.projects.getProjectWithEmbedding, {
            projectId: args.projectId,
        });

        if (!project) throw new Error("Project not found");

        // Vector search
        const results = await ctx.vectorSearch("projects", "by_embedding", {
            vector: project.embedding,
            limit: args.limit ?? 5,
        });

        // Load project details
        const similarProjects = [];
        for (const result of results) {
            if (result._id === args.projectId) continue; // Skip self

            const similarProject = await ctx.runQuery(api.projects.get, {
                projectId: result._id,
            });

            if (similarProject) {
                similarProjects.push({
                    _id: result._id,
                    score: result._score,
                    name: similarProject.name,
                    description: similarProject.description,
                    goalIds: similarProject.goalIds,
                });
            }
        }

        return similarProjects;
    },
});

// Internal query to get project with embedding
export const getProjectWithEmbedding = internalQuery({
    args: {
        projectId: v.id("projects"),
    },
    returns: v.union(
        v.object({
            embedding: v.array(v.number()),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) return null;

        return {
            embedding: project.embedding,
        };
    },
}); 