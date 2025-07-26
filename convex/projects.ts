import { v } from "convex/values";
import { query, mutation, internalQuery, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Get all projects for the current user
export const listByUser = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const projects = await ctx.db
            .query("projects")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        return projects;
    },
});

// Get all projects for a specific user (internal query for embeddings)
export const listByUserInternal = internalQuery({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        return projects;
    },
});

// Get projects by goal
export const listByGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const projects = await ctx.db
            .query("projects")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Filter by the specific goal ID
        return projects.filter(project => project.goalIds.includes(args.goalId));
    },
});

// Get a single project by ID
export const get = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== userId) {
            return null;
        }

        return project;
    },
});

// Create a new project
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        goalIds: v.array(v.id("goals")),
        parentProjectId: v.optional(v.id("projects")),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        // Validate that the goals belong to the user
        for (const goalId of args.goalIds) {
            const goal = await ctx.db.get(goalId);
            if (!goal || goal.userId !== userId) {
                throw new Error("Goal not found or unauthorized");
            }
        }

        // Validate parent project if provided
        if (args.parentProjectId) {
            const parentProject = await ctx.db.get(args.parentProjectId);
            if (!parentProject || parentProject.userId !== userId) {
                throw new Error("Parent project not found or unauthorized");
            }
        }

        const projectId = await ctx.db.insert("projects", {
            userId,
            name: args.name,
            description: args.description,
            goalIds: args.goalIds,
            parentProjectId: args.parentProjectId,
            embedding: new Array(1536).fill(0), // Placeholder
            coordinates: { x: 0, y: 0 }, // Placeholder
            status: args.status as "planning" | "in-progress" | "completed" || "planning",
            completed: false,
        });

        return projectId;
    },
});

// Update a project
export const update = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        goalIds: v.optional(v.array(v.id("goals"))),
        parentProjectId: v.optional(v.id("projects")),
        status: v.optional(v.union(v.literal("planning"), v.literal("in-progress"), v.literal("completed"))),
        completed: v.optional(v.boolean()),
        embedding: v.optional(v.array(v.float64())),
        coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
    },
    handler: async (ctx, args) => {
        const { projectId, ...updates } = args;
        const project = await ctx.db.get(projectId);

        if (!project) {
            throw new Error("Project not found");
        }

        // Validate goal IDs if provided
        if (updates.goalIds) {
            for (const goalId of updates.goalIds) {
                const goal = await ctx.db.get(goalId);
                if (!goal) {
                    throw new Error("Goal not found");
                }
            }
        }

        // Validate parent project if provided
        if (updates.parentProjectId) {
            const parentProject = await ctx.db.get(updates.parentProjectId);
            if (!parentProject) {
                throw new Error("Parent project not found");
            }
        }

        await ctx.db.patch(projectId, updates);
    },
});

// Delete a project
export const remove = mutation({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== userId) {
            throw new Error("Project not found or unauthorized");
        }

        await ctx.db.delete(args.projectId);
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

        // Generate embedding from description + goal context + frequency
        const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
            text: `${project.name}: ${project.description}${goalContext}`,
        });

        // Get all projects for the same user for coordinate calculation
        const allProjects = await ctx.runQuery(internal.projects.listByUserInternal, {
            userId: project.userId,
        });

        // Calculate new coordinates for all habits
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