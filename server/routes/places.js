import { Router } from 'express';
import axios from 'axios';
import { getNearbyExplorePlaces, coordinateMeeting } from '../services/agents.js';

const router = Router();

router.get('/explore', async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const data = await getNearbyExplorePlaces(name, parseFloat(lat), parseFloat(lng));
    res.json(data);
  } catch (err) {
    console.error('Explore places API error:', err.message);
    res.status(500).json({ error: 'Failed to explore places' });
  }
});

router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    }

    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    const response = await axios.post(url, {
      input: input,
      includedRegionCodes: ['IN']
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      },
      timeout: 8000
    });

    const predictions = (response.data.suggestions || []).map(s => {
      const pred = s.placePrediction;
      return {
        place_id: pred.placeId,
        description: pred.text.text
      };
    });

    res.json({ predictions });
  } catch (err) {
    console.error('Places API proxy error:', err.message);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

router.get('/details', async (req, res) => {
  try {
    const { placeId } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GOOGLE_MAPS_API_KEY' });
    }

    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,formattedAddress,location&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 8000 });
    
    const data = response.data;
    res.json({
      result: {
        name: data.displayName?.text || data.formattedAddress,
        geometry: {
          location: {
            lat: data.location?.latitude,
            lng: data.location?.longitude
          }
        }
      }
    });
  } catch (err) {
    console.error('Places details proxy error:', err.message);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

router.post('/meet', async (req, res) => {
  try {
    const { locations, names } = req.body;
    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({ error: 'At least 2 locations are required' });
    }
    if (!names || !Array.isArray(names) || names.length !== locations.length) {
      return res.status(400).json({ error: 'Names array must match locations array length' });
    }

    console.log(`[MeetFriends] Calculating meeting point for ${names.join(', ')}...`);
    const result = await coordinateMeeting(locations, names);
    
    res.json({
      agent: result.agent,
      model: result.model,
      ms: result.ms,
      spots: result.data?.spots || []
    });
  } catch (err) {
    console.error('Meet friends API error:', err.message);
    res.status(500).json({ error: 'Failed to calculate meeting point' });
  }
});

export default router;
