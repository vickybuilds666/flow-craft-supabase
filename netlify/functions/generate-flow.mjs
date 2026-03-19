export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let prompt = '';
  try {
    const body = JSON.parse(event.body || '{}');
    prompt = body.prompt || '';
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Create a flowchart for: "${prompt}". Return ONLY this exact JSON structure with no explanation:
{"flowName":"Flow Name","nodes":[{"id":"1","type":"circle","data":{"label":"Start"},"position":{"x":0,"y":0}},{"id":"2","type":"rectangle","data":{"label":"Step 1"},"position":{"x":0,"y":100}},{"id":"3","type":"diamond","data":{"label":"Decision?"},"position":{"x":0,"y":200}},{"id":"4","type":"circle","data":{"label":"End"},"position":{"x":0,"y":300}}],"edges":[{"id":"e1","source":"1","target":"2"},{"id":"e2","source":"2","target":"3"},{"id":"e3","source":"3","target":"4"}]}
Use 4-6 nodes. Keep x:0 for all nodes. Increment y by 100 each node. Return ONLY JSON.` }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Force correct positions
    const nodes = (parsed.nodes || []).map((n, i) => ({
      ...n,
      position: { x: 0, y: i * 120 }
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed, nodes }),
    };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'AI generation failed' }) };
  }
};
    
