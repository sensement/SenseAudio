/**
 * Cloudflare Pages Function
 * Endpoint: /api/projects
 * Methods: GET (List), POST (Save)
 */

export async function onRequestGet(context) {
  // context.env contains our KV Bindings (PROJECTS)
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  // List keys starting with "user_{userId}_"
  const prefix = `user_${userId}_project_`;
  
  // Note: env.PROJECTS is the Binding name you configure in Dashboard
  const list = await env.PROJECTS.list({ prefix: prefix });

  const projects = [];
  for (const key of list.keys) {
    // In production, you might store metadata separate from body to save reads.
    // For now, getting the value is fine for small scale.
    const raw = await env.PROJECTS.get(key.name);
    if (raw) {
      const data = JSON.parse(raw);
      // Only return metadata, not the heavy notes array
      projects.push({ 
        id: data.id || "unknown", 
        name: data.name || "Untitled", 
        timestamp: data.timestamp 
      });
    }
  }

  // Sort by newest first
  projects.sort((a, b) => b.timestamp - a.timestamp);

  return new Response(JSON.stringify(projects), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    if (!body.userId) {
      return new Response("Missing userId", { status: 400 });
    }

    // Generate ID if new
    const projectId = body.id || `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Key format: user_{userId}_project_{projectId}
    const key = `user_${body.userId}_project_${projectId}`;

    // Update body with ID
    body.id = projectId;

    // Save to KV
    await env.PROJECTS.put(key, JSON.stringify(body));

    return new Response(JSON.stringify({ success: true, id: projectId }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}