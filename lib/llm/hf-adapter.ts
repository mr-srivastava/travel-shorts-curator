// lib/llm/hf-adapter.ts
// Custom adapter to use HuggingFace Inference API with LangChain abstractions

import {
  BaseChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { type BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { InferenceClient } from '@huggingface/inference';

// Define types for chat generation result
type ChatGeneration = {
  text: string;
  message: AIMessage;
};

type ChatResult = {
  generations: ChatGeneration[];
};

/**
 * Custom HuggingFace Chat Model adapter for LangChain
 * Wraps the HuggingFace Inference API to work with LangChain's ChatModel interface
 */
export class ChatHuggingFaceAdapter extends BaseChatModel {
  private client: InferenceClient;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    params: {
      model: string;
      apiKey: string;
      temperature?: number;
      maxTokens?: number;
    } & BaseChatModelParams,
  ) {
    super(params);
    this.client = new InferenceClient(params.apiKey);
    this.modelName = params.model;
    this.temperature = params.temperature ?? 0.7;
    this.maxTokens = params.maxTokens ?? 1000;
  }

  _llmType(): string {
    return 'huggingface_chat';
  }

  async _generate(
    messages: BaseMessage[],
    _options?: Record<string, unknown>,
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    // Convert LangChain messages to HuggingFace format
    const hfMessages = messages.map((msg) => {
      if (msg instanceof HumanMessage) {
        return { role: 'user' as const, content: msg.content as string };
      } else if (msg instanceof AIMessage) {
        return { role: 'assistant' as const, content: msg.content as string };
      }
      // Default to user message for other types
      return { role: 'user' as const, content: String(msg.content) };
    });

    try {
      const response = await this.client.chatCompletion({
        model: this.modelName,
        messages: hfMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const text = response.choices?.[0]?.message?.content ?? '';

      const generation: ChatGeneration = {
        text,
        message: new AIMessage(text),
      };

      return {
        generations: [generation],
      };
    } catch (error) {
      throw new Error(
        `HuggingFace API error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
