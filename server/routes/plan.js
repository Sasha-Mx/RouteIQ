import { Router } from 'express';
import { estimateAutoFare, estimateUberFare, estimateRapidoFare, estimateOlaFare, isPeakHour, distanceFromLatLng } from '../services/fareEstimator.js';
import { evaluateRoutes, analyzeReliability, analyzeCosts, analyzeRouteCombined } from '../services/agents.js';
import axios from 'axios';

const router = Router();

// ─── Generate realistic transit route legs via OpenRouter (Gemini 2.5 Flash) ──
async function generateRouteLegsWithAI(origin, destination, originLat, originLng, destLat, destLng, distKm, preference) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.warn('No OPENROUTER_API_KEY — using fallback leg estimation');
    return null;
  }

  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDay = new Date().toLocaleDateString('en-IN', { weekday: 'long' });

  const systemPrompt = `You are a Delhi/NCR public transit routing expert. You know EVERY bus route number, metro line, metro station, bus stop, and walking path in Delhi NCR. You generate precise, real-world transit directions. Output ONLY valid JSON — no markdown, no explanation.`;

  const userPrompt = `Generate 3 realistic multimodal transit routes from "${origin}" (${originLat}, ${originLng}) to "${destination}" (${destLat}, ${destLng}).

Distance: ${distKm.toFixed(1)} km. Current time: ${currentTime}, ${currentDay}.
User preference: ${preference}.

CRITICAL RULES — FOLLOW EXACTLY:
1. Use REAL Delhi bus routes (e.g., DTC 534, 610, 764, 340, 473, 522, 821, 405, 427, 723, etc.). Pick the bus that ACTUALLY runs near the origin location.
2. Use REAL metro lines: Blue Line (Dwarka-Noida), Yellow Line (Samaypur Badli-HUDA), Red Line (Dilshad Garden-Rithala), Violet Line (Kashmere Gate-Ballabhgarh), Green Line (Mundka-Brigadier Hoshiar Singh), Magenta Line (Janakpuri West-Botanical Garden), Pink Line (Majlis Park-Shiv Vihar), Grey Line (Dwarka-Dhansa Bus Stand).
3. Use REAL metro station names (e.g., "Dwarka Sector 21 Metro Station", "Rajouri Garden Metro Station", "Kashmere Gate Metro Station", "Rajiv Chowk Metro Station").
4. Walking instructions must reference ACTUAL landmarks or roads near the coordinates (e.g., "Walk 400m south on MG Road to Iffco Chowk Metro Station").
5. Each bus/metro leg MUST include the "line" field with the specific bus number or metro line color.
6. Walking distances must be realistic: avg 5 km/h, so 1 km = 12 min.
7. Bus speeds: 15-20 km/h in Delhi traffic. Metro: 33 km/h including stops.
8. Fares: bus ₹10-50, metro ₹10-60 based on zones/distance.
9. Factor actual geography — Yellow Line does NOT go to Dwarka, Blue Line does.
10. Generate 3 routes labeled: "fastest" (minimize time), "cheapest" (minimize cost, prefer buses), "comfort" (minimize transfers, prefer metro).
11. Provide 4-6 intermediate polyline waypoints following actual roads/metro lines.

OUTPUT FORMAT (strict JSON):
{
  "routes": [
    {
      "label": "fastest",
      "totalMinutes": <number>,
      "costEstimate": <number in rupees>,
      "transfers": <number>,
      "confidence": <75-95>,
      "legs": [
        { "mode": "walk", "minutes": <number>, "instruction": "<specific landmark-based instruction>", "distance": "<meters>m" },
        { "mode": "bus", "line": "<Bus NUMBER>", "minutes": <number>, "instruction": "<Board Bus NUMBER from STOP NAME towards DESTINATION>", "stops": <number> },
        { "mode": "metro", "line": "<Color> Line", "minutes": <number>, "instruction": "<Board COLOR Line from STATION towards DIRECTION, alight at STATION>", "stops": <number> },
        { "mode": "walk", "minutes": <number>, "instruction": "<specific instruction>", "distance": "<meters>m" }
      ],
      "polyline": [[lat1,lng1], [lat2,lng2], ...]
    }
  ]
}`;

  // Try with retry logic
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1500));

      const resp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.25
        },
        {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://routeiq.app',
            'X-Title': 'RouteIQ Transit Planner'
          },
          timeout: 30000
        }
      );

      const rawText = resp.data.choices?.[0]?.message?.content?.trim() || '';

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Try extracting JSON from possible markdown wrapping
        const objMatch = rawText.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try { parsed = JSON.parse(objMatch[0]); } catch { /* continue */ }
        }
      }

      if (parsed?.routes && Array.isArray(parsed.routes) && parsed.routes.length >= 1) {
        console.log(`✓ AI route planning succeeded (attempt ${attempt + 1}, ${parsed.routes.length} routes)`);
        return parsed.routes;
      }
    } catch (err) {
      const status = err.response?.status;
      console.warn(`✗ AI route planning attempt ${attempt + 1}: ${status || ''} ${err.message?.substring(0, 100)}`);
      if (status === 429 && attempt < 1) continue;
    }
  }

  console.warn('AI route planning unavailable, using fallback estimation');
  return null;
}

