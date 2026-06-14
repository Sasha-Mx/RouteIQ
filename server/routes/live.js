import { Router } from 'express';
import { getLiveVehicles, getAllLiveVehicles } from '../services/gtfs.js';
import axios from 'axios';

const router = Router();

// Static fallback data in case both Groq and Gemini APIs are down
function getStaticFallbackData(originName) {
  const name = (originName || '').toLowerCase();
  
  let city = 'Meerut';
  let temp = '32°C';
  let aqi = '112';
  let aqiClass = 'Moderate';
  let aqiColor = 'text-amber-600 bg-amber-50 border-amber-100';
  let transitStatus = 'Normal';
  
  let infoCard1Title = 'RRTS FEEDER';
  let infoCard1Val = 'Active';
  let infoCard1Desc = 'Buses to Meerut South RRTS running normal';
  
  let infoCard2Title = 'NH-58 TRAFFIC';
  let infoCard2Val = 'Moderate';
  let infoCard2Desc = 'Begum Bridge flyover construction diversion active';

  let liveUpdates = [
    { route: 'RRTS', line: 'Meerut South ➔ Sahibabad', status: 'On Time', desc: 'Namo Bharat train arriving in 4 min', time: '4 min', type: 'metro' },
    { route: 'UPS', line: 'Modipuram ➔ Meerut City Stn', status: 'On Time', desc: 'UPSRTC Feeder bus arriving at stand', time: '1 min', type: 'bus' },
    { route: 'LCL', line: 'Hapur Road Bypass Bus', status: 'Delayed', desc: 'Slow traffic near Shastri Nagar', time: '14 min', type: 'bus' }
  ];

  if (name.includes('delhi') || name.includes('connaught') || name.includes('rohini') || name.includes('india gate') || name.includes('kashmere')) {
    city = 'Delhi';
    temp = '34°C';
    aqi = '185';
    aqiClass = 'Poor';
    aqiColor = 'text-rose-600 bg-rose-50 border-rose-100';
    transitStatus = 'Normal';
    
    infoCard1Title = 'DMRC METRO';
    infoCard1Val = '99% Punctual';
    infoCard1Desc = 'Smooth operations across all color lines';
    
    infoCard2Title = 'OUTER RING RD';
    infoCard2Val = 'Congested';
    infoCard2Desc = 'Heavy traffic near Ashram and Okhla underpass';

    liveUpdates = [
      { route: '534', line: 'Anand Vihar ➔ Mehrauli', status: 'On Time', desc: 'DTC Bus arriving at Rohini Sec 22 in 2 min', time: '2 min', type: 'bus' },
      { route: 'YEL', line: 'Yellow Line Metro', status: 'On Time', desc: 'Samaypur Badli ➔ HUDA City Centre', time: '3 min', type: 'metro' },
      { route: 'EXP', line: 'Delhi Airport Express', status: 'On Time', desc: 'New Delhi ➔ Dwarka Sec 21', time: '5 min', type: 'metro' }
    ];
  } else if (name.includes('noida') || name.includes('greater noida')) {
    city = 'Noida';
    temp = '33°C';
    aqi = '142';
    aqiClass = 'Moderate';
    aqiColor = 'text-amber-600 bg-amber-50 border-amber-100';
    transitStatus = 'Normal';

    infoCard1Title = 'AQUA LINE';
    infoCard1Val = 'On Time';
    infoCard1Desc = 'Sector 51 to Depot station running normal';

    infoCard2Title = 'NOIDA EXPY';
    infoCard2Val = 'Heavy';
    infoCard2Desc = 'Traffic slow near Sector 18 and Mahamaya Flyover';

    liveUpdates = [
      { route: 'AQU', line: 'Sector 51 ➔ Depot Station', status: 'On Time', desc: 'Aqua Line train arriving in 3 min', time: '3 min', type: 'metro' },
      { route: '347', line: 'Noida Sec 62 ➔ Kalindi Kunj', status: 'On Time', desc: 'DTC electric bus on schedule', time: '7 min', type: 'bus' }
    ];
  } else if (name.includes('gurugram') || name.includes('gurgaon')) {
    city = 'Gurugram';
    temp = '35°C';
    aqi = '190';
    aqiClass = 'Poor';
    aqiColor = 'text-rose-600 bg-rose-50 border-rose-100';
    transitStatus = 'Normal';

    infoCard1Title = 'RAPID METRO';
    infoCard1Val = 'On Time';
    infoCard1Desc = 'Cyber City loop trains running smoothly';

    infoCard2Title = 'SOHNA ROAD';
    infoCard2Val = 'Slow';
    infoCard2Desc = 'Waterlogging recovery work near Subhash Chowk';

    liveUpdates = [
      { route: 'RAP', line: 'Sector 55-56 ➔ Sikanderpur', status: 'On Time', desc: 'Rapid Metro arriving in 2 min', time: '2 min', type: 'metro' },
      { route: '112', line: 'Gurugram Bus Stand ➔ Sector 47', status: 'Delayed', desc: 'Slow moving traffic on Sohna Road', time: '11 min', type: 'bus' }
    ];
  } else if (name.includes('mumbai')) {
    city = 'Mumbai';
    temp = '29°C';
    aqi = '55';
    aqiClass = 'Good';
    aqiColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    transitStatus = 'Minor Delays';

    infoCard1Title = 'WESTERN LINE';
    infoCard1Val = '8m Delay';
    infoCard1Desc = 'Signal troubleshooting near Bandra station';

    infoCard2Title = 'EASTERN FREEWAY';
    infoCard2Val = 'Clear';
    infoCard2Desc = 'Smooth traffic flow towards Chembur';

    liveUpdates = [
      { route: 'WR', line: 'Churchgate ➔ Virar Fast', status: 'Delayed', desc: 'Slow line locals running late by 8 mins', time: '8 min', type: 'train' },
      { route: 'MET', line: 'Gundavali ➔ Andheri West', status: 'On Time', desc: 'Metro Line 7 operating smoothly', time: '3 min', type: 'metro' },
      { route: 'BST', line: 'BEST Route 83 (Colaba)', status: 'On Time', desc: 'Arriving at Regal Cinema stand', time: '4 min', type: 'bus' }
    ];
  }

  return {
    city,
    temp,
    aqi,
    aqiClass,
    aqiColor,
    transitStatus,
    infoCard1Title,
    infoCard1Val,
    infoCard1Desc,
    infoCard2Title,
    infoCard2Val,
    infoCard2Desc,
    liveUpdates
  };
}

