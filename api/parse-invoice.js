export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a cigar invoice parser. Extract all cigars from the following text and return ONLY a JSON object with a "cigars" array. Each cigar object should have these fields (use null if unknown):
{
  "brand": "brand name",
  "line": "line or series name",
  "vitola": "size/shape",
  "quantity": number,
  "purchase_price": price per stick as a number,
  "purchase_date": "YYYY-MM-DD or null",
  "wrapper_origin": "country or null",
  "wrapper_type": "Natural/Maduro/etc or null",
  "binder_origin": "country or null",
  "filler_origin": "country or null",
  "strength": "Mild/Mild-Medium/Medium/Medium-Full/Full or null"
}

If a box price is given, divide by quantity to get per-stick price.
Return ONLY valid JSON like: {"cigars": [...]}

Text to parse:
${text}`
      }]
    })
  });

  const data = await response.json();
  const responseText = data.content?.[0]?.text || '';
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(jsonMatch?.[0] || '{"cigars":[]}');
    return res.status(200).json(parsed);
  } catch {
    return res.status(500).json({ error: 'Failed to parse response', raw: responseText });
  }
}
