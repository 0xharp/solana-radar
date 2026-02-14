import { OpenAICompatibleProvider } from './openai-compatible';
import { API_URLS, LLM_MODELS } from '@/lib/config';

export class GLMProvider extends OpenAICompatibleProvider {
  protected readonly apiUrl = API_URLS.glm;
  protected readonly model = LLM_MODELS.glm;
  protected readonly providerName = 'GLM';

  constructor() {
    super('GLM_5_API_KEY');
  }
}
