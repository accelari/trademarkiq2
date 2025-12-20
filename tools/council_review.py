import os, subprocess, textwrap, requests
from openai import OpenAI

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MAX_DIFF = 15000

def sh(cmd):
    return subprocess.check_output(cmd, text=True).strip()

def get_diff():
    try:
        sh(["git", "fetch", "origin", "main"])
        return sh(["git", "diff", "origin/main...HEAD"])
    except Exception:
        return sh(["git", "show", "--name-status", "-1"])


def client():
    return OpenAI(
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": f"https://github.com/{os.environ.get('GITHUB_REPOSITORY','')}",
            "X-Title": "AI Council Review"
        }
    )

def ask(model, system, user):
    c = client()
    r = c.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[{"role":"system","content":system},{"role":"user","content":user}]
    )
    return r.choices[0].message.content.strip()

def post_comment(body):
    repo = os.environ["GITHUB_REPOSITORY"]
    pr = os.environ.get("PR_NUMBER")
    token = os.environ["GITHUB_TOKEN"]
    if not pr: return
    url = f"https://api.github.com/repos/{repo}/issues/{pr}/comments"
    requests.post(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }, json={"body": body}).raise_for_status()

def main():
    diff = get_diff()[:MAX_DIFF]
    prompt = textwrap.dedent(f"""
    Review this PR diff. Do NOT change code. Be concrete.
    Priorities: Security > Correctness > Tests > Maintainability > UX.

    Diff:
    ```diff
    {diff}
    ```
    """)

    arch = ask("anthropic/claude-3.5-sonnet",
               "Senior architect. Focus on design & maintainability.", prompt)
    sec = ask("anthropic/claude-3.5-sonnet",
              "Security reviewer (OWASP). Find risks.", prompt)
    bugs = ask("deepseek/deepseek-chat",
               "Bug hunter. Find edge cases & logic issues.", prompt)
    ux = ask("google/gemini-flash-1.5",
             "UX/Product reviewer. Clarity & user impact.", prompt)

    summary = ask("google/gemini-flash-1.5",
                  "Chair. Summarize and prioritize P0/P1/P2.",
                  f"ARCH:\n{arch}\n\nSEC:\n{sec}\n\nBUGS:\n{bugs}\n\nUX:\n{ux}")

    body = f"""🤖 **AI Council Review**

**Summary (P0/P1/P2):**
{summary}

<details><summary>Details</summary>

### Architecture
{arch}

### Security
{sec}

### Bugs / Edge cases
{bugs}

### UX / Product
{ux}

</details>
"""
    post_comment(body)

if __name__ == "__main__":
    main()
