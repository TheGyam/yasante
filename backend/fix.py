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
        
    top_imports = []
    new_lines = []
    
    for idx, line in enumerate(lines):
        # If it's a top-level import but it appears after line 15 (just a heuristic, or inside class/def)
        # Actually, let's just collect ALL unindented imports that don't start with '#' 
        # and move them to the top. Wait, some files have legitimate top-level imports scattered.
        # But if we just move ALL top-level imports to the top, it's perfectly fine!
        if re.match(r"^(from\s+\S+\s+import\s+.+|import\s+.+)$", line):
            top_imports.append(line.strip())
        else:
            new_lines.append(line)
            
    # Remove duplicates from top_imports
    top_imports = sorted(list(set(top_imports)))
    
    # Prepend to file
    final_lines = [imp + "\n" for imp in top_imports] + ["\n"] + new_lines
    
    with open(full_path, "w", encoding="utf-8") as f:
        f.writelines(final_lines)
        
    print(f"Fixed {file_path}")
