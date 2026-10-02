"""Download nflverse data and build the compact five-season website panel."""

from __future__ import annotations

import json
import gzip
from datetime import datetime, timezone
from pathlib import Path

import nflreadpy as nfl
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SEASONS = list(range(2021, 2026))


def as_pandas(frame) -> pd.DataFrame:
    """Convert nflreadpy's Polars frame to pandas."""
    return frame.to_pandas() if hasattr(frame, "to_pandas") else frame


def clean_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0)


def build_team_games(schedules: pd.DataFrame) -> pd.DataFrame:
    schedules = schedules.loc[schedules["game_type"].eq("REG")].copy()
    schedules["game_date"] = pd.to_datetime(schedules["gameday"], errors="coerce").dt.strftime("%Y-%m-%d")

    away = schedules[
        [
            "game_id",
            "season",
            "week",
            "game_date",
            "location",
            "away_team",
            "away_score",
            "home_team",
            "home_score",
        ]
    ].copy()
    away = away.rename(
        columns={
            "away_team": "team",
            "home_team": "opponent_team",
            "away_score": "team_score",
            "home_score": "opponent_score",
        }
    )
    away["home_away"] = "Away"

    home = schedules[
        [
            "game_id",
            "season",
            "week",
            "game_date",
            "location",
            "home_team",
            "home_score",
            "away_team",
            "away_score",
        ]
    ].copy()
    home = home.rename(
        columns={
            "home_team": "team",
            "away_team": "opponent_team",
            "home_score": "team_score",
            "away_score": "opponent_score",
        }
    )
    home["home_away"] = "Home"

    team_games = pd.concat([away, home], ignore_index=True)
    team_games["team_score"] = clean_number(team_games["team_score"])
    team_games["opponent_score"] = clean_number(team_games["opponent_score"])
    team_games["point_differential"] = team_games["team_score"] - team_games["opponent_score"]
    team_games["win_loss"] = team_games.apply(
        lambda row: "W" if row["point_differential"] > 0 else ("L" if row["point_differential"] < 0 else "T"),
        axis=1,
    )
    return team_games


