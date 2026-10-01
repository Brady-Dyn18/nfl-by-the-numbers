"""Build compact, game-specific highlight events from nflverse play-by-play."""

from __future__ import annotations

import gzip
import json
from pathlib import Path

import nflreadpy as nfl
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SEASONS = list(range(2021, 2026))


def as_pandas(frame) -> pd.DataFrame:
    return frame.to_pandas() if hasattr(frame, "to_pandas") else frame


def present(value) -> bool:
    return value is not None and not pd.isna(value) and str(value) not in {"", "nan", "None"}


def player_id(value) -> str | None:
    return str(value) if present(value) else None


def numeric(value, default=0):
    return float(value) if present(value) else default


def text(value, default="") -> str:
    return str(value) if present(value) else default


def event_candidates(play: dict, pid: str, position: str) -> list[tuple[int, dict]]:
    """Return scored real-play candidates for one player in one play."""
    play_type = text(play.get("play_type"))
    yards = numeric(play.get("yards_gained"))
    touchdown = numeric(play.get("touchdown")) == 1
    pass_touchdown = numeric(play.get("pass_touchdown")) == 1
    rush_touchdown = numeric(play.get("rush_touchdown")) == 1
    candidates: list[tuple[int, dict]] = []

    def is_player(field: str) -> bool:
        return player_id(play.get(field)) == pid

    def add(kind: str, score: int, role: str) -> None:
        candidates.append((score, {"event": kind, "role": role}))

    if is_player("interception_player_id") or is_player("lateral_interception_player_id"):
        add("INTERCEPTION", 100000 + max(0, int(yards)) * 100, "defense")
    if is_player("sack_player_id") or is_player("half_sack_1_player_id") or is_player("half_sack_2_player_id"):
        add("SACK", 85000 + max(0, int(abs(yards))) * 50, "defense")
    if is_player("pass_defense_1_player_id") or is_player("pass_defense_2_player_id"):
        add("PASS DEFENDED", 40000 + max(0, int(yards)), "defense")
    if is_player("fumble_recovery_1_player_id") or is_player("fumble_recovery_2_player_id"):
        add("FUMBLE RECOVERY", 75000 + max(0, int(yards)) * 20, "defense")
    if is_player("solo_tackle_1_player_id") or is_player("solo_tackle_2_player_id"):
        add("SOLO TACKLE", 18000 + max(0, int(abs(yards))), "defense")

    if is_player("passer_player_id") and play_type == "pass":
        if pass_touchdown:
            add("PASSING TD", 100000 + max(0, int(yards)) * 100, "pass")
        elif is_player("interception_player_id"):
            add("INTERCEPTION THROWN", 10000, "pass")
        elif player_id(play.get("receiver_player_id")):
            add("COMPLETION", 30000 + max(0, int(yards)) * 100, "pass")
        else:
            add("PASS ATTEMPT", 8000 + max(0, int(yards)), "pass")
    if is_player("receiver_player_id") and play_type == "pass":
        if pass_touchdown:
            add("RECEIVING TD", 100000 + max(0, int(yards)) * 100, "catch")
        elif not is_player("interception_player_id"):
            add("RECEPTION", 30000 + max(0, int(yards)) * 100, "catch")
    if is_player("rusher_player_id") and play_type in {"run", "qb_kneel"}:
        add("RUSHING TD" if rush_touchdown else "RUSH", (95000 if rush_touchdown else 28000) + max(0, int(yards)) * 100, "rush")
    if is_player("punt_returner_player_id") or is_player("kickoff_returner_player_id"):
        add("RETURN TD" if touchdown else "RETURN", (90000 if touchdown else 20000) + max(0, int(yards)) * 100, "return")
    if is_player("kicker_player_id") and play_type in {"field_goal", "extra_point"}:
        add("FIELD GOAL" if play.get("field_goal_result") == "made" else "KICK", 30000 + int(numeric(play.get("kick_distance"))), "special")
    if is_player("punter_player_id") and play_type == "punt":
        add("PUNT", 18000 + int(numeric(play.get("kick_distance"))), "special")

    # If a player is involved but the position-specific fields above are absent,
    # retain a real play rather than falling back to a fictional game moment.
    if not candidates:
        for field in (
            "passer_player_id", "receiver_player_id", "rusher_player_id", "td_player_id",
            "solo_tackle_1_player_id", "solo_tackle_2_player_id", "pass_defense_1_player_id",
            "pass_defense_2_player_id", "sack_player_id", "interception_player_id",
            "kicker_player_id", "punter_player_id", "punt_returner_player_id", "kickoff_returner_player_id",
        ):
            if is_player(field):
                add("PLAY", 5000 + max(0, int(yards)) * 10, "play")
                break
    return candidates


