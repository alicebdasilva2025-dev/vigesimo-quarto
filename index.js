const SESSION_COOKIE = "lidire_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100000;
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        console.error("LiDire API error:", error);
        return Response.json(
          {
            error: "internal_error",
            message: "Não foi possível concluir a solicitação."
          },
          { status: 500 }
        );
      }
    }

    // Dedicated share pages keep social crawlers away from the SPA shell.
    // WhatsApp/Facebook receive a small, static HTML document with absolute
    // OG image URLs; normal users can continue into the real invitation flow.
    if (url.pathname === "/convite") {
      return buildSharePage(url, "invite");
    }
    if (url.pathname === "/divulgacao") {
      return buildSharePage(url, "promo");
    }

    // Explicit image routes make social previews reliable on Cloudflare Workers.
    // Some crawlers do not treat an asset served through the generic fallback
    // exactly like a direct image response.
    if (url.pathname === "/lidire-social-preview.png" || url.pathname === "/lidire-invite-preview.png") {
      const imageResponse = await env.ASSETS.fetch(new Request(new URL(url.pathname, url.origin), request));
      const headers = new Headers(imageResponse.headers);
      headers.set("Content-Type", "image/png");
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(imageResponse.body, {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        headers
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);

    // Keep the root URL usable for the app itself. Social crawlers for
    // invitations should use /convite?token=..., which has a dedicated page.
    const contentType = assetResponse.headers.get("content-type") || "";
    if (url.pathname === "/" && contentType.includes("text/html")) {
      const html = await assetResponse.text();
      const imagePath = "/lidire-social-preview.png";
      const title = "LiDire — Seu Copiloto para a Vida";
      const description = "Organize sua rotina, compartilhe o que importa e viva melhor com a LiDire.";
      const canonicalUrl = `${url.origin}/`;
      const absoluteImage = `${url.origin}${imagePath}`;
      let body = html.replaceAll("__LIDIRE_ORIGIN__", url.origin);
      body = body.replaceAll("__LIDIRE_SOCIAL_TITLE__", escapeHtml(title));
      body = body.replaceAll("__LIDIRE_SOCIAL_DESCRIPTION__", escapeHtml(description));
      body = body.replaceAll("__LIDIRE_SOCIAL_URL__", escapeHtml(canonicalUrl));
      body = body.replaceAll("__LIDIRE_SOCIAL_IMAGE__", escapeHtml(absoluteImage));
      const headers = new Headers(assetResponse.headers);
      headers.delete("content-length");
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      return new Response(body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers
      });
    }

    return assetResponse;
  }
};

function buildSharePage(url, type) {
  const token = type === "invite" ? (url.searchParams.get("token") || "") : "";
  const isInvite = type === "invite";
  const inviteLanguage = "pt-BR";
  const isEnglish = false;
  const title = isInvite
    ? (isEnglish ? "You received an invitation to LiDire 💜" : "Você recebeu um convite para a LiDire 💜")
    : "LiDire — Seu Copiloto para a Vida";
  const description = isInvite
    ? (isEnglish ? "Join my family on LiDire and share what matters." : "Venha fazer parte da minha família na LiDire e compartilhar o que importa.")
    : "Organize sua rotina, compartilhe o que importa e viva melhor com a LiDire.";
  const imagePath = isInvite ? "/lidire-invite-preview.png" : "/lidire-social-preview.png";
  const absoluteImage = `${url.origin}${imagePath}`;
  const destination = isInvite && token
    ? `${url.origin}/?convite=${encodeURIComponent(token)}`
    : `${url.origin}/`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url.href);
  const safeImage = escapeHtml(absoluteImage);
  const safeDestination = escapeHtml(destination);
  const html = `<!doctype html>
<html lang="${inviteLanguage}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="LiDire">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${safeUrl}">
<meta property="og:image" content="${safeImage}">
<meta property="og:image:secure_url" content="${safeImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${safeTitle}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImage}">
<style>
html,body{margin:0;min-height:100%;background:#070c22;color:#fff;font-family:Arial,Helvetica,sans-serif}
main{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box}
.card{width:min(560px,100%);padding:32px;border:1px solid rgba(132,95,255,.28);border-radius:28px;background:linear-gradient(145deg,#11183b,#17133b);box-shadow:0 24px 80px rgba(0,0,0,.35);text-align:center;box-sizing:border-box}
img{display:block;width:100%;max-width:500px;height:auto;aspect-ratio:1200/630;object-fit:cover;margin:0 auto 24px;border-radius:18px;border:1px solid rgba(132,95,255,.28);box-shadow:0 18px 45px rgba(0,0,0,.28)}.eyebrow{font-size:12px;letter-spacing:.18em;color:#9da7d0;font-weight:700}.title{font-size:30px;line-height:1.15;margin:14px 0}.text{font-size:17px;line-height:1.55;color:#b8bfd9}.button{display:inline-block;margin-top:18px;padding:14px 22px;border-radius:14px;text-decoration:none;color:#fff;font-weight:700;background:linear-gradient(90deg,#7652f6,#4e83ff)}
</style>
</head>
<body><main><section class="card">
<img src="${safeImage}" alt="LiDire">
<div class="eyebrow">${isInvite ? (isEnglish ? "FAMILY INVITATION" : "CONVITE FAMILIAR") : "LIDIRE"}</div>
<div class="title">${safeTitle}</div>
<div class="text">${safeDescription}</div>
<a class="button" href="${safeDestination}">${isInvite ? (isEnglish ? "Continue to LiDire" : "Continuar para a LiDire") : (isEnglish ? "Explore LiDire" : "Conhecer a LiDire")}</a>
</section></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff"
    }
  });
}


function decodeInviteLanguage(token) { return "pt-BR"; }

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function handleApi(request, env, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return Response.json({
      ok: true,
      app: "LiDire VIGÉSIMO QUINTO",
      database: !!env.DB
    });
  }

  if (!env.DB) {
    return Response.json(
      { error: "database_unavailable", message: "Banco D1 não configurado." },
      { status: 503 }
    );
  }

  if (url.pathname === "/api/register" && request.method === "POST") {
    return register(request, env);
  }

  if (url.pathname === "/api/login/challenge" && request.method === "POST") {
    return loginChallenge(request, env);
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    return login(request, env);
  }

  if (url.pathname === "/api/logout" && request.method === "POST") {
    return logout(request, env);
  }

  if (url.pathname === "/api/connections" && request.method === "GET") {
    return listConnections(request, env);
  }

  if (url.pathname === "/api/connections/google" && request.method === "POST") {
    return connectGoogle(request, env);
  }

  if (url.pathname === "/api/connections/apple/start" && request.method === "GET") {
    return startAppleConnection(request, env, url);
  }

  if (url.pathname === "/api/connections/apple/callback" && request.method === "POST") {
    return appleConnectionCallback(request, env, url);
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    const user = await getSessionUser(request, env);
    return Response.json({ user, database: true });
  }

  if (url.pathname === "/api/profile" && request.method === "GET") {
    const user = await getSessionUser(request, env);
    return Response.json({ user, database: true });
  }

  if (url.pathname === "/api/family" && request.method === "GET") {
    return listFamily(request, env);
  }

  if (url.pathname === "/api/family/check-email" && request.method === "GET") {
    return checkFamilyEmail(request, env, url);
  }

  if (url.pathname === "/api/family/members" && request.method === "POST") {
    return createFamilyMember(request, env);
  }

  if (url.pathname.startsWith("/api/family/members/") && request.method === "PUT") {
    return updateFamilyMember(request, env, url);
  }

  if (url.pathname.startsWith("/api/family/members/") && request.method === "DELETE") {
    return deleteFamilyMember(request, env, url);
  }

  if (url.pathname === "/api/family/notifications" && request.method === "POST") {
    return sendFamilyNotification(request, env);
  }

  if (url.pathname === "/api/cycle/periods" && request.method === "GET") {
    return listCyclePeriods(request, env);
  }

  if (url.pathname === "/api/cycle/periods" && request.method === "POST") {
    return createCyclePeriod(request, env);
  }

  if (url.pathname.startsWith("/api/cycle/periods/") && request.method === "PUT") {
    return updateCyclePeriod(request, env, url);
  }

  if (url.pathname.startsWith("/api/cycle/periods/") && request.method === "DELETE") {
    return deleteCyclePeriod(request, env, url);
  }

  if (url.pathname === "/api/notes" && request.method === "GET") {
    return listNotes(request, env);
  }

  if (url.pathname === "/api/notes" && request.method === "POST") {
    return createNote(request, env);
  }

  if (url.pathname.startsWith("/api/notes/") && request.method === "PUT") {
    return updateNote(request, env, url);
  }

  if (url.pathname.startsWith("/api/notes/") && request.method === "DELETE") {
    return deleteNote(request, env, url);
  }

  if (url.pathname === "/api/notifications" && request.method === "GET") {
    return listNotifications(request, env, url);
  }

  if (url.pathname.startsWith("/api/notifications/") && request.method === "POST") {
    return markNotificationRead(request, env, url);
  }

  if (url.pathname === "/api/routes" && request.method === "POST") {
    return calculateRoute(request, env);
  }

  if (url.pathname === "/api/ai/assistant" && request.method === "POST") {
    return assistantAI(request, env);
  }

  if (url.pathname === "/api/profile" && request.method === "PUT") {
    return updateProfile(request, env);
  }

  if (url.pathname === "/api/password-reset/request" && request.method === "POST") {
    return requestPasswordReset(request, env);
  }

  if (url.pathname === "/api/password-reset/complete" && request.method === "POST") {
    return completePasswordReset(request, env);
  }

  if (url.pathname === "/api/account" && request.method === "DELETE") {
    return deleteAccount(request, env);
  }

  return Response.json(
    {
      error: "not_found",
      message: "Endpoint não implementado.",
      path: url.pathname
    },
    { status: 404 }
  );
}


async function ensureFamilyFeatureTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS family_groups (id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS family_members (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, user_id TEXT, name TEXT, relation TEXT, email TEXT, address TEXT, role TEXT DEFAULT 'member', status TEXT DEFAULT 'pending', permissions_json TEXT DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  const addColumn = async (table, column, definition) => {
    const info = await db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = (info.results || []).some(x => x.name === column);
    if (!exists) await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  };
  // Migração compatível com o schema 1.0/1.3, que já pode ter criado
  // family_groups/family_members com menos colunas.
  await addColumn("family_groups", "created_at", "TEXT");
  await addColumn("family_members", "name", "TEXT");
  await addColumn("family_members", "relation", "TEXT");
  await addColumn("family_members", "address", "TEXT");
  await addColumn("family_members", "permissions_json", "TEXT DEFAULT '{}'");
  await addColumn("family_members", "created_at", "TEXT");
  await addColumn("family_members", "updated_at", "TEXT");

  // SQLite/D1 não permite adicionar uma coluna via ALTER TABLE com
  // DEFAULT CURRENT_TIMESTAMP. As colunas acima são adicionadas sem
  // default para manter a migração compatível com bancos antigos.
  // Preenchemos os registros antigos depois da migração.
  await db.prepare(`UPDATE family_groups SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL`).run();
  await db.prepare(`UPDATE family_members SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL`).run();
  await db.prepare(`UPDATE family_members SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL`).run();

  await db.prepare(`CREATE TABLE IF NOT EXISTS family_notifications (id TEXT PRIMARY KEY, sender_user_id TEXT NOT NULL, recipient_user_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, read_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_family_notifications_recipient ON family_notifications(recipient_user_id, created_at)`).run();
}

async function requireUser(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return null;
  await ensureFamilyFeatureTables(env.DB);
  return user;
}

async function ensureUserFamilyGroup(db, userId) {
  let group = await db.prepare(`SELECT id, name FROM family_groups WHERE owner_user_id = ? ORDER BY created_at LIMIT 1`).bind(userId).first();
  if (!group) {
    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO family_groups (id, owner_user_id, name) VALUES (?, ?, ?)`).bind(id, userId, "Minha família").run();
    group = { id, name: "Minha família" };
  }
  return group;
}

