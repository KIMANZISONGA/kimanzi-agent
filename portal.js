var avYear  = new Date().getFullYear();
var avMonth = new Date().getMonth();
var avData  = {};

window.loadAvailability = async function() {
  const token = sessionStorage.getItem("kimanzi_token");
  if (!token) return;
  try {
    const from = new Date(avYear, avMonth, 1).toISOString().slice(0, 10);
    const to   = new Date(avYear, avMonth + 3, 0).toISOString().slice(0, 10);
    const res  = await fetch(API + "/api/host/availability?token=" + encodeURIComponent(token) + "&from=" + from + "&to=" + to);
    const data = await res.json();
    if (data.ok) {
      avData = {};
      (data.availability || []).forEach(function(r) { avData[r.date] = r.status; });
    }
  } catch(e) {}
  renderAvCalendar();
}

window.renderAvCalendar = function() {
  const el = document.getElementById("avCalendar");
  const label = document.getElementById("avMonthLabel");
  if (!el || !label) return;

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  label.textContent = monthNames[avMonth] + " " + avYear;

  const firstDay = new Date(avYear, avMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(avYear, avMonth + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const startOffset = (firstDay + 6) % 7; // Mon=0

  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center">';
  ["Mo","Tu","We","Th","Fr","Sa","Su"].forEach(function(d) {
    html += '<div style="font-size:10px;font-weight:700;color:var(--muted);padding:.2rem 0">' + d + '</div>';
  });

  for (let i = 0; i < startOffset; i++) {
    html += '<div></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = avYear + "-" + String(avMonth + 1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
    const status  = avData[dateStr];
    const isToday = dateStr === today;
    const isPast  = dateStr < today;

    let bg    = "#f0ebe2";
    let color = "#333";
    let border = "1px solid #e0d8cc";
    if (status === "available")   { bg = "#1A422E"; color = "#fff"; border = "1px solid #1A422E"; }
    if (status === "unavailable") { bg = "#c0392b"; color = "#fff"; border = "1px solid #c0392b"; }
    if (isToday) border = "2px solid #D07723";
    if (isPast)  { color = isPast && !status ? "#bbb" : color; }

    const opacity = isPast ? "0.45" : "1";
    const cursor  = isPast ? "default" : "pointer";

    html += '<div style="background:' + bg + ';color:' + color + ';border:' + border + ';border-radius:6px;padding:.35rem .1rem;font-size:12px;font-weight:600;cursor:' + cursor + ';opacity:' + opacity + ';user-select:none" '
          + (isPast ? '' : 'onclick="avToggleDay(\'' + dateStr + '\')"')
          + '>' + d + '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

window.avToggleDay = async function(dateStr) {
  const token = sessionStorage.getItem("kimanzi_token");
  if (!token) return;

  const current = avData[dateStr];
  let next;
  if (!current)               next = "available";
  else if (current === "available")  next = "unavailable";
  else                        next = null; // verwijderen

  const statusEl = document.getElementById("avStatus");
  if (statusEl) statusEl.textContent = "Saving…";

  try {
    if (next) {
      await fetch(API + "/api/host/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Host-Token": token },
        body: JSON.stringify({ date: dateStr, status: next })
      });
      avData[dateStr] = next;
    } else {
      await fetch(API + "/api/host/availability/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Host-Token": token },
        body: JSON.stringify({ date: dateStr })
      });
      delete avData[dateStr];
    }
    if (statusEl) { statusEl.textContent = "Saved"; setTimeout(function(){ statusEl.textContent = ""; }, 1500); }
  } catch(e) {
    if (statusEl) statusEl.textContent = "Error — try again";
  }
  renderAvCalendar();
};


