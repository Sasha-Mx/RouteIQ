/**
 * Legacy AI service — now delegates to the Agent system.
 * Kept for backward compatibility with any direct imports.
 */
import { evaluateRoutes, analyzeCosts, generateNudge as agentNudge, coordinateMeeting } from './agents.js';

// Re-export agent functions with legacy signatures
export async function scoreRoutes(routes, preference) {
  const result = await evaluateRoutes(routes, preference);
  return result.data;
}

export async function generateNudge(busNumber, minsAway, nextBusMins, destination) {
  const result = await agentNudge(busNumber, minsAway, nextBusMins, destination);
  return result.text;
}

export async function computeMidpoint(locations, names) {
  const result = await coordinateMeeting(locations, names);
  return result.data;
}

export async function generateAlternativesVerdict(transitCost, transitMins, uberCost, uberMins) {
  // Simplified — the full cost analysis is now done by CostIntelligence agent in plan.js
  const saved = uberCost - transitCost;
  const timeDiff = uberMins - transitMins;
  return `Save ₹${saved} by choosing transit. You'll arrive only ${Math.abs(timeDiff)} minutes ${timeDiff > 0 ? 'later' : 'earlier'}.`;
}
