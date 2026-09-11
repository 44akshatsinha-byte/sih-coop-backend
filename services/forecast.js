const Gig = require("../models/gig");
const User = require("../models/user");
const { normalizeSkill } = require("./matching");

function cellKey(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "unknown";
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function coordsFromGig(gig) {
  const coords = gig.locationPoint && gig.locationPoint.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const [lng, lat] = coords;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Heuristic demand vs supply: daily gig counts vs available workers
 * whose skills cover the gig category, optionally bucketed by geo cell.
 */
async function buildForecast({ days = 7 } = {}) {
  const windowDays = days === 30 ? 30 : 7;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (windowDays - 1));

  const [gigs, workers] = await Promise.all([
    Gig.find({ createdAt: { $gte: since } }).select("category locationPoint createdAt"),
    User.find({ role: "worker" }).select("skills isAvailable latitude longitude")
  ]);

  const available = workers.filter((w) => w.isAvailable !== false);

  const workersBySkill = new Map();
  const workersByCellSkill = new Map();
  for (const w of available) {
    const skills = (w.skills || []).map(normalizeSkill).filter(Boolean);
    const unique = skills.length ? [...new Set(skills)] : ["general"];
    const cell = cellKey(w.latitude, w.longitude);
    for (const s of unique) {
      workersBySkill.set(s, (workersBySkill.get(s) || 0) + 1);
      const k = `${cell}|${s}`;
      workersByCellSkill.set(k, (workersByCellSkill.get(k) || 0) + 1);
    }
  }

  const seriesMap = new Map();
  for (let i = 0; i < windowDays; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    seriesMap.set(dateKey(d), { date: dateKey(d), demand: 0, byCategory: {} });
  }

  const demandByCat = new Map();
  const demandByCellCat = new Map();

  for (const gig of gigs) {
    const day = dateKey(gig.createdAt);
    const row = seriesMap.get(day);
    const cat = normalizeSkill(gig.category || "general") || "general";
    if (row) {
      row.demand += 1;
      row.byCategory[cat] = (row.byCategory[cat] || 0) + 1;
    }
    demandByCat.set(cat, (demandByCat.get(cat) || 0) + 1);
    const c = coordsFromGig(gig);
    const cell = c ? cellKey(c.lat, c.lng) : "unknown";
    const ck = `${cell}|${cat}`;
    demandByCellCat.set(ck, (demandByCellCat.get(ck) || 0) + 1);
  }

  const series = [...seriesMap.values()];
  const alerts = [];

  for (const [cat, demand] of demandByCat.entries()) {
    const supply = workersBySkill.get(cat) || 0;
    if (supply === 0 && demand > 0) {
      alerts.push({
        type: "shortage",
        category: cat,
        geoCell: null,
        demand,
        supply,
        shortagePct: 100,
        message: `Demand for ${cat} (${demand} gigs / ${windowDays}d) has no available matching workers.`
      });
      continue;
    }
    if (supply > 0 && demand > supply) {
      const shortagePct = Math.round(((demand - supply) / supply) * 100);
      if (shortagePct >= 20) {
        alerts.push({
          type: "shortage",
          category: cat,
          geoCell: null,
          demand,
          supply,
          shortagePct,
          message: `Demand for ${cat} may exceed supply by ${shortagePct}% (${demand} gigs vs ${supply} available workers).`
        });
      }
    }
  }

  for (const [key, demand] of demandByCellCat.entries()) {
    const [cell, cat] = key.split("|");
    if (cell === "unknown") continue;
    const supply = workersByCellSkill.get(key) || 0;
    if (demand > Math.max(supply, 1) && demand >= 3) {
      const denom = Math.max(supply, 1);
      const shortagePct = Math.round(((demand - supply) / denom) * 100);
      if (shortagePct >= 50) {
        alerts.push({
          type: "shortage",
          category: cat,
          geoCell: cell,
          demand,
          supply,
          shortagePct,
          message: `Cell ${cell}: ${cat} demand may exceed supply by ${shortagePct}%.`
        });
      }
    }
  }

  alerts.sort((a, b) => b.shortagePct - a.shortagePct);

  return {
    days: windowDays,
    series,
    alerts,
    totals: {
      gigs: gigs.length,
      availableWorkers: available.length
    }
  };
}

module.exports = { buildForecast, cellKey };
