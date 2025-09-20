import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  research: defineTable({
    idea: v.string(),
    keywords: v.string(),
    summary: v.string(),
    createdAt: v.number(),
  }),
});
