import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Goals represent high-level life objectives
  goals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    embedding: v.array(v.float64()),
    coordinates: v.object({ x: v.number(), y: v.number() }),
    status: v.optional(v.string()), // "active", "completed", "archived"
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // OpenAI embeddings
    })
    .index("by_user", ["userId"]),

  // Projects are concrete actions linked to goals (can be recursive)
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    goalIds: v.array(v.id("goals")),
    parentProjectId: v.optional(v.id("projects")), // for subprojects
    embedding: v.array(v.float64()),
    coordinates: v.object({ x: v.number(), y: v.number() }),
    status: v.optional(v.string()), // "planning", "in-progress", "completed"
    completed: v.boolean(), // completion flag
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    })
    .index("by_user", ["userId"])
    .index("by_goal", ["goalIds"])
    .index("by_parent", ["parentProjectId"]),

  // Habits are recurring actions linked to goals
  habits: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    goalIds: v.array(v.id("goals")),
    frequency: v.string(), // "daily", "weekly", "monthly"
    embedding: v.array(v.float64()),
    coordinates: v.object({ x: v.number(), y: v.number() }),
    status: v.optional(v.string()), // "active", "paused", "archived"
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    })
    .index("by_user", ["userId"])
    .index("by_goal", ["goalIds"]),

  // Tasks are work items linked to projects/subprojects
  tasks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    projectId: v.id("projects"), // linked to project or subproject
    completed: v.boolean(),
    dueDate: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_user_completed", ["userId", "completed"]),

  // Temporary entities for decision analysis (thread-scoped)
  tempEntities: defineTable({
    userId: v.id("users"), // to filter user's data for similarity
    threadId: v.string(),
    name: v.string(),
    description: v.string(),
    type: v.string(), // "goal", "project", "event", "habit", "task"
    embedding: v.array(v.float64()),
    coordinates: v.object({ x: v.number(), y: v.number() }),
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
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    })
    .index("by_thread", ["threadId"])
    .index("by_user", ["userId"]),
});
