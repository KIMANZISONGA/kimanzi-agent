export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const data = await request.json();

    // Validatie (matcht je HTML exact)
    if (!data?.name || !data?.area || !data?.phone || !data?.email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    // Alleen D1 insert
    await env.DB.prepare(`
      INSERT INTO host_applications
      (id, name, area, phone, email,
       independent_status, experience, environment, availability, mentorship,
       independent_confirm, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      String(data.name).trim(),
      String(data.area).trim(),
      String(data.phone).trim(),
      String(data.email).trim(),
      String(data.independent_status || "").trim(),
      String(data.experience || "").trim(),
      String(data.environment || "").trim(),
      String(data.availability || "").trim(),
      String(data.mentorship || "").trim(),
      data.independent_confirm ? 1 : 0,
      String(data.source || "").trim(),
      now
    ).run();

    return new Response(
      JSON.stringify({ success: true, id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: err?.message || "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
