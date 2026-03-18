const handler = async (event: any) => {

export const handler: Handler = async (event) => {
  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  let prompt = '';
  try {
    const body = JSON.parse(event.body || '{}');
    prompt = body.prompt || '';
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!prompt.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Create a flowchart for: "${prompt}"

Return ONLY valid JSON, no explanation, no markdown backticks:
{
  "flowName": "short descriptive name",
  "nodes": [
    { "id": "1", "type": "circle", "data": { "label": "Start" }, "position": { "x": 250, "y": 50 } },
    { "id": "2", "type": "rectangle", "data": { "label": "Step" }, "position": { "x": 250, "y": 170 } },
    { "id": "3", "type": "diamond", "data": { "label": "Decision?" }, "position": { "x": 250, "y": 290 } },
    { "id": "4", "type": "circle", "data": { "label": "End" }, "position": { "x": 250, "y": 430 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" },
    { "id": "e2-3", "source": "2", "target": "3" },
    { "id": "e3-4", "source": "3", "target": "4" }
  ]
}
Node types: circle=start/end, rectangle=process, diamond=decision, parallelogram=input/output
Space nodes: y += 120 per step, x center ~250. Use 4-8 nodes. Return ONLY JSON.`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error('AI error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'AI generation failed' }),
    };
  }
};
export { handler };
