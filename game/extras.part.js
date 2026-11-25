/* ================= extras: officials, fouls, crowd, photo mode, camps, events, modes ================= */
const REFEREES = [
  { name: 'Frank Delgado', breakT: 1.1, count: .95, stopEarly: true, strict: true, note: 'quick to step in and quick to stop it' },
  { name: 'Marcus Webb', breakT: 2.2, count: 1.05, stopEarly: false, strict: false, note: 'lets them fight inside and gives a fighter every chance' },
  { name: 'Ana Ruiz', breakT: 1.6, count: 1.0, stopEarly: false, strict: true, note: 'by the book, and hard on fouls' },
  { name: 'Teddy Okoro', breakT: 1.8, count: 1.1, stopEarly: true, strict: false, note: 'a slow count, but he protects a hurt fighter' }
];
const TRAITS = {
  cocky: { name: 'Cocky', tell: 'He drops his hands to showboat. Make him pay when he does.' },
  iron: { name: 'Iron chin', tell: 'He has never been stopped. You will have to break him down.' },
  glass: { name: 'Suspect chin', tell: 'He has been dropped before. One clean shot could do it.' },
  nervous: { name: 'Nervous', tell: 'He backs off when pressured. Walk him down.' },
  dirty: { name: 'Dirty', tell: 'He holds, hits low and leans on you. Expect fouls.' },
  engine: { name: 'Engine', tell: 'He never stops throwing. Make him miss and he still keeps coming.' }
};
const pickTrait = () => Math.random() < .7 ? pick(Object.keys(TRAITS)) : null;

/* ---- standing eight counts (amateur bouts) ---- */
function standingEight(d) {
  if (G.eight || d.down) return;
  G.eight = { f: d, n: 0, t: 0 }; d.kdRound++; d.kdFight++; d.st.kd++;
  for (const f of [P, O]) { f.punch = null; f.queue = []; }
  showMsg('Standing eight', d.isPlayer ? 'The referee gives you a count' : `${d.name} takes a count`, 1.4);
}
function updateEight(dt) {
  const e = G.eight; e.t += dt;
  for (const f of [P, O]) { f.inp.mx = f.inp.mz = 0; f.inp.block = f === e.f; }
  if (e.t > (REFS.ref ? REFS.ref.count : 1) * .75) { e.t = 0; e.n++; if (REF && REF.root.visible) { REFS.countArm = 1; say(COUNTW[e.n] + '!', 'ref', true); } showMsg(String(e.n), ''); }
  if (e.n >= 8) {
    G.eight = null; showMsg('', ''); e.f.head = Math.min(e.f.headCap, e.f.head + 16); e.f.buckle = 0;
    if (e.f.kdRound >= 3) endFight(e.f === P ? O : P, 'TKO', 'Three counts in one round');
  }
}

/* ---- fouls ---- */
function foul(by, what) {
  if (G.sim || G.spar || G.state !== 'fight') return;
  const k = by.isPlayer ? 0 : 1; G.fouls[k]++;
  const strict = REFS.ref && REFS.ref.strict;
  if (G.fouls[k] >= (strict ? 2 : 3)) { G.deduct[k]++; refSay(`Point deducted: ${what}!`); showMsg('Point deducted', `${by.isPlayer ? 'You lose' : surname(by.name) + ' loses'} a point for ${what}`, 2); G.fouls[k] = 0; }
  else refSay(`Watch the ${what}!`);
  G.foulPause = .9;
}

/* ---- cutman between rounds ---- */
function cutmanUI() {
  if (!P.cut || P.cut.sev < .15) return '';
  return `<div class="card" id="cutman"><div class="kicker">Cutman</div><p>Your cut is ${P.cut.sev > .9 ? 'bad. One more bad round and the doctor stops it.' : 'bleeding.'} Press the button when the needle is in the gold zone. Three tries.</p>
    <div class="meter tall"><div class="zone" style="left:42%;width:16%"></div><div class="needle" id="cmNeedle"></div></div><button id="cmBtn" style="margin-top:8px">Press</button><span class="note" id="cmRes"></span></div>`;
}
function cutmanStart() {
  if (!$('cmBtn')) return;
  let tries = 3, t = 0, run = true, x = 0;
  const tick = () => { if (!run || !$('cmNeedle')) return; t += .016; x = (Math.sin(t * 3.4) + 1) / 2; $('cmNeedle').style.left = (x * 100) + '%'; requestAnimationFrame(tick); };
  tick();
  $('cmBtn').onclick = () => {
    if (tries <= 0) return; tries--;
    const ok = x > .42 && x < .58; if (ok) P.cut.sev = Math.max(0, P.cut.sev - .3);
    $('cmRes').textContent = ` ${ok ? 'Pressure held. Bleeding slowed.' : 'Missed the spot.'} ${tries} left.`;
    if (P.cut.sev <= 0.05) { P.cut = null; $('cmRes').textContent = ' Closed it up.'; tries = 0; }
    if (!tries) run = false;
  };
}

