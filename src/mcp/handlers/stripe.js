/**
 * Stripe API Handler for MAK3R-HUB MCP
 * Secure Stripe integration with proper error handling
 */

const https = require('https');

class StripeHandler {
  constructor() {
    this.baseUrl = 'https://api.stripe.com/v1';
  }

  async makeRequest(method, endpoint, data, credentials) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.stripe.com',
        port: 443,
        path: `/v1${endpoint}`,
        method: method.toUpperCase(),
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MAK3R-HUB/1.0.0'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        const postData = this.formatFormData(data);
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
              reject(new Error(`Stripe API error: ${parsed.error?.message || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse Stripe response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Stripe request failed: ${error.message}`));
      });

      if (data && (method === 'POST' || method === 'PUT')) {
        req.write(this.formatFormData(data));
      }
      
      req.end();
    });
  }

  formatFormData(data) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Handle nested objects (e.g., metadata)
          for (const [subKey, subValue] of Object.entries(value)) {
            params.append(`${key}[${subKey}]`, String(subValue));
          }
        } else {
          params.append(key, String(value));
        }
      }
    }
    
    return params.toString();
  }

  async createPaymentIntent(args, credentials) {
    const data = {
      amount: args.amount,
      currency: args.currency || 'usd',
      automatic_payment_methods: {
        enabled: true
      }
    };

    if (args.customer_id) {
      data.customer = args.customer_id;
    }

    if (args.metadata) {
      data.metadata = args.metadata;
    }

    try {
      const result = await this.makeRequest('POST', '/payment_intents', data, credentials);
      
      return {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        client_secret: result.client_secret,
        created: result.created
      };
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  async listCustomers(args, credentials) {
    const queryParams = new URLSearchParams();
    
    if (args.limit) queryParams.append('limit', args.limit);
    if (args.starting_after) queryParams.append('starting_after', args.starting_after);
    if (args.email) queryParams.append('email', args.email);

    const endpoint = `/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      const result = await this.makeRequest('GET', endpoint, null, credentials);
      
      return {
        data: result.data.map(customer => ({
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: customer.created,
          default_source: customer.default_source,
          subscriptions: customer.subscriptions?.total_count || 0
        })),
        has_more: result.has_more,
        total_count: result.data.length
      };
    } catch (error) {
      throw new Error(`Failed to list customers: ${error.message}`);
    }
  }

  async createSubscription(args, credentials) {
    const data = {
      customer: args.customer_id,
      items: [
        {
          price: args.price_id
        }
      ]
    };

    if (args.trial_days) {
      data.trial_period_days = args.trial_days;
    }

    if (args.metadata) {
      data.metadata = args.metadata;
    }

    // Add payment behavior
    data.payment_behavior = 'default_incomplete';
    data.payment_settings = {
      save_default_payment_method: 'on_subscription'
    };
    data.expand = ['latest_invoice.payment_intent'];

    try {
      const result = await this.makeRequest('POST', '/subscriptions', data, credentials);
      
      return {
        id: result.id,
        customer: result.customer,
        status: result.status,
        current_period_start: result.current_period_start,
        current_period_end: result.current_period_end,
        trial_end: result.trial_end,
        latest_invoice: result.latest_invoice ? {
          id: result.latest_invoice.id,
          payment_intent: result.latest_invoice.payment_intent ? {
            client_secret: result.latest_invoice.payment_intent.client_secret
          } : null
        } : null
      };
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  async createCustomer(args, credentials) {
    const data = {};
    
    if (args.email) data.email = args.email;
    if (args.name) data.name = args.name;
    if (args.phone) data.phone = args.phone;
    if (args.metadata) data.metadata = args.metadata;

    try {
      const result = await this.makeRequest('POST', '/customers', data, credentials);
      
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        created: result.created
      };
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async retrievePaymentIntent(paymentIntentId, credentials) {
    try {
      const result = await this.makeRequest('GET', `/payment_intents/${paymentIntentId}`, null, credentials);
      
      return {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        created: result.created,
        customer: result.customer
      };
    } catch (error) {
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  async listPrices(args, credentials) {
    const queryParams = new URLSearchParams();
    
    if (args.limit) queryParams.append('limit', args.limit);
    if (args.product) queryParams.append('product', args.product);
    if (args.active !== undefined) queryParams.append('active', args.active);

    const endpoint = `/prices${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      const result = await this.makeRequest('GET', endpoint, null, credentials);
      
      return {
        data: result.data.map(price => ({
          id: price.id,
          product: price.product,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          active: price.active
        })),
        has_more: result.has_more
      };
    } catch (error) {
      throw new Error(`Failed to list prices: ${error.message}`);
    }
  }

  // Generic handler for HTTP requests through MCP
  async handle(method, path, body, credentials) {
    const endpoint = path.replace('/stripe', '');
    
    switch (true) {
      case endpoint === '/payment_intents' && method === 'POST':
        return this.createPaymentIntent(body, credentials);
        
      case endpoint === '/customers' && method === 'GET':
        return this.listCustomers(body || {}, credentials);
        
      case endpoint === '/customers' && method === 'POST':
        return this.createCustomer(body, credentials);
        
      case endpoint === '/subscriptions' && method === 'POST':
        return this.createSubscription(body, credentials);
        
      case endpoint === '/prices' && method === 'GET':
        return this.listPrices(body || {}, credentials);
        
      case endpoint.startsWith('/payment_intents/') && method === 'GET':
        const paymentIntentId = endpoint.split('/')[2];
        return this.retrievePaymentIntent(paymentIntentId, credentials);
        
      default:
        throw new Error(`Unsupported Stripe API endpoint: ${method} ${endpoint}`);
    }
  }

  // Webhook validation
  validateWebhook(payload, signature, secret) {
    const crypto = require('crypto');
    
    const elements = signature.split(',');
    const signatureElements = {};
    
    for (const element of elements) {
      const [key, value] = element.split('=');
      signatureElements[key] = value;
    }
    
    if (!signatureElements.t || !signatureElements.v1) {
      throw new Error('Invalid signature format');
    }
    
    const timestamp = signatureElements.t;
    const signatures = [signatureElements.v1];
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`, 'utf8')
      .digest('hex');
    
    const isValid = signatures.some(signature => 
      crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    );
    
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }
    
    return true;
  }
}

module.exports = new StripeHandler();