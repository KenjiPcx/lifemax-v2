import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Goal Tools
export const createGoal = createTool({
    description: "Create a new life goal for the user",
    args: z.object({
        name: z.string().describe("The name of the goal"),
        description: z.string().describe("A detailed description of what the goal entails"),
    }),
    handler: async (ctx, args): Promise<{ goalId: string; message: string }> => {
        const goalId = await ctx.runMutation(api.goals.create, {
            name: args.name,
            description: args.description,
        });

        return {
            goalId,
            message: `Created goal "${args.name}". I'll calculate its position in your life map based on its description.`,
        };
    },
});

export const listGoals = createTool({
    description: "List all goals",
    args: z.object({}),
    handler: async (ctx): Promise<Array<{
        id: string;
        name: string;
        description: string;
        status: string | undefined;
    }>> => {
        if (!ctx.userId) {
            throw new Error("User not authenticated");
        }
        const goals: Doc<"goals">[] = await ctx.runQuery(internal.goals.listByUserInternal, {
            userId: ctx.userId as Id<"users">,
        });

        return goals.map(goal => ({
            id: goal._id,
            name: goal.name,
            description: goal.description,
            status: goal.status,
        }));
    },
});

export const updateGoal = createTool({
    description: "Update an existing goal",
    args: z.object({
        goalId: z.string().describe("The ID of the goal to update"),
        name: z.string().optional().describe("New name for the goal"),
        description: z.string().optional().describe("New description for the goal"),
        status: z.string().optional().describe("New status: active, completed, or archived"),
    }),
    handler: async (ctx, args): Promise<{ message: string }> => {
        await ctx.runMutation(api.goals.update, {
            goalId: args.goalId as Id<"goals">,
            name: args.name,
            description: args.description,
            status: args.status,
        });

        return {
            message: `Updated goal successfully.`,
        };
    },
});

export const deleteGoal = createTool({
    description: "Delete a goal",
    args: z.object({
        goalId: z.string().describe("The ID of the goal to delete"),
    }),
    handler: async (ctx, args): Promise<{ message: string }> => {
        await ctx.runMutation(api.goals.remove, {
            goalId: args.goalId as Id<"goals">,
        });

        return {
            message: `Deleted goal successfully.`,
        };
    },
});

// Project Tools
export const createProject = createTool({
    description: "Create a new project linked to one or more goals",
    args: z.object({
        name: z.string().describe("The name of the project"),
        description: z.string().describe("A detailed description of the project"),
        goalIds: z.array(z.string()).describe("Array of goal IDs this project supports"),
    }),
    handler: async (ctx, args): Promise<{ projectId: string; message: string }> => {
        const projectId = await ctx.runMutation(api.projects.create, {
            name: args.name,
            description: args.description,
            goalIds: args.goalIds as Id<"goals">[],
        });

        return {
            projectId,
            message: `Created project "${args.name}" linked to ${args.goalIds.length} goal(s).`,
        };
    },
});

export const listProjects = createTool({
    description: "List all projects",
    args: z.object({}),
    handler: async (ctx): Promise<Array<{
        id: string;
        name: string;
        description: string;
        goalIds: string[];
        status: string | undefined;
    }>> => {
        if (!ctx.userId) {
            throw new Error("User not authenticated");
        }
        const projects: Doc<"projects">[] = await ctx.runQuery(internal.projects.listByUserInternal, {
            userId: ctx.userId as Id<"users">,
        });

        return projects.map(project => ({
            id: project._id,
            name: project.name,
            description: project.description,
            goalIds: project.goalIds,
            status: project.status,
        }));
    },
});

export const updateProject = createTool({
    description: "Update an existing project",
    args: z.object({
        projectId: z.string().describe("The ID of the project to update"),
        name: z.string().optional().describe("New name for the project"),
        description: z.string().optional().describe("New description for the project"),
        goalIds: z.array(z.string()).optional().describe("New array of goal IDs"),
        status: z.string().optional().describe("New status: planning, in-progress, or completed"),
    }),
    handler: async (ctx, args): Promise<{ message: string }> => {
        await ctx.runMutation(api.projects.update, {
            projectId: args.projectId as Id<"projects">,
            name: args.name,
            description: args.description,
            goalIds: args.goalIds as Id<"goals">[] | undefined,
            status: args.status,
        });

        return {
            message: `Updated project successfully.`,
        };
    },
});

export const deleteProject = createTool({
    description: "Delete a project",
    args: z.object({
        projectId: z.string().describe("The ID of the project to delete"),
    }),
    handler: async (ctx, args): Promise<{ message: string }> => {
        await ctx.runMutation(api.projects.remove, {
            projectId: args.projectId as Id<"projects">,
        });

        return {
            message: `Deleted project successfully.`,
        };
    },
});

// Temporary Entity Tools
export const evaluateOption = createTool({
    description: "Create a temporary entity to evaluate a potential decision, goal, or project",
    args: z.object({
        type: z.enum(["goal", "project", "event"]).describe("The type of entity"),
        name: z.string().describe("The name of the option"),
        description: z.string().describe("A detailed description of the option"),
    }),
    handler: async (ctx, args): Promise<{
        tempEntityId: string;
        message: string;
        topMatches: Array<{ type: string; name: string; score: number }>;
    }> => {
        if (!ctx.threadId) {
            throw new Error("Thread ID is required");
        }
        const tempEntityId = await ctx.runMutation(api.tempEntities.create, {
            threadId: ctx.threadId,
            type: args.type,
            name: args.name,
            description: args.description,
        });

        // Analyze the entity
        await ctx.runAction(internal.tempEntities.analyzeEntity, {
            tempEntityId: tempEntityId as Id<"tempEntities">,
            userId: ctx.userId as Id<"users">,
        });

        // Get the analyzed entity
        const entity = await ctx.runQuery(api.tempEntities.get, {
            tempEntityId: tempEntityId as Id<"tempEntities">,
        });

        const topMatches = [];

        if (entity?.similarityScores) {
            // Get top goal matches
            for (const goalScore of entity.similarityScores.goals.slice(0, 2)) {
                const goal = await ctx.runQuery(api.goals.get, { goalId: goalScore.id });
                if (goal) {
                    topMatches.push({
                        type: "goal",
                        name: goal.name,
                        score: goalScore.score,
                    });
                }
            }

            // Get top project match
            if (entity.similarityScores.projects.length > 0) {
                const projectScore = entity.similarityScores.projects[0];
                const project = await ctx.runQuery(api.projects.get, { projectId: projectScore.id });
                if (project) {
                    topMatches.push({
                        type: "project",
                        name: project.name,
                        score: projectScore.score,
                    });
                }
            }
        }

        return {
            tempEntityId: tempEntityId as string,
            message: `I've added "${args.name}" to your life map for analysis. It appears to be most aligned with your existing goals and projects shown above.`,
            topMatches,
        };
    },
});

export const clearTempEntities = createTool({
    description: "Clear all temporary entities for the current conversation thread",
    args: z.object({}),
    handler: async (ctx): Promise<{ message: string }> => {
        if (!ctx.threadId) {
            throw new Error("Thread ID is required");
        }
        await ctx.runMutation(api.tempEntities.clearThread, {
            threadId: ctx.threadId,
        });

        return {
            message: "Cleared all temporary analysis entities from the map.",
        };
    },
});

// Analysis Tools
// Note: findSimilar functions are commented out as they require vector search which is only available in actions
// export const findSimilarGoals = createTool({...});
// export const findSimilarProjects = createTool({...}); 