// Utility to clean markdown into plain readable text
export function plainTextSummary(summary: string): string {
  if (!summary) return "";

  return summary
    .replace(/### /g, "") // Remove H3
    .replace(/#### /g, "") // Remove H4
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1") // Remove italics
    .replace(/- /g, "• ") // Convert list markers to simple bullet
    .replace(/\n{2,}/g, "\n") // Collapse multiple newlines
    .trim();
}
