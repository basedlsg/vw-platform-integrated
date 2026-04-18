# Google Agent Development Kit (ADK) - Python Skills & MCP Integration

## 1. Overview of Python Skills in ADK

The Google Agent Development Kit (ADK) provides a modular approach to building agents, with **Skills** acting as the fundamental building blocks for agent capabilities. While the core ADK can run on various platforms, Python is a primary language for authoring these skills.

### Key Concepts:
*   **Skills as Tools:** In the context of ADK, a "Skill" is essentially a well-defined tool or function that an agent can invoke.
*   **Python Authoring:** Developers author these skills using Python, leveraging its extensive ecosystem for tasks like data processing, API interactions, and complex computations.
*   **Decorator-based Registration:** ADK typically uses decorators (e.g., `@skill` or similar constructs) to easily expose standard Python functions as AI-callable skills.

## 2. Structure of an ADK Python Skill

A typical ADK Python Skill involves:
1.  **Function Definition:** A standard Python function performing the desired logic.
2.  **Type Hints & Docstrings:** Crucial for the LLM to understand what the skill does and what arguments it expects. The ADK framework uses these to automatically generate the tool schema (JSON Schema) required by the LLM.
3.  **Registration:** Registering the function with the agent's tool registry.

*Example Conceptual Structure:*
```python
from google_adk import skill

@skill(name="fetch_user_data", description="Fetches user data from the database by ID.")
def fetch_user_data(user_id: int) -> dict:
    # Logic to connect to DB and fetch user
    return {"id": user_id, "name": "Alice"}
```

## 3. Integrating Python Skills with MCP

The Model Context Protocol (MCP) standardizes how agents interact with external tools and context. ADK's Python skills map directly onto MCP's concepts.

### How it works:
1.  **Skill to MCP Tool Mapping:** An ADK Python Skill is translated into an **MCP Tool**. The Python function's signature (type hints) and docstring are converted into the JSON Schema required by the MCP specification for tool discovery.
2.  **MCP Server:** When an ADK agent acts as an MCP client, it can connect to MCP servers. If you write an MCP server in Python, the "tools" exposed by that server are effectively your Python Skills.
3.  **Execution Flow:**
    *   The LLM decides to use a skill based on its description (via MCP).
    *   The MCP client (the agent) sends an execute request to the MCP server.
    *   The MCP server routes the request to the specific Python function.
    *   The Python function executes and returns the result.
    *   The result is formatted back into the MCP response standard and sent to the LLM.

## 4. `agentskills.io` (Conceptual Role)

While specific documentation for `agentskills.io` might be internal or evolving, conceptually in the ADK ecosystem, it serves as:
*   **Registry/Marketplace:** A central repository for discovering and sharing standard, pre-built skills.
*   **Standardization:** Providing a unified interface or SDK for wrapping Python functions so they are universally consumable by ADK agents and MCP clients.
*   **Hosting/Execution (Potentially):** Offering a serverless or managed environment to host these Python skills as scalable MCP tool endpoints.

## 5. Summary

Python is central to the capability layer of Google's ADK. By defining typed Python functions, developers create "Skills" which are seamlessly translated into standard tools for LLMs. Through the Model Context Protocol (MCP), these Python Skills become universally accessible, allowing ADK agents to securely and predictably interact with external systems and data.