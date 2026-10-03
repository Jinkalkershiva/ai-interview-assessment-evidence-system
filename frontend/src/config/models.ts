// models.ts

export const PROVIDERS = [
  { id: 'gemini', name: 'Gemini', available: true },
  { id: 'openai', name: 'OpenAI', available: false },
  { id: 'claude', name: 'Claude', available: false }
];

export const MODELS = [
  {
    id: 'gemini-3.8-flash',
    provider: 'gemini',
    displayName: 'Gemini 3.8 Flash',
    description: 'Fast',
    available: true
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    description: 'Advanced reasoning',
    available: false
  },
  {
    id: 'claude-3-5-sonnet',
    provider: 'claude',
    displayName: 'Claude 3.5 Sonnet',
    description: 'Excellent intelligence',
    available: false
  }
];
