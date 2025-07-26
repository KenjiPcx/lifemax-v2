import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new task
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        projectId: v.id("projects"),
        dueDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        // Verify project exists and belongs to user
        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== identity.subject) {
            throw new Error("Invalid project");
        }

        const taskId = await ctx.db.insert("tasks", {
            userId: identity.subject as any,
            name: args.name,
            description: args.description,
            projectId: args.projectId,
            completed: false,
            dueDate: args.dueDate,
        });

        return taskId;
    },
});

// Read all tasks
export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
            .collect();

        return tasks;
    },
});

// Get tasks by project
export const listByProject = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        // Verify project belongs to user
        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== identity.subject) {
            throw new Error("Invalid project");
        }

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();

        return tasks.filter(t => t.userId === identity.subject);
    },
});

// Get completed tasks
export const listCompleted = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user_completed", (q) => 
                q.eq("userId", identity.subject as any).eq("completed", true))
            .collect();

        return tasks;
    },
});

// Get pending tasks
export const listPending = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user_completed", (q) => 
                q.eq("userId", identity.subject as any).eq("completed", false))
            .collect();

        return tasks;
    },
});

// Get a single task
export const get = query({
    args: {
        taskId: v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const task = await ctx.db.get(args.taskId);
        if (!task || task.userId !== identity.subject) return null;

        return task;
    },
});

// Update a task
export const update = mutation({
    args: {
        taskId: v.id("tasks"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        projectId: v.optional(v.id("projects")),
        completed: v.optional(v.boolean()),
        dueDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const { taskId, ...updates } = args;

        const task = await ctx.db.get(taskId);
        if (!task || task.userId !== identity.subject) throw new Error("Task not found");

        // Verify new project if provided
        if (updates.projectId) {
            const project = await ctx.db.get(updates.projectId);
            if (!project || project.userId !== identity.subject) {
                throw new Error("Invalid project");
            }
        }

        await ctx.db.patch(taskId, updates);
    },
});

// Toggle task completion
export const toggleComplete = mutation({
    args: {
        taskId: v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const task = await ctx.db.get(args.taskId);
        if (!task || task.userId !== identity.subject) throw new Error("Task not found");

        await ctx.db.patch(args.taskId, {
            completed: !task.completed,
        });

        return !task.completed;
    },
});

// Delete a task
export const remove = mutation({
    args: {
        taskId: v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const task = await ctx.db.get(args.taskId);
        if (!task || task.userId !== identity.subject) throw new Error("Task not found");
        
        await ctx.db.delete(args.taskId);
    },
});

// Get project progress based on completed tasks
export const getProjectProgress = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        // Verify project belongs to user
        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== identity.subject) {
            throw new Error("Invalid project");
        }

        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();

        const userTasks = tasks.filter(t => t.userId === identity.subject);
        const completedTasks = userTasks.filter(t => t.completed);

        return {
            total: userTasks.length,
            completed: completedTasks.length,
            progress: userTasks.length > 0 ? completedTasks.length / userTasks.length : 0,
        };
    },
});