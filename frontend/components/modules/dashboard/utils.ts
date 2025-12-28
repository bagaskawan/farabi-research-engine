// Helper function to format relative time
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 14) return "1 week ago";
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 60) return "1 month ago";
  return `${Math.floor(diffInDays / 30)} months ago`;
}

// Get current date formatted
export function getCurrentDate(): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date().toLocaleDateString("en-US", options);
}

// Extract description from canvas content
export function extractDescription(canvasContent: any): string {
  if (canvasContent && Array.isArray(canvasContent)) {
    const para = canvasContent.find(
      (b: any) => b.type === "paragraph" && b.content?.length > 0
    );
    if (para) {
      return para.content.map((c: any) => c.text || "").join("");
    }
  }
  return "No description available";
}
