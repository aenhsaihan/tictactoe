#!/usr/bin/env python3
"""
Script to import tasks from tasks.md into Vibe Kanban via MCP server.
This script uses the MCP SDK to communicate with the vibe-kanban-mcp-server.
"""

import re
import json
import sys
import asyncio
from typing import List, Dict, Optional
from pathlib import Path
import os


def load_mcp_config(config_path: Optional[str] = None) -> Dict:
    """Load MCP server configuration from mcp.json file."""
    if config_path is None:
        # Try to find mcp.json in common locations
        current_dir = Path(__file__).parent
        possible_paths = [
            current_dir / '.kiro' / 'settings' / 'mcp.json',
            current_dir / 'mcp.json',
            Path.home() / '.config' / 'vibe-kanban' / 'mcp.json'
        ]
        
        for path in possible_paths:
            if path.exists():
                config_path = str(path)
                break
    
    if config_path and Path(config_path).exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
            # Get vibe-kanban server config
            vibe_kanban_config = config.get('mcpServers', {}).get('vibe_kanban') or \
                                config.get('mcpServers', {}).get('vibe-kanban')
            if vibe_kanban_config:
                return {
                    'command': vibe_kanban_config.get('command', 'npx'),
                    'args': vibe_kanban_config.get('args', ['-y', 'vibe-kanban@latest', '--mcp']),
                    'env': vibe_kanban_config.get('env', {})
                }
    
    # Default configuration based on documentation
    return {
        'command': 'npx',
        'args': ['-y', 'vibe-kanban@latest', '--mcp'],
        'env': {}
    }


