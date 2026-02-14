export interface LLMProvider {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'gemini';

  switch (provider) {
    case 'gemini': {
      const { GeminiProvider } = require('./gemini');
      return new GeminiProvider();
    }
    case 'glm': {
      const { GLMProvider } = require('./glm');
      return new GLMProvider();
    }
    case 'groq':
    default: {
      const { GroqProvider } = require('./groq');
      return new GroqProvider();
    }
  }
}
