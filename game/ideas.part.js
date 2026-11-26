/* ================= the 25 Nov ideas ================= */
/* corner team, gym upgrades, sparring partners who remember you, press conferences and hype, the weigh-in,
   liver shots, the lead-foot battle, knockdown focus, TV scorecards, highlight reel, amateur championships,
   aging looks and scars, commentators with memory, gamepad, accessibility, a combo library and manager mode */

/* ---- corner team and gym upgrades ---- */
const TEAM = [
  { id: 'cutman', name: 'Cutman', cost: 15000, desc: 'Wider zone in the cut minigame, and cuts close faster between rounds.' },
  { id: 'nutri', name: 'Nutritionist', cost: 20000, desc: 'Recover 6 more fatigue a week and make weight more easily.' },
  { id: 'strength', name: 'Strength coach', cost: 30000, desc: 'Power and chin gains up 15%.' }
];
const GYMUP = [
  { id: 'bags', name: 'New heavy bags', cost: 12000, desc: 'Heavy bag sessions give 10% more.' },
  { id: 'ring', name: 'Full sparring ring', cost: 40000, desc: 'Sparring gains up 15%.' },
  { id: 'recovery', name: 'Recovery room', cost: 25000, desc: 'Fatigue drops 5 more every week.' },
  { id: 'video', name: 'Video room', cost: 10000, desc: 'Film study also sharpens your speed (+1).' }
];
const has = k => !!(PR && ((PR.team || {})[k] || (PR.gym || {})[k]));
function openTeam() {
  const row = (x, owned) => `<button class="wide offer" data-buy="${x.id}"${owned || (PR.money || 0) < x.cost ? ' disabled' : ''}><span>${x.name}<em>${owned ? 'Hired' : money(x.cost)}</em></span><small>${x.desc}</small></button>`;
  $('offers').innerHTML = `<div class="kicker">${money(PR.money || 0)} in the bank</div><h1>Team and gym</h1><h3>Your corner</h3>${TEAM.map(t => row(t, (PR.team || {})[t.id])).join('')}<h3>Gym upgrades</h3>${GYMUP.map(t => row(t, (PR.gym || {})[t.id])).join('')}<button id="tmBack" style="margin-top:8px">Back</button>`;
  showOnly('offers');
  for (const b of $('offers').querySelectorAll('[data-buy]')) b.onclick = () => {
    const id = b.dataset.buy, t = TEAM.find(x => x.id === id), g = GYMUP.find(x => x.id === id), it = t || g;
    if ((PR.money || 0) < it.cost) return; PR.money -= it.cost; if (t) (PR.team = PR.team || {})[id] = true; else (PR.gym = PR.gym || {})[id] = true;
    persist(); buildGymExtras(); openTeam();
  };
  $('tmBack').onclick = () => { renderHub(); showOnly('hub'); };
}
const gymExtras = new THREE.Group(); gym.add(gymExtras);
function buildGymExtras() {
  gymExtras.clear(); if (!PR) return;
  const leather = new THREE.MeshStandardMaterial({ color: 0x1d2a4a, roughness: .45 });
  if (has('bags')) for (const x of [-3.6, 3.6]) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .9, 6, 16), leather); b.position.set(x, 1.35, 1.6); gymExtras.add(b); }
  if (has('ring')) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.6, .25, 2.6), new THREE.MeshStandardMaterial({ color: 0x24408f, roughness: .8 })); r.position.set(3.4, .12, -2.6); gymExtras.add(r); }
  if (has('video')) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .8), new THREE.MeshBasicMaterial({ color: 0x3a6fd0 })); s.position.set(0, 2.2, -4.45); gymExtras.add(s); }
}

/* ---- sparring partners who remember you ---- */
function sparPartner() {
  PR.partners = PR.partners || [0, 1, 2].map(i => ({ name: pick(FIRST) + ' ' + pick(LAST), style: i % STYLES.length, lvl: .18 + i * .1, w: 0, l: 0, seen: {} }));
  return pick(PR.partners);
}
function partnerMemory(p) {
  const fav = Object.entries(p.seen || {}).sort((a, b) => b[1] - a[1])[0];
  return fav && fav[1] > 15 ? `${p.name.split(' ')[0]} remembers your ${PUNCH[fav[0]].name.toLowerCase()} from last time. He is watching for it.` : '';
}

