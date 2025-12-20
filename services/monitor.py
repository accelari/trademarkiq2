"""
24/7 Background Monitor for TrademarkIQ Agent System

This service runs continuously and:
1. Monitors the repository for changes
2. Runs periodic code analysis
3. Creates tasks for detected issues
4. Notifies about important findings
"""

import os
import sys
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.task_queue import TaskQueue, TaskType, TaskPriority


class RepositoryMonitor:
    """Monitors the repository for changes."""

    def __init__(self, repo_path: str = None):
        self.repo_path = Path(repo_path) if repo_path else Path(__file__).parent.parent
        self.last_commit = None
        self.last_check = None

    def get_current_commit(self) -> Optional[str]:
        """Get the current HEAD commit hash."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            return result.stdout.strip() if result.returncode == 0 else None
        except Exception:
            return None

    def get_changed_files(self, since_commit: str = None) -> list[str]:
        """Get files changed since a commit or in the last commit."""
        try:
            if since_commit:
                cmd = ["git", "diff", "--name-only", since_commit, "HEAD"]
            else:
                cmd = ["git", "diff", "--name-only", "HEAD~1", "HEAD"]

            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return [f for f in result.stdout.strip().split("\n") if f]
            return []
        except Exception:
            return []

    def check_for_changes(self) -> dict:
        """Check if there are new changes since last check."""
        current_commit = self.get_current_commit()

        if current_commit and current_commit != self.last_commit:
            changed_files = self.get_changed_files(self.last_commit)
            old_commit = self.last_commit
            self.last_commit = current_commit
            self.last_check = datetime.now()

            return {
                "has_changes": True,
                "old_commit": old_commit,
                "new_commit": current_commit,
                "changed_files": changed_files
            }

        self.last_check = datetime.now()
        return {"has_changes": False}


class BackgroundMonitor:
    """
    Main background monitoring service.

    Runs continuously and performs:
    - Repository change detection
    - Periodic security scans
    - Code quality checks
    - Task generation for issues
    """

    def __init__(self, check_interval: int = 300):
        """
        Initialize the monitor.

        Args:
            check_interval: Seconds between checks (default: 5 minutes)
        """
        self.check_interval = check_interval
        self.repo_monitor = RepositoryMonitor()
        self.task_queue = TaskQueue()
        self.running = False

        # Track last run times for periodic tasks
        self.last_security_scan = None
        self.last_quality_check = None

        # Intervals for periodic tasks (in seconds)
        self.security_scan_interval = 3600 * 6  # Every 6 hours
        self.quality_check_interval = 3600 * 12  # Every 12 hours

    def log(self, message: str):
        """Log a message with timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")

    def should_run_security_scan(self) -> bool:
        """Check if security scan is due."""
        if self.last_security_scan is None:
            return True
        elapsed = (datetime.now() - self.last_security_scan).total_seconds()
        return elapsed >= self.security_scan_interval

    def should_run_quality_check(self) -> bool:
        """Check if quality check is due."""
        if self.last_quality_check is None:
            return True
        elapsed = (datetime.now() - self.last_quality_check).total_seconds()
        return elapsed >= self.quality_check_interval

    def handle_repository_changes(self, changes: dict):
        """Handle detected repository changes."""
        changed_files = changes.get("changed_files", [])

        if not changed_files:
            return

        self.log(f"📁 {len(changed_files)} Dateien geändert")

        # Categorize changes
        ts_files = [f for f in changed_files if f.endswith(('.ts', '.tsx'))]
        py_files = [f for f in changed_files if f.endswith('.py')]
        config_files = [f for f in changed_files if f.endswith(('.json', '.yml', '.yaml', '.env'))]

        # Create review task for significant changes
        if len(changed_files) > 3:
            self.task_queue.add(
                title="Code Review für neue Änderungen",
                description=f"Review {len(changed_files)} geänderte Dateien:\n" + "\n".join(changed_files[:10]),
                task_type=TaskType.CODE_REVIEW,
                priority=TaskPriority.NORMAL,
                metadata={"commit": changes.get("new_commit"), "files": changed_files}
            )

        # Security check for sensitive files
        sensitive_patterns = ['auth', 'login', 'password', 'token', 'secret', 'api']
        sensitive_files = [
            f for f in changed_files
            if any(p in f.lower() for p in sensitive_patterns)
        ]

        if sensitive_files:
            self.task_queue.add(
                title="Security Review für sensitive Dateien",
                description=f"Sicherheitsrelevante Dateien wurden geändert:\n" + "\n".join(sensitive_files),
                task_type=TaskType.SECURITY_SCAN,
                priority=TaskPriority.HIGH,
                metadata={"files": sensitive_files}
            )

    def run_periodic_security_scan(self):
        """Run periodic security scan."""
        self.log("🔒 Starte Security Scan...")
        self.last_security_scan = datetime.now()

        # Create a security scan task
        self.task_queue.add(
            title="Periodischer Security Scan",
            description="Automatischer Sicherheits-Scan des gesamten Projekts",
            task_type=TaskType.SECURITY_SCAN,
            priority=TaskPriority.NORMAL,
            metadata={"type": "periodic", "triggered_at": datetime.now().isoformat()}
        )

    def run_periodic_quality_check(self):
        """Run periodic quality check."""
        self.log("📊 Starte Qualitäts-Check...")
        self.last_quality_check = datetime.now()

        # Create a quality check task
        self.task_queue.add(
            title="Periodischer Qualitäts-Check",
            description="Automatische Code-Qualitäts-Analyse",
            task_type=TaskType.CODE_REVIEW,
            priority=TaskPriority.LOW,
            metadata={"type": "periodic", "triggered_at": datetime.now().isoformat()}
        )

    def run_once(self):
        """Run one monitoring cycle."""
        self.log("🔄 Monitoring Zyklus...")

        # Check for repository changes
        changes = self.repo_monitor.check_for_changes()
        if changes.get("has_changes"):
            self.log(f"📝 Neue Commits erkannt: {changes.get('new_commit', '')[:8]}")
            self.handle_repository_changes(changes)

        # Run periodic tasks if due
        if self.should_run_security_scan():
            self.run_periodic_security_scan()

        if self.should_run_quality_check():
            self.run_periodic_quality_check()

        # Log queue status
        stats = self.task_queue.stats()
        if stats["pending"] > 0 or stats["waiting_approval"] > 0:
            self.log(f"📋 Queue: {stats['pending']} wartend, {stats['waiting_approval']} Genehmigung")

    def start(self):
        """Start the background monitor."""
        self.running = True
        self.log("🚀 Background Monitor gestartet")
        self.log(f"   Check-Intervall: {self.check_interval}s")
        self.log(f"   Security-Scan: alle {self.security_scan_interval // 3600}h")
        self.log(f"   Quality-Check: alle {self.quality_check_interval // 3600}h")

        # Initialize with current state
        self.repo_monitor.last_commit = self.repo_monitor.get_current_commit()

        try:
            while self.running:
                self.run_once()
                time.sleep(self.check_interval)
        except KeyboardInterrupt:
            self.log("⏹️ Monitor gestoppt (Keyboard Interrupt)")
        except Exception as e:
            self.log(f"❌ Fehler: {e}")
            raise

    def stop(self):
        """Stop the background monitor."""
        self.running = False
        self.log("⏹️ Monitor wird gestoppt...")


def main():
    """Main entry point for the background monitor."""
    # Check for API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("⚠️ ANTHROPIC_API_KEY nicht gesetzt. Einige Features deaktiviert.")

    # Get check interval from environment or use default
    interval = int(os.environ.get("MONITOR_INTERVAL", 300))

    monitor = BackgroundMonitor(check_interval=interval)
    monitor.start()


if __name__ == "__main__":
    main()
