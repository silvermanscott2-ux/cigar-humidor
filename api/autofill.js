export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { brand, line } = req.body;

  if (!brand) return res.status(400).json({ error: 'Brand is required' });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a cigar expert database. Given the cigar brand "${brand}"${line ? ` and line/series "${line}"` : ''}, return ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "vitola": "most common vitola/size for this cigar or empty string",
  "wrapper_origin": "wrapper leaf country/region",
  "wrapper_type": "Natural, Maduro, Colorado, Claro, Oscuro, etc",
  "binder_origin": "binder country/region",
  "filler_origin": "filler country or countries",
  "strength": "one of exactly: Mild, Mild-Medium, Medium, Medium-Full, Full",
  "tasting_notes": "2-3 sentence description of typical flavor profile, aromas, and smoking characteristics",
  "confidence": "high, medium, or low based on how well-known this cigar is"
}
If you do not recognize the cigar, fill in what you can and set confidence to low. Return ONLY valid JSON, nothing else.`
      }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(jsonMatch?.[0] || '{}');
    return res.status(200).json(parsed);
  } catch {
    return res.status(500).json({ error: 'Failed to parse AI response' });
  }
}
