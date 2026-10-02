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
  function setupHeroTicker(stats) {
    const ticker = document.getElementById("hero-ticker-text");
    if (!ticker) return;
    const trend = stats.season_trend || [];
    const peak = trend.reduce((best, row) => Number(row.points_per_team_game) > Number(best?.points_per_team_game || 0) ? row : best, trend[0]);
    const topTeam = stats.team_win_rate?.[0];
    const topQb = stats.quarterbacks?.[0];
    const home = stats.home_away?.find((row) => row.home_away === "Home");
    const away = stats.home_away?.find((row) => row.home_away === "Away");
    const signals = [
      peak ? `${peak.season} set the scoring peak at ${decimal(peak.points_per_team_game)} points per team-game.` : "Five seasons of regular-season signal.",
      topTeam ? `${topTeam.team} led the window with ${number(topTeam.wins)} wins.` : "Team identity is built from every game.",
      topQb ? `${topQb.player_display_name} led qualified QBs at ${Number(topQb.epa_per_attempt).toFixed(3)} EPA per attempt.` : "Role metrics keep the comparisons fair.",
      home && away ? `Home teams held a ${decimal((home.win_rate - away.win_rate) * 100)} point win-rate edge.` : "Context changes the meaning of production.",
    ];
    let index = 0;
    const show = () => {
      ticker.classList.remove("is-changing");
      void ticker.offsetWidth;
      ticker.textContent = signals[index % signals.length];
      ticker.classList.add("is-changing");
      index += 1;
    };
    show();
    if (signals.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) window.setInterval(show, 5200);
  }

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

  const fgScenarios = [
    { quarter: "Q4", clock: "0:42", down: "4TH & 8", toGo: 8, position: 25, distance: 42, wind: 0, home: 24, away: 27, prompt: "You are down three late in the fourth. What is the best move?" },
    { quarter: "Q4", clock: "1:18", down: "4TH & 2", toGo: 2, position: 18, distance: 35, wind: -3, home: 20, away: 20, prompt: "The game is tied inside the red zone. Take the lead or trust the offense?" },
    { quarter: "Q2", clock: "0:08", down: "4TH & GOAL", toGo: 1, position: 9, distance: 27, wind: 4, home: 10, away: 13, prompt: "There is one play before halftime. Bank three points or chase seven?" },
    { quarter: "Q4", clock: "2:06", down: "4TH & 5", toGo: 5, position: 31, distance: 48, wind: 5, home: 21, away: 24, prompt: "A long kick is available, but a miss gives the opponent a short field." },
    { quarter: "Q3", clock: "4:31", down: "4TH & 3", toGo: 3, position: 22, distance: 39, wind: -5, home: 17, away: 14, prompt: "You are up three. Add points, extend the drive, or pin them deep?" },
    { quarter: "Q4", clock: "0:19", down: "4TH & 10", toGo: 10, position: 36, distance: 53, wind: 2, home: 27, away: 28, prompt: "A 53-yarder could win it. This is the definition of a clutch attempt." },
  ];
  const fgState = { distance: 42, wind: 0, aim: 0, power: 85, attempts: 0, makes: 0, decisions: 0, score: 0, streak: 0, bestStreak: 0, running: false, phase: "decision", scenarioIndex: 0 };
  const fgClamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function fgWindLabel() {
    if (!fgState.wind) return "CALM";
    return `${Math.abs(fgState.wind)} MPH ${fgState.wind > 0 ? "→" : "←"}`;
  }

  function fgAimLabel() {
    if (!fgState.aim) return "CENTER";
    return `${Math.abs(fgState.aim)}° ${fgState.aim < 0 ? "LEFT" : "RIGHT"}`;
  }

  function fgIdealAim() {
    return fgClamp(Math.round(-fgState.wind * 0.45), -10, 10);
  }

  function fgTargetPower() {
    return Math.round(fgClamp(58 + fgState.distance * 0.65, 70, 98));
  }

  function updateFgScoreboard() {
    const values = { fgScore: fgState.score, fgDecisions: fgState.decisions, fgMakes: fgState.makes, fgStreak: fgState.streak, fgBest: fgState.bestStreak };
    Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
  }

  function updateFgSituation() {
    const scenario = fgScenarios[fgState.scenarioIndex];
    if (!scenario) return;
    set("fgDriveLabel", `${scenario.down} · OPPONENT ${scenario.position}`);
    set("fgScoreline", `HOME ${scenario.home} — AWAY ${scenario.away}`);
    set("fgDown", scenario.down);
    set("fgYardline", `${scenario.position} YD LINE`);
    set("fgDistance", `${fgState.distance} YARDS`);
    set("fgWindRead", fgWindLabel());
    set("fgSituation", `${scenario.quarter} · ${scenario.clock}`);
  }

  function setFgPhase(phase) {
    fgState.phase = phase;
    const decisionPanel = document.getElementById("fgDecisionPanel");
    const kickingControls = document.getElementById("fgKickingControls");
    if (decisionPanel) decisionPanel.hidden = phase === "kick";
    if (kickingControls) kickingControls.hidden = phase !== "kick";
    document.querySelectorAll(".fg-decision-button").forEach((button) => { button.disabled = phase !== "decision"; button.classList.toggle("is-selected", button.dataset.decision === fgState.lastCall && phase === "kick"); });
    const kickButton = document.getElementById("fgKick");
    const aimInput = document.getElementById("fgAim");
    const powerInput = document.getElementById("fgPower");
    if (kickButton) kickButton.disabled = phase !== "kick" || fgState.running;
    if (aimInput) aimInput.disabled = phase !== "kick" || fgState.running;
    if (powerInput) powerInput.disabled = phase !== "kick" || fgState.running;
  }

  function drawFieldGoal() {
    const aimInput = document.getElementById("fgAim");
    const powerInput = document.getElementById("fgPower");
    const field = document.getElementById("fgField");
    const line = document.getElementById("fgAimLine");
    const trajectory = document.getElementById("fgTrajectory");
    const marker = document.getElementById("fgAimMarker");
    const ball = document.getElementById("fgBall");
    if (!aimInput || !powerInput || !field || !line || !trajectory || !marker || !ball) return;
    const yardLines = field.querySelector(".fg-yard-lines");
    if (yardLines && !yardLines.innerHTML) {
      yardLines.innerHTML = [110, 205, 300, 395, 490, 585].map((x, index) => `<line x1="${x}" y1="62" x2="${x}" y2="290"></line><text x="${x + 4}" y="84">${index * 10}</text>`).join("");
    }
    fgState.aim = Number(aimInput.value);
    fgState.power = Number(powerInput.value);
    const targetX = 660 + fgState.aim * 5;
    line.setAttribute("x2", targetX);
    line.setAttribute("y2", 140);
    marker.setAttribute("cx", targetX);
    trajectory.setAttribute("d", `M 118 255 Q ${(118 + targetX) / 2} 38 ${targetX} 140`);
    ball.setAttribute("transform", "translate(118 255) rotate(-18)");
    field.classList.remove("is-kicking", "is-good", "is-miss", "is-go", "is-punt");
    const impact = document.getElementById("fgImpact");
    if (impact) impact.innerHTML = "";
    const aimOutput = document.getElementById("fgAimValue");
    const powerOutput = document.getElementById("fgPowerValue");
    const powerGuide = document.getElementById("fgPowerGuide");
    const windLabel = document.getElementById("fgWindLabel");
    if (aimOutput) aimOutput.textContent = fgAimLabel();
    if (powerOutput) powerOutput.textContent = `${fgState.power}%`;
    if (powerGuide) powerGuide.textContent = `IDEAL ${fgTargetPower()}% · ±9 IS GOOD`;
    if (windLabel) windLabel.textContent = `WIND: ${fgWindLabel()}`;
    updateFgSituation();
  }

  function fieldGoalResult(powerError, aimError) {
    if (powerError <= -12) return { title: "SHORT", detail: "The kick ran out of distance before it reached the uprights." };
    if (powerError >= 12) return { title: "TOO MUCH POWER", detail: "The ball had the distance, but sailed over the target window." };
    if (Math.abs(aimError) >= 5.3) return { title: `WIDE ${aimError > 0 ? "RIGHT" : "LEFT"}`, detail: "The wind and your aim pulled the ball outside the uprights." };
    if (Math.abs(powerError) >= 9) return { title: powerError > 0 ? "JUST LONG" : "JUST LOW", detail: "Your aim was close, but the power missed the sweet spot." };
    return { title: "GOOD", detail: "Clean contact. The ball splits the uprights." };
  }

  function animateFieldGoal(endX, endY, finish) {
    const ball = document.getElementById("fgBall");
    if (!ball) return;
    const start = performance.now();
    const duration = 1250;
    const frame = (now) => {
      const progress = fgClamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const arc = Math.sin(Math.PI * eased) * 118;
      const x = 118 + (endX - 118) * eased;
      const y = 255 + (endY - 255) * eased - arc;
      ball.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-18 + eased * 70).toFixed(1)})`);
      if (progress < 1) window.requestAnimationFrame(frame);
      else finish();
    };
    window.requestAnimationFrame(frame);
  }

  function resolveNonKick(choice) {
    const stage = document.getElementById("fgStage");
    const result = document.getElementById("fgResult");
    if (!stage || !result || fgState.running) return;
    fgState.running = true;
    const scenario = fgScenarios[fgState.scenarioIndex];
    const chance = choice === "go" ? fgClamp(.76 - (scenario.toGo - 2) * .075, .31, .76) : .78;
    const successful = Math.random() < chance;
    const points = choice === "go" ? (successful ? 5 : 0) : (successful ? 1 : 0);
    const title = choice === "go" ? (successful ? "CONVERSION! +5" : "TURNOVER ON DOWNS") : (successful ? "PUNT PINNED · +1" : "PUNT AWAY");
    const detail = choice === "go" ? (successful ? `You beat the ${scenario.toGo}-yard line and kept the drive alive.` : "The defense closes the window before the sticks.") : (successful ? "The punt wins the field-position battle." : "The return gives the opponent a little room to work.");
    stage.classList.remove("is-good", "is-miss", "is-go", "is-punt");
    stage.classList.add(choice === "go" ? "is-go" : "is-punt");
    result.innerHTML = `<strong>${title}</strong><span>${detail} ${points ? `Challenge score +${points}.` : "No challenge points this round."}</span>`;
    if (points) { fgState.score += points; fgState.streak += 1; fgState.bestStreak = Math.max(fgState.bestStreak, fgState.streak); } else fgState.streak = 0;
    updateFgScoreboard();
    setFgPhase("resolved");
    set("fgDecisionPrompt", "Round complete. Reset for another fourth-down situation.");
    window.setTimeout(() => { fgState.running = false; }, 650);
  }

  function chooseFourthDown(choice) {
    if (fgState.phase !== "decision" || fgState.running) return;
    fgState.decisions += 1;
    fgState.lastCall = choice;
    const scenario = fgScenarios[fgState.scenarioIndex];
    if (choice === "kick") {
      const aimInput = document.getElementById("fgAim");
      const powerInput = document.getElementById("fgPower");
      if (aimInput) aimInput.value = String(fgIdealAim());
      if (powerInput) powerInput.value = String(fgTargetPower());
      drawFieldGoal();
      setFgPhase("kick");
      set("fgDecisionPrompt", `${scenario.distance} yards into ${fgWindLabel().toLowerCase()}. Set the kick, then trust your read.`);
      const result = document.getElementById("fgResult");
      if (result) result.innerHTML = `<strong>Kick team is on the field</strong><span>The gold target shows the ideal window. You have a forgiving ±9% power range.</span>`;
      return;
    }
    resolveNonKick(choice);
  }

  function kickFieldGoal() {
    const stage = document.getElementById("fgStage");
    const result = document.getElementById("fgResult");
    const kickButton = document.getElementById("fgKick");
    if (!stage || !result || !kickButton || fgState.running || fgState.phase !== "kick") return;
    const idealPower = fgTargetPower();
    const idealAim = fgIdealAim();
    const powerError = fgState.power - idealPower;
    const aimError = fgState.aim - idealAim;
    const powerRatio = fgState.power / idealPower;
    const reach = 118 + 542 * fgClamp(powerRatio, 0.42, 1.22);
    const endX = fgClamp(reach + aimError * 8, 72, 748);
    const endY = 140 - powerError * 2.2;
    const outcome = fieldGoalResult(powerError, aimError);
    const isGood = outcome.title === "GOOD";
    fgState.running = true;
    fgState.attempts += 1;
    if (isGood) { fgState.makes += 1; fgState.score += 3; fgState.streak += 1; fgState.bestStreak = Math.max(fgState.bestStreak, fgState.streak); } else fgState.streak = 0;
    updateFgScoreboard();
    stage.classList.remove("is-good", "is-miss", "is-go", "is-punt");
    stage.classList.add("is-kicking");
    kickButton.disabled = true;
    const aimInput = document.getElementById("fgAim");
    const powerInput = document.getElementById("fgPower");
    if (aimInput) aimInput.disabled = true;
    if (powerInput) powerInput.disabled = true;
    result.innerHTML = `<strong>Kick in motion…</strong><span>Tracking ${fgState.distance} yards with ${fgState.power}% power.</span>`;
    animateFieldGoal(endX, endY, () => {
      const impact = document.getElementById("fgImpact");
      if (impact) impact.innerHTML = `<circle class="fg-impact-ring ${isGood ? "is-good" : "is-miss"}" cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="12"></circle>`;
      stage.classList.remove("is-kicking");
      stage.classList.add(isGood ? "is-good" : "is-miss");
      result.innerHTML = `<strong>${isGood ? "FIELD GOAL! +3" : outcome.title}</strong><span>${outcome.detail} · Aim ${fgAimLabel()} · Power ${fgState.power}%.</span>`;
      updateFgScoreboard();
      fgState.running = false;
      setFgPhase("resolved");
      set("fgDecisionPrompt", "Round complete. Reset for another fourth-down situation.");
    });
  }

  function newFieldGoalChallenge() {
    if (fgState.running) return;
    let nextIndex = Math.floor(Math.random() * fgScenarios.length);
    if (fgScenarios.length > 1 && nextIndex === fgState.scenarioIndex) nextIndex = (nextIndex + 1) % fgScenarios.length;
    fgState.scenarioIndex = nextIndex;
    const scenario = fgScenarios[nextIndex];
    fgState.distance = scenario.distance;
    fgState.wind = scenario.wind;
    fgState.aim = fgIdealAim();
    fgState.power = fgTargetPower();
    const aimInput = document.getElementById("fgAim");
    const powerInput = document.getElementById("fgPower");
    if (aimInput) { aimInput.value = String(fgState.aim); aimInput.disabled = true; }
    if (powerInput) { powerInput.value = String(fgState.power); powerInput.disabled = true; }
    const stage = document.getElementById("fgStage");
    if (stage) stage.classList.remove("is-kicking", "is-good", "is-miss", "is-go", "is-punt");
    drawFieldGoal();
    setFgPhase("decision");
    set("fgDecisionPrompt", scenario.prompt);
    const result = document.getElementById("fgResult");
    if (result) result.innerHTML = `<strong>New situation: ${scenario.down}</strong><span>Choose your call. The kick controls unlock only if you take the points.</span>`;
    updateFgScoreboard();
  }

  function setupFieldGoalGame() {
    if (!document.getElementById("fgField")) return;
    newFieldGoalChallenge();
    document.getElementById("fgAim")?.addEventListener("input", drawFieldGoal);
    document.getElementById("fgPower")?.addEventListener("input", drawFieldGoal);
    document.getElementById("fgKickDecision")?.addEventListener("click", () => chooseFourthDown("kick"));
    document.getElementById("fgGoDecision")?.addEventListener("click", () => chooseFourthDown("go"));
    document.getElementById("fgPuntDecision")?.addEventListener("click", () => chooseFourthDown("punt"));
    document.getElementById("fgKick")?.addEventListener("click", kickFieldGoal);
    document.getElementById("fgNew")?.addEventListener("click", newFieldGoalChallenge);
  }

  const reportFilterState = { season: "all", team: "all", position: "all" };
  const aggregateTeamRows = (rows) => {
    const grouped = new Map();
    rows.forEach((row) => {
      const key = row.team;
      const current = grouped.get(key) || { ...row, games: 0, wins: 0, losses: 0, passing_yards: 0, rushing_yards: 0, offensive_yards: 0, points_total: 0, offensive_tds: 0 };
      const games = Number(row.games || 0);
      current.games += games;
      current.wins += Number(row.wins || 0);
      current.losses += Number(row.losses || 0);
      current.passing_yards += Number(row.passing_yards || 0);
      current.rushing_yards += Number(row.rushing_yards || 0);
      current.offensive_yards += Number(row.offensive_yards || 0);
      current.points_total += Number(row.points_per_game || 0) * games;
      current.offensive_tds += Number(row.offensive_tds || 0);
      grouped.set(key, current);
    });
    return [...grouped.values()].map((row) => ({ ...row, losses: Math.max(0, row.games - row.wins), win_rate: row.games ? row.wins / row.games : 0, points_per_game: row.games ? row.points_total / row.games : 0, offensive_yards_per_game: row.games ? row.offensive_yards / row.games : 0 }));
  };
  const filterBySeasonAndTeam = (rows) => rows.filter((row) => (reportFilterState.season === "all" || Number(row.season) === Number(reportFilterState.season)) && (reportFilterState.team === "all" || row.team === reportFilterState.team));
  const reportTeamRows = (stats) => reportFilterState.season === "all" ? aggregateTeamRows(filterBySeasonAndTeam(stats.team_offense)) : filterBySeasonAndTeam(stats.team_offense);
  const reportTeamRecord = (stats, team, season) => {
    const rows = stats.team_offense.filter((row) => row.team === team && (season === "all" || Number(row.season) === Number(season)));
    if (!rows.length) return null;
    const offense = season === "all" ? aggregateTeamRows(rows)[0] : rows[0];
    const styleRows = stats.team_style.filter((row) => row.team === team && (season === "all" || Number(row.season) === Number(season)));
    const defenseRows = stats.team_defense.filter((row) => row.team === team && (season === "all" || Number(row.season) === Number(season)));
    const passing = rows.reduce((sum, row) => sum + Number(row.passing_yards || 0), 0);
    const rushing = rows.reduce((sum, row) => sum + Number(row.rushing_yards || 0), 0);
    const games = rows.reduce((sum, row) => sum + Number(row.games || 0), 0);
    const pressure = defenseRows.reduce((sum, row) => sum + Number(row.def_sacks || 0) + Number(row.def_interceptions || 0), 0);
    return { team, games, wins: Number(offense.wins || 0), losses: Math.max(0, games - Number(offense.wins || 0)), winRate: Number(offense.win_rate || 0), pointsPerGame: Number(offense.points_per_game || 0), yardsPerGame: Number(offense.offensive_yards_per_game || 0), passShare: (passing + rushing) ? passing / (passing + rushing) : 0, pressurePerGame: games ? pressure / games : 0 };
  };
  const reportTeamMeta = (teams, team) => (teams || []).find((row) => row.team_abbr === team) || { team_abbr: team, team_name: team, team_color: colors.navy, team_color2: colors.red };

  function renderReportLens(stats) {
    const seasonRows = reportTeamRows(stats);
    const positionRows = (stats.position_production || []).filter((row) => reportFilterState.position === "all" || row.position_group === reportFilterState.position);
    let labels; let values; let title; let explainer; let takeaway; let tooltipLabel;
    if (reportFilterState.position !== "all") {
      const roles = positionRows.slice().sort((a, b) => Number(b.production_yards) - Number(a.production_yards));
      labels = roles.map((row) => row.position_group); values = roles.map((row) => Number(row.production_yards));
      title = `${reportFilterState.position} role workload`; explainer = "Recorded player production for the selected position group."; takeaway = roles[0] ? `${roles[0].position_group} represents ${number(roles[0].production_yards)} recorded yards across ${number(roles[0].player_games)} player-games.` : "No role data for this selection."; tooltipLabel = (ctx) => `${ctx.label}: ${number(ctx.raw)} recorded yards`;
    } else {
      const ranked = seasonRows.slice().sort((a, b) => Number(b.offensive_yards_per_game) - Number(a.offensive_yards_per_game)).slice(0, 8);
      labels = ranked.map((row) => row.team); values = ranked.map((row) => Number(row.offensive_yards_per_game));
      title = reportFilterState.team === "all" ? "Offensive identity ranking" : `${reportFilterState.team} offensive identity`;
      explainer = reportFilterState.season === "all" ? "Average offensive yards per team-game across the selected window." : `Offensive yards per game in ${reportFilterState.season}.`;
      takeaway = ranked[0] ? `${ranked[0].team} leads this lens at ${decimal(ranked[0].offensive_yards_per_game)} offensive yards per game.` : "No team data for this selection."; tooltipLabel = (ctx) => `${ctx.label}: ${decimal(ctx.raw)} offensive yards/game`;
    }
    set("reportLensChartTitle", title); set("reportLensExplainer", explainer); set("reportLensTakeaway", takeaway);
    makeChart("reportLensChart", { type: "bar", data: { labels, datasets: [{ label: title, data: values, backgroundColor: labels.map((label, index) => label === reportFilterState.team ? colors.red : palette[index % palette.length]), borderRadius: 4, borderSkipped: false }] }, options: { ...chartDefaults, indexAxis: "y", plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: tooltipLabel } } }, scales: { x: { ...chartDefaults.scales.x, beginAtZero: true, ticks: { callback: (value) => reportFilterState.position === "all" ? `${Math.round(value)} yds` : `${Math.round(value / 1000)}k` } }, y: { ...chartDefaults.scales.y, grid: { display: false } } } } });
  }

  function refreshFilteredCharts(stats) {
    const seasonTrend = reportFilterState.season === "all" ? stats.season_trend : stats.season_trend.filter((row) => Number(row.season) === Number(reportFilterState.season));
    if (charts.seasonTrendChart) { charts.seasonTrendChart.data.labels = seasonTrend.map((row) => row.season); charts.seasonTrendChart.data.datasets[0].data = seasonTrend.map((row) => row.points_per_team_game); charts.seasonTrendChart.update(); }
    const winRows = (reportFilterState.season === "all" ? aggregateTeamRows(filterBySeasonAndTeam(stats.team_offense)) : filterBySeasonAndTeam(stats.team_offense)).sort((a, b) => Number(b.wins) - Number(a.wins)).slice(0, 8);
    if (charts.teamWinChart) { charts.teamWinChart.data.labels = winRows.map((row) => row.team); charts.teamWinChart.data.datasets[0].data = winRows.map((row) => row.wins); charts.teamWinChart.data.datasets[0].backgroundColor = winRows.map((row, index) => row.team === reportFilterState.team ? colors.red : palette[index % palette.length]); charts.teamWinChart.update(); }
    const offenseRows = reportTeamRows(stats);
    if (charts.offenseChart) { charts.offenseChart.data.datasets[0].data = offenseRows.map((row) => ({ x: Number(row.passing_yards), y: Number(row.rushing_yards), team: row.team, season: row.season || "window", wins: row.wins, rate: row.win_rate, offensiveYards: row.offensive_yards, offensiveTds: row.offensive_tds, pointsPerGame: row.points_per_game, yardsPerGame: row.offensive_yards_per_game })); charts.offenseChart.data.datasets[0].backgroundColor = offenseRows.map((row) => pointColor(row.win_rate)); charts.offenseChart.data.datasets[0].pointRadius = offenseRows.map((row) => 4 + Math.min(6, Number(row.wins || 0) / 3)); charts.offenseChart.update(); }
    const positions = (stats.position_production || []).filter((row) => reportFilterState.position === "all" || row.position_group === reportFilterState.position).slice(0, 8);
    if (charts.positionChart) { charts.positionChart.data.labels = positions.map((row) => row.position_group); charts.positionChart.data.datasets[0].data = positions.map((row) => row.production_yards); charts.positionChart.update(); }
    const defenseRows = stats.team_defense.filter((row) => (reportFilterState.season === "all" || Number(row.season) === Number(reportFilterState.season)) && (reportFilterState.team === "all" || row.team === reportFilterState.team)).slice(0, 5);
    if (charts.defenseChart) { charts.defenseChart.data.datasets = defenseRows.map((row, index) => ({ label: `${row.team} · ${row.season}`, data: [row.def_sacks, row.def_interceptions, Number(row.win_rate) * 100], borderColor: palette[index], backgroundColor: `${palette[index]}22`, pointBackgroundColor: palette[index], borderWidth: 2 })); charts.defenseChart.update(); }
    const balanceRows = reportFilterState.season === "all" ? stats.season_balance : stats.season_balance.filter((row) => Number(row.season) === Number(reportFilterState.season));
    if (charts.balanceChart) { charts.balanceChart.data.labels = balanceRows.map((row) => row.season); charts.balanceChart.data.datasets[0].data = balanceRows.map((row) => row.passing_yards_per_team_game); charts.balanceChart.data.datasets[1].data = balanceRows.map((row) => row.rushing_yards_per_team_game); charts.balanceChart.data.datasets[2].data = balanceRows.map((row) => Number(row.passing_share) * 100); charts.balanceChart.update(); }
    const turnoverRows = stats.turnover_success.filter((row) => (reportFilterState.season === "all" || Number(row.season) === Number(reportFilterState.season)) && (reportFilterState.team === "all" || row.team === reportFilterState.team));
    if (charts.turnoverChart) { charts.turnoverChart.data.datasets[0].data = turnoverRows.map((row) => ({ x: Number(row.offensive_interceptions_per_game), y: Number(row.points_per_game), r: Math.max(5, Math.min(15, Number(row.offensive_tds_per_game) * 2.6)), team: row.team, season: row.season, winRate: row.win_rate, takeaways: row.takeaway_margin, tds: row.offensive_tds_per_game })); charts.turnoverChart.data.datasets[0].backgroundColor = turnoverRows.map((row) => `${pointColor(row.win_rate)}cc`); charts.turnoverChart.data.datasets[0].borderColor = turnoverRows.map((row) => pointColor(row.win_rate)); charts.turnoverChart.update(); }
    const filterText = `${reportFilterState.season === "all" ? "All seasons" : reportFilterState.season} · ${reportFilterState.team === "all" ? "all teams" : reportFilterState.team} · ${reportFilterState.position === "all" ? "all positions" : reportFilterState.position}`;
    set("reportFilterStatus", filterText);
  }

  function setupReportFilters(stats) {
    const seasonSelect = document.getElementById("reportSeasonFilter"); const teamSelect = document.getElementById("reportTeamFilter"); const positionSelect = document.getElementById("reportPositionFilter");
    if (!seasonSelect || !teamSelect || !positionSelect) return;
    [...new Set(stats.season_trend.map((row) => Number(row.season)))].sort((a, b) => a - b).forEach((season) => seasonSelect.insertAdjacentHTML("beforeend", `<option value="${season}">${season}</option>`));
    [...new Set(stats.team_offense.map((row) => row.team))].sort().forEach((team) => teamSelect.insertAdjacentHTML("beforeend", `<option value="${team}">${team}</option>`));
    [...new Set(stats.position_production.map((row) => row.position_group))].sort().forEach((position) => positionSelect.insertAdjacentHTML("beforeend", `<option value="${position}">${position}</option>`));
    const update = () => { reportFilterState.season = seasonSelect.value; reportFilterState.team = teamSelect.value; reportFilterState.position = positionSelect.value; renderReportLens(stats); refreshFilteredCharts(stats); };
    seasonSelect.addEventListener("change", update); teamSelect.addEventListener("change", update); positionSelect.addEventListener("change", update);
    document.getElementById("reportResetFilters")?.addEventListener("click", () => { seasonSelect.value = "all"; teamSelect.value = "all"; positionSelect.value = "all"; update(); });
    renderReportLens(stats); refreshFilteredCharts(stats);
  }

  function setupTeamComparison(stats, teams) {
    const seasonSelect = document.getElementById("compareSeason"); const teamASelect = document.getElementById("compareTeamA"); const teamBSelect = document.getElementById("compareTeamB");
    if (!seasonSelect || !teamASelect || !teamBSelect) return;
    [...new Set(stats.season_trend.map((row) => Number(row.season)))].sort((a, b) => a - b).forEach((season) => seasonSelect.insertAdjacentHTML("beforeend", `<option value="${season}">${season}</option>`));
    [...new Set(stats.team_offense.map((row) => row.team))].sort().forEach((team) => { const meta = reportTeamMeta(teams, team); const label = `${team} · ${meta.team_nick || meta.team_name || team}`; teamASelect.insertAdjacentHTML("beforeend", `<option value="${team}">${label}</option>`); teamBSelect.insertAdjacentHTML("beforeend", `<option value="${team}">${label}</option>`); });
    teamASelect.value = stats.team_offense.some((row) => row.team === "BUF") ? "BUF" : teamASelect.options[0]?.value; teamBSelect.value = stats.team_offense.some((row) => row.team === "CIN") ? "CIN" : teamBSelect.options[1]?.value;
    const update = () => {
      const season = seasonSelect.value; const teamA = reportTeamRecord(stats, teamASelect.value, season); const teamB = reportTeamRecord(stats, teamBSelect.value, season); if (!teamA || !teamB) return;
      const metaA = reportTeamMeta(teams, teamA.team); const metaB = reportTeamMeta(teams, teamB.team); const cardA = document.querySelector(".comparison-team-a"); const cardB = document.querySelector(".comparison-team-b");
      if (cardA) cardA.style.setProperty("--compare-color", metaA.team_color || colors.navy); if (cardB) cardB.style.setProperty("--compare-color", metaB.team_color || colors.red);
      [ ["compareLogoA", metaA.team_logo_espn || metaA.team_logo_wikipedia, metaA.team_name || teamA.team], ["compareLogoB", metaB.team_logo_espn || metaB.team_logo_wikipedia, metaB.team_name || teamB.team] ].forEach(([id, src, alt]) => { const img = document.getElementById(id); if (img) { img.src = src || ""; img.alt = `${alt} logo`; } });
      set("compareNameA", teamA.team); set("compareNameB", teamB.team); set("compareRecordA", `${teamA.wins}-${teamA.losses} · ${season === "all" ? "five-season window" : season}`); set("compareRecordB", `${teamB.wins}-${teamB.losses} · ${season === "all" ? "five-season window" : season}`);
      set("compareWinA", pct(teamA.winRate)); set("compareWinB", pct(teamB.winRate)); set("comparePointsA", decimal(teamA.pointsPerGame)); set("comparePointsB", decimal(teamB.pointsPerGame)); set("compareYardsA", decimal(teamA.yardsPerGame)); set("compareYardsB", decimal(teamB.yardsPerGame)); set("compareStyleA", pct(teamA.passShare)); set("compareStyleB", pct(teamB.passShare));
      const labels = ["Win rate", "Points / game", "Offensive yds / game", "Pass share", "Pressure / game"]; const rawA = [teamA.winRate * 100, teamA.pointsPerGame, teamA.yardsPerGame, teamA.passShare * 100, teamA.pressurePerGame]; const rawB = [teamB.winRate * 100, teamB.pointsPerGame, teamB.yardsPerGame, teamB.passShare * 100, teamB.pressurePerGame]; const normalized = (values, other) => values.map((value, index) => { const max = Math.max(Number(value), Number(other[index]), 1); return (Number(value) / max) * 100; });
      makeChart("reportCompareChart", { type: "bar", data: { labels, datasets: [{ label: teamA.team, data: normalized(rawA, rawB), rawValues: rawA, backgroundColor: metaA.team_color || colors.navy, borderRadius: 3 }, { label: teamB.team, data: normalized(rawB, rawA), rawValues: rawB, backgroundColor: metaB.team_color || colors.red, borderRadius: 3 }] }, options: { ...chartDefaults, indexAxis: "y", plugins: { ...chartDefaults.plugins, legend: { display: true, position: "bottom", labels: chartDefaults.plugins.legend.labels }, tooltip: { callbacks: { label: (ctx) => { const raw = ctx.dataset.rawValues[ctx.dataIndex]; return `${ctx.dataset.label}: ${ctx.dataIndex === 0 || ctx.dataIndex === 3 ? decimal(raw) + "%" : decimal(raw)}`; } } } }, scales: { x: { ...chartDefaults.scales.x, min: 0, max: 100, ticks: { callback: (value) => `${value}` } }, y: { ...chartDefaults.scales.y, grid: { display: false } } } } });
      const edges = labels.map((label, index) => Math.abs(rawA[index] - rawB[index])); const edgeIndex = edges.indexOf(Math.max(...edges)); const edgeTeam = rawA[edgeIndex] >= rawB[edgeIndex] ? teamA.team : teamB.team; set("compareTakeaway", `${edgeTeam} has the clearest edge in ${labels[edgeIndex].toLowerCase()} for this view.`);
    };
    seasonSelect.addEventListener("change", update); teamASelect.addEventListener("change", update); teamBSelect.addEventListener("change", update); update();
  }

  function renderSurprises(stats) {
    const runHeavy = stats.team_offense.reduce((best, row) => { const share = Number(row.rushing_yards) / Math.max(1, Number(row.passing_yards) + Number(row.rushing_yards)); return !best || share > best.share ? { row, share } : best; }, null);
    const pressure = stats.team_defense.reduce((best, row) => !best || Number(row.defensive_takeaways_pressure) > Number(best.defensive_takeaways_pressure) ? row : best, null);
    const efficient = (stats.turnover_success || []).slice().sort((a, b) => Number(b.win_rate) - Number(a.win_rate) || Number(a.offensive_interceptions_per_game) - Number(b.offensive_interceptions_per_game))[0];
    if (runHeavy) { set("surprise-run-title", `${runHeavy.row.team} ran ${decimal(runHeavy.share * 100)}% of its offense`); set("surprise-run-detail", `The ${runHeavy.row.season} team-season still produced ${decimal(runHeavy.row.points_per_game)} points per game, showing that balance can be a strength rather than a lack of ambition.`); }
    if (pressure) { set("surprise-defense-title", `${pressure.team} created ${number(pressure.defensive_takeaways_pressure)} pressure events`); set("surprise-defense-detail", `${pressure.team} in ${pressure.season} paired ${number(pressure.def_sacks)} sacks with ${number(pressure.def_interceptions)} interceptions—two different ways to end a drive.`); }
    if (efficient) { set("surprise-efficiency-title", `${efficient.team} turned care into wins`); set("surprise-efficiency-detail", `${efficient.team} in ${efficient.season} won ${pct(efficient.win_rate)} of its games while throwing only ${decimal(efficient.offensive_interceptions_per_game)} interceptions per game.`); }
  }

  function renderClosingSummary(stats) {
    const topTeam = stats.team_win_rate[0]; const topStyle = stats.passing_share[0]; const home = stats.home_away.find((row) => row.home_away === "Home"); const away = stats.home_away.find((row) => row.home_away === "Away");
    set("closing-lede", `The report’s central lesson is simple: production matters most when it fits the role and the situation. Use the dashboard to move from league pattern to player matchup.`);
    set("closing-one-title", `${topTeam.team} shows the value of finishing games`); set("closing-one-detail", `${topTeam.team} led the window with ${number(topTeam.wins)} wins and a ${pct(topTeam.win_rate)} winning rate.`);
    set("closing-two-title", `${topStyle.team} shows that style is a choice`); set("closing-two-detail", `${topStyle.team} produced the highest passing share at ${decimal(Number(topStyle.passing_share) * 100)}%, but the report keeps rushing, pressure, and role workload in view.`);
    set("closing-three-title", "Context keeps the stat honest"); set("closing-three-detail", `Home teams won ${pct(home.win_rate)} of team-games versus ${pct(away.win_rate)} away. Situations, decisions, and field position belong beside the box score.`);
  }

  try {
    const [stats, metadata, teamMetadata] = await Promise.all([
      fetch("data/report_stats.json").then((response) => response.json()),
      fetch("data/metadata.json").then((response) => response.json()),
      fetch("data/teams.json").then((response) => response.json()),
    ]);
    const overview = stats.overview;
    setupHeroTicker(stats);
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
    set("insight-scoring", `${peak.season} was the scoring peak`); set("insight-scoring-detail", `${decimal(peak.points_per_team_game)} points per team-game across the league.`);
    set("insight-winning", `${topTeam.team} led the win table`); set("insight-winning-detail", `${number(topTeam.wins)} wins across ${number(topTeam.games)} team-games (${pct(topTeam.win_rate)}).`);
    set("insight-style", `${topStyle.team} leaned most on the pass`); set("insight-style-detail", `${decimal(Number(topStyle.passing_share) * 100)}% of offensive yards came through passing.`);
    set("insight-home", `Home field added ${decimal((home.win_rate - away.win_rate) * 100)} points`); set("insight-home-detail", `Home teams won ${pct(home.win_rate)} of team-games versus ${pct(away.win_rate)} away.`);
    renderSurprises(stats); renderClosingSummary(stats);

    setupFieldGoalGame();

    makeChart("seasonTrendChart", {
      type: "line",
      data: { labels: trend.map((row) => row.season), datasets: [{ label: "Points per team-game", data: trend.map((row) => row.points_per_team_game), borderColor: colors.red, backgroundColor: "rgba(213,10,10,.13)", fill: true, tension: .35, borderWidth: 4, pointRadius: 6, pointHoverRadius: 9, pointBackgroundColor: colors.navy, pointBorderColor: "#fff", pointBorderWidth: 3 }] },
      options: { ...chartDefaults, plugins: { ...chartDefaults.plugins, tooltip: { callbacks: { label: (ctx) => `${decimal(ctx.raw)} points per team-game` } } }, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, beginAtZero: false, ticks: { callback: (value) => `${value}` } } } },
    });

    const winningTeams = stats.team_win_rate.slice(0, 8);
    makeChart("teamWinChart", {
      type: "bar",
      data: { labels: winningTeams.map((row) => row.team), datasets: [{ label: "Wins", data: winningTeams.map((row) => row.wins), backgroundColor: winningTeams.map((_, index) => palette[index]), borderRadius: 4, borderSkipped: false }] },
      options: { ...chartDefaults, indexAxis: "y", plugins: { ...chartDefaults.plugins, legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${number(ctx.raw)} wins · ${pct(winningTeams[ctx.dataIndex].win_rate)}` } } }, scales: { x: { ...chartDefaults.scales.x, beginAtZero: true, ticks: { precision: 0 } }, y: { ...chartDefaults.scales.y, grid: { display: false } } } },
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
    setupReportFilters(stats); setupTeamComparison(stats, teamMetadata);
  } catch (error) {
    document.body.insertAdjacentHTML("beforeend", `<div class="load-error">Report data could not be loaded. Run the build script and serve the project over HTTP.</div>`);
    console.error(error);
  }
})();