function safeJson(value, fallback = {}) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}

async function listFamily(request, env) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const group = await ensureUserFamilyGroup(env.DB, user.id);
  const rows = await env.DB.prepare(`SELECT id, user_id, name, relation, email, address, role, status, permissions_json, created_at, updated_at FROM family_members WHERE group_id = ? ORDER BY created_at`).bind(group.id).all();
  return Response.json({ ok: true, group, members: (rows.results || []).map(x => ({ ...x, permissions: safeJson(x.permissions_json, {}) })) });
}

async function checkFamilyEmail(request, env, url) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });

  const email = normalizeEmail(url.searchParams.get("email") || "");
  if (!isValidEmail(email)) {
    return Response.json({ error: "invalid_email", message: "Informe um e-mail válido." }, { status: 400 });
  }

  const group = await ensureUserFamilyGroup(env.DB, user.id);
  const familyMember = await env.DB.prepare(
    `SELECT id, user_id, name, relation, email, status FROM family_members WHERE group_id = ? AND lower(email) = lower(?) LIMIT 1`
  ).bind(group.id, email).first();

  const account = await env.DB.prepare(
    `SELECT id, name, email FROM users WHERE lower(email) = lower(?) LIMIT 1`
  ).bind(email).first();

  return Response.json({
    ok: true,
    email,
    alreadyFamilyMember: !!familyMember,
    familyMember: familyMember || null,
    accountExists: !!account,
    account: account ? { id: account.id, name: account.name, email: account.email } : null,
    status: familyMember?.status || (account ? "registered" : "not_registered")
  });
}

async function createFamilyMember(request, env) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  const relation = String(body.relation || "Membro").trim();
  const email = normalizeEmail(body.email || "");
  const address = String(body.address || "").trim();
  const permissions = body.permissions && typeof body.permissions === "object" ? body.permissions : {};
  if (name.length < 2 || !isValidEmail(email)) return Response.json({ error: "invalid_member", message: "Informe nome e e-mail válidos." }, { status: 400 });
  const group = await ensureUserFamilyGroup(env.DB, user.id);
  const existing = await env.DB.prepare(`SELECT id FROM family_members WHERE group_id = ? AND lower(email) = lower(?) LIMIT 1`).bind(group.id, email).first();
  if (existing) return Response.json({ error: "member_exists", message: "Esse familiar já está cadastrado." }, { status: 409 });
  const account = await env.DB.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`).bind(email).first();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO family_members (id, group_id, user_id, name, relation, email, address, role, status, permissions_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'member', ?, ?, CURRENT_TIMESTAMP)`).bind(id, group.id, account?.id || null, name, relation, email, address, account ? "active" : "pending", JSON.stringify(permissions)).run();
  return Response.json({ ok: true, member: { id, group_id: group.id, user_id: account?.id || null, name, relation, email, address, status: account ? "active" : "pending", permissions } });
}

async function updateFamilyMember(request, env, url) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const group = await ensureUserFamilyGroup(env.DB, user.id);
  const existing = await env.DB.prepare(`SELECT * FROM family_members WHERE id = ? AND group_id = ? LIMIT 1`).bind(id, group.id).first();
  if (!existing) return Response.json({ error: "not_found", message: "Membro não encontrado." }, { status: 404 });
  const body = await readJson(request);
  const name = String(body.name ?? existing.name ?? "").trim();
  const relation = String(body.relation ?? existing.relation ?? "Membro").trim();
  const email = normalizeEmail(body.email ?? existing.email ?? "");
  const address = String(body.address ?? existing.address ?? "").trim();
  const permissions = body.permissions && typeof body.permissions === "object" ? body.permissions : safeJson(existing.permissions_json, {});
  if (name.length < 2 || !isValidEmail(email)) return Response.json({ error: "invalid_member", message: "Informe nome e e-mail válidos." }, { status: 400 });
  const account = await env.DB.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`).bind(email).first();
  await env.DB.prepare(`UPDATE family_members SET user_id = ?, name = ?, relation = ?, email = ?, address = ?, status = ?, permissions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND group_id = ?`).bind(account?.id || existing.user_id || null, name, relation, email, address, account || existing.status === "active" ? "active" : "pending", JSON.stringify(permissions), id, group.id).run();
  return Response.json({ ok: true, member: { id, user_id: account?.id || existing.user_id || null, name, relation, email, address, status: account || existing.status === "active" ? "active" : "pending", permissions } });
}

async function deleteFamilyMember(request, env, url) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const group = await ensureUserFamilyGroup(env.DB, user.id);
  await env.DB.prepare(`DELETE FROM family_members WHERE id = ? AND group_id = ?`).bind(id, group.id).run();
  return Response.json({ ok: true });
}

async function sendFamilyNotification(request, env) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const body = await readJson(request);
  const group = await ensureUserFamilyGroup(env.DB, user.id);
  let member = null;
  if (body.memberId) member = await env.DB.prepare(`SELECT * FROM family_members WHERE id = ? AND group_id = ? LIMIT 1`).bind(String(body.memberId), group.id).first();
  if (!member && body.recipientEmail) member = await env.DB.prepare(`SELECT * FROM family_members WHERE group_id = ? AND lower(email) = lower(?) LIMIT 1`).bind(group.id, normalizeEmail(body.recipientEmail)).first();
  if (!member) return Response.json({ error: "member_not_found", message: "Não encontrei esse membro da família." }, { status: 404 });
  let recipientId = member.user_id;
  if (!recipientId && member.email) {
    const account = await env.DB.prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`).bind(normalizeEmail(member.email)).first();
    recipientId = account?.id || null;
    if (recipientId) await env.DB.prepare(`UPDATE family_members SET user_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(recipientId, member.id).run();
  }
  if (!recipientId) return Response.json({ error: "recipient_not_registered", message: "Esse familiar ainda não criou uma conta LiDire com esse e-mail." }, { status: 409 });
  const title = String(body.title || "LiDire — Família").trim().slice(0, 120);
  const message = String(body.message || "Você recebeu uma atualização da sua família na LiDire.").trim().slice(0, 1000);
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO family_notifications (id, sender_user_id, recipient_user_id, title, message) VALUES (?, ?, ?, ?, ?)`).bind(id, user.id, recipientId, title, message).run();
  return Response.json({ ok: true, notification: { id, recipientId, title, message } });
}

async function listNotifications(request, env, url) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const rows = await env.DB.prepare(`SELECT id, sender_user_id, title, message, read_at, created_at FROM family_notifications WHERE recipient_user_id = ? ORDER BY created_at DESC LIMIT ${limit}`).bind(user.id).all();
  return Response.json({ ok: true, notifications: rows.results || [] });
}

async function markNotificationRead(request, env, url) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  await env.DB.prepare(`UPDATE family_notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_user_id = ?`).bind(id, user.id).run();
  return Response.json({ ok: true });
}

