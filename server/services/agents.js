/**
 * RouteIQ Multi-Agent AI System
 * 
 * Each agent has a strict ROLE directive, a primary model, and fallback chain.
 * Agents are invoked AFTER public API data is fetched, to evaluate/enrich results.
 * 
 * PRIMARY: OpenRouter (Gemini 2.5 Flash via OpenRouter — no free-tier quota issues)
 * FALLBACK: Groq (Llama 3.3 70B — fast, reliable)
 * LAST RESORT: Rule-based deterministic fallback
 */
import axios from 'axios';

// ─── Model Callers ───────────────────────────────────────────────

/**
 * Call Google Gemma 4 31B via OpenRouter — primary model for all agents.
 * Free-tier model with excellent JSON output and reasoning.
 */
async function callOpenRouterPrimary(systemRole, userPrompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('No OPENROUTER_API_KEY');
  const resp = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemma-4-31b-it:free',
      messages: [
        { role: 'system', content: systemRole },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1200,
      temperature: 0.3
    },
    {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://routeiq.app',
        'X-Title': 'RouteIQ Transit Intelligence'
      },
      timeout: 25000
    }
  );
  return resp.data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Call Groq (Llama 3.3 70B) — fast fallback.
 */
async function callGroq(systemRole, userPrompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('No Groq key');
  const resp = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemRole },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    },
    { headers: { Authorization: `Bearer ${key}` }, timeout: 12000 }
  );
  return resp.data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Call Llama 3.3 70B via OpenRouter — secondary free-tier model.
 */
async function callOpenRouterFree(systemRole, userPrompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('No OpenRouter key');
  const resp = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'system', content: systemRole },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800
    },
    {
      headers: {
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://routeiq.app',
        'X-Title': 'RouteIQ'
      },
      timeout: 15000
    }
  );
  return resp.data.choices?.[0]?.message?.content?.trim() || '';
}

// ─── JSON Extraction ─────────────────────────────────────────────
function extractJSON(text) {
  if (!text || text.length < 2) return null;
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try extracting from code fence
    try {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match?.[1]) return JSON.parse(match[1].trim());
    } catch { /* continue */ }
    // Try extracting raw JSON object
    try {
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) return JSON.parse(objMatch[0]);
    } catch { /* continue */ }
    return null;
  }
}

// ─── Agent Invoker ───────────────────────────────────────────────
async function invokeAgent(agentDef, userPrompt) {
  const { name, role, chain, fallbackFn } = agentDef;
  const callerMap = {
    'openrouter-primary': callOpenRouterPrimary,
    'groq': callGroq,
    'openrouter-free': callOpenRouterFree
  };
  const startTime = Date.now();

  for (const modelKey of chain) {
    try {
      const callerFn = callerMap[modelKey];
      if (!callerFn) continue;
      const raw = await callerFn(role, userPrompt);
      const parsed = extractJSON(raw);
      if (parsed) {
        console.log(`[${name}] ✓ ${modelKey} (${Date.now() - startTime}ms)`);
        return { agent: name, model: modelKey, data: parsed, raw: null, ms: Date.now() - startTime };
      }
      // If raw text is useful (non-JSON agents like nudge)
      if (raw && raw.length > 5) {
        console.log(`[${name}] ✓ ${modelKey} raw text (${Date.now() - startTime}ms)`);
        return { agent: name, model: modelKey, data: null, raw, ms: Date.now() - startTime };
      }
    } catch (err) {
      console.warn(`[${name}] ✗ ${modelKey}: ${err.response?.status || ''} ${err.message?.substring(0, 80)}`);
    }
  }

  // All models failed — use rule-based fallback
  console.warn(`[${name}] All models failed, using rule-based fallback`);
  if (fallbackFn) {
    return { agent: name, model: 'rule-based', data: fallbackFn(), raw: null, ms: Date.now() - startTime };
  }
  return { agent: name, model: 'none', data: null, raw: null, ms: Date.now() - startTime };
}

// ═══════════════════════════════════════════════════════════════════
// AGENT DEFINITIONS
// Chain order: openrouter-gemini → groq → openrouter-free → rule-based
// ═══════════════════════════════════════════════════════════════════

