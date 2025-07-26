"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

// Generate embedding for a text description
export const generateEmbedding = internalAction({
    args: {
        text: v.string(),
    },
    handler: async (ctx, args): Promise<number[]> => {
        const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: args.text,
        });

        return embedding;
    },
});

// Calculate 2D coordinates from high-dimensional embeddings using a simple PCA-like approach
// In production, you might want to use UMAP or t-SNE for better results
export const calculateCoordinates = internalAction({
    args: {
        embeddings: v.array(v.object({
            id: v.string(),
            embedding: v.array(v.number()),
        })),
        newEmbedding: v.optional(v.array(v.number())),
    },
    handler: async (ctx, args) => {
        const allEmbeddings = [...args.embeddings];

        if (args.newEmbedding) {
            allEmbeddings.push({
                id: "new",
                embedding: args.newEmbedding,
            });
        }

        // Simple 2D projection using the first two principal components
        // This is a simplified approach - in production, use UMAP or t-SNE
        const coordinates = allEmbeddings.map((item) => {
            // Project to 2D by taking weighted sums of embedding dimensions
            // These weights simulate principal components
            const x = item.embedding.slice(0, 768).reduce((sum, val, i) =>
                sum + val * Math.cos(i * 0.01), 0) / 100;
            const y = item.embedding.slice(768, 1536).reduce((sum, val, i) =>
                sum + val * Math.sin(i * 0.01), 0) / 100;

            return {
                id: item.id,
                x: Math.max(-10, Math.min(10, x)), // Bound coordinates
                y: Math.max(-10, Math.min(10, y)),
            };
        });

        const result: any = {
            coordinates: coordinates.filter(c => c.id !== "new"),
        };

        if (args.newEmbedding) {
            result.newCoordinates = coordinates.find(c => c.id === "new");
        }

        return result;
    },
});

// Calculate similarity scores between embeddings
export const calculateSimilarity = internalAction({
    args: {
        embedding1: v.array(v.number()),
        embedding2: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        // Cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < args.embedding1.length; i++) {
            dotProduct += args.embedding1[i] * args.embedding2[i];
            norm1 += args.embedding1[i] * args.embedding1[i];
            norm2 += args.embedding2[i] * args.embedding2[i];
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },
}); 