/* ---- hype, press conferences, the weigh-in ---- */
const hypeMul = () => 1 + (PR.hype || 0) / 200;
function addHype(n, why) { PR.hype = clamp((PR.hype || 0) + n, 0, 100); if (why) PR.news = why; }
function pressConference(done) {
  const o = PR.next, opts = [
    ['Respect him', 'He is a good fighter. May the best man win.', 0, 0],
    ['Trash talk', `${surname(o.name)} is a nobody. I'm going to embarrass him.`, 14, .1],
    ['Predict a knockout', `He's going to sleep inside ${Math.max(3, Math.ceil(PR.rounds / 2))} rounds.`, 24, .06]
  ];
  $('prefight').innerHTML = `<div class="kicker">Fight week</div><h1>Press conference</h1><p>The cameras are on you. What do you say about ${esc(o.name)}?</p>
    ${opts.map((x, i) => `<button class="wide offer" data-pc="${i}"><span>${x[0]}</span><small>“${esc(x[1])}”${x[2] ? ` · hype +${x[2]}` : ''}</small></button>`).join('')}<p class="note">Hype raises your purses. Talk big and he will come out fired up; promise a knockout and the fans will expect one.</p>`;
  showOnly('prefight');
  for (const b of $('prefight').querySelectorAll('[data-pc]')) b.onclick = () => { const x = opts[+b.dataset.pc]; PR.press = { kind: +b.dataset.pc, fired: x[3] }; addHype(x[2]); if (PR.nextDeal && PR.nextDeal.purse) PR.nextDeal.purse = Math.round(PR.nextDeal.purse * (1 + x[2] / 200)); persist(); done(); };
}
function weighIn(done) {
  const wide = has('nutri') ? .26 : .16, lo = .5 - wide / 2;
  $('prefight').innerHTML = `<div class="kicker">The day before</div><h1>Weigh-in</h1><p>Make weight for ${WEIGHTS[PR.w][0].toLowerCase()}. Stop the needle in the gold zone. Too dry and you start drained; over the limit and you lose part of your purse.</p>
    <div class="meter tall"><div class="zone" style="left:${lo * 100}%;width:${wide * 100}%"></div><div class="needle" id="wiN"></div></div><button class="go" id="wiBtn" style="margin-top:10px">Step on the scale</button><p class="note" id="wiRes"></p>`;
  showOnly('prefight'); let t = 0, x = 0, run = true;
  const tick = () => { if (!run || !$('wiN')) return; t += .016; x = (Math.sin(t * 2.6) + 1) / 2; $('wiN').style.left = (x * 100) + '%'; requestAnimationFrame(tick); }; tick();
  $('wiBtn').onclick = () => {
    if (!run) return done(); run = false; const ok = x >= lo && x <= lo + wide;
    if (ok) { PR.weightCut = false; $('wiRes').textContent = 'On the mark. You made weight and feel strong.'; }
    else if (x > lo + wide) { PR.weightCut = false; if (PR.nextDeal && PR.nextDeal.purse) PR.nextDeal.purse = Math.round(PR.nextDeal.purse * .8); $('wiRes').textContent = 'Over the limit. You forfeit 20% of your purse.'; }
    else { PR.weightCut = true; $('wiRes').textContent = 'You dried out too much. You will start the fight drained.'; }
    $('wiBtn').textContent = 'On to fight night'; persist();
  };
}

/* ---- liver shots and the lead-foot battle ---- */
function liverCheck(a, d, p) {
  const leadHook = p.type === 'hook' && p.d.hand === (a.sp ? 'R' : 'L');
  if (p.body && leadHook && d.body < 42 && !d.down && !d.liver && Math.random() < .32) { d.liver = { t: rand(.5, 1.1), by: a }; }
}
function liverTick(dt) {
  for (const f of [P, O]) if (f.liver && !f.down) { f.liver.t -= dt; f.buckle = Math.max(f.buckle, .4); if (f.liver.t <= 0) { const by = f.liver.by; f.liver = null; popText('Liver shot', f.bodyPos(), '#ff6b6b'); comment('round', { text: pick([`Liver shot! ${callName(f)} is folding!`, `That body shot was delayed, and down he goes!`]) }); knockdown(f, by); } }
}
function outsideFoot(a, d) {   // southpaw against orthodox: whoever has his lead foot outside lands the rear hand cleaner
  if (!!a.sp === !!d.sp) return false;
  const side = a.pos.clone().sub(d.pos).dot(d.right());
  return a.sp ? side < -.05 : side > .05;
}

