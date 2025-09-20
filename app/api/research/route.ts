// app/api/research/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import FirecrawlApp from "@mendable/firecrawl-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

// Limits (smaller for testing)
const MAX_CHARS_PER_PAGE = 12000; // ~3k tokens
const MAX_TOTAL_CHARS = 20000; // only two pages worth
const CHUNK_SIZE = 8000; // smaller chunks

function extractKeywords(text: string): string[] {
  return (
    text
      .toLowerCase()
      .match(/\b[a-z]{4,}\b/g)
      ?.slice(0, 8) || []
  );
}

function isWebResult(item: any): item is { url: string } {
  return item && typeof item.url === "string";
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(cookies|privacy policy|subscribe|terms)/gi, "")
    .trim();
}

function extractPageText(page: any): string {
  if (!page) return "";

  const topLevel =
    page.markdown || page.content || page.text || page.data || page.html;
  if (topLevel && topLevel.trim()) return cleanText(topLevel);

  if (Array.isArray(page.pages)) {
    const pagesText = page.pages
      .map((p: any) =>
        cleanText(p.markdown || p.content || p.text || p.data || p.html || "")
      )
      .join("\n\n");
    if (pagesText.trim()) return pagesText;
  }

  console.warn("Page returned no text:", JSON.stringify(page, null, 2));
  return "";
}

async function callOpenAI(messages: any[], model: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.chat.completions.create({ model, messages });
    } catch (err: any) {
      if (err.status === 429 || err.code === "insufficient_quota") {
        console.warn(`Retry ${i + 1} after rate/quota error...`);
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed after retries");
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query)
      return NextResponse.json(
        { error: "Missing query text" },
        { status: 400 }
      );

    console.log("User query:", query);
    const keywords = extractKeywords(query).join(", ") || "general research";

    // 🔹 Search
    const searchResults = await firecrawl.search(
      `market research, competitors, trends for: ${keywords}`
    );
    const webResults = Array.isArray(searchResults?.web)
      ? searchResults.web
      : [];
    if (!webResults.length)
      return NextResponse.json({ keywords, summary: "No results found." });

    // 🔹 Scrape only top 1 page to minimize usage
    let scrapedText = "";
    for (const result of webResults.slice(0, 1)) {
      if (!isWebResult(result)) continue;

      try {
        const page = await firecrawl.scrape(result.url);
        let pageText = extractPageText(page).slice(0, MAX_CHARS_PER_PAGE);
        if (pageText.trim()) {
          console.log(`Scraped ${result.url} -> ${pageText.length} chars`);
          scrapedText += pageText + "\n\n";
        }
        if (scrapedText.length >= MAX_TOTAL_CHARS) break;
      } catch (e) {
        console.warn("Failed to scrape URL:", result.url, e);
      }
    }

    if (!scrapedText.trim())
      return NextResponse.json({
        keywords,
        summary: "No relevant data found from scraped pages.",
      });

    console.log("Final scraped text length:", scrapedText.length);

    // 🔹 Chunk summarization
    const chunks: string[] = [];
    for (let i = 0; i < scrapedText.length; i += CHUNK_SIZE) {
      chunks.push(scrapedText.slice(i, i + CHUNK_SIZE));
    }

    const partialSummaries: string[] = [];
    for (const chunk of chunks) {
      const res = await callOpenAI(
        [
          {
            role: "system",
            content: "Summarize this competitor & market data clearly.",
          },
          { role: "user", content: chunk },
        ],
        "gpt-4o-mini"
      );
      partialSummaries.push(res.choices[0]?.message?.content?.trim() || "");
    }

    // 🔹 Merge partial summaries
    const finalRes = await callOpenAI(
      [
        {
          role: "system",
          content: `You are a business research assistant. Combine these summaries into a single structured **business research report**.

📌 Rules:
- Markdown format
- Headings (#, ##, ###)
- Lists and bullets
- Bold/italic emphasis
- Clean, professional style`,
        },
        { role: "user", content: partialSummaries.join("\n\n") },
      ],
      "gpt-4o-mini" // use mini for testing to save quota
    );

    return NextResponse.json({
      keywords,
      summary:
        finalRes.choices[0]?.message?.content?.trim() ||
        "No summary generated.",
    });
  } catch (err: any) {
    console.error("API Error:", err);
    if (err.code === "insufficient_quota" || err.status === 429)
      return NextResponse.json(
        { error: "OpenAI quota exceeded. Check billing." },
        { status: 429 }
      );
    return NextResponse.json(
      { error: "Internal server error. Try again later." },
      { status: 500 }
    );
  }
}
