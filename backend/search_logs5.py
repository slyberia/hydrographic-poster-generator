import json
import re
import sys

log_file = r"C:\Users\kyleg\.gemini\antigravity\brain\92ea24e5-873d-4cab-a65b-b43101e60182\.system_generated\logs\transcript.jsonl"
out_file = r"C:\Users\kyleg\.gemini\antigravity\brain\92ea24e5-873d-4cab-a65b-b43101e60182\scratch\user_inputs.txt"

try:
    with open(log_file, "r", encoding="utf-8") as f, open(out_file, "w", encoding="utf-8") as out:
        lines = f.readlines()
        
        for line in lines:
            step = json.loads(line)
            if step.get("type") == "USER_INPUT":
                content = step.get("content", "")
                if "The issues with the deployed application persist" in content:
                    continue
                
                out.write(f"--- USER (Step {step.get('step_index', '??')}) ---\n")
                out.write(content + "\n")
                out.write("--------------------------------------------------\n\n")
    print("Done writing to user_inputs.txt")
except Exception as e:
    print(f"Error: {e}")
