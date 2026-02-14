import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMOptions } from './provider';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');
    this.client = new GoogleGenerativeAI(apiKey);
    const { LLM_MODELS } = require('@/lib/config');
    this.modelName = process.env.GEMINI_MODEL || LLM_MODELS.gemini;
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    });

    const parts: string[] = [];
    if (options?.systemPrompt) parts.push(`System: ${options.systemPrompt}\n\n`);
    parts.push(prompt);

    const result = await model.generateContent(parts.join(''));
    return result.response.text();
  }

  async generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code blocks, no explanations, just the JSON object/array.`;

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxTokens ?? 8192,
        responseMimeType: 'application/json',
      },
    });

    const parts: string[] = [];
    if (options?.systemPrompt) parts.push(`System: ${options.systemPrompt}\n\n`);
    parts.push(jsonPrompt);

    const result = await model.generateContent(parts.join(''));
    const text = result.response.text();

    try {
      return JSON.parse(text) as T;
    } catch {
      return this.extractJSON<T>(text);
    }
  }

  private extractJSON<T>(raw: string): T {
    // Strategy 1: Strip markdown code fences and try parsing
    const fenceStripped = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
    try {
      return JSON.parse(fenceStripped) as T;
    } catch {
      // continue
    }

    // Strategy 2: Extract the outermost JSON object or array via regex
    const objMatch = raw.match(/\{[\s\S]*\}/);
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    // Pick the match that starts earliest in the string
    const match =
      objMatch && arrMatch
        ? objMatch.index! <= arrMatch.index!
          ? objMatch[0]
          : arrMatch[0]
        : (objMatch?.[0] ?? arrMatch?.[0]);

    if (match) {
      try {
        return JSON.parse(match) as T;
      } catch {
        // continue to repair
      }
    }

    // Strategy 3: Try to repair common JSON issues on the best candidate
    const candidate = match ?? fenceStripped;
    try {
      return JSON.parse(this.repairJSON(candidate)) as T;
    } catch {
      // continue
    }

    throw new Error(`Failed to parse LLM response as JSON: ${raw.substring(0, 500)}`);
  }

  private repairJSON(text: string): string {
    let s = text.trim();

    // Remove trailing commas before } or ]
    s = s.replace(/,\s*([}\]])/g, '$1');

    // Attempt to close truncated structures by balancing brackets
    const opens = { '{': '}', '[': ']' } as Record<string, string>;
    const closes = new Set(['}', ']']);
    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (opens[ch]) {
        stack.push(opens[ch]);
      } else if (closes.has(ch)) {
        stack.pop();
      }
    }

    // If we ended inside a string, close it first
    if (inString) {
      s += '"';
    }

    // Remove any trailing comma before we close brackets
    s = s.replace(/,\s*$/, '');

    // Close any unclosed brackets/braces in reverse order
    while (stack.length > 0) {
      s += stack.pop();
    }

    return s;
  }
}
