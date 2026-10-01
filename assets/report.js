(async function () {
  const nf = new Intl.NumberFormat("en-US");
  const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const number = (value) => nf.format(Math.round(Number(value || 0)));
  const decimal = (value) => oneDecimal.format(Number(value || 0));
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const palette = ["#003b7a", "#d71920", "#f28c28", "#1f8a70", "#526074", "#7b61a8", "#1982c4", "#b45f06", "#3a506b", "#6a994e"];
  const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: {} } }, scales: { x: { grid: { display: false }, ticks: { color: "#526074" } }, y: { grid: { color: "#e7ebf2" }, ticks: { color: "#526074" } } } };
  const makeChart = (id, config) => new Chart(document.getElementById(id), config);

  try {
    const [stats, metadata] = await Promise.all([fetch("data/report_stats.json").then((r) => r.json()), fetch("data/metadata.json").then((r) => r.json())]);
    const o = stats.overview;
    document.querySelectorAll('[data-report="rows"]').forEach((el) => el.textContent = number(o.rows));
    document.querySelectorAll('[data-report="games"]').forEach((el) => el.textContent = number(o.games));
    document.querySelectorAll('[data-report="teams"]').forEach((el) => el.textContent = number(o.teams));
    document.querySelectorAll('[data-report="players"]').forEach((el) => el.textContent = number(o.players));
    set("report-generated", `${metadata.seasons.join(" · ")} · ${number(o.rows)} verified rows`);

    const topTeam = stats.team_win_rate[0];
    set("top-team-name", topTeam.team); set("top-team-wins", number(topTeam.wins)); set("top-team-games", number(topTeam.games)); set("top-team-rate", pct(topTeam.win_rate));
    const trend = stats.season_trend; const peak = trend.reduce((a, b) => a.points_per_team_game > b.points_per_team_game ? a : b); const avg = trend.reduce((sum, row) => sum + Number(row.points_per_team_game), 0) / trend.length;
    set("trend-average", decimal(avg)); set("trend-peak-season", peak.season);
    const topOffense = stats.team_offense.reduce((a, b) => a.offensive_yards > b.offensive_yards ? a : b); set("offense-team-season", `${topOffense.team} (${topOffense.season})`);
    const topDefense = stats.team_defense.reduce((a, b) => a.defensive_takeaways_pressure > b.defensive_takeaways_pressure ? a : b); set("defense-team-season", `${topDefense.team} (${topDefense.season})`);
    const topPosition = stats.position_production[0]; set("top-position", topPosition.position_group);
    const topQb = stats.quarterbacks[0]; set("top-quarterback", topQb.player_display_name);
    const topStyle = stats.passing_share[0]; set("pass-heavy-team", topStyle.team);
    const home = stats.home_away.find((row) => row.home_away === "Home"); set("home-win-rate", pct(home.win_rate));

    makeChart("seasonTrendChart", { type: "line", data: { labels: trend.map((d) => d.season), datasets: [{ data: trend.map((d) => d.points_per_team_game), borderColor: "#003b7a", backgroundColor: "rgba(0,59,122,.12)", fill: true, tension: .35, pointRadius: 5, pointBackgroundColor: "#d71920" }] }, options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} points per team-game` } } } } });
    makeChart("teamWinChart", { type: "bar", data: { labels: stats.team_win_rate.map((d) => d.team), datasets: [{ data: stats.team_win_rate.map((d) => d.win_rate * 100), backgroundColor: stats.team_win_rate.map((_, i) => palette[i % palette.length]), borderRadius: 3 }] }, options: { ...chartDefaults, indexAxis: "y", scales: { x: { ...chartDefaults.scales.y, ticks: { callback: (v) => `${v}%` } }, y: { ...chartDefaults.scales.x } }, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)}% wins` } } } } });
    const offense = stats.team_offense.slice(0, 10).reverse();
    makeChart("offenseChart", { type: "bar", data: { labels: offense.map((d) => `${d.team} · ${d.season}`), datasets: [{ label: "Passing yards", data: offense.map((d) => d.passing_yards), backgroundColor: "#003b7a" }, { label: "Rushing yards", data: offense.map((d) => d.rushing_yards), backgroundColor: "#f28c28" }] }, options: { ...chartDefaults, plugins: { legend: { display: true, position: "bottom" }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${number(ctx.raw)}` } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: "#e7ebf2" } } } } });
    const defense = stats.team_defense.slice(0, 10).reverse();
    makeChart("defenseChart", { type: "bar", data: { labels: defense.map((d) => `${d.team} · ${d.season}`), datasets: [{ data: defense.map((d) => d.defensive_takeaways_pressure), backgroundColor: "#d71920", borderRadius: 3 }] }, options: { ...chartDefaults, indexAxis: "y", plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${number(ctx.raw)} sacks + interceptions` } } } } });
    const positions = stats.position_production.slice(0, 8).reverse();
    makeChart("positionChart", { type: "bar", data: { labels: positions.map((d) => d.position_group), datasets: [{ label: "Passing", data: positions.map((d) => d.passing_yards), backgroundColor: "#003b7a" }, { label: "Rushing", data: positions.map((d) => d.rushing_yards), backgroundColor: "#f28c28" }, { label: "Receiving", data: positions.map((d) => d.receiving_yards), backgroundColor: "#1f8a70" }] }, options: { ...chartDefaults, indexAxis: "y", plugins: { legend: { display: true, position: "bottom" } }, scales: { x: { stacked: true, grid: { color: "#e7ebf2" } }, y: { stacked: true, grid: { display: false } } } } });
    const qbs = stats.quarterbacks.filter((d) => Number.isFinite(Number(d.epa_per_attempt))).slice(0, 8).reverse();
    makeChart("qbChart", { type: "bar", data: { labels: qbs.map((d) => d.player_display_name), datasets: [{ data: qbs.map((d) => Number(d.epa_per_attempt)), backgroundColor: "#003b7a", borderRadius: 3 }] }, options: { ...chartDefaults, indexAxis: "y", scales: { x: { ...chartDefaults.scales.x, beginAtZero: true, ticks: { callback: (v) => Number(v).toFixed(2) } }, y: { ...chartDefaults.scales.y } }, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${Number(ctx.raw).toFixed(3)} EPA/attempt` } } } } });
    const styles = stats.passing_share.slice(0, 10).reverse();
    makeChart("styleChart", { type: "bar", data: { labels: styles.map((d) => d.team), datasets: [{ data: styles.map((d) => d.passing_share * 100), backgroundColor: "#7b61a8", borderRadius: 3 }] }, options: { ...chartDefaults, indexAxis: "y", scales: { x: { ...chartDefaults.scales.y, ticks: { callback: (v) => `${v}%` } }, y: { ...chartDefaults.scales.x } }, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)}% passing yard share` } } } } });
    makeChart("homeAwayChart", { type: "bar", data: { labels: stats.home_away.map((d) => d.home_away), datasets: [{ data: stats.home_away.map((d) => d.win_rate * 100), backgroundColor: ["#003b7a", "#d71920"], borderRadius: 3 }] }, options: { ...chartDefaults, scales: { x: { grid: { display: false } }, y: { ...chartDefaults.scales.y, ticks: { callback: (v) => `${v}%` } } }, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)}% win rate` } } } } });
  } catch (error) {
    document.body.insertAdjacentHTML("beforeend", `<div class="load-error">Report data could not be loaded. Run the build script and serve the project over HTTP.</div>`);
    console.error(error);
  }
})();
