/**
 * GitHub API Handler for MAK3R-HUB MCP
 * Secure GitHub integration for repository management
 */

const https = require('https');

class GitHubHandler {
  constructor() {
    this.baseUrl = 'https://api.github.com';
  }

  async makeRequest(method, endpoint, data, credentials) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: endpoint,
        method: method.toUpperCase(),
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'MAK3R-HUB/1.0.0',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      };

      let postData = '';
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        postData = JSON.stringify(data);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`GitHub API error: ${parsed.message || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse GitHub response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`GitHub request failed: ${error.message}`));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async createRepo(args, credentials) {
    const data = {
      name: args.name,
      description: args.description || `Repository created by MAK3R-HUB`,
      private: args.private || false,
      auto_init: args.auto_init !== false,
      gitignore_template: args.gitignore_template,
      license_template: args.license_template
    };

    if (args.homepage) data.homepage = args.homepage;
    if (args.has_issues !== undefined) data.has_issues = args.has_issues;
    if (args.has_projects !== undefined) data.has_projects = args.has_projects;
    if (args.has_wiki !== undefined) data.has_wiki = args.has_wiki;

    try {
      const result = await this.makeRequest('POST', '/user/repos', data, credentials);
      
      return {
        id: result.id,
        name: result.name,
        full_name: result.full_name,
        html_url: result.html_url,
        clone_url: result.clone_url,
        ssh_url: result.ssh_url,
        private: result.private,
        created_at: result.created_at
      };
    } catch (error) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  async createPR(args, credentials) {
    const data = {
      title: args.title,
      head: args.head,
      base: args.base || 'main',
      body: args.body || 'Pull request created by MAK3R-HUB',
      draft: args.draft || false
    };

    const endpoint = `/repos/${args.owner}/${args.repo}/pulls`;

    try {
      const result = await this.makeRequest('POST', endpoint, data, credentials);
      
      return {
        id: result.id,
        number: result.number,
        title: result.title,
        html_url: result.html_url,
        state: result.state,
        created_at: result.created_at,
        user: result.user.login
      };
    } catch (error) {
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  async createIssue(args, credentials) {
    const data = {
      title: args.title,
      body: args.body || '',
      labels: args.labels || [],
      assignees: args.assignees || []
    };

    if (args.milestone) data.milestone = args.milestone;

    const endpoint = `/repos/${args.owner}/${args.repo}/issues`;

    try {
      const result = await this.makeRequest('POST', endpoint, data, credentials);
      
      return {
        id: result.id,
        number: result.number,
        title: result.title,
        html_url: result.html_url,
        state: result.state,
        created_at: result.created_at,
        user: result.user.login
      };
    } catch (error) {
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  async createRelease(args, credentials) {
    const data = {
      tag_name: args.tag_name,
      target_commitish: args.target_commitish || 'main',
      name: args.name || args.tag_name,
      body: args.body || '',
      draft: args.draft || false,
      prerelease: args.prerelease || false,
      generate_release_notes: args.generate_release_notes || false
    };

    const endpoint = `/repos/${args.owner}/${args.repo}/releases`;

    try {
      const result = await this.makeRequest('POST', endpoint, data, credentials);
      
      return {
        id: result.id,
        tag_name: result.tag_name,
        name: result.name,
        html_url: result.html_url,
        tarball_url: result.tarball_url,
        zipball_url: result.zipball_url,
        created_at: result.created_at,
        published_at: result.published_at
      };
    } catch (error) {
      throw new Error(`Failed to create release: ${error.message}`);
    }
  }

  async listRepos(args, credentials) {
    const queryParams = new URLSearchParams();
    
    if (args.type) queryParams.append('type', args.type);
    if (args.sort) queryParams.append('sort', args.sort);
    if (args.direction) queryParams.append('direction', args.direction);
    if (args.per_page) queryParams.append('per_page', args.per_page);
    if (args.page) queryParams.append('page', args.page);

    const endpoint = `/user/repos${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      const result = await this.makeRequest('GET', endpoint, null, credentials);
      
      return {
        repositories: result.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          description: repo.description,
          private: repo.private,
          fork: repo.fork,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          language: repo.language
        })),
        total_count: result.length
      };
    } catch (error) {
      throw new Error(`Failed to list repositories: ${error.message}`);
    }
  }

  async getRepo(owner, repo, credentials) {
    const endpoint = `/repos/${owner}/${repo}`;

    try {
      const result = await this.makeRequest('GET', endpoint, null, credentials);
      
      return {
        id: result.id,
        name: result.name,
        full_name: result.full_name,
        html_url: result.html_url,
        description: result.description,
        private: result.private,
        fork: result.fork,
        created_at: result.created_at,
        updated_at: result.updated_at,
        stargazers_count: result.stargazers_count,
        forks_count: result.forks_count,
        open_issues_count: result.open_issues_count,
        language: result.language,
        default_branch: result.default_branch,
        topics: result.topics
      };
    } catch (error) {
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  }

  async listPRs(args, credentials) {
    const queryParams = new URLSearchParams();
    
    if (args.state) queryParams.append('state', args.state);
    if (args.head) queryParams.append('head', args.head);
    if (args.base) queryParams.append('base', args.base);
    if (args.sort) queryParams.append('sort', args.sort);
    if (args.direction) queryParams.append('direction', args.direction);
    if (args.per_page) queryParams.append('per_page', args.per_page);

    const endpoint = `/repos/${args.owner}/${args.repo}/pulls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      const result = await this.makeRequest('GET', endpoint, null, credentials);
      
      return {
        pull_requests: result.map(pr => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          html_url: pr.html_url,
          state: pr.state,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          user: pr.user.login,
          head: {
            ref: pr.head.ref,
            sha: pr.head.sha
          },
          base: {
            ref: pr.base.ref,
            sha: pr.base.sha
          }
        })),
        total_count: result.length
      };
    } catch (error) {
      throw new Error(`Failed to list pull requests: ${error.message}`);
    }
  }

  async createWebhook(args, credentials) {
    const data = {
      name: args.name || 'web',
      active: args.active !== false,
      events: args.events || ['push', 'pull_request'],
      config: {
        url: args.url,
        content_type: args.content_type || 'json',
        ...(args.secret && { secret: args.secret })
      }
    };

    const endpoint = `/repos/${args.owner}/${args.repo}/hooks`;

    try {
      const result = await this.makeRequest('POST', endpoint, data, credentials);
      
      return {
        id: result.id,
        name: result.name,
        active: result.active,
        events: result.events,
        config: result.config,
        created_at: result.created_at
      };
    } catch (error) {
      throw new Error(`Failed to create webhook: ${error.message}`);
    }
  }

  async getUser(credentials) {
    try {
      const result = await this.makeRequest('GET', '/user', null, credentials);
      
      return {
        id: result.id,
        login: result.login,
        name: result.name,
        email: result.email,
        bio: result.bio,
        company: result.company,
        location: result.location,
        html_url: result.html_url,
        public_repos: result.public_repos,
        followers: result.followers,
        following: result.following,
        created_at: result.created_at
      };
    } catch (error) {
      throw new Error(`Failed to get user information: ${error.message}`);
    }
  }

  // Generic handler for HTTP requests through MCP
  async handle(method, path, body, credentials) {
    const endpoint = path.replace('/github', '');
    
    switch (true) {
      case endpoint === '/repos' && method === 'POST':
        return this.createRepo(body, credentials);
        
      case endpoint === '/repos' && method === 'GET':
        return this.listRepos(body || {}, credentials);
        
      case endpoint.includes('/pulls') && method === 'POST':
        return this.createPR(body, credentials);
        
      case endpoint.includes('/pulls') && method === 'GET':
        return this.listPRs(body || {}, credentials);
        
      case endpoint.includes('/issues') && method === 'POST':
        return this.createIssue(body, credentials);
        
      case endpoint.includes('/releases') && method === 'POST':
        return this.createRelease(body, credentials);
        
      case endpoint.includes('/hooks') && method === 'POST':
        return this.createWebhook(body, credentials);
        
      case endpoint === '/user' && method === 'GET':
        return this.getUser(credentials);
        
      case endpoint.match(/^\/repos\/[^\/]+\/[^\/]+$/) && method === 'GET':
        const [, , owner, repo] = endpoint.split('/');
        return this.getRepo(owner, repo, credentials);
        
      default:
        throw new Error(`Unsupported GitHub API endpoint: ${method} ${endpoint}`);
    }
  }

  // Webhook validation
  validateWebhook(payload, signature, secret) {
    const crypto = require('crypto');
    
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new GitHubHandler();