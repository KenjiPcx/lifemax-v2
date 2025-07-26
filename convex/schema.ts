import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Goals represent high-level life objectives
  goals: defineTable({
    name: v.string(),
    description: v.string(),
    embedding: v.array(v.float64()),
    coordinates: v.object({ x: v.number(), y: v.number() }),
    status: v.optional(v.string()), // "active", "completed", "archived"
    createdAt: v.optional(v.number()),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // OpenAI embeddings
    }),

  // Projects are concrete actions linked to goals
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    goalIds: v.array(v.id("goals")),
    embedding: v.array(v.float64()),
    coordinates: v.object({ x: v.number(), y: v.number() }),
    status: v.optional(v.string()), // "planning", "in-progress", "completed"
    createdAt: v.optional(v.number()),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
    })
    .index("by_goal", ["goalIds"]),

  // Temporary entities for decision analysis (thread-scoped)
  tempEntities: defineTable({
    threadId: v.string(),
    name: v.string(),
    description: v.string(),
    type: v.string(), // "goal", "project", "event"
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
    .index("by_thread", ["threadId"]),
});
