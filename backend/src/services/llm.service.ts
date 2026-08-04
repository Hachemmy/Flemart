import OpenAI from "openai";

const FALLBACK_URLS = ["http://127.0.0.1:1234/v1", "http://host.docker.internal:1234/v1"];

let cachedClient: OpenAI | null = null;

async function getClient(): Promise<OpenAI> {
    if (cachedClient) return cachedClient;

    const configured = process.env.MODEL_PROVIDER_URL?.trim();
    const candidates = configured
        ? [configured, ...FALLBACK_URLS.filter((c) => c !== configured)]
        : FALLBACK_URLS;

    for (const url of candidates) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(`${url}/models`, {
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${process.env.API_KEY || "lm-studio"}`,
                },
            });
            clearTimeout(timer);
            if (res.ok) {
                cachedClient = new OpenAI({
                    baseURL: url,
                    apiKey: process.env.API_KEY || "lm-studio",
                });
                return cachedClient;
            }
        } catch {
            // Endpoint injoignable, on essaie le suivant
        }
    }

    // Aucun endpoint ne répond : on retombe sur le premier pour que l'appel
    // échoue avec une erreur de connexion explicite plutôt qu'en boucle.
    return new OpenAI({
        baseURL: candidates[0],
        apiKey: process.env.API_KEY || "lm-studio",
    });
}

export async function createChatCompletion(
    messages: OpenAI.ChatCompletionMessageParam[],
    tools?: OpenAI.ChatCompletionTool[],
): Promise<OpenAI.ChatCompletion> {
    const client = await getClient();
    return client.chat.completions.create({
        model: process.env.MODEL_NAME || "qwen3.5-9b",
        messages,
        tools,
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
    });
}
