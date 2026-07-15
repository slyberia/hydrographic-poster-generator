import json

log_file = r"C:\Users\kyleg\.gemini\antigravity\brain\92ea24e5-873d-4cab-a65b-b43101e60182\.system_generated\logs\transcript.jsonl"

try:
    with open(log_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    for line in lines:
        step = json.loads(line)
        if step.get("type") == "USER_INPUT":
            content = step.get("content", "").lower()
            if "password" in content or "postgresql://" in content or "database_url" in content or "updated" in content:
                print(f"--- USER (Step {step.get('step_index')}) ---")
                print(step.get("content", ""))
                print("--------------------------------------------------\n")
except Exception as e:
    print(f"Error: {e}")