// ─── 1. ROUTE EVALUATOR AGENT ────────────────────────────────────
const ROUTE_EVALUATOR = {
  name: 'RouteEvaluator',
  chain: ['openrouter-primary', 'groq', 'openrouter-free'],
  role: `You are the ROUTE EVALUATOR AGENT for RouteIQ, a Delhi NCR transit intelligence platform.

COMMAND DIRECTIVES:
1. You receive multiple public transit route options AND ride-hailing options (Uber, Ola, Rapido, Auto).
2. Evaluate them against the user's preference (fastest/cheapest/comfort) and time constraints.
3. If the user has "arrive_by" set and transit cannot arrive before that time, recommend a cab.
4. If recommending a cab, set "recommendCab" to the service name. Otherwise null.
5. Output ONLY valid JSON. No markdown. No explanation.

OUTPUT FORMAT:
{
  "recommended": <index 0-2>,
  "recommendCab": "uber" | "ola" | "auto" | "rapido" | null,
  "reason": "<specific rationale under 25 words>",
  "tradeoff": "<what the user gives up, under 20 words>",
  "confidence": "high" | "medium" | "low",
  "factors": ["<factor1>", "<factor2>", "<factor3>"]
}`
};

export async function evaluateRoutes(routes, preference, timeType, arrivalTime, alternatives) {
  const prompt = `Evaluate these route options for a Delhi NCR journey:
User Preference: "${preference}".
Time Setting: ${timeType === 'arrive_by' ? `Reach BY: ${arrivalTime}` : `Leave AT: ${arrivalTime || 'now'}`}.
Current Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}.

Transit Options:
${JSON.stringify(routes.map((r, i) => ({
    index: i, label: r.label, minutes: r.totalMinutes, cost: r.costEstimate,
    transfers: r.transfers, confidence: r.confidence,
    legs: r.legs?.map(l => `${l.mode}${l.line ? '(' + l.line + ')' : ''}: ${l.minutes}min`)
})), null, 2)}

Ride-Hailing:
- Uber: ₹${alternatives.uber.cost}, ${alternatives.uber.minutes}min
- Ola: ₹${alternatives.ola.cost}, ${alternatives.ola.minutes}min
- Auto: ₹${alternatives.auto.cost}, ${alternatives.auto.minutes}min
- Rapido: ₹${alternatives.rapido.cost}, ${alternatives.rapido.minutes}min

Determine the best option. Output JSON only.`;

  const result = await invokeAgent(ROUTE_EVALUATOR, prompt);
  if (result.data) return result;

  // Rule-based fallback
  let recIdx = 0;
  let recommendCab = null;

  if (timeType === 'arrive_by' && arrivalTime) {
    try {
      const now = new Date();
      const [targetH, targetM] = arrivalTime.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(targetH, targetM, 0, 0);
      const availableMinutes = (targetDate - now) / 60000;
      const fastestTransitMins = routes.reduce((min, r) => r.totalMinutes < min ? r.totalMinutes : min, 999);
      
      if (availableMinutes > 0 && fastestTransitMins > availableMinutes) {
        recommendCab = alternatives.uber.minutes <= availableMinutes ? 'uber' : 'rapido';
        recIdx = routes.findIndex(r => r.label === 'comfort');
        if (recIdx === -1) recIdx = 2;
      }
    } catch (e) {
      console.warn('Fallback time parser:', e.message);
    }
  }

  if (!recommendCab) {
    if (preference === 'cheapest') recIdx = routes.reduce((b, r, i) => r.costEstimate < routes[b].costEstimate ? i : b, 0);
    else if (preference === 'comfort') recIdx = routes.reduce((b, r, i) => r.transfers < routes[b].transfers ? i : b, 0);
    else recIdx = routes.reduce((b, r, i) => r.totalMinutes < routes[b].totalMinutes ? i : b, 0);
  }

  return {
    agent: 'RouteEvaluator', model: 'rule-based', ms: 0,
    data: {
      recommended: recIdx, recommendCab,
      reason: preference === 'cheapest' ? 'Lowest total fare for this journey.' : preference === 'comfort' ? 'Fewest transfers, most comfortable.' : 'Fastest route available right now.',
      tradeoff: routes.length > 1 ? `Other option saves ₹${Math.abs(routes[0].costEstimate - routes[1]?.costEstimate || 0)}.` : 'Only route available.',
      confidence: 'high', factors: ['time', 'cost', 'transfers']
    }
  };
}

