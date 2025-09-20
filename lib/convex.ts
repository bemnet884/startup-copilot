// lib/convex.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function saveResearch(data: {
  idea: string;
  keywords: string;
  summary: string;
}) {
  try {
    await client.mutation(api.saveResearch.saveResearch, data);
  } catch (err) {
    console.error("Convex error:", err);
  }
}
