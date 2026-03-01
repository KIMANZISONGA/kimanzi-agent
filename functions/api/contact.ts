async function sendEmail(env: any, message: any) {
  // MailChannels
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

  if (!data?.name || !data?.email || !data?.message) {
    return new Response("Invalid input", { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(`
    INSERT INTO contact_messages
    (id, name, email, phone, topic, message, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    String(data.name).trim(),
    String(data.email).trim(),
    String(data.phone || "").trim(),
    String(data.topic || "").trim(),
    String(data.message).trim(),
    String(data.source || "").trim(),
    now
  ).run();

  const from = env.MAIL_FROM;
  const notifyTo = env.MAIL_NOTIFY_TO || "info@kimanzi.nl";

  // 1) Notify Kimanzi
  await sendEmail(env, {
    personalizations: [{ to: [{ email: notifyTo }] }],
    from: { email: from, name: "KIMANZI" },
    subject: `New contact message — ${escape(String(data.name).trim())}`,
    content: [{
      type: "text/plain",
      value:
`New contact message

Name: ${String(data.name).trim()}
Email: ${String(data.email).trim()}
Phone: ${String(data.phone || "").trim()}
Topic: ${String(data.topic || "").trim()}

Message:
${String(data.message).trim()}

Source: ${String(data.source || "").trim()}
ID: ${id}
Time: ${new Date(now).toISOString()}
`
    }]
  });

  // 2) Auto-reply to sender
  await sendEmail(env, {
    personalizations: [{ to: [{ email: String(data.email).trim() }] }],
    from: { email: from, name: "KIMANZI" },
    subject: "We received your message",
    content: [{
      type: "text/plain",
      value:
`We received your message.

We confirm receipt and respond within 1 day.

— KIMANZI`
    }]
  });

  return Response.json({ success: true });
}