async function ensureCyclePeriodsTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS menstrual_cycles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT '',
      flow TEXT DEFAULT 'Moderado',
      duration INTEGER,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const info = await db.prepare(`PRAGMA table_info(menstrual_cycles)`).all();
  const columns = new Set((info.results || []).map(row => String(row.name)));
  const additions = [
    ["end_date", "TEXT DEFAULT ''"],
    ["flow", "TEXT DEFAULT 'Moderado'"],
    ["duration", "INTEGER"],
    ["notes", "TEXT DEFAULT ''"],
    ["created_at", "TEXT DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "TEXT DEFAULT CURRENT_TIMESTAMP"]
  ];
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      await db.prepare(`ALTER TABLE menstrual_cycles ADD COLUMN ${name} ${definition}`).run();
    }
  }
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_menstrual_cycles_user_start ON menstrual_cycles(user_id, start_date DESC)`).run();
}

function normalizeCyclePeriod(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    start: row.start_date || "",
    end: row.end_date || "",
    flow: row.flow || "Moderado",
    duration: row.duration ?? "",
    notes: row.notes || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

function cycleDuration(start, end) {
  if (!start || !end) return null;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  const value = Math.round((b - a) / 86400000) + 1;
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function listCyclePeriods(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureCyclePeriodsTable(env.DB);
  const rows = await env.DB.prepare(`SELECT id, user_id, start_date, end_date, flow, duration, notes, created_at, updated_at FROM menstrual_cycles WHERE user_id = ? ORDER BY start_date DESC, created_at DESC`).bind(user.id).all();
  return Response.json({ ok: true, periods: (rows.results || []).map(normalizeCyclePeriod) });
}

async function createCyclePeriod(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Sua sessão expirou. Entre novamente na LiDire." }, { status: 401 });
  try {
    await ensureCyclePeriodsTable(env.DB);
  } catch (error) {
    console.error("Erro ao preparar menstrual_cycles:", error);
    return Response.json({ error: "cycle_table_error", message: "Não foi possível preparar o armazenamento do ciclo no D1." }, { status: 500 });
  }
  const body = await readJson(request);
  const start = String(body.start || "").trim();
  const end = String(body.end || "").trim();
  const flow = String(body.flow || "Moderado").trim().slice(0, 30) || "Moderado";
  const notes = String(body.notes || "").trim().slice(0, 2000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return Response.json({ error: "invalid_start", message: "Informe uma data válida para o início da menstruação." }, { status: 400 });
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return Response.json({ error: "invalid_end", message: "Informe uma data válida para o fim da menstruação." }, { status: 400 });
  if (end && end < start) return Response.json({ error: "invalid_range", message: "A data de fim não pode ser anterior ao início." }, { status: 400 });
  const id = crypto.randomUUID();
  const duration = cycleDuration(start, end);
  await env.DB.prepare(`INSERT INTO menstrual_cycles (id, user_id, start_date, end_date, flow, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, start, end, flow, duration, notes).run();
  const row = await env.DB.prepare(`SELECT id, user_id, start_date, end_date, flow, duration, notes, created_at, updated_at FROM menstrual_cycles WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
  return Response.json({ ok: true, period: normalizeCyclePeriod(row) });
}

async function updateCyclePeriod(request, env, url) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureCyclePeriodsTable(env.DB);
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const existing = await env.DB.prepare(`SELECT * FROM menstrual_cycles WHERE id = ? AND user_id = ? LIMIT 1`).bind(id, user.id).first();
  if (!existing) return Response.json({ error: "not_found", message: "Registro de ciclo não encontrado." }, { status: 404 });
  const body = await readJson(request);
  const start = String(body.start ?? existing.start_date ?? "").trim();
  const end = String(body.end ?? existing.end_date ?? "").trim();
  const flow = String(body.flow ?? existing.flow ?? "Moderado").trim().slice(0, 30) || "Moderado";
  const notes = String(body.notes ?? existing.notes ?? "").trim().slice(0, 2000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return Response.json({ error: "invalid_start", message: "Informe uma data válida para o início da menstruação." }, { status: 400 });
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return Response.json({ error: "invalid_end", message: "Informe uma data válida para o fim da menstruação." }, { status: 400 });
  if (end && end < start) return Response.json({ error: "invalid_range", message: "A data de fim não pode ser anterior ao início." }, { status: 400 });
  await env.DB.prepare(`UPDATE menstrual_cycles SET start_date = ?, end_date = ?, flow = ?, duration = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).bind(start, end, flow, cycleDuration(start, end), notes, id, user.id).run();
  const row = await env.DB.prepare(`SELECT id, user_id, start_date, end_date, flow, duration, notes, created_at, updated_at FROM menstrual_cycles WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
  return Response.json({ ok: true, period: normalizeCyclePeriod(row) });
}

async function deleteCyclePeriod(request, env, url) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureCyclePeriodsTable(env.DB);
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const result = await env.DB.prepare(`DELETE FROM menstrual_cycles WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  if (!result.meta?.changes) return Response.json({ error: "not_found", message: "Registro de ciclo não encontrado." }, { status: 404 });
  return Response.json({ ok: true });
}

async function ensureNotesTable(db) {
  // A tabela pode já existir em versões anteriores da LiDire com menos
  // colunas. Por isso fazemos uma migração incremental e idempotente aqui,
  // em vez de depender somente de CREATE TABLE IF NOT EXISTS.
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'Geral',
      tags TEXT DEFAULT '',
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const info = await db.prepare(`PRAGMA table_info(notes)`).all();
  const columns = new Set((info.results || []).map(row => String(row.name)));
  const addColumn = async (name, definition) => {
    if (!columns.has(name)) {
      await db.prepare(`ALTER TABLE notes ADD COLUMN ${name} ${definition}`).run();
      columns.add(name);
    }
  };

  // Colunas opcionais introduzidas pelo bloco de notas funcional.
  await addColumn("category", "TEXT DEFAULT 'Geral'");
  await addColumn("tags", "TEXT DEFAULT ''");
  await addColumn("is_favorite", "INTEGER DEFAULT 0");
  await addColumn("created_at", "TEXT");
  await addColumn("updated_at", "TEXT");

  // Preenche registros antigos que receberam as colunas sem DEFAULT.
  await db.prepare(`UPDATE notes SET category = COALESCE(category, 'Geral') WHERE category IS NULL OR category = ''`).run();
  await db.prepare(`UPDATE notes SET tags = COALESCE(tags, '') WHERE tags IS NULL`).run();
  await db.prepare(`UPDATE notes SET is_favorite = COALESCE(is_favorite, 0) WHERE is_favorite IS NULL`).run();
  await db.prepare(`UPDATE notes SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL`).run();
  await db.prepare(`UPDATE notes SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL`).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notes_user_category ON notes(user_id, category)`).run();
}

function normalizeNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title || "",
    content: row.content || "",
    category: row.category || "Geral",
    tags: row.tags || "",
    is_favorite: !!row.is_favorite,
    created_at: row.created_at || "",
    updated_at: row.updated_at || row.created_at || ""
  };
}

async function listNotes(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureNotesTable(env.DB);
  const rows = await env.DB.prepare(`SELECT id, user_id, title, content, category, tags, is_favorite, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY is_favorite DESC, updated_at DESC`).bind(user.id).all();
  return Response.json({ ok: true, notes: (rows.results || []).map(normalizeNote) });
}

async function createNote(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureNotesTable(env.DB);
  const body = await readJson(request);
  const title = String(body.title || "").trim().slice(0, 120);
  const content = String(body.content || "").trim().slice(0, 12000);
  const category = String(body.category || "Geral").trim().slice(0, 60) || "Geral";
  const tags = String(body.tags || "").trim().slice(0, 300);
  const favorite = body.is_favorite === true || body.is_favorite === 1 || body.is_favorite === "true";
  if (!title || !content) return Response.json({ error: "invalid_note", message: "Informe título e conteúdo da anotação." }, { status: 400 });
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO notes (id, user_id, title, content, category, tags, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, title, content, category, tags, favorite ? 1 : 0).run();
  const row = await env.DB.prepare(`SELECT id, user_id, title, content, category, tags, is_favorite, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
  return Response.json({ ok: true, note: normalizeNote(row) });
}

async function updateNote(request, env, url) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureNotesTable(env.DB);
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const existing = await env.DB.prepare(`SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1`).bind(id, user.id).first();
  if (!existing) return Response.json({ error: "not_found", message: "Anotação não encontrada." }, { status: 404 });
  const body = await readJson(request);
  const title = String(body.title ?? existing.title ?? "").trim().slice(0, 120);
  const content = String(body.content ?? existing.content ?? "").trim().slice(0, 12000);
  const category = String(body.category ?? existing.category ?? "Geral").trim().slice(0, 60) || "Geral";
  const tags = String(body.tags ?? existing.tags ?? "").trim().slice(0, 300);
  const favorite = body.is_favorite === undefined ? !!existing.is_favorite : (body.is_favorite === true || body.is_favorite === 1 || body.is_favorite === "true");
  if (!title || !content) return Response.json({ error: "invalid_note", message: "Informe título e conteúdo da anotação." }, { status: 400 });
  await env.DB.prepare(`UPDATE notes SET title = ?, content = ?, category = ?, tags = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).bind(title, content, category, tags, favorite ? 1 : 0, id, user.id).run();
  const row = await env.DB.prepare(`SELECT id, user_id, title, content, category, tags, is_favorite, created_at, updated_at FROM notes WHERE id = ? AND user_id = ?`).bind(id, user.id).first();
  return Response.json({ ok: true, note: normalizeNote(row) });
}

async function deleteNote(request, env, url) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  await ensureNotesTable(env.DB);
  const id = decodeURIComponent(url.pathname.split("/").pop() || "");
  const result = await env.DB.prepare(`DELETE FROM notes WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  if (!result.meta?.changes) return Response.json({ error: "not_found", message: "Anotação não encontrada." }, { status: 404 });
  return Response.json({ ok: true });
}

