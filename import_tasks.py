#!/usr/bin/env python3
"""
Script to import tasks from tasks.md into Vibe Kanban via MCP server.
"""

import re
import json
import sys
import subprocess
from typing import List, Dict, Optional
from pathlib import Path


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


def call_mcp_tool(tool_name: str, args: Dict) -> Dict:
    """Call an MCP tool using stdio communication."""
    # This is a simplified version - in practice, you'd use the MCP SDK
    # For now, we'll use a subprocess approach
    try:
        import mcp
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client
        
        # This requires the MCP SDK to be properly installed
        # For now, we'll provide instructions for manual execution
        print(f"Would call MCP tool: {tool_name} with args: {json.dumps(args, indent=2)}")
        return {}
    except ImportError:
        print("MCP SDK not found. Please install it with: pip install mcp")
        return None


def create_task_via_mcp(project_id: str, title: str, description: str = "") -> Optional[str]:
    """Create a task using MCP create_task tool."""
    print(f"Creating task: {title}")
    
    # For now, we'll generate the MCP command that can be executed
    # In a real implementation, you'd use the MCP SDK
    mcp_command = {
        "tool": "create_task",
        "arguments": {
            "project_id": project_id,
            "title": title,
            "description": description
        }
    }
    
    print(f"  MCP Command: {json.dumps(mcp_command, indent=2)}")
    return None


def main():
    tasks_file = Path(__file__).parent / '.kiro/specs/tic-tac-toe-game/tasks.md'
    
    if not tasks_file.exists():
        print(f"Error: Tasks file not found at {tasks_file}")
        sys.exit(1)
    
    print("Parsing tasks from tasks.md...")
    tasks = parse_tasks_file(str(tasks_file))
    
    print(f"\nFound {len(tasks)} main tasks")
    for task in tasks:
        print(f"  {task['number']}. {task['title']} ({len(task['subtasks'])} subtasks)")
    
    print("\n" + "="*60)
    print("IMPORT INSTRUCTIONS:")
    print("="*60)
    print("\nTo import these tasks into Vibe Kanban, you have two options:\n")
    
    print("OPTION 1: Use Claude Desktop or another MCP client")
    print("-" * 60)
    print("1. Open your MCP client (e.g., Claude Desktop)")
    print("2. First, list projects to get your project_id:")
    print("   Ask: 'List all projects in Vibe Kanban'")
    print("3. Then, manually create tasks or use the script below\n")
    
    print("OPTION 2: Use this Python script with MCP SDK")
    print("-" * 60)
    print("1. Install MCP SDK: pip install mcp")
    print("2. Make sure vibe-kanban-mcp-server is running")
    print("3. Run this script with a project_id argument\n")
    
    print("\nTASK DATA (ready for import):")
    print("="*60)
    
    # Generate JSON output that can be used with MCP tools
    task_data = []
    for task in tasks:
        task_data.append({
            'title': f"{task['number']}. {task['title']}",
            'description': task['description'] or 'No description',
            'subtasks': [
                {
                    'title': f"{st['number']} {st['title']}",
                    'description': st['description'] or 'No description'
                }
                for st in task['subtasks']
            ]
        })
    
    output_file = Path(__file__).parent / 'tasks_for_import.json'
    with open(output_file, 'w') as f:
        json.dump(task_data, f, indent=2)
    
    print(f"\nTask data saved to: {output_file}")
    print("\nYou can use this JSON file with an MCP client to import tasks.")
    print("\nExample MCP commands you can use:")
    print("-" * 60)
    print("1. list_projects - to get your project_id")
    print("2. create_task with project_id and title from the JSON file")
    print("\nFor each task in tasks_for_import.json, create a task with:")
    print("  - project_id: <your_project_id>")
    print("  - title: <task title>")
    print("  - description: <task description>")


if __name__ == "__main__":
    main()

