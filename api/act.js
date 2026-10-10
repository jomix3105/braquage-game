const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}
const db = admin.firestore();
try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) {}

const SPK = ['hack', 'brain', 'muscle', 'drive', 'charm', 'pyro'];
const NOB = 8;
const OBH = ['hack', 'charm', 'muscle', 'brain', 'brain', 'charm', 'pyro', 'drive'];
const QS = ['Où étais-tu hier soir à 22h ?', 'Quel est le dernier objet que tu as volé ?', 'Décris ton plan sans dire « euh ».', 'Qui ici ferait le meilleur traître, et pourquoi pas toi ?', 'Quel mensonge as-tu dit aujourd\'hui ?', 'Si tu devais trahir quelqu\'un, ce serait qui ?'];
const sh = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const oids = () => Array.from({ length: NOB }, (_, i) => i);
const tsz = s => Math.max(2, Math.floor(s.p.length / 2) + 1 - (s.flag && s.flag.minus ? 1 : 0));
const nextOb = X => (X.pool.length ? X.pool : (X.pool = sh(oids()))).pop();

function deal(H, X, sec) {
  const sp = sh(SPK), t = Math.random() * H.p.length | 0;
  H.p.forEach((p, i) => { p.sp = sp[i % 6]; p.used = false; sec[p.id] = { taupe: i == t }; });
  X.taupe = H.p[t].id; X.pool = sh(oids()); X.votes = {}; X.dbl = 0;
  Object.assign(H, { succ: 0, alert: 0, acc: 2, round: 1, flag: {}, sel: [], msg: '', ready: [], res: null, w: '', taupe: '', ph: 'reveal' });
  H.ob = nextOb(X);
}
function finish(H, X, ok, note, dmg) {
  if (ok) H.succ++; else H.alert += (dmg == null ? 1 : dmg);
  H.msg = note || ''; X.votes = {}; H.sel = []; H.flag = {};
  if (H.succ >= 3 || H.alert >= 3) { H.w = H.succ >= 3 ? 'crew' : 'taupe'; H.taupe = X.taupe; H.ph = 'end'; return; }
  if (H.round >= 6) { H.w = 'taupe'; H.taupe = X.taupe; H.ph = 'end'; return; }
  H.round++; H.ob = nextOb(X); H.ph = 'brief';
}
function usePw(H, X, p) {
  const k = p.sp; p.used = true; H.msg = '';
  if (k == 'hack') { H.alert = Math.max(0, H.alert - 1); H.msg = '🖥️ ' + p.name + ' pirate le système : une alerte effacée.'; }
  else if (k == 'brain') { H.ob = nextOb(X); H.sel = []; H.msg = '🧠 Plan B de ' + p.name + ' : nouvel obstacle.'; }
  else if (k == 'muscle') { H.flag.sure = 1; H.msg = '💪 Force brute de ' + p.name + ' : cet obstacle sera réussi.'; }
  else if (k == 'drive') finish(H, X, true, '🏎️ ' + p.name + ' prend un raccourci : obstacle franchi.');
  else if (k == 'charm') { const o = pick(H.p.filter(x => x !== p)); H.msg = '🎭 ' + p.name + ' interroge ' + o.name + ' : « ' + pick(QS) + ' »'; }
  else if (k == 'pyro') { H.flag.minus = 1; H.sel = H.sel.slice(0, tsz(H)); H.msg = '🧨 Diversion de ' + p.name + ' : équipe réduite d\'un joueur.'; }
}
function accuse(H, X, w) {
  const t = H.p.find(x => x.id == w);
  if (!t || H.acc < 1) return;
  H.acc--;
  if (t.id == X.taupe) { H.w = 'crew'; H.taupe = X.taupe; H.ph = 'end'; return; }
  H.alert++; H.msg = '🔦 ' + t.name + ' était innocent ! +1 alerte.';
  if (H.alert >= 3) { H.w = 'taupe'; H.taupe = X.taupe; H.ph = 'end'; }
}
function handle(H, X, sec, a, id, name) {
  const p = H.p.find(x => x.id == id), boss = id == H.host;
  if (a.t == 'create') { }
  else if (a.t == 'join') {
    if (!p) { if (H.ph != 'lobby') throw new Error('La partie a déjà commencé.'); if (H.p.length >= 8) throw new Error('La salle est pleine.'); H.p.push({ id, name, used: false }); }
  }
  else if (!p) throw new Error('Tu ne fais pas partie de cette partie.');
  else if (a.t == 'start' && boss && H.ph == 'lobby' && H.p.length >= 4) deal(H, X, sec);
  else if (a.t == 'ready' && H.ph == 'reveal') { if (!H.ready.includes(id)) H.ready.push(id); if (H.ready.length >= H.p.length) H.ph = 'brief'; }
  else if (H.ph == 'brief') {
    if (a.t == 'tog' && boss) { const k = H.sel.indexOf(a.who); if (k >= 0) H.sel.splice(k, 1); else if (H.sel.length < tsz(H) && H.p.some(x => x.id == a.who)) H.sel.push(a.who); }
    else if (a.t == 'go' && boss && H.sel.length == tsz(H)) { H.ph = 'play'; X.votes = {}; }
    else if (a.t == 'pw' && !p.used) usePw(H, X, p);
    else if (a.t == 'acc' && boss) accuse(H, X, a.who);
  }
  else if (H.ph == 'play' && a.t == 'vote' && H.sel.includes(id) && !(id in X.votes)) {
    const tp = X.taupe == id; let c = 'A';
    if (tp && a.c == 'D' && !X.dbl) { X.dbl = 1; c = 'D'; sec[id] = { taupe: true, dbl: true }; }
    else if (tp && a.c != 'A') c = 'S';
    X.votes[id] = c;
    if (Object.keys(X.votes).length >= H.sel.length) {
      const v = Object.values(X.votes), s = v.some(x => x != 'A'), d = v.includes('D') ? 2 : 1;
      const spc = H.p.some(x => H.sel.includes(x.id) && x.sp == OBH[H.ob]);
      H.res = { v: sh(v.map(x => x == 'D' ? 'S' : x)), fail: s && !H.flag.sure, neut: s && !!H.flag.sure, dmg: s ? Math.max(0, d - (spc ? 1 : 0)) : 0, sp: s && spc };
      H.ph = 'result';
    }
  }
  else if (H.ph == 'result' && a.t == 'next' && boss) finish(H, X, !H.res.fail, H.res.fail ? (H.res.dmg ? '💥 Sabotage ! +' + H.res.dmg + ' alerte' + (H.res.dmg > 1 ? 's' : '') + '.' : '💥 Sabotage, mais le spécialiste a limité la casse : aucune alerte.') : '✅ Obstacle franchi, bien joué.', H.res.dmg);
  else if (H.ph == 'end' && a.t == 'again' && boss) deal(H, X, sec);
  H.voted = Object.keys(X.votes || {});
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });
    const tok = (req.headers.authorization || '').replace('Bearer ', '');
    let u;
    try { u = await admin.auth().verifyIdToken(tok); } catch (e) { return res.status(401).json({ error: 'Connexion Google invalide.' }); }
    const a = req.body || {};
    const name = String(u.name || u.email || 'Joueur').split(' ')[0].slice(0, 14);
    const code = a.t === 'create'
      ? Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join('')
      : String(a.code || '').toUpperCase().slice(0, 4);
    if (code.length !== 4) return res.status(400).json({ error: 'Code invalide.' });
    const ref = db.collection('rooms').doc(code), pr = ref.collection('private').doc('g');
    await db.runTransaction(async tx => {
      const [rs, ps] = await Promise.all([tx.get(ref), tx.get(pr)]);
      let H, X;
      if (a.t === 'create') {
        if (rs.exists) throw new Error('Ce code existe déjà, réessaie.');
        H = { code, host: u.uid, ph: 'lobby', p: [{ id: u.uid, name, used: false }], flag: {}, sel: [], ready: [], voted: [] };
        X = { pool: [], votes: {}, taupe: '' };
      } else {
        if (!rs.exists) throw new Error('Salle introuvable.');
        H = rs.data(); X = ps.exists ? ps.data() : { pool: [], votes: {}, taupe: '' };
      }
      const sec = {};
      const wasEnd = H.ph == 'end';
      handle(H, X, sec, a, u.uid, name);
      if (!wasEnd && H.ph == 'end') {
        H.pts = {};
        const inc = admin.firestore.FieldValue.increment;
        H.p.forEach(p => {
          const t = p.id == X.taupe, n = t ? (H.w == 'taupe' ? 5 : 0) : (H.w == 'crew' ? 3 : 1);
          H.pts[p.id] = n;
          tx.set(db.collection('lb').doc(p.id), { name: p.name, pts: inc(n), games: inc(1), wins: inc(n >= 3 ? 1 : 0) }, { merge: true });
        });
      }
      tx.set(ref, H); tx.set(pr, X);
      for (const id in sec) tx.set(ref.collection('secrets').doc(id), sec[id]);
    });
    res.status(200).json({ ok: true, code });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Erreur.' });
  }
};
