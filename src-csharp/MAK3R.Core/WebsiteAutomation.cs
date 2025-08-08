using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Text.Json;

namespace MAK3R.Core
{
    /// <summary>
    /// Website development automation engine
    /// Specialized for rapid website creation and deployment
    /// </summary>
    public class WebsiteAutomation
    {
        private readonly IPlatformAdapter _platform;

        public WebsiteAutomation(IPlatformAdapter platformAdapter)
        {
            _platform = platformAdapter ?? throw new ArgumentNullException(nameof(platformAdapter));
        }

        /// <summary>
        /// Create a complete website project optimized for Claude Code development
        /// </summary>
        public async Task<WebsiteProject> CreateWebsiteAsync(WebsiteCreationRequest request)
        {
            await _platform.WriteLineAsync($"🚀 Creating {request.Type} website: {request.Name}", ConsoleColor.Blue);

            // 1. Create project directory structure
            var projectPath = Path.Combine(request.OutputPath ?? Environment.CurrentDirectory, request.Name);
            await CreateProjectStructure(projectPath, request.Type);

            // 2. Generate basic project files
            await GenerateBasicProjectFiles(projectPath, request.Type, request.Framework);

            // 3. Generate optimized components
            await GenerateWebsiteComponents(projectPath, request.Type, request.Framework);

            // 4. Create deployment configuration
            await ConfigureDeployment(projectPath, request.Type, request.Framework);

            // 5. Generate Claude Code optimization
            await OptimizeForClaudeCode(projectPath, request);

            await _platform.WriteLineAsync("✅ Website created successfully!", ConsoleColor.Green);

            return new WebsiteProject
            {
                Name = request.Name,
                Type = request.Type,
                Framework = request.Framework,
                Path = projectPath,
                DevServerPort = await FindAvailablePort(3000),
                CreatedAt = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Start development server for website project
        /// </summary>
        public async Task<ProcessResult> StartDevelopmentServerAsync(string projectPath)
        {
            var framework = await _platform.DetectWebFrameworkAsync(projectPath);
            var port = await FindAvailablePort(3000);

            await _platform.WriteLineAsync($"⚡ Starting {framework} development server on port {port}...", ConsoleColor.Blue);

            return await _platform.StartWebServerAsync(framework, projectPath, port);
        }

        /// <summary>
        /// Deploy website to specified platform
        /// </summary>
        public async Task<DeploymentResult> DeployWebsiteAsync(string projectPath, string platform = "auto")
        {
            if (platform == "auto")
            {
                platform = await DetectOptimalDeploymentPlatform(projectPath);
            }

            await _platform.WriteLineAsync($"🚀 Deploying to {platform}...", ConsoleColor.Blue);

            var config = new Dictionary<string, string>();

            return platform.ToLower() switch
            {
                "vercel" => await _platform.DeployToVercelAsync(projectPath, config),
                "netlify" => await _platform.DeployToNetlifyAsync(projectPath, config),
                _ => throw new ArgumentException($"Unsupported deployment platform: {platform}")
            };
        }

        #region Private Implementation

        private async Task CreateProjectStructure(string projectPath, string websiteType)
        {
            await _platform.CreateDirectoryAsync(projectPath);

            var folders = new[]
            {
                "src",
                "src/components",
                "src/pages", 
                "src/layouts",
                "src/assets",
                "src/utils",
                "public",
                "docs",
                ".mak3r",
                ".mak3r/templates",
                ".mak3r/workflows"
            };

            foreach (var folder in folders)
            {
                await _platform.CreateDirectoryAsync(Path.Combine(projectPath, folder));
            }
        }

        private async Task GenerateBasicProjectFiles(string projectPath, string websiteType, string framework)
        {
            // Generate package.json
            var packageJson = GeneratePackageJson(websiteType, framework);
            await _platform.WriteFileAsync(Path.Combine(projectPath, "package.json"), packageJson);

            // Generate basic index file
            var indexContent = GenerateIndexFile(websiteType, framework);
            var indexPath = framework switch
            {
                "react-next" => Path.Combine(projectPath, "src", "pages", "index.jsx"),
                "vue-nuxt" => Path.Combine(projectPath, "src", "pages", "index.vue"),
                _ => Path.Combine(projectPath, "src", "index.html")
            };
            await _platform.WriteFileAsync(indexPath, indexContent);
        }

        private async Task GenerateWebsiteComponents(string projectPath, string websiteType, string framework)
        {
            var components = GetWebsiteTypeComponents(websiteType);
            var templatesPath = Path.Combine(projectPath, ".mak3r", "templates");

            foreach (var component in components)
            {
                var componentTemplate = GetComponentTemplate(component, framework, websiteType);
                var componentPath = Path.Combine(projectPath, "src", "components", $"{component}.{GetFileExtension(framework)}");
                
                await _platform.WriteFileAsync(componentPath, componentTemplate);
                
                // Generate component documentation
                var docPath = Path.Combine(templatesPath, $"{component}.md");
                var documentation = GenerateComponentDocumentation(component, websiteType, framework);
                await _platform.WriteFileAsync(docPath, documentation);
            }
        }

        private async Task ConfigureDeployment(string projectPath, string websiteType, string framework)
        {
            // Generate Vercel configuration
            var vercelConfig = GenerateVercelConfig(websiteType, framework);
            await _platform.WriteFileAsync(Path.Combine(projectPath, "vercel.json"), vercelConfig);

            // Generate Netlify configuration
            var netlifyConfig = GenerateNetlifyConfig(websiteType, framework);
            await _platform.WriteFileAsync(Path.Combine(projectPath, "netlify.toml"), netlifyConfig);
        }

        private async Task OptimizeForClaudeCode(string projectPath, WebsiteCreationRequest request)
        {
            // Generate CLAUDE.md with website-specific optimization
            var claudeDoc = GenerateClaudeOptimizedDoc(request);
            await _platform.WriteFileAsync(Path.Combine(projectPath, "CLAUDE.md"), claudeDoc);

            // Generate development workflows
            var workflows = GenerateClaudeWorkflows(request.Type, request.Framework);
            var workflowsPath = Path.Combine(projectPath, ".mak3r", "workflows", "claude-workflows.json");
            await _platform.WriteFileAsync(workflowsPath, JsonSerializer.Serialize(workflows, new JsonSerializerOptions { WriteIndented = true }));

            // Generate README with Claude Code integration
            var readme = GenerateClaudeOptimizedReadme(request);
            await _platform.WriteFileAsync(Path.Combine(projectPath, "README.md"), readme);
        }

        private async Task<int> FindAvailablePort(int startPort)
        {
            for (int port = startPort; port < startPort + 100; port++)
            {
                if (!await _platform.IsPortInUseAsync(port))
                {
                    return port;
                }
            }
            return startPort; // Fallback
        }

        private async Task<string> DetectOptimalDeploymentPlatform(string projectPath)
        {
            var framework = await _platform.DetectWebFrameworkAsync(projectPath);
            
            return framework switch
            {
                "nuxt" => "vercel",
                "next" => "vercel", 
                "svelte" => "netlify",
                "angular" => "netlify",
                _ => "vercel"
            };
        }

        #endregion

        #region Template Generation

        private string GeneratePackageJson(string websiteType, string framework)
        {
            var packageJson = new
            {
                name = $"mak3r-{websiteType}",
                version = "1.0.0",
                description = $"MAK3R-HUB generated {websiteType} website",
                scripts = new Dictionary<string, string>
                {
                    ["dev"] = framework switch
                    {
                        "react-next" => "next dev",
                        "vue-nuxt" => "nuxt dev",
                        "svelte-kit" => "vite dev",
                        _ => "npm start"
                    },
                    ["build"] = framework switch
                    {
                        "react-next" => "next build",
                        "vue-nuxt" => "nuxt build",
                        "svelte-kit" => "vite build",
                        _ => "npm run build"
                    },
                    ["start"] = framework switch
                    {
                        "react-next" => "next start",
                        "vue-nuxt" => "nuxt start",
                        _ => "npm start"
                    }
                },
                dependencies = GetWebsiteTypeDependencies(websiteType),
                devDependencies = new Dictionary<string, string>(),
                keywords = new[] { "mak3r-hub", "claude-code", websiteType, framework }
            };

            return JsonSerializer.Serialize(packageJson, new JsonSerializerOptions { WriteIndented = true });
        }

        private string GenerateIndexFile(string websiteType, string framework)
        {
            return framework switch
            {
                "react-next" => $@"// {websiteType} homepage generated by MAK3R-HUB
import React from 'react';
import Head from 'next/head';

export default function Home() {{
  return (
    <>
      <Head>
        <title>MAK3R-HUB {websiteType}</title>
        <meta name=""description"" content=""Generated by MAK3R-HUB Claude Code force multiplier"" />
      </Head>
      <main>
        <h1>Welcome to your {websiteType}!</h1>
        <p>Generated by MAK3R-HUB - Claude Code optimized</p>
      </main>
    </>
  );
}}",
                "vue-nuxt" => $@"<!-- {websiteType} homepage generated by MAK3R-HUB -->
<template>
  <div>
    <Head>
      <Title>MAK3R-HUB {websiteType}</Title>
      <Meta name=""description"" content=""Generated by MAK3R-HUB Claude Code force multiplier"" />
    </Head>
    <main>
      <h1>Welcome to your {websiteType}!</h1>
      <p>Generated by MAK3R-HUB - Claude Code optimized</p>
    </main>
  </div>
</template>

<script setup>
// Component logic here
</script>",
                _ => $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>MAK3R-HUB {websiteType}</title>
    <meta name=""description"" content=""Generated by MAK3R-HUB Claude Code force multiplier"">
</head>
<body>
    <main>
        <h1>Welcome to your {websiteType}!</h1>
        <p>Generated by MAK3R-HUB - Claude Code optimized</p>
    </main>
</body>
</html>"
            };
        }

        private Dictionary<string, string> GetWebsiteTypeDependencies(string websiteType)
        {
            return websiteType switch
            {
                "landing-page" => new Dictionary<string, string> { ["react"] = "^18.0.0", ["next"] = "^14.0.0" },
                "ecommerce" => new Dictionary<string, string> { ["react"] = "^18.0.0", ["stripe"] = "^14.0.0" },
                "portfolio" => new Dictionary<string, string> { ["vue"] = "^3.0.0", ["nuxt"] = "^3.0.0" },
                "blog" => new Dictionary<string, string> { ["vue"] = "^3.0.0", ["nuxt"] = "^3.0.0" },
                "saas" => new Dictionary<string, string> { ["react"] = "^18.0.0", ["next"] = "^14.0.0" },
                _ => new Dictionary<string, string>()
            };
        }

        private List<string> GetWebsiteTypeComponents(string websiteType)
        {
            return websiteType switch
            {
                "landing-page" => new List<string> { "Hero", "Features", "Testimonials", "CTA", "Footer" },
                "ecommerce" => new List<string> { "ProductCard", "ShoppingCart", "Checkout", "ProductFilter", "OrderSummary" },
                "portfolio" => new List<string> { "ProjectCard", "SkillsGrid", "ContactForm", "Timeline", "Gallery" },
                "blog" => new List<string> { "ArticleCard", "CategoryFilter", "SearchBar", "Newsletter", "AuthorBio" },
                "saas" => new List<string> { "Dashboard", "PricingCard", "FeatureCard", "UserProfile", "Analytics" },
                _ => new List<string> { "Header", "Main", "Footer" }
            };
        }

        private string GetComponentTemplate(string component, string framework, string websiteType)
        {
            return framework switch
            {
                "react-next" => $@"// {component} component for {websiteType}
// Generated by MAK3R-HUB - Claude Code optimized

export default function {component}() {{
  return (
    <div className=""{component.ToLower()}"">
      <h2>{component} Component</h2>
      {{/* TODO: Implement {component} functionality for {websiteType} */}}
    </div>
  );
}}",
                "vue-nuxt" => $@"<!-- {component} component for {websiteType} -->
<!-- Generated by MAK3R-HUB - Claude Code optimized -->

<template>
  <div class=""{component.ToLower()}"">
    <h2>{component} Component</h2>
    <!-- TODO: Implement {component} functionality for {websiteType} -->
  </div>
</template>

<script setup>
// Component logic here
</script>

<style scoped>
.{component.ToLower()} {{
  /* Component styles */
}}
</style>",
                _ => $"<!-- {component} component template for {framework} -->"
            };
        }

        private string GetFileExtension(string framework)
        {
            return framework switch
            {
                "react-next" => "jsx",
                "vue-nuxt" => "vue",
                "svelte-kit" => "svelte",
                "angular" => "ts",
                _ => "js"
            };
        }

        private string GenerateComponentDocumentation(string component, string websiteType, string framework)
        {
            return $@"# {component} Component

## Purpose
{component} component optimized for {websiteType} websites.

## Usage
```{GetFileExtension(framework)}
// Component usage example
```

## Props
- Add component props documentation

## Claude Code Integration
This component is optimized for AI-assisted development with clear structure and documentation.

## Performance Considerations
- Add performance optimization notes

## Accessibility
- Add accessibility guidelines";
        }

        private string GenerateVercelConfig(string websiteType, string framework)
        {
            return JsonSerializer.Serialize(new
            {
                version = 2,
                builds = new[] { new { src = "package.json", use = "@vercel/static-build" } },
                routes = new[] { new { src = "/(.*)", dest = "/" } }
            }, new JsonSerializerOptions { WriteIndented = true });
        }

        private string GenerateNetlifyConfig(string websiteType, string framework)
        {
            return $@"[build]
  command = ""npm run build""
  publish = ""dist""

[build.environment]
  NODE_VERSION = ""18""

[[redirects]]
  from = ""/*""
  to = ""/index.html""
  status = 200";
        }

        private string GenerateClaudeOptimizedDoc(WebsiteCreationRequest request)
        {
            return $@"# CLAUDE.md - {request.Name}

## 🎯 Project Overview
**Website Type**: {request.Type}
**Framework**: {request.Framework} 
**Created**: {DateTime.UtcNow:yyyy-MM-dd}

This project is optimized for Claude Code development with MAK3R-HUB automation.

## 🚀 Quick Commands
```bash
# Development
MAK3R-HUB dev                    # Start development server
MAK3R-HUB build                  # Build for production
MAK3R-HUB deploy                 # Deploy to optimal platform

# Component generation
MAK3R-HUB generate component <name> --type {request.Type}
MAK3R-HUB generate page <name> --seo-optimized
```

## 🧠 Claude Code Integration
This project structure is optimized for AI-assisted development:

- **Clear component organization** with documentation
- **SEO-optimized pages** with meta tags
- **Performance-first approach** with optimization hints
- **Deployment-ready** configuration

## 📋 Development Workflow
1. Start development server: `MAK3R-HUB dev`
2. Generate components as needed
3. Optimize for performance and SEO
4. Deploy with one command: `MAK3R-HUB deploy`

---
**🤖 Generated by MAK3R-HUB - Claude Code Force Multiplier**";
        }

        private object GenerateClaudeWorkflows(string websiteType, string framework)
        {
            return new
            {
                websiteType,
                framework,
                workflows = new[]
                {
                    new
                    {
                        name = "create-component",
                        description = $"Generate {websiteType}-optimized component",
                        command = "MAK3R-HUB generate component <name>",
                        claudePrompt = $"Create a {websiteType} component with accessibility and performance optimization"
                    },
                    new
                    {
                        name = "optimize-performance",
                        description = "Analyze and optimize website performance",
                        command = "MAK3R-HUB optimize --analyze",
                        claudePrompt = $"Analyze this {framework} {websiteType} website for Core Web Vitals optimization"
                    },
                    new
                    {
                        name = "deploy-production",
                        description = "Deploy to production with optimization",
                        command = "MAK3R-HUB deploy --optimize",
                        claudePrompt = "Deploy the website with production optimizations"
                    }
                }
            };
        }

        private string GenerateClaudeOptimizedReadme(WebsiteCreationRequest request)
        {
            return $@"# {request.Name}

**{request.Type} website built with {request.Framework}**

## 🚀 Quick Start
```bash
# Start development
MAK3R-HUB dev

# Deploy to production  
MAK3R-HUB deploy
```

## 🎯 Features
- **Claude Code Optimized**: AI-friendly project structure
- **Performance First**: Optimized for Core Web Vitals
- **SEO Ready**: Complete meta tags and structured data
- **Deployment Ready**: One-command deployment

## 🛠️ Built with MAK3R-HUB
This project was created with MAK3R-HUB, the ultimate Claude Code force multiplier for website development.

---
Generated on {DateTime.UtcNow:yyyy-MM-dd} with MAK3R-HUB";
        }

        #endregion
    }

    #region Data Models

    public class WebsiteCreationRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "landing-page";
        public string Framework { get; set; } = "vue-nuxt";
        public string? OutputPath { get; set; }
        public Dictionary<string, string> Options { get; set; } = new();
    }

    public class WebsiteProject
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Framework { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public int DevServerPort { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}