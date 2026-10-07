// Vercel serverless function: GET /api/route?from=New%20Delhi&to=Bhopal&block=Agra
import { buildGraph } from '../public/dsa.js';

export default function handler(req, res) {
  const { from, to, block = '' } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  const blocked = new Set(String(block).split(',').map(s => s.trim()).filter(Boolean));
  res.status(200).json({ from, to, routes: buildGraph().alternatives(from, to, 3, blocked) });
}
