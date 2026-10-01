(async function () {
  const nf = new Intl.NumberFormat("en-US");
  const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const number = (value) => nf.format(Math.round(Number(value || 0)));
  const decimal = (value) => oneDecimal.format(Number(value || 0));
  const safe = (value) => value == null || value === "" ? "—" : value;
  const get = (id) => document.getElementById(id);
  const state = { rows: [], teams: [], players: [], filtered: [], charts: {} };
  const defaults = { primary: "#003b7a", secondary: "#d71920", soft: "#eaf1fb" };

  const csvNumberFields = ["season", "week", "team_score", "opponent_score", "point_differential", "completions", "attempts", "passing_yards", "passing_tds", "passing_interceptions", "passing_epa", "carries", "rushing_yards", "rushing_tds", "rushing_epa", "receptions", "targets", "receiving_yards", "receiving_tds", "receiving_epa", "def_tackles_solo", "def_sacks", "def_interceptions", "def_pass_defended", "def_tds", "penalties", "penalty_yards", "fantasy_points"];
  const measureLabels = { rows: "Player-game count", passing_yards: "Passing yards", rushing_yards: "Rushing yards", receiving_yards: "Receiving yards", def_tackles_solo: "Solo tackles", def_sacks: "Sacks", fantasy_points: "Fantasy points", point_differential: "Point differential" };
  const teamByAbbr = () => Object.fromEntries(state.teams.map((team) => [team.team_abbr, team]));
  const playerById = () => Object.fromEntries(state.players.map((player) => [player.player_id, player]));

  function unique(values) { return [...new Set(values.filter((v) => v !== "" && v != null))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })); }
  function fillSelect(id, values, labeler = (v) => v, allLabel) { const select = get(id); const current = select.value; const optionValues = values.map((v) => String(v)); const fallbackLabel = `All ${id.replace("Filter", "").replace(/([A-Z])/g, " $1").toLowerCase()}`; select.innerHTML = `<option value="all">${allLabel || fallbackLabel}</option>` + values.map((v) => `<option value="${String(v).replaceAll('"', '&quot;')}">${labeler(v)}</option>`).join(""); select.value = optionValues.includes(current) ? current : "all"; }
  function unitForRow(row) { if (row.position_group === "SPEC") return "Special teams"; if (["DB", "DL", "LB"].includes(row.position_group)) return "Defense"; return "Offense"; }
  function setTheme(teamAbbr) {
    const team = teamByAbbr()[teamAbbr];
    const root = document.documentElement;
    if (!team) { root.style.setProperty("--team-primary", defaults.primary); root.style.setProperty("--team-secondary", defaults.secondary); root.style.setProperty("--team-soft", defaults.soft); get("teamName").textContent = "All teams"; get("teamConference").textContent = "NFL LEAGUE VIEW"; get("teamRecord").textContent = "Select a team to apply its colors"; get("teamLogo").removeAttribute("src"); get("teamLogo").alt = ""; return; }
    const primary = team.team_color || defaults.primary; const secondary = team.team_color2 || defaults.secondary;
    root.style.setProperty("--team-primary", primary); root.style.setProperty("--team-secondary", secondary); root.style.setProperty("--team-soft", `${primary}16`);
    get("teamName").textContent = team.team_name; get("teamConference").textContent = `${team.team_conf} · ${team.team_division}`; get("teamLogo").src = team.team_logo_espn || team.team_logo_wikipedia || team.team_logo_squared; get("teamLogo").alt = `${team.team_name} logo`;
    const teamRows = state.rows.filter((row) => row.team === teamAbbr); const games = [...new Set(teamRows.map((row) => row.game_id))]; const wins = [...new Set(teamRows.filter((row) => row.win_loss === "W").map((row) => row.game_id))].length; get("teamRecord").textContent = `${wins}-${games.length - wins} in the selected seasons`;
  }
  function val(id) { return get(id).value; }
  function oppositeLocation(location) { return location === "Home" ? "Away" : location === "Away" ? "Home" : "all"; }
  function syncDependentFilters() {
    const season = val("seasonFilter");
    const team = val("teamFilter");
    const homeAway = val("homeAwayFilter");
    const group = val("positionGroupFilter");
    const position = val("positionFilter");
    const seasonRows = state.rows.filter((row) => (season === "all" || String(row.season) === season) && (homeAway === "all" || row.home_away === homeAway));
    const opponentRows = seasonRows.filter((row) => team === "all" || row.team === team);
    fillSelect("opponentFilter", unique(opponentRows.map((row) => row.opponent_team)));
    const opponent = val("opponentFilter");

    const playerRows = seasonRows.filter((row) => (team === "all" || row.team === team) && (opponent === "all" || row.opponent_team === opponent) && (group === "all" || unitForRow(row) === group) && (position === "all" || row.position === position));
    const playerIds = unique(playerRows.map((row) => row.player_id));
    fillSelect("playerFilter", playerIds, (id) => {
      const player = playerById()[id];
      return player ? `${player.player_display_name} · ${player.position || ""}` : id;
    });
  }
  function applyFilters() {
    syncDependentFilters();
    const season = val("seasonFilter"), team = val("teamFilter"), opponent = val("opponentFilter"), homeAway = val("homeAwayFilter"), group = val("positionGroupFilter"), position = val("positionFilter"), player = val("playerFilter");
    state.filtered = state.rows.filter((row) => (season === "all" || String(row.season) === season) && (team === "all" || row.team === team) && (opponent === "all" || row.opponent_team === opponent) && (homeAway === "all" || row.home_away === homeAway) && (group === "all" || unitForRow(row) === group) && (position === "all" || row.position === position) && (player === "all" || row.player_id === player));
    setTheme(team === "all" ? "" : team); updateView(); showProfile(player === "all" ? "" : player);
  }
  function aggregateTeamGames(rows) { const uniqueGames = new Map(); rows.forEach((row) => { const key = `${row.game_id}|${row.team}`; if (!uniqueGames.has(key)) uniqueGames.set(key, row); }); return [...uniqueGames.values()]; }
  function gameCount(rows) { return new Set(rows.map((row) => row.game_id)).size; }
  function sum(rows, field) { return rows.reduce((total, row) => total + Number(row[field] || 0), 0); }
  function statTotals(rows) {
    const passing = sum(rows, "passing_yards"); const rushing = sum(rows, "rushing_yards"); const receiving = sum(rows, "receiving_yards");
    const passingTds = sum(rows, "passing_tds"); const rushingTds = sum(rows, "rushing_tds"); const receivingTds = sum(rows, "receiving_tds");
    return { passing, rushing, receiving, offense: passing + rushing + receiving, passingTds, rushingTds, receivingTds, touchdowns: passingTds + rushingTds + receivingTds, tackles: sum(rows, "def_tackles_solo"), sacks: sum(rows, "def_sacks"), interceptions: sum(rows, "passing_interceptions") + sum(rows, "def_interceptions"), fantasy: sum(rows, "fantasy_points"), penalties: sum(rows, "penalties"), penaltyYards: sum(rows, "penalty_yards"), completions: sum(rows, "completions"), attempts: sum(rows, "attempts"), carries: sum(rows, "carries"), receptions: sum(rows, "receptions"), targets: sum(rows, "targets"), epa: sum(rows, "passing_epa") + sum(rows, "rushing_epa") + sum(rows, "receiving_epa") };
  }
  function teamSummary(rows) { const games = aggregateTeamGames(rows); return { ...statTotals(rows), games: games.length, points: sum(games, "team_score"), opponentPoints: sum(games, "opponent_score"), pointDifferential: sum(games, "point_differential") }; }
  function perGame(value, games) { return games ? Number(value || 0) / games : 0; }
  function percent(value, total) { return total ? (Number(value || 0) / total) * 100 : 0; }
  function inferredUnit(rows) { const units = unique(rows.map(unitForRow)); return units.length === 1 ? units[0] : "Offense"; }
  function activeMetric(rows) {
    const unit = val("positionGroupFilter"); const position = val("positionFilter"); const detectedUnit = unit === "all" ? inferredUnit(rows) : unit;
    if (detectedUnit === "Defense" || ["CB", "DB", "DE", "DL", "DT", "FS", "ILB", "LB", "MLB", "NT", "OLB", "S", "SAF"].includes(position)) return { mode: "defense", field: "tackles", label: "Solo tackles", shortLabel: "solo tackles", perGameLabel: "Solo tackles / game" };
    if (detectedUnit === "Special teams" || ["K", "P", "LS"].includes(position)) return { mode: "special", field: "fantasy", label: "Fantasy points", shortLabel: "fantasy points", perGameLabel: "Fantasy points / game" };
    if (position === "QB") return { mode: "passing", field: "passing", label: "Passing yards", shortLabel: "passing yards", perGameLabel: "Passing yards / game" };
    if (["WR", "TE"].includes(position)) return { mode: "receiving", field: "receiving", label: "Receiving yards", shortLabel: "receiving yards", perGameLabel: "Receiving yards / game" };
    if (["RB", "FB"].includes(position)) return { mode: "rushing", field: "rushing", label: "Rushing yards", shortLabel: "rushing yards", perGameLabel: "Rushing yards / game" };
    return { mode: "offense", field: "offense", label: "Offensive yards", shortLabel: "offensive yards", perGameLabel: "Offensive yards / game" };
  }
  function metricValue(item, metric) { return Number(item[metric.field] || 0); }
  function rowMetric(row, metric) { return metricValue(statTotals([row]), metric); }
  function matchupRows(rows) {
    const team = val("teamFilter"); const opponent = val("opponentFilter");
    if (team === "all" || opponent === "all") return { primary: rows, opponent: [], team, opponentTeam: opponent, matched: false };
    const gameIds = new Set(rows.map((row) => row.game_id)); const group = val("positionGroupFilter"); const position = val("positionFilter"); const player = val("playerFilter"); const selectedPlayer = player === "all" ? null : playerById()[player]; const comparePosition = position === "all" ? selectedPlayer?.position || "all" : position; const location = oppositeLocation(val("homeAwayFilter"));
    const opposingRows = state.rows.filter((row) => gameIds.has(row.game_id) && row.team === opponent && row.opponent_team === team && (group === "all" || unitForRow(row) === group) && (comparePosition === "all" || row.position === comparePosition) && (location === "all" || row.home_away === location));
    return { primary: rows, opponent: opposingRows, team, opponentTeam: opponent, matched: opposingRows.length > 0 };
  }
  function playerProduction(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
      const id = row.player_id; if (!grouped.has(id)) grouped.set(id, { id, team: row.team, position: row.position, label: row.player_display_name || row.player_name, games: new Set(), passing: 0, rushing: 0, receiving: 0, offense: 0, passingTds: 0, rushingTds: 0, receivingTds: 0, touchdowns: 0, tackles: 0, sacks: 0, interceptions: 0, fantasy: 0, penalties: 0, penaltyYards: 0, completions: 0, attempts: 0, carries: 0, receptions: 0, targets: 0, epa: 0 });
      const item = grouped.get(id); const totals = statTotals([row]); item.games.add(row.game_id); ["passing", "rushing", "receiving", "offense", "passingTds", "rushingTds", "receivingTds", "touchdowns", "tackles", "sacks", "interceptions", "fantasy", "penalties", "penaltyYards", "completions", "attempts", "carries", "receptions", "targets", "epa"].forEach((key) => item[key] += totals[key]);
    });
    return [...grouped.values()].map((item) => ({ ...item, games: item.games.size, offense: item.passing + item.rushing + item.receiving }));
  }
  function colors(n) { const base = [getComputedStyle(document.documentElement).getPropertyValue("--team-primary").trim() || defaults.primary, getComputedStyle(document.documentElement).getPropertyValue("--team-secondary").trim() || defaults.secondary, "#f28c28", "#1f8a70", "#7b61a8", "#1982c4", "#526074", "#b45f06"]; return Array.from({ length: n }, (_, i) => base[i % base.length]); }
  function baseOptions(indexAxis = "x") { return { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: {} } }, scales: { x: { grid: { display: indexAxis === "y" }, ticks: { color: "#526074" } }, y: { grid: { display: indexAxis !== "y", color: "#e7ebf2" }, ticks: { color: "#526074" } } } }; }
  function destroyChart(name) { if (state.charts[name]) state.charts[name].destroy(); }
  function makeOrUpdateChart(name, id, config) { destroyChart(name); state.charts[name] = new Chart(get(id), config); }

  function teamLabel(abbr) { return !abbr || abbr === "all" ? "VIEW" : abbr; }
  function teamColor(abbr, fallback) { return teamByAbbr()[abbr]?.team_color || fallback; }
  function pairValue(context, primary, opponent, key, formatter, transform = (summary) => summary[key]) {
    if (!primary.games) return "—";
    const primaryValue = formatter(transform(primary));
    if (!context.matched) return primaryValue;
    return `${teamLabel(context.team)} ${primaryValue} · ${teamLabel(context.opponentTeam)} ${formatter(transform(opponent))}`;
  }
  function updateSummary(rows) {
    const context = matchupRows(rows); const metric = activeMetric(context.primary); const primary = teamSummary(context.primary); const opponent = teamSummary(context.opponent); const note = context.matched ? "selected team · opponent" : primary.games ? `${number(primary.games)} games in current view` : "no matching rows";
    const values = metric.mode === "passing" ? [["PASSING YARDS", pairValue(context, primary, opponent, "passing", number)], ["PASS YARDS / GAME", pairValue(context, primary, opponent, "passing", decimal, (s) => perGame(s.passing, s.games))], ["PASSING TDs", pairValue(context, primary, opponent, "passingTds", number)], ["COMPLETION %", pairValue(context, primary, opponent, "completion", decimal, (s) => percent(s.completions, s.attempts))]] : metric.mode === "rushing" ? [["RUSHING YARDS", pairValue(context, primary, opponent, "rushing", number)], ["RUSH YARDS / GAME", pairValue(context, primary, opponent, "rushing", decimal, (s) => perGame(s.rushing, s.games))], ["RUSHING TDs", pairValue(context, primary, opponent, "rushingTds", number)], ["CARRIES / GAME", pairValue(context, primary, opponent, "carries", decimal, (s) => perGame(s.carries, s.games))]] : metric.mode === "receiving" ? [["RECEIVING YARDS", pairValue(context, primary, opponent, "receiving", number)], ["REC YARDS / GAME", pairValue(context, primary, opponent, "receiving", decimal, (s) => perGame(s.receiving, s.games))], ["RECEIVING TDs", pairValue(context, primary, opponent, "receivingTds", number)], ["RECEPTIONS / GAME", pairValue(context, primary, opponent, "receptions", decimal, (s) => perGame(s.receptions, s.games))]] : metric.mode === "defense" ? [["SOLO TACKLES", pairValue(context, primary, opponent, "tackles", number)], ["TACKLES / GAME", pairValue(context, primary, opponent, "tackles", decimal, (s) => perGame(s.tackles, s.games))], ["SACKS", pairValue(context, primary, opponent, "sacks", number)], ["INTERCEPTIONS", pairValue(context, primary, opponent, "interceptions", number)]] : metric.mode === "special" ? [["FANTASY POINTS", pairValue(context, primary, opponent, "fantasy", decimal)], ["FANTASY POINTS / GAME", pairValue(context, primary, opponent, "fantasy", decimal, (s) => perGame(s.fantasy, s.games))], ["TEAM POINTS / GAME", pairValue(context, primary, opponent, "points", decimal, (s) => perGame(s.points, s.games))], ["PENALTY YARDS", pairValue(context, primary, opponent, "penaltyYards", number)]] : [["OFFENSIVE YARDS", pairValue(context, primary, opponent, "offense", number)], ["OFF. YARDS / GAME", pairValue(context, primary, opponent, "offense", decimal, (s) => perGame(s.offense, s.games))], ["PASSING YDS / GAME", pairValue(context, primary, opponent, "passing", decimal, (s) => perGame(s.passing, s.games))], ["RUSHING YDS / GAME", pairValue(context, primary, opponent, "rushing", decimal, (s) => perGame(s.rushing, s.games))]];
    values.forEach((item, index) => { get(`summaryLabel${index + 1}`).textContent = item[0]; get(`summaryValue${index + 1}`).textContent = item[1]; get(`summaryNote${index + 1}`).textContent = note; });
  }
  function seasonBuckets(rows) {
    const keys = ["passing", "rushing", "receiving", "offense", "passingTds", "rushingTds", "receivingTds", "touchdowns", "tackles", "sacks", "interceptions", "fantasy", "penalties", "penaltyYards", "completions", "attempts", "carries", "receptions", "targets", "epa"];
    const buckets = new Map();
    rows.forEach((row) => { if (!buckets.has(row.season)) buckets.set(row.season, { season: row.season, games: new Set(), ...Object.fromEntries(keys.map((key) => [key, 0])) }); const bucket = buckets.get(row.season); bucket.games.add(row.game_id); const totals = statTotals([row]); keys.forEach((key) => bucket[key] += totals[key]); });
    return buckets;
  }
  function comparisonBars(metric, primary, opponent) {
    const definitions = metric.mode === "passing" ? [["Pass yds / game", (s) => perGame(s.passing, s.games)], ["Pass TDs / game", (s) => perGame(s.passingTds, s.games)], ["INTs / game", (s) => perGame(s.interceptions, s.games)]] : metric.mode === "rushing" ? [["Rush yds / game", (s) => perGame(s.rushing, s.games)], ["Rush TDs / game", (s) => perGame(s.rushingTds, s.games)], ["Carries / game", (s) => perGame(s.carries, s.games)]] : metric.mode === "receiving" ? [["Rec yds / game", (s) => perGame(s.receiving, s.games)], ["Rec TDs / game", (s) => perGame(s.receivingTds, s.games)], ["Receptions / game", (s) => perGame(s.receptions, s.games)]] : metric.mode === "defense" ? [["Tackles / game", (s) => perGame(s.tackles, s.games)], ["Sacks / game", (s) => perGame(s.sacks, s.games)], ["INTs / game", (s) => perGame(s.interceptions, s.games)]] : metric.mode === "special" ? [["Fantasy pts / game", (s) => perGame(s.fantasy, s.games)], ["Team points / game", (s) => perGame(s.points, s.games)], ["Penalty yds / game", (s) => perGame(s.penaltyYards, s.games)]] : [["Points / game", (s) => perGame(s.points, s.games)], ["Off. yds / game", (s) => perGame(s.offense, s.games)], ["Pass yds / game", (s) => perGame(s.passing, s.games)], ["Rush yds / game", (s) => perGame(s.rushing, s.games)]];
    return { labels: definitions.map((item) => item[0]), primary: definitions.map((item) => item[1](primary)), opponent: definitions.map((item) => item[1](opponent)) };
  }
  function updateCharts(rows) {
    const context = matchupRows(rows); const metric = activeMetric(context.primary); const primaryCode = teamLabel(context.team); const opponentCode = teamLabel(context.opponentTeam); const primaryColor = teamColor(context.team, getComputedStyle(document.documentElement).getPropertyValue("--team-primary").trim() || defaults.primary); const opponentColor = teamColor(context.opponentTeam, getComputedStyle(document.documentElement).getPropertyValue("--team-secondary").trim() || defaults.secondary); const primaryBuckets = seasonBuckets(context.primary); const opponentBuckets = seasonBuckets(context.opponent); const seasons = unique([...primaryBuckets.keys(), ...opponentBuckets.keys()]).sort((a, b) => Number(a) - Number(b)); const valueSeries = (buckets, key) => seasons.map((season) => { const bucket = buckets.get(season); return bucket ? perGame(bucket[key], bucket.games.size) : 0; });
    const datasets = metric.mode === "offense" ? [{ label: `${primaryCode} passing`, data: valueSeries(primaryBuckets, "passing"), backgroundColor: primaryColor }, { label: `${primaryCode} rushing`, data: valueSeries(primaryBuckets, "rushing"), backgroundColor: `${primaryColor}99` }, ...(context.matched ? [{ label: `${opponentCode} passing`, data: valueSeries(opponentBuckets, "passing"), backgroundColor: opponentColor }, { label: `${opponentCode} rushing`, data: valueSeries(opponentBuckets, "rushing"), backgroundColor: `${opponentColor}99` }] : [])] : [{ label: `${primaryCode} ${metric.perGameLabel}`, data: valueSeries(primaryBuckets, metric.field), backgroundColor: primaryColor }, ...(context.matched ? [{ label: `${opponentCode} ${metric.perGameLabel}`, data: valueSeries(opponentBuckets, metric.field), backgroundColor: opponentColor }] : [])];
    get("trendTitle").textContent = metric.mode === "offense" ? context.matched ? `${primaryCode} vs ${opponentCode}: passing vs rushing` : "Passing vs rushing over time" : context.matched ? `${primaryCode} vs ${opponentCode}: ${metric.label}` : `${metric.label} by season`; get("trendNote").textContent = context.matched ? "Matched games · per-game averages" : `${number(gameCount(rows))} games in view`;
    makeOrUpdateChart("trend", "trendChart", { type: "bar", data: { labels: seasons, datasets }, options: { ...baseOptions(), scales: { x: { grid: { display: false }, ticks: { color: "#526074" } }, y: { beginAtZero: true, grid: { color: "#e7ebf2" }, ticks: { color: "#526074" } } }, plugins: { ...baseOptions().plugins, legend: { display: true, position: "bottom", labels: { usePointStyle: true } }, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} per game` } } } } });

    const preparePlayers = (playerRows, side) => playerProduction(playerRows).filter((item) => item.games).map((item) => ({ ...item, side, total: metricValue(item, metric), perGame: perGame(metricValue(item, metric), item.games) })).sort((a, b) => b.perGame - a.perGame);
    const primaryPlayers = preparePlayers(context.primary, "primary"); const opponentPlayers = preparePlayers(context.opponent, "opponent"); const maxEach = val("playerFilter") === "all" ? 5 : 1; const breakdownPlayers = context.matched ? [...primaryPlayers.slice(0, maxEach), ...opponentPlayers.slice(0, maxEach)] : primaryPlayers.slice(0, 10); const breakdownLabels = breakdownPlayers.map((item) => `${item.team} · ${item.label}`);
    get("breakdownTitle").textContent = context.matched ? `${metric.label} / game: ${primaryCode} vs ${opponentCode}` : `${metric.label} / game by player`; get("breakdownNote").textContent = context.matched ? (val("positionFilter") !== "all" || val("playerFilter") !== "all" ? "Same position · matched games" : "Matched game players") : "Top players in current view";
    makeOrUpdateChart("breakdown", "breakdownChart", { type: "bar", data: { labels: breakdownLabels, datasets: [{ label: metric.perGameLabel, data: breakdownPlayers.map((item) => item.perGame), backgroundColor: breakdownPlayers.map((item) => item.side === "opponent" ? opponentColor : primaryColor), borderRadius: 3 }] }, options: { ...baseOptions("y"), indexAxis: "y", plugins: { ...baseOptions("y").plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} ${metric.perGameLabel.toLowerCase()}` } } } } });

    const primarySummary = teamSummary(context.primary); const opponentSummary = teamSummary(context.opponent); const bars = comparisonBars(metric, primarySummary, opponentSummary); get("outcomeTitle").textContent = context.matched ? `Scoring & efficiency: ${primaryCode} vs ${opponentCode}` : "Scoring & efficiency in view";
    makeOrUpdateChart("outcome", "outcomeChart", { type: "bar", data: { labels: bars.labels, datasets: [{ label: primaryCode, data: bars.primary, backgroundColor: primaryColor, borderRadius: 3 }, ...(context.matched ? [{ label: opponentCode, data: bars.opponent, backgroundColor: opponentColor, borderRadius: 3 }] : [])] }, options: { ...baseOptions(), scales: { x: { grid: { display: false }, ticks: { color: "#526074" } }, y: { beginAtZero: true, grid: { color: "#e7ebf2" }, ticks: { color: "#526074" } } }, plugins: { ...baseOptions().plugins, legend: { display: true, position: "bottom", labels: { usePointStyle: true } }, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} per game` } } } } });

    const leaderboardPlayers = context.matched ? [...primaryPlayers.slice(0, 5), ...opponentPlayers.slice(0, 5)] : primaryPlayers.slice(0, 10); const leaders = leaderboardPlayers.sort((a, b) => b.total - a.total).reverse(); get("leaderboardTitle").textContent = context.matched ? `Top ${metric.shortLabel}: ${primaryCode} vs ${opponentCode}` : `Top players by ${metric.shortLabel}`; get("leaderboardNote").textContent = context.matched ? "Total production · same position" : "Total production in current view";
    makeOrUpdateChart("leaderboard", "leaderboardChart", { type: "bar", data: { labels: leaders.map((item) => `${item.team} · ${item.label}`), datasets: [{ label: metric.label, data: leaders.map((item) => item.total), backgroundColor: leaders.map((item) => item.side === "opponent" ? opponentColor : primaryColor), borderRadius: 3 }] }, options: { ...baseOptions("y"), indexAxis: "y", plugins: { ...baseOptions("y").plugins, tooltip: { callbacks: { label: (ctx) => `${number(ctx.raw)} ${metric.shortLabel}` } } } } });
  }
  function updateTable(rows) {
    const metric = activeMetric(rows); const tableRows = [...rows].sort((a, b) => rowMetric(b, metric) - rowMetric(a, metric)).slice(0, 100); get("tableCount").textContent = `Showing ${number(Math.min(rows.length, 100))} of ${number(rows.length)} rows`;
    get("dataTableBody").innerHTML = tableRows.map((row) => `<tr data-player="${row.player_id}"><td><strong>${safe(row.player_display_name || row.player_name)}</strong></td><td>${row.team}</td><td>${row.opponent_team}</td><td>${row.position || "—"}</td><td>${row.season}</td><td>${row.week}</td><td>${row.home_away || "—"}</td><td class="result-${row.win_loss}">${row.win_loss}</td><td>${number(row.passing_yards)}</td><td>${number(row.rushing_yards)}</td><td>${number(row.receiving_yards)}</td><td>${number(row.def_tackles_solo)}</td><td>${number(row.def_sacks)}</td></tr>`).join("") || `<tr><td colspan="13">No rows match these filters.</td></tr>`;
    get("dataTableBody").querySelectorAll("tr[data-player]").forEach((tr) => tr.addEventListener("click", () => { get("playerFilter").value = tr.dataset.player; applyFilters(); showProfile(tr.dataset.player); }));
  }
  function showProfile(playerId) {
    const player = playerById()[playerId]; if (!player) { get("playerProfile").innerHTML = `<div class="profile-placeholder"><span class="profile-icon">+</span><div><strong>Select a player from the filter or table</strong><p>The player’s headshot, team colors, position, and selected statistics will appear here.</p></div></div>`; return; }
    const context = matchupRows(state.filtered); const rows = context.primary.filter((row) => row.player_id === playerId); const games = gameCount(rows); const totals = statTotals(rows); const metric = activeMetric(rows); const focusValue = metricValue(totals, metric); const opponentPlayer = playerProduction(context.opponent).filter((item) => item.games).map((item) => ({ ...item, total: metricValue(item, metric), perGame: perGame(metricValue(item, metric), item.games) })).sort((a, b) => b.perGame - a.perGame)[0]; const image = player.headshot_url || ""; const unit = rows.length ? unitForRow(rows[0]) : "—"; const edge = context.matched && opponentPlayer ? perGame(focusValue, games) - opponentPlayer.perGame : 0; const edgeText = context.matched && opponentPlayer ? `${edge >= 0 ? "+" : ""}${decimal(edge)}` : "—";
    get("playerProfile").innerHTML = `<div class="profile-content"><img src="${image}" alt="Headshot of ${player.player_display_name}" onerror="this.style.visibility='hidden'" /><div><p class="section-kicker">PLAYER SPOTLIGHT</p><h2>${player.player_display_name}</h2><div class="profile-meta"><span>${player.position || "Unknown position"}</span><span>${unit}</span><span>${unique(rows.map((row) => row.team)).join(", ") || "Multiple teams"}</span></div></div><div class="profile-stats"><div class="profile-stat"><strong>${number(focusValue)}</strong><span>${metric.label}</span></div><div class="profile-stat"><strong>${decimal(perGame(focusValue, games))}</strong><span>${metric.perGameLabel}</span></div><div class="profile-stat"><strong>${opponentPlayer ? number(opponentPlayer.total) : "—"}</strong><span>${context.matched ? `${context.opponentTeam} · ${opponentPlayer?.label || "opposing player"} · ${metric.label}` : "Opposing player"}</span></div><div class="profile-stat"><strong>${edgeText}</strong><span>${context.matched ? "Per-game matchup edge" : "Select an opponent"}</span></div></div></div>`;
  }
  function updateView() { updateSummary(state.filtered); updateCharts(state.filtered); updateTable(state.filtered); get("filterStatus").textContent = `${number(state.filtered.length)} rows · ${number(gameCount(state.filtered))} games`; }
  function reset() { ["seasonFilter", "teamFilter", "opponentFilter", "homeAwayFilter", "positionGroupFilter", "positionFilter", "playerFilter"].forEach((id) => get(id).value = "all"); showProfile(""); applyFilters(); }

  try {
    const [csvText, teams, players] = await Promise.all([fetch("data/panel.csv").then((r) => r.text()), fetch("data/teams.json").then((r) => r.json()), fetch("data/players.json").then((r) => r.json())]);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    parsed.forEach((row) => csvNumberFields.forEach((field) => row[field] = Number(row[field] || 0)));
    state.rows = parsed; state.teams = teams; state.players = players;
    fillSelect("seasonFilter", unique(state.rows.map((r) => r.season)), (v) => v); fillSelect("teamFilter", unique(state.rows.map((r) => r.team))); fillSelect("opponentFilter", unique(state.rows.map((r) => r.opponent_team))); fillSelect("homeAwayFilter", unique(state.rows.map((r) => r.home_away)), (v) => v, "All locations"); fillSelect("positionGroupFilter", unique(state.rows.map(unitForRow)), (v) => v, "All units"); fillSelect("positionFilter", unique(state.rows.map((r) => r.position))); fillSelect("playerFilter", state.players.map((p) => p.player_id), (v) => { const p = playerById()[v]; return p ? `${p.player_display_name} · ${p.position || ""}` : v; });
    ["seasonFilter", "teamFilter", "opponentFilter", "homeAwayFilter", "positionGroupFilter", "positionFilter", "playerFilter"].forEach((id) => get(id).addEventListener("change", applyFilters)); get("resetFilters").addEventListener("click", reset);
    applyFilters();
  } catch (error) { get("filterStatus").textContent = "Could not load data"; console.error(error); }
})();
