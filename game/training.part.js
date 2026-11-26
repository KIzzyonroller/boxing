/* ================= training ================= */
/* A training week: pick one session. Playable drills are scored and the score sets the gain; "Coach runs it" gives
   a smaller fixed gain without playing. Every session adds fatigue: carry too much and gains shrink and you start
   fights with less in the tank. Rest clears it. */
const TRAIN = [
  { id: 'mitts', name: 'Mitt work', stats: 'Speed, Power', load: 18, play: true, auto: { speed: [1, 2], power: [0, 2] }, desc: 'Throw the combos your trainer calls, on rhythm.' },
  { id: 'combo', name: 'Learn the combo', stats: 'Speed, Power', load: 16, play: true, auto: { speed: [1, 2] }, desc: 'Jab, cross, roll, overhand, lead uppercut. Your coach breaks it down move by move, then you put it together at speed.' },
  { id: 'bag', name: 'Heavy bag', stats: 'Power', load: 22, play: true, auto: { power: [1, 3] }, desc: 'Three rounds on the bag. Fresh, set punches hit hardest; arm punches thrown tired barely move it.' },
  { id: 'speed', name: 'Speed bag', stats: 'Speed', load: 10, play: true, auto: { speed: [1, 2] }, desc: 'Alternate jab and cross on the beat as the tempo climbs.' },
  { id: 'rope', name: 'Skipping rope', stats: 'Cardio, Speed', load: 14, play: true, auto: { cardio: [1, 2] }, desc: 'Jump as the rope comes round. It speeds up; a trip resets your streak.' },
  { id: 'road', name: 'Roadwork', stats: 'Cardio', load: 20, play: true, auto: { cardio: [1, 3] }, desc: 'Interval run. Push the pace to keep your heart rate in the zone your coach calls.' },
  { id: 'defense', name: 'Defense drill', stats: 'Speed', load: 15, play: true, auto: { speed: [1, 2] }, desc: 'Your trainer throws with no warning. Slip the straights, block the hooks.' },
  { id: 'spar', name: 'Sparring', stats: 'Chin, Speed, Cardio', load: 30, play: true, auto: { chin: [1, 2], speed: [0, 1] }, desc: 'A real round with a sparring partner, headgear on. Lighter damage; your coach stops it if you are hurt.' },
  { id: 'film', name: 'Study film', stats: 'Scouting', load: 0, desc: 'Watch tape of your next opponent. Learn his habits; on fight night his power shots are easier to see coming.' },
  { id: 'rest', name: 'Rest', stats: 'Recovery', load: -45, desc: 'Take the week easy. Clears most of your fatigue.' }
];
const fatigueOf = () => Math.round(PR.fatigue || 0);
const fatigueWord = f => f >= 70 ? 'overtrained' : f >= 45 ? 'tired' : f >= 20 ? 'working' : 'fresh';
const fatigueMul = () => { const f = fatigueOf(); return f >= 70 ? .5 : f >= 45 ? .8 : 1; };
function gain(stat, amt) { const cur = PR.stats[stat], age = ageOf(PR); amt *= ((stat === 'power' || stat === 'chin') && has('strength') ? 1.15 : 1) * (TR.kind === 'bag' && has('bags') ? 1.1 : 1) * (G.spar && has('ring') ? 1.15 : 1); const g = Math.max(0, Math.round(amt * fatigueMul() * (TRAINERS[PR.trainer || 0] || TRAINERS[0]).mult * (age <= 25 ? 1.12 : age >= 33 ? .6 : age >= 30 ? .8 : 1) * (1.25 - cur / 100))); PR.stats[stat] = Math.min(99, cur + g); return g; }
const statName = k => STAT_KEYS.find(s => s[0] === k)[1];
const gainLine = (k, g) => `<p>${statName(k)}: <span class="gain">+${g}</span> → ${PR.stats[k]}</p>`;
function fatigueBar() {
  const f = fatigueOf(), col = f >= 70 ? 'var(--red)' : f >= 45 ? '#f0a040' : 'var(--gold)';
  return `<div class="stat"><span>Fatigue</span><div class="bar"><i style="width:${f}%;background:${col}"></i></div><b>${f}</b></div><p class="note">You're ${fatigueWord(f)}.${f >= 45 ? ` Gains are ${f >= 70 ? 'halved' : 'reduced'}${f >= 40 ? ', and you would start a fight with less stamina' : ''}.` : ''}</p>`;
}
function openTrainMenu() {
  MODE = 'hub';
  $('trainMenu').innerHTML = `<div class="kicker">Week ${PR.week} · ${PR.fightIn} week${PR.fightIn > 1 ? 's' : ''} until you fight ${esc(PR.next.name)}</div><h1>Training</h1>
    <p>One session a week. Gains shrink as a stat gets higher.</p>${fatigueBar()}
    ${PR.injury ? `<p class="bad">Injured: ${esc(PR.injury.what)}, ${PR.injury.weeks} more week${PR.injury.weeks > 1 ? 's' : ''}. Hard sessions are off.</p>` : ''}
    ${TRAIN.map(t => `<div class="drillrow"><button class="wide" data-t="${t.id}"${injuryBlocks(t.id) ? ' disabled' : ''}><span>${t.name}<em>${t.stats}${t.load > 0 ? ` · fatigue +${t.load}` : ''}</em></span><small>${t.desc}</small></button>${t.auto && !injuryBlocks(t.id) ? `<button class="auto" data-auto="${t.id}" title="Your coach runs the session: a smaller gain, no playing">Coach runs it</button>` : ''}</div>`).join('')}
    <button class="wide" id="tCamp" style="margin-top:8px"><span>Plan the whole camp</span><small>Pick a focus; your coach runs every week until fight night</small></button>
    <button id="tBack" style="margin-top:8px">Back</button>`;
  showOnly('trainMenu');
  for (const b of $('trainMenu').querySelectorAll('[data-t]')) b.onclick = () => runTraining(b.dataset.t);
  for (const b of $('trainMenu').querySelectorAll('[data-auto]')) b.onclick = () => autoTraining(b.dataset.auto);
  $('tCamp').onclick = openCamp;
  $('tBack').onclick = () => { renderHub(); showOnly('hub'); };
}
function finishWeek(lines, title, got = [], load = 0) {
  const before = fatigueOf();
  PR.fatigue = clamp(before + load - 12 - (has('nutri') ? 6 : 0) - (has('recovery') ? 5 : 0), 0, 100);
  PR.fightIn = Math.max(0, PR.fightIn - 1); PR.week++; careerWeek(PR);
  const wev = weekEvent(); if (wev) lines.push(`<p class="gold">This week: ${esc(wev)}</p>`);
  if (load >= 20 && PR.fatigue >= 70 && !PR.injury && Math.random() < .3) { PR.injury = { what: pick(['a strained shoulder', 'a sore hand', 'a tweaked back']), weeks: randInt(2, 3) }; lines.push(`<p class="bad">Overtraining caught up with you: ${PR.injury.what}. ${PR.injury.weeks} weeks out of hard training.</p>`); }
  persist();
  const f = fatigueOf();
  $('trainResult').innerHTML = `<h2>${esc(title)}</h2>${lines.join('')}${trophyLines(got)}
    <p class="note">Fatigue ${before} → ${f} (${fatigueWord(f)}).${f >= 70 ? ' Your coach wants you to rest.' : ''}</p>
    <p class="note">${PR.fightIn ? `${PR.fightIn} week${PR.fightIn > 1 ? 's' : ''} until you fight ${esc(PR.next.name)}.` : `Fight week. Time to face ${esc(PR.next.name)}.`}</p><button class="go" id="trDone">Back to the gym</button>`;
  showOnly('trainResult'); $('trDone').onclick = toHub; $('trDone').focus();
}
function autoTraining(id) {
  const t = TRAIN.find(x => x.id === id);
  const lines = Object.entries(t.auto).map(([k, [a, b]]) => gainLine(k, gain(k, rand(a, b + .49))));
  finishWeek([`<p>Your coach ran a steady ${t.name.toLowerCase()} session.</p>`, ...lines], `${t.name} done`, [], Math.round(t.load * .8));
}
function runTraining(id) {
  const t = TRAIN.find(x => x.id === id);
  if (id === 'rest') return finishWeek(['<p>A quiet week: sleep, stretching, good food.</p>'], 'Rest week', [], t.load);
  if (id === 'film') {
    const o = PR.next, S = STYLES[o.style]; PR.scout = o.name;
    const tend = [S.tell + (o.southpaw ? ' He is a southpaw.' : ''), ...(o.trait ? [TRAITS[o.trait].tell] : []),
      o.stats.power > o.stats.speed ? 'His right hand is the danger, and he loads up before it: you can see it coming.' : 'He is quicker than he is heavy-handed. Volume, not one shot.',
      o.stats.cardio < 50 ? 'He fades late. Make him work early.' : 'He keeps his pace for the whole fight.',
      o.stats.chin < 50 ? 'He has been hurt by body shots before.' : 'He takes a good shot.'];
    const vg = has('video') ? gain('speed', 1.2) : 0;
    return finishWeek([(vg ? gainLine('speed', vg) : '') + `<p>You watched four of ${esc(o.name)}'s fights. ${esc(S.name)}.</p><ul>${tend.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="note">On fight night his power shots are a little slower to arrive: you know what to look for.</p>`], 'Film study', [], 4);
  }
  if (id === 'spar') return startSpar();
  if (id === 'combo') return openComboLib();
  return startDrill(id);
}

