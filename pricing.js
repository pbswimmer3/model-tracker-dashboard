// Pricing data per 1M tokens (input/output)
const PRICING = {
  // Anthropic
  'anthropic/claude-opus-4-6': { input: 5.0, output: 25.0 },
  'anthropic/claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'anthropic/claude-haiku-4-6': { input: 0.25, output: 1.25 },
  
  // Google
  'google/gemini-2.5-flash': { input: 0.10, output: 0.40 },
  'google/gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'google/gemini-2.0-flash': { input: 0.10, output: 0.40 },
  
  // DeepSeek
  'deepseek/deepseek-chat': { input: 0.56, output: 0.42 },
  'deepseek/deepseek-coder': { input: 0.56, output: 0.42 },
  
  // OpenAI
  'openai/gpt-5.4': { input: 2.50, output: 15.00 },
  'openai/gpt-5.4-mini': { input: 0.75, output: 4.50 },
  'openai/gpt-5.4-nano': { input: 0.20, output: 1.25 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },

  // Moonshot
  'moonshot/kimi-k2.5': { input: 0.60, output: 2.50 },
  'moonshot/kimi-k1.5': { input: 0.50, output: 2.00 },

  // Aliases
  'opus': { input: 5.0, output: 25.0 },
  'sonnet': { input: 3.0, output: 15.0 },
  'haiku': { input: 0.25, output: 1.25 },
  'kimi': { input: 0.60, output: 2.50 }
};

// Task type categorization
const TASK_TYPES = {
  'reasoning': ['planning', 'analysis', 'strategy', 'thinking'],
  'coding': ['code', 'programming', 'debug', 'refactor', 'script'],
  'writing': ['write', 'compose', 'draft', 'edit', 'summarize'],
  'search': ['search', 'lookup', 'find', 'research'],
  'conversation': ['chat', 'talk', 'discuss', 'answer', 'question'],
  'translation': ['translate', 'language'],
  'analysis': ['analyze', 'extract', 'parse', 'review'],
  'creative': ['story', 'poem', 'creative', 'imagine', 'generate']
};

function getTaskType(prompt) {
  if (!prompt) return 'unknown';
  const lower = prompt.toLowerCase();
  
  for (const [type, keywords] of Object.entries(TASK_TYPES)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return type;
    }
  }
  return 'other';
}

function calculateCost(model, inputTokens, outputTokens) {
  const price = PRICING[model] || PRICING[model.split('/').pop()] || { input: 0, output: 0 };
  
  const inputCost = (inputTokens / 1_000_000) * price.input;
  const outputCost = (outputTokens / 1_000_000) * price.output;
  
  return parseFloat((inputCost + outputCost).toFixed(6));
}

function getModelAlias(model) {
  // Convert full model names to aliases if available
  if (model.includes('claude-opus')) return 'opus';
  if (model.includes('claude-sonnet')) return 'sonnet';
  if (model.includes('claude-haiku')) return 'haiku';
  if (model.includes('gemini')) return 'gemini';
  if (model.includes('deepseek')) return 'deepseek';
  if (model.includes('kimi')) return 'kimi';
  return model;
}

module.exports = {
  PRICING,
  TASK_TYPES,
  getTaskType,
  calculateCost,
  getModelAlias
};