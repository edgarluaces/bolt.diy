import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export default class GoogleProvider extends BaseProvider {
  name = 'Google';
  getApiKeyLink = 'https://aistudio.google.com/app/apikey';

  config = {
    apiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };

  /*
   * Stable fallbacks to ensure the selector siempre muestra opciones funcionales
   * Gemini 2.5 uses internal reasoning tokens, so higher limits needed
   */
  staticModels: ModelInfo[] = [
    {
      name: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro (1M context)',
      provider: 'Google',
      maxTokenAllowed: 1000000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash (1M context)',
      provider: 'Google',
      maxTokenAllowed: 1000000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro',
      provider: 'Google',
      maxTokenAllowed: 2000000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'gemini-1.5-flash',
      label: 'Gemini 1.5 Flash',
      provider: 'Google',
      maxTokenAllowed: 1000000,
      maxCompletionTokens: 8192,
    },
    {
      name: 'gemma-3-27b',
      label: 'Gemma 3 27B (131k context)',
      provider: 'Google',
      maxTokenAllowed: 131000,
      maxCompletionTokens: 8192,
    },
  ];

  // Lista blanca de prefijos de modelos soportados y estables
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly ALLOWED_PREFIXES = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemma-3-1b',
    'gemma-3-4b',
    'gemma-3-12b',
    'gemma-3-27b',
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      headers: {
        ['Content-Type']: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models from Google API: ${response.status} ${response.statusText}`);
    }

    const res = (await response.json()) as any;

    if (!res.models || !Array.isArray(res.models)) {
      throw new Error('Invalid response format from Google API');
    }

    // Filtrar por lista blanca de prefijos y descartar experimental/preview cuando no sea estable
    let data = res.models.filter((model: any) => {
      const name = (model.name || '').replace('models/', '');
      const allowed = GoogleProvider.ALLOWED_PREFIXES.some((p) => name.startsWith(p));
      const notDeprecated = !/robotics|nano-banana|learnlm|imagen/i.test(name);
      const hasGoodTokenLimit = (model.outputTokenLimit || 0) > 8000 || /gemma-3-/.test(name);
      const notObviousPreview = !/preview|experimental|exp|beta/i.test(name) || /flash-lite/.test(name);

      return allowed && notDeprecated && hasGoodTokenLimit && notObviousPreview;
    });

    // Priorizar modelos más fiables y limitar a 5
    const priority = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemma-3-27b'];

    data.sort((a: any, b: any) => {
      const an = String(a.name || '').replace('models/', '');
      const bn = String(b.name || '').replace('models/', '');
      const ai = priority.findIndex((p) => an.startsWith(p));
      const bi = priority.findIndex((p) => bn.startsWith(p));
      const as = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bs = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;

      if (as !== bs) {
        return as - bs;
      }

      // fallback by (desc) inputTokenLimit then name
      const at = a.inputTokenLimit || a.outputTokenLimit || 0;
      const bt = b.inputTokenLimit || b.outputTokenLimit || 0;

      if (at !== bt) {
        return bt - at;
      }

      return an.localeCompare(bn);
    });

    data = data.slice(0, 5);

    return data.map((m: any) => {
      const modelName = m.name.replace('models/', '');

      // Get accurate context window from Google API
      let contextWindow = 32000; // default fallback

      if (m.inputTokenLimit && m.outputTokenLimit) {
        // Use the input limit as the primary context window (typically larger)
        contextWindow = m.inputTokenLimit;
      } else if (modelName.includes('gemini-1.5-pro')) {
        contextWindow = 2000000; // Gemini 1.5 Pro has 2M context
      } else if (modelName.includes('gemini-1.5-flash')) {
        contextWindow = 1000000; // Gemini 1.5 Flash has 1M context
      } else if (modelName.includes('gemini-2.0-flash')) {
        contextWindow = 1000000; // Gemini 2.0 Flash has 1M context
      } else if (modelName.includes('gemini-pro')) {
        contextWindow = 32000; // Gemini Pro has 32k context
      } else if (modelName.includes('gemini-flash')) {
        contextWindow = 32000; // Gemini Flash has 32k context
      }

      // Cap at reasonable limits to prevent issues
      const maxAllowed = 2000000; // 2M tokens max
      const finalContext = Math.min(contextWindow, maxAllowed);

      /*
       * Get completion token limit from Google API
       * REDUCED to 8192 to force simpler responses and prevent MAX_TOKENS errors
       */
      let completionTokens = 8192; // Uniform limit for all models

      if (m.outputTokenLimit && m.outputTokenLimit > 0) {
        completionTokens = Math.min(m.outputTokenLimit, 8192); // Use API value, cap at 8k for simplicity
      }

      const display = m.displayName || modelName;
      const ctxLabel =
        finalContext >= 1000000 ? `${Math.floor(finalContext / 1000000)}M` : `${Math.floor(finalContext / 1000)}k`;

      return {
        name: modelName,
        label: `${display} (${ctxLabel} context)`,
        provider: this.name,
        maxTokenAllowed: finalContext,
        maxCompletionTokens: completionTokens,
      };
    });
  }

  getModelInstance(options: {
    model: string;
    serverEnv: any;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    return google(model);
  }
}
