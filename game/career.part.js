/* ================= career world ================= */
/* A living division: 40 other boxers with their own records who fight each other every week, four sanctioning
   bodies (fictional) with their own champions and rankings, promoters who offer fights with purses, mandatory
   defenses, unification, rivals and rematches, injuries, aging, weight changes, retirement and the Hall of Fame. */
const BODIES = [
  { id: 'gbc', short: 'GBC', name: 'Global Boxing Council', col: 0x2f8f4e },
  { id: 'ipra', short: 'IPRA', name: 'International Prize Ring Association', col: 0xc9a227 },
  { id: 'wcbu', short: 'WCBU', name: 'World Championship Boxing Union', col: 0x9b1c24 },
  { id: 'pbb', short: 'PBB', name: 'Premier Boxing Board', col: 0x24408f }
];
const PROMOTERS = [
  { id: 'iron', name: 'Iron Gate Promotions', mult: 1.0, cut: .25, pitch: 'Steady work and fair opponents.' },
  { id: 'crown', name: 'Crown Fight Group', mult: 1.35, cut: .33, pitch: 'Bigger purses and TV dates, but they take a bigger cut and want you busy.' },
  { id: 'west', name: 'Westside Boxing', mult: .85, cut: .15, pitch: 'Small shows, small cut. They let you pick your spots.' }
];
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const ageOf = pr => Math.floor(pr.age + (pr.week - (pr.ageWeek || 1)) / 52);
function rosterEntry(level, w, avoid) {
  const o = makeOpp(level, w, avoid); const n = randInt(4, 30);
  o.rec = { w: Math.round(n * (.5 + level * .45)), l: randInt(0, Math.max(1, Math.round(n * (1 - level) * .4))), d: Math.random() < .3 ? 1 : 0 }; o.ko = Math.round(o.rec.w * rand(.3, .8));
  o.age = randInt(21, 34); o.id = Math.random().toString(36).slice(2, 9); return o;
}
function makeWorld(pr) {
  const roster = []; for (let i = 0; i < 40; i++) roster.push(rosterEntry(clamp(.95 - i * .022 + rand(-.03, .03), .1, .97), pr.w, pr.trunks));
  const world = { w: pr.w, roster, champs: {}, news: [] };
  BODIES.forEach((b, i) => { world.champs[b.id] = roster[[0, 1, 2, 3][i] + (i > 1 ? randInt(0, 2) : 0)].id; });
  return world;
}
const byId = (world, id) => world.roster.find(f => f.id === id);
function rankList(world, bodyIdx) {   // each body ranks a little differently
  return world.roster.slice().sort((a, b) => (b.level + ((a.id.charCodeAt(bodyIdx) % 7) - 3) * .004) - (a.level + ((b.id.charCodeAt(bodyIdx) % 7) - 3) * .004));
}
function playerRanks(pr) { return BODIES.map((b, i) => pr.rank == null ? null : clamp(pr.rank + ((pr.name.charCodeAt(i % pr.name.length) % 5) - 2), 1, 40)); }
function worldWeek(pr) {
  const W = pr.world; if (!W) return;
  for (let k = 0; k < 2; k++) {
    const a = pick(W.roster), b = pick(W.roster.filter(f => f !== a && Math.abs(f.level - a.level) < .15)); if (!b) continue;
    const pa = clamp(.5 + (a.level - b.level) * 2.2, .1, .9), aw = Math.random() < pa, win = aw ? a : b, lose = aw ? b : a, ko = Math.random() < .45;
    win.rec.w++; lose.rec.l++; if (ko) win.ko = (win.ko || 0) + 1;
    win.level = clamp(win.level + .012, .05, .98); lose.level = clamp(lose.level - .015, .05, .98);
    let line = `${win.name} beat ${lose.name} ${ko ? 'by KO' : 'on points'}`;
    for (const bd of BODIES) if (W.champs[bd.id] === lose.id && Math.random() < .5) { W.champs[bd.id] = win.id; line += `, taking the ${bd.short} title`; }
    W.news.unshift(`Week ${pr.week}: ${line}.`); W.news = W.news.slice(0, 8);
  }
  // fighters age, retire and are replaced by prospects
  if (pr.week % 26 === 0) W.roster.forEach((f, i) => { f.age++; if (f.age > 36 && Math.random() < .3 && !Object.values(W.champs).includes(f.id)) { const n = rosterEntry(rand(.25, .5), W.w, pr.trunks); n.age = randInt(20, 23); W.roster[i] = n; W.news.unshift(`${f.name} has retired.`); } });
}
function oppFromRoster(f) { return Object.assign({}, f, { stats: Object.assign({}, f.stats) }); }
function makeOffers(pr) {
  const W = pr.world, offers = [], ranks = playerRanks(pr), pro = pr.pro, n = pro.w + pro.l + pro.d;
  const prom = PROMOTERS.find(p => p.id === pr.promoter) || PROMOTERS[0];
  const purseFor = (lvl, title) => Math.round((1500 + 60000 * Math.pow(lvl, 3) + (pr.rank ? (41 - pr.rank) * 900 : 0)) * (title ? 6 : 1) * prom.mult * rand(.9, 1.1) / 100) * 100;
  // mandatory defense due: the only offer
  const held = Object.keys(pr.belts || {});
  if (held.length && pr.mandatoryIn <= 0) {
    const bIdx = BODIES.findIndex(b => b.id === held[0]), top = rankList(W, bIdx).find(f => f.id !== W.champs[held[0]]);
    return [{ opp: oppFromRoster(top), kind: 'mandatory', body: held[0], title: [held[0]], purse: purseFor(top.level, true), weeks: 5, rounds: 12, note: `Mandatory ${BODIES[bIdx].short} defense against the number one contender. Refuse it and you are stripped.` }];
  }
  // a rematch with your rival
  if (pr.rival && Math.random() < .7) { const r = byId(W, pr.rival.id) || pr.rival; offers.push({ opp: oppFromRoster(r), kind: 'rematch', purse: purseFor(r.level, false) * 1.6, weeks: 5, rounds: Math.min(12, 6 + Math.floor(n / 3) * 2), note: `Rematch. ${pr.rival.why}` }); }
  // title shots when ranked high enough
  BODIES.forEach((b, i) => {
    if (offers.length >= 3) return;
    const champ = byId(W, W.champs[b.id]); if (!champ) return;
    if (pr.belts && pr.belts[b.id]) return;
    if (ranks[i] != null && ranks[i] <= 3 && Math.random() < .8) {
      const uni = held.length > 0; offers.push({ opp: oppFromRoster(champ), kind: uni ? 'unification' : 'title', title: uni ? [b.id, ...held] : [b.id], purse: purseFor(champ.level, true) * (uni ? 1.5 : 1), weeks: 6, rounds: 12, note: uni ? `Unification: your ${held.map(h => BODIES.find(x => x.id === h).short).join(' and ')} against his ${b.short} title.` : `For the ${b.name} world title.` });
    }
  });
  // regular fights at three levels of risk
  const base = clamp(.33 + n * .04 + (pr.rank ? (30 - pr.rank) * .013 : 0), .25, .95);
  for (const [lv, tag] of [[base - .08, 'Tune-up'], [base, 'Even match'], [base + .1, 'Step up']]) {
    if (offers.length >= 4) break;
    const pool = W.roster.filter(f => Math.abs(f.level - lv) < .07 && f.id !== (pr.rival && pr.rival.id) && !Object.values(W.champs).includes(f.id));
    const f = pool.length ? pick(pool) : rosterEntry(lv, pr.w, pr.trunks);
    offers.push({ opp: oppFromRoster(f), kind: tag, purse: purseFor(f.level, false), weeks: randInt(3, 5), rounds: n < 3 ? 4 : n < 8 ? 6 : n < 14 ? 8 : 10, note: tag === 'Tune-up' ? 'Keeps you busy. Small purse, small risk.' : tag === 'Step up' ? 'A dangerous opponent. Win and you climb fast.' : 'A fair fight against someone at your level.' });
  }
  return offers.slice(0, 4);
}
function scheduleNext(pr) {
  if (pr.stage === 'amateur') {
    const n = pr.am.w + pr.am.l, o = makeOpp(clamp(.06 + n * .07, 0, .45), pr.w, pr.trunks);
    o.rec = { w: randInt(0, 3 + n), l: randInt(0, 3) };
    pr.next = o; pr.fightIn = 3; pr.rounds = 3; pr.offers = null; pr.nextDeal = null; return;
  }
  if (!pr.world || pr.world.w !== pr.w) pr.world = makeWorld(pr);
  pr.offers = makeOffers(pr); pr.next = null; pr.fightIn = 0; pr.nextDeal = null;
}
function takeOffer(i) {
  const o = PR.offers[i]; if (!o) return;
  PR.next = o.opp; PR.next.rec = PR.next.rec || { w: 5, l: 1 }; PR.fightIn = o.weeks + (PR.injury ? PR.injury.weeks : 0); PR.rounds = o.rounds; PR.nextDeal = { kind: o.kind, title: o.title || null, purse: o.purse, oppId: o.opp.id };
  PR.offers = null; persist(); toHub();
}
function declineMandatory() {
  const b = PR.offers[0].body; delete PR.belts[b]; PR.news = `You were stripped of the ${BODIES.find(x => x.id === b).short} title.`; PR.mandatoryIn = 3;
  PR.offers = makeOffers(PR); persist(); openOffers();
}
function openOffers() {
  MODE = 'hub'; const prom = PROMOTERS.find(p => p.id === PR.promoter);
  $('offers').innerHTML = `<div class="kicker">${prom ? esc(prom.name) : 'No promoter'} · ${money(PR.money || 0)} in the bank</div><h1>Fight offers</h1>
    <p>Pick your next fight. Purses shown are what you take home after ${prom ? `your promoter's ${Math.round(prom.cut * 100)}% cut` : 'expenses'}.</p>
    ${PR.offers.map((o, i) => `<button class="wide offer" data-o="${i}"><span>${esc(o.opp.name)}<em>${esc(o.kind === 'mandatory' ? 'Mandatory defense' : o.kind === 'title' ? 'World title fight' : o.kind === 'unification' ? 'Unification' : o.kind === 'rematch' ? 'Rematch' : o.kind)}</em></span>
      <small>${recStr(o.opp.rec)} · ${STYLES[o.opp.style].name}${o.opp.southpaw ? ', southpaw' : ''} · ${o.rounds} rounds in ${o.weeks} weeks · <b>${money(o.purse * (1 - (prom ? prom.cut : .1)))}</b><br>${esc(o.note)}</small></button>`).join('')}
    ${PR.offers[0] && PR.offers[0].kind === 'mandatory' ? '<button id="ofDecline">Refuse and be stripped</button>' : ''}<button id="ofBack" style="margin-top:6px">Back</button>`;
  showOnly('offers');
  for (const b of $('offers').querySelectorAll('[data-o]')) b.onclick = () => takeOffer(+b.dataset.o);
  if ($('ofDecline')) $('ofDecline').onclick = declineMandatory;
  $('ofBack').onclick = () => { renderHub(); showOnly('hub'); };
}
function openPromoters() {
  $('offers').innerHTML = `<div class="kicker">${recLine(PR)}</div><h1>Promoters want you</h1><p>Sign a three-fight deal. Your promoter sets up your fights and takes a cut of the purse.</p>
    ${PROMOTERS.map(p => `<button class="wide" data-p="${p.id}"><span>${esc(p.name)}<em>${Math.round(p.cut * 100)}% cut · purses ×${p.mult}</em></span><small>${esc(p.pitch)}</small></button>`).join('')}`;
  showOnly('offers');
  for (const b of $('offers').querySelectorAll('[data-p]')) b.onclick = () => { PR.promoter = b.dataset.p; PR.dealLeft = 3; PR.offers = makeOffers(PR); persist(); openOffers(); };
}
/* after a pro fight: purse, belts, rival, injuries, rankings */
function careerAfterFight(pr, won, draw, how, notes) {
  const deal = pr.nextDeal || {}, prom = PROMOTERS.find(p => p.id === pr.promoter), W = pr.world;
  if (pr.stage === 'pro' && deal.purse) { const take = deal.purse * (1 - (prom ? prom.cut : .1)); pr.money = (pr.money || 0) + take; pr.earnings = (pr.earnings || 0) + take; notes.push(`Purse: ${money(take)} after ${prom ? 'your promoter\'s cut' : 'expenses'}.`); }
  if (prom) { pr.dealLeft = (pr.dealLeft || 1) - 1; if (pr.dealLeft <= 0) { notes.push(`Your deal with ${prom.name} is done. Pick a promoter for the next three fights.`); pr.promoter = null; } }
  const opp = W && deal.oppId ? byId(W, deal.oppId) : null;
  if (opp) { won ? opp.rec.l++ : draw ? opp.rec.d = (opp.rec.d || 0) + 1 : opp.rec.w++; opp.level = clamp(opp.level + (won ? -.02 : .015), .05, .98); }
  // titles
  pr.belts = pr.belts || {};
  if (deal.title && won) {
    for (const b of deal.title) { const bd = BODIES.find(x => x.id === b); if (!pr.belts[b]) { pr.belts[b] = { won: pr.week, def: 0 }; notes.push(`You are the ${bd.name} champion of the world!`); } else { pr.belts[b].def++; notes.push(`${bd.short} title defended (${pr.belts[b].def}).`); } if (W) W.champs[b] = 'player'; }
    pr.titleWins = (pr.titleWins || 0) + 1; pr.mandatoryIn = 3; pr.rank = 1;
  } else if (deal.title && !won) {
    for (const b of Object.keys(pr.belts)) if (deal.title.includes(b)) { delete pr.belts[b]; if (W && opp) W.champs[b] = opp.id; notes.push(`You lost the ${BODIES.find(x => x.id === b).short} title.`); }
  }
  if (Object.keys(pr.belts).length) { pr.mandatoryIn = (pr.mandatoryIn ?? 3) - (deal.kind === 'mandatory' ? 0 : 1); if (deal.kind === 'mandatory') pr.mandatoryIn = 3; }
  pr.maxBelts = Math.max(pr.maxBelts || 0, Object.keys(pr.belts).length);
  // rivalry
  if (pr.rival && deal.oppId === pr.rival.id && won) { notes.push(`Rivalry settled. You beat ${pr.rival.name}.`); pr.rivalsBeaten = (pr.rivalsBeaten || 0) + 1; pr.rival = null; }
  else if (!won && opp && pr.stage === 'pro') pr.rival = { id: opp.id, name: opp.name, why: draw ? 'Your draw settled nothing.' : `He beat you ${how === 'DEC' ? 'on the cards' : 'by ' + how} in week ${pr.week}.` };
  // injuries
  const beat = P.totalHeadDmg > 80 || P.kdFight > 1 || (P.cut && P.cut.sev > .6);
  if (beat && Math.random() < .55) { pr.injury = { what: P.cut && P.cut.sev > .6 ? 'a cut over the eye' : pick(['a concussion', 'a damaged hand', 'cracked ribs']), weeks: randInt(3, 6) }; notes.push(`Injury: ${pr.injury.what}. Out of hard training for ${pr.injury.weeks} weeks.`); }
  if (how === 'KO' && !won) pr.kosAgainst = (pr.kosAgainst || 0) + 1;
  pr.weightCut = false;
}
/* weekly: aging, injuries healing, the world moving */
function careerWeek(pr) {
  if (pr.injury) { pr.injury.weeks--; if (pr.injury.weeks <= 0) pr.injury = null; }
  worldWeek(pr);
  const age = ageOf(pr);
  if (age !== pr.lastAge) {
    pr.lastAge = age;
    if (age >= 31) { const d = age >= 35 ? 3 : 2; for (const k of ['speed', 'cardio']) pr.stats[k] = Math.max(25, pr.stats[k] - d); pr.stats.chin = Math.max(25, pr.stats.chin - (1 + (pr.kosAgainst || 0) * .5)); pr.news = `You turned ${age}. Your legs and your engine are not what they were.`; }
    else pr.news = `You turned ${age}.`;
  }
}
const injuryBlocks = id => PR.injury && ['bag', 'spar', 'mitts', 'combo', 'defense'].includes(id);
function changeWeight(dir) {
  const nw = PR.w + dir; if (nw < 0 || nw >= WEIGHTS.length) return;
  const lost = Object.keys(PR.belts || {}).length;
  PR.w = nw; PR.belts = {}; PR.rank = PR.rank ? Math.min(40, PR.rank + 10) : null; PR.world = makeWorld(PR); PR.rival = null;
  PR.stats.power = clamp(PR.stats.power + dir * 2, 25, 99); PR.stats.speed = clamp(PR.stats.speed - dir * 2, 25, 99);
  PR.news = `You moved ${dir > 0 ? 'up' : 'down'} to ${WEIGHTS[nw][0]}.${lost ? ' Your titles were vacated.' : ''}`;
  scheduleNext(PR); persist(); toHub();
}
function hofScore(pr) {
  const p = pr.pro; return p.w * 3 + p.ko * 1.5 - p.l * 2 + (pr.titleWins || 0) * 12 + (pr.maxBelts || 0) * 15 + (pr.rivalsBeaten || 0) * 5 + (pr.bestRank ? Math.max(0, 31 - pr.bestRank) : 0);
}
function retire() {
  const sc = Math.round(hofScore(PR)), inducted = sc >= 120;
  PR.retired = { week: PR.week, age: ageOf(PR), score: sc, hof: inducted };
  const got = checkTrophies({ hof: inducted, retired: true }); persist();
  $('offers').innerHTML = `<div class="kicker">${esc(PR.name)} · retired at ${ageOf(PR)}</div><h1>${inducted ? 'Hall of Fame' : 'Career over'}</h1>
    <p>${inducted ? 'The voters agree: you are one of the greats. Inducted on your first year of eligibility.' : 'A good career. Not quite enough for the Hall of Fame.'}</p>
    <table><tbody><tr><td>Professional record</td><td>${recStr(PR.pro)} (${PR.pro.ko} KO)</td></tr><tr><td>World title wins</td><td>${PR.titleWins || 0}</td></tr><tr><td>Most belts held at once</td><td>${PR.maxBelts || 0}</td></tr><tr><td>Career earnings</td><td>${money(PR.earnings || 0)}</td></tr><tr><td>Hall of Fame score</td><td>${sc} (120 needed)</td></tr></tbody></table>${trophyLines(got)}
    <button class="go" id="rtDone">Main menu</button>`;
  showOnly('offers'); $('rtDone').onclick = toMenu;
}
const TRAINERS = [{ name: 'Your local coach', cost: 0, mult: 1 }, { name: 'A former contender', cost: 25000, mult: 1.15 }, { name: 'A Hall of Fame trainer', cost: 150000, mult: 1.3 }];
function hireTrainer() {
  const n = (PR.trainer || 0) + 1, t = TRAINERS[n]; if (!t || (PR.money || 0) < t.cost) return;
  PR.money -= t.cost; PR.trainer = n; PR.news = `You hired ${t.name.toLowerCase()}: training gains up ${Math.round((t.mult - 1) * 100)}%.`; persist(); toHub();
}
