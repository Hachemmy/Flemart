import { Request, Response } from 'express';
import { z } from 'zod';
import { createChatCompletion } from '../services/llm.service';
import { tools, executeTool } from '../services/tools.service';
import { conversationManager } from '../services/chat.service';
import type OpenAI from 'openai';

const MAX_TOOL_LOOPS = 5;

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
});

export async function sendMessage(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { message } = chatSchema.parse(req.body);

        conversationManager.addMessage(userId, { role: 'user', content: message });

        const messages = conversationManager.getMessages(userId) as unknown as OpenAI.ChatCompletionMessageParam[];

        let response = await createChatCompletion([...messages], tools);

        let loopCount = 0;

        while (response.choices[0].message.tool_calls?.length && loopCount < MAX_TOOL_LOOPS) {
            loopCount++;

            const assistantMessage = response.choices[0].message;
            const toolCallsRaw = assistantMessage.tool_calls!;
            conversationManager.addMessage(userId, {
                role: 'assistant',
                content: assistantMessage.content ?? '',
                tool_calls: toolCallsRaw,
            });

            const toolCalls = toolCallsRaw.filter(
                (tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function',
            );

            for (const toolCall of toolCalls) {
                const fnName = toolCall.function.name;
                let parsedArgs: Record<string, unknown> = {};
                try {
                    parsedArgs = JSON.parse(toolCall.function.arguments || '{}');
                } catch {
                    parsedArgs = {};
                }

                const result = await executeTool(fnName, userId, parsedArgs);

                conversationManager.addMessage(userId, {
                    role: 'tool' as const,
                    content: result,
                    tool_call_id: toolCall.id,
                });
            }

            const updatedMessages = conversationManager.getMessages(userId) as unknown as OpenAI.ChatCompletionMessageParam[];
            response = await createChatCompletion([...updatedMessages], tools);
        }

        const finalContent = response.choices[0].message.content ?? "Désolé, je n'ai pas pu générer de réponse.";

        conversationManager.addMessage(userId, { role: 'assistant', content: finalContent });

        res.json({ reply: finalContent });
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function clearConversation(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        conversationManager.clearSession(userId);
        res.json({ message: 'Conversation cleared' });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
}