/* ---- knockdown recovery: focus a blurry screen ---- */
const FOCUS = { x: .5, v: .5 };
function focusTick(dt) {
  const d = P.down, el = $('focusDot'); if (!el) return;
  if (!d || d.rising != null || d.final || MODE !== 'fight') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden'); FOCUS.v += rand(-3, 3) * dt; FOCUS.v = clamp(FOCUS.v, -.9, .9); FOCUS.x += FOCUS.v * dt; if (FOCUS.x < .1 || FOCUS.x > .9) FOCUS.v *= -1; FOCUS.x = clamp(FOCUS.x, .1, .9);
  el.style.left = (FOCUS.x * 100) + '%';
  const blur = clamp((1 - d.mash / d.need) * 7, 0, 7); renderer.domElement.style.filter = `blur(${blur.toFixed(1)}px)`;
}
const focusBonus = () => Math.abs(FOCUS.x - .5) < .08 ? 2 : 1;

/* ---- TV scorecards ---- */
function tvScorecard() {
  if (!G.cards || !G.cards[0].length) return '';
  const tot = G.cards.map(c => [c.reduce((s, r) => s + r[0], 0), c.reduce((s, r) => s + r[1], 0)]);
  return `<div class="tvcard"><div class="tvh">Unofficial cards after ${G.cards[0].length} round${G.cards[0].length > 1 ? 's' : ''}</div>${tot.map((t, i) => `<div class="tvr"><span>Judge ${i + 1}</span><b class="${t[0] > t[1] ? 'r' : ''}">${t[0]}</b><b class="${t[1] > t[0] ? 'b' : ''}">${t[1]}</b></div>`).join('')}<div class="tvf"><span class="r">${esc(surname(P.name))}</span><span class="b">${esc(surname(O.name))}</span></div></div>`;
}

/* ---- highlight reel: your best knockouts, kept on this device ---- */
const REEL_KEY = 'boxing-reel-v1';
function reelLoad() { try { return JSON.parse(localStorage.getItem(REEL_KEY) || '[]'); } catch (e) { return []; } }
function reelSave(frames, title) {
  try {
    const pack = f => f ? { q: Array.from(f.q, v => Math.round(v * 10000)), h: [f.hx, f.hy, f.hz, f.x, f.y, f.z, f.rx, f.ry].map(v => +v.toFixed(3)) } : null;
    const clip = { title, date: new Date().toISOString().slice(0, 10), me: P.desc, opp: O.desc, f: frames.filter((_, i) => i % 2 === 0).map(fr => ({ P: pack(fr.P), O: pack(fr.O) })) };
    const reel = [clip, ...reelLoad()].slice(0, 3); localStorage.setItem(REEL_KEY, JSON.stringify(reel));
  } catch (e) { }
}
function reelPlay(i) {
  const clip = reelLoad()[i]; if (!clip) return;
  const un = f => f && { q: Float32Array.from(f.q, v => v / 10000), hx: f.h[0], hy: f.h[1], hz: f.h[2], x: f.h[3], y: f.h[4], z: f.h[5], rx: f.h[6], ry: f.h[7] };
  MODE = 'fight'; setScene('arena'); showOnly(); G.state = 'over'; G.winner = null; G.sim = false;
  if (clip.me) { P.look(clip.me); } if (clip.opp) { O.look(clip.opp); } O.root.visible = true; P.root.visible = true; if (REF) REF.root.visible = false;
  P.boneList = P.boneList || Object.values(P.B); O.boneList = O.boneList || Object.values(O.B);
  const frames = []; for (const fr of clip.f) { const a = { P: un(fr.P), O: un(fr.O), R: null }; frames.push(a, a); }
  REPLAY.play = { frames, i: 0, t: 0, done: () => { openRecords(); } }; $('replayTag').classList.remove('hidden'); $('replayTag').textContent = clip.title;
}

