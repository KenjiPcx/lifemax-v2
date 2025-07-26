import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all visualization data for the current user (goals, projects, and temp entities for a thread)
export const getVisualizationData = query({
    args: {
        threadId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("User not authenticated");
        }

        // Get goals
        const goals = await ctx.db
            .query("goals")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get projects
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get temp entities for the specific thread if provided
        let tempEntities: any[] = [];
        if (args.threadId) {
            tempEntities = await ctx.db
                .query("tempEntities")
                .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
                .collect();
        }

        return {
            goals: goals.map(goal => ({
                _id: goal._id,
                _creationTime: goal._creationTime,
                name: goal.name,
                description: goal.description,
                coordinates: goal.coordinates,
                status: goal.status,
            })),
            projects: projects.map(project => ({
                _id: project._id,
                _creationTime: project._creationTime,
                name: project.name,
                description: project.description,
                goalIds: project.goalIds,
                parentProjectId: project.parentProjectId,
                coordinates: project.coordinates,
                status: project.status,
                completed: project.completed,
            })),
            tempEntities: tempEntities.map(entity => ({
                _id: entity._id,
                _creationTime: entity._creationTime,
                name: entity.name,
                description: entity.description,
                type: entity.type,
                coordinates: entity.coordinates,
                similarityScores: entity.similarityScores,
            })),
        };
    },
}); 