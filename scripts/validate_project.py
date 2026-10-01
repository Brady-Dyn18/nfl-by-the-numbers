"""Validate data thresholds and required website elements before publishing."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    data_dir = ROOT / "data"
    panel = pd.read_csv(data_dir / "panel.csv")
    metadata = json.loads((data_dir / "metadata.json").read_text(encoding="utf-8"))
    report_stats = json.loads((data_dir / "report_stats.json").read_text(encoding="utf-8"))

    require(len(panel) >= 50_000, f"Panel has only {len(panel):,} rows")
    require(panel.shape[1] >= 8, f"Panel has only {panel.shape[1]} columns")
    require(panel["season"].nunique() >= 5, "Panel needs at least five time periods")
    require(panel["team"].nunique() >= 10, "Panel needs at least ten groups")
    require(panel["position"].nunique() >= 2, "Panel needs categorical position values")
    require(panel["team"].nunique() >= 2, "Panel needs categorical team values")
    numeric_columns = ["passing_yards", "rushing_yards", "receiving_yards", "def_tackles_solo", "def_sacks"]
    require(all(column in panel.columns for column in numeric_columns), "Missing numeric analysis fields")
    require(panel["win_loss"].isin(["W", "L", "T"]).all(), "Unexpected win/loss values")
    require(panel["game_id"].notna().all(), "Missing game IDs")
    require(panel[["season", "week", "team", "player_id"]].notna().all().all(), "Missing panel keys")
    require(metadata["rows"] == len(panel), "Metadata row count does not match panel")
    require(report_stats["overview"]["rows"] == len(panel), "Report row count does not match panel")

    for filename in ["index.html", "dashboard.html", "assets/styles.css", "assets/app.js", "assets/report.js", "README.md", "docs/rubric-checklist.md"]:
        require((ROOT / filename).exists(), f"Missing required file: {filename}")

    report_html = (ROOT / "index.html").read_text(encoding="utf-8")
    dashboard_html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
    require(report_html.count("class=\"report-section") >= 8, "Report needs at least eight finding sections")
    require(report_html.count("<canvas") >= 8, "Report needs a chart for each finding")
    require(dashboard_html.count("<canvas") >= 4, "Dashboard needs at least four charts")
    for required_id in ["seasonFilter", "teamFilter", "opponentFilter", "positionGroupFilter", "resetFilters", "summaryRows", "dataTableBody"]:
        require(required_id in dashboard_html, f"Dashboard missing {required_id}")

    print("Project validation passed.")
    print(json.dumps({"rows": len(panel), "columns": panel.shape[1], "seasons": sorted(panel["season"].unique().tolist()), "teams": panel["team"].nunique(), "players": panel["player_id"].nunique()}, indent=2))


if __name__ == "__main__":
    main()