/* ---- amateur championships ---- */
function amTourneyNext(pr) {
  if (pr.stage !== 'amateur' || pr.amChamp || pr.am.w < 3) return false;
  pr.amT = pr.amT || { round: 0 }; if (pr.amT.out) return false;
  const o = makeOpp(clamp(.22 + pr.amT.round * .08, 0, .5), pr.w, pr.trunks); o.rec = { w: randInt(8, 16), l: randInt(0, 3) };
  pr.next = o; pr.fightIn = 1; pr.rounds = 3; pr.nextDeal = { kind: 'amchamp', round: pr.amT.round }; return true;
}
function amTourneyResult(pr, won, notes) {
  if (!pr.nextDeal || pr.nextDeal.kind !== 'amchamp') return;
  const names = ['quarterfinal', 'semifinal', 'final'];
  if (!won) { pr.amT.out = true; notes.push(`Out of the national championships in the ${names[pr.amT.round]}.`); return; }
  notes.push(`You won the ${names[pr.amT.round]} of the national amateur championships.`); pr.amT.round++;
  if (pr.amT.round >= 3) { pr.amChamp = true; addHype(25); notes.push('National amateur champion! The pro promoters noticed.'); }
}

/* ---- aging looks and scars ---- */
function ageLook(f, pr) {
  if (!pr || !f.mats.Hair) return;
  const age = ageOf(pr), base = new THREE.Color(pr.hair ?? 0x0c0806); f.mats.Hair.color.copy(base).lerp(new THREE.Color(0x9a9a96), clamp((age - 32) / 9, 0, .8));
  f.scarsM = f.scarsM || []; f.scarsM.forEach(m => m.removeFromParent()); f.scarsM = [];
  for (let i = 0; i < Math.min(4, pr.scars || 0); i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.028, .004, .006), new THREE.MeshStandardMaterial({ color: 0xc89a8a, roughness: .5 })); m.position.set([.045, -.045, .03, -.035][i], [.05, .052, .07, .066][i], .1); m.rotation.z = [.3, -.4, .1, -.2][i]; f.headMesh.add(m); f.scarsM.push(m); }
}

/* ---- commentators with a memory ---- */
function memoryLine() {
  if (QUICK || !PR) return '';
  const o = PR.next || G.oppDesc, pn = callName(P);
  const prev = (PR.history || []).filter(h => h.opp === (o && o.name));
  const streak = (() => { let n = 0; for (const h of (PR.history || []).slice().reverse()) { if (h.res === 'W') n++; else break; } return n; })();
  if (prev.length) { const h = prev[prev.length - 1]; return `These two have met before: ${h.res === 'W' ? `${pn} won` : h.res === 'L' ? `${callName(O)} won` : 'it was a draw'}${h.how ? ` by ${h.how === 'DEC' ? 'decision' : h.how}` : ''}.`; }
  if (PR.nextDeal && PR.nextDeal.kind === 'title' && !PR.titleWins) return `This is ${pn}'s first world title shot. A dream on the line tonight.`;
  if (streak >= 3) return `${pn} comes in on a ${words(streak)}-fight winning streak.`;
  if (PR.hype > 60) return `There is a lot of hype around ${pn}. The fans expect something special.`;
  return '';
}

/* ---- gamepad ---- */
const PAD = { prev: {} };
const PADMAP = { 2: 'jab', 3: 'cross', 1: 'hook', 0: 'upper', 7: 'over', 6: 'lupper', 14: 'slipL', 15: 'slipR', 13: 'roll', 12: 'feint', 10: 'clinch', 11: 'taunt', 8: 'cam', 9: 'pause' };
function padTick() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g && g.connected) : null; if (!gp) return;
  const ax = gp.axes, dz = v => Math.abs(v) < .25 ? 0 : v;
  held.left = dz(ax[0]) < 0; held.right = dz(ax[0]) > 0; held.up = dz(ax[1]) < 0; held.down = dz(ax[1]) > 0;
  held.block = gp.buttons[5] && gp.buttons[5].pressed; held.body = gp.buttons[4] && gp.buttons[4].pressed;
  gp.buttons.forEach((b, i) => { const was = PAD.prev[i]; PAD.prev[i] = b.pressed; if (b.pressed && !was && PADMAP[i]) { if (PADMAP[i] === 'pause') { if (MODE === 'fight' && G.state === 'fight') togglePause(); } else if (P && P.down && MODE === 'fight') mash(); else onAction(PADMAP[i]); } });
}

