import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Create a new habit
export const create = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        goalIds: v.array(v.id("goals")),
        frequency: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Verify goals exist and belong to user
        for (const goalId of args.goalIds) {
            const goal = await ctx.db.get(goalId);
            if (!goal || goal.userId !== identity.subject) {
                throw new Error(`Invalid goal: ${goalId}`);
            }
        }

        // Create habit with placeholder embedding and coordinates
        const habitId = await ctx.db.insert("habits", {
            userId: identity.subject as any,
            name: args.name,
            description: args.description,
            goalIds: args.goalIds,
            frequency: args.frequency,
            embedding: new Array(1536).fill(0), // Placeholder
            coordinates: { x: 0, y: 0 }, // Placeholder
            status: "active",
        });

        // Schedule embedding generation
        await ctx.scheduler.runAfter(0, internal.habits.generateEmbeddingForHabit, {
            habitId,
        });

        return habitId;
    },
});

// Read all habits
export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const habits = await ctx.db
            .query("habits")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
            .collect();

        return habits;
    },
});

// Get habits by goal
export const listByGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const habits = await ctx.db
            .query("habits")
            .withIndex("by_user", (q) => q.eq("userId", identity.subject as any))
            .collect();

        return habits
            .filter(h => h.goalIds.includes(args.goalId))
            .map(habit => ({
                _id: habit._id,
                name: habit.name,
                description: habit.description,
                frequency: habit.frequency,
                status: habit.status,
            }));
    },
});

// Get a single habit
export const get = query({
    args: {
        habitId: v.id("habits"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const habit = await ctx.db.get(args.habitId);
        if (!habit || habit.userId !== identity.subject) return null;

        return habit;
    },
});

// Update a habit
export const update = mutation({
    args: {
        habitId: v.id("habits"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        goalIds: v.optional(v.array(v.id("goals"))),
        frequency: v.optional(v.string()),
        status: v.optional(v.string()),
        coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
        embedding: v.optional(v.array(v.number())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const { habitId, ...updates } = args;

        const habit = await ctx.db.get(habitId);
        if (!habit || habit.userId !== identity.subject) throw new Error("Habit not found");

        // Verify new goals if provided
        if (updates.goalIds) {
            for (const goalId of updates.goalIds) {
                const goal = await ctx.db.get(goalId);
                if (!goal || goal.userId !== identity.subject) {
                    throw new Error(`Invalid goal: ${goalId}`);
                }
            }
        }

        const needsNewEmbedding = updates.description && updates.description !== habit.description;

        await ctx.db.patch(habitId, updates);

        if (needsNewEmbedding) {
            await ctx.scheduler.runAfter(0, internal.habits.generateEmbeddingForHabit, {
                habitId,
            });
        }
    },
});

// Delete a habit
export const remove = mutation({
    args: {
        habitId: v.id("habits"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const habit = await ctx.db.get(args.habitId);
        if (!habit || habit.userId !== identity.subject) throw new Error("Habit not found");

        await ctx.db.delete(args.habitId);

        // TODO: Recalculate coordinates for remaining habits
    },
});

// Link a habit to additional goals
export const linkToGoal = mutation({
    args: {
        habitId: v.id("habits"),
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const habit = await ctx.db.get(args.habitId);
        if (!habit || habit.userId !== identity.subject) throw new Error("Habit not found");

        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== identity.subject) {
            throw new Error("Invalid goal");
        }

        if (!habit.goalIds.includes(args.goalId)) {
            await ctx.db.patch(args.habitId, {
                goalIds: [...habit.goalIds, args.goalId],
            });
        }
    },
});

// Unlink a habit from a goal
export const unlinkFromGoal = mutation({
    args: {
        habitId: v.id("habits"),
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const habit = await ctx.db.get(args.habitId);
        if (!habit || habit.userId !== identity.subject) throw new Error("Habit not found");

        await ctx.db.patch(args.habitId, {
            goalIds: habit.goalIds.filter(id => id !== args.goalId),
        });
    },
});

// Internal: Generate embedding for a habit
export const generateEmbeddingForHabit = internalAction({
    args: {
        habitId: v.id("habits"),
    },
    handler: async (ctx, args) => {
        const habit = await ctx.runQuery(api.habits.get, {
            habitId: args.habitId,
        });
        if (!habit) return;

        // Include linked goal names in the embedding text
        let goalContext = "";
        for (const goalId of habit.goalIds) {
            const goal = await ctx.runQuery(api.goals.get, { goalId });
            if (goal) {
                goalContext += ` [Goal: ${goal.name}]`;
            }
        }

        // Generate embedding from description + goal context + frequency
        const embedding = await ctx.runAction(internal.embeddings.generateEmbedding, {
            text: `${habit.name}: ${habit.description} [Frequency: ${habit.frequency}]${goalContext}`,
        });

        // Get all habits for the same user for coordinate calculation
        const allHabits = await ctx.runQuery(internal.habits.listByUser, {
            userId: habit.userId,
        });

        // Calculate new coordinates for all habits
        const embeddings = allHabits.map((h: any) => ({
            id: h._id,
            embedding: h._id === args.habitId ? embedding : h.embedding,
        }));

        const { coordinates } = await ctx.runAction(internal.embeddings.calculateCoordinates, {
            embeddings,
        });

        // Update all habit coordinates
        for (const coord of coordinates) {
            await ctx.runMutation(internal.habits.updateCoordinates, {
                habitId: coord.id as any,
                coordinates: { x: coord.x, y: coord.y },
            });
        }

        // Update the habit's embedding
        await ctx.runMutation(internal.habits.updateEmbedding, {
            habitId: args.habitId,
            embedding,
        });
    },
});

// Internal query to list habits by user
export const listByUser = internalQuery({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const habits = await ctx.db
            .query("habits")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        return habits;
    },
});

// Internal mutation to update coordinates only
export const updateCoordinates = internalMutation({
    args: {
        habitId: v.id("habits"),
        coordinates: v.object({ x: v.number(), y: v.number() }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.habitId, {
            coordinates: args.coordinates,
        });
    },
});

// Internal mutation to update embedding only
export const updateEmbedding = internalMutation({
    args: {
        habitId: v.id("habits"),
        embedding: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.habitId, {
            embedding: args.embedding,
        });
    },
});

// Internal query to get habit with userId
export const getWithUserId = internalQuery({
    args: {
        habitId: v.id("habits"),
    },
    handler: async (ctx, args) => {
        const habit = await ctx.db.get(args.habitId);
        if (!habit) return null;

        return {
            userId: habit.userId,
        };
    },
});