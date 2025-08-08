/**
 * OpenAI API Handler for MAK3R-HUB MCP
 * Secure OpenAI integration for AI research and analysis
 */

const https = require('https');

class OpenAIHandler {
  constructor() {
    this.baseUrl = 'https://api.openai.com/v1';
    this.models = {
      'gpt-4': 'gpt-4-turbo-preview',
      'gpt-3.5': 'gpt-3.5-turbo',
      'gpt-4-vision': 'gpt-4-vision-preview'
    };
  }

  async makeRequest(method, endpoint, data, credentials) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: `/v1${endpoint}`,
        method: method.toUpperCase(),
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MAK3R-HUB/1.0.0'
        }
      };

      if (credentials.organization) {
        options.headers['OpenAI-Organization'] = credentials.organization;
      }

      let postData = '';
      if (data && (method === 'POST' || method === 'PUT')) {
        postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`OpenAI API error: ${parsed.error?.message || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse OpenAI response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`OpenAI request failed: ${error.message}`));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async chatCompletion(args, credentials) {
    const model = this.models[args.model] || args.model || 'gpt-4-turbo-preview';
    
    const data = {
      model: model,
      messages: args.messages,
      max_tokens: args.max_tokens || 1000,
      temperature: args.temperature || 0.7
    };

    // Add system message for MAK3R-HUB context if not present
    if (!args.messages.some(msg => msg.role === 'system')) {
      data.messages.unshift({
        role: 'system',
        content: 'You are an AI assistant integrated with MAK3R-HUB, helping with website development, deployment, and business automation tasks.'
      });
    }

    try {
      return await this.makeRequest('POST', '/chat/completions', data, credentials);
    } catch (error) {
      throw new Error(`Failed to get chat completion: ${error.message}`);
    }
  }

  async analyzeCode(args, credentials) {
    const analysisPrompts = {
      security: 'Analyze this code for security vulnerabilities, potential exploits, and security best practices. Provide specific recommendations.',
      performance: 'Analyze this code for performance bottlenecks, optimization opportunities, and efficiency improvements.',
      style: 'Review this code for style consistency, readability, and adherence to best practices for the given language.',
      bugs: 'Identify potential bugs, logic errors, and edge cases in this code. Suggest fixes.',
      architecture: 'Evaluate the architectural patterns, design decisions, and suggest improvements for maintainability.',
      dependencies: 'Analyze the dependencies and imports in this code. Identify outdated, vulnerable, or unnecessary packages.'
    };

    const analysisType = args.analysis_type || 'general';
    const language = args.language || 'javascript';
    
    const systemPrompt = analysisPrompts[analysisType] || 
      'Provide a comprehensive analysis of this code including security, performance, style, and potential issues.';

    const messages = [
      {
        role: 'system',
        content: `You are an expert code reviewer. ${systemPrompt} Focus on ${language} best practices.`
      },
      {
        role: 'user',
        content: `Please analyze this ${language} code:\\n\\n\`\`\`${language}\\n${args.code}\\n\`\`\`\\n\\nProvide detailed analysis with specific recommendations and code examples where appropriate.`
      }
    ];

    try {
      const result = await this.chatCompletion({
        messages: messages,
        model: 'gpt-4',
        max_tokens: 2000,
        temperature: 0.3
      }, credentials);

      return result;
    } catch (error) {
      throw new Error(`Failed to analyze code: ${error.message}`);
    }
  }

  async researchDomain(args, credentials) {
    const domain = args.domain;
    const depth = args.depth || 'comprehensive';
    const focus_areas = args.focus_areas || ['market', 'competitors', 'trends', 'opportunities'];

    const researchPrompt = `Conduct ${depth} research on the "${domain}" domain. Focus on: ${focus_areas.join(', ')}.

Please provide:
1. Market overview and size
2. Key competitors and their positioning
3. Current trends and emerging opportunities
4. Technology stack recommendations
5. Business model suggestions
6. Target audience analysis
7. Monetization strategies
8. Growth potential assessment

Format the response with clear sections and actionable insights.`;

    const messages = [
      {
        role: 'system',
        content: 'You are a business research analyst with expertise in digital markets, technology trends, and competitive analysis. Provide comprehensive, data-driven insights.'
      },
      {
        role: 'user',
        content: researchPrompt
      }
    ];

    try {
      const result = await this.chatCompletion({
        messages: messages,
        model: 'gpt-4',
        max_tokens: 3000,
        temperature: 0.4
      }, credentials);

      return result;
    } catch (error) {
      throw new Error(`Failed to research domain: ${error.message}`);
    }
  }

  async generateContent(args, credentials) {
    const contentType = args.content_type || 'article';
    const topic = args.topic;
    const tone = args.tone || 'professional';
    const length = args.length || 'medium';

    const lengthSpecs = {
      short: '300-500 words',
      medium: '800-1200 words',
      long: '1500-2500 words'
    };

    const contentPrompts = {
      article: `Write a ${tone} ${lengthSpecs[length]} article about "${topic}". Include an engaging introduction, well-structured body with subheadings, and a compelling conclusion.`,
      blog: `Create a ${tone} blog post (${lengthSpecs[length]}) about "${topic}". Make it engaging, SEO-friendly, and include actionable insights.`,
      marketing: `Write ${tone} marketing copy about "${topic}". Focus on benefits, compelling calls-to-action, and persuasive language.`,
      technical: `Create technical documentation about "${topic}". Include clear explanations, code examples where relevant, and step-by-step instructions.`,
      social: `Write engaging social media content about "${topic}". Create multiple variations for different platforms.`
    };

    const prompt = contentPrompts[contentType] || contentPrompts.article;

    const messages = [
      {
        role: 'system',
        content: `You are a professional content writer with expertise in creating engaging, high-quality content across various formats and industries.`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const result = await this.chatCompletion({
        messages: messages,
        model: 'gpt-4',
        max_tokens: length === 'long' ? 3000 : length === 'medium' ? 2000 : 1000,
        temperature: 0.6
      }, credentials);

      return result;
    } catch (error) {
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  async optimizeWebsite(args, credentials) {
    const websiteUrl = args.website_url;
    const optimizationType = args.optimization_type || 'seo';
    
    const optimizationPrompts = {
      seo: 'Analyze this website for SEO optimization opportunities. Provide specific recommendations for meta tags, content structure, technical SEO, and keyword optimization.',
      performance: 'Review this website for performance optimizations. Suggest improvements for loading speed, Core Web Vitals, and user experience.',
      accessibility: 'Audit this website for accessibility compliance. Provide recommendations to meet WCAG guidelines.',
      conversion: 'Analyze this website for conversion rate optimization. Suggest improvements to increase user engagement and conversions.',
      mobile: 'Review this website for mobile optimization. Provide recommendations for responsive design and mobile user experience.'
    };

    const prompt = optimizationPrompts[optimizationType] || optimizationPrompts.seo;

    const messages = [
      {
        role: 'system',
        content: `You are a web optimization expert with deep knowledge of ${optimizationType} best practices.`
      },
      {
        role: 'user',
        content: `${prompt}\\n\\nWebsite: ${websiteUrl}\\n\\nNote: If you cannot directly access the website, provide general best practices and recommendations for ${optimizationType} optimization that would apply to most websites.`
      }
    ];

    try {
      const result = await this.chatCompletion({
        messages: messages,
        model: 'gpt-4',
        max_tokens: 2000,
        temperature: 0.4
      }, credentials);

      return result;
    } catch (error) {
      throw new Error(`Failed to analyze website: ${error.message}`);
    }
  }

  async listModels(credentials) {
    try {
      const result = await this.makeRequest('GET', '/models', null, credentials);
      
      return {
        models: result.data
          .filter(model => model.id.includes('gpt'))
          .map(model => ({
            id: model.id,
            owned_by: model.owned_by,
            created: model.created
          }))
          .sort((a, b) => b.created - a.created)
      };
    } catch (error) {
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  // Generic handler for HTTP requests through MCP
  async handle(method, path, body, credentials) {
    const endpoint = path.replace('/openai', '');
    
    switch (true) {
      case endpoint === '/chat/completions' && method === 'POST':
        return this.chatCompletion(body, credentials);
        
      case endpoint === '/analyze/code' && method === 'POST':
        return this.analyzeCode(body, credentials);
        
      case endpoint === '/research/domain' && method === 'POST':
        return this.researchDomain(body, credentials);
        
      case endpoint === '/generate/content' && method === 'POST':
        return this.generateContent(body, credentials);
        
      case endpoint === '/optimize/website' && method === 'POST':
        return this.optimizeWebsite(body, credentials);
        
      case endpoint === '/models' && method === 'GET':
        return this.listModels(credentials);
        
      default:
        throw new Error(`Unsupported OpenAI API endpoint: ${method} ${endpoint}`);
    }
  }

  // Token estimation helper
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Cost estimation helper
  estimateCost(model, inputTokens, outputTokens) {
    const pricing = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4-turbo-preview'];
    
    return {
      input_cost: (inputTokens / 1000) * modelPricing.input,
      output_cost: (outputTokens / 1000) * modelPricing.output,
      total_cost: (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output
    };
  }
}

module.exports = new OpenAIHandler();