def parse_tasks_file(file_path: str) -> List[Dict]:
    """Parse the tasks.md file and extract task hierarchy."""
    tasks = []
    with open(file_path, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    current_main_task = None
    current_subtask = None
    
    for line in lines:
        # Skip empty lines and headers
        if not line.strip() or line.strip().startswith('#'):
            continue
            
        # Main task: - [ ] 1. Task title
        main_task_match = re.match(r'^- \[ \] (\d+)\.\s+(.+)$', line)
        if main_task_match:
            task_num = main_task_match.group(1)
            title = main_task_match.group(2).strip()
            current_main_task = {
                'number': task_num,
                'title': title,
                'description': '',
                'subtasks': [],
                'level': 'main'
            }
            tasks.append(current_main_task)
            current_subtask = None
            continue
        
        # Subtask: - [ ] 2.1 Task title (indented with 2 spaces)
        subtask_match = re.match(r'^  - \[ \] (\d+\.\d+)\s+(.+)$', line)
        if subtask_match and current_main_task:
            task_num = subtask_match.group(1)
            title = subtask_match.group(2).strip()
            current_subtask = {
                'number': task_num,
                'title': title,
                'description': '',
                'level': 'subtask',
                'parent': current_main_task['number']
            }
            current_main_task['subtasks'].append(current_subtask)
            continue
        
        # Description bullet for main task: "  - Description" (2 spaces, not a checkbox)
        main_desc_match = re.match(r'^  - (?!\[ \])(.+)$', line)
        if main_desc_match and current_main_task and not current_subtask:
            desc_line = main_desc_match.group(1).strip()
            # Skip requirement lines (they start with underscore)
            if not desc_line.startswith('_'):
                if current_main_task['description']:
                    current_main_task['description'] += '\n' + desc_line
                else:
                    current_main_task['description'] = desc_line
            continue
        
        # Description bullet for subtask: "    - Description" (4 spaces, not a checkbox)
        subtask_desc_match = re.match(r'^    - (?!\[ \])(.+)$', line)
        if subtask_desc_match and current_subtask:
            desc_line = subtask_desc_match.group(1).strip()
            # Skip requirement lines
            if not desc_line.startswith('_'):
                if current_subtask['description']:
                    current_subtask['description'] += '\n' + desc_line
                else:
                    current_subtask['description'] = desc_line
            continue
    
    return tasks


async def import_tasks_to_vibe_kanban(project_id: str, tasks: List[Dict], mcp_config: Optional[Dict] = None):
    """Import tasks to Vibe Kanban using MCP."""
    try:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
        
        if mcp_config is None:
            mcp_config = load_mcp_config()
        
        # Configure the MCP server connection
        server_params = StdioServerParameters(
            command=mcp_config['command'],
            args=mcp_config['args'],
            env=mcp_config.get('env', {})
        )
        
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Initialize the session
                await session.initialize()
                
                created_tasks = []
                parent_task_map = {}  # Map main task numbers to created task IDs
                
                # First, create all main tasks
                for task in tasks:
                    title = f"{task['number']}. {task['title']}"
                    description = task['description'] or ''
                    
                    # Combine description with subtask list if any
                    if task['subtasks']:
                        if description:
                            description += '\n\nSubtasks:'
                        else:
                            description = 'Subtasks:'
                        for subtask in task['subtasks']:
                            description += f"\n- {subtask['number']} {subtask['title']}"
                            if subtask['description']:
                                description += f": {subtask['description']}"
                    
                    result = await session.call_tool(
                        "create_task",
                        {
                            "project_id": project_id,
                            "title": title,
                            "description": description
                        }
                    )
                    
                    if result.isError:
                        print(f"Error creating task {title}: {result.content}")
                    else:
                        task_id = result.content[0].text if result.content else None
                        parent_task_map[task['number']] = task_id
                        created_tasks.append((title, task_id))
                        print(f"✓ Created: {title}")
                
                print(f"\nSuccessfully imported {len(created_tasks)} tasks!")
                return created_tasks
                
    except ImportError:
        print("Error: MCP SDK not found.")
        print("Install it with: pip install mcp")
        return None
    except Exception as e:
        print(f"Error connecting to MCP server: {e}")
        print("\nMake sure:")
        print("1. Node.js and npx are installed")
        print("2. The MCP server command is correct in .kiro/settings/mcp.json")
        print("3. The MCP server is accessible")
        return None


async def list_projects(mcp_config: Optional[Dict] = None):
    """List all projects to get project IDs."""
    try:
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
        
        if mcp_config is None:
            mcp_config = load_mcp_config()
        
        server_params = StdioServerParameters(
            command=mcp_config['command'],
            args=mcp_config['args'],
            env=mcp_config.get('env', {})
        )
        
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                result = await session.call_tool("list_projects", {})
                
                if result.isError:
                    print(f"Error listing projects: {result.content}")
                    return None
                
                if result.content:
                    # Parse the JSON response
                    response_text = result.content[0].text
                    try:
                        response_data = json.loads(response_text)
                        # The response might be wrapped in a 'projects' key
                        if isinstance(response_data, dict) and 'projects' in response_data:
                            return response_data['projects']
                        elif isinstance(response_data, list):
                            return response_data
                        else:
                            return [response_data] if response_data else []
                    except json.JSONDecodeError:
                        print(f"Error parsing JSON response: {response_text}")
                        return None
                
                return []
                
    except Exception as e:
        print(f"Error listing projects: {e}")
        return None


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Import tasks from tasks.md into Vibe Kanban via MCP'
    )
    parser.add_argument(
        '--project-id',
        help='Vibe Kanban project ID (use --list-projects to find it)'
    )
    parser.add_argument(
        '--list-projects',
        action='store_true',
        help='List all available projects and exit'
    )
    parser.add_argument(
        '--tasks-file',
        default='.kiro/specs/tic-tac-toe-game/tasks.md',
        help='Path to tasks.md file'
    )
    
    args = parser.parse_args()
    
    tasks_file = Path(args.tasks_file)
    if not tasks_file.is_absolute():
        tasks_file = Path(__file__).parent / tasks_file
    
    if args.list_projects:
        print("Listing projects...")
        mcp_config = load_mcp_config()
        print(f"Using MCP server: {mcp_config['command']} {' '.join(mcp_config['args'])}")
        projects = asyncio.run(list_projects(mcp_config))
        if projects:
            print("\nAvailable projects:")
            for project in projects:
                print(f"  ID: {project.get('id', 'N/A')}")
                print(f"  Name: {project.get('name', 'N/A')}")
                print()
        return
    
    if not args.project_id:
        print("Error: --project-id is required")
        print("Use --list-projects to find your project ID")
        return
    
    if not tasks_file.exists():
        print(f"Error: Tasks file not found at {tasks_file}")
        return
    
    print("Parsing tasks from tasks.md...")
    tasks = parse_tasks_file(str(tasks_file))
    
    print(f"\nFound {len(tasks)} main tasks:")
    for task in tasks:
        print(f"  {task['number']}. {task['title']}")
        if task['subtasks']:
            print(f"     ({len(task['subtasks'])} subtasks)")
    
    # Load MCP config
    mcp_config = load_mcp_config()
    print(f"Using MCP server: {mcp_config['command']} {' '.join(mcp_config['args'])}")
    
    print(f"\nImporting tasks to project {args.project_id}...")
    print("-" * 60)
    
    result = asyncio.run(import_tasks_to_vibe_kanban(args.project_id, tasks, mcp_config))
    
    if result:
        print(f"\n✓ Import complete! {len(result)} tasks created.")


if __name__ == "__main__":
    main()