/* ---------- drill props in the gym ---------- */
const DP = new THREE.Group(); gym.add(DP);
{
  const leather = new THREE.MeshStandardMaterial({ color: 0x6b1418, roughness: .42 }), steel = new THREE.MeshStandardMaterial({ color: 0x3a3c40, metalness: .8, roughness: .4 });
  const tape = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: .6 });
  // heavy bag hanging from a pivot so it swings
  const hb = DP.heavy = new THREE.Group(); hb.position.set(0, 3.2, .66);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.2, 6), steel); chain.position.y = -.6; hb.add(chain);
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(.21, .95, 6, 18), leather); bag.position.y = -1.95; bag.castShadow = true; hb.add(bag); hb.userData.bag = bag;
  for (const y of [-1.55, -2.35]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .06, 18), tape); b.position.y = y; hb.add(b); }
  hb.userData.ang = new V3(); hb.userData.vel = new V3();
  // speed bag on a board
  const sb = DP.speed = new THREE.Group(); sb.position.set(0, 2.08, .46);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .05, 28), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: .7 })); sb.add(board);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .5), steel); arm.position.set(0, .05, -.28); sb.add(arm);
  const swivel = new THREE.Group(); swivel.position.y = -.04; sb.add(swivel); sb.userData.swivel = swivel; sb.userData.a = 0; sb.userData.v = 0;
  const sball = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), leather); sball.scale.set(1, 1.4, 1); sball.position.y = -.15; swivel.add(sball); sb.userData.ball = sball;
  // skipping rope: a curve between the hands, spun about the line joining them
  const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new V3(-.5 + u, -Math.sin(Math.PI * u), 0)); }
  const rope = DP.rope = new THREE.Group(); const rmesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .008, 5, false), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: .5 })); rope.add(rmesh); rope.userData.mesh = rmesh;
  for (const k of ['heavy', 'speed', 'rope']) DP[k].visible = false, DP.add(DP[k]);
}
function propsFor(kind) { DP.heavy.visible = kind === 'bag'; DP.speed.visible = kind === 'speed'; DP.rope.visible = kind === 'rope'; }

