import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.MODEL_PROVIDER_URL || "http://127.0.0.1:1234/v1",
  apiKey: process.env.API_KEY || "lm-studio",
});

export async function createChatCompletion(
  messages: OpenAI.ChatCompletionMessageParam[],
  tools?: OpenAI.ChatCompletionTool[],
): Promise<OpenAI.ChatCompletion> {
  return client.chat.completions.create({
    model: process.env.MODEL_NAME || "qwen3.5-9b",
    messages,
    tools,
    tool_choice: tools && tools.length > 0 ? "auto" : undefined,
  });
}
