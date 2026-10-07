// ===== DATA STRUCTURES (written from scratch, no libraries) =====

// QUEUE: array + head pointer, so dequeue is O(1) (no Array.shift)
export class Queue {
  constructor() { this.a = []; this.h = 0; }
  enqueue(x) { this.a.push(x); }
  dequeue() { return this.h < this.a.length ? this.a[this.h++] : null; }
  get size() { return this.a.length - this.h; }
}

// MIN-HEAP: backs Dijkstra and the priority waitlist
export class MinHeap {
  constructor(cmp) { this.a = []; this.c = cmp; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (this.c(a[i], a[p]) >= 0) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a; if (!a.length) return null;
    const top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        let m = i, L = 2 * i + 1, R = L + 1;
        if (L < a.length && this.c(a[L], a[m]) < 0) m = L;
        if (R < a.length && this.c(a[R], a[m]) < 0) m = R;
        if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
  toArray() { return [...this.a].sort(this.c); }
}

// TRIE (tree): station-name autocomplete
export class Trie {
  constructor() { this.r = {}; }
  insert(w) { let n = this.r; for (const ch of w.toLowerCase()) n = n[ch] ??= {}; n.$ = w; }
  search(p) {
    let n = this.r; for (const ch of p.toLowerCase()) { n = n[ch]; if (!n) return []; }
    const out = []; (function d(x) { if (x.$) out.push(x.$); for (const k in x) if (k !== '$') d(x[k]); })(n);
    return out;
  }
}

// AVL TREE (self-balancing BST): PNR index, O(log n) search/insert
class Node { constructor(k, v) { this.k = k; this.v = v; this.l = this.r = null; this.h = 1; } }
const H = n => (n ? n.h : 0), up = n => { n.h = 1 + Math.max(H(n.l), H(n.r)); }, bf = n => H(n.l) - H(n.r);
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; up(y); up(x); return x; };
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; up(x); up(y); return y; };
function balance(n) {
  up(n); const b = bf(n);
  if (b > 1) { if (bf(n.l) < 0) n.l = rotL(n.l); return rotR(n); }
  if (b < -1) { if (bf(n.r) > 0) n.r = rotR(n.r); return rotL(n); }
  return n;
}
export class AVL {
  constructor() { this.root = null; }
  insert(k, v) {
    const f = n => { if (!n) return new Node(k, v); if (k < n.k) n.l = f(n.l); else if (k > n.k) n.r = f(n.r); else n.v = v; return balance(n); };
    this.root = f(this.root);
  }
  get(k) { let n = this.root; while (n) { if (k === n.k) return n.v; n = k < n.k ? n.l : n.r; } return null; }
  inorder() { const o = []; (function w(n) { if (n) { w(n.l); o.push(n.v); w(n.r); } })(this.root); return o; }
  height() { return H(this.root); }
}

// GRAPH: stations = vertices, track sections = weighted edges
export class Graph {
  constructor() { this.adj = new Map(); }
  edge(a, b, w) {
    for (const [x, y] of [[a, b], [b, a]]) { if (!this.adj.has(x)) this.adj.set(x, []); this.adj.get(x).push({ to: y, w }); }
  }
  // Shortest distance. `blocked` holds closed stations and closed sections ("A|B")
  dijkstra(s, t, blocked = new Set()) {
    if (!this.adj.has(s) || !this.adj.has(t) || blocked.has(s) || blocked.has(t)) return null;
    const d = new Map([[s, 0]]), p = new Map(), pq = new MinHeap((a, b) => a[0] - b[0]);
    pq.push([0, s]);
    while (pq.size) {
      const [du, u] = pq.pop(); if (u === t) break;
      if (du > (d.get(u) ?? Infinity)) continue;
      for (const { to, w } of this.adj.get(u)) {
        if (blocked.has(to) || blocked.has(u + '|' + to)) continue;
        const nd = du + w;
        if (nd < (d.get(to) ?? Infinity)) { d.set(to, nd); p.set(to, u); pq.push([nd, to]); }
      }
    }
    if (!d.has(t)) return null;
    const path = [t]; while (path[0] !== s) path.unshift(p.get(path[0]));
    return { path, km: d.get(t) };
  }
  // Fewest stops (BFS using our Queue)
  bfs(s, t) {
    if (!this.adj.has(s) || !this.adj.has(t)) return null;
    const q = new Queue(), p = new Map([[s, null]]); q.enqueue(s);
    while (q.size) { const u = q.dequeue(); if (u === t) break; for (const { to } of this.adj.get(u)) if (!p.has(to)) { p.set(to, u); q.enqueue(to); } }
    if (!p.has(t)) return null;
    const path = []; for (let x = t; x !== null; x = p.get(x)) path.unshift(x);
    return { path, stops: path.length - 2 };
  }
  // NEW METHOD: alternate routes. Close each section of the best route in turn and re-run Dijkstra.
  alternatives(s, t, k = 3, blocked = new Set()) {
    const best = this.dijkstra(s, t, blocked); if (!best) return [];
    const out = [best], seen = new Set([best.path.join()]);
    for (let i = 0; i < best.path.length - 1 && out.length < k; i++) {
      const b = new Set(blocked); b.add(best.path[i] + '|' + best.path[i + 1]); b.add(best.path[i + 1] + '|' + best.path[i]);
      const r = this.dijkstra(s, t, b);
      if (r && !seen.has(r.path.join())) { seen.add(r.path.join()); out.push(r); }
    }
    return out;
  }
}