async function calculateRoute(request, env) {
  const user = await requireUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Entre na sua conta." }, { status: 401 });
  const body = await readJson(request);
  const origin = body.origin && typeof body.origin === "object" ? body.origin : { address: String(body.origin || "") };
  const destination = body.destination && typeof body.destination === "object" ? body.destination : { address: String(body.destination || "") };
  const travelMode = String(body.travelMode || "DRIVE").toUpperCase();
  const departureTime = String(body.departureTime || "").trim();
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Response.json({ error: "routes_not_configured", message: "A API de rotas ainda não foi configurada. Adicione GOOGLE_MAPS_API_KEY no Cloudflare." }, { status: 503 });
  const allowed = new Set(["DRIVE","WALK","BICYCLE","TWO_WHEELER","TRANSIT"]);
  if (!allowed.has(travelMode)) return Response.json({ error: "invalid_travel_mode", message: "Meio de transporte inválido." }, { status: 400 });
  const payload = { origin, destination, travelMode, routingPreference: (travelMode === "DRIVE" || travelMode === "TWO_WHEELER") ? (departureTime ? "TRAFFIC_AWARE_OPTIMAL" : "TRAFFIC_AWARE") : undefined, departureTime: departureTime || undefined, computeAlternativeRoutes: false, languageCode: "pt-BR", units: "METRIC" };
  if (!departureTime) delete payload.departureTime;
  if (!payload.routingPreference) delete payload.routingPreference;
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.routes?.length) return Response.json({ error: "route_failed", message: "Não foi possível calcular a rota agora.", details: data?.error?.message || "" }, { status: response.status || 502 });
  const route = data.routes[0];
  return Response.json({ ok: true, duration: route.duration || "", distanceMeters: route.distanceMeters || 0, polyline: route.polyline?.encodedPolyline || "", legs: route.legs || [] });
}

