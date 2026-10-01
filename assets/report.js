(async function () {
  const nf = new Intl.NumberFormat("en-US");
  const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const number = (value) => nf.format(Math.round(Number(value || 0)));
  const decimal = (value) => oneDecimal.format(Number(value || 0));
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const colors = {
    navy: "#013369",
    navyDark: "#071d34",
    red: "#d50a0a",
    sky: "#74b9e8",
    gold: "#f2b134",
    mint: "#49a078",
    slate: "#526074",
    grid: "#dce5ef",
  };
  const palette = [colors.navy, colors.red, colors.sky, colors.gold, colors.mint, "#8b6fb3", "#f28c28", "#567d9a", "#b45f06", "#6a994e"];
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false, labels: { color: colors.navyDark, usePointStyle: true, padding: 18 } },
      tooltip: { callbacks: {} },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: colors.slate, font: { family: "DM Sans" } } },
      y: { grid: { color: colors.grid }, ticks: { color: colors.slate, font: { family: "DM Sans" } } },
    },
  };
  const charts = {};
  const makeChart = (id, config) => {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), config);
    return charts[id];
  };
  const pointColor = (rate) => {
    const value = Number(rate || 0);
    if (value >= .65) return colors.red;
    if (value >= .5) return colors.navy;
    return colors.sky;
  };

  function renderPulse(trend) {
    const select = document.getElementById("pulseSeason");
    const line = document.querySelector(".pulse-line");
    const area = document.querySelector(".pulse-area");
    const pointGroup = document.querySelector(".pulse-points");
    const gridGroup = document.querySelector(".pulse-grid-lines");
    if (!select || !line || !area || !pointGroup || !gridGroup) return;

    if (select.options.length === 1) {
      trend.forEach((row) => select.insertAdjacentHTML("beforeend", `<option value="${row.season}">${row.season} season</option>`));
    }
    const chosen = select.value === "all" ? trend : trend.filter((row) => String(row.season) === select.value);
    const data = chosen.length ? chosen : trend;
    const min = Math.min(...trend.map((row) => Number(row.points_per_team_game))) - 1;
    const max = Math.max(...trend.map((row) => Number(row.points_per_team_game))) + 1;
    const left = 42; const right = 756; const top = 22; const bottom = 198;
    const x = (index) => data.length === 1 ? (left + right) / 2 : left + (index * (right - left) / (data.length - 1));
    const y = (value) => bottom - ((Number(value) - min) / (max - min)) * (bottom - top);
    const points = data.map((row, index) => [x(index), y(row.points_per_team_game), row]);
    const path = points.map(([px, py], index) => `${index ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
    const areaPath = `${path} L ${points.at(-1)[0].toFixed(1)} ${bottom} L ${points[0][0].toFixed(1)} ${bottom} Z`;
    line.setAttribute("d", path); area.setAttribute("d", areaPath);
    line.style.strokeDasharray = "1200"; line.style.strokeDashoffset = "0";
    area.style.opacity = "1";
    gridGroup.innerHTML = [0, 1, 2, 3].map((step) => {
      const value = min + ((max - min) * step / 3);
      const py = y(value);
      return `<line x1="${left}" y1="${py}" x2="${right}" y2="${py}"></line><text x="0" y="${py + 4}">${decimal(value)}</text>`;
    }).join("");
    pointGroup.innerHTML = points.map(([px, py, row]) => `<g class="pulse-point" data-season="${row.season}"><circle cx="${px}" cy="${py}" r="${select.value === String(row.season) ? 9 : 6}"></circle><text x="${px}" y="${bottom + 28}" text-anchor="middle">${row.season}</text></g>`).join("");
    const focus = select.value === "all" ? data.at(-1) : data[0];
    set("pulseReadout", `${focus.season}: ${decimal(focus.points_per_team_game)} points per team-game`);
    set("pulseMeta", `${number(focus.games)} games · ${number(focus.points_for)} points scored`);
    set("pulseFootnote", select.value === "all" ? "The red line follows the league’s five-season rhythm." : `${focus.season} is spotlighted. Choose another season or play the pulse.`);
  }

  function startPulse(trend) {
    const stage = document.getElementById("pulseStage");
    const button = document.getElementById("pulsePlay");
    if (!stage || !button) return;
    stage.classList.remove("is-playing");
    void stage.offsetWidth;
    stage.classList.add("is-playing");
    button.innerHTML = '<span aria-hidden="true">↻</span> Pulse replaying';
    window.setTimeout(() => { stage.classList.remove("is-playing"); button.innerHTML = '<span aria-hidden="true">▶</span> Play pulse'; }, 1650);
    const select = document.getElementById("pulseSeason");
    if (select.value === "all") {
      const line = document.querySelector(".pulse-line");
      line.style.strokeDashoffset = "1200";
      window.setTimeout(() => { line.style.strokeDashoffset = "0"; }, 40);
    }
    renderPulse(trend);
  }

  try {
    const [stats, metadata] = await Promise.all([
      fetch("data/report_stats.json").then((response) => response.json()),
      fetch("data/metadata.json").then((response) => response.json()),
    ]);
    const overview = stats.overview;
    document.querySelectorAll('[data-report="rows"]').forEach((el) => el.textContent = number(overview.rows));
    document.querySelectorAll('[data-report="games"]').forEach((el) => el.textContent = number(overview.games));
    document.querySelectorAll('[data-report="teams"]').forEach((el) => el.textContent = number(overview.teams));
    document.querySelectorAll('[data-report="players"]').forEach((el) => el.textContent = number(overview.players));
    set("report-generated", `${metadata.seasons.join(" · ")} · ${number(overview.rows)} verified rows`);

    const trend = stats.season_trend;
    const peak = trend.reduce((a, b) => Number(a.points_per_team_game) > Number(b.points_per_team_game) ? a : b);
    const average = trend.reduce((sum, row) => sum + Number(row.points_per_team_game), 0) / trend.length;
    set("trend-average", decimal(average)); set("trend-peak-season", peak.season);

    const topTeam = stats.team_win_rate[0];
    set("top-team-name", topTeam.team); set("top-team-wins", number(topTeam.wins)); set("top-team-games", number(topTeam.games)); set("top-team-rate", pct(topTeam.win_rate));
    const topOffense = stats.team_offense[0]; set("offense-team-season", `${topOffense.team} (${topOffense.season})`);
    const topDefense = stats.team_defense[0]; set("defense-team-season", `${topDefense.team} (${topDefense.season})`);
    const topPosition = stats.position_production[0]; set("top-position", topPosition.position_group);
    const topQb = stats.quarterbacks[0]; set("top-quarterback", topQb.player_display_name);
    const topStyle = stats.passing_share[0]; set("pass-heavy-team", topStyle.team);
    const home = stats.home_away.find((row) => row.home_away === "Home");
    const away = stats.home_away.find((row) => row.home_away === "Away");
    set("home-win-rate", pct(home.win_rate)); set("home-edge", decimal((home.win_rate - away.win_rate) * 100));

    renderPulse(trend);
    document.getElementById("pulseSeason")?.addEventListener("change", () => renderPulse(trend));
    document.getElementById("pulsePlay")?.addEventListener("click", () => startPulse(trend));

    makeChart("seasonTrendChart", {
      type: "line",
      data: { labels: trend.map((row) => row.season), datasets: [{ label: "Points per team-game", data: trend.map((row) => row.points_per_team_game), borderColor: colors.red, backgroundColor: "rgba(213,10,10,.13)", fill: true, tension: .35, borderWidth: 4, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: colors.navy, pointBorderColor: "#fff", pointBorderWidth: 3 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} points per team-game` } } }, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, beginAtZero: false, ticks: { callback: (value) => `${value}` } } } },
    });

    const winningTeams = stats.team_win_rate.slice(0, 8);
    makeChart("teamWinChart", {
      type: "doughnut",
      data: { labels: winningTeams.map((row) => row.team), datasets: [{ data: winningTeams.map((row) => row.wins), backgroundColor: palette.slice(0, winningTeams.length), borderColor: "#fff", borderWidth: 4, hoverOffset: 10 }] },
      options: { ...chartDefaults, cutout: "62%", plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${number(ctx.raw)} wins · ${pct(winningTeams[ctx.dataIndex].win_rate)}` } } } },
    });

    makeChart("offenseChart", {
      type: "scatter",
      data: { datasets: [{ label: "Team-seasons", data: stats.team_offense.map((row) => ({ x: Number(row.passing_yards), y: Number(row.rushing_yards), team: row.team, season: row.season, wins: row.wins, rate: row.win_rate })), backgroundColor: stats.team_offense.map((row) => pointColor(row.win_rate)), borderColor: "#fff", borderWidth: 1, pointRadius: stats.team_offense.map((row) => 4 + Math.min(6, Number(row.wins || 0) / 3)), pointHoverRadius: 10 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => { const raw = ctx.raw; return `${raw.team} ${raw.season}: ${number(raw.x)} pass yds · ${number(raw.y)} rush yds · ${raw.wins} wins`; } } } }, scales: { x: { ...chartDefaults.scales.x, title: { display: true, text: "Passing yards", color: colors.navyDark }, ticks: { callback: (value) => `${Math.round(value / 1000)}k` } }, y: { ...chartDefaults.scales.y, title: { display: true, text: "Rushing yards", color: colors.navyDark }, ticks: { callback: (value) => `${Math.round(value / 1000)}k` } } } },
    });

    const defensiveLeaders = stats.team_defense.slice(0, 5);
    makeChart("defenseChart", {
      type: "radar",
      data: { labels: ["Sacks", "Interceptions", "Win rate × 100"], datasets: defensiveLeaders.map((row, index) => ({ label: `${row.team} · ${row.season}`, data: [row.def_sacks, row.def_interceptions, Number(row.win_rate) * 100], borderColor: palette[index], backgroundColor: `${palette[index]}22`, pointBackgroundColor: palette[index], borderWidth: 2 })) },
      options: { ...chartDefaults, scales: { r: { beginAtZero: true, angleLines: { color: colors.grid }, grid: { color: colors.grid }, pointLabels: { color: colors.navyDark, font: { family: "Barlow Condensed", size: 12, weight: "700" } }, ticks: { display: false } } }, plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${decimal(ctx.raw)}` } } } },
    });

    const positions = stats.position_production.slice(0, 8);
    makeChart("positionChart", {
      type: "polarArea",
      data: { labels: positions.map((row) => row.position_group), datasets: [{ data: positions.map((row) => row.production_yards), backgroundColor: positions.map((_, index) => `${palette[index % palette.length]}cc`), borderColor: "#fff", borderWidth: 3 }] },
      options: { ...chartDefaults, scales: { r: { grid: { color: colors.grid }, ticks: { display: false } } }, plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${number(ctx.raw)} recorded yards` } } } },
    });

    const qbs = stats.quarterbacks.filter((row) => Number.isFinite(Number(row.epa_per_attempt))).slice(0, 10);
    makeChart("qbChart", {
      type: "bubble",
      data: { datasets: [{ label: "Qualified quarterbacks", data: qbs.map((row) => ({ x: Number(row.attempts), y: Number(row.epa_per_attempt), r: Math.max(5, Math.min(14, Number(row.passing_tds || 0) / 12)), name: row.player_display_name, touchdowns: row.passing_tds, yards: row.passing_yards })), backgroundColor: qbs.map((_, index) => `${palette[index % palette.length]}cc`), borderColor: "#fff", borderWidth: 2 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => { const raw = ctx.raw; return `${raw.name}: ${Number(raw.y).toFixed(3)} EPA/att · ${number(raw.x)} attempts · ${number(raw.touchdowns)} pass TDs`; } } } }, scales: { x: { ...chartDefaults.scales.x, title: { display: true, text: "Pass attempts", color: colors.navyDark }, beginAtZero: true }, y: { ...chartDefaults.scales.y, title: { display: true, text: "EPA per attempt", color: colors.navyDark }, ticks: { callback: (value) => Number(value).toFixed(2) } } } },
    });

    const styles = stats.passing_share.slice(0, 3).concat(stats.passing_share.slice(-2));
    const styleData = stats.team_style || [];
    makeChart("styleChart", {
      type: "line",
      data: { labels: trend.map((row) => row.season), datasets: styles.map((style, index) => ({ label: style.team, data: trend.map((season) => { const match = styleData.find((row) => row.team === style.team && Number(row.season) === Number(season.season)); return match ? Number(match.passing_share) * 100 : null; }), borderColor: palette[index], backgroundColor: "transparent", borderWidth: index === 0 ? 4 : 2, pointRadius: index === 0 ? 5 : 3, tension: .25, spanGaps: true })) },
      options: { ...chartDefaults, scales: { x: chartDefaults.scales.x, y: { ...chartDefaults.scales.y, min: 40, max: 80, ticks: { callback: (value) => `${value}%` } } }, plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${decimal(ctx.raw)}% of offensive yards through the air` } } } },
    });

    makeChart("homeAwayChart", {
      type: "radar",
      data: { labels: ["Win rate × 100", "Points for / game", "Point diff / game"], datasets: [{ label: "Home", data: [home.win_rate * 100, home.points_for_per_game, home.point_differential_per_game], borderColor: colors.navy, backgroundColor: "rgba(1,51,105,.18)", pointBackgroundColor: colors.navy, borderWidth: 3 }, { label: "Away", data: [away.win_rate * 100, away.points_for_per_game, away.point_differential_per_game], borderColor: colors.red, backgroundColor: "rgba(213,10,10,.12)", pointBackgroundColor: colors.red, borderWidth: 3 }] },
      options: { ...chartDefaults, scales: { r: { beginAtZero: true, angleLines: { color: colors.grid }, grid: { color: colors.grid }, pointLabels: { color: colors.navyDark, font: { family: "Barlow Condensed", size: 12, weight: "700" } }, ticks: { display: false } } }, plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${decimal(ctx.raw)}${ctx.dataIndex === 0 ? "%" : ""}` } } } },
    });
  } catch (error) {
    document.body.insertAdjacentHTML("beforeend", `<div class="load-error">Report data could not be loaded. Run the build script and serve the project over HTTP.</div>`);
    console.error(error);
  }
})();
