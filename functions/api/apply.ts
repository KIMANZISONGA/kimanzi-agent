async function sendEmail(env: any, message: any) {
  if (!env.MAIL_FROM) return; // mail optioneel
  await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });
}

function clean(value: any) {
  return String(value || "").trim();
}

export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // ✅ Verplichte velden
    if (
      !data?.name ||
      !data?.email ||
      !data?.phone ||
      !data?.area ||
      !data?.independent_status ||
      !data?.availability ||
      !data?.independent_confirm
    ) {
      return new Response("Invalid input", { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO host_applications
      (id, name, email, phone, area,
       independent_status, experience,
       environment, availability,
       mentorship, independent_confirm,
       source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      clean(data.name),
      clean(data.email),
      clean(data.phone),
      clean(data.area),
      clean(data.independent_status),
      clean(data.experience),
      clean(data.environment),
      clean(data.availability),
      clean(data.mentorship),
      data.independent_confirm ? 1 : 0,
      clean(data.source),
      now
    ).run();

    const from = env.MAIL_FROM;
    const notifyTo = env.MAIL_NOTIFY_TO || "info@kimanzi.nl";

    // 1️⃣ Notify Kimanzi
    if (from) {
      await sendEmail(env, {
        personalizations: [{ to: [{ email: notifyTo }] }],
        from: { email: from, name: "KIMANZI" },
        subject: `New Host Application — ${clean(data.name)}`,
        content: [{
          type: "text/plain",
          value:
`New Host Application

Name: ${clean(data.name)}
Email: ${clean(data.email)}
Phone: ${clean(data.phone)}
Area: ${clean(data.area)}

Independent: ${clean(data.independent_status)}
Availability: ${clean(data.availability)}
Mentorship: ${clean(data.mentorship)}
Environment: ${clean(data.environment)}

Experience:
${clean(data.experience)}

Source: ${clean(data.source)}
ID: ${id}
Time: ${new Date(now).toISOString()}
`
        }]
      });

      // 2️⃣ Auto-reply to applicant
      await sendEmail(env, {
        personalizations: [{ to: [{ email: clean(data.email) }] }],
        from: { email: from, name: "KIMANZI" },
        subject: "We received your submission",
        content: [{
          type: "text/plain",
          value:
`We received your submission.

We confirm receipt and respond within 1 day.

— KIMANZI`
        }]
      });
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("Apply error:", err);
    return new Response("Server error", { status: 500 });
  }
}
