// MAK3R-HUB Claude Code Context Manager
// Optimizes project structure and documentation for AI-assisted development

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ClaudeContextManager {
  /**
   * Generate Claude Code optimized project structure and documentation
   * @param {string} projectPath - Path to the project
   * @param {string} websiteType - Type of website (landing-page, ecommerce, etc.)
   * @param {string} framework - Framework being used (react-next, vue-nuxt, etc.)
   */
  static async optimizeProjectForClaude(projectPath, websiteType, framework) {
    console.log(chalk.blue('🧠 Optimizing project for Claude Code integration...'));
    
    try {
      // 1. Generate Claude-optimized CLAUDE.md
      await this.generateClaudeOptimizedDoc(projectPath, websiteType, framework);
      
      // 2. Create AI-friendly folder structure
      await this.createClaudeOptimizedStructure(projectPath, framework);
      
      // 3. Generate component documentation with AI hints
      await this.generateComponentDocumentation(projectPath, websiteType, framework);
      
      // 4. Create development workflow guides
      await this.createDevelopmentWorkflows(projectPath, websiteType, framework);
      
      console.log(chalk.green('✅ Claude Code optimization complete!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red('❌ Claude optimization failed:'), error.message);
      return false;
    }
  }
  
  /**
   * Generate Claude Code optimized CLAUDE.md with website-specific context
   */
  static async generateClaudeOptimizedDoc(projectPath, websiteType, framework) {
    const projectName = path.basename(projectPath);
    
    const claudeDoc = `# CLAUDE.md - ${projectName}

## 🎯 Project Overview
**Website Type**: ${websiteType}  
**Framework**: ${framework}  
**Optimization**: Claude Code force multiplier integration

This project is optimized for AI-assisted development with MAK3R-HUB automation.

## 🚀 Quick Start Commands
\`\`\`bash
# Development workflow
MAK3R-HUB dev                    # Start development server
MAK3R-HUB deploy --platform auto # Deploy to optimal platform

# Component generation  
MAK3R-HUB generate component Hero --type ${websiteType}
MAK3R-HUB generate page Contact --forms --validation
\`\`\`

## 🧠 Claude Code Integration

### **AI-Optimized Structure**
- **src/components/**: Reusable UI components with clear naming and documentation
- **src/pages/**: Website pages optimized for SEO and conversion  
- **src/layouts/**: Layout components for consistent structure
- **src/utils/**: Utility functions with comprehensive documentation
- **docs/**: Complete project documentation for AI context

### **Development Patterns**
This project follows MAK3R-HUB patterns optimized for Claude Code:

1. **Component-Driven**: Each component includes AI-friendly documentation
2. **SEO-Optimized**: All pages include meta tags and structured data  
3. **Performance-First**: Optimized for Core Web Vitals out of the box
4. **Deployment-Ready**: One-command deployment to production

### **AI Assistance Workflows**
\`\`\`bash
# Generate optimized components
"Create a hero section component for ${websiteType} with conversion optimization"

# Performance optimization
"Analyze and optimize this ${framework} application for Core Web Vitals"

# SEO enhancement  
"Add comprehensive SEO optimization to this ${websiteType} website"
\`\`\`

## 📋 Website-Specific Guidelines

### **${websiteType.charAt(0).toUpperCase() + websiteType.slice(1)} Optimization**
${this.getWebsiteTypeGuidelines(websiteType)}

## 🔧 Framework-Specific Patterns

### **${framework} Best Practices**
${this.getFrameworkGuidelines(framework)}

## 🚀 Deployment & Production

### **Automated Deployment**
\`\`\`bash
# Deploy with optimization
MAK3R-HUB deploy --platform vercel --optimize production
\`\`\`

### **Performance Monitoring**
- Core Web Vitals tracking enabled
- Conversion analytics configured
- Error monitoring integrated

---

**🤖 This project is optimized for Claude Code workflows. All components include AI-friendly documentation and patterns.**`;

    await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), claudeDoc);
    console.log(chalk.green('✅ CLAUDE.md generated with AI optimization'));
  }
  
  /**
   * Create Claude Code optimized folder structure
   */
  static async createClaudeOptimizedStructure(projectPath, framework) {
    const structure = {
      'src/components/': '# Reusable UI Components\n\nEach component includes:\n- Props documentation\n- Usage examples\n- Accessibility notes\n- Performance considerations',
      'src/pages/': '# Website Pages\n\nEach page includes:\n- SEO optimization\n- Meta tags\n- Structured data\n- Performance optimization',
      'src/layouts/': '# Layout Components\n\nLayout components for:\n- Consistent structure\n- SEO optimization\n- Responsive design\n- Accessibility',
      'src/utils/': '# Utility Functions\n\nUtilities include:\n- Clear documentation\n- Type definitions\n- Usage examples\n- Performance notes',
      'src/assets/': '# Static Assets\n\nOptimized assets:\n- Images (WebP, lazy loading)\n- Icons (SVG sprites)\n- Fonts (performance optimized)\n- Videos (compressed)',
      'docs/': '# Project Documentation\n\nComplete documentation:\n- Component library\n- API documentation\n- Deployment guides\n- Performance optimization',
      '.mak3r/': '# MAK3R-HUB Configuration\n\nAutomation configuration:\n- Deployment settings\n- Build optimization\n- Template configuration\n- Workflow automation'
    };
    
    for (const [folder, readme] of Object.entries(structure)) {
      const folderPath = path.join(projectPath, folder);
      await fs.ensureDir(folderPath);
      await fs.writeFile(path.join(folderPath, 'README.md'), readme);
    }
    
    console.log(chalk.green('✅ Claude-optimized folder structure created'));
  }
  
  /**
   * Generate component documentation with AI hints
   */
  static async generateComponentDocumentation(projectPath, websiteType, framework) {
    const componentsPath = path.join(projectPath, 'docs', 'components.md');
    
    const componentDoc = `# Component Library - ${websiteType}

## 🎯 AI-Optimized Components

This component library is designed for Claude Code integration with:
- Clear prop documentation
- Usage examples
- Accessibility guidelines
- Performance optimization hints

## 📋 Available Components

${this.getWebsiteTypeComponents(websiteType)}

## 🧠 Claude Code Integration Patterns

### **Component Generation**
\`\`\`bash
# Generate website-specific components
MAK3R-HUB generate component Hero --conversion-optimized
MAK3R-HUB generate component ProductCard --ecommerce --variants
MAK3R-HUB generate component ContactForm --validation --accessibility
\`\`\`

### **AI Assistance Prompts**
\`\`\`
"Create a responsive ${websiteType} component with accessibility and performance optimization"
"Generate a conversion-optimized hero section for ${framework}"
"Build a product catalog component with filtering and pagination"
\`\`\`

## 🚀 Performance Optimization

All components include:
- Lazy loading capabilities
- Image optimization hooks
- Bundle size optimization
- Core Web Vitals optimization`;

    await fs.ensureDir(path.join(projectPath, 'docs'));
    await fs.writeFile(componentsPath, componentDoc);
    console.log(chalk.green('✅ Component documentation generated'));
  }
  
  /**
   * Create development workflow guides
   */
  static async createDevelopmentWorkflows(projectPath, websiteType, framework) {
    const workflowsPath = path.join(projectPath, 'docs', 'workflows.md');
    
    const workflowDoc = `# Development Workflows - ${websiteType}

## 🚀 MAK3R-HUB Automated Workflows

### **Daily Development**
\`\`\`bash
# Morning startup
MAK3R-HUB doctor                 # System health check
MAK3R-HUB dev --port 3000       # Start development server

# Component development  
MAK3R-HUB generate component <name> --type ${websiteType}
MAK3R-HUB generate page <name> --seo-optimized

# Testing and optimization
MAK3R-HUB test --coverage       # Run test suite
MAK3R-HUB optimize --analyze    # Performance analysis
\`\`\`

### **Deployment Workflow**
\`\`\`bash
# Build optimization
MAK3R-HUB build --optimize production

# Deployment
MAK3R-HUB deploy --platform auto --domain mydomain.com

# Post-deployment
MAK3R-HUB monitor --lighthouse  # Performance monitoring
\`\`\`

## 🧠 Claude Code Workflows

### **AI-Assisted Development**
${this.getClaudeWorkflows(websiteType)}

## 📊 Performance Monitoring

### **Automated Checks**
- Core Web Vitals monitoring
- SEO analysis and recommendations  
- Accessibility validation
- Security scanning

### **Optimization Workflows**
- Image optimization pipeline
- CSS/JS minification and tree-shaking
- Bundle analysis and optimization
- Performance regression detection`;

    await fs.writeFile(workflowsPath, workflowDoc);
    console.log(chalk.green('✅ Development workflows created'));
  }
  
  /**
   * Get website type specific guidelines
   */
  static getWebsiteTypeGuidelines(websiteType) {
    const guidelines = {
      'landing-page': `- **Conversion Focus**: Every element optimized for conversion
- **Performance**: Sub-3 second load times on mobile
- **SEO**: Complete meta tags, structured data, sitemap
- **A/B Testing**: Built-in testing infrastructure
- **Analytics**: Conversion tracking and performance monitoring`,
      
      'ecommerce': `- **Product Catalog**: Optimized product display and filtering
- **Shopping Cart**: Persistent cart with session management
- **Checkout Flow**: Streamlined, secure checkout process
- **Payment Integration**: Multiple payment provider support
- **Inventory Management**: Real-time inventory tracking`,
      
      'portfolio': `- **Visual Showcase**: Image optimization and lazy loading
- **Project Display**: Clear project presentation with case studies
- **Contact Integration**: Multiple contact methods and forms
- **Performance**: Optimized for visual content delivery
- **SEO**: Portfolio-specific structured data`,
      
      'blog': `- **Content Management**: Markdown support with frontmatter
- **SEO Optimization**: Article-specific meta tags and structured data
- **Reading Experience**: Typography and readability optimization
- **Social Sharing**: Integrated social media sharing
- **Newsletter**: Subscription and email integration`,
      
      'saas': `- **Authentication**: User registration and management
- **Dashboard**: Real-time data visualization
- **API Integration**: RESTful API with documentation
- **Subscription Management**: Billing and payment processing
- **User Experience**: Onboarding and feature discovery`
    };
    
    return guidelines[websiteType] || guidelines['landing-page'];
  }
  
  /**
   * Get framework specific guidelines  
   */
  static getFrameworkGuidelines(framework) {
    const guidelines = {
      'react-next': `- **SSR/SSG**: Optimal rendering strategy for SEO
- **API Routes**: Built-in API development
- **Image Optimization**: Next.js Image component usage
- **Performance**: Bundle optimization and code splitting
- **Deployment**: Vercel-optimized configuration`,
      
      'vue-nuxt': `- **Universal Rendering**: SSR/SSG configuration
- **Module System**: Nuxt module ecosystem utilization
- **SEO**: Nuxt SEO module integration
- **Performance**: Nuxt optimization features
- **Deployment**: Netlify/Vercel deployment ready`,
      
      'svelte-kit': `- **Performance**: Minimal bundle size optimization
- **SSR**: Server-side rendering configuration
- **Routing**: File-based routing system
- **Build Optimization**: Vite build system utilization
- **Progressive Enhancement**: Enhanced user experience`
    };
    
    return guidelines[framework] || 'Framework-specific optimization patterns';
  }
  
  /**
   * Get website type specific components
   */
  static getWebsiteTypeComponents(websiteType) {
    const components = {
      'landing-page': `### **Hero Section**
- Conversion-optimized headline and CTA
- A/B testing hooks for optimization
- Responsive design with image optimization

### **Features Section**  
- Clear benefit presentation
- Icon integration with performance optimization
- Social proof and testimonials integration

### **Contact Form**
- Lead capture with validation
- Privacy compliance (GDPR/CCPA)
- Success tracking and analytics`,
      
      'ecommerce': `### **Product Card**
- Image optimization with multiple variants
- Price display with currency formatting
- Add to cart functionality with state management

### **Shopping Cart**
- Persistent cart with local storage
- Quantity management and validation
- Checkout integration with payment processing

### **Product Filter**
- Advanced filtering with search functionality
- Category navigation with breadcrumbs
- Sort options with performance optimization`
    };
    
    return components[websiteType] || 'Website-specific components will be generated based on project requirements.';
  }
  
  /**
   * Get Claude Code workflows for website type
   */
  static getClaudeWorkflows(websiteType) {
    const workflows = {
      'landing-page': `1. **Hero Optimization**: "Create a conversion-optimized hero section with A/B testing capabilities"
2. **Performance Analysis**: "Analyze Core Web Vitals and suggest optimization improvements"  
3. **SEO Enhancement**: "Add comprehensive SEO optimization including structured data"
4. **Conversion Tracking**: "Implement analytics and conversion tracking for landing page optimization"`,
      
      'ecommerce': `1. **Product Catalog**: "Generate a product catalog with filtering, pagination, and search functionality"
2. **Shopping Cart**: "Create a shopping cart with persistent state and checkout integration"
3. **Payment Integration**: "Implement secure payment processing with multiple provider support"
4. **Inventory Management**: "Build inventory tracking with low stock notifications"`
    };
    
    return workflows[websiteType] || 'AI-assisted development workflows will be customized for your website type.';
  }
}

module.exports = ClaudeContextManager;