async function assistantAI(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return Response.json({ error: "unauthorized", message: "Entre na sua conta para usar a IA LiDire." }, { status: 401 });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: "ai_not_configured",
      message: "A IA LiDire ainda não foi configurada no servidor. Adicione o segredo GEMINI_API_KEY no Cloudflare."
    }, { status: 503 });
  }

  const body = await readJson(request);
  const question = String(body.question || "").trim().slice(0, 4000);
  if (!question) {
    return Response.json({ error: "invalid_question", message: "Digite uma pergunta para a LiDire." }, { status: 400 });
  }

  const language = "pt-BR";
  const useWeb = body.useWeb === true || body.useWeb === "true" || body.useWeb === 1;
  const context = sanitizeAIContext(body.context, language).slice(0, 14000);
  const history = Array.isArray(body.history) ? body.history.slice(-6).map(item => ({
    role: item?.role === "model" ? "model" : "user",
    text: String(item?.text || "").slice(0, 1200)
  })).filter(item => item.text) : [];

  const model = String(env.GEMINI_MODEL || "gemini-3.5-flash-lite").replace(/^models\//, "");
  // Modelos Flash-Lite têm uma cota gratuita muito maior em muitos projetos.
  // O fallback usa outro modelo Lite se o principal atingir 429.
  const modelCandidates = Array.from(new Set([
    model,
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite"
  ])).slice(0, 3);
  const systemText = `Você é a IA LiDire, o copiloto pessoal de organização dentro do aplicativo LiDire. Responda em português do Brasil.

Sua função NÃO é apenas conversar: quando o usuário pedir para criar, incluir, alterar, registrar ou salvar algo que o próprio aplicativo consegue armazenar, você deve identificar a ação e devolvê-la no campo actions para que o aplicativo a execute. Nunca diga que não pode alterar os dados do aplicativo quando uma das ações abaixo for aplicável.

Ações permitidas:
- create_task: preparar uma tarefa. Campos úteis: title, date (YYYY-MM-DD), time (HH:MM), priority (baixa, normal ou alta). IMPORTANTE: tarefas devem pedir confirmação ao usuário antes de serem gravadas.
- create_reminder: preparar um lembrete. Campos úteis: title, date, time, message, repeat. IMPORTANTE: lembretes devem pedir confirmação ao usuário antes de serem gravados.
- create_appointment: registrar um compromisso SOMENTE em Agenda. Campos: title, date, time, location, address.
- create_study: registrar um estudo SOMENTE em Estudos. Campos: subject, topic, date, time, duration, notes, link. NUNCA transforme pedido de estudo em tarefa.
- create_shopping_list: criar uma lista SOMENTE em Compras. Campos: name, items (array de objetos ou strings com name, quantity).
- create_workout: registrar um treino SOMENTE em Treinos. Campos: name, workoutType, date, time, duration, distance, pace, observations.
- log_hydration: registrar água SOMENTE em Hidratação. Campos: amount (ml), date.
- create_meal: registrar uma refeição SOMENTE em Alimentação. Campos: name, time, date, foods (array com name, quantity, unit, calories).
- create_finance: registrar um lançamento SOMENTE em Finanças. Campos: financeType, title, value, category, date, currency.
- create_goal: criar um objetivo SOMENTE em Objetivos. Campos: title, deadline, progress, moneyGoal, moneyCurrency, financeCategory, observations.
- update_goal_savings: adicionar um valor arrecadado a um objetivo financeiro existente. Campos: title ou targetId, amount, currency. Use esta ação quando o usuário disser que arrecadou, guardou, recebeu ou quer incluir um valor no objetivo. NUNCA altere o objetivo diretamente sem confirmação explícita no aplicativo.
- delete_task: excluir uma tarefa existente por targetId ou title. SEMPRE pedir confirmação no aplicativo.
- delete_reminder: excluir um lembrete existente por targetId ou title. SEMPRE pedir confirmação no aplicativo.
- complete_task: marcar uma tarefa como concluída por targetId ou title. SEMPRE pedir confirmação no aplicativo.
- complete_reminder: marcar um lembrete como concluído por targetId ou title. SEMPRE pedir confirmação no aplicativo.
- upsert_place: cadastrar ou atualizar um lugar frequente com name, address, aliases e notes.
- upsert_food: cadastrar ou atualizar um alimento. Para calorias, use totalCalories + forQuantity + quantityUnit quando o usuário informar calorias para uma quantidade específica. O aplicativo converte isso para kcal por 100 g/ml ou por unidade. Também pode usar caloriesPer100 quando o valor já estiver normalizado.
- create_recipe: salvar uma receita. Campos úteis: name, ingredients, instructions, servings, calories.
- update_food: atualizar um alimento existente. Use os mesmos campos de calorias de upsert_food.
- log_cycle_start: registrar o início/fim da menstruação quando o usuário pedir.
- log_cycle_symptom: registrar humor, dor, cólicas, acne, energia e observações quando o usuário pedir.
- add_family_member: preparar o cadastro de um membro da família com name, relation, email e permissions.
- send_family_notification: enviar uma notificação interna a um membro da família. Use memberId quando disponível ou recipientEmail.
- weather_lookup: consultar temperatura e previsão para uma localização informada. Use location.
- route_lookup: calcular rota e tempo estimado. Use origin, destination e travelMode (DRIVE, WALK, BICYCLE, TWO_WHEELER ou TRANSIT). Se o usuário disser “daqui/de onde estou”, use origin="current_location". Se o usuário informar um horário de chegada, use arrivalTime (HH:MM) e date (YYYY-MM-DD); o aplicativo calcula a hora estimada de saída. Lugares e familiares cadastrados podem ser referenciados pelo nome.

Exemplos importantes:
1) “Adicione 1300 calorias para os 395 gramas de leite condensado” => action upsert_food, name “leite condensado”, totalCalories 1300, forQuantity 395, quantityUnit “g”.
2) “Adicione 450 calorias para 200 ml de creme de leite” => action upsert_food, name “creme de leite”, totalCalories 450, forQuantity 200, quantityUnit “ml”.
3) “Inclua uma tarefa pintar o cabelo hoje às 15 horas” => action create_task.
4) “Me lembre de ligar para minha mãe às 16:30” => action create_reminder.
5) “Salve a receita do brigadeiro de prestígio” => action create_recipe se houver dados suficientes; se faltarem ingredientes ou preparo, faça uma pergunta objetiva e não crie uma receita incompleta.
6) “Cadastre minha menstruação começou hoje” => action log_cycle_start.
7) “Registre que estou com cólica moderada e humor baixo hoje” => action log_cycle_symptom.
8) “Cadastre minha mãe Edna, email edna@example.com” => action add_family_member.
9) “Avise minha mãe que o jantar mudou para 21h” => action send_family_notification quando houver membro correspondente.
10) “Como está o tempo em Nova Iguaçu?” => action weather_lookup.
11) “Quanto tempo levo daqui até a casa da minha mãe?” => action route_lookup com origin current_location e destination conforme endereço disponível; se faltar endereço, pergunte.
12) “Pra chegar à faculdade às 17h de carro, que horas preciso sair de onde estou?” => action route_lookup com origin current_location, destination “faculdade” ou o lugar correspondente, travelMode DRIVE, arrivalTime “17:00” e date conforme o contexto.

Regras:
- Nunca invente dados do usuário.
- Se a data for “hoje”, use o campo today do contexto.
- Se a ação for clara, devolva-a em actions. O aplicativo decide se executa imediatamente ou pede confirmação.
- create_task e create_reminder NUNCA devem ser tratados como execução imediata: sempre exigem confirmação explícita do usuário no aplicativo.
- add_family_member só pode ser executado depois que o aplicativo consultar o D1 para verificar se o e-mail já pertence a um membro da família e se já existe uma conta LiDire. Nunca diga que o membro foi cadastrado antes do retorno positivo do servidor.
- log_cycle_start e log_cycle_symptom podem ser executados quando o pedido for explícito e completo.
- send_family_notification só pode ser usada quando houver um membro correspondente; se não houver, peça o nome/e-mail do destinatário.
- weather_lookup e route_lookup devem usar ferramentas/serviços externos do aplicativo, não invente temperatura, previsão, distância ou duração.
- Quando o usuário pedir "estudo", "estudar", "matéria", "prova", "revisão" ou planejamento de estudo, use create_study, nunca create_task.
- Quando o usuário pedir compra/lista de compras, use create_shopping_list, nunca create_task.
- Quando pedir treino, use create_workout; compromisso/consulta/evento vai para create_appointment; água vai para log_hydration; refeição vai para create_meal; gasto/receita vai para create_finance; meta/objetivo vai para create_goal.
- Quando o usuário disser algo como “inclua 200 arrecadados no meu objetivo de comprar notebook”, use update_goal_savings com amount=200 e o objetivo correspondente. Essa ação sempre exige confirmação explícita no aplicativo. Se houver mais de um objetivo possível, peça esclarecimento em vez de escolher arbitrariamente.
- Se useWeb estiver ativado, use a Pesquisa Google para informações atuais quando ela puder melhorar a resposta e considere as fontes retornadas.
- Se faltar um dado essencial, actions deve ser [] e message deve fazer uma única pergunta objetiva.
- Não alegue envio de WhatsApp, SMS ou e-mail. “Enviar notificação para família” significa uma notificação LiDire entre contas, quando o destinatário tiver uma conta identificada.
- Para atualizar calorias, preserve o alimento existente quando houver correspondência por nome; não crie duplicata desnecessária.
- Responda por meio do JSON solicitado, sem Markdown.

Contexto do usuário:
${context}`;
  const contents = [];
  for (const item of history) {
    contents.push({ role: item.role, parts: [{ text: item.text }] });
  }
  contents.push({ role: "user", parts: [{ text: question }] });

  const actionSchema = {
    type: "OBJECT",
    properties: {
      message: { type: "STRING", description: "Resposta curta em português do Brasil para mostrar ao usuário." },
      actions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", description: "Tipo da ação LiDire" },
            name: { type: "STRING" },
            title: { type: "STRING" },
            date: { type: "STRING" },
            time: { type: "STRING" },
            priority: { type: "STRING" },
            message: { type: "STRING" },
            repeat: { type: "STRING" },
            period: { type: "STRING" },
            topic: { type: "STRING" },
            duration: { type: "NUMBER" },
            notes: { type: "STRING" },
            link: { type: "STRING" },
            location: { type: "STRING" },
            items: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, quantity: { type: "STRING" }, unit: { type: "STRING" }, calories: { type: "NUMBER" } } } },
            foods: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, quantity: { type: "STRING" }, unit: { type: "STRING" }, calories: { type: "NUMBER" } } } },
            amount: { type: "NUMBER" },
            value: { type: "NUMBER" },
            category: { type: "STRING" },
            currency: { type: "STRING" },
            deadline: { type: "STRING" },
            progress: { type: "NUMBER" },
            moneyGoal: { type: "NUMBER" },
            moneyCurrency: { type: "STRING" },
            financeCategory: { type: "STRING" },
            goalTitle: { type: "STRING" },
            workoutType: { type: "STRING" },
            financeType: { type: "STRING" },
            caloriesPer100: { type: "NUMBER" },
            totalCalories: { type: "NUMBER" },
            forQuantity: { type: "NUMBER" },
            quantityUnit: { type: "STRING" },
            ingredients: { type: "ARRAY", items: { type: "STRING" } },
            instructions: { type: "STRING" },
            servings: { type: "NUMBER" },
            calories: { type: "NUMBER" },
            relation: { type: "STRING" },
            email: { type: "STRING" },
            memberId: { type: "STRING" },
            recipientEmail: { type: "STRING" },
            permissions: { type: "ARRAY", items: { type: "STRING" } },
            mood: { type: "STRING" },
            pain: { type: "STRING" },
            cramps: { type: "STRING" },
            acne: { type: "STRING" },
            physicalEnergy: { type: "STRING" },
            mentalEnergy: { type: "STRING" },
            flow: { type: "STRING" },
            origin: { type: "STRING" },
            destination: { type: "STRING" },
            travelMode: { type: "STRING" },
            arrivalTime: { type: "STRING" },
            targetId: { type: "STRING" },
            aliases: { type: "ARRAY", items: { type: "STRING" } },
            address: { type: "STRING" }
          },
          required: ["type"]
        }
      }
    },
    required: ["message", "actions"]
  };

  let response = null;
  let data = {};
  let usedModel = model;

  for (const candidate of modelCandidates) {
    usedModel = candidate;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents,
          ...(useWeb ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1100,
            responseMimeType: "application/json",
            responseSchema: actionSchema
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ]
        }),
        signal: controller.signal
      });
    } catch (error) {
      console.error("Gemini request failed:", error);
      response = new Response(JSON.stringify({ error: { message: error?.name === "AbortError" ? "timeout" : "network error" } }), { status: 504, headers: { "Content-Type": "application/json" } });
    } finally {
      clearTimeout(timeout);
    }

    data = await response.json().catch(() => ({}));
    const providerMessage = String(data?.error?.message || "");
    const isQuota = response.status === 429 || /quota|rate.?limit|resource.?exhausted|too many requests/i.test(providerMessage);
    if (response.ok || !isQuota) break;

    console.warn("Gemini quota reached; trying fallback model:", candidate);
  }

  if (!response?.ok) {
    console.error("Gemini API error:", response?.status, data);
    const providerMessage = String(data?.error?.message || "");
    const status = Number(response?.status || 502);
    let message = "A LiDire IA não conseguiu responder agora. Tente novamente em instantes.";
    let code = "ai_provider_error";

    if (status === 429 || /quota|rate.?limit|resource.?exhausted|too many requests/i.test(providerMessage)) {
      code = "ai_quota_exceeded";
      message = "A LiDire IA atingiu o limite temporário dos modelos gratuitos. Tente novamente mais tarde ou conecte um nível pago no Google AI Studio.";
    } else if (status === 503 || /high demand|overloaded|unavailable/i.test(providerMessage)) {
      code = "ai_temporarily_unavailable";
      message = "A LiDire IA está temporariamente indisponível por alta demanda. Tente novamente em alguns minutos.";
    } else if (status === 401 || status === 403) {
      code = "ai_configuration_error";
      message = "A conexão da LiDire IA precisa ser verificada no servidor.";
    }

    return Response.json({ error: code, message }, { status: status === 429 ? 429 : 502 });
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n").trim();
  if (!rawText) {
    return Response.json({ error: "empty_ai_response", message: "A IA não retornou uma resposta." }, { status: 502 });
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch (_) {
    console.error("Gemini returned invalid structured output:", rawText);
    return Response.json({ error: "invalid_ai_response", message: "A IA retornou uma resposta que não pôde ser processada. Tente novamente." }, { status: 502 });
  }

  const cleanText = cleanAIText(result?.message || "");
  const actions = Array.isArray(result?.actions) ? result.actions.slice(0, 8).map(action => sanitizeAIValue(action)).filter(Boolean) : [];
  const grounding = data?.candidates?.[0]?.groundingMetadata || {};
  const sources = Array.isArray(grounding?.groundingChunks)
    ? grounding.groundingChunks
        .map(chunk => chunk?.web ? { title: String(chunk.web.title || "Fonte"), url: String(chunk.web.uri || "") } : null)
        .filter(x => x?.url)
        .slice(0, 8)
    : [];
  const searchQueries = Array.isArray(grounding?.webSearchQueries) ? grounding.webSearchQueries.map(String).slice(0, 8) : [];
  return Response.json({ ok: true, text: cleanText, actions, model: usedModel, web: useWeb, sources, searchQueries });
}

function cleanAIText(value) {
  let text = String(value ?? "").replace(/\r\n?/g, "\n");
  text = text.replace(/```(?:[a-zA-Z0-9_-]+)?\s*/g, "").replace(/```/g, "");
  text = text.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, "");
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/(?<!\w)\*(.*?)\*(?!\w)/g, "$1");
  text = text.replace(/(?<!\w)_(.*?)_(?!\w)/g, "$1");
  text = text.replace(/^\s*[-*+]\s+/gm, "• ");
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeAIContext(raw, language) {
  const source = raw && typeof raw === "object" ? raw : {};
  const clean = {
    language,
    user: { name: String(source.user?.name || "").slice(0, 80), age: Number(source.user?.age || 0) || "", sex: String(source.user?.sex || "").slice(0, 30), weight: Number(source.user?.weight || 0) || "" },
    hydrationProfile: source.hydrationProfile && typeof source.hydrationProfile === "object" ? sanitizeAIValue(source.hydrationProfile) : {},
    today: String(source.today || "").slice(0, 20),
    agenda: limitAIItems(source.agenda, 40),
    tarefas: limitAIItems(source.tarefas, 60),
    compras: limitAIItems(source.compras, 30),
    estudos: limitAIItems(source.estudos, 40),
    treinos: limitAIItems(source.treinos, 40),
    hidratacao: limitAIItems(source.hidratacao, 30),
    alimentacao: limitAIItems(source.alimentacao, 30),
    financas: limitAIItems(source.financas, 40),
    objetivos: limitAIItems(source.objetivos, 30),
    familia: limitAIItems(source.familia, 20),
    lembretes: limitAIItems(source.lembretes, 30),
    alimentos: limitAIItems(source.alimentos, 80),
    dietas: limitAIItems(source.dietas, 30),
    receitas: limitAIItems(source.receitas, 30)
  };
  // The menstrual-cycle data is deliberately excluded unless the user explicitly
  // enabled its AI context in the LiDire settings.
  if (source.cycleAiContext === true) clean.ciclo = limitAIItems(source.ciclo, 30);
  return JSON.stringify(clean);
}