/* ---------- drill framework ---------- */
const COMBOS = [[1], [1, 1], [1, 2], [1, 2], [1, 1, 2], [1, 2, 3], [3, 2], [2, 3, 2], [1, 6, 3], [1, 2, 3, 2], [6, 3, 2], [1, 2, 6, 3]];
const NUM = { 1: 'jab', 2: 'cross', 3: 'hook', 5: 'lupper', 6: 'upper', OH: 'over', R: 'roll' }, ACTNUM = { jab: 1, cross: 2, hook: 3, lupper: 5, upper: 6, over: 'OH', roll: 'R' };
const NUMWORD = { 1: 'One', 2: 'Two', 3: 'Three', 5: 'Five', 6: 'Six', OH: 'Overhand', R: 'Roll' };
const NAMEW = { 1: 'Jab', 2: 'Cross', 3: 'Hook', 5: 'Lead uppercut', 6: 'Uppercut', OH: 'Overhand', R: 'Roll under' };
const NUMLBL = { OH: 'Over', R: 'Roll' };
const comboWords = seq => TR.kind === 'combo' ? seq.map(n => NAMEW[n]).join(', ') + '!' : seq.map((n, i) => i ? NUMWORD[n].toLowerCase() : NUMWORD[n]).join(', ') + '!';
const TR = {};
function trainerSetup(dist) {
  O.root.visible = true; O.look({ h: 176, reach: 178, build: 2, skin: 1, trunks: 2, gloves: 2, trim: 2, mittColor: 0xc9a46a, shoes: 0x222222 });
  O.stats({ stats: { power: 30, speed: 40, chin: 50, cardio: 50 }, w: 4, build: 1 });
  O.reset(new V3(0, 0, dist), Math.PI); O.mitt = true;
  O.aimFor = p => O.gloves[p.d.hand === 'L' ? 'R' : 'L'].getWorldPosition(new V3());
}
function dummyTarget(z, aim) {   // an invisible stand-in so the punch code has something to aim at
  O.root.visible = false; O.look({ h: 180, reach: 180, build: 1, skin: 1, trunks: 2, gloves: 2, trim: 2 }); O.reset(new V3(0, 0, z), Math.PI); O.mitt = false; O.aimFor = aim;
}
function drillHUD(on) { $('drill').classList.toggle('hidden', !on); $('call').classList.toggle('hidden', !on); }
function setCall(big, keys, meta) { $('callNums').innerHTML = big; $('callKeys').textContent = keys || ''; $('callMeta').textContent = meta || ''; }
function startDrill(kind) {
  MODE = 'train'; setScene('gym'); audioInit(); showOnly(); propsFor(kind);
  P.look(PR); P.stats(PR); P.mitt = false; P.reset(new V3(0, 0, 0), 0);
  for (const k in TR) delete TR[k];
  Object.assign(TR, { kind, t: 0, done: false, load: TRAIN.find(x => x.id === kind).load });
  drillHUD(true); $('drill').innerHTML = '';
  ({ mitts: setupMitts, combo: setupCombo, bag: setupBag, speed: setupSpeed, rope: setupRope, road: setupRoad, defense: setupDefense })[kind]();
}
function abandonDrill() {
  if (MODE !== 'train') return;
  TR.done = true; hush(); drillHUD(false); fightUI(false); propsFor(null); P.root.position.y = 0; idleGym(PR); openTrainMenu();
}
function trainAction(a) {
  if (TR.done) return;
  ({ mitts: mittAction, combo: mittAction, bag: bagAction, speed: speedAction, rope: ropeAction, road: () => { }, defense: defenseAction })[TR.kind](a);
}
function updateDrill(dt) {
  TR.t += dt;
  ({ mitts: updateMitts, combo: updateMitts, bag: updateBag, speed: updateSpeed, rope: updateRope, road: updateRoad, defense: updateDefense })[TR.kind](dt);
}
function endDrill(title, lines, got = []) {
  TR.done = true; drillHUD(false); fightUI(false); propsFor(null); P.root.position.y = 0;
  finishWeek(lines, title, got, TR.load);
}
const coach = t => say(t, 'coach');
const coachQuiet = t => say(t, 'coach', true);
function warmCoach(lines) { if (kokoroOn()) lines.forEach(t => prepareLine(t, 'coach')); }
const tbl = rows => `<table><tbody>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>`;

