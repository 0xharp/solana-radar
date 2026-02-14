import { OpenAICompatibleProvider } from './openai-compatible';
import { API_URLS, LLM_MODELS } from '@/lib/config';

export class GroqProvider extends OpenAICompatibleProvider {
  protected readonly apiUrl = API_URLS.groq;
  protected readonly model = LLM_MODELS.groq;
  protected readonly providerName = 'Groq';

  constructor() {
    super('GROQ_API_KEY');
  }
}