/* ---- crowd: chants on big moments, boos when nothing happens ---- */
const CROWD = { burst: [], idle: 0, chantT: 0, excite: 0 };
function crowdTick(dt) {
  if (G.sim || !AU.ctx) return;
  CROWD.burst = CROWD.burst.filter(t => G.time - t < 4);
  const busy = (P.punch || O.punch) ? 1 : 0; CROWD.idle = busy ? 0 : CROWD.idle + dt;
  CROWD.chantT -= dt;
  if (CROWD.burst.length >= 3 && CROWD.chantT <= 0) { CROWD.chantT = 9; CROWD.burst = []; chant(); }
  if (CROWD.idle > 9 && CROWD.chantT <= 0) { CROWD.chantT = 12; boo(); comment('idle'); }
}
function chant() { CROWD.excite = Math.max(CROWD.excite || 0, .8); for (let i = 0; i < 6; i++) setTimeout(() => { sfx.roar(i % 2 ? .07 : .2); }, i * 330); setTimeout(() => sfx.roar(.06), 2200); }
function boo() { if (!AU.ctx) return; const c = AU.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140, c.currentTime); o.frequency.linearRampToValueAtTime(110, c.currentTime + 1.6); f.type = 'lowpass'; f.frequency.value = 500; g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(.06 * SET.audio.crowd / 100, c.currentTime + .3); g.gain.linearRampToValueAtTime(0, c.currentTime + 1.8); o.connect(f).connect(g).connect(AU.master); o.start(); o.stop(c.currentTime + 1.9); }

/* ---- photo mode ---- */
const PHOTO = { on: false, yaw: .6, pitch: .25, dist: 3.2, drag: null };
function photoMode(on) {
  PHOTO.on = on; document.body.classList.toggle('photo', on);
  if (on) { showOnly(); $('photoBar').classList.remove('hidden'); } else { $('photoBar').classList.add('hidden'); $('photoShot').classList.add('hidden'); renderPause(); }
}
function photoCam() {
  const mid = P.pos.clone().add(O.pos).multiplyScalar(.5).setY(1.2);
  return [mid.clone().add(new V3(Math.cos(PHOTO.yaw) * Math.cos(PHOTO.pitch), Math.sin(PHOTO.pitch), Math.sin(PHOTO.yaw) * Math.cos(PHOTO.pitch)).multiplyScalar(PHOTO.dist)), mid];
}
function photoSnap() {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  $('photoShot').innerHTML = `<img alt="Your photo" src="${url}"><p class="note">Right-click the picture and choose Save image, or copy it.</p><button id="phClose">Close</button>`;
  $('photoShot').classList.remove('hidden'); $('phClose').onclick = () => $('photoShot').classList.add('hidden');
}
addEventListener('pointerdown', e => { if (PHOTO.on && e.target.tagName === 'CANVAS') PHOTO.drag = [e.clientX, e.clientY]; });
addEventListener('pointermove', e => { if (PHOTO.on && PHOTO.drag) { PHOTO.yaw += (e.clientX - PHOTO.drag[0]) * .006; PHOTO.pitch = clamp(PHOTO.pitch + (e.clientY - PHOTO.drag[1]) * .004, -.1, 1.3); PHOTO.drag = [e.clientX, e.clientY]; } });
addEventListener('pointerup', () => { PHOTO.drag = null; });
addEventListener('wheel', e => { if (PHOTO.on) PHOTO.dist = clamp(PHOTO.dist + e.deltaY * .002, 1, 8); }, { passive: true });

