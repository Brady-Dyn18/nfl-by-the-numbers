(async function () {
  const nf = new Intl.NumberFormat("en-US");
  const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const number = (value) => nf.format(Math.round(Number(value || 0)));
  const decimal = (value) => oneDecimal.format(Number(value || 0));
  const formatUpdatedAt = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date); };
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
  function setupStoryMap() {
    const links = [...document.querySelectorAll(".story-map a")];
    const sections = links.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    if (!links.length || !sections.length) return;
    const activate = (id) => links.forEach((link) => link.classList.toggle("is-reading", link.getAttribute("href") === `#${id}`));
    activate(sections[0].id);
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) activate(entry.target.id); }), { rootMargin: "-18% 0px -68% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }
  const pointColor = (rate) => {
    const value = Number(rate || 0);
    if (value >= .65) return colors.red;
    if (value >= .5) return colors.navy;
    return colors.sky;
  };

  const qbPlays = {
    mesh: {
      situation: "Q3 · 04:42 · 2nd & 6",
      targets: {
        outside: { label: "X receiver · speed out", open: true, yards: 9, start: [350, 78], end: [560, 105], path: "M 350 78 C 430 78 485 95 560 105" },
        slot: { label: "Y receiver · shallow cross", open: true, yards: 14, start: [350, 135], end: [575, 185], path: "M 350 135 C 425 135 475 185 575 185" },
        tightEnd: { label: "Tight end · seam", open: false, yards: 0, start: [340, 176], end: [530, 205], path: "M 340 176 C 415 176 470 205 530 205" },
        back: { label: "Running back · checkdown", open: true, yards: 5, start: [320, 220], end: [450, 250], path: "M 320 220 C 370 220 410 250 450 250" },
      },
      defaultTarget: "slot",
    },
    fourVerticals: {
      situation: "Q2 · 08:16 · 1st & 10",
      targets: {
        outside: { label: "X receiver · go route", open: true, yards: 27, start: [350, 78], end: [660, 58], path: "M 350 78 C 450 52 560 52 660 58" },
        slot: { label: "Y receiver · seam", open: false, yards: 0, start: [350, 135], end: [640, 125], path: "M 350 135 C 445 112 550 122 640 125" },
        tightEnd: { label: "Tight end · seam", open: false, yards: 0, start: [340, 176], end: [635, 178], path: "M 340 176 C 450 160 550 175 635 178" },
        back: { label: "Running back · checkdown", open: true, yards: 4, start: [320, 220], end: [455, 258], path: "M 320 220 C 375 220 415 252 455 258" },
      },
      defaultTarget: "outside",
    },
    redZone: {
      situation: "Q4 · 02:08 · 3rd & goal",
      targets: {
        outside: { label: "X receiver · fade", open: false, yards: 0, start: [350, 78], end: [565, 88], path: "M 350 78 C 430 68 510 72 565 88" },
        slot: { label: "Y receiver · pivot", open: false, yards: 0, start: [350, 135], end: [570, 145], path: "M 350 135 C 435 120 515 150 570 145" },
        tightEnd: { label: "Tight end · stick nod", open: true, yards: 6, start: [340, 176], end: [580, 200], path: "M 340 176 C 430 176 505 205 580 200" },
        back: { label: "Running back · flat", open: true, yards: 3, start: [320, 220], end: [510, 245], path: "M 320 220 C 390 215 445 250 510 245" },
      },
      defaultTarget: "tightEnd",
    },
    screen: {
      situation: "Q1 · 11:34 · 2nd & 7",
      targets: {
        outside: { label: "X receiver · clear out", open: false, yards: 0, start: [350, 78], end: [500, 65], path: "M 350 78 C 400 65 455 62 500 65" },
        slot: { label: "Y receiver · block and release", open: false, yards: 0, start: [350, 135], end: [485, 115], path: "M 350 135 C 390 130 440 115 485 115" },
        tightEnd: { label: "Tight end · block", open: false, yards: 0, start: [340, 176], end: [455, 170], path: "M 340 176 L 455 170" },
        back: { label: "Running back · screen", open: true, yards: 18, start: [320, 220], end: [600, 255], path: "M 320 220 C 405 225 500 270 600 255" },
      },
      defaultTarget: "back",
    },
  };
  const qbState = { play: "mesh", target: "slot", running: false };

  setupStoryMap();

  function drawQbField() {
    const yardLines = document.querySelector(".qb-yard-lines");
    if (yardLines && !yardLines.innerHTML) {
      yardLines.innerHTML = [90, 180, 270, 360, 450, 540, 630, 690].map((x, index) => `<line x1="${x}" y1="18" x2="${x}" y2="288"></line><text x="${x + 4}" y="38">${index * 10}</text>`).join("");
    }
  }

  function renderQuarterbackPlay(qbName = "Quarterback") {
    const play = qbPlays[qbState.play];
    const targetSelect = document.getElementById("qbTargetSelect");
    const field = document.getElementById("qbField");
    if (!play || !targetSelect || !field) return;
    const current = play.targets[qbState.target] ? qbState.target : play.defaultTarget;
    qbState.target = current;
    targetSelect.innerHTML = Object.entries(play.targets).map(([key, target]) => `<option value="${key}">${target.label} · ${target.open ? "OPEN" : "COVERED"}</option>`).join("");
    targetSelect.value = current;
    const target = play.targets[current];
    const routeLayer = document.querySelector(".qb-route-lines");
    const coverageLayer = document.querySelector(".qb-coverage-dots");
    const offenseLayer = document.querySelector(".qb-offense-dots");
    const labelsLayer = document.querySelector(".qb-labels");
    drawQbField();
    routeLayer.innerHTML = Object.entries(play.targets).map(([key, item]) => `<path class="qb-route qb-route-${key} ${key === current ? "is-selected" : ""}" d="${item.path}"></path><circle class="qb-runner qb-target-${key}" cx="${item.start[0]}" cy="${item.start[1]}" r="9" style="--move-x:${item.end[0] - item.start[0]}px;--move-y:${item.end[1] - item.start[1]}px"></circle>`).join("");
    coverageLayer.innerHTML = Object.entries(play.targets).map(([key, item]) => { const coverX = item.open ? item.end[0] - 42 : item.end[0] - 8; const coverY = item.open ? item.end[1] + 34 : item.end[1] + 8; return `<circle class="qb-cover qb-cover-${key}" cx="${item.start[0] + 25}" cy="${item.start[1] + 8}" r="8" style="--move-x:${coverX - item.start[0] - 25}px;--move-y:${coverY - item.start[1] - 8}px"></circle>`; }).join("");
    offenseLayer.innerHTML = `<circle class="qb-lineman" cx="230" cy="142" r="10"></circle><circle class="qb-lineman" cx="230" cy="174" r="10"></circle><circle class="qb-lineman" cx="230" cy="206" r="10"></circle><circle class="qb-quarterback" cx="265" cy="174" r="12"></circle><circle class="qb-ball" cx="265" cy="174" r="7" style="--ball-x:${target.end[0] - 265}px;--ball-y:${target.end[1] - 174}px"></circle>`;
    labelsLayer.innerHTML = `<text class="qb-label qb-label-qb" x="244" y="159">${qbName}</text>${Object.entries(play.targets).map(([key, item]) => `<text class="qb-label qb-label-${key}" x="${item.start[0] - 16}" y="${item.start[1] - 16}">${key === "tightEnd" ? "TE" : key === "outside" ? "X" : key === "slot" ? "Y" : "RB"}</text>`).join("")}<text class="qb-coverage-label" x="600" y="284">Red dots = coverage · click the open window</text>`;
    field.className.baseVal = "qb-field";
    field.classList.add(`qb-play-${qbState.play}`);
    set("qbSituation", play.situation); set("qbResult", "");
    const result = document.getElementById("qbResult");
    if (result) result.innerHTML = `<strong>Pre-snap read</strong><span>${target.label} is ${target.open ? "showing a window" : "covered by the defender"}. Snap the ball, then judge the throw.</span>`;
    set("qbScore", "HOME 17 — AWAY 14");
  }

  function runQuarterbackPlay() {
    const playKey = qbState.play; const targetKey = qbState.target; const field = document.getElementById("qbField"); const play = qbPlays[playKey]; const target = play?.targets[targetKey]; const result = document.getElementById("qbResult");
    if (!field || !target || !result || qbState.running) return;
    qbState.running = true; field.classList.remove("is-running"); void field.offsetWidth; field.classList.add("is-running");
    set("qbSituation", "SNAP · routes developing · read the leverage");
    result.innerHTML = `<strong>Routes developing</strong><span>Watch the defender’s hips and throw before the window closes.</span>`;
    window.setTimeout(() => {
      const outcome = target.open ? `COMPLETE · ${target.yards} yards` : (playKey === "redZone" ? "SACK · coverage wins in the red zone" : "INCOMPLETE · defender stays in phase");
      set("qbSituation", target.open ? `PLAY COMPLETE · ${target.yards} yards` : "PLAY OVER · coverage wins");
      result.innerHTML = `<strong>${outcome}</strong><span>${target.open ? "Good timing. You found the open window." : "The safer choice was another route or the checkdown."}</span>`;
      qbState.running = false;
    }, 2450);
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
    set("report-updated", formatUpdatedAt(metadata.generated_at_utc));

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
    const balance = stats.season_balance || [];
    const balancePeak = balance.length ? balance.reduce((best, row) => Number(row.offensive_yards_per_team_game) > Number(best.offensive_yards_per_team_game) ? row : best, balance[0]) : null;
    const turnoverRows = stats.turnover_success || [];
    const turnoverLeader = turnoverRows.length ? turnoverRows.reduce((best, row) => Number(row.win_rate) > Number(best.win_rate) ? row : best, turnoverRows[0]) : null;
    set("balance-season", balancePeak?.season || "The five-season window");
    set("balance-takeaway", balancePeak ? `${balancePeak.season} reached ${decimal(balancePeak.offensive_yards_per_team_game)} offensive yards per team-game, with ${decimal(Number(balancePeak.passing_share) * 100)}% coming through passing.` : "—");
    set("turnover-season", turnoverLeader ? `${turnoverLeader.team} (${turnoverLeader.season})` : "The best team-seasons");
    set("turnover-takeaway", turnoverLeader ? `${turnoverLeader.team} in ${turnoverLeader.season} won ${pct(turnoverLeader.win_rate)} of its games while throwing ${decimal(turnoverLeader.offensive_interceptions_per_game)} interceptions per game.` : "—");
    set("hero-top-team", topTeam.team); set("hero-top-team-rate", `${pct(topTeam.win_rate)} win rate · ${number(topTeam.wins)} wins`); set("hero-top-qb", `${topQb.player_display_name} · ${Number(topQb.epa_per_attempt).toFixed(3)} EPA/att`);
    set("trend-takeaway", `${peak.season} was the scoring peak at ${decimal(peak.points_per_team_game)} points per team-game.`);
    set("win-takeaway", `${topTeam.team} led the five-season window with ${number(topTeam.wins)} wins.`);
    set("offense-takeaway", `${topOffense.team} in ${topOffense.season} produced ${number(topOffense.offensive_yards)} offensive yards.`);
    set("defense-takeaway", `${topDefense.team} in ${topDefense.season} paired ${number(topDefense.def_sacks)} sacks with ${number(topDefense.def_interceptions)} interceptions.`);
    set("position-takeaway", `${topPosition.position_group} accounted for ${number(topPosition.production_yards)} recorded yards in the panel.`);
    set("qb-takeaway", `${topQb.player_display_name} led qualified QBs at ${Number(topQb.epa_per_attempt).toFixed(3)} EPA per attempt.`);
    set("style-takeaway", `${topStyle.team} had the highest passing share at ${decimal(Number(topStyle.passing_share) * 100)}%.`);
    set("home-takeaway", `Home teams won ${pct(home.win_rate)} of team-games, ${decimal((home.win_rate - away.win_rate) * 100)} points above away teams.`);

    const qbSelect = document.getElementById("qbPlayerSelect");
    if (qbSelect) {
      const qbOptions = stats.quarterbacks.slice(0, 10);
      qbSelect.innerHTML = qbOptions.map((row) => `<option value="${row.player_display_name}">${row.player_display_name} · ${row.attempts} attempts</option>`).join("");
      qbSelect.value = topQb.player_display_name;
    }
    renderQuarterbackPlay(topQb.player_display_name);
    document.getElementById("qbPlaySelect")?.addEventListener("change", (event) => { qbState.play = event.target.value; renderQuarterbackPlay(qbSelect?.value || topQb.player_display_name); });
    document.getElementById("qbTargetSelect")?.addEventListener("change", (event) => { qbState.target = event.target.value; renderQuarterbackPlay(qbSelect?.value || topQb.player_display_name); });
    document.getElementById("qbPlayerSelect")?.addEventListener("change", (event) => renderQuarterbackPlay(event.target.value));
    document.getElementById("qbSnap")?.addEventListener("click", runQuarterbackPlay);

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
      data: { datasets: [{ label: "Team-seasons", data: stats.team_offense.map((row) => ({ x: Number(row.passing_yards), y: Number(row.rushing_yards), team: row.team, season: row.season, wins: row.wins, rate: row.win_rate, offensiveYards: row.offensive_yards, offensiveTds: row.offensive_tds, pointsPerGame: row.points_per_game, yardsPerGame: row.offensive_yards_per_game })), backgroundColor: stats.team_offense.map((row) => pointColor(row.win_rate)), borderColor: "#fff", borderWidth: 1, pointRadius: stats.team_offense.map((row) => 4 + Math.min(6, Number(row.wins || 0) / 3)), pointHoverRadius: 10 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => { const raw = ctx.raw; return `${raw.team} ${raw.season}: ${number(raw.x)} pass yds · ${number(raw.y)} rush yds · ${number(raw.offensiveYards)} total yds · ${number(raw.offensiveTds)} offensive TDs · ${decimal(raw.yardsPerGame)} yds/game · ${decimal(raw.pointsPerGame)} pts/game`; } } } }, scales: { x: { ...chartDefaults.scales.x, title: { display: true, text: "Passing yards", color: colors.navyDark }, ticks: { callback: (value) => `${Math.round(value / 1000)}k` } }, y: { ...chartDefaults.scales.y, title: { display: true, text: "Rushing yards", color: colors.navyDark }, ticks: { callback: (value) => `${Math.round(value / 1000)}k` } } } },
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

    makeChart("balanceChart", {
      type: "bar",
      data: { labels: balance.map((row) => row.season), datasets: [{ label: "Passing yards / team-game", data: balance.map((row) => row.passing_yards_per_team_game), backgroundColor: colors.navy, stack: "yards" }, { label: "Rushing yards / team-game", data: balance.map((row) => row.rushing_yards_per_team_game), backgroundColor: colors.sky, stack: "yards" }, { type: "line", label: "Passing share", data: balance.map((row) => Number(row.passing_share) * 100), borderColor: colors.red, backgroundColor: colors.red, pointBackgroundColor: colors.red, borderWidth: 3, pointRadius: 5, tension: .25, yAxisID: "share" }] },
      options: { ...chartDefaults, scales: { x: { ...chartDefaults.scales.x, stacked: true }, y: { ...chartDefaults.scales.y, stacked: true, beginAtZero: true, title: { display: true, text: "Yards per team-game", color: colors.navyDark } }, share: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: colors.red, callback: (value) => `${value}%` }, title: { display: true, text: "Passing share", color: colors.red } } }, plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.yAxisID === "share" ? decimal(ctx.raw) + "%" : decimal(ctx.raw) + " yards"}` } } } },
    });

    makeChart("turnoverChart", {
      type: "bubble",
      data: { datasets: [{ label: "Team-seasons", data: turnoverRows.map((row) => ({ x: Number(row.offensive_interceptions_per_game), y: Number(row.points_per_game), r: Math.max(5, Math.min(15, Number(row.offensive_tds_per_game) * 2.6)), team: row.team, season: row.season, winRate: row.win_rate, takeaways: row.takeaway_margin, tds: row.offensive_tds_per_game })), backgroundColor: turnoverRows.map((row) => `${pointColor(row.win_rate)}cc`), borderColor: turnoverRows.map((row) => pointColor(row.win_rate)), borderWidth: 2, pointHoverRadius: 11 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => { const raw = ctx.raw; return `${raw.team} ${raw.season}: ${decimal(raw.x)} INTs thrown/game · ${decimal(raw.y)} pts/game · ${decimal(raw.tds)} offensive TDs/game · ${pct(raw.winRate)} wins · ${raw.takeaways >= 0 ? "+" : ""}${decimal(raw.takeaways)} INT margin`; } } } }, scales: { x: { ...chartDefaults.scales.x, beginAtZero: true, title: { display: true, text: "Offensive interceptions thrown / game", color: colors.navyDark } }, y: { ...chartDefaults.scales.y, beginAtZero: true, title: { display: true, text: "Points scored / game", color: colors.navyDark } } } },
    });
  } catch (error) {
    document.body.insertAdjacentHTML("beforeend", `<div class="load-error">Report data could not be loaded. Run the build script and serve the project over HTTP.</div>`);
    console.error(error);
  }
})();
