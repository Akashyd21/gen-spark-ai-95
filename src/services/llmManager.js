import axios from 'axios';

export class LLMManager {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || null;
    this.apiKey = null;
    this.model = null;
    this.initializeProvider();
  }
    
  initializeProvider() {
    console.log('ENV CHECK:', {
    openai: !!process.env.OPENAI_API_KEY,
    huggingface: !!process.env.HUGGINGFACE_API_KEY,
  });
    if (process.env.OPENAI_API_KEY) {
      this.provider = 'openai';
      this.apiKey = process.env.OPENAI_API_KEY;
      this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    } else if (process.env.COHERE_API_KEY) {
      this.provider = 'cohere';
      this.apiKey = process.env.COHERE_API_KEY;
      this.model = process.env.COHERE_MODEL || 'command';
    } else if (process.env.HUGGINGFACE_API_KEY) {
      this.provider = 'huggingface';
      this.apiKey = process.env.HUGGINGFACE_API_KEY;
      this.model = process.env.HUGGINGFACE_MODEL || 'mistral-7b-instruct';
    } else if (process.env.REPLICATE_API_KEY) {
      this.provider = 'replicate';
      this.apiKey = process.env.REPLICATE_API_KEY;
      this.model = process.env.REPLICATE_MODEL || 'mistral';
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async generateDescription(prompt) {
    if (!this.isConfigured()) {
      throw new Error('No LLM provider configured. Please set up an API key in .env file.');
    }

    switch (this.provider) {
      case 'openai':
        return this.generateWithOpenAI(prompt);
      case 'cohere':
        return this.generateWithCohere(prompt);
      case 'huggingface':
        return this.generateWithHuggingFace(prompt);
      case 'replicate':
        return this.generateWithReplicate(prompt);
      default:
        throw new Error(`Unknown LLM provider: ${this.provider}`);
    }
  }

  async generateWithOpenAI(prompt) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert e-commerce copywriter specializing in SEO-optimized product descriptions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.95
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateWithCohere(prompt) {
    try {
      const response = await axios.post(
        'https://api.cohere.ai/v1/generate',
        {
          model: this.model,
          prompt: prompt,
          max_tokens: 500,
          temperature: 0.8,
          return_likelihoods: 'NONE'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.generations[0].text.trim();
    } catch (error) {
      throw new Error(`Cohere API error: ${error.response?.data?.message || error.message}`);
    }
  }

  async generateWithHuggingFace(prompt) {
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1`,
        {
          inputs: prompt,
          parameters: {
            max_length: 500,
            temperature: 0.7,
            top_p: 0.95
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data[0].generated_text.trim();
    } catch (error) {
      throw new Error(`HuggingFace API error: ${error.response?.data?.error || error.message}`);
    }
  }

  async generateWithReplicate(prompt) {
    try {
      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'e5582ad7d0f7381e88f40d59f0f3a79b3b7e0e6c020ea8f80dd6284b1e9bbef8',
          input: {
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.7
          }
        },
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.output?.join('') || response.data.text || '';
    } catch (error) {
      throw new Error(`Replicate API error: ${error.response?.data?.detail || error.message}`);
    }
  }

  getAvailableModels() {
    const models = {
      openai: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      cohere: ['command', 'command-light', 'command-nightly'],
      huggingface: ['mistral-7b-instruct', 'llama-2-7b-chat', 'falcon-7b-instruct'],
      replicate: ['mistral', 'llama2', 'neural-chat']
    };

    return models[this.provider] || [];
  }
}