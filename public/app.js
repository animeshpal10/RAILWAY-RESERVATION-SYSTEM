import { TRAINS, buildGraph, Trie, Booking } from './dsa.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'rrs-log', g = buildGraph();
const stations = [...new Set(TRAINS.flatMap(t => t.route.map(r => r[0])))].sort();
const trie = new Trie(); stations.forEach(s => trie.insert(s));

let sys = new Booking(TRAINS);
try { JSON.parse(localStorage.getItem(KEY) || '[]').forEach(e => sys.do(e)); } catch { /* start fresh */ }

$('#st').innerHTML = stations.map(s => `<option value="${s}">`).join('');
$('#bt').innerHTML = TRAINS.map(t => `<option value="${t.no}">${t.no} ${t.name}</option>`).join('');
function fillStops() {
  const t = TRAINS.find(x => x.no === $('#bt').value), o = t.route.map(r => `<option>${r[0]}</option>`).join('');
  $('#bf').innerHTML = o; $('#bto').innerHTML = o; $('#bto').selectedIndex = t.route.length - 1;
}
$('#bt').onchange = fillStops; fillStops();

// Trie autocomplete: normalise typed text to a station name on blur
for (const id of ['#pf', '#pt']) $(id).onblur = e => { const m = trie.search(e.target.value.trim()); if (m.length) e.target.value = m[0]; };

$('#plan').onsubmit = async e => {
  e.preventDefault();
  const f = $('#pf').value.trim(), t = $('#pt').value.trim(), b = $('#pb').value.split(',').map(s => s.trim()).filter(Boolean);
  let routes, src = 'server';
  try {
    const r = await fetch(`/api/route?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&block=${encodeURIComponent(b.join(','))}`);
    if (!r.ok) throw 0; routes = (await r.json()).routes;
  } catch { routes = g.alternatives(f, t, 3, new Set(b)); src = 'browser'; }
  const few = g.bfs(f, t);
  $('#routes').innerHTML = routes.length
    ? routes.map((r, i) => `<div class="route"><b>${i ? 'Alternative ' + i : 'Shortest'}:</b> ${r.path.join(' to ')} <small>(${r.km} km)</small></div>`).join('')
      + (few ? `<div class="route"><b>Fewest stops:</b> ${few.path.join(' to ')} <small>(${few.stops} stops between)</small></div>` : '')
      + `<small>Computed in the ${src} using Dijkstra's algorithm with a min-heap and BFS with a queue.</small>`
    : '<p class="err">No route found. Check the station names or reopen a closed station.</p>';
};

$('#book').onsubmit = e => {
  e.preventDefault();
  const r = sys.do({ op: 'book', no: $('#bt').value, from: $('#bf').value, to: $('#bto').value, name: $('#bn').value.trim(), cat: $('#bc').value });
  $('#bmsg').className = 'msg' + (r.error ? ' err' : '');
  $('#bmsg').textContent = r.error || (r.status === 'CNF' ? `Confirmed. Your PNR is ${r.pnr}.` : `Train is full. You are on the waitlist with PNR ${r.pnr}.`);
  if (r.error) sys.log.pop(); else $('#bn').value = '';
  render();
};

$('#qb').onclick = () => {
  const r = sys.tree.get(Number($('#q').value));
  $('#qmsg').textContent = r ? `PNR ${r.pnr}: ${r.name}, ${r.from} to ${r.to} on train ${r.no}. Status ${r.status}.` : 'No ticket with that PNR.';
};
$('#reset').onclick = () => { if (confirm('Delete all tickets?')) { localStorage.removeItem(KEY); sys = new Booking(TRAINS); render(); } };
$('#tbl').onclick = e => {
  const p = e.target.dataset.c; if (!p) return;
  const r = sys.do({ op: 'cancel', pnr: Number(p) });
  $('#qmsg').textContent = r.error || `PNR ${p} cancelled. Waitlisted passengers were moved up where a seat became free.`;
  render();
};

function render() {
  const all = sys.tree.inorder();
  $('#tbl').innerHTML = all.map(r => `<tr class="${r.status}"><td>${r.pnr}</td><td>${esc(r.name)} <small>${r.cat}</small></td><td>${r.no} ${r.from} to ${r.to}</td><td>Rs ${r.fare}</td><td><b>${r.status}</b></td><td>${r.status !== 'CAN' ? `<button data-c="${r.pnr}">Cancel</button>` : ''}</td></tr>`).join('')
    || '<tr><td colspan="6">No tickets yet. Book one above.</td></tr>';
  $('#h').textContent = `Ticket index: AVL tree of height ${sys.tree.height()} holding ${all.length} tickets.`;
  $('#wl').innerHTML = TRAINS.map(t => {
    const q = sys.queue(t.no).map(p => sys.tree.get(p.pnr));
    return `<p><b>${t.no} ${t.name}</b>: ${sys.free(t.no, 0, t.route.length - 1)} of ${t.cap} seats free on the full run.<br>Waitlist: ${q.length ? q.map(r => `#${r.pnr} ${r.cat}`).join(', then ') : 'empty'}</p>`;
  }).join('') + '<small>Waitlist order: Tatkal first, then Senior and Ladies, then General. Ties go to whoever booked first.</small>';
  localStorage.setItem(KEY, JSON.stringify(sys.log));
}
render();