/* ---- camp planner: let the coach run the camp around one focus ---- */
const CAMPS = { power: ['bag', 'mitts', 'bag', 'combo'], speed: ['speed', 'mitts', 'defense', 'combo'], cardio: ['road', 'rope', 'road', 'spar'], defense: ['defense', 'spar', 'defense', 'mitts'], balanced: ['mitts', 'road', 'bag', 'spar'] };
function openCamp() {
  $('trainResult').innerHTML = `<h2>Plan the camp</h2><p>${PR.fightIn} week${PR.fightIn > 1 ? 's' : ''} until ${esc(PR.next.name)}. Pick a focus and your coach runs every session, resting you when fatigue gets high. Gains are smaller than playing the drills yourself.</p>
    <div class="seg">${Object.keys(CAMPS).map(k => `<button data-camp="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div><button id="cpBack" style="margin-top:8px">Back</button>`;
  showOnly('trainResult');
  for (const b of $('trainResult').querySelectorAll('[data-camp]')) b.onclick = () => runCamp(b.dataset.camp);
  $('cpBack').onclick = openTrainMenu;
}
function runCamp(focus) {
  const before = Object.assign({}, PR.stats), lines = []; let wk = 0;
  while (PR.fightIn > 0) {
    let id = CAMPS[focus][wk % 4];
    if (fatigueOf() > 55 || injuryBlocks(id)) id = 'rest';
    const t = TRAIN.find(x => x.id === id);
    if (t.auto) for (const [k, [a, b]] of Object.entries(t.auto)) gain(k, rand(a, b + .49) * .9);
    PR.fatigue = clamp(fatigueOf() + Math.round((t.load || 0) * .8) - 12, 0, 100);
    PR.fightIn--; PR.week++; careerWeek(PR); const ev = weekEvent(); if (ev) lines.push(`<p class="note">Week ${PR.week}: ${esc(ev)}</p>`);
    lines.push(`<p>Week ${PR.week - 1}: ${t.name.toLowerCase()}</p>`); wk++;
  }
  persist();
  $('trainResult').innerHTML = `<h2>Camp done</h2>${lines.join('')}<table><tbody>${STAT_KEYS.map(([k, l]) => `<tr><td>${l}</td><td>${before[k]} → ${PR.stats[k]}</td></tr>`).join('')}<tr><td>Fatigue</td><td>${fatigueOf()}</td></tr></tbody></table>
    <p class="note">Fight week. Time to face ${esc(PR.next.name)}.</p><button class="go" id="trDone">Back to the gym</button>`;
  showOnly('trainResult'); $('trDone').onclick = toHub;
}

/* ---- things that happen during a camp ---- */
function weekEvent() {
  if (Math.random() > .16) return null;
  const e = pick([
    () => { PR.fatigue = Math.min(100, fatigueOf() + 15); return 'You caught a cold. Fatigue up.'; },
    () => { const k = pick(STAT_KEYS)[0]; PR.stats[k] = Math.min(99, PR.stats[k] + 2); return `A retired champion dropped by the gym and worked with you. ${statName(k)} +2.`; },
    () => { if (PR.nextDeal && PR.nextDeal.purse) { PR.nextDeal.purse = Math.round(PR.nextDeal.purse * 1.1); return 'Your press conference went viral. Purse up 10%.'; } return 'A local paper ran a story on you.'; },
    () => { PR.weightCut = true; return 'Making weight is a struggle this camp. You will start the fight a little drained.'; },
    () => { PR.fatigue = Math.max(0, fatigueOf() - 15); return 'A good week of sleep and food. Fatigue down.'; },
    () => { PR.scout = PR.next ? PR.next.name : PR.scout; return 'Your coach got hold of tape on your next opponent.'; }
  ]);
  const t = e(); PR.news = t; return t;
}