/* ---------- mitts ---------- */
function setupMitts() {
  trainerSetup(.42); P.reset(new V3(0, 0, -.45), 0);
  const list = []; for (let i = 0; i < 10; i++) list.push(COMBOS[Math.min(COMBOS.length - 1, randInt(0, 3) + Math.floor(i * .9))]);
  Object.assign(TR, { list, i: -1, seq: null, pos: 0, wait: 1.4, last: 0, perfect: 0, good: 0, slow: 0, punches: 0, clean: 0, landed: 0, failed: false });
  warmCoach(list.map(comboWords));
  fightUI(true, `Throw what the trainer calls: ${K('jab')} = 1 jab · ${K('cross')} = 2 cross · ${K('hook')} = 3 hook · ${K('upper')} = 6 uppercut · Esc stops the session`);
  setCall('Ready', '', 'Mitt work · 10 combos');
}
const VIDEO_COMBO = [1, 2, 'R', 'OH', 5];
const comboSeq = () => (COMBO_LIB[PR && PR.comboPick || 0] || COMBO_LIB[0]).seq;
function setupCombo() {
  setupMitts();
  const C = comboSeq(); TR.combo = C;
  TR.list = [...C.map(n => [n]), C.slice(0, 2), C.slice(0, 3), C.slice(-3), C, C, C, C];
  TR.rolls = 0; TR.rollOk = 0;
  warmCoach(TR.list.map(comboWords).concat(['Now put it all together.']));
  fightUI(true, `${K('jab')} jab · ${K('cross')} cross · ${K('roll')} roll under his hook · ${K('over')} overhand · ${K('lupper')} lead uppercut · Esc stops the session`);
  setCall('Ready', '', 'Learn the combo · move by move, then at speed');
}
function renderCall(badAt) {
  const teach = TR.kind === 'combo' && TR.i < TR.combo.length;
  setCall(TR.seq.map((n, i) => `<span class="${i < TR.pos ? 'done' : i === badAt ? 'bad' : ''}">${teach ? NAMEW[n] : NUMLBL[n] || n}</span>`).join(' · '), TR.seq.map(n => K(NUM[n])).join(' · '),
    TR.kind === 'combo' ? (teach ? `Step ${TR.i + 1} of ${TR.combo.length}: ${({ 1: 'snap it straight out and back', 2: 'turn the back foot, hips through', R: 'bend the knees, dip under his hook in a U, hands glued to your head', OH: 'lean forward and loop the right hand over his guard', 5: 'dip to your lead side, elbow bent, drive up', 3: 'turn the lead hip and shoulder, elbow level', 6: 'drop the rear shoulder and drive up through the chin' })[TR.seq[0]]}` : TR.i === TR.combo.length ? 'Now in pieces' : `Full combo ${TR.i - TR.combo.length - 2} of 4 · at speed`) : `Combo ${TR.i + 1} of ${TR.list.length}`);
  if (TR.seq[TR.pos] === 'R' && !O.punch) { O.speed = .55; O.stam = 100; O.startPunch('hook', false); }
}
function nextCombo() {
  TR.i++; if (TR.i >= TR.list.length) return endMitts();
  TR.seq = TR.list[TR.i]; TR.pos = 0; TR.failed = false; TR.t = 0; TR.last = 0; TR.wait = 0; renderCall();
  if (TR.kind === 'combo' && TR.i === TR.combo.length + 3) coachQuiet('Now put it all together.'); else coachQuiet(comboWords(TR.seq));
}
function mittAction(a) {
  const n = ACTNUM[a]; if (!n || !TR.seq || TR.wait > 0) return;
  const now = TR.t, gap = now - TR.last;
  const mitt = n === 'R' ? P.headPos().add(new V3(0, .3, 0)) : O.gloves[PUNCH[NUM[n]].hand === 'L' ? 'R' : 'L'].getWorldPosition(new V3());
  if (n !== TR.seq[TR.pos]) { TR.failed = true; renderCall(TR.pos); popText(n === 'R' || TR.seq[TR.pos] === 'R' ? 'Roll under the hook' : 'Wrong punch', mitt, '#ff6b6b'); TR.wait = .9; return; }
  if (n === 'R') { P.doRoll(); TR.rolls = (TR.rolls || 0) + 1; } else P.startPunch(NUM[n], false);
  TR.punches++;
  const slow = n === 'R' || n === 'OH' ? .18 : 0;
  const grade = TR.pos === 0 ? (gap < .9 ? 2 : gap < 1.4 ? 1 : 0) : (gap < .45 + slow ? 2 : gap < .7 + slow ? 1 : 0);
  if (grade === 2) TR.perfect++; else if (grade === 1) TR.good++; else TR.slow++;
  popText(['Slow', 'Good', 'Perfect'][grade], mitt, ['#ff9b6b', '#f2efe8', '#e8b931'][grade]);
  TR.last = now; TR.pos++; renderCall();
  if (TR.pos >= TR.seq.length) { TR.clean++; TR.wait = .9; }
}
function mittLanding(onLand) {
  const p = P.punch;
  if (p && !p.hit && ((p.phase === 1 && p.k > .55) || (p.phase === 2 && p.k < .2))) {
    const side = p.d.hand === 'L' ? 'R' : 'L', g = P.gloves[p.d.hand].getWorldPosition(new V3()), m = O.gloves[side].getWorldPosition(new V3());
    if (g.distanceTo(m) < .2 * P.s) { p.hit = true; sfx.pad(); O.mittKick[side] = .07; burst(m, new V3(0, .4, 0), 4); onLand(p); }
  }
}
function updateMitts(dt) {
  P.stam = Math.max(P.stam, 60); P.update(dt, O, T0); O.update(dt, P, T0 + 1.3);
  if (TR.wait > 0) { TR.wait -= dt; if (TR.wait <= 0) nextCombo(); }
  else if (TR.seq && TR.t - TR.last > (TR.pos === 0 ? 2.6 : 1.4)) { TR.failed = true; renderCall(TR.pos); TR.wait = .9; }
  mittLanding(() => TR.landed++);
}
function endMitts() {
  if (TR.kind === 'combo' && !TR.comboPrinted) { TR.comboPrinted = true; }
  const rhythm = TR.punches ? (TR.perfect + TR.good * .5) / TR.punches : 0, combos = TR.clean / TR.list.length, landed = TR.punches ? TR.landed / TR.punches : 0;
  const gs = gain('speed', 1 + 4 * rhythm), gp = gain('power', 1 + 3 * combos * landed);
  const got = checkTrophies({ mitts: true, perfectAll: TR.punches > 0 && TR.perfect === TR.punches && TR.clean === TR.list.length });
  const verdict = rhythm > .75 ? 'Sharp hands today.' : rhythm > .45 ? 'Decent. Faster between punches next time.' : 'Snap the combos together, not one punch at a time.';
  coach(verdict);
  if (TR.kind === 'combo') PR.combo = true;
  endDrill(TR.kind === 'combo' ? 'Combo session done' : 'Mitt work done', [TR.kind === 'combo' ? `<p>${esc((COMBO_LIB[PR.comboPick || 0] || COMBO_LIB[0]).name)}. A punch straight after a roll lands harder.</p>` : '', tbl([['Combos completed', `${TR.clean} of ${TR.list.length}`], ['On rhythm (perfect / good / slow)', `${TR.perfect} / ${TR.good} / ${TR.slow}`], ['Punches that hit the mitt', `${TR.landed} of ${TR.punches}`]]),
    gainLine('speed', gs), gainLine('power', gp), `<p class="note">Your trainer: “${verdict}”</p>`], got);
}