// ─── 2. RELIABILITY ANALYST AGENT ────────────────────────────────
const RELIABILITY_ANALYST = {
  name: 'ReliabilityAnalyst',
  chain: ['openrouter-primary', 'groq'],
  role: `You are the RELIABILITY ANALYST AGENT for RouteIQ.

COMMAND DIRECTIVES:
1. Assess how reliable a recommended transit route is in Delhi NCR.
2. Analyze: time of day, day of week, bus frequency, metro reliability, traffic patterns.
3. Identify specific risk factors that could disrupt this journey.
4. Generate a miss-the-bus impact assessment with specific alternatives.
5. Output ONLY valid JSON.

OUTPUT FORMAT:
{
  "reliabilityScore": <60-99>,
  "risks": ["<risk1>", "<risk2>"],
  "missImpact": "<what happens if user misses primary vehicle, under 20 words>",
  "advice": "<one actionable sentence under 20 words>"
}`
};

export async function analyzeReliability(route, distKm) {
  const prompt = `Analyze reliability for this Delhi NCR route:
Label: ${route.label}, Duration: ${route.totalMinutes}min, Cost: ₹${route.costEstimate}, Transfers: ${route.transfers}
Legs: ${JSON.stringify(route.legs?.map(l => ({ mode: l.mode, line: l.line, minutes: l.minutes, instruction: l.instruction })))}
Distance: ${distKm.toFixed(1)}km. Time: ${new Date().toLocaleTimeString('en-IN')}. Day: ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}.
Assess reliability and risks. Output JSON only.`;

  const result = await invokeAgent(RELIABILITY_ANALYST, prompt);
  if (result.data) return result;

  return {
    agent: 'ReliabilityAnalyst', model: 'rule-based', ms: 0,
    data: {
      reliabilityScore: route.confidence || 85,
      risks: ['Traffic congestion possible', 'Bus frequency varies'],
      missImpact: `Missing the bus adds ~15 min wait for next service.`,
      advice: 'Leave 5 minutes early to account for walking time.'
    }
  };
}

// ─── 3. COST INTELLIGENCE AGENT ──────────────────────────────────
const COST_INTELLIGENCE = {
  name: 'CostIntelligence',
  chain: ['openrouter-primary', 'groq', 'openrouter-free'],
  role: `You are the COST INTELLIGENCE AGENT for RouteIQ.

COMMAND DIRECTIVES:
1. Compare transit cost against ride-hailing options (Uber, Ola, Rapido, Auto).
2. Generate a compelling, specific verdict explaining why transit is smarter (or not).
3. Factor in: money saved, time difference, carbon impact, convenience tradeoff.
4. The verdict must convince a real commuter — no generic advice.
5. Output ONLY valid JSON.

OUTPUT FORMAT:
{
  "verdict": "<compelling one-sentence verdict under 25 words>",
  "savingsBreakdown": "<specific savings detail under 20 words>",
  "carbonNote": "<carbon impact note under 15 words>",
  "recommendation": "transit" | "ride"
}`
};

