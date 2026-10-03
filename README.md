# NFL by the Numbers

Interactive NFL data analytics website studying player and team performance during the five completed seasons from 2021 through 2025.

## Published site

- GitHub repository: https://github.com/Brady-Dyn18/nfl-by-the-numbers
- GitHub Pages site: https://brady-dyn18.github.io/nfl-by-the-numbers/

## Run locally

From this repository root:

```bash
uv sync
uv run python scripts/build_data.py
uv run python -m http.server 8000
```

Then open `http://localhost:8000/`.

The browser dashboard needs an HTTP server because browsers block local CSV requests from `file://` pages.

## Website files

- `index.html` - narrative report with headline metrics and ten findings, including scoring, offense balance, turnovers, home/away context, a clutch-kicker fourth-down game, an interactive report lens, a two-team comparison, surprise findings, and closing conclusions.
- `dashboard.html` - interactive dashboard with cascading filters, explicit chart measure and breakdown switches, a useful default matchup, team-season context cards, role-specific Player Duel cards and trends, charts, table, and filtered CSV export.
- `assets/styles.css` - shared NFL-inspired design system and responsive layout.
- `assets/app.js` - dashboard data loading, filtering, calculations, charts, theming, and player cards.
- `data/panel.csv` - downloadable player-game panel used by both pages.
- `data/panel.csv.gz` - compressed copy used by the browser dashboard for faster loading.
- `data/highlights.json.gz` - optional compressed game-specific nflverse play-by-play index retained for exploration; the dashboard now uses the Player Duel instead of a replay.
- `data/highlights.json` - readable copy of the optional play-by-play index for inspection.
- `data/teams.json` - team names, colors, and logo URLs.
- `data/players.json` - player names, positions, and headshot URLs.
- `data/report_stats.json` - derived season, team, position, quarterback, balance, turnover, and home/away aggregates used by the report charts.
- `data/report_players.json.gz` - compressed season/team/player role summaries used by the report lens; the readable `data/report_players.json` fallback is included for browsers without native gzip streams.
- `scripts/build_data.py` - reproducible data acquisition, snap-count joins, specialist fields, and panel construction.
- `scripts/build_highlights.py` - optional reproducible nflverse play-by-play indexing for one actual event per player-game.
- `scripts/validate_project.py` - automated rubric and data-integrity checks.
- `docs/rubric-checklist.md` - checklist mapping the project to the assignment rubric.
- `docs/data-dictionary.md` - column definitions and calculation notes for the downloadable panel.
- `submission.txt` - four-line turn-in template; replace the student-ID placeholder before submitting.

## Data source and methodology

Data comes from the free [nflverse](https://github.com/nflverse/nflverse-data) project through [`nflreadpy`](https://nflreadpy.nflverse.com/). The panel uses regular-season weekly player statistics for seasons 2021-2025, joined to completed game schedules for final scores and win/loss outcomes. The player statistics include offense and defense measures, player position, team, opponent, and NFL headshot URLs. Team colors and logo URLs come from the nflverse teams release.

One row is one player in one regular-season NFL game. Players with no recorded official statistic for a game are not represented in the player-statistics release; this is documented rather than silently treating missing rows as zeros. The source also includes 90 team-level penalty rows without a player ID; these are dropped because they do not match the project’s player-game row definition. Postseason games are excluded so every season is comparable on a regular-season basis. Wins are calculated from the team and opponent final scores. Rates on the report are calculated as totals divided by the relevant count of player-game rows or team-games, as labeled.

The majority of nflverse data is broadly licensed under CC-BY 4.0. Team logos and player images remain the property of their respective rights holders and are used here for an educational project. Please retain source attribution when reusing this work. The dashboard loads the compressed panel first and falls back to the CSV when compression support is unavailable.

The dashboard opens to a KC-DEN quarterback matchup so the analytical story is visible immediately; users can reset or replace it with any valid matchup. The team-season snapshot reports record, scoring, offensive yards, pass share, and interception margin per team-game. The Player Duel compares two players from the same position across the selected matchup, shows raw values beside a normalized scorecard, and adds a season-by-season role trend. Its measures change with the role: quarterbacks use passing volume and completion rate, receivers use targets and catch rate, defensive players use tackles and pressure, offensive linemen use offensive snaps and snap rate, kickers use field-goal attempts, accuracy, and longest make, punters use distance and inside-20 results, and long snappers use special-teams workload. Player headshots, team logos, and team colors update with the selection. The dashboard can export the exact filtered rows currently visible. Defensive comparisons describe recorded activity; the panel does not identify the exact defender covering a receiver.

The report’s Clutch Kicker game adds a decision layer before the kick: choose to kick, go for it, or punt. Kicking unlocks an animated aim-and-power challenge with an intentionally imperfect starting read, distance coaching, wind, a running score, makes, stops, streaks, and best streak. The go-for-it choice can succeed or be stuffed short for a turnover on downs, while punts resolve as field-position outcomes, so the mini-game teaches the strategic tradeoff as well as the mechanics.

The report page also includes a season/team/position lens that updates the filtered ranking and several overview charts, a team comparison builder with logos, team colors, real metric cards, and a normalized matchup index, plus dynamically generated surprise findings and a closing “short version” that points readers to the dashboard. Chart-type labels, direct takeaways, section spacing, and responsive layouts are used to keep the ten findings readable without making every visual a bar chart.