/* ---------- heavy bag ---------- */
const BAG_ROUND = 25, BAG_REST = 7;
function bagCenter(v = new V3()) { return DP.heavy.userData.bag.getWorldPosition(v); }
function setupBag() {
  const hb = DP.heavy; hb.userData.ang.set(0, 0, 0); hb.userData.vel.set(0, 0, 0); hb.rotation.set(0, 0, 0);
  dummyTarget(.66, p => { const c = bagCenter(); c.z -= .2; c.y = p.body ? 1.0 : 1.38; return c; });
  P.reset(new V3(0, 0, -.12), 0); P.stam = 100;
  Object.assign(TR, { round: 1, clock: BAG_ROUND, rest: 0, force: 0, landed: 0, thrown: 0, fresh: 0, callT: 3, call: null, callOk: 0, callN: 0, peak: 0 });
  warmCoach(['Work!', 'Time! Breathe.', 'Last round. Empty the tank!', 'Three, two!', 'One, two!', 'Jab, jab, two!', 'Body, body!', 'Six, three!']);
  fightUI(true, `Punch the bag: ${K('jab')} ${K('cross')} ${K('hook')} ${K('upper')}, hold ${K('body')} to dig to the body. Watch your stamina: tired punches are weak. Esc stops the session`);
  sfx.bell(1); coach('Work!');
}
const BAG_CALLS = [['Three, two!', [3, 2]], ['One, two!', [1, 2]], ['Jab, jab, two!', [1, 1, 2]], ['Six, three!', [6, 3]], ['Body, body!', ['b', 'b']]];
function bagAction(a) {
  if (TR.rest > 0 || !ACTP[a]) return;
  if (P.startPunch(ACTP[a], !!held.body)) {
    TR.thrown++;
    if (TR.call) { const need = TR.call.seq[TR.call.pos], ok = need === 'b' ? !!held.body : need === ACTNUM[a]; if (ok) { TR.call.pos++; if (TR.call.pos >= TR.call.seq.length) { TR.callOk++; popText('Good', bagCenter().add(new V3(0, .7, 0)), '#e8b931'); TR.call = null; } } else TR.call = null; }
  }
}
function updateBag(dt) {
  const hb = DP.heavy, u = hb.userData;
  // swinging: a damped pendulum in two directions
  for (const k of ['x', 'z']) { u.vel[k] += (-9 * u.ang[k] - 1.6 * u.vel[k]) * dt; u.ang[k] += u.vel[k] * dt; }
  hb.rotation.set(u.ang.x, 0, u.ang.z);
  P.inp.mx = P.inp.mz = 0; P.inp.block = false;
  P.update(dt, O, T0);
  const p = P.punch;
  if (p && !p.hit && p.phase === 1 && p.k > .45) {
    const g = P.gloves[p.d.hand].getWorldPosition(new V3()), c = bagCenter(), dx = g.x - c.x, dz = g.z - c.z;
    if (Math.hypot(dx, dz) < .34 && g.y > .55 && g.y < 1.9) {
      p.hit = true;
      const stamF = .3 + .7 * Math.pow(clamp(P.stam / 100, 0, 1), .8), f = Math.round(p.d.dmg * P.power * stamF * (p.body ? 1.1 : 1) * 10);
      TR.force += f; TR.landed++; TR.fresh += stamF; TR.peak = Math.max(TR.peak, f);
      const dir = new V3(dx, 0, dz).normalize(); if (p.d.path !== 'straight') dir.x += p.d.hand === 'L' ? .8 : -.8;
      u.vel.x += f * .004 * (p.d.path === 'upper' ? .4 : 1); u.vel.z -= dir.x * f * .002;
      sfx.hit(f / 14); burst(g, new V3(0, .3, .3), 3);
      popText(String(f), g.clone().add(new V3(0, .2, 0)), stamF > .8 ? '#e8b931' : stamF > .55 ? '#f2efe8' : '#ff9b6b');
    }
  }
  if (TR.rest > 0) {
    TR.rest -= dt; P.stam = Math.min(100, P.stam + dt * 9);
    setCall(`Rest · ${Math.ceil(TR.rest)}`, '', `Round ${TR.round} of 3 next`);
    if (TR.rest <= 0) { TR.clock = BAG_ROUND; sfx.bell(1); coach(TR.round === 3 ? 'Last round. Empty the tank!' : 'Work!'); }
  } else {
    TR.clock -= dt;
    TR.callT -= dt;
    if (TR.callT <= 0 && !TR.call) { const c = pick(BAG_CALLS); TR.call = { seq: c[1], pos: 0, t: 1.8 }; TR.callN++; coachQuiet(c[0]); TR.callT = rand(3.5, 5.5); }
    if (TR.call) { TR.call.t -= dt; if (TR.call.t <= 0) TR.call = null; }
    const callTxt = TR.call ? BAG_CALLS.find(c => c[1] === TR.call.seq)[0] : '';
    setCall(callTxt ? `<span class="done">${callTxt}</span>` : `${Math.max(0, Math.ceil(TR.clock))}`, callTxt ? '' : '', `Round ${TR.round} of 3 · force ${TR.force}`);
    if (TR.clock <= 0) {
      sfx.bell(TR.round === 3 ? 3 : 1);
      if (TR.round === 3) return endBag();
      TR.round++; TR.rest = BAG_REST; TR.call = null; coach('Time! Breathe.');
    }
  }
  $('drill').innerHTML = `<div class="row"><span>Stamina</span><span>${Math.round(P.stam)}</span></div><div class="meter"><i style="width:${P.stam}%;background:${P.stam > 55 ? 'var(--green)' : P.stam > 25 ? '#f0a040' : 'var(--red)'}"></i></div>`;
}
function endBag() {
  const fresh = TR.landed ? TR.fresh / TR.landed : 0, work = clamp(TR.landed / 70, 0, 1), calls = TR.callN ? TR.callOk / TR.callN : 0;
  const q = fresh * (.6 + .4 * calls) * (.4 + .6 * work);
  const gp = gain('power', 1 + 4 * q), gc = gain('cardio', work > .7 ? 1 : 0);
  const verdict = fresh > .8 ? 'Every shot was set. That is how you punch.' : fresh > .6 ? 'Good work. Pace yourself so the late punches still hurt.' : 'Too many arm punches. Rest your hands, then sit down on the shots.';
  coach(verdict);
  endDrill('Heavy bag done', [tbl([['Punches landed', `${TR.landed} of ${TR.thrown}`], ['Total force', TR.force], ['Hardest shot', TR.peak], ['Punched while fresh', `${Math.round(fresh * 100)}%`], ['Coach calls hit', `${TR.callOk} of ${TR.callN}`]]),
    gainLine('power', gp), gc ? gainLine('cardio', gc) : '', `<p class="note">Your trainer: “${verdict}”</p>`]);
}

