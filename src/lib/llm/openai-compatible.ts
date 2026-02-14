import { LLMProvider, LLMOptions } from './provider';

/**
 * Base class for OpenAI-compatible LLM providers (Groq, GLM, etc.).
 * Subclasses only need to specify apiUrl, model, and apiKeyEnvVar.
 */
export abstract class OpenAICompatibleProvider implements LLMProvider {
  protected apiKey: string;
  protected abstract readonly apiUrl: string;
  protected abstract readonly model: string;
  protected abstract readonly providerName: string;

  constructor(apiKeyEnvVar: string) {
    const apiKey = process.env[apiKeyEnvVar];
    if (!apiKey) throw new Error(`${apiKeyEnvVar} environment variable is required`);
    this.apiKey = apiKey;
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const messages = this.buildMessages(prompt, options?.systemPrompt);

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${this.providerName} API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateJSON<T>(prompt: string, options?: LLMOptions): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code blocks, no explanations, just the raw JSON object/array.`;
    const messages = this.buildMessages(jsonPrompt, options?.systemPrompt);

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${this.providerName} API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';

    return this.parseJSON<T>(text);
  }

  private buildMessages(prompt: string, systemPrompt?: string): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    return messages;
  }

  private parseJSON<T>(text: string): T {
    // Try direct parse
    let cleaned = text.trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // Strip markdown code fences if present
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        try {
          return JSON.parse(cleaned) as T;
        } catch {
          // continue
        }
      }
      // Extract JSON object/array
      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error(`Failed to parse ${this.providerName} response as JSON: ${cleaned.substring(0, 300)}`);
    }
  }
}
