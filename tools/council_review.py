#!/usr/bin/env python3
"""
AI Council Review - Multi-Agent Code Review System
Uses Anthropic Claude API directly for all agents.
"""

import os
import subprocess
import textwrap
import requests
import anthropic

# Claude Model - latest version
MODEL = "claude-sonnet-4-20250514"

def sh(cmd):
    return subprocess.check_output(cmd, text=True).strip()

def get_diff():
    """Get the PR diff."""
    try:
        sh(["git", "fetch", "origin", "main"])
        return sh(["git", "diff", "origin/main...HEAD"])
    except Exception:
        return sh(["git", "show", "--name-status", "-1"])

def ask(role: str, system_prompt: str, user_prompt: str) -> str:
    """Ask Claude with a specific role."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=f"Du bist ein {role}. {system_prompt} Antworte auf Deutsch.",
        messages=[{"role": "user", "content": user_prompt}]
    )

    return response.content[0].text.strip()

def post_comment(body: str):
    """Post comment to GitHub PR."""
    repo = os.environ["GITHUB_REPOSITORY"]
    pr = os.environ.get("PR_NUMBER")
    token = os.environ["GITHUB_TOKEN"]

    if not pr:
        print("No PR number found, skipping comment.")
        return

    url = f"https://api.github.com/repos/{repo}/issues/{pr}/comments"
    response = requests.post(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    }, json={"body": body})
    response.raise_for_status()
    print(f"Comment posted to PR #{pr}")

def main():
    diff = get_diff()[:12000]  # Limit diff size

    if not diff or len(diff) < 10:
        print("No significant changes found.")
        return

    prompt = textwrap.dedent(f"""
    Analysiere diese Code-Änderungen (PR Diff):

    ```diff
    {diff}
    ```

    Sei konkret und nenne spezifische Zeilen/Dateien wenn relevant.
    Halte deine Antwort unter 400 Wörtern.
    """)

    print("🏛️ AI Council Review startet...")

    # Agent 1: Architekt
    print("  📐 Architekt analysiert...")
    arch = ask(
        "Senior Software-Architekt",
        "Fokussiere auf Code-Struktur, Design Patterns, Wartbarkeit und SOLID-Prinzipien.",
        prompt
    )

    # Agent 2: Sicherheitsexperte
    print("  🔒 Sicherheitsexperte prüft...")
    sec = ask(
        "Sicherheitsexperte (OWASP-zertifiziert)",
        "Suche nach Sicherheitslücken: Injection, XSS, Auth-Probleme, sensible Daten.",
        prompt
    )

    # Agent 3: Bug-Hunter
    print("  🐛 Bug-Hunter sucht...")
    bugs = ask(
        "Bug-Analyst und Code-Reviewer",
        "Finde potenzielle Bugs, Edge Cases, Logik-Fehler, Race Conditions, Null-Checks.",
        prompt
    )

    # Agent 4: UX/Product
    print("  🎨 UX-Experte bewertet...")
    ux = ask(
        "UX/Product-Experte",
        "Bewerte Benutzerfreundlichkeit, Klarheit, Accessibility. Kontext: TrademarkIQ ist eine Markenregistrierungs-Plattform.",
        prompt
    )

    # Agent 5: Zusammenfassung
    print("  📝 Erstelle Zusammenfassung...")
    summary_prompt = f"""
    Fasse diese 4 Reviews zusammen und priorisiere die wichtigsten Punkte:

    ARCHITEKTUR:
    {arch[:600]}

    SICHERHEIT:
    {sec[:600]}

    BUGS:
    {bugs[:600]}

    UX:
    {ux[:600]}

    Erstelle eine priorisierte Liste:
    - P0 (Kritisch - muss vor Merge behoben werden)
    - P1 (Wichtig - sollte bald behoben werden)
    - P2 (Nice-to-have)

    Gib am Ende eine Gesamtbewertung: ✅ Gut / ⚠️ Überarbeiten / ❌ Blockiert
    """

    summary = ask(
        "Council-Vorsitzender",
        "Fasse die Reviews zusammen und priorisiere objektiv.",
        summary_prompt
    )

    # Build final report
    body = f"""# 🏛️ AI Council Review

## Zusammenfassung & Prioritäten
{summary}

---

<details>
<summary>📐 Architektur-Review</summary>

{arch}
</details>

<details>
<summary>🔒 Sicherheits-Review</summary>

{sec}
</details>

<details>
<summary>🐛 Bug-Analyse</summary>

{bugs}
</details>

<details>
<summary>🎨 UX/Product-Review</summary>

{ux}
</details>

---
> 🤖 *Review erstellt mit Claude ({MODEL})*
"""

    post_comment(body)
    print("✅ Council Review abgeschlossen!")

if __name__ == "__main__":
    main()