// ─── Fallback: Distance-based realistic leg estimation ───────────
// Only used when ALL AI models fail. Provides reasonable approximations.
function buildFallbackLegs(originName, destName, distKm, mode) {
  const cleanOrig = originName.split(',')[0].trim();
  const cleanDest = destName.split(',')[0].trim();

  const walkSpeedKmh = 5;
  const busSpeedKmh = 16;
  const metroSpeedKmh = 33;

  if (distKm < 2) {
    const walkMins = Math.round((distKm / walkSpeedKmh) * 60);
    return [
      { mode: 'walk', minutes: walkMins, instruction: `Walk from ${cleanOrig} to ${cleanDest}`, distance: `${Math.round(distKm * 1000)}m` }
    ];
  }

  const walkToStop = Math.round((0.5 / walkSpeedKmh) * 60);
  const walkFromStop = Math.round((0.5 / walkSpeedKmh) * 60);

  if (distKm < 5) {
    const transitDist = distKm - 0.8;
    const busMins = Math.round((transitDist / busSpeedKmh) * 60);
    return [
      { mode: 'walk', minutes: walkToStop, instruction: `Walk from ${cleanOrig} to nearest bus stop`, distance: '400m' },
      { mode: 'bus', line: 'Local Bus', minutes: busMins, instruction: `Take bus towards ${cleanDest}`, stops: Math.round(transitDist * 2) },
      { mode: 'walk', minutes: walkFromStop, instruction: `Walk to ${cleanDest}`, distance: '400m' }
    ];
  }

  if (mode === 'fastest') {
    const busDist = Math.min(distKm * 0.3, 5);
    const metroDist = distKm - busDist - 1;
    return [
      { mode: 'walk', minutes: walkToStop, instruction: `Walk to nearest transit stop from ${cleanOrig}`, distance: '500m' },
      { mode: 'bus', line: 'DTC Bus', minutes: Math.round((busDist / busSpeedKmh) * 60), instruction: `Take bus to nearest metro station`, stops: Math.round(busDist * 2) },
      { mode: 'metro', line: 'Metro', minutes: Math.round((metroDist / metroSpeedKmh) * 60), instruction: `Metro towards ${cleanDest}`, stops: Math.round(metroDist / 1.5) },
      { mode: 'walk', minutes: walkFromStop, instruction: `Walk to ${cleanDest}`, distance: '500m' }
    ];
  } else if (mode === 'cheapest') {
    const totalBusDist = distKm - 1;
    const bus1Dist = totalBusDist * 0.5;
    const bus2Dist = totalBusDist * 0.5;
    return [
      { mode: 'walk', minutes: walkToStop, instruction: `Walk to bus stop near ${cleanOrig}`, distance: '500m' },
      { mode: 'bus', line: 'DTC Bus', minutes: Math.round((bus1Dist / busSpeedKmh) * 60), instruction: `Bus towards midway hub`, stops: Math.round(bus1Dist * 2) },
      { mode: 'bus', line: 'Transfer Bus', minutes: Math.round((bus2Dist / busSpeedKmh) * 60), instruction: `Transfer bus towards ${cleanDest}`, stops: Math.round(bus2Dist * 2) },
      { mode: 'walk', minutes: walkFromStop, instruction: `Walk to ${cleanDest}`, distance: '500m' }
    ];
  } else {
    const metroDist = distKm - 1.2;
    return [
      { mode: 'walk', minutes: Math.round((0.6 / walkSpeedKmh) * 60), instruction: `Walk to metro station near ${cleanOrig}`, distance: '600m' },
      { mode: 'metro', line: 'Metro', minutes: Math.round((metroDist / metroSpeedKmh) * 60), instruction: `Metro direct towards ${cleanDest}`, stops: Math.round(metroDist / 1.5) },
      { mode: 'walk', minutes: Math.round((0.6 / walkSpeedKmh) * 60), instruction: `Walk to ${cleanDest}`, distance: '600m' }
    ];
  }
}

