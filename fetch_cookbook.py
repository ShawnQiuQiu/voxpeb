import urllib.request
try:
    with urllib.request.urlopen("https://raw.githubusercontent.com/google-gemini/cookbook/main/gemini-2/live_api/live_api_starter.py") as response:
        content = response.read().decode('utf-8')
        for line in content.split("\n"):
            if "realtimeInput" in line or "realtime_input" in line or "audio" in line or "mediaChunks" in line:
                print(line)
except Exception as e:
    print(e)
