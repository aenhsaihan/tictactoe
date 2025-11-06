# Importing Tasks to Vibe Kanban MCP Server

This guide explains how to import tasks from `tasks.md` into your Vibe Kanban project using the MCP server.

## Prerequisites

1. **Vibe Kanban MCP Server** - Already configured in `.kiro/settings/mcp.json`
2. **Python 3.8+** with required packages
3. **Project ID** from your Vibe Kanban project

## Installation

Create a virtual environment and install the MCP Python SDK:

```bash
python3 -m venv venv
./venv/bin/pip install mcp
```

Or use the provided wrapper script (automatically uses the venv):
```bash
./import_tasks.sh --list-projects
./import_tasks.sh --project-id YOUR_PROJECT_ID
```

## Method 1: Using the Python Script (Recommended)

### Step 1: List Your Projects

First, find your project ID:

```bash
./import_tasks.sh --list-projects
```

Or if you prefer to activate the venv manually:
```bash
source venv/bin/activate
python import_tasks_mcp.py --list-projects
```

This will output something like:
```
Available projects:
  ID: 123e4567-e89b-12d3-a456-426614174000
  Name: Tic-Tac-Toe Game
```

### Step 2: Import Tasks

Use the project ID to import tasks:

```bash
./import_tasks.sh --project-id YOUR_PROJECT_ID
```

Or with activated venv:
```bash
source venv/bin/activate
python import_tasks_mcp.py --project-id YOUR_PROJECT_ID
```

The script will:
1. Parse `tasks.md` 
2. Extract all tasks and subtasks
3. Create them in your Vibe Kanban project via MCP

## Method 2: Using an MCP Client (Claude Desktop, Raycast, etc.)

If you have an MCP client configured (like Claude Desktop), you can:

1. **List projects:**
   ```
   List all projects in Vibe Kanban
   ```

2. **Create tasks manually:**
   ```
   Create a task in project [PROJECT_ID] with title "1. Set up project structure and HTML foundation" and description "Create index.html with basic page structure..."
   ```

3. **Or use the generated JSON:**
   The script also generates `tasks_for_import.json` which you can reference when creating tasks.

## Method 3: Manual Task Creation via MCP Client

You can also ask your MCP client to:

1. List all projects
2. For each task in your `tasks.md`, create a task:
   ```
   Create a task in project [PROJECT_ID] with title "[TASK_TITLE]" and description "[TASK_DESCRIPTION]"
   ```

## Troubleshooting

### MCP SDK Not Found
```bash
pip install mcp
```

### Cannot Connect to MCP Server
- Make sure `uvx vibe-kanban-mcp-server` is accessible
- Check that the MCP server is running
- Verify your `.kiro/settings/mcp.json` configuration

### Project Not Found
- Use `--list-projects` to see all available projects
- Make sure you're using the correct project ID

## Task Structure

The script parses tasks in this format:
- Main tasks: `- [ ] 1. Task title`
- Subtasks: `  - [ ] 2.1 Subtask title`
- Descriptions: Lines following tasks (not starting with `-` or `_`)

All subtasks will be included in the main task's description.

## Example Output

```
Parsing tasks from tasks.md...

Found 6 main tasks:
  1. Set up project structure and HTML foundation
     (0 subtasks)
  2. Implement GameModel class with core game logic
     (5 subtasks)
  ...

Importing tasks to project 123e4567-e89b-12d3-a456-426614174000...
------------------------------------------------------------
✓ Created: 1. Set up project structure and HTML foundation
✓ Created: 2. Implement GameModel class with core game logic
...

✓ Import complete! 6 tasks created.
```