router.post('/', async (req, res) => {
  try {
    const { origin, destination, originLat, originLng, destLat, destLng, arrivalTime, timeType = 'leave_by', preference = 'fastest' } = req.body;

    if (!originLat || !destLat) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    const distKm = distanceFromLatLng(originLat, originLng, destLat, destLng);
    const peak = isPeakHour();

    // ── Step 1: AI-powered route planning (via OpenRouter → Gemini) ──
    let routes;
    const aiRoutes = await generateRouteLegsWithAI(
      origin, destination, originLat, originLng, destLat, destLng, distKm, preference
    );

    if (aiRoutes && aiRoutes.length >= 1) {
      // Use AI-generated routes, ensuring all required fields exist
      routes = aiRoutes.map((r, i) => {
        const label = r.label || ['fastest', 'cheapest', 'comfort'][i] || 'fastest';
        return {
          label,
          totalMinutes: r.totalMinutes || Math.round(distKm * 4.5 + 10),
          costEstimate: r.costEstimate || Math.round(distKm * 1.8 + 15),
          transfers: r.transfers ?? (r.legs ? r.legs.filter(l => l.mode !== 'walk').length - 1 : 1),
          arrivalTime,
          confidence: r.confidence || 85,
          liveEta: r.liveEta || '',
          polyline: (r.polyline && r.polyline.length >= 2) 
            ? r.polyline 
            : [[originLat, originLng], [(originLat + destLat) / 2 + 0.005 * (i - 1), (originLng + destLng) / 2 - 0.005 * (i - 1)], [destLat, destLng]],
          legs: r.legs || buildFallbackLegs(origin, destination, distKm, label)
        };
      });

      // Ensure we have exactly 3 routes
      while (routes.length < 3) {
        const idx = routes.length;
        const label = ['fastest', 'cheapest', 'comfort'][idx];
        routes.push({
          label,
          totalMinutes: Math.round(distKm * 4.5 + 10 + idx * 7),
          costEstimate: Math.round(distKm * (1.8 - idx * 0.3) + 15),
          transfers: idx,
          arrivalTime,
          confidence: 85 - idx * 5,
          liveEta: '',
          polyline: [[originLat, originLng], [(originLat + destLat) / 2, (originLng + destLng) / 2], [destLat, destLng]],
          legs: buildFallbackLegs(origin, destination, distKm, label)
        });
      }
    } else {
      // Fallback: distance-based estimation
      console.warn('All AI route planning failed, using distance-based estimation');
      
      const transitBaseMins = Math.round(distKm * 4.5 + 10);
      routes = [
        {
          label: 'fastest',
          totalMinutes: transitBaseMins,
          costEstimate: Math.round(distKm * 1.8 + 15),
          transfers: 1,
          arrivalTime,
          confidence: 82,
          liveEta: '',
          polyline: [[originLat, originLng], [(originLat + destLat) / 2 + 0.01, (originLng + destLng) / 2 - 0.01], [destLat, destLng]],
          legs: buildFallbackLegs(origin, destination, distKm, 'fastest')
        },
        {
          label: 'cheapest',
          totalMinutes: transitBaseMins + 14,
          costEstimate: Math.round(distKm * 1.2 + 10),
          transfers: 2,
          arrivalTime,
          confidence: 75,
          liveEta: '',
          polyline: [[originLat, originLng], [(originLat + destLat) / 2 - 0.01, (originLng + destLng) / 2 + 0.01], [destLat, destLng]],
          legs: buildFallbackLegs(origin, destination, distKm, 'cheapest')
        },
        {
          label: 'comfort',
          totalMinutes: transitBaseMins + 7,
          costEstimate: Math.round(distKm * 2.1 + 25),
          transfers: 0,
          arrivalTime,
          confidence: 80,
          liveEta: '',
          polyline: [[originLat, originLng], [(originLat + destLat) / 2, (originLng + destLng) / 2], [destLat, destLng]],
          legs: buildFallbackLegs(origin, destination, distKm, 'comfort')
        }
      ];
    }

    // ── Step 2: Fare data from estimators ──
    const uberFare = estimateUberFare(distKm, peak);
    const autoFare = estimateAutoFare(distKm);
    const rapidoFare = estimateRapidoFare(distKm);
    const olaFare = estimateOlaFare(distKm);
    const transitFare = routes[0].costEstimate;
    const transitMins = routes[0].totalMinutes;
    const uberMins = Math.round(distKm * 2.5 + 5);

    const altData = {
      transit: { cost: transitFare, minutes: transitMins },
      uber: { cost: uberFare, minutes: uberMins },
      rapido: { cost: rapidoFare, minutes: Math.round(distKm * 2 + 3) },
      auto: { cost: autoFare, minutes: Math.round(distKm * 3 + 8) },
      ola: { cost: olaFare, minutes: Math.round(distKm * 2.8 + 6) }
    };

    // ═══ Step 3: AGENT PIPELINE — AI evaluates the fetched data ═══
    // Call combined agent which performs all analyses in a single LLM roundtrip (saving ~10 seconds of latency)
    await new Promise(r => setTimeout(r, 1200));
    const combinedResult = await analyzeRouteCombined(routes, preference, timeType, arrivalTime, altData, distKm);
    
    const evalData = combinedResult.data?.evaluation || {};
    const relData = combinedResult.data?.reliability || {};
    const costData = combinedResult.data?.cost || {};

    const recIdx = evalData.recommended ?? 0;

    // ── Step 4: Miss-the-bus analysis ──
    const now = new Date();
    const transitMinsFixed = transitMins || 45;
    const currentArrival = new Date(now.getTime() + transitMinsFixed * 60000);
    const delayGap = Math.max(12, Math.round(distKm * 1.5));
    const newArrival = new Date(currentArrival.getTime() + delayGap * 60000);
    const fmt = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // ── Step 5: Return enriched response with agent metadata ──
    res.json({
      routes,
      recommended: recIdx,
      recommendCab: evalData.recommendCab || null,
      aiReason: evalData.reason,
      aiTradeoff: evalData.tradeoff,
      aiConfidence: evalData.confidence,
      aiFactors: evalData.factors || [],
      reliability: relData,
      alternatives: {
        ...altData,
        aiVerdict: costData.verdict,
        savingsBreakdown: costData.savingsBreakdown,
        carbonNote: costData.carbonNote,
        costRecommendation: costData.recommendation,
        moneySaved: Math.max(0, uberFare - transitFare),
        timeDifference: Math.abs(uberMins - transitMinsFixed),
        co2Saved: parseFloat((distKm * 0.17).toFixed(1))
      },
      missBusAnalysis: {
        currentArrival: fmt(currentArrival),
        newArrival: fmt(newArrival),
        delayMinutes: delayGap,
        nextBusTime: fmt(new Date(now.getTime() + Math.max(5, delayGap - 10) * 60000)),
        impact: relData.missImpact,
        advice: relData.advice
      },
      distanceKm: parseFloat(distKm.toFixed(2)),
      agentActivity: [
        { agent: 'RouteEvaluator', model: combinedResult.model, ms: Math.round(combinedResult.ms / 3) },
        { agent: 'ReliabilityAnalyst', model: combinedResult.model, ms: Math.round(combinedResult.ms / 3) },
        { agent: 'CostIntelligence', model: combinedResult.model, ms: Math.round(combinedResult.ms / 3) }
      ]
    });
  } catch (err) {
    console.error('Plan error:', err);
    res.status(500).json({ error: 'Failed to generate route plan', details: err.message });
  }
});

export default router;