function limitAIItems(value, max) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map(item => sanitizeAIValue(item)).filter(Boolean);
}

function sanitizeAIValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return String(value).slice(0, 300);
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (["password", "passwordHash", "token", "session", "photo", "profile_photo", "address", "phone"].includes(key)) continue;
    if (typeof val === "string") out[key] = val.slice(0, 300);
    else if (typeof val === "number" || typeof val === "boolean") out[key] = val;
    else if (Array.isArray(val)) out[key] = val.slice(0, 20).map(sanitizeAIValue);
    else if (val && typeof val === "object") out[key] = sanitizeAIValue(val);
  }
  return out;
}

async function ensureAuthTables(db) {
  // Migration defensiva: versões anteriores do MVP tinham uma tabela users
  // sem password_hash/updated_at e algumas instalações ainda não tinham profiles.
  // Sem esta migração, /api/login pode falhar no D1 e a tela fica presa em “Aguarde…”.
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      age INTEGER,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const columns = await db.prepare(`PRAGMA table_info(users)`).all();
  const names = new Set((columns.results || []).map(c => c.name));
  if (!names.has("password_hash")) {
    await db.prepare(`ALTER TABLE users ADD COLUMN password_hash TEXT`).run();
  }
  if (!names.has("updated_at")) {
    await db.prepare(`ALTER TABLE users ADD COLUMN updated_at TEXT`).run();
  }

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      age INTEGER,
      phone TEXT,
      address TEXT,
      profile_photo TEXT,
      currency TEXT DEFAULT 'BRL',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user
    ON user_sessions(user_id)
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS auth_provider_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      email TEXT,
      name TEXT,
      picture_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_subject),
      UNIQUE(user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_provider_user ON auth_provider_accounts(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_provider_lookup ON auth_provider_accounts(provider, provider_subject)`).run();
}

async function listConnections(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Faça login para consultar suas conexões." }, { status: 401 });
  await ensureAuthTables(env.DB);
  const rows = await env.DB.prepare(`SELECT provider FROM auth_provider_accounts WHERE user_id = ?`).bind(user.id).all();
  const connected = new Set((rows.results || []).map(row => String(row.provider)));
  return Response.json({
    google: { configured: !!env.GOOGLE_CLIENT_ID, clientId: env.GOOGLE_CLIENT_ID || "", connected: connected.has("google") },
    apple: { configured: !!(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY), clientId: env.APPLE_CLIENT_ID || "", connected: connected.has("apple") }
  }, { headers: { "Cache-Control": "no-store, private" } });
}

function parseJwtPart(token, index) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const bytes = base64UrlToBytes(parts[index]);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) { return null; }
}

async function fetchJwks(url) {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`jwks_http_${response.status}`);
  return response.json();
}

async function verifyGoogleIdToken(idToken, env) {
  if (!env.GOOGLE_CLIENT_ID) throw new Error("google_not_configured");
  const header = parseJwtPart(idToken, 0);
  const payload = parseJwtPart(idToken, 1);
  const parts = String(idToken || "").split(".");
  if (!header || !payload || parts.length !== 3 || !header.kid || header.alg !== "RS256") throw new Error("invalid_google_token");
  const now = Math.floor(Date.now() / 1000);
  const issuerOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
  const audienceOk = payload.aud === env.GOOGLE_CLIENT_ID;
  if (!issuerOk || !audienceOk || !payload.sub || Number(payload.exp || 0) <= now || payload.email_verified !== true) throw new Error("invalid_google_claims");
  const keys = await fetchJwks("https://www.googleapis.com/oauth2/v3/certs");
  const jwk = (keys.keys || []).find(key => key.kid === header.kid);
  if (!jwk) throw new Error("google_key_not_found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlToBytes(parts[2]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  if (!valid) throw new Error("invalid_google_signature");
  return { subject: String(payload.sub), email: normalizeEmail(payload.email), name: String(payload.name || payload.given_name || ""), picture: String(payload.picture || "") };
}

async function linkProviderAccount(db, user, provider, identity) {
  await ensureAuthTables(db);
  const existingProvider = await db.prepare(`SELECT id, user_id FROM auth_provider_accounts WHERE provider = ? AND provider_subject = ? LIMIT 1`).bind(provider, identity.subject).first();
  if (existingProvider && String(existingProvider.user_id) !== String(user.id)) {
    return { ok: false, status: 409, error: "provider_already_linked", message: `Esta conta ${provider === "google" ? "do Google" : "da Apple"} já está vinculada a outra conta LiDire.` };
  }
  const existingForUser = await db.prepare(`SELECT id, provider_subject FROM auth_provider_accounts WHERE user_id = ? AND provider = ? LIMIT 1`).bind(user.id, provider).first();
  const now = new Date().toISOString();
  if (existingForUser) {
    await db.prepare(`UPDATE auth_provider_accounts SET provider_subject = ?, email = ?, name = ?, picture_url = ?, updated_at = ? WHERE id = ?`)
      .bind(identity.subject, identity.email || null, identity.name || null, identity.picture || null, now, existingForUser.id).run();
  } else {
    await db.prepare(`INSERT INTO auth_provider_accounts (id, user_id, provider, provider_subject, email, name, picture_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), user.id, provider, identity.subject, identity.email || null, identity.name || null, identity.picture || null, now, now).run();
  }
  return { ok: true };
}

async function connectGoogle(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized", message: "Faça login na LiDire antes de conectar o Google." }, { status: 401 });
  try {
    const body = await readJson(request);
    const identity = await verifyGoogleIdToken(String(body.credential || ""), env);
    const result = await linkProviderAccount(env.DB, user, "google", identity);
    if (!result.ok) return Response.json({ error: result.error, message: result.message }, { status: result.status });
    return Response.json({ ok: true, provider: "google", message: "Google Account conectado à LiDire." });
  } catch (error) {
    console.error("LiDire Google connection error:", error);
    const message = String(error?.message || "").includes("not_configured") ? "A integração com o Google ainda não foi configurada no servidor." : "Não foi possível validar a Conta do Google.";
    return Response.json({ error: "google_connection_failed", message }, { status: 400 });
  }
}

function appleCallbackHtml(origin, ok, message) {
  const safeOrigin = JSON.stringify(origin);
  const payload = JSON.stringify({ type: "lidire-apple-connect", ok: !!ok, message: String(message || "") });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LiDire — Apple ID</title></head><body style="font-family:Arial,sans-serif;background:#070c22;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h2>${ok ? "Apple ID conectado" : "Não foi possível conectar"}</h2><p>${escapeHtml(message || "")}</p></div><script>try{window.opener&&window.opener.postMessage(${payload},${safeOrigin});}catch(e){}setTimeout(()=>window.close(),300);</script></body></html>`;
}