async function fetchLocalNewsFromLLM(origin, lat, lng) {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const prompt = `You are a regional transport intelligence assistant. Generate highly realistic, contextually relevant, and detailed localized transit updates, advisories, weather, and air quality information for the user's current location.

Location: "${origin}" (Coordinates: ${lat || 'unknown'}, ${lng || 'unknown'}).
Current Date/Time: June 14, 2026, 1:43 PM.

IMPORTANT RULES:
1. Identify the actual city or region of the location (e.g. Meerut, Delhi, Noida, Mumbai, etc.).
2. Generate 2 highly realistic, localized commute/transit metrics for this city/region:
   - Card 1 should represent a primary transit service (e.g., RRTS feeder buses for Meerut, DMRC Metro punctuality for Delhi, Local trains for Mumbai, BEST buses, Aqua line).
   - Card 2 should represent local road traffic or highway conditions (e.g., NH-58 traffic status, Ring Road congestion, Eastern Freeway, Noida Expressway).
3. Generate 2-3 live updates:
   - Real or highly realistic local bus routes, metro lines, or rail lines in that specific area.
   - realistic status ("On Time", "Delayed", "Suspended") and realistic ETAs (e.g. 2 min, 15 min).
   - realistic detailed status messages (e.g. "Slow moving traffic due to construction").
4. Provide the current estimated temperature (e.g., "34°C" for June summer) and AQI rating (e.g., 50-250) along with its classification ("Good", "Moderate", "Poor") and CSS classes ("text-rose-600 bg-rose-50 border-rose-100" for Poor, "text-amber-600 bg-amber-50 border-amber-100" for Moderate, "text-emerald-600 bg-emerald-50 border-emerald-100" for Good).

OUTPUT FORMAT: Return ONLY a valid JSON object. Do NOT include markdown fences, preambles or explanations.

JSON Structure:
{
  "city": "Name of the City",
  "temp": "32°C",
  "aqi": "112",
  "aqiClass": "Moderate",
  "aqiColor": "text-amber-600 bg-amber-50 border-amber-100",
  "infoCard1Title": "SHORT TITLE",
  "infoCard1Val": "Value",
  "infoCard1Desc": "Short descriptive text",
  "infoCard2Title": "SHORT TITLE",
  "infoCard2Val": "Value",
  "infoCard2Desc": "Short descriptive text",
  "liveUpdates": [
    {
      "route": "Route ID",
      "line": "Route Name",
      "status": "On Time / Delayed",
      "desc": "Detailed status message",
      "time": "ETA",
      "type": "bus / metro / train"
    }
  ]
}`;

  const parseJson = (rawText) => {
    try {
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/```\s*([\s\S]*?)```/);
      const cleanText = jsonMatch ? jsonMatch[1].trim() : rawText.trim();
      return JSON.parse(cleanText);
    } catch {
      const objMatch = rawText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        return JSON.parse(objMatch[0]);
      }
      throw new Error('No JSON object found in LLM output');
    }
  };

  // 1. Try Groq (Llama-3.3-70b-versatile)
  if (groqKey) {
    try {
      console.log('Fetching local news from Groq (Llama-3.3-70b-versatile)...');
      const resp = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        },
        { headers: { Authorization: `Bearer ${groqKey}` }, timeout: 10000 }
      );
      const content = resp.data.choices?.[0]?.message?.content;
      return parseJson(content);
    } catch (groqErr) {
      console.warn('Groq Llama-3.3-70b failed:', groqErr.message);
      // Try Llama-3.1-8b-instant
      try {
        console.log('Fetching local news from Groq (llama-3.1-8b-instant)...');
        const resp = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.3
          },
          { headers: { Authorization: `Bearer ${groqKey}` }, timeout: 10000 }
        );
        const content = resp.data.choices?.[0]?.message?.content;
        return parseJson(content);
      } catch (groq8bErr) {
        console.warn('Groq Llama-3.1-8b failed:', groq8bErr.message);
      }
    }
  }

  // 2. Fallback to OpenRouter (Gemini-2.5-flash-lite)
  if (openRouterKey) {
    try {
      console.log('Fetching local news from OpenRouter (Gemma-4-31b-it)...');
      const resp = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        },
        { headers: { Authorization: `Bearer ${openRouterKey}` }, timeout: 12000 }
      );
      const content = resp.data.choices?.[0]?.message?.content;
      return parseJson(content);
    } catch (orErr) {
      console.error('OpenRouter Gemini fallback failed:', orErr.message);
    }
  }

  throw new Error('All LLM endpoints failed');
}

router.get('/', async (req, res) => {
  try {
    const { routeId } = req.query;
    const vehicles = routeId ? await getLiveVehicles(routeId) : await getAllLiveVehicles();
    res.json({ vehicles, updatedAt: new Date().toISOString(), source: 'gtfs-rt' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live data', vehicles: [] });
  }
});

router.post('/local-news', async (req, res) => {
  const { origin, lat, lng } = req.body;
  try {
    const newsData = await fetchLocalNewsFromLLM(origin, lat, lng);
    res.json(newsData);
  } catch (err) {
    console.warn('Using static fallback for local news because LLM call failed:', err.message);
    const fallback = getStaticFallbackData(origin);
    res.json(fallback);
  }
});

export default router;