const API = "https://api.urbanchill.org";
  let currentHost = null;

  // ── Sessie herstellen via token verificatie ──
  const savedToken = sessionStorage.getItem("kimanzi_token");
  const savedHost  = sessionStorage.getItem("kimanzi_host");
  if (savedToken && savedHost) {
    fetch(API + "/api/host/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: savedToken })
    })
    .then(r => r.json())
    .then(data => {
      if (data.valid) {
        currentHost = JSON.parse(savedHost);
        showPortal();
      } else {
        sessionStorage.removeItem("kimanzi_token");
        sessionStorage.removeItem("kimanzi_host");
      }
    })
    .catch(() => { /* netwerk fout — loginscherm blijft */ });
  }

  function openHandbook() {
    sessionStorage.setItem("kimanzi_handbook_access", "1");
    window.location.href = "handbook.html";
  }

  function openContract() {
    window.location.href = "contract.html";
  }

  function openTraining() {
    window.location.href = "training.html";
  }

  function showFees() {
    document.getElementById("portalScreen").style.display = "none";
    document.getElementById("feesScreen").style.display = "block";
    window.scrollTo(0, 0);
  }

  async function doLogin() {
    const email    = document.getElementById("emailInput").value.trim().toLowerCase();
    const password = document.getElementById("passwordInput").value;
    const errEl    = document.getElementById("loginError");
    const btn      = document.querySelector(".login-btn");

    if (!email || !password) {
      errEl.textContent = "Please enter your email and password.";
      return;
    }

    btn.textContent = "Signing in...";
    btn.disabled = true;
    errEl.textContent = "";

    try {
      const res = await fetch(API + "/api/host/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.token) {
        currentHost = data.host;
        sessionStorage.setItem("kimanzi_token", data.token);
        sessionStorage.setItem("kimanzi_host", JSON.stringify(data.host));
        showPortal();
      } else {
        errEl.textContent = data.message || "Incorrect email or password.";
        document.getElementById("passwordInput").value = "";
      }
    } catch(e) {
      errEl.textContent = "Connection error. Please try again.";
    } finally {
      btn.textContent = "Sign in \u2192";
      btn.disabled = false;
    }
  }

  function showPortal() {
    document.getElementById("loginScreen").style.display   = "none";
    document.getElementById("handbookScreen").style.display = "none";
    document.getElementById("feesScreen").style.display    = "none";
    document.getElementById("portalScreen").style.display  = "block";

    // Koppel assignments tegel listeners na login (DOM is nu zichtbaar)
    const _tegel = document.getElementById("assignmentsTegel");
    if (_tegel) _tegel.addEventListener("click", openAssignmentsScreen);
    const _back = document.getElementById("backFromAssignments");
    if (_back) _back.addEventListener("click", closeAssignmentsScreen);

    // Availability listeners — hier koppelen zodat loadAvailability zeker beschikbaar is
    const _avTegel    = document.getElementById("availabilityTegel");
    const _avExpanded = document.getElementById("availabilityExpanded");
    const _avBack     = document.getElementById("backFromAvailability");
    if (_avTegel && !_avTegel.dataset.bound) {
      _avTegel.dataset.bound = "1";
      _avTegel.addEventListener("click", function() {
        _avTegel.style.display = "none";
        _avExpanded.style.display = "";
        loadAvailability();
      });
    }
    if (_avBack && !_avBack.dataset.bound) {
      _avBack.dataset.bound = "1";
      _avBack.addEventListener("click", function() {
        _avExpanded.style.display = "none";
        _avTegel.style.display = "";
      });
    }

    if (currentHost) {
      const first = currentHost.name.charAt(0).toUpperCase();
      document.getElementById("userAvatar").textContent  = first;
      document.getElementById("welcomeName").textContent = "Good " + timeOfDay() + ", " + currentHost.name + ".";
      document.getElementById("welcomeTime").textContent = new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });
      loadPortalWeather();
      loadAssignments();
      // Poll elke 60 sec voor ongelezen berichten
      async function checkUnread() {
        const token = sessionStorage.getItem("kimanzi_token");
        if (!token) return;
        try {
          const res = await fetch(API + "/api/host/messages/unread?token=" + encodeURIComponent(token));
          const data = await res.json().catch(() => ({}));
          updateMsgBadge((data.unread || 0) > 0);
        } catch(e) {}
      }
      checkUnread();
      setInterval(checkUnread, 60000);
      loadGeneralMessages();
    }
    window.scrollTo(0, 0);
  }

  async function loadAssignments() {
    const section = document.getElementById("assignmentsSection");
    if (!section) return;
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token) return;

    try {
      const res = await fetch(API + "/api/host/opdrachten?token=" + encodeURIComponent(token));
      const data = await res.json().catch(() => ({}));
      const opdrachten = data.opdrachten || [];

      // Badge updaten
      const badge = document.getElementById("assignmentBadge");
      if (badge) {
        if (opdrachten.length > 0) {
          badge.textContent = opdrachten.length;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      }
      // Tegel beschrijving
      const tegelDescEl = document.getElementById("assignmentsTegelDesc");
      if (tegelDescEl) {
        tegelDescEl.textContent = opdrachten.length === 0
          ? "No upcoming assignments."
          : opdrachten.length + " active — " + opdrachten.map(function(o){ return o.client_name || "—"; }).join(", ");
      }

      if (opdrachten.length === 0) {
        section.innerHTML = `<div class="no-assignments">No upcoming assignments. You'll be notified when a new briefing is ready.</div>`;
        return;
      }

      section.innerHTML = opdrachten.map(o => {
        const rawService = (o.offer_service || o.service || "").toLowerCase().trim();
        const serviceLabels = {
          "arrival": { label: "Arrival", desc: "Airport pickup, first-day orientation, and practical support on arrival day." },
          "arrival duo": { label: "Arrival (duo)", desc: "Airport pickup and orientation for two people arriving together." },
          "extra day": { label: "Extra Day", desc: "A full day of local orientation, errands, and support in Nairobi." },
          "concierge": { label: "Concierge", desc: "Remote support via messaging — available during your stay for questions and local advice." },
        };
        const serviceInfo = serviceLabels[rawService] || { label: o.offer_service || o.service || "—", desc: "" };
        const dienst = serviceInfo.label;
        const dienstDesc = serviceInfo.desc;
        const datum  = o.arrival_date
          ? new Date(o.arrival_date).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" })
          : null;
        const tijd   = o.arrival_time || null;
        const vlucht = o.flight_number || null;
        const feeCents    = Number(o.base_fee_cents || 0);
        const bonnenCents = Number(o.reimbursable_cents || 0);
        const totalCents  = Number(o.payout_cents || (feeCents + bonnenCents));
        const hasFee = feeCents > 0 || bonnenCents > 0 || totalCents > 0;

        const dieet  = tryParseArr(o.dietary_preferences);
        const allerg = tryParseArr(o.allergies);
        const activ  = tryParseArr(o.activities);
        const extra  = o.special_requests || "";
        const adres  = o.stay_place_name || o.stay_address_text || null;

        return `
        <div class="assignment-card">
          <div class="assignment-header">
            <div class="assignment-title">📋 ${escHtml(dienst)}</div>
            ${datum ? `<div class="assignment-date">${escHtml(datum)}</div>` : ""}
          </div>
          ${dienstDesc ? `<div class="assignment-desc">${escHtml(dienstDesc)}</div>` : ""}
          ${(() => {
            const fs = (o.finance_status || "not_ready").toLowerCase();
            const statusMap = {
              "not_ready":        { icon: "⏳", label: "Assignment being prepared — awaiting client confirmation", color: "#94a3b8" },
              "ready_to_invoice": { icon: "📄", label: "Invoice being prepared for client",                        color: "#C87A2E" },
              "invoiced":         { icon: "📬", label: "Invoice sent — awaiting client payment",                   color: "#C87A2E" },
              "paid":             { icon: "✅", label: "Client payment received — assignment confirmed",            color: "#2A6B2A" },
            };
            const s = statusMap[fs] || statusMap["not_ready"];
            return `<div class="assignment-finance-status" style="color:${s.color}">${s.icon} ${escHtml(s.label)}</div>`;
          })()}
          <div class="assignment-grid">

            <div class="assignment-row">
              <span class="assignment-key">Client name</span>
              <span class="assignment-val">${escHtml(o.client_name || "—")}</span>
            </div>
            ${o.client_phone ? `
            <div class="assignment-row">
              <span class="assignment-key">📞 Phone</span>
              <span class="assignment-val"><a href="tel:${escHtml(o.client_phone)}" class="assignment-phone">${escHtml(o.client_phone)}</a></span>
            </div>` : ""}

            ${tijd ? `
            <div class="assignment-row">
              <span class="assignment-key">Arrival time</span>
              <span class="assignment-val">⏱ ${escHtml(tijd)}</span>
            </div>` : ""}
            ${vlucht ? `
            <div class="assignment-row">
              <span class="assignment-key">Flight</span>
              <span class="assignment-val">✈️ ${escHtml(vlucht)}</span>
            </div>` : ""}

            ${hasFee ? `
            <div class="assignment-row">
              <span class="assignment-key">Your payout</span>
              <span class="assignment-val">
                <span style="color:#1A422E;font-weight:700">€${(totalCents / 100).toFixed(2)}</span>
                ${o.payout_status === 'paid'
                  ? '<span style="color:#2A6B2A;font-size:12px;margin-left:.4rem">✅ Paid</span>'
                  : '<span style="color:#94a3b8;font-size:11px;display:block;margin-top:2px">Paid out after assignment is completed</span>'}
                ${bonnenCents > 0 ? `
                <span style="font-size:11px;color:#94a3b8;display:block;margin-top:3px">
                  Fee €${(feeCents/100).toFixed(2)} + receipts €${(bonnenCents/100).toFixed(2)}
                </span>` : ``}
              </span>
            </div>` : ""}

            ${adres ? `
            <div class="assignment-row assignment-full">
              <span class="assignment-key">📍 Location in Nairobi</span>
              <span class="assignment-val">${escHtml(adres)}</span>
            </div>` : ""}

            ${allerg.length ? `
            <div class="assignment-row assignment-full">
              <span class="assignment-key">⚠️ Allergies</span>
              <span class="assignment-val" style="color:#c0392b;font-weight:600">${allerg.map(escHtml).join(", ")}</span>
            </div>` : ""}




          </div>
          ${o.maps_link ? `<a href="${escHtml(o.maps_link)}" target="_blank" class="assignment-map">📍 Open in Maps →</a>` : ""}

          ${(() => {
            const acts  = tryParseArr(o.activities);
            const diet  = tryParseArr(o.dietary_preferences);
            const allerg = tryParseArr(o.allergies);
            const special = o.special_requests ? String(o.special_requests).trim() : "";
            const pills = (arr, cls) => arr.map(x => `<span class="pref-pill ${cls}">${escHtml(x)}</span>`).join("");
            const rows = [];
            if (diet.length || acts.length)
              rows.push(`<div class="pref-row">
                <span class="pref-key">Diet</span><span class="pref-vals">${pills(diet,"")}</span>
                ${acts.length ? `<span class="pref-key pref-key-second">Activities</span><span class="pref-vals">${pills(acts,"")}</span>` : ""}
              </div>`);
            if (allerg.length)
              rows.push(`<div class="pref-row"><span class="pref-key allerg-key">⚠ Allergies</span><span class="pref-vals">${pills(allerg,"allerg-pill")}</span></div>`);
            if (special)
              rows.push(`<div class="pref-row"><span class="pref-key">Notes</span><span class="pref-vals pref-note">${escHtml(special)}</span></div>`);
            // Risk flags
            const risks = tryParseArr(o.risk_flags);
            if (risks.length)
              rows.push(`<div class="pref-row"><span class="pref-key allerg-key">⚠ Risk</span><span class="pref-vals">${pills(risks, "allerg-pill")}</span></div>`);
            // Accommodation
            const accom = tryParseArr(o.accommodation_pref);
            if (accom.length)
              rows.push(`<div class="pref-row"><span class="pref-key">Accommodation</span><span class="pref-vals">${pills(accom, "")}</span></div>`);
            return rows.length ? `<div class="prefs-section">${rows.join("")}</div>` : "";
          })()}

          <div class="receipt-wrap" id="receipt-wrap-${escHtml(o.id)}">
            <div class="chat-header">🧾 Receipts</div>
            <div id="receipt-list-${escHtml(o.id)}" class="receipt-list">
              <div class="receipt-empty">Loading...</div>
            </div>
            <div class="receipt-form">
              <select id="receipt-cat-${escHtml(o.id)}" class="receipt-select">
                <option value="uber">🚗 Uber</option>
                <option value="meals">🍽️ Meals</option>
                <option value="other">📄 Other</option>
              </select>
              <input type="number" id="receipt-amount-${escHtml(o.id)}" class="receipt-input" placeholder="Amount (KES)" min="0" step="1">
              <label class="receipt-file-label">
                📷 Photo
                <input type="file" id="receipt-file-${escHtml(o.id)}" accept="image/*" capture="environment" style="display:none">
              </label>
              <button class="chat-send-btn" onclick="submitReceipt('${escHtml(o.id)}')">Submit</button>
            </div>
            <div id="receipt-status-${escHtml(o.id)}" style="font-size:12px;margin-top:.3rem;min-height:1rem"></div>
          </div>

          <div class="chat-wrap" id="chat-wrap-${escHtml(o.id)}">
            <div class="chat-header">💬 Messages</div>
            <div class="chat-thread" id="chat-thread-${escHtml(o.id)}">
              <div class="chat-loading">Loading...</div>
            </div>
            <div class="chat-input-wrap">
              <textarea class="chat-input" id="chat-input-${escHtml(o.id)}" placeholder="Write a message to KIMANZI..." rows="2"></textarea>
              <button class="chat-send-btn" onclick="sendMessage('${escHtml(o.id)}')">Send</button>
            </div>
          </div>
        </div>`;
      }).join("");

      // Laad chat threads voor elke opdracht
      opdrachten.forEach(o => {
        loadThread(o.id);
        loadReceipts(o.id);
      });

    } catch(e) {
      section.innerHTML = `<div class="no-assignments">Could not load assignments. Please refresh.</div>`;
    }
  }

  // ── BONNEN UPLOAD ──
  async function loadReceipts(caseId) {
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token) return;
    try {
      const res = await fetch(API + "/api/host/receipts?token=" + encodeURIComponent(token) + "&case_id=" + encodeURIComponent(caseId));
      const data = await res.json().catch(() => ({}));
      const list = document.getElementById("receipt-list-" + caseId);
      if (!list) return;
      const items = data.receipts || [];
      if (items.length === 0) {
        list.innerHTML = '<div class="receipt-empty">No receipts submitted yet.</div>';
        return;
      }
      list.innerHTML = items.map(r => {
        const amt = r.amount_cents ? "KES " + (r.amount_cents / 100).toFixed(0) : "—";
        const cat = r.category || "other";
        const catLabel = { uber: "🚗 Uber", meals: "🍽️ Meals", other: "📄 Other" }[cat] || cat;
        const date = new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        return '<div class="receipt-item">'
          + '<span class="receipt-cat">' + catLabel + '</span>'
          + '<span class="receipt-desc">' + escHtml(r.description || cat) + '</span>'
          + '<span class="receipt-amt">' + amt + '</span>'
          + '<span class="receipt-date">' + date + '</span>'
          + '</div>';
      }).join("");
    } catch(e) {}
  }

  async function submitReceipt(caseId) {
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token) return;

    const fileInput = document.getElementById("receipt-file-" + caseId);
    const amountInput = document.getElementById("receipt-amount-" + caseId);
    const catSelect = document.getElementById("receipt-cat-" + caseId);
    const statusEl = document.getElementById("receipt-status-" + caseId);

    if (!fileInput?.files?.length) {
      if (statusEl) { statusEl.textContent = "Please select a photo."; statusEl.style.color = "#c0392b"; }
      return;
    }

    const file = fileInput.files[0];
    const amount = Math.round(parseFloat(amountInput?.value || "0") * 100);
    const category = catSelect?.value || "other";

    if (statusEl) { statusEl.textContent = "Uploading..."; statusEl.style.color = "#94a3b8"; }

    try {
      const params = new URLSearchParams({
        token, case_id: caseId, category,
        amount_cents: amount,
        description: category
      });
      const res = await fetch(API + "/api/host/receipt/upload?" + params.toString(), {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        fileInput.value = "";
        amountInput.value = "";
        if (statusEl) { statusEl.textContent = "✓ Receipt submitted!"; statusEl.style.color = "#2A6B2A"; }
        await loadReceipts(caseId);
        setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
      } else {
        if (statusEl) { statusEl.textContent = "Upload failed: " + (data.error || "unknown"); statusEl.style.color = "#c0392b"; }
      }
    } catch(e) {
      if (statusEl) { statusEl.textContent = "Error: " + e.message; statusEl.style.color = "#c0392b"; }
    }
  }

  function openAssignmentsScreen() {
    document.getElementById("assignmentsTegel").style.display = "none";
    document.getElementById("assignmentsExpanded").style.display = "block";
    window.scrollTo(0, 0);
  }

  function closeAssignmentsScreen() {
    document.getElementById("assignmentsExpanded").style.display = "none";
    document.getElementById("assignmentsTegel").style.display = "block";
    window.scrollTo(0, 0);
  }

  async function loadThread(caseId) {
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token) return;
    try {
      const res = await fetch(API + "/api/host/messages?token=" + encodeURIComponent(token) + "&case_id=" + encodeURIComponent(caseId));
      const data = await res.json().catch(() => ({}));
      const msgs = data.messages || [];
      const thread = document.getElementById("chat-thread-" + caseId);
      if (!thread) return;
      if (msgs.length === 0) {
        thread.innerHTML = '<div class="chat-empty">No messages yet. Send the first one.</div>';
        return;
      }
      thread.innerHTML = msgs.map(m => {
        const isHost = m.sender === "host";
        const time = new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
        const delBtn = isHost ? '<button onclick="deleteHostMessage(' + m.id + ',\'' + escHtml(caseId) + '\')" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:10px;cursor:pointer;padding:0 0 0 6px" title="Verwijderen">✕</button>' : '';
        return '<div class="chat-msg ' + (isHost ? "chat-msg-host" : "chat-msg-stephen") + '">'
          + '<div class="chat-bubble">' + escHtml(m.message) + delBtn + '</div>'
          + '<div class="chat-time">' + (isHost ? "You" : "KIMANZI") + ' · ' + time + '</div>'
          + '</div>';
      }).join("");
      thread.scrollTop = thread.scrollHeight;

      // Badge bijwerken — tel ongelezen berichten van stephen
      const unread = msgs.filter(m => m.sender === "stephen" && !m.read_at).length;
      updateMsgBadge(unread > 0);
    } catch(e) {}
  }

  function updateMsgBadge(hasUnread) {
    const navBadge = document.getElementById("assignmentBadge");
    if (navBadge && hasUnread) {
      navBadge.style.display = "flex";
      navBadge.style.background = "#c0392b";
    }
    const tegelBadge = document.getElementById("assignmentsBadge");
    if (tegelBadge) tegelBadge.style.display = hasUnread ? "inline" : "none";
  }

  async function sendMessage(caseId) {
    const token = sessionStorage.getItem("kimanzi_token");
    const input = document.getElementById("chat-input-" + caseId);
    if (!token || !input) return;
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    input.disabled = true;
    try {
      await fetch(API + "/api/host/messages/send?token=" + encodeURIComponent(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, message })
      });
      await loadThread(caseId);
    } catch(e) {}
    input.disabled = false;
    input.focus();
  }

  async function loadGeneralMessages() {
    const token = sessionStorage.getItem("kimanzi_token");
    const thread = document.getElementById("generalMsgThread");
    if (!token || !thread) return;
    try {
      const res = await fetch(API + "/api/host/messages?token=" + encodeURIComponent(token));
      const data = await res.json().catch(() => ({}));
      const msgs = data.messages || [];
      if (msgs.length === 0) {
        thread.innerHTML = '<div style="text-align:center;font-size:12px;color:var(--muted);padding:.5rem 0">No messages yet — send the first one.</div>';
        return;
      }
      thread.innerHTML = msgs.map(m => {
        const isHost = m.sender === "host";
        const time = new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
        const delBtn = isHost ? '<button onclick="deleteGeneralHostMessage(' + m.id + ')" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:10px;cursor:pointer;padding:0 0 0 6px" title="Verwijderen">✕</button>' : '';
        return '<div class="chat-msg ' + (isHost ? "chat-msg-host" : "chat-msg-stephen") + '">'
          + '<div class="chat-bubble">' + escHtml(m.message) + delBtn + '</div>'
          + '<div class="chat-time">' + (isHost ? "You" : "KIMANZI") + ' · ' + time + '</div>'
          + '</div>';
      }).join("");
      thread.scrollTop = thread.scrollHeight;
    } catch(e) {}
  }

  window.deleteHostMessage = async function(msgId, caseId) {
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token || !confirm("Bericht verwijderen?")) return;
    try {
      await fetch(API + "/api/host/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Host-Token": token },
        body: JSON.stringify({ message_id: msgId })
      });
      await loadThread(caseId);
    } catch(e) {}
  };

  window.deleteGeneralHostMessage = async function(msgId) {
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token || !confirm("Bericht verwijderen?")) return;
    try {
      await fetch(API + "/api/host/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Host-Token": token },
        body: JSON.stringify({ message_id: msgId })
      });
      await loadGeneralMessages();
    } catch(e) {}
  };

  window.sendGeneralMessage = async function() {
    const token = sessionStorage.getItem("kimanzi_token");
    const input = document.getElementById("generalMsgInput");
    if (!token || !input) return;
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    input.style.height = "60px";
    input.disabled = true;
    try {
      await fetch(API + "/api/host/messages/send?token=" + encodeURIComponent(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      await loadGeneralMessages();
    } catch(e) {}
    input.disabled = false;
    input.focus();
  };

  function tryParseArr(v) {
    if (!v) return [];
    try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean) : []; }
    catch { return typeof v === "string" && v.trim() ? [v] : []; }
  }

  function escHtml(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function showHandbook() {
    document.getElementById("portalScreen").style.display   = "none";
    document.getElementById("handbookScreen").style.display = "block";
    window.scrollTo(0, 0);
  }

  function doLogout() {
    sessionStorage.removeItem("kimanzi_token");
    sessionStorage.removeItem("kimanzi_host");
    currentHost = null;
    document.getElementById("portalScreen").style.display  = "none";
    document.getElementById("loginScreen").style.display   = "flex";
    document.getElementById("emailInput").value    = "";
    document.getElementById("passwordInput").value = "";
  }

  function timeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  }

  /* ===== WEATHER + KOERS WIDGET ===== */
  async function loadPortalWeather() {
    const widget = document.getElementById("portalWeatherWidget");
    if (!widget) return;
    const [nairobi, rijswijk, eurKes] = await Promise.all([
      fetchWeather(-1.2921, 36.8219, "Africa/Nairobi"),
      fetchWeather(52.0400, 4.3583, "Europe/Amsterdam"),
      fetchEurKes()
    ]);
    widget.innerHTML = `
      <div style="display:flex;gap:.6rem;flex-wrap:wrap">
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,.08);border-radius:10px;padding:.7rem .9rem">
          <div style="font-size:10px;color:rgba(245,239,226,.45);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem">🌍 Nairobi</div>
          ${nairobi
            ? `<div style="display:flex;align-items:center;gap:.4rem"><span style="font-size:22px">${nairobi.icon}</span><div><div style="font-size:18px;font-weight:700;color:#F5EFE2;line-height:1">${nairobi.temp}°C</div><div style="font-size:10px;color:rgba(245,239,226,.5)">${nairobi.desc}</div></div></div>`
            : `<div style="font-size:11px;color:rgba(245,239,226,.3)">—</div>`}
        </div>
        <div style="flex:1;min-width:120px;background:rgba(255,255,255,.08);border-radius:10px;padding:.7rem .9rem">
          <div style="font-size:10px;color:rgba(245,239,226,.45);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem">🇳🇱 Rijswijk</div>
          ${rijswijk
            ? `<div style="display:flex;align-items:center;gap:.4rem"><span style="font-size:22px">${rijswijk.icon}</span><div><div style="font-size:18px;font-weight:700;color:#F5EFE2;line-height:1">${rijswijk.temp}°C</div><div style="font-size:10px;color:rgba(245,239,226,.5)">${rijswijk.desc}</div></div></div>`
            : `<div style="font-size:11px;color:rgba(245,239,226,.3)">—</div>`}
        </div>
        <div style="flex:1;min-width:120px;background:rgba(200,122,46,.25);border-radius:10px;padding:.7rem .9rem">
          <div style="font-size:10px;color:rgba(245,239,226,.45);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.3rem">💶 Koers</div>
          ${eurKes
            ? `<div style="font-size:18px;font-weight:700;color:#F5EFE2;line-height:1">KSh ${eurKes}</div><div style="font-size:10px;color:rgba(245,239,226,.5)">per €1</div>`
            : `<div style="font-size:11px;color:rgba(245,239,226,.3)">—</div>`}
        </div>
      </div>`;
  }

  async function fetchWeather(lat, lon, timezone) {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=${encodeURIComponent(timezone)}`);
      if (!res.ok) return null;
      const d = await res.json();
      const code = d.current?.weathercode || 0;
      const map = [[0,"☀️","Clear"],[1,"🌤️","Mostly clear"],[2,"⛅","Partly cloudy"],[3,"☁️","Overcast"],[45,"🌫️","Foggy"],[51,"🌦️","Drizzle"],[61,"🌧️","Rain"],[65,"🌧️","Heavy rain"],[80,"🌦️","Showers"],[95,"⛈️","Thunderstorm"]];
      const match = map.slice().reverse().find(([wc]) => code >= wc) || [0,"🌡️","Unknown"];
      return { temp: Math.round(d.current.temperature_2m), icon: match[1], desc: match[2] };
    } catch(e) { return null; }
  }

  async function fetchEurKes() {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/EUR");
      if (!res.ok) throw new Error();
      const d = await res.json();
      const rate = d?.rates?.KES;
      return rate ? Math.round(rate * 100) / 100 : null;
    } catch(e) {
      try {
        const res2 = await fetch("https://api.frankfurter.app/latest?from=EUR&to=KES");
        if (!res2.ok) return null;
        const d2 = await res2.json();
        const rate2 = d2?.rates?.KES;
        return rate2 ? Math.round(rate2 * 100) / 100 : null;
      } catch(e2) { return null; }
    }
  }
  // ── Event listeners (CSP-compliant, geen inline handlers) ──
  document.addEventListener("DOMContentLoaded", function() {
    // Login
    const loginBtn = document.getElementById("loginBtn");
    const pwInput  = document.getElementById("passwordInput");
    if (loginBtn) loginBtn.addEventListener("click", doLogin);
    if (pwInput)  pwInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") doLogin();
    });

    // Kaarten op dashboard
    const handbookCard = document.getElementById("handbookCard");
    const feesCard     = document.getElementById("feesCard");
    if (handbookCard) handbookCard.addEventListener("click", openHandbook);

    const contractCard = document.getElementById("contractCard");
    if (contractCard) contractCard.addEventListener("click", openContract);
    const trainingCard = document.getElementById("trainingCard");
    if (trainingCard) trainingCard.addEventListener("click", openTraining);
    if (feesCard)     feesCard.addEventListener("click", showFees);

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);

    // Terug knoppen (elk met eigen ID na fix duplicate backToPortal)
    const backToFees = document.getElementById("backToFees");
    const backToHandbook = document.getElementById("backToHandbook");
    if (backToFees) backToFees.addEventListener("click", showPortal);
    if (backToHandbook) backToHandbook.addEventListener("click", showPortal);

    // avYear/avMonth/avData zijn globaal gedeclareerd bovenaan
    // loadAvailability/renderAvCalendar/avToggleDay zijn globale functies

    document.getElementById("avPrevMonth").addEventListener("click", function() {
      avMonth--; if (avMonth < 0) { avMonth = 11; avYear--; }
      loadAvailability();
    });
    document.getElementById("avNextMonth").addEventListener("click", function() {
      avMonth++; if (avMonth > 11) { avMonth = 0; avYear++; }
      loadAvailability();
    });
    // Nairobi Guide — via beveiligd Worker-endpoint
    const nairobiCard = document.getElementById("nairobiCard");
    if (nairobiCard) nairobiCard.addEventListener("click", function() {
      const token = sessionStorage.getItem("kimanzi_token");
      if (!token) { showPortal(); return; }
      window.open("/nairobi.html?token=" + encodeURIComponent(token), "_blank");
    });
  });

// Service Worker registratie
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/sw.js")
        .then(function(reg) { console.log("SW registered:", reg.scope); })
        .catch(function(err) { console.log("SW error:", err); });
    });
  }