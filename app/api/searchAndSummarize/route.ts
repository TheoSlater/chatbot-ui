import { NextResponse } from "next/server";
import axios from "axios";
import { getOllamaResponse } from "@/app/hooks/ollamaService";

export async function POST(req: Request) {
  try {
    const { query, model } = await req.json();

    if (!query || typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty query" },
        { status: 422 }
      );
    }

    const braveRes = await axios.get(
      "https://api.search.brave.com/res/v1/web/search",
      {
        headers: {
          "X-Subscription-Token": "BSA7JjSYYvT9InsNVJzNwCK4MGY9eLq",
          Accept: "application/json",
        },
        params: { q: query.trim(), count: 5 },
      }
    );

    type BraveWebResult = {
      title: string;
      snippet: string;
      url: string;
      [key: string]: unknown;
    };

    const results = (braveRes.data.web?.results ?? [])
      .map(
        (r: BraveWebResult, i: number) =>
          `Result ${i + 1}:\nTitle: ${r.title}\nSnippet: ${r.snippet}\nURL: ${
            r.url
          }`
      )
      .join("\n\n");

    const promptMessages = [
      {
        role: "system",
        content:
          "You will receive multiple web search results. Summarize the key information succinctly, and mention relevant URLs only if helpful.",
      },
      {
        role: "user",
        content: `Here are the search results for the query "${query}":\n\n${results}\n\nPlease provide a concise summary.`,
      },
    ];

    const summary = await getOllamaResponse(promptMessages, model);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Search + summarize error:", error);
    return NextResponse.json(
      { error: "Failed to search and summarize" },
      { status: 500 }
    );
  }
}
