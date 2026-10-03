# Rubric checklist

## Data

- [x] Panel/event data with season, week, team, player, and opponent fields.
- [x] Five seasons: 2021-2025.
- [x] More than ten group values: all 32 NFL team abbreviations plus player IDs.
- [x] More than 50,000 rows after panel construction.
- [x] More than eight columns.
- [x] Categorical filters: season, team, opponent, position, position group.
- [x] Numeric measures: points, yards, touchdowns, EPA, tackles, sacks, interceptions, and player-game count.

## Report page

- [x] Title, author, summary paragraph, and source note.
- [x] Four headline numbers.
- [x] Ten finding sections, each with explanatory text and a chart.
- [x] Closing methodology section explains source, row definition, exclusions, and calculations.
- [x] Interactive Clutch Kicker game makes the report opening engaging while connecting field-goal mechanics to a fourth-down decision.
- [x] Report guide, season/team/position lens, and direct chart-type labels improve navigation and readability.
- [x] Team comparison builder compares two selected teams by season using role-relevant real values and a normalized index.
- [x] Surprise findings and a closing summary turn the chart collection into an interpretable story.

## Dashboard page

- [x] Filters for season, team, opponent, position group, and position.
- [x] Four dynamic summary numbers.
- [x] Five dynamic charts, including a measure-and-breakdown chart switch for totals, per-game averages, and role-specific rates, plus role-specific production, home/away outcomes, usage efficiency, and turnover success.
- [x] Team/opponent matchup snapshot with logos, colors, and role-specific comparison.
- [x] Cascading filters, quick-find search, active filter chips, and accessible table rows.
- [x] Useful default matchup, team-season context snapshot, and automatically generated matchup takeaway.
- [x] Visible dashboard quick-start guide, data-quality summary, role-specific chart explanations, and clear no-result states.
- [x] Current-view data table with role-appropriate columns and filtered CSV export.
- [x] Current filtered view can also be exported beside the chart lab, with the same rows used by the table.
- [x] Reset filters button.
- [x] Player Duel compares same-position players from both teams with raw values, normalized role scores, season trends, images, and role-appropriate workload, production, efficiency, and discipline measures.

## Repository and design

- [x] Shared navigation, fonts, colors, and responsive styles.
- [x] Team colors and logos update with team selection.
- [x] Player headshot updates when a player is selected.
- [x] README describes every file and data source.
- [x] Reproducible build and validation scripts.
- [x] Compressed dashboard panel, data dictionary, refresh date, and downloadable CSV.
- [x] Project question, key findings, methodology notes, defensive-comparison limitation, and responsive/accessibility refinements.
- [x] Optional compressed play-by-play index with a reproducible build script.