/* ---------- speed bag ---------- */
const SB_LEN = 36;
function setupSpeed() {
  dummyTarget(.6, () => DP.speed.userData.ball.getWorldPosition(new V3()));
  P.reset(new V3(0, 0, .02), 0);
  const notes = []; let t = 2.2, k = 0;
  while (t < SB_LEN + 2) { const bpm = 100 + 90 * clamp((t - 2) / SB_LEN, 0, 1); notes.push({ t, a: k % 2 ? 'cross' : 'jab', res: null }); k++; t += 60 / bpm; }
  Object.assign(TR, { notes, ni: 0, perfect: 0, good: 0, miss: 0, streak: 0, best: 0 });
  fightUI(true, `Hit ${K('jab')} on gold notes and ${K('cross')} on red ones as they cross the line. Esc stops the session`);
  $('drill').innerHTML = `<div class="lane" id="lane"><div class="hitline"></div></div><div class="row"><span id="sbStreak">Streak 0</span><span id="sbTempo"></span></div>`;
  coach('Keep it rolling. Find the rhythm.');
}
function speedAction(a) {
  if (a !== 'jab' && a !== 'cross') return;
  const n = TR.notes.find(x => !x.res && Math.abs(x.t - TR.t) < .16);
  P.punch = null; P.queue = []; P.startPunch(a, false);
  const ball = DP.speed.userData;
  if (!n) { TR.streak = 0; return; }
  const err = Math.abs(n.t - TR.t);
  if (n.a !== a) { n.res = 'miss'; TR.miss++; TR.streak = 0; popText('Wrong hand', ball.ball.getWorldPosition(new V3()), '#ff6b6b'); return; }
  n.res = err < .055 ? 'perfect' : 'good'; TR[n.res]++; TR.streak++; TR.best = Math.max(TR.best, TR.streak);
  ball.v += (a === 'jab' ? 1 : -1) * 9; noiseHit(2600, 1.1, .04, .25, 'bandpass');
}
function updateSpeed(dt) {
  P.inp.mx = P.inp.mz = 0; P.inp.block = false; P.stam = 100; P.update(dt, O, T0);
  const u = DP.speed.userData; u.v += (-120 * u.a - 4 * u.v) * dt; u.a += u.v * dt; u.swivel.rotation.x = u.a;
  for (const n of TR.notes) if (!n.res && TR.t - n.t > .16) { n.res = 'miss'; TR.miss++; TR.streak = 0; }
  const lane = $('lane'); if (!lane) return;
  const vis = TR.notes.filter(n => n.t - TR.t < 2.4 && TR.t - n.t < .35);
  lane.innerHTML = '<div class="hitline"></div>' + vis.map(n => `<div class="note ${n.a} ${n.res || ''}" style="left:${18 + (n.t - TR.t) * 34}%">${n.a === 'jab' ? esc(K('jab')) : esc(K('cross'))}</div>`).join('');
  $('sbStreak').textContent = `Streak ${TR.streak}`; $('sbTempo').textContent = `${Math.round(100 + 90 * clamp((TR.t - 2) / SB_LEN, 0, 1))} beats a minute`;
  setCall(`${TR.perfect + TR.good}`, '', 'Speed bag · hits in rhythm');
  if (TR.notes.every(n => n.res)) endSpeed();
}
function endSpeed() {
  const n = TR.notes.length, acc = (TR.perfect + TR.good * .6) / n;
  const gs = gain('speed', 1 + 4 * acc);
  coach(acc > .8 ? 'Hands like a drum roll.' : acc > .55 ? 'Good rhythm. Stay relaxed as it speeds up.' : 'Loose shoulders. Let the bag set the beat.');
  endDrill('Speed bag done', [tbl([['Perfect / good / missed', `${TR.perfect} / ${TR.good} / ${TR.miss}`], ['Best streak', TR.best], ['Accuracy', `${Math.round(acc * 100)}%`]]), gainLine('speed', gs)]);
}

/* ---------- skipping rope ---------- */
const ROPE_LEN = 40;
function setupRope() {
  dummyTarget(2, null); P.reset(new V3(0, 0, 0), 0);
  Object.assign(TR, { ang: Math.PI * .6, hop: -1, skips: 0, streak: 0, best: 0, trips: 0, stall: 0 });
  fightUI(true, `Press ${K('block')} to jump as the rope comes under your feet. Esc stops the session`);
  $('drill').innerHTML = `<div class="row"><span id="rpStreak">Streak 0</span><span id="rpTempo"></span></div>`;
  coach('Light on your feet. Up on the toes.');
}
function ropeAction(a) { if (a === 'block' && TR.hop < 0) TR.hop = 0; }
function updateRope(dt) {
  P.inp.mx = P.inp.mz = 0; P.inp.block = false; P.stam = 100; P.update(dt, O, T0);
  const rps = 1.15 + 1.1 * clamp(TR.t / ROPE_LEN, 0, 1);
  if (TR.hop >= 0) { TR.hop += dt / .42; if (TR.hop >= 1) TR.hop = -1; }
  const air = TR.hop >= 0 ? Math.sin(Math.PI * TR.hop) : 0;
  P.root.position.y = air * .14;
  if (TR.stall > 0) { TR.stall -= dt; if (TR.stall <= 0) TR.ang = Math.PI * .6; }
  else {
    const before = TR.ang; TR.ang += dt * rps * Math.PI * 2;
    if (Math.floor(before / (Math.PI * 2)) !== Math.floor(TR.ang / (Math.PI * 2))) {   // the rope passes under the feet
      if (air > .22) { TR.skips++; TR.streak++; TR.best = Math.max(TR.best, TR.streak); if (TR.streak % 10 === 0) popText(`${TR.streak}`, P.headPos().add(new V3(0, .3, 0)), '#e8b931'); }
      else { TR.trips++; TR.streak = 0; TR.stall = .9; sfx.whiff(); popText('Trip', P.headPos().add(new V3(0, .3, 0)), '#ff6b6b'); }
    }
  }
  const gl = P.gloves.L.getWorldPosition(new V3()), gr = P.gloves.R.getWorldPosition(new V3()), mid = gl.clone().add(gr).multiplyScalar(.5);
  const r = DP.rope; r.position.set(mid.x, mid.y - .35, mid.z); r.rotation.set(TR.ang, 0, 0);
  r.scale.set(Math.max(.5, gl.distanceTo(gr) + .25), mid.y - .3 + .05, 1.4);
  $('rpStreak').textContent = `Streak ${TR.streak}`; $('rpTempo').textContent = `${Math.round(rps * 60)} turns a minute`;
  setCall(`${TR.skips}`, '', `Skipping · ${Math.max(0, Math.ceil(ROPE_LEN - TR.t))} s`);
  if (TR.t >= ROPE_LEN) endRope();
}
function endRope() {
  const exp = ROPE_LEN * 1.6, q = clamp(TR.skips / exp, 0, 1);
  const gc = gain('cardio', 1 + 3 * q), gs = gain('speed', TR.best >= 40 ? 1 : 0);
  coach(TR.trips <= 1 ? 'Smooth. That is a fighter\'s rhythm.' : 'Stay on the balls of your feet and the rope takes care of itself.');
  endDrill('Skipping done', [tbl([['Skips', TR.skips], ['Best streak', TR.best], ['Trips', TR.trips]]), gainLine('cardio', gc), gs ? gainLine('speed', gs) : '']);
}

