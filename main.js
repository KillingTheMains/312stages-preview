/* 312 Stages — site script. No build step, no dependencies. */

/* ============================================================
   EDIT THESE. Empty values are hidden on the page.
   ============================================================ */
const SITE = {
  email: "jon@312stages.com",
  phone: "",            // e.g. "(312) 555-0123"
  instagram: "",        // full URL, e.g. "https://instagram.com/312stages"
  facebook: "",         // full URL
  // Free key from https://web3forms.com (enter the email that should receive quotes).
  // Until it is set, the form opens a pre-filled email instead of sending.
  web3formsKey: "",
  preview: true,        // preview build: show what would be sent instead of sending
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- site details ---------- */
  const telHref = (p) => "tel:" + p.replace(/[^\d+]/g, "");
  $$("[data-site]").forEach((el) => {
    const k = el.dataset.site, v = SITE[k];
    if (!v) { el.hidden = true; return; }
    el.hidden = false;
    if (k === "email") { el.href = "mailto:" + v; el.textContent = v; }
    else if (k === "phone") { el.href = telHref(v); el.textContent = v; }
    else { el.href = v; el.target = "_blank"; el.rel = "noopener"; }
  });
  $$("[data-site-row]").forEach((row) => { row.hidden = !SITE[row.dataset.siteRow]; });
  const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- mobile menu ---------- */
  const menuBtn = $(".menu-btn"), nav = $("#site-nav");
  const setMenu = (open) => { nav.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.textContent = open ? "Close" : "Menu"; };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); } });

  /* ---------- hero drawing: tighter crop on phones, then draw the lines in once ---------- */
  const iso = $(".iso");
  if (iso && iso.dataset.vbTight) {
    const mq = window.matchMedia("(max-width: 720px)");
    const fit = () => iso.setAttribute("viewBox", mq.matches ? iso.dataset.vbTight : iso.dataset.vb);
    fit();
    mq.addEventListener("change", fit);
  }
  if (iso && !reduceMotion && "animate" in Element.prototype) {
    const els = $$("line, polyline, polygon, circle", iso).filter((el) => !el.classList.contains("fp"));
    iso.classList.add("drawing");
    els.forEach((el, i) => {
      let len = 0;
      try { len = el.getTotalLength(); } catch (_) { return; }
      if (!len) return;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      const a = el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 650, delay: 80 + i * 6, easing: "cubic-bezier(.3,.6,.2,1)", fill: "forwards" });
      a.onfinish = () => { el.style.strokeDasharray = ""; el.style.strokeDashoffset = ""; a.cancel(); };
    });
  }

  /* ---------- photos: show a placeholder until a real file loads ---------- */
  $$(".shot img").forEach((img) => {
    const fig = img.closest(".shot");
    const ok = () => fig.classList.add("loaded");
    if (img.complete && img.naturalWidth > 0) ok();
    else img.addEventListener("load", ok, { once: true });
  });

  /* ---------- quote list ---------- */
  const STORE = "312stages-quote-list";
  const list = new Map(); // key -> { label, qty, sqft }
  const qtyRows = $$(".qty");
  const tray = $("#tray"), traySum = $("#tray-sum");
  const picked = $("#picked"), pickedList = $("#picked-list"), listField = $("#f-list");
  const fmt = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify([...list].map(([k, v]) => [k, v.qty]))); } catch (_) {}
  }
  function totals() {
    let pieces = 0, sqft = 0;
    list.forEach((v) => { pieces += v.qty; sqft += v.qty * v.sqft; });
    return { pieces, sqft };
  }
  function listText() {
    return [...list.values()].map((v) => `${v.qty} × ${v.label}`).join("\n");
  }
  function render() {
    const { pieces, sqft } = totals();
    qtyRows.forEach((row) => {
      const q = list.get(row.dataset.key)?.qty || 0;
      const input = $("input", row);
      if (document.activeElement !== input) input.value = q;
      row.classList.toggle("has", q > 0);
    });
    const has = pieces > 0;
    tray.hidden = !has;
    document.body.classList.toggle("has-tray", has);
    traySum.textContent = has
      ? `${pieces} ${pieces === 1 ? "piece" : "pieces"}${sqft ? ` · ${fmt(sqft)} sq ft of deck` : ""}`
      : "";
    picked.hidden = !has;
    pickedList.innerHTML = "";
    list.forEach((v) => {
      const li = document.createElement("li");
      li.innerHTML = `<span></span><span class="q"></span>`;
      li.firstChild.textContent = v.label;
      li.lastChild.textContent = "× " + v.qty;
      pickedList.appendChild(li);
    });
    if (has && sqft) {
      const li = document.createElement("li");
      li.className = "tot";
      li.textContent = `About ${fmt(sqft)} sq ft of deck`;
      pickedList.appendChild(li);
    }
    listField.value = listText();
  }
  function setQty(row, q) {
    const max = parseInt($("input", row).max, 10) || 99;
    q = Math.max(0, Math.min(max, Number.isFinite(q) ? Math.round(q) : 0));
    const key = row.dataset.key;
    if (q === 0) list.delete(key);
    else list.set(key, { label: row.dataset.label, qty: q, sqft: parseFloat(row.dataset.sqft) || 0 });
    save(); render();
  }
  qtyRows.forEach((row) => {
    const input = $("input", row);
    $$(".step", row).forEach((b) => b.addEventListener("click", () => {
      setQty(row, (parseInt(input.value, 10) || 0) + Number(b.dataset.d));
    }));
    input.addEventListener("change", () => setQty(row, parseInt(input.value, 10)));
    input.addEventListener("focus", () => input.select());
  });
  $("#tray-clear").addEventListener("click", () => { list.clear(); save(); render(); });

  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "[]");
    saved.forEach(([k, q]) => {
      const row = qtyRows.find((r) => r.dataset.key === k);
      if (row && q > 0) list.set(k, { label: row.dataset.label, qty: q, sqft: parseFloat(row.dataset.sqft) || 0 });
    });
  } catch (_) {}
  render();

  // keep the tray out of the way while the form is on screen
  const quoteSec = $("#quote");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => tray.classList.toggle("away", e.isIntersecting), { threshold: 0.05 }).observe(quoteSec);
  }

  /* ---------- stage size hint ---------- */
  const fw = $("#f-w"), fd = $("#f-d"), hint = $("#size-hint");
  function sizeHint() {
    const w = parseFloat(fw.value), d = parseFloat(fd.value);
    if (!(w > 0 && d > 0)) { hint.textContent = ""; return; }
    const area = w * d, decks = Math.ceil(area / 32);
    hint.textContent = `${fmt(area)} sq ft · roughly ${decks} × 4′×8′ decks. We'll work out the real layout.`;
  }
  fw.addEventListener("input", sizeHint);
  fd.addEventListener("input", sizeHint);

  /* ---------- quote form ---------- */
  const form = $("#quote-form"), status = $("#form-status");
  const val = (name) => (form.elements[name]?.value || "").trim();
  const radio = (name) => (form.querySelector(`input[name="${name}"]:checked`)?.value || "");
  const extras = () => $$('input[name="extras"]:checked', form).map((c) => c.value).join(", ");

  function fieldError(input, msg) {
    const field = input.closest(".field");
    field.classList.add("err");
    input.setAttribute("aria-invalid", "true");
    let m = $(".err-msg", field);
    if (!m) { m = document.createElement("p"); m.className = "err-msg"; m.id = input.id + "-err"; field.appendChild(m); }
    m.textContent = msg;
    input.setAttribute("aria-describedby", m.id);
  }
  function clearError(input) {
    const field = input.closest(".field");
    field.classList.remove("err");
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
    $(".err-msg", field)?.remove();
  }
  ["f-name", "f-email"].forEach((id) => $("#" + id).addEventListener("input", (e) => clearError(e.target)));

  function validate() {
    const bad = [];
    const name = $("#f-name"), email = $("#f-email");
    if (!name.value.trim()) { fieldError(name, "Add your name."); bad.push(name); }
    if (!email.value.trim()) { fieldError(email, "Add an email so we can reply."); bad.push(email); }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { fieldError(email, "That email doesn't look right."); bad.push(email); }
    if (bad.length) bad[0].focus();
    return !bad.length;
  }

  function summary() {
    const w = val("stage_width_ft"), d = val("stage_depth_ft"), h = val("stage_height_in");
    return [
      ["Name", val("name")],
      ["Company", val("company")],
      ["Email", val("email")],
      ["Phone", val("phone")],
      ["Event dates", val("event_dates")],
      ["Venue / city", val("venue")],
      ["Setting", radio("setting")],
      ["Floor", radio("floor")],
      ["Stage size", w || d ? `${w || "?"} ft wide × ${d || "?"} ft deep` : ""],
      ["Finished height", h ? `${h} in` : ""],
      ["Also need", extras()],
      ["Inventory list", listText()],
      ["Notes", val("message")],
    ].filter(([, v]) => v);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.elements.botcheck.checked) return;
    if (!validate()) { status.className = "status bad"; status.textContent = "Check the highlighted fields."; return; }

    const rows = summary();
    const subject = `Quote request: ${val("name")}${val("event_dates") ? " · " + val("event_dates") : ""}`;

    if (SITE.preview) {
      status.className = "status ok";
      status.textContent = `Preview only, nothing was sent. On the live site this request goes to ${SITE.email}:\n\n`
        + rows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ", ")}`).join("\n");
      return;
    }
    if (!SITE.web3formsKey) {
      const body = rows.map(([k, v]) => `${k}: ${v.includes("\n") ? "\n" + v : v}`).join("\n");
      location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.className = "status";
      status.textContent = `Your email app should open with the request filled in. If it doesn't, write to ${SITE.email}.`;
      return;
    }

    const btn = $('button[type="submit"]', form);
    btn.disabled = true; btn.textContent = "Sending…";
    status.className = "status"; status.textContent = "";
    const payload = { access_key: SITE.web3formsKey, subject, from_name: "312stages.com", replyto: val("email"), email: val("email") };
    rows.forEach(([k, v]) => { if (k !== "Email") payload[k] = v; });
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.success === false) throw new Error(out.body?.message || out.message || res.statusText);
      form.classList.add("sent");
      status.className = "status ok";
      status.textContent = `Thanks, ${val("name").split(" ")[0]}. Your request is in. We'll reply to ${val("email")}.`;
      list.clear(); save(); render();
    } catch (err) {
      status.className = "status bad";
      status.textContent = `That didn't send. Please email ${SITE.email} instead.`;
      btn.disabled = false; btn.textContent = "Send request";
    }
  });
})();
