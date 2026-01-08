/**
 * Cloudflare Pages Function
 * Endpoint: /api/analytics
 * Handles batch insertion of analytics events into D1 Database.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // ========================================================================
  // 1. SECURITY & CORS SETUP
  // ========================================================================
  const ALLOWED_ORIGINS = [
    'chrome-extension://',               // Extensions
    'moz-extension://',                  // Firefox Add-ons
    'https://studio.sensementmusic.com', // Your Production Domain
    'http://localhost',                  // Dev
    'http://127.0.0.1'                   // Dev
  ];

  const origin = request.headers.get('Origin') || '';
  const userAgent = request.headers.get('User-Agent') || 'Unknown';

  // Check Origin
  // 1. Check exact matches from the list
  let isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));

  // 2. Check for Cloudflare Pages Previews (Dynamic Subdomains)
  // This allows URLs like: https://76247b7b.senseaudio.pages.dev
  if (!isAllowed && origin.endsWith('.pages.dev') && origin.includes('senseaudio')) {
      isAllowed = true;
  }
  
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: `Forbidden: Unauthorized Origin (${origin})` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ========================================================================
  // 2. MAIN LOGIC
  // ========================================================================
  try {
    const data = await request.json();
    
    // Validation
    if (!data.client_id || !data.events || !Array.isArray(data.events)) {
       return new Response(JSON.stringify({ error: 'Invalid Payload Format' }), { 
         status: 400, 
         headers: corsHeaders 
       });
    }

    const { client_id, session_id, events } = data;
    
    // Check Database Binding
    if (!env.DB) {
      throw new Error("Database binding (DB) not found in Cloudflare settings.");
    }

    // Prepare Statement
    const stmt = env.DB.prepare(
      `INSERT INTO analytics (client_id, session_id, event_name, params, timestamp, user_agent) VALUES (?, ?, ?, ?, ?, ?)`
    );

    // Create Batch
    const batch = [];
    for (const event of events) {
      const safeParams = JSON.stringify(event.params || {}).slice(0, 1000);
      
      batch.push(stmt.bind(
        client_id, 
        session_id || null, 
        event.name, 
        safeParams, 
        event.timestamp || Date.now(),
        userAgent
      ));
    }

    // Execute Batch
    await env.DB.batch(batch);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Analytics Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  const origin = request.headers.get('Origin') || '';
  
  // Simple CORS for Preflight
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}