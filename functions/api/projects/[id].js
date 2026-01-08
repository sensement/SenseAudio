/**
 * Cloudflare Pages Function
 * Endpoint: /api/projects/[id]
 * Methods: GET (Load), DELETE (Delete)
 */

export async function onRequestGet(context) {
  const { params, request, env } = context;
  const projectId = params.id; // comes from filename [id].js
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return new Response("Missing userId", { status: 400 });

  const key = `user_${userId}_project_${projectId}`;
  const data = await env.PROJECTS.get(key);

  if (!data) {
    return new Response("Project not found", { status: 404 });
  }

  return new Response(data, {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestDelete(context) {
  const { params, request, env } = context;
  const projectId = params.id;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return new Response("Missing userId", { status: 400 });

  const key = `user_${userId}_project_${projectId}`;
  
  await env.PROJECTS.delete(key);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}