def build_report_stats(panel: pd.DataFrame) -> dict:
    numeric = [
        "passing_yards",
        "rushing_yards",
        "receiving_yards",
        "passing_tds",
        "rushing_tds",
        "receiving_tds",
        "passing_epa",
        "rushing_epa",
        "receiving_epa",
        "def_tackles_solo",
        "def_sacks",
        "def_interceptions",
        "def_pass_defended",
        "fantasy_points",
    ]
    for column in numeric:
        panel[column] = clean_number(panel[column])

    team_games = panel.drop_duplicates(["game_id", "team"])
    team_summary = (
        team_games.groupby("team", as_index=False)
        .agg(
            games=("game_id", "nunique"),
            wins=("win_loss", lambda s: (s == "W").sum()),
            losses=("win_loss", lambda s: (s == "L").sum()),
            ties=("win_loss", lambda s: (s == "T").sum()),
            points_for=("team_score", "sum"),
            points_against=("opponent_score", "sum"),
        )
    )
    team_summary["win_rate"] = team_summary["wins"] / team_summary["games"]
    team_summary["points_per_game"] = team_summary["points_for"] / team_summary["games"]
    team_summary["points_allowed_per_game"] = team_summary["points_against"] / team_summary["games"]

    team_season = (
        panel.groupby(["season", "team"], as_index=False)
        .agg(
            passing_yards=("passing_yards", "sum"),
            rushing_yards=("rushing_yards", "sum"),
            passing_tds=("passing_tds", "sum"),
            rushing_tds=("rushing_tds", "sum"),
            passing_interceptions=("passing_interceptions", "sum"),
            def_sacks=("def_sacks", "sum"),
            def_interceptions=("def_interceptions", "sum"),
        )
    )
    team_season_results = (
        team_games.groupby(["season", "team"], as_index=False)
        .agg(
            games=("game_id", "nunique"),
            wins=("win_loss", lambda s: (s == "W").sum()),
            points_for=("team_score", "sum"),
            points_against=("opponent_score", "sum"),
        )
    )
    team_season = team_season_results.merge(team_season, on=["season", "team"], how="left")
    team_season["win_rate"] = team_season["wins"] / team_season["games"]
    team_season["offensive_yards"] = team_season["passing_yards"] + team_season["rushing_yards"]
    team_season["offensive_tds"] = team_season["passing_tds"] + team_season["rushing_tds"]
    team_season["points_per_game"] = team_season["points_for"] / team_season["games"]
    team_season["offensive_yards_per_game"] = team_season["offensive_yards"] / team_season["games"]
    team_season["passing_yards_per_game"] = team_season["passing_yards"] / team_season["games"]
    team_season["rushing_yards_per_game"] = team_season["rushing_yards"] / team_season["games"]
    team_season["offensive_interceptions_per_game"] = team_season["passing_interceptions"] / team_season["games"]
    team_season["defensive_takeaways_pressure"] = team_season["def_sacks"] + team_season["def_interceptions"]
    team_season["takeaway_margin"] = team_season["def_interceptions"] - team_season["passing_interceptions"]

    position = (
        panel.groupby("position_group", as_index=False)
        .agg(
            player_games=("player_id", "size"),
            players=("player_id", "nunique"),
            passing_yards=("passing_yards", "sum"),
            rushing_yards=("rushing_yards", "sum"),
            receiving_yards=("receiving_yards", "sum"),
            def_tackles=("def_tackles_solo", "sum"),
            def_sacks=("def_sacks", "sum"),
        )
    )
    position["production_yards"] = (
        position["passing_yards"] + position["rushing_yards"] + position["receiving_yards"]
    )

    player_season = (
        panel.groupby(
            [
                "season",
                "player_id",
                "player_display_name",
                "position",
                "position_group",
                "team",
                "headshot_url",
            ],
            as_index=False,
        )
        .agg(
            games=("game_id", "nunique"),
            wins=("win_loss", lambda s: (s == "W").sum()),
            offense_snaps=("offense_snaps", "sum"),
            offense_pct=("offense_pct", "mean"),
            defense_snaps=("defense_snaps", "sum"),
            defense_pct=("defense_pct", "mean"),
            st_snaps=("st_snaps", "sum"),
            st_pct=("st_pct", "mean"),
            completions=("completions", "sum"),
            attempts=("attempts", "sum"),
            passing_yards=("passing_yards", "sum"),
            passing_tds=("passing_tds", "sum"),
            passing_interceptions=("passing_interceptions", "sum"),
            passing_epa=("passing_epa", "sum"),
            carries=("carries", "sum"),
            rushing_yards=("rushing_yards", "sum"),
            rushing_tds=("rushing_tds", "sum"),
            rushing_epa=("rushing_epa", "sum"),
            receptions=("receptions", "sum"),
            targets=("targets", "sum"),
            receiving_yards=("receiving_yards", "sum"),
            receiving_tds=("receiving_tds", "sum"),
            receiving_epa=("receiving_epa", "sum"),
            def_tackles=("def_tackles_solo", "sum"),
            def_sacks=("def_sacks", "sum"),
            def_interceptions=("def_interceptions", "sum"),
            def_pass_defended=("def_pass_defended", "sum"),
            def_qb_hits=("def_qb_hits", "sum"),
            def_tackles_for_loss=("def_tackles_for_loss", "sum"),
            fg_made=("fg_made", "sum"),
            fg_att=("fg_att", "sum"),
            fg_long=("fg_long", "max"),
            pat_made=("pat_made", "sum"),
            pat_att=("pat_att", "sum"),
            pt_att=("pt_att", "sum"),
            pt_long=("pt_long", "max"),
            pt_yards=("pt_yards", "sum"),
            pt_inside_20=("pt_inside_20", "sum"),
            fantasy_points=("fantasy_points", "sum"),
        )
    )
    player_season["win_rate"] = player_season["wins"] / player_season["games"].replace(0, pd.NA)
    player_season["fg_pct"] = player_season["fg_made"] / player_season["fg_att"].replace(0, pd.NA)
    player_season["pat_pct"] = player_season["pat_made"] / player_season["pat_att"].replace(0, pd.NA)
    player_season["total_yards"] = (
        player_season["passing_yards"]
        + player_season["rushing_yards"]
        + player_season["receiving_yards"]
    )
    player_season["total_tds"] = (
        player_season["passing_tds"]
        + player_season["rushing_tds"]
        + player_season["receiving_tds"]
    )
    player_season = player_season.fillna(0)

    quarterbacks = panel.loc[panel["position_group"].eq("QB")].copy()
    qb = (
        quarterbacks.groupby(["player_id", "player_display_name"], as_index=False)
        .agg(
            games=("game_id", "nunique"),
            attempts=("attempts", "sum"),
            passing_yards=("passing_yards", "sum"),
            passing_tds=("passing_tds", "sum"),
            passing_epa=("passing_epa", "sum"),
            wins=("win_loss", lambda s: (s == "W").sum()),
        )
    )
    qb = qb.loc[qb["attempts"].ge(100)].copy()
    qb["epa_per_attempt"] = qb["passing_epa"] / qb["attempts"].replace(0, pd.NA)
    qb["win_rate"] = qb["wins"] / qb["games"].replace(0, pd.NA)
    qb = qb.dropna(subset=["epa_per_attempt"])

    rushing_passing = team_season.copy()
    rushing_passing["passing_share"] = rushing_passing["passing_yards"] / rushing_passing["offensive_yards"].replace(0, pd.NA)
    rushing_passing = rushing_passing.dropna(subset=["passing_share"])

    home_away = (
        team_games.groupby("home_away", as_index=False)
        .agg(
            games=("game_id", "nunique"),
            wins=("win_loss", lambda s: (s == "W").sum()),
            points_for=("team_score", "sum"),
            points_against=("opponent_score", "sum"),
        )
    )
    home_away["win_rate"] = home_away["wins"] / home_away["games"]
    home_away["points_for_per_game"] = home_away["points_for"] / home_away["games"]
    home_away["points_against_per_game"] = home_away["points_against"] / home_away["games"]
    home_away["point_differential_per_game"] = (
        home_away["points_for"] - home_away["points_against"]
    ) / home_away["games"]

    seasons = (
        team_games.groupby("season", as_index=False)
        .agg(
            games=("game_id", "nunique"),
            team_games=("team", "size"),
            points_for=("team_score", "sum"),
            points_against=("opponent_score", "sum"),
        )
    )
    seasons["points_per_team_game"] = seasons["points_for"] / seasons["team_games"]

    season_balance = (
        team_season.groupby("season", as_index=False)
        .agg(
            team_games=("games", "sum"),
            passing_yards=("passing_yards", "sum"),
            rushing_yards=("rushing_yards", "sum"),
            offensive_yards=("offensive_yards", "sum"),
        )
    )
    season_balance["passing_yards_per_team_game"] = season_balance["passing_yards"] / season_balance["team_games"]
    season_balance["rushing_yards_per_team_game"] = season_balance["rushing_yards"] / season_balance["team_games"]
    season_balance["offensive_yards_per_team_game"] = season_balance["offensive_yards"] / season_balance["team_games"]
    season_balance["passing_share"] = season_balance["passing_yards"] / season_balance["offensive_yards"].replace(0, pd.NA)

    turnover_success = team_season.copy()
    turnover_success["offensive_interceptions_per_game"] = turnover_success["passing_interceptions"] / turnover_success["games"]
    turnover_success["takeaways_per_game"] = turnover_success["def_interceptions"] / turnover_success["games"]
    turnover_success["offensive_tds_per_game"] = turnover_success["offensive_tds"] / turnover_success["games"]

    def records(frame: pd.DataFrame, columns: list[str], n: int = 10) -> list[dict]:
        return json.loads(frame[columns].head(n).to_json(orient="records"))

    team_by_wins = team_summary.sort_values(["win_rate", "wins"], ascending=False)
    offense_by_yards = team_season.sort_values("offensive_yards", ascending=False)
    defense_by_pressure = team_season.sort_values("defensive_takeaways_pressure", ascending=False)
    position_by_production = position.sort_values("production_yards", ascending=False)
    qb_by_epa = qb.sort_values(["epa_per_attempt", "passing_yards"], ascending=False)
    pass_share = rushing_passing.groupby("team", as_index=False).agg(passing_share=("passing_share", "mean"))
    pass_share = pass_share.sort_values("passing_share", ascending=False)

    return {
        "overview": {
            "rows": int(len(panel)),
            "games": int(team_games["game_id"].nunique()),
            "teams": int(panel["team"].nunique()),
            "players": int(panel["player_id"].nunique()),
            "seasons": int(panel["season"].nunique()),
            "positions": int(panel["position_group"].nunique()),
            "total_points": int(team_games["team_score"].sum()),
            "win_rows": int((team_games["win_loss"] == "W").sum()),
        },
        "team_win_rate": records(team_by_wins, ["team", "games", "wins", "losses", "win_rate"]),
        "team_offense": records(offense_by_yards, ["season", "team", "games", "wins", "win_rate", "passing_yards", "rushing_yards", "offensive_yards", "offensive_tds", "points_per_game", "offensive_yards_per_game", "offensive_interceptions_per_game"], 160),
        "team_defense": records(defense_by_pressure, ["season", "team", "games", "wins", "win_rate", "def_sacks", "def_interceptions", "defensive_takeaways_pressure"], 160),
        "position_production": records(position_by_production, ["position_group", "players", "player_games", "passing_yards", "rushing_yards", "receiving_yards", "production_yards", "def_tackles", "def_sacks"]),
        "player_production": json.loads(
            player_season.sort_values(["player_display_name", "season", "team"]).to_json(orient="records")
        ),
        "quarterbacks": records(qb_by_epa, ["player_display_name", "games", "attempts", "passing_yards", "passing_tds", "epa_per_attempt", "win_rate"]),
        "passing_share": records(pass_share, ["team", "passing_share"], 32),
        "team_style": records(rushing_passing.sort_values(["team", "season"]), ["season", "team", "passing_share", "passing_yards", "rushing_yards"], 160),
        "home_away": json.loads(home_away.to_json(orient="records")),
        "season_trend": json.loads(seasons.to_json(orient="records")),
        "season_balance": json.loads(season_balance.to_json(orient="records")),
        "turnover_success": records(
            turnover_success.sort_values(["win_rate", "points_per_game"], ascending=False),
            ["season", "team", "games", "wins", "win_rate", "points_per_game", "offensive_yards_per_game", "offensive_tds_per_game", "passing_interceptions", "offensive_interceptions_per_game", "def_interceptions", "takeaways_per_game", "takeaway_margin"],
            160,
        ),
        "leaderboard": records(
            panel.groupby(["player_id", "player_display_name", "position_group"], as_index=False)
            .agg(
                player_games=("game_id", "nunique"),
                passing_yards=("passing_yards", "sum"),
                rushing_yards=("rushing_yards", "sum"),
                receiving_yards=("receiving_yards", "sum"),
                def_tackles=("def_tackles_solo", "sum"),
                def_sacks=("def_sacks", "sum"),
            )
            .assign(all_around_yards=lambda frame: frame["passing_yards"] + frame["rushing_yards"] + frame["receiving_yards"])
            .sort_values("all_around_yards", ascending=False),
            ["player_display_name", "position_group", "player_games", "passing_yards", "rushing_yards", "receiving_yards", "def_tackles", "def_sacks", "all_around_yards"],
        ),
    }


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading player statistics for seasons {SEASONS}...")
    player_stats = as_pandas(nfl.load_player_stats(SEASONS, summary_level="week"))
    schedules = as_pandas(nfl.load_schedules(SEASONS))
    teams = as_pandas(nfl.load_teams())
    players = as_pandas(nfl.load_players())
    snap_counts = as_pandas(nfl.load_snap_counts(SEASONS))

    player_stats = player_stats.loc[player_stats["season_type"].eq("REG")].copy()
    # nflverse includes a small number of team-level penalty rows without a player ID.
    # The project unit is explicitly one player in one game, so drop those rows.
    player_stats = player_stats.loc[player_stats["player_id"].notna()].copy()
    team_games = build_team_games(schedules)
    panel = player_stats.merge(team_games, on=["game_id", "season", "week", "team", "opponent_team"], how="inner")

    player_meta = players[
        [
            "gsis_id",
            "pfr_id",
            "display_name",
            "position",
            "position_group",
            "headshot",
            "latest_team",
        ]
    ].rename(columns={"gsis_id": "player_id", "headshot": "player_headshot"})
    panel = panel.merge(player_meta, on="player_id", how="left", suffixes=("", "_meta"))
    panel["player_display_name"] = panel["player_display_name"].fillna(panel["display_name"])
    panel["position"] = panel["position"].fillna(panel["position_meta"])
    panel["position_group"] = panel["position_group"].fillna(panel["position_group_meta"])
    panel["headshot_url"] = panel["headshot_url"].fillna(panel["player_headshot"])

    # Snap counts are published separately from weekly player statistics. Join
    # them through the player metadata so line players and specialists retain
    # meaningful workload measures even when they do not touch the ball.
    snap_counts = snap_counts.loc[snap_counts["game_type"].eq("REG")].copy()
    snap_counts = snap_counts.merge(
        players[["gsis_id", "pfr_id"]].rename(columns={"gsis_id": "player_id"}),
        left_on="pfr_player_id",
        right_on="pfr_id",
        how="left",
    )
    snap_counts = (
        snap_counts.groupby(["game_id", "player_id", "team"], as_index=False)
        .agg(
            offense_snaps=("offense_snaps", "sum"),
            offense_pct=("offense_pct", "mean"),
            defense_snaps=("defense_snaps", "sum"),
            defense_pct=("defense_pct", "mean"),
            st_snaps=("st_snaps", "sum"),
            st_pct=("st_pct", "mean"),
        )
    )
    panel = panel.merge(snap_counts, on=["game_id", "player_id", "team"], how="left")

    stat_columns = [
        "completions",
        "attempts",
        "passing_yards",
        "passing_tds",
        "passing_interceptions",
        "passing_epa",
        "carries",
        "rushing_yards",
        "rushing_tds",
        "rushing_epa",
        "receptions",
        "targets",
        "receiving_yards",
        "receiving_tds",
        "receiving_epa",
        "def_tackles_solo",
        "def_sacks",
        "def_interceptions",
        "def_pass_defended",
        "def_tds",
        "def_qb_hits",
        "def_tackles_for_loss",
        "def_fumbles_forced",
        "penalties",
        "penalty_yards",
        "fg_made",
        "fg_att",
        "fg_missed",
        "fg_blocked",
        "fg_long",
        "fg_pct",
        "pat_made",
        "pat_att",
        "pat_missed",
        "pat_pct",
        "pt_att",
        "pt_long",
        "pt_yards",
        "pt_inside_20",
        "pt_touchback",
        "pt_net_yards",
        "punt_return_yards",
        "kickoff_return_yards",
        "special_teams_tds",
        "fantasy_points",
    ]
    for column in stat_columns:
        panel[column] = clean_number(panel[column])
    for column in ["offense_snaps", "offense_pct", "defense_snaps", "defense_pct", "st_snaps", "st_pct"]:
        panel[column] = clean_number(panel[column])

    output_columns = [
        "season",
        "week",
        "game_date",
        "game_id",
        "home_away",
        "player_id",
        "player_name",
        "player_display_name",
        "position",
        "position_group",
        "team",
        "opponent_team",
        "headshot_url",
        "team_score",
        "opponent_score",
        "point_differential",
        "win_loss",
        "offense_snaps",
        "offense_pct",
        "defense_snaps",
        "defense_pct",
        "st_snaps",
        "st_pct",
        *stat_columns,
    ]
    panel = panel[output_columns].sort_values(["season", "week", "team", "player_display_name"])
    panel.to_csv(DATA_DIR / "panel.csv", index=False)
    with gzip.open(DATA_DIR / "panel.csv.gz", "wt", encoding="utf-8", newline="") as compressed_panel:
        panel.to_csv(compressed_panel, index=False)

    team_columns = [
        "team_abbr",
        "team_name",
        "team_nick",
        "team_conf",
        "team_division",
        "team_color",
        "team_color2",
        "team_color3",
        "team_color4",
        "team_logo_wikipedia",
        "team_logo_espn",
        "team_wordmark",
        "team_logo_squared",
    ]
    team_records = teams[team_columns].drop_duplicates("team_abbr").fillna("")
    team_records = team_records.loc[team_records["team_abbr"].isin(panel["team"].unique())]
    team_records.to_json(DATA_DIR / "teams.json", orient="records", indent=2)

    player_records = (
        panel[
            ["player_id", "player_display_name", "position", "position_group", "team", "headshot_url"]
        ]
        .drop_duplicates("player_id")
        .fillna("")
        .sort_values("player_display_name")
    )
    player_records.to_json(DATA_DIR / "players.json", orient="records", indent=2)

    report_stats = build_report_stats(panel.copy())
    report_players = report_stats.pop("player_production", [])
    report_player_json = json.dumps(report_players, separators=(",", ":"))
    (DATA_DIR / "report_players.json").write_text(report_player_json, encoding="utf-8")
    with gzip.open(DATA_DIR / "report_players.json.gz", "wt", encoding="utf-8") as compressed_players:
        compressed_players.write(report_player_json)
    (DATA_DIR / "report_stats.json").write_text(json.dumps(report_stats, indent=2), encoding="utf-8")
    metadata = {
        "seasons": SEASONS,
        "season_type": "REG",
        "row_definition": "one player in one regular-season game",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "rows": int(len(panel)),
        "columns": list(panel.columns),
        "games": int(panel["game_id"].nunique()),
        "teams": int(panel["team"].nunique()),
        "players": int(panel["player_id"].nunique()),
        "data_source": "nflverse via nflreadpy",
        "dashboard_panel": "panel.csv.gz",
        "highlights": "highlights.json.gz",
    }
    (DATA_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
