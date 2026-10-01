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
  function fillSelect(id, values, labeler = (v) => v) { const select = get(id); const current = select.value; const optionValues = values.map((v) => String(v)); select.innerHTML = `<option value="all">All ${id.replace("Filter", "").replace(/([A-Z])/g, " $1").toLowerCase()}</option>` + values.map((v) => `<option value="${String(v).replaceAll('"', '&quot;')}">${labeler(v)}</option>`).join(""); select.value = optionValues.includes(current) ? current : "all"; }
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
    const seasonRows = state.rows.filter((row) => season === "all" || String(row.season) === season);
    const opponentRows = seasonRows.filter((row) => team === "all" || row.team === team);
    fillSelect("opponentFilter", unique(opponentRows.map((row) => row.opponent_team)));

    const playerRows = seasonRows.filter((row) => team === "all" || row.team === team);
    const playerIds = unique(playerRows.map((row) => row.player_id));
    fillSelect("playerFilter", playerIds, (id) => {
      const player = playerById()[id];
      return player ? `${player.player_display_name} · ${player.position || ""}` : id;
    });
  }
  function applyFilters() {
    syncDependentFilters();
    const season = val("seasonFilter"), team = val("teamFilter"), opponent = val("opponentFilter"), group = val("positionGroupFilter"), position = val("positionFilter"), player = val("playerFilter");
    state.filtered = state.rows.filter((row) => (season === "all" || String(row.season) === season) && (team === "all" || row.team === team) && (opponent === "all" || row.opponent_team === opponent) && (group === "all" || row.position_group === group) && (position === "all" || row.position === position) && (player === "all" || row.player_id === player));
    setTheme(team === "all" ? "" : team); updateView();
  }
  function aggregateTeamGames(rows) { const uniqueGames = new Map(); rows.forEach((row) => { const key = `${row.game_id}|${row.team}`; if (!uniqueGames.has(key)) uniqueGames.set(key, row); }); return [...uniqueGames.values()]; }
  function measureValue(row, measure) { return measure === "rows" ? 1 : Number(row[measure] || 0); }
  function aggregate(rows, key, measure) { const grouped = new Map(); rows.forEach((row) => { const group = safe(row[key]); if (!grouped.has(group)) grouped.set(group, { label: group, value: 0, count: 0 }); const item = grouped.get(group); item.value += measureValue(row, measure); item.count += 1; }); return [...grouped.values()].sort((a, b) => b.value - a.value); }
  function colors(n) { const base = [getComputedStyle(document.documentElement).getPropertyValue("--team-primary").trim() || defaults.primary, getComputedStyle(document.documentElement).getPropertyValue("--team-secondary").trim() || defaults.secondary, "#f28c28", "#1f8a70", "#7b61a8", "#1982c4", "#526074", "#b45f06"]; return Array.from({ length: n }, (_, i) => base[i % base.length]); }
  function baseOptions(indexAxis = "x") { return { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: {} } }, scales: { x: { grid: { display: indexAxis === "y" }, ticks: { color: "#526074" } }, y: { grid: { display: indexAxis !== "y", color: "#e7ebf2" }, ticks: { color: "#526074" } } } }; }
  function destroyChart(name) { if (state.charts[name]) state.charts[name].destroy(); }
  function makeOrUpdateChart(name, id, config) { destroyChart(name); state.charts[name] = new Chart(get(id), config); }

  function updateSummary(rows, measure) {
    const games = aggregateTeamGames(rows); const wins = games.filter((row) => row.win_loss === "W").length; const points = games.reduce((sum, row) => sum + Number(row.team_score || 0), 0); const total = rows.reduce((sum, row) => sum + measureValue(row, measure), 0);
    get("summaryRows").textContent = number(rows.length); get("summaryWinRate").textContent = games.length ? pct(wins / games.length) : "—"; get("summaryPoints").textContent = games.length ? decimal(points / games.length) : "—"; get("summaryMeasure").textContent = number(total); get("summaryMeasureLabel").textContent = measureLabels[measure];
  }
  function updateCharts(rows, measure, breakdown) {
    const byTime = aggregate(rows, "season", measure).sort((a, b) => Number(a.label) - Number(b.label));
    makeOrUpdateChart("trend", "trendChart", { type: "line", data: { labels: byTime.map((d) => d.label), datasets: [{ data: byTime.map((d) => d.value), borderColor: getComputedStyle(document.documentElement).getPropertyValue("--team-primary"), backgroundColor: "rgba(0,59,122,.12)", fill: true, tension: .34, pointRadius: 5, pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--team-secondary") }] }, options: { ...baseOptions(), plugins: { ...baseOptions().plugins, tooltip: { callbacks: { label: (ctx) => `${number(ctx.raw)} ${measureLabels[measure].toLowerCase()}` } } } } });
    const byBreakdown = aggregate(rows, breakdown, measure).slice(0, 14).reverse();
    makeOrUpdateChart("breakdown", "breakdownChart", { type: "bar", data: { labels: byBreakdown.map((d) => d.label), datasets: [{ data: byBreakdown.map((d) => d.value), backgroundColor: colors(byBreakdown.length), borderRadius: 3 }] }, options: { ...baseOptions("y"), indexAxis: "y", plugins: { ...baseOptions("y").plugins, tooltip: { callbacks: { label: (ctx) => `${number(ctx.raw)} ${measureLabels[measure].toLowerCase()}` } } } } });
    const outcomes = ["W", "L", "T"].map((result) => ({ label: result, value: aggregateTeamGames(rows).filter((row) => row.win_loss === result).length })).filter((d) => d.value);
    makeOrUpdateChart("outcome", "outcomeChart", { type: "doughnut", data: { labels: outcomes.map((d) => d.label), datasets: [{ data: outcomes.map((d) => d.value), backgroundColor: ["#1f8a70", "#d71920", "#526074"], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "67%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true } } } } });
    const leaderboard = [...rows].sort((a, b) => measureValue(b, measure) - measureValue(a, measure)).slice(0, 10);
    makeOrUpdateChart("leaderboard", "leaderboardChart", { type: "bar", data: { labels: leaderboard.map((d) => d.player_display_name || d.player_name), datasets: [{ data: leaderboard.map((d) => measureValue(d, measure)), backgroundColor: colors(leaderboard.length), borderRadius: 3 }] }, options: { ...baseOptions("y"), indexAxis: "y", plugins: { ...baseOptions("y").plugins, tooltip: { callbacks: { label: (ctx) => `${number(ctx.raw)} ${measureLabels[measure].toLowerCase()}` } } } } });
  }
  function updateTable(rows, measure) {
    const tableRows = [...rows].sort((a, b) => measureValue(b, measure) - measureValue(a, measure)).slice(0, 100); get("tableCount").textContent = `Showing ${number(Math.min(rows.length, 100))} of ${number(rows.length)} rows`;
    get("dataTableBody").innerHTML = tableRows.map((row) => `<tr data-player="${row.player_id}"><td><strong>${safe(row.player_display_name || row.player_name)}</strong></td><td>${row.team}</td><td>${row.opponent_team}</td><td>${row.position || "—"}</td><td>${row.season}</td><td>${row.week}</td><td class="result-${row.win_loss}">${row.win_loss}</td><td>${number(measureValue(row, measure))}</td></tr>`).join("") || `<tr><td colspan="8">No rows match these filters.</td></tr>`;
    get("dataTableBody").querySelectorAll("tr[data-player]").forEach((tr) => tr.addEventListener("click", () => { get("playerFilter").value = tr.dataset.player; applyFilters(); showProfile(tr.dataset.player); }));
  }
  function showProfile(playerId) {
    const player = playerById()[playerId]; if (!player) { get("playerProfile").innerHTML = `<div class="profile-placeholder"><span class="profile-icon">+</span><div><strong>Select a player from the filter or table</strong><p>The player’s headshot, team colors, position, and selected statistics will appear here.</p></div></div>`; return; }
    const rows = state.rows.filter((row) => row.player_id === playerId); const games = new Set(rows.map((row) => row.game_id)).size; const yards = rows.reduce((sum, row) => sum + Number(row.passing_yards || 0) + Number(row.rushing_yards || 0) + Number(row.receiving_yards || 0), 0); const sacks = rows.reduce((sum, row) => sum + Number(row.def_sacks || 0), 0); const image = player.headshot_url || "";
    get("playerProfile").innerHTML = `<div class="profile-content"><img src="${image}" alt="Headshot of ${player.player_display_name}" onerror="this.style.visibility='hidden'" /><div><p class="section-kicker">PLAYER SPOTLIGHT</p><h2>${player.player_display_name}</h2><div class="profile-meta"><span>${player.position || "Unknown position"}</span><span>${player.position_group || "Unknown group"}</span><span>${player.team || "Multiple teams"}</span></div></div><div class="profile-stats"><div class="profile-stat"><strong>${number(games)}</strong><span>Games</span></div><div class="profile-stat"><strong>${number(yards)}</strong><span>Offensive yards</span></div><div class="profile-stat"><strong>${number(sacks)}</strong><span>Sacks</span></div></div></div>`;
  }
  function updateView() { const measure = val("measureSelect"), breakdown = val("breakdownSelect"); updateSummary(state.filtered, measure); updateCharts(state.filtered, measure, breakdown); updateTable(state.filtered, measure); get("filterStatus").textContent = `${number(state.filtered.length)} rows · ${number(new Set(state.filtered.map((r) => r.game_id)).size)} games`; }
  function reset() { ["seasonFilter", "teamFilter", "opponentFilter", "positionGroupFilter", "positionFilter", "playerFilter"].forEach((id) => get(id).value = "all"); get("measureSelect").value = "rows"; get("breakdownSelect").value = "season"; showProfile(""); applyFilters(); }

  try {
    const [csvText, teams, players] = await Promise.all([fetch("data/panel.csv").then((r) => r.text()), fetch("data/teams.json").then((r) => r.json()), fetch("data/players.json").then((r) => r.json())]);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    parsed.forEach((row) => csvNumberFields.forEach((field) => row[field] = Number(row[field] || 0)));
    state.rows = parsed; state.teams = teams; state.players = players;
    fillSelect("seasonFilter", unique(state.rows.map((r) => r.season)), (v) => v); fillSelect("teamFilter", unique(state.rows.map((r) => r.team))); fillSelect("opponentFilter", unique(state.rows.map((r) => r.opponent_team))); fillSelect("positionGroupFilter", unique(state.rows.map((r) => r.position_group))); fillSelect("positionFilter", unique(state.rows.map((r) => r.position))); fillSelect("playerFilter", state.players.map((p) => p.player_id), (v) => { const p = playerById()[v]; return p ? `${p.player_display_name} · ${p.position || ""}` : v; });
    ["seasonFilter", "teamFilter", "opponentFilter", "positionGroupFilter", "positionFilter", "playerFilter", "measureSelect", "breakdownSelect"].forEach((id) => get(id).addEventListener("change", applyFilters)); get("resetFilters").addEventListener("click", reset);
    applyFilters();
  } catch (error) { get("filterStatus").textContent = "Could not load data"; console.error(error); }
})();