// ===== DATA =====
export const TRAINS = [
  { no: '12951', name: 'Mumbai Rajdhani', cap: 3, route: [['New Delhi', 0], ['Kota', 465], ['Vadodara', 900], ['Mumbai', 1384]] },
  { no: '12002', name: 'Bhopal Shatabdi', cap: 2, route: [['New Delhi', 0], ['Agra', 195], ['Gwalior', 320], ['Jhansi', 415], ['Bhopal', 701]] },
  { no: '12301', name: 'Howrah Rajdhani', cap: 3, route: [['New Delhi', 0], ['Kanpur', 440], ['Prayagraj', 634], ['Patna', 1000], ['Kolkata', 1450]] },
  { no: '12626', name: 'Kerala Express', cap: 2, route: [['New Delhi', 0], ['Agra', 195], ['Jhansi', 415], ['Bhopal', 701], ['Nagpur', 1100], ['Chennai', 2180]] },
];
export function buildGraph() {
  const g = new Graph();
  for (const t of TRAINS) for (let i = 0; i < t.route.length - 1; i++) g.edge(t.route[i][0], t.route[i + 1][0], t.route[i + 1][1] - t.route[i][1]);
  return g;
}

// ===== RESERVATION ENGINE =====
// Category -> waitlist priority (lower = served first) and fare factor
export const PRI = { Tatkal: { rank: 1, off: 1.3 }, Senior: { rank: 2, off: 0.6 }, Ladies: { rank: 2, off: 1 }, General: { rank: 3, off: 1 } };

export class Booking {
  constructor(trains) {
    this.T = Object.fromEntries(trains.map(t => [t.no, t]));
    this.tree = new AVL(); this.used = {}; this.wl = {}; this.seq = 1000; this.log = [];
    for (const t of trains) {
      this.used[t.no] = Array(t.route.length - 1).fill(0);           // seats used per segment
      this.wl[t.no] = new MinHeap((a, b) => a.pri - b.pri || a.t - b.t); // priority, then FIFO
    }
  }
  // NEW METHOD: segment-based seats. A seat freed at Agra can be resold for Agra->Bhopal.
  free(n, i, j) { return this.T[n].cap - Math.max(...this.used[n].slice(i, j)); }
  take(n, i, j, d) { for (let x = i; x < j; x++) this.used[n][x] += d; }
  // Event sourcing: every action is logged, so the state can be rebuilt by replaying the log
  do(e) { this.log.push(e); return e.op === 'book' ? this.book(e) : this.cancel(e.pnr); }
  book({ no, from, to, name, cat }) {
    const t = this.T[no], names = t.route.map(r => r[0]), i = names.indexOf(from), j = names.indexOf(to);
    if (i < 0 || j <= i) return { error: 'Pick stations in the order this train runs.' };
    const fare = Math.round((t.route[j][1] - t.route[i][1]) * 1.6 * PRI[cat].off);
    const r = { pnr: ++this.seq, no, from, to, name, cat, i, j, fare, status: 'CNF' };
    if (this.free(no, i, j) > 0) this.take(no, i, j, 1);
    else { r.status = 'WL'; this.wl[no].push({ pnr: r.pnr, i, j, pri: PRI[cat].rank, t: r.pnr }); }
    this.tree.insert(r.pnr, r); return r;
  }
  cancel(pnr) {
    const r = this.tree.get(pnr);
    if (!r || r.status === 'CAN') return { error: 'No active ticket with that PNR.' };
    const was = r.status; r.status = 'CAN';          // waitlist entries are removed lazily
    if (was === 'CNF') { this.take(r.no, r.i, r.j, -1); while (this.promote(r.no)); }
    return r;
  }
  // NEW METHOD: skip-ahead promotion. If the head of the waitlist needs a segment that is still full,
  // the next passenger whose journey fits gets the seat, and the skipped ones keep their place.
  promote(no) {
    const h = this.wl[no], keep = []; let p, ok = false;
    while (!ok && (p = h.pop())) {
      const r = this.tree.get(p.pnr); if (r.status !== 'WL') continue;
      if (this.free(no, p.i, p.j) > 0) { this.take(no, p.i, p.j, 1); r.status = 'CNF'; ok = true; } else keep.push(p);
    }
    keep.forEach(x => h.push(x)); return ok;
  }
  queue(no) { return this.wl[no].toArray().filter(p => this.tree.get(p.pnr).status === 'WL'); }
}
