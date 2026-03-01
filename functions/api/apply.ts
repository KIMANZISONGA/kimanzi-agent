async function sendEmail(env: any, message: any) {
  const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });
  return resp;
}

function escape(s: string) {
  return String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c]);
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const data = await request.json();

  // Required fields (match the HTML exactly)
  if (!data?.name || !data?.area || !data?.phone || !data?.email) {
    return new Response("Invalid input", { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

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

  const from = env.MAIL_FROM;
  const notifyTo = env.MAIL_NOTIFY_TO || "intake@kimanzi.nl";

  // 1) Notify Kimanzi
  await sendEmail(env, {
    personalizations: [{ to: [{ email: notifyTo }] }],
    from: { email: from, name: "KIMANZI" },
    subject: `New host application — ${escape(String(data.name).trim())}`,
    content: [{
      type: "text/plain",
      value:
`New host application

Name: ${String(data.name).trim()}
Email: ${String(data.email).trim()}
Phone: ${String(data.phone).trim()}
Area: ${String(data.area).trim()}

Independent status: ${String(data.independent_status || "").trim()}
Availability: ${String(data.availability || "").trim()}
Mentorship: ${String(data.mentorship || "").trim()}
Environment: ${String(data.environment || "").trim()}

Experience:
${String(data.experience || "").trim()}

Independent confirmation: ${data.independent_confirm ? "Yes" : "No"}

Source: ${String(data.source || "").trim()}
ID: ${id}
Time: ${new Date(now).toISOString()}
`
    }]
  });

  // 2) Auto-reply to applicant
  await sendEmail(env, {
    personalizations: [{ to: [{ email: String(data.email).trim() }] }],
    from: { email: from, name: "KIMANZI" },
    subject: "We received your application",
    content: [{
      type: "text/plain",
      value:
`We received your application.

We confirm receipt and respond within 1 day.

— KIMANZI`
    }]
  });

  return Response.json({ success: true });
}
