# NFL by the Numbers

Interactive Financial Data Analytics website studying NFL player and team performance during the five completed seasons from 2021 through 2025.

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

- `index.html` - narrative report with headline metrics and eight findings.
- `dashboard.html` - interactive dashboard with filters, switches, charts, table, and reset control.
- `assets/styles.css` - shared NFL-inspired design system and responsive layout.
- `assets/app.js` - dashboard data loading, filtering, calculations, charts, theming, and player cards.
- `data/panel.csv` - compact player-game panel used by both pages.
- `data/teams.json` - team names, colors, and logo URLs.
- `data/players.json` - player names, positions, and headshot URLs.
- `scripts/build_data.py` - reproducible data acquisition and panel construction.
- `scripts/validate_project.py` - automated rubric and data-integrity checks.
- `docs/rubric-checklist.md` - checklist mapping the project to the assignment rubric.
- `submission.txt` - four-line turn-in template; replace the student-ID placeholder before submitting.

## Data source and methodology

Data comes from the free [nflverse](https://github.com/nflverse/nflverse-data) project through [`nflreadpy`](https://nflreadpy.nflverse.com/). The panel uses regular-season weekly player statistics for seasons 2021-2025, joined to completed game schedules for final scores and win/loss outcomes. The player statistics include offense and defense measures, player position, team, opponent, and NFL headshot URLs. Team colors and logo URLs come from the nflverse teams release.

One row is one player in one regular-season NFL game. Players with no recorded official statistic for a game are not represented in the player-statistics release; this is documented rather than silently treating missing rows as zeros. The source also includes 90 team-level penalty rows without a player ID; these are dropped because they do not match the project’s player-game row definition. Postseason games are excluded so every season is comparable on a regular-season basis. Wins are calculated from the team and opponent final scores. Rates on the report are calculated as totals divided by the relevant count of player-game rows or team-games, as labeled.

The majority of nflverse data is broadly licensed under CC-BY 4.0. Team logos and player images remain the property of their respective rights holders and are used here for an educational project. Please retain source attribution when reusing this work.