/* ---- accessibility ---- */
function oneButtonDefense() {   // block key reads the incoming punch: slip straights, roll hooks, block the rest
  const p = O.punch; if (!p || p.phase > 1) return false;
  if (!p.body && p.d.path === 'straight') { P.doSlip(Math.random() < .5 ? 1 : -1); return true; }
  if (!p.body && (p.d.path === 'hook' || p.d.path === 'over')) { P.doRoll(); return true; }
  return false;
}
function applyAccess() {
  const a = SET.access || {}; document.body.classList.toggle('cb', !!a.colorblind); document.body.classList.toggle('bigtext', !!a.bigText);
}

/* ---- combo library ---- */
const COMBO_LIB = [
  { name: 'Jab, cross, roll, overhand, lead uppercut', seq: [1, 2, 'R', 'OH', 5], note: 'From your video.' },
  { name: 'Jab, cross, hook, cross', seq: [1, 2, 3, 2], note: 'The classic four-punch combination.' },
  { name: 'Double jab, overhand', seq: [1, 1, 'OH'], note: 'Blind him with the jab, come over the top.' },
  { name: 'Jab, roll, cross, hook', seq: [1, 'R', 2, 3], note: 'Make him miss, then make him pay.' },
  { name: 'Lead uppercut, hook, cross', seq: [5, 3, 2], note: 'An inside combination for close range.' }
];
function openComboLib() {
  $('trainResult').innerHTML = `<h2>Combo library</h2><p>Your coach can teach any of these. Send more videos and more can be added.</p>${COMBO_LIB.map((c, i) => `<button class="wide offer" data-cl="${i}"><span>${esc(c.name)}</span><small>${esc(c.note)}</small></button>`).join('')}<button id="clBack" style="margin-top:8px">Back</button>`;
  showOnly('trainResult');
  for (const b of $('trainResult').querySelectorAll('[data-cl]')) b.onclick = () => { PR.comboPick = +b.dataset.cl; startDrill('combo'); };
  $('clBack').onclick = openTrainMenu;
}

