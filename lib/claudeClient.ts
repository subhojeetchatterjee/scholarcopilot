import Anthropic from "@anthropic-ai/sdk";

// Single client instance — reused across requests in the same server process.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

/**
 * Calls claude-sonnet-4-6 with a system prompt and a user message.
 * The system prompt is marked for prompt caching (ephemeral).
 * Returns the text content of the first response block.
 */
export async function callClaude({
  system,
  user,
  maxTokens = 600,
  model = "claude-sonnet-4-6",
}: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: system,
        // cache_control marks the system prompt as an ephemeral cached prefix.
        // Minimum cacheable prefix is 1024 tokens for Sonnet; annotation is safe
        // even when below threshold (it is silently ignored when not met).
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: user }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error(`Unexpected response type from Claude: ${block?.type ?? "empty"}`);
  }
  return block.text;
}
