export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, properties, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK;

  if (!sheetUrl) {
    console.error('GOOGLE_SHEET_WEBHOOK env var not set');
    return res.status(500).json({ error: 'Form not configured' });
  }

  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, properties, message }),
      redirect: 'follow'
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Google Sheet error:', response.status, await response.text());
      return res.status(500).json({ error: 'Failed to save submission' });
    }
  } catch (err) {
    console.error('Google Sheet fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to save submission' });
  }
}