/* ---- manager mode: run a stable of boxers ---- */
const MGR_FOCUS = [['power', 'Power'], ['speed', 'Speed'], ['cardio', 'Cardio'], ['chin', 'Chin'], ['rest', 'Rest']];
const rating = s => (s.power * .3 + s.speed * .3 + s.chin * .2 + s.cardio * .2) / 100;
function newProspect() { const w = randInt(1, 6), o = makeOpp(rand(.05, .2), w, 0); return { name: o.name, w, style: o.style, stats: { power: randInt(38, 56), speed: randInt(38, 56), chin: randInt(38, 56), cardio: randInt(38, 56) }, rec: { w: 0, l: 0, d: 0 }, ko: 0, focus: 'speed', fatigue: 0, booked: null, rank: null }; }
function mgr() { if (!SAVE.manager) SAVE.manager = { money: 50000, week: 1, stable: [newProspect(), newProspect(), newProspect()], log: [] }; return SAVE.manager; }
function openManager() {
  const M = mgr(); MODE = 'menu';
  $('offers').innerHTML = `<div class="kicker">Manager mode · week ${M.week} · ${money(M.money)}</div><h1>Your stable</h1>
    ${M.stable.map((b, i) => `<div class="card"><div class="big" style="font-size:22px">${esc(b.name)} <span class="note">${WEIGHTS[b.w][0]} · ${recStr(b.rec)} · ${STYLES[b.style].name}${b.rank ? ` · ranked ${b.rank}` : ''}</span></div>
      ${statBars(b.stats)}<p class="note">Fatigue ${Math.round(b.fatigue)}${b.booked ? ` · fights ${esc(b.booked.opp.name)} (${recStr(b.booked.opp.rec)}) in ${b.booked.weeks} week${b.booked.weeks > 1 ? 's' : ''}, purse ${money(b.booked.purse)}` : ''}</p>
      <div class="seg">${MGR_FOCUS.map(([k, n]) => `<button data-mf="${i}:${k}" aria-pressed="${b.focus === k}">${n}</button>`).join('')}</div>
      <div class="seg" style="margin-top:6px">${b.booked ? '' : `<button data-mb="${i}">Book a fight</button>`}<button data-mr="${i}">Release</button></div></div>`).join('')}
    ${M.stable.length < 5 ? `<button class="wide" id="mgSign"${M.money < 10000 ? ' disabled' : ''}><span>Sign a prospect</span><small>${money(10000)} signing bonus</small></button>` : ''}
    <div class="seg" style="margin-top:8px"><button class="go" id="mgWeek">Next week</button><button id="mgBack">Main menu</button></div>
    ${M.log.length ? `<details class="news" open><summary>Results</summary>${M.log.slice(0, 6).map(l => `<p class="note">${esc(l)}</p>`).join('')}</details>` : ''}`;
  showOnly('offers');
  const q = s => $('offers').querySelectorAll(s);
  for (const b of q('[data-mf]')) b.onclick = () => { const [i, k] = b.dataset.mf.split(':'); M.stable[+i].focus = k; Save.save(); openManager(); };
  for (const b of q('[data-mb]')) b.onclick = () => { const bx = M.stable[+b.dataset.mb], n = bx.rec.w + bx.rec.l, o = makeOpp(clamp(.15 + n * .05 + rand(-.05, .08), .05, .95), bx.w, 0); o.rec = { w: randInt(n, n + 6), l: randInt(0, 4) };
    bx.booked = { opp: o, weeks: randInt(2, 4), purse: Math.round((2000 + 90000 * Math.pow(o.level, 3)) / 100) * 100 }; Save.save(); openManager(); };
  for (const b of q('[data-mr]')) b.onclick = () => { M.stable.splice(+b.dataset.mr, 1); Save.save(); openManager(); };
  if ($('mgSign')) $('mgSign').onclick = () => { M.money -= 10000; M.stable.push(newProspect()); Save.save(); openManager(); };
  $('mgWeek').onclick = () => { mgrWeek(M); Save.save(); openManager(); };
  $('mgBack').onclick = toMenu;
}
function mgrWeek(M) {
  M.week++;
  for (const b of M.stable) {
    if (b.focus === 'rest') b.fatigue = Math.max(0, b.fatigue - 40);
    else { const k = b.focus, cur = b.stats[k]; b.stats[k] = Math.min(99, cur + Math.round(rand(1, 3) * (b.fatigue > 60 ? .5 : 1) * (1.25 - cur / 100))); b.fatigue = Math.min(100, b.fatigue + 16); }
    b.fatigue = Math.max(0, b.fatigue - 8);
    if (b.booked && --b.booked.weeks <= 0) {
      const o = b.booked.opp, me = rating(b.stats) * (1 - b.fatigue / 300), them = rating(o.stats);
      const pw = clamp(.5 + (me - them) * 4, .05, .95), won = Math.random() < pw, ko = Math.random() < .25 + Math.abs(b.stats.power - o.stats.power) / 150;
      const how = ko ? (Math.random() < .5 ? 'KO' : 'TKO') : 'decision';
      if (won) { b.rec.w++; if (ko) b.ko++; b.rank = b.rec.w >= 6 ? Math.max(1, (b.rank || 30) - randInt(2, 6)) : b.rank; } else { b.rec.l++; if (b.rank) b.rank = Math.min(40, b.rank + 4); }
      const cut = Math.round(b.booked.purse * .2); M.money += cut;
      M.log.unshift(`Week ${M.week}: ${b.name} ${won ? 'beat' : 'lost to'} ${o.name} by ${how}. Your cut: ${money(cut)}.`); M.log = M.log.slice(0, 12);
      b.booked = null; b.fatigue = Math.min(100, b.fatigue + 25);
    }
  }
}
