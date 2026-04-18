# Google ADK & MCP Research for Next.js and Supabase Project

## 1. Overview of Google Agent Development Kit (ADK)
The Google Agent Development Kit (ADK) is a modular framework for developing and deploying AI agents. While optimized for Gemini, it offers compatibility with other models and frameworks. It allows building workflows with various agent types (Sequential, Parallel, Loop) and LLM agents.

## 2. Integration with Next.js & Supabase
- **Next.js Integration**: ADK can be hosted within Next.js API routes or deployed separately as an API server. ADK agents can be invoked from the Next.js frontend to handle complex, stateful operations. Next.js can act as the orchestrator calling the Agent Engine.
- **Supabase Integration**: Supabase can be used to store agent state, memory, or serve as a vector database for Retrieval-Augmented Generation (RAG). An MCP server can be used to securely interface between the ADK agents and the Supabase PostgreSQL database.

## 3. Relevant MCP (Model Context Protocol) Servers
MCP standardizes how AI models access external data and tools. In the ADK, `McpToolset` is used to integrate MCP servers with agents.
Relevant MCP servers for this stack include:
- **Supabase / PostgreSQL MCP Server**: Connects agents directly to the Supabase database to query data, insert records, or search vector embeddings.
- **File System MCP Server** (`@modelcontextprotocol/server-filesystem`): Allows agents to read/write local project files during development.
- **Google Maps / Search MCP Servers**: For geographic or general web retrieval if the project requires it.
- **Fetch/HTTP MCP Server**: Allows agents to make REST/GraphQL calls to external APIs or Supabase Edge Functions.

## 4. Skills and Agent Capabilities
- **ADK Python Skills**: ADK Python development Agent Skills (`agentskills.io`) enable quicker agent coding.
- **Workflow Agents**: Useful for structuring complex interactions (e.g., fetching data from Supabase, processing it with an LLM, and returning results to a Next.js client).
- **Deployment Patterns**: ADK supports Self-Contained Stdio MCP Servers (great for local development) and Remote MCP Servers (Streamable HTTP, great for production deployments like Vercel or GKE).

## Next Steps
- Implement a basic ADK agent with a PostgreSQL MCP server pointing to Supabase.
- Expose the agent via a Next.js API route using the ADK API server/runtime capabilities.
