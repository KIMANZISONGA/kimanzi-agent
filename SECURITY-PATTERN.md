# Toegangscontrole voor host-only / vertrouwelijke documenten

**Waarom dit bestand bestaat:** handbook.html, training.html, contract.html en nairobi.html
stonden lange tijd volledig publiek toegankelijk via `curl`/"view source", ondanks een
client-side JS-redirect die de indruk wekte dat ze afgeschermd waren. Een JS-redirect
voorkomt niet dat de browser (of curl, of een crawler) de volledige HTML al heeft
gedownload vóór het script uitvoert. Dit patroon legt vast hoe het wél moet.

## Regel

Een document is pas écht afgeschermd als de vertrouwelijke inhoud **nooit in de
statische HTML staat**. De inhoud moet via een geauthenticeerde API-call worden
opgehaald, ná een geldige login.

## Het patroon (zoals toegepast op handbook/training/contract/nairobi)

### 1. Worker — content + endpoint
In `urbanchill-api` (Cloudflare Worker):

```js
const NIEUWNAAM_HTML = `...volledige HTML-inhoud van het document...`;

if (path === "/api/host/nieuwnaam" && method === "GET") {
  const token = sanitizeString(
    request.headers.get("X-Host-Token") || url.searchParams.get("token") || "", 200
  );
  if (!token) return json({ error: "unauthorized" }, 401);

  const host = await env.DB.prepare(`
    SELECT id, name, portal_token_expires FROM hosts
    WHERE portal_token = ? AND active = 1 LIMIT 1
  `).bind(token).first();

  if (!host || new Date(host.portal_token_expires) < new Date()) {
    return json({ error: "unauthorized" }, 401);
  }

  return json({ success: true, html: NIEUWNAAM_HTML });
}
```

Voeg `"/api/host/nieuwnaam"` toe aan `PUBLIC_PATHS` (bypass voor Cloudflare Access —
de tokencheck hierboven is de eigenlijke beveiliging, niet Access).

### 2. Statische pagina — dunne schil

`nieuwnaam.html` op kimanzi.nl bevat **geen vertrouwelijke tekst**, alleen:

```html
<!-- ACCESS CHECK -->
<script>
  (function(){
    const token = sessionStorage.getItem("kimanzi_token");
    const host  = sessionStorage.getItem("kimanzi_host");
    if(!token || !host){ window.location.href = "portal.html"; }
  })();
</script>

<div id="docLoading">Loading…</div>
<div id="docContent" style="display:none;"></div>

<script>
  (async function(){
    const token = sessionStorage.getItem("kimanzi_token");
    if (!token) { window.location.href = "portal.html"; return; }
    const res = await fetch("https://cockpit.urbanchill.org/api/host/nieuwnaam?token=" + encodeURIComponent(token));
    const data = await res.json();
    if (data.success && data.html) {
      document.getElementById("docContent").innerHTML = data.html;
      document.getElementById("docContent").style.display = "block";
      document.getElementById("docLoading").style.display = "none";
    } else {
      window.location.href = "portal.html";
    }
  })();
</script>
```

## Checklist bij een nieuw vertrouwelijk document

- [ ] Inhoud staat als string-constante in de Worker, niet in de statische HTML
- [ ] Nieuw `/api/host/...` GET-endpoint met dezelfde token-check als hierboven
- [ ] Pad toegevoegd aan `PUBLIC_PATHS` in de Worker
- [ ] `curl https://kimanzi.nl/bestand.html` getest — mag GEEN vertrouwelijke tekst tonen
- [ ] `curl https://cockpit.urbanchill.org/api/host/...` zonder token getest — moet 401 geven
- [ ] Worker gedeployed met alle 13 non-secret bindings expliciet meegestuurd (zie geheugen-notitie over Worker-deploys)

## Wat hier expliciet NIET volstaat

- Een `sessionStorage`-vlag zoals `kimanzi_handbook_access` die de pagina zelf instelt
  vóór een redirect — spoofbaar via devtools, en lost het curl-probleem niet op.
- CSS `display:none` op de content totdat ingelogd is — content staat dan nog gewoon
  in de paginabron.
- Alleen een Cloudflare Access-check op het Worker-endpoint — Access beschermt
  `cockpit.urbanchill.org`, niet de statische bestanden op `kimanzi.nl` (Netlify).