async function startAppleConnection(request, env, url) {
  const user = await getSessionUser(request, env);
  if (!user) return new Response("Faça login na LiDire antes de conectar o Apple ID.", { status: 401, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
  if (!(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY)) {
    return new Response("Integração com Apple ID não configurada.", { status: 503, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
  }
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const state = bytesToBase64Url(stateBytes);
  const redirectUri = `${url.origin}/api/connections/apple/callback`;
  const authorize = new URL("https://appleid.apple.com/auth/authorize");
  authorize.searchParams.set("client_id", env.APPLE_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code id_token");
  authorize.searchParams.set("response_mode", "form_post");
  authorize.searchParams.set("scope", "name email");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("nonce", state);
  return new Response(null, { status: 302, headers: { "Location": authorize.toString(), "Set-Cookie": `lidire_apple_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` } });
}

function pemToArrayBuffer(pem) {
  const base64 = String(pem || "").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "").replace(/\\n/g, "").replace(/\s+/g, "");
  return base64UrlToBytes(base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""));
}

async function createAppleClientSecret(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" })));
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ iss: env.APPLE_TEAM_ID, iat: now, exp: now + 86400 * 180, aud: "https://appleid.apple.com", sub: env.APPLE_CLIENT_ID })));
  const key = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(env.APPLE_PRIVATE_KEY), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(`${header}.${payload}`));
  return `${header}.${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyAppleIdToken(idToken, env) {
  const header = parseJwtPart(idToken, 0);
  const payload = parseJwtPart(idToken, 1);
  const parts = String(idToken || "").split(".");
  if (!header || !payload || parts.length !== 3 || !header.kid || header.alg !== "ES256") throw new Error("invalid_apple_token");
  const now = Math.floor(Date.now() / 1000);
  const issuerOk = payload.iss === "https://appleid.apple.com";
  const audienceOk = payload.aud === env.APPLE_CLIENT_ID;
  if (!issuerOk || !audienceOk || !payload.sub || Number(payload.exp || 0) <= now) throw new Error("invalid_apple_claims");
  const keys = await fetchJwks("https://appleid.apple.com/auth/keys");
  const jwk = (keys.keys || []).find(key => key.kid === header.kid);
  if (!jwk) throw new Error("apple_key_not_found");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, base64UrlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error("invalid_apple_signature");
  return { subject: String(payload.sub), email: normalizeEmail(payload.email || ""), name: String(payload.name || "") };
}

async function appleConnectionCallback(request, env, url) {
  const origin = url.origin;
  try {
    const form = await request.formData();
    const state = String(form.get("state") || "");
    const expectedState = getCookie(request, "lidire_apple_state");
    if (!state || !expectedState || state !== expectedState) return new Response(appleCallbackHtml(origin, false, "A validação de segurança do Apple ID expirou. Tente novamente."), { status: 400, headers: { "Content-Type": "text/html;charset=UTF-8", "Set-Cookie": "lidire_apple_state=; Max-Age=0; Path=/; Secure; SameSite=Lax" } });
    const user = await getSessionUser(request, env);
    if (!user) return new Response(appleCallbackHtml(origin, false, "Sua sessão LiDire expirou. Entre novamente e tente conectar o Apple ID."), { status: 401, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    const code = String(form.get("code") || "");
    if (!code) throw new Error("apple_authorization_code_missing");
    const redirectUri = `${origin}/api/connections/apple/callback`;
    const clientSecret = await createAppleClientSecret(env);
    const tokenResponse = await fetch("https://appleid.apple.com/auth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.APPLE_CLIENT_ID, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }) });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.id_token) throw new Error("apple_token_exchange_failed");
    const identity = await verifyAppleIdToken(tokenData.id_token, env);
    let firstTimeUser = {};
    try { firstTimeUser = JSON.parse(String(form.get("user") || "{}")); } catch (_) {}
    const appleUser = { ...identity, name: identity.name || [firstTimeUser?.name?.firstName, firstTimeUser?.name?.lastName].filter(Boolean).join(" ") };
    const result = await linkProviderAccount(env.DB, user, "apple", appleUser);
    if (!result.ok) return new Response(appleCallbackHtml(origin, false, result.message), { status: result.status, headers: { "Content-Type": "text/html;charset=UTF-8" } });
    return new Response(appleCallbackHtml(origin, true, "Apple ID conectado à LiDire."), { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8", "Set-Cookie": "lidire_apple_state=; Max-Age=0; Path=/; Secure; SameSite=Lax" } });
  } catch (error) {
    console.error("LiDire Apple connection error:", error);
    return new Response(appleCallbackHtml(origin, false, "Não foi possível conectar o Apple ID. Verifique a configuração da integração e tente novamente."), { status: 400, headers: { "Content-Type": "text/html;charset=UTF-8", "Set-Cookie": "lidire_apple_state=; Max-Age=0; Path=/; Secure; SameSite=Lax" } });
  }
}

async function register(request, env) {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (name.length < 2) {
    return Response.json(
      { error: "invalid_name", message: "Informe seu nome." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return Response.json(
      { error: "invalid_email", message: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "weak_password", message: "A senha precisa ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  if (!body.legalAccepted) {
    return Response.json(
      { error: "legal_required", message: "O aceite dos documentos legais é necessário para criar a conta." },
      { status: 400 }
    );
  }

  await ensureAuthTables(env.DB);

  const existing = await env.DB
    .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first();

  if (existing) {
    return Response.json(
      { error: "email_exists", message: "Já existe uma conta com este e-mail." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // O D1 atual usa users + profiles com o perfil separado do usuário.
    // Mantemos o cadastro mínimo e seguro aqui; configurações adicionais
    // serão inicializadas quando seus módulos forem conectados.
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userId, email, passwordHash, name, now, now),

      env.DB.prepare(`
        INSERT INTO profiles (
          user_id, name, email, age, phone, address, profile_photo, currency, created_at, updated_at
        )
        VALUES (?, ?, ?, NULL, NULL, NULL, NULL, 'BRL', ?, ?)
      `).bind(userId, name, email, now, now)
    ]);

    // Se a tabela de aceite jurídico existir, registra o aceite.
    // O cadastro não é bloqueado por tabelas opcionais de módulos ainda não conectados.
    try {
      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO legal_acceptances (id, user_id, document_type, document_version, accepted_at)
          VALUES (?, ?, 'terms_of_use', '1.0', ?)
        `).bind(crypto.randomUUID(), userId, now),
        env.DB.prepare(`
          INSERT INTO legal_acceptances (id, user_id, document_type, document_version, accepted_at)
          VALUES (?, ?, 'privacy_policy', '1.0', ?)
        `).bind(crypto.randomUUID(), userId, now)
      ]);
    } catch (legalError) {
      console.warn("Registro de aceite jurídico não disponível nesta versão:", legalError);
    }
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      return Response.json(
        { error: "email_exists", message: "Já existe uma conta com este e-mail." },
        { status: 409 }
      );
    }
    throw error;
  }

  const session = await createSession(env.DB, userId);

  return Response.json(
    {
      ok: true,
      user: await getUserById(env.DB, userId)
    },
    {
      headers: {
        "Set-Cookie": session.cookie
      }
    }
  );
}

async function ensureLoginSessionTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Bancos de versões antigas podem ter criado a tabela com menos colunas.
  // Adicionamos somente as colunas necessárias, sem apagar sessões existentes.
  const columns = await db.prepare(`PRAGMA table_info(user_sessions)`).all();
  const names = new Set((columns.results || []).map(c => c.name));
  if (!names.has("token_hash")) await db.prepare(`ALTER TABLE user_sessions ADD COLUMN token_hash TEXT`).run();
  if (!names.has("expires_at")) await db.prepare(`ALTER TABLE user_sessions ADD COLUMN expires_at TEXT`).run();
  if (!names.has("created_at")) await db.prepare(`ALTER TABLE user_sessions ADD COLUMN created_at TEXT`).run();
  if (!names.has("last_seen_at")) await db.prepare(`ALTER TABLE user_sessions ADD COLUMN last_seen_at TEXT`).run();
}

function decodeLoginChallenge(value) {
  try {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) {
    return null;
  }
}

function encodeLoginChallenge(payload) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
}

async function hmacSha256(keyBytes, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function loginChallenge(request, env) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const user = await env.DB
      .prepare("SELECT id, password_hash FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .bind(email)
      .first();

    if (!user?.password_hash) {
      return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const parts = String(user.password_hash).split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return Response.json({ error: "password_not_configured", message: "Esta conta precisa configurar novamente a senha." }, { status: 409 });
    }

    const iterations = Number(parts[1]);
    const salt = parts[2];
    if (!Number.isFinite(iterations) || iterations < 1 || !salt) {
      return Response.json({ error: "password_not_configured", message: "Esta conta precisa configurar novamente a senha." }, { status: 409 });
    }

    const nonceBytes = new Uint8Array(32);
    crypto.getRandomValues(nonceBytes);
    const payload = {
      email,
      nonce: bytesToBase64Url(nonceBytes),
      issuedAt: Date.now()
    };
    const challenge = encodeLoginChallenge(payload);

    return Response.json(
      { ok: true, challenge, salt, iterations },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("LiDire login challenge error:", error);
    return Response.json({ error: "login_unavailable", message: "Não foi possível iniciar o login agora." }, { status: 503 });
  }
}

async function login(request, env) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);

    // Novo fluxo: a senha é derivada no aparelho e o Worker verifica apenas
    // uma prova HMAC do desafio. Isso evita o custo de PBKDF2 no CPU do Worker.
    if (body.challenge && body.proof) {
      if (!isValidEmail(email)) {
        return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
      }

      const challenge = decodeLoginChallenge(body.challenge);
      const issuedAt = Number(challenge?.issuedAt || 0);
      const challengeEmail = normalizeEmail(challenge?.email || "");
      if (!challenge || challengeEmail !== email || !issuedAt || Math.abs(Date.now() - issuedAt) > 120000) {
        return Response.json({ error: "login_challenge_expired", message: "A tentativa de login expirou. Tente novamente." }, { status: 401 });
      }

      const user = await env.DB
        .prepare("SELECT id, email, name, password_hash FROM users WHERE lower(email) = lower(?) LIMIT 1")
        .bind(email)
        .first();

      if (!user?.password_hash) {
        return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
      }

      const parts = String(user.password_hash).split("$");
      if (parts.length !== 4 || parts[0] !== "pbkdf2") {
        return Response.json({ error: "password_not_configured", message: "Esta conta precisa configurar novamente a senha." }, { status: 409 });
      }

      const expectedDerived = base64UrlToBytes(parts[3]);
      const expectedProof = await hmacSha256(expectedDerived, body.challenge);
      const suppliedProof = base64UrlToBytes(body.proof);
      if (!constantTimeEqual(expectedProof, suppliedProof)) {
        return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
      }

      const session = await createSession(env.DB, user.id);
      return Response.json(
        { ok: true, user: { id: user.id, name: user.name || "", email: user.email || "" } },
        { headers: { "Set-Cookie": session.cookie, "Cache-Control": "no-store, private" } }
      );
    }

    // Compatibilidade para clientes antigos que ainda enviem senha diretamente.
    const password = String(body.password || "");
    if (!isValidEmail(email) || password.length < 8) {
      return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const user = await env.DB
      .prepare("SELECT id, email, password_hash, name FROM users WHERE lower(email) = lower(?) LIMIT 1")
      .bind(email)
      .first();

    if (!user) return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });
    if (!user.password_hash) return Response.json({ error: "password_not_configured", message: "Esta conta ainda não possui uma senha de acesso." }, { status: 409 });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return Response.json({ error: "invalid_credentials", message: "E-mail ou senha inválidos." }, { status: 401 });

    const session = await createSession(env.DB, user.id);
    return Response.json(
      { ok: true, user: { id: user.id, name: user.name || "", email: user.email || "" } },
      { headers: { "Set-Cookie": session.cookie, "Cache-Control": "no-store, private" } }
    );
  } catch (error) {
    console.error("LiDire login error:", error);
    return Response.json({ error: "login_unavailable", message: "Não foi possível concluir o login agora. Tente novamente." }, { status: 503 });
  }
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);

  if (token) {
    await ensureAuthTables(env.DB);
    const tokenHash = await sha256(token);
    await env.DB
      .prepare("DELETE FROM user_sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
      }
    }
  );
}