/* ---- modes: tournament, daily challenge, legends ---- */
const LEGENDS = [
  { name: 'Joe "The Hammer" Calloway', style: 3, lvl: .97, h: 183, need: 'champion' },
  { name: 'Ricardo "El Rayo" Montes', style: 1, lvl: .96, h: 175, need: 'champion' },
  { name: 'Sugar Mike Langford', style: 2, lvl: .98, h: 180, need: 'hof' },
  { name: 'Vasily Orlov', style: 0, lvl: .95, h: 188, need: 'unified' },
  { name: 'Bobby "Bulldog" Grant', style: 4, lvl: .95, h: 170, need: 'top10' },
  { name: 'Kenji "Ghost" Mori', style: 2, lvl: .99, h: 176, need: 'hof' }
];
const legendUnlocked = L => SAVE.slots.some(p => p && p.trophies && p.trophies[L.need]);
function legendOpp(L, w) { const o = makeOpp(L.lvl, w, 0); Object.assign(o, { name: L.name, style: L.style, h: L.h, reach: L.h + 4, legend: true, trait: 'iron' }); o.rec = { w: randInt(40, 60), l: randInt(0, 3), d: randInt(0, 2) }; o.stats.chin = Math.min(99, o.stats.chin + 10); return o; }
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function dailyChallenge() {
  const d = new Date(), key = d.toISOString().slice(0, 10), r = seeded(+key.replace(/-/g, '')), me = qsFighter();
  const o = makeOpp(.55 + r() * .35, me.w, me.trunks); o.style = Math.floor(r() * STYLES.length); o.southpaw = r() < .4; o.trait = Object.keys(TRAITS)[Math.floor(r() * 6)];
  o.name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)]; o.rec = { w: 20, l: 2 };
  const mods = [['You start hurt', { hurt: true }], ['One three-minute round', { rounds: 1, len: 180 }], ['Twelve short rounds', { rounds: 12, len: 60 }], ['He is fresh, you are tired', { tired: true }]];
  const [mname, mod] = mods[Math.floor(r() * mods.length)];
  return { key, opp: o, mod, mname };
}
function openDaily() {
  const c = dailyChallenge(), best = (SAVE.daily || {})[c.key];
  $('quick').innerHTML = `<div class="kicker">Daily challenge · ${c.key}</div><h1>${esc(c.opp.name)}</h1>
    <p>${STYLES[c.opp.style].name}${c.opp.southpaw ? ', southpaw' : ''}, ${TRAITS[c.opp.trait].name.toLowerCase()}. Today's twist: <b class="gold">${esc(c.mname)}</b>.</p>
    <p class="note">Everyone gets the same opponent today. ${best ? `Your best today: ${esc(best)}.` : 'No attempt yet today.'}</p>
    <div class="seg" style="margin-top:12px"><button class="go" id="dGo">Fight</button><button id="dBack">Back</button></div>`;
  showOnly('quick');
  $('dGo').onclick = () => { const me = qsFighter(); QUICK = { opp: c.opp, daily: c, cfg: { fighter: me, rounds: c.mod.rounds || 3, roundLen: c.mod.len || 90 } }; startFight(c.opp, QUICK.cfg); };
  $('dBack').onclick = toMenu;
}
function openTourney(fresh) {
  if (fresh || !SAVE.tourney) {
    const me = qsFighter(), lv = QDIFF[QS.diff][1];
    SAVE.tourney = { round: 0, out: false, field: [0, 1, 2, 3, 4, 5, 6].map(i => { const o = makeOpp(clamp(lv + i * .03, 0, .97), me.w, me.trunks); o.rec = { w: randInt(5, 20), l: randInt(0, 5) }; return o; }), fighter: QS.fighter };
  }
  const T = SAVE.tourney, rounds = ['Quarterfinal', 'Semifinal', 'Final'];
  const opp = T.field[T.round];
  $('quick').innerHTML = `<div class="kicker">Tournament · eight fighters, three wins for the trophy</div><h1>${T.out ? 'Knocked out' : T.round >= 3 ? 'Tournament champion!' : rounds[T.round]}</h1>
    <ol class="bracket">${rounds.map((r, i) => `<li class="${i < T.round ? 'won' : i === T.round && !T.out ? 'now' : ''}">${r}: ${i < 3 ? esc(T.field[i].name) : ''}${i < T.round ? ' · won' : ''}</li>`).join('')}</ol>
    ${T.out || T.round >= 3 ? '' : `<p>${esc(opp.name)} · ${STYLES[opp.style].name} · ${recStr(opp.rec)}</p>`}
    <div class="seg" style="margin-top:12px">${T.out || T.round >= 3 ? '<button class="go" id="tNew">New tournament</button>' : '<button class="go" id="tGo">Fight</button>'}<button id="tBack">Back</button></div>`;
  showOnly('quick');
  if ($('tGo')) $('tGo').onclick = () => { QUICK = { opp, tourney: true, cfg: { fighter: qsFighter(), rounds: 3, roundLen: 90 } }; startFight(opp, QUICK.cfg); };
  if ($('tNew')) $('tNew').onclick = () => openTourney(true);
  $('tBack').onclick = toMenu;
}