/* ---------- roadwork ---------- */
const ZONES = [['Easy pace', 128, 148, 12], ['Push', 155, 170, 10], ['Sprint', 176, 192, 7], ['Easy pace', 128, 148, 9], ['Push', 155, 170, 9], ['Sprint', 176, 192, 8]];
function setupRoad() {
  dummyTarget(3, null); P.reset(new V3(0, 0, 0), 0);
  Object.assign(TR, { pace: .25, hr: 110, zi: 0, zt: 0, inZone: 0, gassed: 0, dist: 0, over: 0 });
  fightUI(true, `Hold ${K('up')} to push the pace, let go to ease off. Your heart rate follows a few seconds behind. Esc stops the session`);
  $('drill').innerHTML = `<div class="row"><span id="rdZone"></span><span id="rdHr"></span></div><div class="meter tall"><div class="zone" id="rdBand"></div><div class="needle" id="rdNeedle"></div></div><div class="row"><span id="rdNext"></span><span id="rdDist"></span></div>`;
  warmCoach(ZONES.map(z => z[0] + '!').concat(['You are blowing up. Ease off!']));
  coach(ZONES[0][0] + '!');
}
function updateRoad(dt) {
  const z = ZONES[TR.zi], push = held.up && TR.gassed <= 0;
  TR.pace = clamp(TR.pace + (push ? .32 : -.26) * dt, 0, 1);
  const target = 88 + 112 * TR.pace; TR.hr += (target - TR.hr) * (1 - Math.exp(-dt / 2.4));
  if (TR.hr > 194) { TR.over += dt; if (TR.over > 1.5 && TR.gassed <= 0) { TR.gassed = 3; coach('You are blowing up. Ease off!'); } } else TR.over = 0;
  if (TR.gassed > 0) TR.gassed -= dt;
  const inz = TR.hr >= z[1] && TR.hr <= z[2]; if (inz) TR.inZone += dt;
  TR.dist += dt * (2.2 + 3.8 * TR.pace);
  TR.zt += dt; if (TR.zt >= z[3]) { TR.zi++; TR.zt = 0; if (TR.zi >= ZONES.length) return endRoad(); coach(ZONES[TR.zi][0] + '!'); }
  // jogging in place: a bob and a little lean
  P.inp.mx = P.inp.mz = 0; P.inp.block = false; P.stam = 100; P.update(dt, O, T0);
  const step = TR.t * (5 + 5 * TR.pace); P.root.position.y = Math.abs(Math.sin(step)) * (.025 + .05 * TR.pace);
  const lo = 80, hi = 205, pct = v => (v - lo) / (hi - lo) * 100;
  $('rdBand').style.left = pct(z[1]) + '%'; $('rdBand').style.width = (pct(z[2]) - pct(z[1])) + '%';
  $('rdNeedle').style.left = pct(TR.hr) + '%'; $('rdNeedle').style.background = inz ? 'var(--green)' : '#fff';
  $('rdZone').textContent = `${z[0]}: ${z[1]} to ${z[2]}`; $('rdHr').textContent = `${Math.round(TR.hr)} bpm${TR.gassed > 0 ? ' · gassed' : ''}`;
  const nz = ZONES[TR.zi + 1]; $('rdNext').textContent = nz ? `Next: ${nz[0]} in ${Math.ceil(z[3] - TR.zt)} s` : `Last interval: ${Math.ceil(z[3] - TR.zt)} s`;
  $('rdDist').textContent = `${(TR.dist / 1000).toFixed(2)} km`;
  setCall(inz ? '<span class="done">In the zone</span>' : TR.hr < z[1] ? 'Pick it up' : 'Too hot, ease off', '', 'Roadwork');
}
function endRoad() {
  const total = ZONES.reduce((s, z) => s + z[3], 0), q = TR.inZone / total;
  const gc = gain('cardio', 1 + 4.5 * q);
  coach(q > .7 ? 'Textbook intervals. Your engine is getting bigger.' : 'Listen to your body. Smoother changes of pace.');
  endDrill('Roadwork done', [tbl([['Time in the zone', `${Math.round(q * 100)}%`], ['Distance', `${(TR.dist / 1000).toFixed(2)} km`]]), gainLine('cardio', gc)]);
}