export async function analyzeCosts(transitCost, transitMins, alternatives, distKm) {
  const prompt = `Compare travel options for a ${distKm.toFixed(1)}km Delhi NCR journey:
Transit: ₹${transitCost}, ${transitMins}min
Uber: ₹${alternatives.uber.cost}, ${alternatives.uber.minutes}min
Ola: ₹${alternatives.ola.cost}, ${alternatives.ola.minutes}min
Rapido: ₹${alternatives.rapido.cost}, ${alternatives.rapido.minutes}min
Auto: ₹${alternatives.auto.cost}, ${alternatives.auto.minutes}min
Peak hour: ${new Date().getHours() >= 8 && new Date().getHours() <= 10 || new Date().getHours() >= 17 && new Date().getHours() <= 20 ? 'Yes' : 'No'}.
Generate verdict. Output JSON only.`;

  const result = await invokeAgent(COST_INTELLIGENCE, prompt);
  if (result.data) return result;

  const saved = alternatives.uber.cost - transitCost;
  return {
    agent: 'CostIntelligence', model: 'rule-based', ms: 0,
    data: {
      verdict: `Save ₹${saved} by choosing transit — arrive only ${Math.abs(alternatives.uber.minutes - transitMins)} min later.`,
      savingsBreakdown: `₹${saved} saved vs Uber, ₹${alternatives.ola.cost - transitCost} vs Ola.`,
      carbonNote: `Save ${(distKm * 0.17).toFixed(1)}kg CO₂ emissions.`,
      recommendation: saved > 30 ? 'transit' : 'ride'
    }
  };
}

// ─── 4. NUDGE COMMANDER AGENT ────────────────────────────────────
const NUDGE_COMMANDER = {
  name: 'NudgeCommander',
  chain: ['groq', 'openrouter-primary'],
  role: `You are the NUDGE COMMANDER AGENT for RouteIQ.

COMMAND DIRECTIVES:
1. Generate ONE urgent, actionable travel alert for a commuter mid-journey.
2. The nudge must be specific — include bus number, time, and consequence.
3. Tone: friendly but urgent. Like a helpful friend, not a robot.
4. Maximum 20 words. No fluff. No greetings.
5. Output ONLY the nudge text as a JSON object: {"nudge": "<your nudge text>"}`
};

export async function generateNudge(busNumber, minsAway, nextBusMins, destination) {
  const prompt = `Bus ${busNumber} arrives in ${minsAway} minutes at the stop. If missed, next bus is ${nextBusMins} minutes away. User heading to ${destination}. Generate the nudge as JSON.`;
  const result = await invokeAgent(NUDGE_COMMANDER, prompt);
  return {
    ...result,
    text: result.data?.nudge || result.raw || `Bus ${busNumber} is ${minsAway} min away — miss it and wait ${nextBusMins} more minutes.`
  };
}

// ─── 5. REPLAN STRATEGIST AGENT ──────────────────────────────────
const REPLAN_STRATEGIST = {
  name: 'ReplanStrategist',
  chain: ['groq', 'openrouter-primary'],
  role: `You are the REPLAN STRATEGIST AGENT for RouteIQ.

COMMAND DIRECTIVES:
1. A disruption has occurred on the user's current route.
2. Assess the disruption severity and recommend whether to switch routes.
3. Generate a clear, specific reason for the replan.
4. Output ONLY valid JSON.

OUTPUT FORMAT:
{
  "shouldReplan": true | false,
  "reason": "<specific disruption reason under 25 words>",
  "urgency": "high" | "medium" | "low",
  "action": "<what the user should do right now, under 15 words>"
}`
};

export async function evaluateReplan(currentRoute, disruption) {
  const prompt = `Current route: ${currentRoute.label}, ${currentRoute.totalMinutes}min, ₹${currentRoute.costEstimate}.
Disruption: ${disruption.type} — ${disruption.description}.
Delay: +${disruption.delayMinutes} minutes. Alternative saves ${disruption.savedMinutes || 0} minutes.
Should user switch routes? Output JSON only.`;

  const result = await invokeAgent(REPLAN_STRATEGIST, prompt);
  if (result.data) return result;

  return {
    agent: 'ReplanStrategist', model: 'rule-based', ms: 0,
    data: {
      shouldReplan: disruption.delayMinutes > 5,
      reason: `${disruption.type} causing ${disruption.delayMinutes} min delay.`,
      urgency: disruption.delayMinutes > 10 ? 'high' : 'medium',
      action: 'Switch to alternative route now.'
    }
  };
}

