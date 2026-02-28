export async function onRequestPost(context) {
  const { request, env } = context;
  const data = await request.json();

  if (!data.name || !data.area || !data.signal) {
    return new Response("Invalid input", { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO host_applications
    (id, name, area, signal, email,
     independent_status, experience,
     environment, availability,
     mentorship, independent_confirm,
     source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.name,
    data.area,
    data.signal,
    data.email || "",
    data.independent_status || "",
    data.experience || "",
    data.environment || "",
    data.availability || "",
    data.mentorship || "",
    data.independent_confirm ? 1 : 0,
    data.source || "",
    now
  ).run();

  return Response.json({ success: true });
}
