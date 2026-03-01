export async function onRequestPost(context) {
  const { request, env } = context;
  const data = await request.json();

  // Required fields (match frontend exactly)
  if (!data.name || !data.area || !data.phone || !data.email) {
    return new Response("Invalid input", { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO host_applications
    (
      id,
      name,
      area,
      phone,
      email,
      languages,
      availability,
      shadowing,
      background,
      source,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.name,
    data.area,
    data.phone,
    data.email,
    data.languages || "",
    data.availability || "",
    data.shadowing || "no",
    data.background || "",
    data.source || "",
    now
  ).run();

  return Response.json({ success: true });
}
