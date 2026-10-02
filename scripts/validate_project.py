"""Validate data thresholds and required website elements before publishing."""

from __future__ import annotations

import json
import gzip
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
    numeric_columns = [
        "passing_yards",
        "rushing_yards",
        "receiving_yards",
        "def_tackles_solo",
        "def_sacks",
        "offense_snaps",
        "st_snaps",
        "fg_att",
        "fg_long",
        "pt_att",
        "pt_long",
    ]
    require(all(column in panel.columns for column in numeric_columns), "Missing numeric analysis fields")
    require(panel["win_loss"].isin(["W", "L", "T"]).all(), "Unexpected win/loss values")
    require(panel["game_id"].notna().all(), "Missing game IDs")
    require(panel[["season", "week", "team", "player_id"]].notna().all().all(), "Missing panel keys")
    require(metadata["rows"] == len(panel), "Metadata row count does not match panel")
    require(report_stats["overview"]["rows"] == len(panel), "Report row count does not match panel")
    require((data_dir / "panel.csv.gz").exists(), "Missing compressed dashboard panel")
    with gzip.open(data_dir / "panel.csv.gz", "rt", encoding="utf-8") as compressed_panel:
        require(compressed_panel.readline().startswith("season,week,game_date"), "Compressed panel header is invalid")
    require((data_dir / "highlights.json.gz").exists(), "Missing compressed play-by-play highlights")
    with gzip.open(data_dir / "highlights.json.gz", "rt", encoding="utf-8") as compressed_highlights:
        highlights = json.load(compressed_highlights)
    require(len(highlights) >= 10_000, "Highlight index needs game-specific play-by-play events")
    require({"game_id", "player_id", "event", "description", "yards_gained"}.issubset(highlights[0]), "Highlight records are missing play fields")

    for filename in ["index.html", "dashboard.html", "assets/styles.css", "assets/app.js", "assets/report.js", "README.md", "docs/rubric-checklist.md", "docs/data-dictionary.md", "scripts/build_highlights.py"]:
        require((ROOT / filename).exists(), f"Missing required file: {filename}")

    report_html = (ROOT / "index.html").read_text(encoding="utf-8")
    dashboard_html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
    require(report_html.count("class=\"report-section") >= 8, "Report needs at least eight finding sections")
    require(report_html.count("<canvas") >= 8, "Report needs a chart for each finding")
    require(dashboard_html.count("<canvas") >= 4, "Dashboard needs at least four charts")
    for required_id in ["main-content", "seasonFilter", "teamFilter", "opponentFilter", "positionGroupFilter", "positionFilter", "playerFilter", "filterSearch", "activeFilters", "resetFilters", "downloadFiltered", "summaryValue1", "summaryValue4", "teamSnapshot", "matchupSummary", "playerDuel", "duelPrimaryPlayer", "duelOpponentPlayer", "duelChart", "duelTrendChart", "downloadFilteredTable", "dataTableBody"]:
        require(required_id in dashboard_html, f"Dashboard missing {required_id}")
    require("project-brief" in report_html and "insight-title" in report_html and "main-content" in report_html, "Report is missing the project framing and key findings")
    require("panel.csv.gz" in (ROOT / "assets/app.js").read_text(encoding="utf-8"), "Dashboard must prefer the compressed panel")
    app_js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
    require("updatePlayerDuel" in app_js and "duelTrendChart" in dashboard_html, "Dashboard must render the role-specific player duel and season trend")
    require("fg_att" in app_js and "offense_snaps" in app_js, "Dashboard must include specialist and workload metrics")
    require("choosePreferredView" in app_js and "downloadFilteredCsv" in app_js and "updateTeamSnapshot" in app_js, "Dashboard must include defaults, export, and team-season context")

    print("Project validation passed.")
    print(json.dumps({"rows": len(panel), "columns": panel.shape[1], "seasons": sorted(panel["season"].unique().tolist()), "teams": panel["team"].nunique(), "players": panel["player_id"].nunique()}, indent=2))


if __name__ == "__main__":
    main()
