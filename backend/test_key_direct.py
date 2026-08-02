"""Test the API key directly against Anthropic — bypasses our app entirely.
This is the definitive test: if THIS fails with 401, the key itself is bad."""
import httpx

# Read key from .env directly
with open('.env', 'r') as f:
    key = None
    for line in f:
        if line.strip().startswith('ANTHROPIC_API_KEY'):
            key = line.strip().split('=', 1)[1].strip()
            break

if not key:
    print("❌ Could not read key from .env")
else:
    print(f"Testing key ending in: ...{key[-6:]}\n")
    
    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 20,
            "messages": [{"role": "user", "content": "Say hello"}]
        },
        timeout=15
    )
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code == 200:
        print("\n✅ KEY IS VALID — works perfectly!")
    elif response.status_code == 401:
        print("\n❌ KEY IS INVALID/REVOKED — confirmed by direct test")
        print("Action needed: generate a fresh key at console.anthropic.com")
    else:
        print(f"\n⚠️ Unexpected status — see response above")