async function ensurePasswordResetTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at)`).run();
}


async function sendPasswordResetEmail(env, { to, name, resetUrl }) {
  const apiKey = String(env.RESEND_API_KEY || "").trim();
  if (!apiKey) throw new Error("email_provider_not_configured");

  const from = String(env.RESEND_FROM_EMAIL || "LiDire <onboarding@resend.dev>").trim();
  const safeName = escapeHtml(name || "");
  const safeUrl = escapeHtml(resetUrl);
  const greeting = safeName ? `Olá, ${safeName}!` : "Olá!";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#070C22;color:#172033;padding:32px 16px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;">
        <div style="font-size:24px;font-weight:800;margin-bottom:20px;color:#171d3d;">LiDire</div>
        <p style="font-size:16px;line-height:1.6;">${greeting}</p>
        <p style="font-size:16px;line-height:1.6;">Recebemos uma solicitação para redefinir a senha da sua conta LiDire.</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${safeUrl}" style="display:inline-block;background:#6d4aff;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;">Criar nova senha</a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#5d6678;">Este link é válido por 30 minutos e pode ser usado uma única vez.</p>
        <p style="font-size:13px;line-height:1.6;color:#5d6678;">Se você não solicitou a alteração, ignore este e-mail.</p>
        <p style="font-size:12px;line-height:1.5;color:#7a8497;word-break:break-all;">${safeUrl}</p>
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Redefinição de senha — LiDire",
      html
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("LiDire password reset email failed:", response.status, data?.message || data?.name || "unknown_error");
    throw new Error("email_send_failed");
  }
  return data;
}

async function requestPasswordReset(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const genericMessage = "Se houver uma conta com esse e-mail, as instruções de recuperação serão enviadas.";
  if (!isValidEmail(email)) return Response.json({ ok: true, message: genericMessage });

  await ensurePasswordResetTable(env.DB);
  const user = await env.DB.prepare("SELECT id, email, name FROM users WHERE email = ? LIMIT 1").bind(email).first();
  if (!user) return Response.json({ ok: true, message: genericMessage });

  // Evita disparos repetidos muito rápidos para a mesma conta.
  const recent = await env.DB.prepare(`
    SELECT id, created_at
    FROM password_reset_tokens
    WHERE user_id = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC LIMIT 1
  `).bind(user.id).first();
  if (recent?.created_at) {
    const createdMs = new Date(String(recent.created_at).replace(" ", "T") + (String(recent.created_at).endsWith("Z") ? "" : "Z")).getTime();
    if (Number.isFinite(createdMs) && Date.now() - createdMs < 60 * 1000) {
      return Response.json({ ok: true, message: genericMessage });
    }
  }

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = await sha256(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const publicBase = String(env.LIDIRE_PUBLIC_URL || new URL(request.url).origin).replace(/\/$/, "");
  const resetUrl = `${publicBase}/?redefinir=${encodeURIComponent(token)}`;

  await env.DB.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= CURRENT_TIMESTAMP").bind(user.id).run();
  await env.DB.prepare(`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(id, user.id, tokenHash, expiresAt).run();

  try {
    await sendPasswordResetEmail(env, { to: user.email, name: user.name, resetUrl });
  } catch (error) {
    // O token permanece inutilizável sem o e-mail; remova-o para permitir nova tentativa.
    await env.DB.prepare("DELETE FROM password_reset_tokens WHERE id = ?").bind(id).run();
    if (error?.message === "email_provider_not_configured") {
      return Response.json({ error: "email_provider_not_configured", message: "A recuperação por e-mail ainda não foi configurada no servidor." }, { status: 503 });
    }
    return Response.json({ error: "email_send_failed", message: "Não foi possível enviar o e-mail de recuperação agora. Tente novamente em instantes." }, { status: 503 });
  }

  return Response.json({ ok: true, message: genericMessage });
}

async function completePasswordReset(request, env) {
  const body = await readJson(request);
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token || password.length < 8) {
    return Response.json({ error: "invalid_reset", message: "Token ou senha inválidos." }, { status: 400 });
  }

  await ensurePasswordResetTable(env.DB);
  const tokenHash = await sha256(token);
  const reset = await env.DB.prepare(`
    SELECT id, user_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token_hash = ? LIMIT 1
  `).bind(tokenHash).first();

  if (!reset || reset.used_at || new Date(reset.expires_at).getTime() <= Date.now()) {
    return Response.json({ error: "invalid_reset", message: "O link de recuperação é inválido ou expirou." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(passwordHash, now, reset.user_id),
    env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ?").bind(now, reset.id),
    env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(reset.user_id)
  ]);

  return Response.json({ ok: true, message: "Senha redefinida com sucesso. Entre novamente na sua conta." });
}

async function updateProfile(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return Response.json(
      { error: "unauthorized", message: "Sua sessão expirou. Entre novamente." },
      { status: 401 }
    );
  }

  const body = await readJson(request);
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email || user.email);
  const age = body.age == null || body.age === "" ? null : Number(body.age);
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const profilePhoto = body.profile_photo == null ? null : String(body.profile_photo || "");

  if (name.length < 2) {
    return Response.json(
      { error: "invalid_name", message: "Informe seu nome." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return Response.json(
      { error: "invalid_email", message: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  if (age !== null && (!Number.isFinite(age) || age < 0 || age > 150)) {
    return Response.json(
      { error: "invalid_age", message: "Informe uma idade válida." },
      { status: 400 }
    );
  }

  const existing = await env.DB
    .prepare("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1")
    .bind(email, user.id)
    .first();

  if (existing) {
    return Response.json(
      { error: "email_exists", message: "Já existe uma conta com este e-mail." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?")
      .bind(name, email, now, user.id),
    env.DB.prepare(`
      UPDATE profiles
      SET name = ?, email = ?, age = ?, phone = ?, address = ?, profile_photo = COALESCE(?, profile_photo), updated_at = ?
      WHERE user_id = ?
    `).bind(name, email, age, phone, address, profilePhoto, now, user.id)
  ]);

  return Response.json({ ok: true, user: await getUserById(env.DB, user.id), database: true });
}


async function deleteAccount(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return Response.json({ error: "unauthorized", message: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  }

  const userId = user.id;
  const tables = await env.DB.prepare(`
    SELECT name, sql FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      AND (sql LIKE '%user_id%' OR sql LIKE '%owner_user_id%')
  `).all();

  const statements = [];

  // Child records that reference family_groups through group_id.
  try {
    const family = await env.DB.prepare(`SELECT id FROM family_groups WHERE owner_user_id = ?`).bind(userId).all();
    for (const row of (family.results || [])) {
      statements.push(env.DB.prepare(`DELETE FROM family_members WHERE group_id = ?`).bind(row.id));
    }
    if ((family.results || []).length) {
      statements.push(env.DB.prepare(`DELETE FROM family_groups WHERE owner_user_id = ?`).bind(userId));
    }
  } catch (_) {}

  for (const table of (tables.results || [])) {
    const name = String(table.name || "");
    if (!name || ["users", "user_sessions"].includes(name) || name === "family_groups" || name === "family_members") continue;
    const sql = String(table.sql || "");
    if (/\buser_id\b/i.test(sql)) {
      statements.push(env.DB.prepare(`DELETE FROM "${name.replaceAll('"','""')}" WHERE user_id = ?`).bind(userId));
    } else if (/\bowner_user_id\b/i.test(sql)) {
      statements.push(env.DB.prepare(`DELETE FROM "${name.replaceAll('"','""')}" WHERE owner_user_id = ?`).bind(userId));
    }
  }

  statements.push(env.DB.prepare("DELETE FROM profiles WHERE user_id = ?").bind(userId));
  statements.push(env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(userId));
  statements.push(env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId));

  await env.DB.batch(statements);

  return new Response(JSON.stringify({ ok: true, message: "Conta e dados excluídos." }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
    }
  });
}

async function getSessionUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;

  await ensureAuthTables(env.DB);

  const tokenHash = await sha256(token);
  const session = await env.DB
    .prepare(`
      SELECT
        s.user_id,
        s.expires_at,
        u.id,
        u.name,
        u.email
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();

  if (!session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await env.DB
      .prepare("DELETE FROM user_sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
    return null;
  }

  await env.DB
    .prepare("UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?")
    .bind(tokenHash)
    .run();

  return getUserById(env.DB, session.user_id);
}

async function getUserById(db, userId) {
  return db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      p.age,
      p.phone,
      p.address,
      p.profile_photo AS profile_photo
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
  `).bind(userId).first();
}

async function createSession(db, userId) {
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = await sha256(token);

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(sessionId, userId, tokenHash, expiresAt).run();

  return {
    token,
    cookie: `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`
  };
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256"
    },
    key,
    256
  );

  return [
    "pbkdf2",
    PASSWORD_ITERATIONS,
    bytesToBase64Url(salt),
    bytesToBase64Url(new Uint8Array(bits))
  ].join("$");
}

async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const salt = base64UrlToBytes(parts[2]);
  const expected = base64UrlToBytes(parts[3]);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    key,
    expected.length * 8
  );

  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(value)
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (_) {
    return {};
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split("=");
    if (key === name) {
      return parts.join("=");
    }
  }

  return null;
}
