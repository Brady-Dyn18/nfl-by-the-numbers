# NFL by the Numbers data dictionary

The downloadable panel is `data/panel.csv`. Each row represents one player in one regular-season NFL game from 2021 through 2025. Numeric blanks from the source are stored as zero after the player-game row has been retained; players with no official statistic row are not added.

## Identity and context

| Column | Meaning |
| --- | --- |
| `season` | NFL season year. |
| `week` | Regular-season week number. |
| `game_date` | Calendar date of the game. |
| `game_id` | nflverse game identifier. |
| `home_away` | Whether the player’s team was home or away. |
| `player_id` | nflverse/GSIS player identifier. |
| `player_name` | Source player name. |
| `player_display_name` | Display name used in the site. |
| `position` | Player’s listed position, such as QB, RB, WR, or DE. |
| `position_group` | nflverse position grouping. |
| `team` | Player’s team abbreviation. |
| `opponent_team` | Opposing team abbreviation. |
| `headshot_url` | Source URL for the player image. |

## Game result

| Column | Meaning |
| --- | --- |
| `team_score` | Final points scored by the player’s team. |
| `opponent_score` | Final points scored by the opponent. |
| `point_differential` | `team_score - opponent_score`. |
| `win_loss` | W, L, or T calculated from point differential. |

## Offense

| Column | Meaning |
| --- | --- |
| `completions` | Completed passes credited to the player. |
| `attempts` | Pass attempts credited to the player. |
| `passing_yards` | Passing yards. |
| `passing_tds` | Passing touchdowns. |
| `passing_interceptions` | Interceptions thrown. |
| `passing_epa` | Expected points added from passing. |
| `carries` | Rushing attempts. |
| `rushing_yards` | Rushing yards. |
| `rushing_tds` | Rushing touchdowns. |
| `rushing_epa` | Expected points added from rushing. |
| `receptions` | Receptions. |
| `targets` | Receiving targets. |
| `receiving_yards` | Receiving yards. |
| `receiving_tds` | Receiving touchdowns. |
| `receiving_epa` | Expected points added from receiving. |

## Defense and other production

| Column | Meaning |
| --- | --- |
| `def_tackles_solo` | Solo defensive tackles. |
| `def_sacks` | Defensive sacks. |
| `def_interceptions` | Defensive interceptions. |
| `def_pass_defended` | Passes defended. |
| `def_tds` | Defensive touchdowns. |
| `penalties` | Penalties credited to the player. |
| `penalty_yards` | Penalty yards. |
| `fantasy_points` | nflverse fantasy-points total. |

## Important calculation notes

- Team offensive yards on the dashboard means passing yards plus rushing yards. Receiving yards are not added to team offense because they describe the same passing plays from the receiver’s perspective.
- Recorded player production is a player-facing total of passing, rushing, and receiving yards. It is not a team total and should not be interpreted as player value.
- The report’s EPA rate is passing EPA divided by pass attempts for qualified quarterbacks.
- The website’s animated plays are schematic illustrations. The panel contains player-game aggregates, not play-level tracking coordinates or video.

## Actual play replay index

The dashboard also loads `data/highlights.json.gz`. This separate index contains one highest-priority nflverse play-by-play event for each player-game represented in the panel. It is used to keep the replay tied to a real game event instead of a repeated generic animation.

| Field | Meaning |
| --- | --- |
| `event` | Role-specific label such as PASSING TD, RECEPTION, RUSH, SACK, INTERCEPTION, or SOLO TACKLE. |
| `description` | nflverse’s original play description. |
| `down`, `ydstogo`, `clock`, `quarter` | Situation at the start of the play when available. |
| `yardline_100` | Approximate yards to the opponent’s goal line at the start of the play. |
| `yards_gained` | Yards recorded on the play. |
| `team_score_before`, `opponent_score_before`, `team_score_after`, `opponent_score_after` | Score state around the selected play from the possession and defensive-team perspective. |

The replay uses those fields for the text and motion length. Its player dots are intentionally schematic because nflverse play-by-play does not provide broadcast video or tracking coordinates.

Source: [nflverse](https://github.com/nflverse/nflverse-data) through [nflreadpy](https://nflreadpy.nflverse.com/). Team marks and player images remain the property of their respective rights holders and are used for this educational project.