// ─── 6. MEETING COORDINATOR AGENT ────────────────────────────────
const MEETING_COORDINATOR = {
  name: 'MeetingCoordinator',
  chain: ['openrouter-primary', 'groq'],
  role: `You are the MEETING COORDINATOR AGENT for RouteIQ.

COMMAND DIRECTIVES:
1. You receive locations of multiple people in Delhi NCR.
2. Calculate the BEST meeting point that minimizes total travel time for everyone.
3. Prioritize well-connected transit hubs (metro stations, major bus stops).
4. Assess fairness — no single person should travel disproportionately longer.
5. Output ONLY valid JSON.

OUTPUT FORMAT:
{
  "name": "<place name>",
  "lat": <latitude>,
  "lng": <longitude>,
  "reason": "<why this spot, under 25 words>",
  "fairnessScore": <70-100>,
  "etas": ["<person1 ETA>", "<person2 ETA>"]
}`
};

export async function coordinateMeeting(locations, names) {
  const prompt = `Find the best meeting point in Delhi NCR for:
${locations.map((l, i) => `${names[i]}: lat ${l.lat}, lng ${l.lng}`).join('\n')}
Prioritize metro stations or major transit hubs. Ensure fairness. Output JSON only.`;

  const result = await invokeAgent(MEETING_COORDINATOR, prompt);
  if (result.data) return result;

  const lat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
  const lng = locations.reduce((s, l) => s + l.lng, 0) / locations.length;
  return {
    agent: 'MeetingCoordinator', model: 'rule-based', ms: 0,
    data: {
      name: 'Central Meeting Point', lat, lng,
      reason: 'Geographic center of all locations.',
      fairnessScore: 85,
      etas: names.map(() => '~20 min')
    }
  };
}

// ─── MASTER COMBINED ANALYST AGENT ────────────────────────────────
const COMBINED_ANALYST = {
  name: 'CombinedRouteAnalyst',
  chain: ['openrouter-primary', 'groq', 'openrouter-free'],
  role: `You are the MASTER ROUTE ANALYST AGENT for RouteIQ.
You evaluate route options, assess safety/reliability, and perform cost/financial comparison analysis.
Output ONLY valid JSON matching the schema below. No markdown fences. No explanation.

OUTPUT FORMAT:
{
  "evaluation": {
    "recommended": 0,
    "recommendCab": "uber" | "ola" | "auto" | "rapido" | null,
    "reason": "<specific rationale under 25 words>",
    "tradeoff": "<what the user gives up, under 20 words>",
    "confidence": "high" | "medium" | "low",
    "factors": ["time", "cost", "transfers", "comfort"]
  },
  "reliability": {
    "reliabilityScore": 85,
    "risks": ["risk1", "risk2"],
    "missImpact": "<what happens if user misses primary vehicle, under 20 words>",
    "advice": "<one actionable sentence under 20 words>"
  },
  "cost": {
    "verdict": "<compelling one-sentence verdict under 25 words>",
    "savingsBreakdown": "<specific savings detail under 20 words>",
    "carbonNote": "<carbon impact note under 15 words>",
    "recommendation": "transit" | "ride"
  }
}`
};

