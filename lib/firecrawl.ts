import FirecrawlApp from "@mendable/firecrawl-js";

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

function isWebResult(item: any): item is { url: string } {
  return item && typeof item.url === "string";
}

function extractPageText(page: any): string {
  if (!page) return "";

  const topLevel =
    page.markdown || page.content || page.text || page.data || page.html;
  if (topLevel && topLevel.trim()) return topLevel;

  if (Array.isArray(page.pages)) {
    const pagesText = page.pages
      .map(
        (p: any) => p.markdown || p.content || p.text || p.data || p.html || ""
      )
      .join("\n\n");
    if (pagesText.trim()) return pagesText;
  }

  console.warn("Page returned no text:", JSON.stringify(page, null, 2));
  return "";
}

export async function scrapeWebsite(query: string) {
  try {
    const searchResults = await firecrawl.search(
      `market research, competitors, trends for: ${query}`
    );
    console.log("Raw Firecrawl response:", searchResults);

    const webResults = Array.isArray(searchResults?.web)
      ? searchResults.web
      : [];
    if (!webResults.length) return "No results found.";

    let combinedText = "";
    for (const result of webResults.slice(0, 3)) {
      if (!isWebResult(result)) continue;

      try {
        const page = await firecrawl.scrape(result.url);
        const pageText = extractPageText(page);
        if (!pageText.trim()) console.warn(`Scraped ${result.url} -> 0 chars`);
        else console.log(`Scraped ${result.url} -> ${pageText.length} chars`);
        combinedText += pageText + "\n\n";
      } catch (e) {
        console.warn("Failed to scrape URL:", result.url, e);
      }
    }

    return combinedText.trim() || "No relevant data found.";
  } catch (err) {
    console.error("Firecrawl error:", err);
    return "Error scraping data.";
  }
}