def event_record(play: dict, game: dict, player: dict, candidate: dict) -> dict:
    team = player["team"]
    possession = text(play.get("posteam"))
    defense = text(play.get("defteam"))
    if team == possession:
        before_team, before_opponent = numeric(play.get("posteam_score")), numeric(play.get("defteam_score"))
        after_team, after_opponent = numeric(play.get("posteam_score_post")), numeric(play.get("defteam_score_post"))
    else:
        before_team, before_opponent = numeric(play.get("defteam_score")), numeric(play.get("posteam_score"))
        after_team, after_opponent = numeric(play.get("defteam_score_post")), numeric(play.get("posteam_score_post"))
    return {
        "season": int(game["season"]),
        "week": int(game["week"]),
        "game_id": game["game_id"],
        "player_id": player["player_id"],
        "player_display_name": player["player_display_name"],
        "position": player["position"],
        "position_group": player["position_group"],
        "team": team,
        "opponent_team": player["opponent_team"],
        "home_away": player["home_away"],
        "event": candidate["event"],
        "role": candidate["role"],
        "play_type": text(play.get("play_type_nfl"), text(play.get("play_type"), "PLAY")),
        "description": text(play.get("desc"), "Play description unavailable."),
        "yards_gained": int(numeric(play.get("yards_gained"))),
        "down": int(numeric(play.get("down"))) if present(play.get("down")) else None,
        "ydstogo": int(numeric(play.get("ydstogo"))),
        "yardline_100": int(numeric(play.get("yardline_100"))) if present(play.get("yardline_100")) else None,
        "quarter": int(numeric(play.get("qtr"))) if present(play.get("qtr")) else None,
        "clock": text(play.get("time"), "—"),
        "possession_team": possession,
        "defense_team": defense,
        "team_score_before": int(before_team),
        "opponent_score_before": int(before_opponent),
        "team_score_after": int(after_team),
        "opponent_score_after": int(after_opponent),
    }


def main() -> None:
    panel = pd.read_csv(DATA_DIR / "panel.csv", dtype={"player_id": str, "game_id": str})
    panel_lookup = {}
    for row in panel[
        ["season", "week", "game_id", "player_id", "player_display_name", "position", "position_group", "team", "opponent_team", "home_away"]
    ].to_dict("records"):
        panel_lookup[(int(row["season"]), row["game_id"], row["player_id"])] = row

    best: dict[tuple[int, str, str], tuple[int, dict]] = {}
    id_fields = [
        "passer_player_id", "receiver_player_id", "rusher_player_id", "td_player_id", "sack_player_id",
        "half_sack_1_player_id", "half_sack_2_player_id", "interception_player_id", "lateral_interception_player_id",
        "punt_returner_player_id", "kickoff_returner_player_id", "kicker_player_id", "punter_player_id",
        "solo_tackle_1_player_id", "solo_tackle_2_player_id", "pass_defense_1_player_id", "pass_defense_2_player_id",
        "fumble_recovery_1_player_id", "fumble_recovery_2_player_id",
    ]
    for season in SEASONS:
        print(f"Loading play-by-play for {season}...")
        pbp = as_pandas(nfl.load_pbp(season))
        usable = pbp.loc[pbp["play_type"].isin(["pass", "run", "punt", "field_goal", "extra_point", "kickoff", "qb_kneel"])].copy()
        for play in usable.to_dict("records"):
            game_id = text(play.get("game_id"))
            if not game_id:
                continue
            involved = {player_id(play.get(field)) for field in id_fields if present(play.get(field))}
            for pid in involved:
                player = panel_lookup.get((season, game_id, pid))
                if not player:
                    continue
                candidates = event_candidates(play, pid, text(player.get("position")))
                for score, candidate in candidates:
                    key = (season, game_id, pid)
                    if key not in best or score > best[key][0]:
                        best[key] = (score, event_record(play, {"season": season, "week": play.get("week"), "game_id": game_id}, player, candidate))
        print(f"  {len(best):,} player-game highlights indexed")

    records = [item[1] for item in best.values()]
    records.sort(key=lambda item: (item["season"], item["week"], item["game_id"], item["player_display_name"]))
    (DATA_DIR / "highlights.json").write_text(json.dumps(records, separators=(",", ":")), encoding="utf-8")
    with gzip.open(DATA_DIR / "highlights.json.gz", "wt", encoding="utf-8") as compressed:
        json.dump(records, compressed, separators=(",", ":"))
    print(json.dumps({"records": len(records), "file": "data/highlights.json.gz"}, indent=2))


if __name__ == "__main__":
    main()