export async function analyzeRouteCombined(routes, preference, timeType, arrivalTime, alternatives, distKm) {
  const prompt = `Perform complete journey analysis for this Delhi NCR trip:
Distance: ${distKm.toFixed(1)} km. Preference: "${preference}".
Time: ${timeType === 'arrive_by' ? `Reach BY: ${arrivalTime}` : `Leave AT: ${arrivalTime || 'now'}`}.
Current Local Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}.
Day: ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}.

Transit Options:
${JSON.stringify(routes.map((r, i) => ({
    index: i, label: r.label, minutes: r.totalMinutes, cost: r.costEstimate,
    transfers: r.transfers, confidence: r.confidence,
    legs: r.legs?.map(l => `${l.mode}${l.line ? '(' + l.line + ')' : ''}: ${l.minutes}min`)
})), null, 2)}

Ride-Hailing Alternatives:
- Uber: ₹${alternatives.uber.cost}, ${alternatives.uber.minutes}min
- Ola: ₹${alternatives.ola.cost}, ${alternatives.ola.minutes}min
- Auto: ₹${alternatives.auto.cost}, ${alternatives.auto.minutes}min
- Rapido: ₹${alternatives.rapido.cost}, ${alternatives.rapido.minutes}min

Generate evaluation, reliability, and cost-intelligence sections. Return valid JSON only.`;

  const result = await invokeAgent(COMBINED_ANALYST, prompt);
  if (result.data) return result;

  // Combined rule-based fallback
  let recIdx = 0;
  let recommendCab = null;
  if (timeType === 'arrive_by' && arrivalTime) {
    try {
      const now = new Date();
      const [targetH, targetM] = arrivalTime.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(targetH, targetM, 0, 0);
      const availableMinutes = (targetDate - now) / 60000;
      const fastestTransitMins = routes.reduce((min, r) => r.totalMinutes < min ? r.totalMinutes : min, 999);
      if (availableMinutes > 0 && fastestTransitMins > availableMinutes) {
        recommendCab = alternatives.uber.minutes <= availableMinutes ? 'uber' : 'rapido';
        recIdx = routes.findIndex(r => r.label === 'comfort');
        if (recIdx === -1) recIdx = 2;
      }
    } catch (e) {
      console.warn('Fallback parser:', e.message);
    }
  }
  if (!recommendCab) {
    if (preference === 'cheapest') recIdx = routes.reduce((b, r, i) => r.costEstimate < routes[b].costEstimate ? i : b, 0);
    else if (preference === 'comfort') recIdx = routes.reduce((b, r, i) => r.transfers < routes[b].transfers ? i : b, 0);
    else recIdx = routes.reduce((b, r, i) => r.totalMinutes < routes[b].totalMinutes ? i : b, 0);
  }

  const transitCost = routes[0].costEstimate;
  const transitMins = routes[0].totalMinutes;
  const saved = alternatives.uber.cost - transitCost;
  const timeDiff = alternatives.uber.minutes - transitMins;

  return {
    agent: 'CombinedRouteAnalyst',
    model: 'rule-based',
    ms: 0,
    data: {
      evaluation: {
        recommended: recIdx,
        recommendCab,
        reason: preference === 'cheapest' ? 'Lowest total fare for this journey.' : preference === 'comfort' ? 'Fewest transfers, most comfortable.' : 'Fastest route available right now.',
        tradeoff: routes.length > 1 ? `Other option saves ₹${Math.abs(routes[0].costEstimate - routes[1]?.costEstimate || 0)}.` : 'Only route available.',
        confidence: 'high',
        factors: ['time', 'cost', 'transfers']
      },
      reliability: {
        reliabilityScore: routes[0].confidence || 85,
        risks: ['Traffic congestion possible', 'Bus frequency varies'],
        missImpact: 'Missing the bus adds ~15 min wait for next service.',
        advice: 'Leave 5 minutes early to account for walking time.'
      },
      cost: {
        verdict: `Save ₹${saved} by choosing transit. Arrive ${Math.abs(timeDiff)} minutes ${timeDiff > 0 ? 'later' : 'earlier'}.`,
        savingsBreakdown: `₹${saved} saved vs ride-hailing`,
        carbonNote: 'CO2 reduced by 75%',
        recommendation: 'transit'
      }
    }
  };
}

// ─── Agent Registry (for frontend display) ──────────────────────
export const AGENT_REGISTRY = {
  RouteEvaluator: { icon: '🧭', label: 'Route Evaluator', model: 'Gemini via OpenRouter' },
  ReliabilityAnalyst: { icon: '🛡️', label: 'Reliability Analyst', model: 'Gemini via OpenRouter' },
  CostIntelligence: { icon: '💰', label: 'Cost Intelligence', model: 'Gemini via OpenRouter' },
  NudgeCommander: { icon: '⚡', label: 'Nudge Commander', model: 'Groq' },
  ReplanStrategist: { icon: '🔄', label: 'Replan Strategist', model: 'Groq' },
  MeetingCoordinator: { icon: '📍', label: 'Meeting Coordinator', model: 'Gemini via OpenRouter' }
};
