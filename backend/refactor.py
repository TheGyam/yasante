import os
import re

FILES = [
    "config/settings/base.py",
    "apps/stylists/views.py",
    "apps/stylists/slots.py",
    "apps/shelf/views.py",
    "apps/profiles/views.py",
    "apps/profiles/tasks.py",
    "apps/planner/views.py",
    "apps/content/views.py",
    "apps/looks/views.py",
    "apps/bookings/views.py",
    "apps/bookings/tasks.py",
    "apps/bookings/serializers.py",
    "apps/common/pagination.py",
]

for file_path in FILES:
    full_path = os.path.join(r"c:\Users\yawop\Downloads\Coding\Kalon\backend", file_path)
    if not os.path.exists(full_path):
        continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    new_lines = []
    imports_to_hoist = []
    
    for line in lines:
        if re.match(r"^\s+(from\s+\S+\s+import\s+.+|import\s+.+)$", line):
            # This is an indented import
            clean_import = line.strip()
            imports_to_hoist.append(clean_import)
            continue
        new_lines.append(line)
        
    if imports_to_hoist:
        # Find the end of the module docstring or top-level imports to inject the hoisted ones
        # For simplicity, we just inject after the first line (or after docstring)
        # Actually, let's just insert them at line 2 (after the first line or docstring)
        inject_idx = 0
        for idx, line in enumerate(new_lines):
            if not line.startswith('"""') and not line.startswith("'''") and not line.startswith("#"):
                # If there's a docstring at the top, skip over it
                if '"""' in new_lines[0] and idx > 0 and '"""' in line:
                    inject_idx = idx + 1
                    break
        
        if inject_idx == 0:
            if new_lines and '"""' in new_lines[0]:
                for idx, line in enumerate(new_lines[1:], 1):
                    if '"""' in line:
                        inject_idx = idx + 1
                        break
        
        # Deduplicate
        unique_imports = sorted(list(set(imports_to_hoist)))
        
        for imp in reversed(unique_imports):
            new_lines.insert(inject_idx, imp + "\n")
            
        with open(full_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print(f"Refactored {file_path}")