/* ---------- defense drill ---------- */
const DEF_LEN = 45;
function setupDefense() {
  trainerSetup(.5); O.mitt = false; O.aimFor = null; P.reset(new V3(0, 0, -.45), 0);
  Object.assign(TR, { next: 2, slipped: 0, blocked: 0, hit: 0, thrown: 0, wrongSlip: 0 });
  fightUI(true, `Slip the straight punches with ${K('slipL')} / ${K('slipR')}, hold ${K('block')} against hooks. Slips are worth more than blocks. Esc stops the session`);
  $('drill').innerHTML = `<div class="row"><span id="dfScore"></span><span id="dfLeft"></span></div>`;
  coach('Hands up. Make me miss.');
}
function defenseAction(a) { if (a === 'slipL') P.doSlip(1); if (a === 'slipR') P.doSlip(-1); }
function updateDefense(dt) {
  P.inp.mx = P.inp.mz = 0; P.inp.block = !!held.block; P.stam = Math.max(P.stam, 70); P.head = 100;
  O.inp.mx = O.inp.mz = 0; O.inp.block = false;
  P.update(dt, O, T0); O.update(dt, P, T0 + 1.3);
  const frac = clamp(TR.t / DEF_LEN, 0, 1);
  TR.next -= dt;
  if (TR.next <= 0 && !O.punch && TR.t < DEF_LEN) {
    const type = pick(frac < .3 ? ['jab', 'jab', 'cross'] : ['jab', 'cross', 'hook', 'hook', 'jab']);
    O.speed = .5 + .3 * frac; O.stam = 100; O.startPunch(type, false); TR.thrown++; TR.next = rand(1.5, 2.1) - frac * .8;
  }
  const p = O.punch;
  if (p && !p.hit && p.phase >= 1) {
    if (P.slip) p.sawSlip = true;
    const g = O.gloves[p.d.hand].getWorldPosition(new V3()), d = g.distanceTo(P.headPos()), straight = p.d.path === 'straight';
    if (p.phase === 1 && p.k > .5 && d < (straight ? .2 : .27) * P.s) {
      p.hit = true;
      if (straight && p.sawSlip) { TR.slipped++; popText('Slipped', P.headPos(), '#e8b931'); }
      else if (P.blocking) { TR.blocked++; sfx.block(); P.hs.vp -= .4; popText('Blocked', g, '#f2efe8'); }
      else { TR.hit++; sfx.hit(4); P.hs.vp -= 1.6; P.hs.vr += straight ? 0 : 3; popText(!straight && p.sawSlip ? 'Block hooks' : 'Hit', g, '#ff9b6b'); if (!straight && p.sawSlip) TR.wrongSlip++; }
    } else if (p.phase === 2 && p.k > .25) { p.hit = true; if (p.sawSlip && straight) { TR.slipped++; popText('Slipped', P.headPos(), '#e8b931'); } }
  }
  $('dfScore').textContent = `Slipped ${TR.slipped} · blocked ${TR.blocked} · hit ${TR.hit}`; $('dfLeft').textContent = `${Math.max(0, Math.ceil(DEF_LEN - TR.t))} s`;
  setCall(`${TR.slipped + TR.blocked} of ${TR.thrown}`, '', 'Defense drill · punches avoided');
  if (TR.t >= DEF_LEN + 1.2 && !O.punch) endDefense();
}
function endDefense() {
  const n = Math.max(1, TR.thrown), q = (TR.slipped * 1.3 + TR.blocked * .8) / (n * 1.3);
  const gs = gain('speed', 1 + 3.5 * clamp(q, 0, 1));
  coach(q > .7 ? 'Couldn\'t lay a glove on you.' : 'Keep your eyes on my chest. The shoulders tell you what\'s coming.');
  endDrill('Defense drill done', [tbl([['Slipped', TR.slipped], ['Blocked', TR.blocked], ['Got hit', `${TR.hit} of ${TR.thrown}`]]), gainLine('speed', gs),
    TR.wrongSlip ? `<p class="note">You tried to slip ${TR.wrongSlip} hook${TR.wrongSlip > 1 ? 's' : ''}. Hooks come round the side: block them.</p>` : '']);
}

/* ---------- sparring ---------- */
function startSpar() {
  const avg = (PR.stats.power + PR.stats.speed + PR.stats.chin + PR.stats.cardio) / 4;
  const sp = sparPartner(), o = makeOpp(clamp(sp.lvl + (avg - 50) / 200, .05, .9), PR.w, PR.trunks); o.name = sp.name; o.style = sp.style; o.spar = true;
  const fav = Object.entries(sp.seen || {}).sort((a, b) => b[1] - a[1])[0]; G.sparFav = fav && fav[1] > 15 ? fav[0] : null; G.partner = sp;
  QUICK = null; startFight(o, { rounds: 1, roundLen: 120, spar: true });
  const mem = partnerMemory(sp); if (mem) setTimeout(() => coach(mem), 1500);
}
function endSpar(how) {
  const a = P.stats_[0], b = O.stats_[0], took = 100 - P.head, acc = a.thrown ? a.landed / a.thrown : 0;
  const sp = G.partner; if (sp) { if (a.landed > b.landed) { sp.l++; sp.lvl = Math.min(.95, sp.lvl + .03); } else sp.w++; for (const [k, n] of Object.entries(G.tc || {})) sp.seen[k] = (sp.seen[k] || 0) + n; }
  const gc = gain('chin', took > 30 ? 2 + (took > 55 ? 1 : 0) : took > 12 ? 1 : 0), gs = gain('speed', 1 + 3 * clamp(acc / .45, 0, 1)), gca = gain('cardio', a.thrown > 40 ? 1 : 0);
  const stopped = how === 'STOP';
  const verdict = stopped ? 'That\'s enough for today. Keep your hands up.' : a.landed > b.landed ? 'You won the round. Good work.' : 'He got the better of that one. We\'ll fix it.';
  G.state = 'over'; document.body.classList.remove('fighting'); $('pauseBtn').classList.add('hidden'); fightUI(false); sfx.bell(2); showMsg('', '');
  setTimeout(() => {
    coach(verdict);
    finishWeek([`<p>Sparring with ${esc(O.name)}${stopped ? '. Your coach stopped it.' : '.'}${sp ? ` You are ${sp.l}-${sp.w} against him in sparring; he gets a little better each time you beat him.` : ''}</p>`, statsTable([['Punches landed', `${a.landed} of ${a.thrown}`, `${b.landed} of ${b.thrown}`], ['Power punches', a.power, b.power]]),
      gainLine('chin', gc), gainLine('speed', gs), gca ? gainLine('cardio', gca) : '', `<p class="note">Your coach: “${verdict}”</p>`], 'Sparring done', [], TRAIN.find(t => t.id === 'spar').load);
    MODE = 'hub';
  }, 1400);
}
