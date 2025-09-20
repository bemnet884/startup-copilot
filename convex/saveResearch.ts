// convex/saveResearch.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveResearch = mutation({
  args: {
    idea: v.string(),
    keywords: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("research", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
