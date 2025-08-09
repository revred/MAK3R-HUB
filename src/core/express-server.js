/**
 * Express Server Setup
 * Centralized Express configuration with security and rate limiting
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

class ExpressServer {
  constructor(config = {}) {
    this.config = config;
    this.app = express();
    this.credentials = new Map();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Security middleware
    if (this.config.get('security.enableHelmet')) {
      this.app.use(helmet());
    }
    
    // Rate limiting
    if (this.config.get('rateLimiting.enabled')) {
      const limiter = rateLimit({
        windowMs: this.config.get('rateLimiting.windowMs'),
        max: this.config.get('rateLimiting.maxRequests'),
        message: this.config.get('rateLimiting.message')
      });
      this.app.use('/api/', limiter);
    }

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: this.getServiceStatus()
      });
    });
  }

  createApiRouter(serviceName, handler) {
    const router = express.Router();
    
    // Middleware to validate credentials
    router.use((req, res, next) => {
      const credentials = this.credentials.get(serviceName);
      if (!credentials) {
        return res.status(401).json({ 
          error: `No credentials configured for ${serviceName}` 
        });
      }
      req.credentials = credentials;
      next();
    });

    // Proxy all requests to the handler
    router.all('/*', async (req, res) => {
      try {
        const result = await handler.handle(req.method, req.path, req.body, req.credentials);
        res.json(result);
      } catch (error) {
        this.logError(serviceName, error);
        res.status(500).json({ 
          error: error.message,
          service: serviceName
        });
      }
    });

    return router;
  }

  addApiRoute(path, serviceName, handler) {
    this.app.use(path, this.createApiRouter(serviceName, handler));
  }

  setCredentials(serviceName, credentials) {
    this.credentials.set(serviceName, credentials);
  }

  getServiceStatus() {
    const services = {};
    for (const [name] of this.credentials) {
      services[name] = { status: 'configured' };
    }
    return services;
  }

  logError(service, error, logger = console) {
    logger.error(`[${service}] ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
  }

  listen(port, host, callback) {
    return this.app.listen(port, host, callback);
  }

  getApp() {
    return this.app;
  }
}

module.exports = ExpressServer;