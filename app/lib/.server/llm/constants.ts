/*
 * Maximum tokens for response generation
 * Balanced for reasonable complexity while avoiding errors
 */
export const MAX_TOKENS = 16384; // Increased from 8k to allow more complex responses

/*
 * Provider-specific default completion token limits
 * REDUCED to prevent MAX_TOKENS errors and force minimal responses
 */
export const PROVIDER_COMPLETION_LIMITS: Record<string, number> = {
  OpenAI: 4096, // Standard GPT models (o1 models have much higher limits)
  Github: 4096, // GitHub Models use OpenAI-compatible limits
  Anthropic: 8192, // Reduced for simpler responses
  Google: 8192, // Reduced from 32k to prevent overload and force simplicity
  Cohere: 4000,
  DeepSeek: 8192,
  Groq: 8192,
  HuggingFace: 4096,
  Mistral: 8192,
  Ollama: 8192,
  OpenRouter: 8192,
  Perplexity: 8192,
  Together: 8192,
  xAI: 8192,
  LMStudio: 8192,
  OpenAILike: 8192,
  AmazonBedrock: 8192,
  Hyperbolic: 8192,
};

/*
 * Reasoning models that require maxCompletionTokens instead of maxTokens
 * These models use internal reasoning tokens and have different API parameter requirements
 */
export function isReasoningModel(modelName: string): boolean {
  const result = /^(o1|o3|gpt-5)/i.test(modelName);

  // DEBUG: Test regex matching
  console.log(`REGEX TEST: "${modelName}" matches reasoning pattern: ${result}`);

  return result;
}

/*
 * limits the number of model responses that can be returned in a single request
 * Increased from 2 to 4 to support larger projects with many files
 */
export const MAX_RESPONSE_SEGMENTS = 4;

export interface File {
  type: 'file';
  content: string;
  isBinary: boolean;
  isLocked?: boolean;
  lockedByFolder?: string;
}

export interface Folder {
  type: 'folder';
  isLocked?: boolean;
  lockedByFolder?: string;
}

type Dirent = File | Folder;

export type FileMap = Record<string, Dirent | undefined>;

export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yml',
];
