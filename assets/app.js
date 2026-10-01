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
  function syncDependentFilters() {
    const season = val("seasonFilter");
    const team = val("teamFilter");
    const opponent = val("opponentFilter");
    const group = val("positionGroupFilter");
    const position = val("positionFilter");
    const seasonRows = state.rows.filter((row) => season === "all" || String(row.season) === season);
    const opponentRows = seasonRows.filter((row) => team === "all" || row.team === team);
    fillSelect("opponentFilter", unique(opponentRows.map((row) => row.opponent_team)));

    const playerRows = seasonRows.filter((row) => (team === "all" || row.team === team) && (opponent === "all" || row.opponent_team === opponent) && (group === "all" || unitForRow(row) === group) && (position === "all" || row.position === position));
    const playerIds = unique(playerRows.map((row) => row.player_id));
    fillSelect("playerFilter", playerIds, (id) => {
      const player = playerById()[id];
      return player ? `${player.player_display_name} · ${player.position || ""}` : id;
    });
  }
  function applyFilters() {
    syncDependentFilters();
    const season = val("seasonFilter"), team = val("teamFilter"), opponent = val("opponentFilter"), group = val("positionGroupFilter"), position = val("positionFilter"), player = val("playerFilter");
    state.filtered = state.rows.filter((row) => (season === "all" || String(row.season) === season) && (team === "all" || row.team === team) && (opponent === "all" || row.opponent_team === opponent) && (group === "all" || unitForRow(row) === group) && (position === "all" || row.position === position) && (player === "all" || row.player_id === player));
    setTheme(team === "all" ? "" : team); updateView(); showProfile(player === "all" ? "" : player);
  }
  function aggregateTeamGames(rows) { const uniqueGames = new Map(); rows.forEach((row) => { const key = `${row.game_id}|${row.team}`; if (!uniqueGames.has(key)) uniqueGames.set(key, row); }); return [...uniqueGames.values()]; }
  function gameCount(rows) { return new Set(rows.map((row) => row.game_id)).size; }
  function sum(rows, field) { return rows.reduce((total, row) => total + Number(row[field] || 0), 0); }
  function statTotals(rows) { const passing = sum(rows, "passing_yards"); const rushing = sum(rows, "rushing_yards"); const receiving = sum(rows, "receiving_yards"); return { passing, rushing, receiving, offense: passing + rushing + receiving, tackles: sum(rows, "def_tackles_solo"), sacks: sum(rows, "def_sacks"), interceptions: sum(rows, "def_interceptions"), fantasy: sum(rows, "fantasy_points"), penalties: sum(rows, "penalties"), penaltyYards: sum(rows, "penalty_yards") }; }
  function perGame(value, games) { return games ? Number(value || 0) / games : 0; }
  function activeMetric(rows) {
    const totals = statTotals(rows); const unit = val("positionGroupFilter"); const position = val("positionFilter");
    if (unit === "Defense" || (unit === "all" && totals.offense === 0 && (totals.tackles || totals.sacks || totals.interceptions))) return { mode: "defense", field: "def_tackles_solo", label: "Solo tackles", shortLabel: "tackles", perGameLabel: "Tackles / game" };
    if (unit === "Special teams" || (unit === "all" && totals.offense === 0 && totals.fantasy)) return { mode: "special", field: "fantasy_points", label: "Fantasy points", shortLabel: "fantasy points", perGameLabel: "Fantasy points / game" };
    if (position === "QB" || totals.passing > 0) return { mode: "passing", field: "passing_yards", label: "Passing yards", shortLabel: "passing yards", perGameLabel: "Passing yards / game" };
    if (position === "WR" || position === "TE" || totals.receiving >= totals.rushing) return { mode: "receiving", field: "receiving_yards", label: "Receiving yards", shortLabel: "receiving yards", perGameLabel: "Receiving yards / game" };
    return { mode: "rushing", field: "rushing_yards", label: "Rushing yards", shortLabel: "rushing yards", perGameLabel: "Rushing yards / game" };
  }
  function rowMetric(row, metric) { return Number(row[metric.field] || 0); }
  function playerProduction(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
      const id = row.player_id; if (!grouped.has(id)) grouped.set(id, { id, label: row.player_display_name || row.player_name, games: new Set(), passing: 0, rushing: 0, receiving: 0, tackles: 0, sacks: 0, fantasy: 0 });
      const item = grouped.get(id); item.games.add(row.game_id); item.passing += Number(row.passing_yards || 0); item.rushing += Number(row.rushing_yards || 0); item.receiving += Number(row.receiving_yards || 0); item.tackles += Number(row.def_tackles_solo || 0); item.sacks += Number(row.def_sacks || 0); item.fantasy += Number(row.fantasy_points || 0);
    });
    return [...grouped.values()].map((item) => ({ ...item, games: item.games.size, offense: item.passing + item.rushing + item.receiving }));
  }
  function colors(n) { const base = [getComputedStyle(document.documentElement).getPropertyValue("--team-primary").trim() || defaults.primary, getComputedStyle(document.documentElement).getPropertyValue("--team-secondary").trim() || defaults.secondary, "#f28c28", "#1f8a70", "#7b61a8", "#1982c4", "#526074", "#b45f06"]; return Array.from({ length: n }, (_, i) => base[i % base.length]); }
  function baseOptions(indexAxis = "x") { return { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: {} } }, scales: { x: { grid: { display: indexAxis === "y" }, ticks: { color: "#526074" } }, y: { grid: { display: indexAxis !== "y", color: "#e7ebf2" }, ticks: { color: "#526074" } } } }; }
  function destroyChart(name) { if (state.charts[name]) state.charts[name].destroy(); }
  function makeOrUpdateChart(name, id, config) { destroyChart(name); state.charts[name] = new Chart(get(id), config); }

  function updateSummary(rows) {
    const totals = statTotals(rows); const games = gameCount(rows); const metric = activeMetric(rows); const values = metric.mode === "defense" ? [["SOLO TACKLES", totals.tackles, "total in view"], ["TACKLES / GAME", perGame(totals.tackles, games), `${number(games)} games`], ["SACKS", totals.sacks, "total in view"], ["DEF. INTERCEPTIONS", totals.interceptions, "total in view"]] : metric.mode === "special" ? [["FANTASY POINTS", totals.fantasy, "total in view"], ["FANTASY POINTS / GAME", perGame(totals.fantasy, games), `${number(games)} games`], ["PENALTIES", totals.penalties, "total in view"], ["PENALTY YARDS", totals.penaltyYards, "total in view"]] : [[metric.label.toUpperCase(), totals[metric.mode], "total in view"], [metric.perGameLabel.toUpperCase(), perGame(totals[metric.mode], games), `${number(games)} games`], [metric.mode === "passing" ? "RUSHING YARDS" : "RECEIVING YARDS", metric.mode === "passing" ? totals.rushing : totals.receiving, "total in view"], ["TOTAL OFFENSIVE YARDS", totals.offense, "passing + rushing + receiving"]];
    values.forEach((item, index) => { get(`summaryLabel${index + 1}`).textContent = item[0]; get(`summaryValue${index + 1}`).textContent = rows.length ? decimal(item[1]) : "—"; get(`summaryNote${index + 1}`).textContent = item[2]; });
  }
  function updateCharts(rows) {
    const metric = activeMetric(rows); const seasons = new Map();
    rows.forEach((row) => { if (!seasons.has(row.season)) seasons.set(row.season, { season: row.season, games: new Set(), passing: 0, rushing: 0, receiving: 0, tackles: 0, sacks: 0, interceptions: 0, fantasy: 0 }); const item = seasons.get(row.season); item.games.add(row.game_id); item.passing += Number(row.passing_yards || 0); item.rushing += Number(row.rushing_yards || 0); item.receiving += Number(row.receiving_yards || 0); item.tackles += Number(row.def_tackles_solo || 0); item.sacks += Number(row.def_sacks || 0); item.interceptions += Number(row.def_interceptions || 0); item.fantasy += Number(row.fantasy_points || 0); });
    const bySeason = [...seasons.values()].sort((a, b) => Number(a.season) - Number(b.season)); const seasonLabels = bySeason.map((item) => item.season); const datasets = metric.mode === "defense" ? [{ label: "Tackles / game", data: bySeason.map((item) => perGame(item.tackles, item.games.size)), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--team-primary") }, { label: "Sacks / game", data: bySeason.map((item) => perGame(item.sacks, item.games.size)), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--team-secondary") }, { label: "Interceptions / game", data: bySeason.map((item) => perGame(item.interceptions, item.games.size)), backgroundColor: "#f28c28" }] : metric.mode === "special" ? [{ label: "Fantasy points / game", data: bySeason.map((item) => perGame(item.fantasy, item.games.size)), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--team-primary") }] : [{ label: "Passing yards / game", data: bySeason.map((item) => perGame(item.passing, item.games.size)), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--team-primary") }, { label: "Rushing yards / game", data: bySeason.map((item) => perGame(item.rushing, item.games.size)), backgroundColor: "#f28c28" }, { label: "Receiving yards / game", data: bySeason.map((item) => perGame(item.receiving, item.games.size)), backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--team-secondary") }];
    get("trendTitle").textContent = metric.mode === "defense" ? "Defensive production per game" : metric.mode === "special" ? "Special teams production per game" : "Offensive yards per game"; get("trendNote").textContent = `${number(gameCount(rows))} games in view`;
    makeOrUpdateChart("trend", "trendChart", { type: "bar", data: { labels: seasonLabels, datasets }, options: { ...baseOptions(), scales: { x: { stacked: true, grid: { display: false }, ticks: { color: "#526074" } }, y: { stacked: true, beginAtZero: true, grid: { color: "#e7ebf2" }, ticks: { color: "#526074" } } }, plugins: { ...baseOptions().plugins, legend: { display: true, position: "bottom", labels: { usePointStyle: true } }, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} ${ctx.dataset.label.toLowerCase()}` } } } } });
    const players = playerProduction(rows).filter((item) => item.games).map((item) => ({ ...item, perGame: metric.mode === "defense" ? perGame(item.tackles, item.games) : metric.mode === "special" ? perGame(item.fantasy, item.games) : perGame(item[metric.mode], item.games) })).sort((a, b) => b.perGame - a.perGame); const byPlayer = players.slice(0, 10).reverse();
    get("breakdownTitle").textContent = `${metric.label} per game by player`; get("breakdownNote").textContent = "Top 10 in current view";
    makeOrUpdateChart("breakdown", "breakdownChart", { type: "bar", data: { labels: byPlayer.map((item) => item.label), datasets: [{ label: metric.perGameLabel, data: byPlayer.map((item) => item.perGame), backgroundColor: colors(byPlayer.length), borderRadius: 3 }] }, options: { ...baseOptions("y"), indexAxis: "y", plugins: { ...baseOptions("y").plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} ${metric.perGameLabel.toLowerCase()}` } } } } });
    const outcomes = ["W", "L", "T"].map((result) => ({ label: result, value: teamGamesCount(rows, result) })).filter((item) => item.value); get("outcomeTitle").textContent = "Win-loss record in view";
    makeOrUpdateChart("outcome", "outcomeChart", { type: "doughnut", data: { labels: outcomes.map((item) => item.label), datasets: [{ data: outcomes.map((item) => item.value), backgroundColor: ["#1f8a70", "#d71920", "#526074"], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "67%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true } } } } });
    const leaders = players.slice(0, 10).reverse(); get("leaderboardTitle").textContent = `Top players by ${metric.shortLabel}`; get("leaderboardNote").textContent = "Total production in current view";
    makeOrUpdateChart("leaderboard", "leaderboardChart", { type: "bar", data: { labels: leaders.map((item) => item.label), datasets: [{ label: metric.label, data: leaders.map((item) => metric.mode === "defense" ? item.tackles : metric.mode === "special" ? item.fantasy : item[metric.mode]), backgroundColor: colors(leaders.length), borderRadius: 3 }] }, options: { ...baseOptions("y"), indexAxis: "y", plugins: { ...baseOptions("y").plugins, tooltip: { callbacks: { label: (ctx) => `${number(ctx.raw)} ${metric.shortLabel}` } } } } });
  }
  function teamGamesCount(rows, result) { return aggregateTeamGames(rows).filter((row) => row.win_loss === result).length; }
  function updateTable(rows) {
    const metric = activeMetric(rows); const tableRows = [...rows].sort((a, b) => rowMetric(b, metric) - rowMetric(a, metric)).slice(0, 100); get("tableCount").textContent = `Showing ${number(Math.min(rows.length, 100))} of ${number(rows.length)} rows`;
    get("dataTableBody").innerHTML = tableRows.map((row) => `<tr data-player="${row.player_id}"><td><strong>${safe(row.player_display_name || row.player_name)}</strong></td><td>${row.team}</td><td>${row.opponent_team}</td><td>${row.position || "—"}</td><td>${row.season}</td><td>${row.week}</td><td class="result-${row.win_loss}">${row.win_loss}</td><td>${number(row.passing_yards)}</td><td>${number(row.rushing_yards)}</td><td>${number(row.receiving_yards)}</td><td>${number(row.def_tackles_solo)}</td><td>${number(row.def_sacks)}</td></tr>`).join("") || `<tr><td colspan="12">No rows match these filters.</td></tr>`;
    get("dataTableBody").querySelectorAll("tr[data-player]").forEach((tr) => tr.addEventListener("click", () => { get("playerFilter").value = tr.dataset.player; applyFilters(); showProfile(tr.dataset.player); }));
  }
  function showProfile(playerId) {
    const player = playerById()[playerId]; if (!player) { get("playerProfile").innerHTML = `<div class="profile-placeholder"><span class="profile-icon">+</span><div><strong>Select a player from the filter or table</strong><p>The player’s headshot, team colors, position, and selected statistics will appear here.</p></div></div>`; return; }
    const rows = state.filtered.filter((row) => row.player_id === playerId); const games = gameCount(rows); const totals = statTotals(rows); const metric = activeMetric(rows); const focusValue = metric.mode === "defense" ? totals.tackles : metric.mode === "special" ? totals.fantasy : totals[metric.mode]; const image = player.headshot_url || "";
    const unit = rows.length ? unitForRow(rows[0]) : "—";
    get("playerProfile").innerHTML = `<div class="profile-content"><img src="${image}" alt="Headshot of ${player.player_display_name}" onerror="this.style.visibility='hidden'" /><div><p class="section-kicker">PLAYER SPOTLIGHT</p><h2>${player.player_display_name}</h2><div class="profile-meta"><span>${player.position || "Unknown position"}</span><span>${unit}</span><span>${unique(rows.map((row) => row.team)).join(", ") || "Multiple teams"}</span></div></div><div class="profile-stats"><div class="profile-stat"><strong>${number(focusValue)}</strong><span>${metric.label}</span></div><div class="profile-stat"><strong>${decimal(perGame(focusValue, games))}</strong><span>${metric.perGameLabel}</span></div><div class="profile-stat"><strong>${number(totals.offense)}</strong><span>Offensive yards</span></div><div class="profile-stat"><strong>${number(totals.sacks)}</strong><span>Sacks</span></div></div></div>`;
  }
  function updateView() { updateSummary(state.filtered); updateCharts(state.filtered); updateTable(state.filtered); get("filterStatus").textContent = `${number(state.filtered.length)} rows · ${number(gameCount(state.filtered))} games`; }
  function reset() { ["seasonFilter", "teamFilter", "opponentFilter", "positionGroupFilter", "positionFilter", "playerFilter"].forEach((id) => get(id).value = "all"); showProfile(""); applyFilters(); }

  try {
    const [csvText, teams, players] = await Promise.all([fetch("data/panel.csv").then((r) => r.text()), fetch("data/teams.json").then((r) => r.json()), fetch("data/players.json").then((r) => r.json())]);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    parsed.forEach((row) => csvNumberFields.forEach((field) => row[field] = Number(row[field] || 0)));
    state.rows = parsed; state.teams = teams; state.players = players;
    fillSelect("seasonFilter", unique(state.rows.map((r) => r.season)), (v) => v); fillSelect("teamFilter", unique(state.rows.map((r) => r.team))); fillSelect("opponentFilter", unique(state.rows.map((r) => r.opponent_team))); fillSelect("positionGroupFilter", unique(state.rows.map(unitForRow)), (v) => v, "All units"); fillSelect("positionFilter", unique(state.rows.map((r) => r.position))); fillSelect("playerFilter", state.players.map((p) => p.player_id), (v) => { const p = playerById()[v]; return p ? `${p.player_display_name} · ${p.position || ""}` : v; });
    ["seasonFilter", "teamFilter", "opponentFilter", "positionGroupFilter", "positionFilter", "playerFilter"].forEach((id) => get(id).addEventListener("change", applyFilters)); get("resetFilters").addEventListener("click", reset);
    applyFilters();
  } catch (error) { get("filterStatus").textContent = "Could not load data"; console.error(error); }
})();
