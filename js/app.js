const SESSION_KEY = "cimvia_session_v1";
const COOKIE_KEY = "cimvia_cookie_consent_v1";
const THEME_KEY = "cimvia_theme_v1";
const RETURN_TO_KEY = "cimvia_return_to_v1";
const CONSENT_COOKIE_NAME = "cimva_cookie_consent";
const SUPABASE_URL = "https://cshvfrnougpxhlnvddem.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aPByjxuEr9nwBGo1ol6j4Q_jEyelpFM";

let _supabaseClient = null;
function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  const lib = window.supabase;
  if (!lib || typeof lib.createClient !== "function") return null;
  _supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return _supabaseClient;
}

async function getSupabaseSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getSession();
    if (error) return null;
    return data?.session || null;
  } catch {
    return null;
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.email !== "string") return null;
    if (typeof parsed.createdAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function setSession(email) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ email, createdAt: Date.now() })
  );
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCookieConsent() {
  const fromCookie = (() => {
    try {
      const parts = document.cookie ? document.cookie.split(";") : [];
      for (const p of parts) {
        const [k, ...rest] = p.trim().split("=");
        if (k === CONSENT_COOKIE_NAME) {
          const v = decodeURIComponent(rest.join("="));
          if (v === "accepted" || v === "rejected") return v;
        }
      }
      return null;
    } catch {
      return null;
    }
  })();
  if (fromCookie) return fromCookie;

  try {
    const value = localStorage.getItem(COOKIE_KEY);
    if (value === "accepted" || value === "rejected") return value;
    return null;
  } catch {
    try {
      const value = sessionStorage.getItem(COOKIE_KEY);
      if (value === "accepted" || value === "rejected") return value;
      return null;
    } catch {
      return null;
    }
  }
}


function setCookieConsent(value) {
  try {
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch {}
  try {
    localStorage.setItem(COOKIE_KEY, value);
  } catch {}
  try {
    sessionStorage.setItem(COOKIE_KEY, value);
  } catch {}
}

function storeReturnTo(url) {
  try {
    sessionStorage.setItem(RETURN_TO_KEY, url);
  } catch {}
}

function takeReturnTo() {
  try {
    const url = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    return url;
  } catch {
    return null;
  }
}

function getCurrentFileName() {
  try {
    const href = window.location.href.split("#")[0].split("?")[0];
    const parts = href.split("/");
    const last = parts[parts.length - 1] || "";
    if (!last) return "index.html";
    if (last.includes(":") && last.endsWith("/")) return "index.html";
    return decodeURIComponent(last).toLowerCase();
  } catch {
    return "index.html";
  }
}

function initCookieGate() {
  const consent = getCookieConsent();
  if (consent !== "rejected") return;

  const file = getCurrentFileName();
  const allow = new Set(["cookies.html", "privacidad.html", "cookies-bloqueado.html"]);
  if (allow.has(file)) return;

  storeReturnTo(window.location.href);
  window.location.replace("cookies-bloqueado.html");
}

function getStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return null;
  } catch {
    return null;
  }
}

function setStoredTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggles = document.querySelectorAll("[data-theme-toggle]");
  for (const btn of toggles) {
    const isDark = theme === "dark";
    btn.setAttribute("aria-pressed", String(isDark));
    btn.textContent = isDark ? "Claro" : "Oscuro";
    btn.setAttribute("title", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  }
}

function initThemeToggle() {
  applyTheme(getPreferredTheme());

  const toggles = document.querySelectorAll("[data-theme-toggle]");
  for (const btn of toggles) {
    btn.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      setStoredTheme(next);
      applyTheme(next);
    });
  }
}

function redirectTo(path) {
  window.location.href = path;
}

function initSmoothAnchors() {
  const anchors = document.querySelectorAll('a[href^="#"]');
  for (const a of anchors) {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
    });
  }
}

function initLoginForm() {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;

  const emailInput = form.querySelector('input[name="email"]');
  const passInput = form.querySelector('input[name="password"]');
  const errorBox = form.querySelector("[data-error]");
  const submitBtn = form.querySelector('button[type="submit"]');

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.setAttribute("aria-hidden", "false");
  };

  const hideError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.setAttribute("aria-hidden", "true");
  };

  const validate = () => {
    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passInput?.value || "";
    if (!email || !email.includes("@")) {
      showError("Introduce un correo válido.");
      emailInput?.focus();
      return null;
    }
    if (!password || password.length < 6) {
      showError("La contraseña debe tener al menos 6 caracteres.");
      passInput?.focus();
      return null;
    }
    return { email, password };
  };

  const setBusy = (busy) => {
    if (submitBtn) submitBtn.disabled = busy;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const creds = validate();
    if (!creds) return;

    const client = getSupabaseClient();
    if (!client) {
      setSession(creds.email);
      redirectTo("panel.html");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) {
        const msg = error?.message || "Error al iniciar sesión.";
        const is503 = error?.status === 503 || /service unavailable/i.test(msg);
        showError(
          is503
            ? "Servicio no disponible (Supabase). Revisa que el proyecto esté activo y vuelve a intentarlo."
            : msg
        );
        return;
      }
      if (data?.session) {
        redirectTo("panel.html");
        return;
      }
      showError("No se pudo iniciar sesión. Revisa tus credenciales.");
    } catch {
      showError("Error al iniciar sesión.");
    } finally {
      setBusy(false);
    }
  });
}

function initRegisterForm() {
  const form = document.querySelector("[data-register-form]");
  if (!form) return;

  const emailInput = form.querySelector('input[name="email"]');
  const passInput = form.querySelector('input[name="password"]');
  const errorBox = form.querySelector("[data-error]");
  const submitBtn = form.querySelector('button[type="submit"]');

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.setAttribute("aria-hidden", "false");
  };

  const hideError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.setAttribute("aria-hidden", "true");
  };

  const validate = () => {
    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passInput?.value || "";
    if (!email || !email.includes("@")) {
      showError("Introduce un correo válido.");
      emailInput?.focus();
      return null;
    }
    if (!password || password.length < 6) {
      showError("La contraseña debe tener al menos 6 caracteres.");
      passInput?.focus();
      return null;
    }
    return { email, password };
  };

  const setBusy = (busy) => {
    if (submitBtn) submitBtn.disabled = busy;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const creds = validate();
    if (!creds) return;

    const client = getSupabaseClient();
    if (!client) {
      showError("Registro no disponible sin conexión a Supabase.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await client.auth.signUp({
        email: creds.email,
        password: creds.password,
      });
      if (error) {
        const msg = error?.message || "Error al crear la cuenta.";
        const is503 = error?.status === 503 || /service unavailable/i.test(msg);
        showError(
          is503
            ? "Servicio no disponible (Supabase). Revisa que el proyecto esté activo y vuelve a intentarlo."
            : msg
        );
        return;
      }
      if (data?.session) {
        redirectTo("panel.html");
        return;
      }
      showError("Cuenta creada. Revisa tu correo para confirmar el registro.");
    } catch {
      showError("Error al crear la cuenta.");
    } finally {
      setBusy(false);
    }
  });
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const nameInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const msgInput = form.querySelector('textarea[name="message"]');
  const errorBox = form.querySelector("[data-error]");

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.setAttribute("aria-hidden", "false");
  };

  const hideError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.setAttribute("aria-hidden", "true");
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideError();

    const name = (nameInput?.value || "").trim();
    const email = (emailInput?.value || "").trim();
    const message = (msgInput?.value || "").trim();

    if (!name) {
      showError("Introduce tu nombre.");
      nameInput?.focus();
      return;
    }
    if (!email || !email.includes("@")) {
      showError("Introduce un correo válido.");
      emailInput?.focus();
      return;
    }
    if (!message || message.length < 10) {
      showError("Escribe un mensaje un poco más largo.");
      msgInput?.focus();
      return;
    }

    const to = "contacto@mivirtualizacion.com";
    const subject = encodeURIComponent("Solicitud desde la web");
    const body = encodeURIComponent(
      `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}\n`
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });
}

async function initProtectedPage() {
  const requiresAuth = document.body?.getAttribute("data-requires-auth") === "true";
  if (!requiresAuth) return;
  const supabaseSession = await getSupabaseSession();
  const legacySession = getSession();
  const email = supabaseSession?.user?.email || legacySession?.email || null;
  if (!email) {
    redirectTo("login.html");
    return;
  }

  const emailSlot = document.querySelector("[data-session-email]");
  if (emailSlot && email) emailSlot.textContent = email;

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.auth.signOut();
        } catch {}
      }
      clearSession();
      redirectTo("index.html");
    });
  }
}

async function initAuthLinks() {
  const supabaseSession = await getSupabaseSession();
  const legacySession = getSession();
  const hasSession = Boolean(supabaseSession || legacySession);
  const loginLinks = document.querySelectorAll("[data-auth-link]");
  for (const link of loginLinks) {
    const mode = link.getAttribute("data-auth-link");
    if (mode === "login") {
      link.setAttribute("href", hasSession ? "panel.html" : "login.html");
      link.textContent = hasSession ? "Paquetes" : "Iniciar sesión";
    }
  }
}

function initCookieBanner() {
  const banner = document.querySelector("[data-cookie-banner]");
  if (!banner) return;

  const consent = getCookieConsent();
  if (consent) {
    banner.setAttribute("aria-hidden", "true");
    return;
  }

  const acceptBtn = banner.querySelector("[data-cookie-accept]");
  const rejectBtn = banner.querySelector("[data-cookie-reject]");

  banner.setAttribute("aria-hidden", "false");

  const close = () => {
    banner.setAttribute("aria-hidden", "true");
  };

  acceptBtn?.addEventListener("click", () => {
    setCookieConsent("accepted");
    close();
  });
  rejectBtn?.addEventListener("click", () => {
    setCookieConsent("rejected");
    close();
    storeReturnTo(window.location.href);
    window.location.replace("cookies-bloqueado.html");
  });
}

function initCookieBlockedPage() {
  const isBlockedPage = document.body?.getAttribute("data-cookie-blocked") === "true";
  if (!isBlockedPage) return;

  const acceptButtons = document.querySelectorAll("[data-cookie-accept]");
  for (const btn of acceptButtons) {
    btn.addEventListener("click", () => {
      setCookieConsent("accepted");
      const back = takeReturnTo();
      window.location.replace(back || "index.html");
    });
  }
}

function initSupabaseDownload() {
  const form = document.querySelector("[data-supabase-download]");
  if (!form) return;

  const urlInput = form.querySelector('input[name="sb_url"]');
  const bucketInput = form.querySelector('input[name="sb_bucket"]');
  const pathInput = form.querySelector('input[name="sb_path"]');
  const filenameInput = form.querySelector('input[name="sb_filename"]');
  const errorBox = form.querySelector("[data-error]");

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.setAttribute("aria-hidden", "false");
  };
  const hideError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.setAttribute("aria-hidden", "true");
  };

  const encodePath = (p) =>
    p
      .split("/")
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/");

  const downloadBlob = (blob, filename) => {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const publicUrl = (urlInput?.value || "").trim();
    const bucket = (bucketInput?.value || "").trim();
    const path = (pathInput?.value || "").trim().replace(/^\/+/, "");
    const suggestedName = (filenameInput?.value || "").trim();

    let downloadUrl = publicUrl;
    let fallbackName = suggestedName;

    if (!downloadUrl) {
      downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/ova/perrito.jpg`;
    }

    if (downloadUrl === `${SUPABASE_URL}/storage/v1/object/public/ova/perrito.jpg` && !fallbackName) {
      fallbackName = "perrito.jpg";
    }

    if (!publicUrl && downloadUrl !== `${SUPABASE_URL}/storage/v1/object/public/ova/perrito.jpg`) {
      if (!bucket) {
        showError("Introduce el bucket.");
        bucketInput?.focus();
        return;
      }
      if (!path) {
        showError("Introduce la ruta del archivo.");
        pathInput?.focus();
        return;
      }
      const encoded = encodePath(path);
      downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encoded}`;
      if (!fallbackName) {
        const parts = path.split("/").filter(Boolean);
        fallbackName = parts[parts.length - 1] || "imagen";
      }
    } else if (!fallbackName) {
      try {
        const u = new URL(downloadUrl);
        const parts = u.pathname.split("/").filter(Boolean);
        fallbackName = parts[parts.length - 1] || "imagen";
      } catch {
        fallbackName = "imagen";
      }
    }

    const fetchWithHeaders = () =>
      fetch(downloadUrl, {
        method: "GET",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

    try {
      let res = await fetch(downloadUrl, { method: "GET" });
      if ((res.status === 401 || res.status === 403) && SUPABASE_PUBLISHABLE_KEY) {
        res = await fetchWithHeaders();
      }

      if (!res.ok) {
        if (res.status === 503) {
          showError("Servicio no disponible (503). Puede que el proyecto de Supabase esté pausado o haya una incidencia temporal.");
          return;
        }
        showError(`No se pudo descargar (HTTP ${res.status}). Revisa bucket/ruta o si el archivo es público.`);
        return;
      }

      const blob = await res.blob();
      downloadBlob(blob, fallbackName);
    } catch {
      showError("Error de red al descargar la imagen.");
    }
  });
}

function initOvaDownloads() {
  const buttons = document.querySelectorAll("[data-ova-download]");
  if (!buttons.length) return;

  const errorBox = document.querySelector("[data-ova-error]");
  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.setAttribute("aria-hidden", "false");
  };
  const hideError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.setAttribute("aria-hidden", "true");
  };

  const encodeObjectPath = (p) =>
    p
      .split("/")
      .filter((seg) => seg.length > 0)
      .map((seg) => encodeURIComponent(seg))
      .join("/");

  const buildPathCandidates = (raw) => {
    const candidates = [];
    const push = (v) => {
      if (!v) return;
      if (!candidates.includes(v)) candidates.push(v);
    };
    push(raw);
    try {
      if (/%[0-9a-f]{2}/i.test(raw)) push(decodeURIComponent(raw));
    } catch {}
    if (raw.includes(" ")) push(encodeObjectPath(raw));
    return candidates;
  };

  for (const btn of buttons) {
    btn.addEventListener("click", async () => {
      hideError();
      const bucket = btn.getAttribute("data-bucket") || "ova";
      const path = btn.getAttribute("data-path") || "";
      if (!path) {
        showError("No se encontró la ruta del archivo.");
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        showError("No se pudo cargar Supabase. Revisa tu conexión.");
        return;
      }

      btn.disabled = true;
      try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError || !sessionData?.session) {
          showError("Inicia sesión para descargar los paquetes.");
          redirectTo("login.html");
          return;
        }

        const candidates = buildPathCandidates(path);
        let signedUrl = null;
        let lastError = null;
        for (const candidate of candidates) {
          const { data, error } = await client.storage.from(bucket).createSignedUrl(candidate, 600);
          if (!error && data?.signedUrl) {
            signedUrl = data.signedUrl;
            break;
          }
          lastError = error || lastError;
        }

        if (!signedUrl) {
          const msg = lastError?.message || "No se pudo generar el enlace de descarga.";
          const status = lastError?.status ? ` (HTTP ${lastError.status})` : "";
          showError(`${msg}${status} Revisa permisos de Storage y nombre del archivo.`);
          return;
        }

        window.location.href = signedUrl;
      } catch {
        showError("Error al preparar la descarga.");
      } finally {
        btn.disabled = false;
      }
    });
  }
}

function initForum() {
  const root = document.querySelector("[data-forum]");
  if (!root) return;

  const form = root.querySelector("[data-forum-form]");
  const list = root.querySelector("[data-forum-list]");
  const errorBox = root.querySelector("[data-forum-error]");

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.setAttribute("aria-hidden", "false");
  };
  const hideError = () => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.setAttribute("aria-hidden", "true");
  };

  const client = getSupabaseClient();
  if (!client) {
    showError("No se pudo cargar Supabase.");
    return;
  }

  const shortId = (id) => {
    if (!id || typeof id !== "string") return "Usuario";
    return `Usuario ${id.slice(0, 6)}`;
  };

  const renderComments = (container, comments) => {
    container.innerHTML = "";
    if (!comments?.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Sin comentarios todavía.";
      container.appendChild(empty);
      return;
    }

    for (const c of comments) {
      const item = document.createElement("div");
      item.className = "list-item";

      const dot = document.createElement("div");
      dot.className = "dot";

      const content = document.createElement("div");

      const body = document.createElement("p");
      body.textContent = c.content || "";

      const meta = document.createElement("p");
      meta.className = "hint";
      const when = c.created_at ? new Date(c.created_at).toLocaleString("es-ES") : "";
      const who = shortId(c.user_id);
      meta.textContent = when ? `${who} · ${when}` : who;

      content.appendChild(body);
      content.appendChild(meta);
      item.appendChild(dot);
      item.appendChild(content);
      container.appendChild(item);
    }
  };

  const renderPosts = (posts, session) => {
    if (!list) return;
    list.innerHTML = "";
    if (!posts?.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Todavía no hay mensajes. Sé el primero en publicar.";
      list.appendChild(empty);
      return;
    }

    for (const post of posts) {
      const item = document.createElement("div");
      item.className = "list-item";

      const dot = document.createElement("div");
      dot.className = "dot";

      const content = document.createElement("div");

      const title = document.createElement("h3");
      title.textContent = post.title || "Post";

      const body = document.createElement("p");
      body.textContent = post.content || "";

      const meta = document.createElement("p");
      meta.className = "hint";
      const when = post.created_at ? new Date(post.created_at).toLocaleString("es-ES") : "";
      const who = shortId(post.user_id);
      meta.textContent = when ? `${who} · ${when}` : who;

      const actions = document.createElement("div");
      actions.className = "hero-actions";
      actions.style.marginTop = "10px";

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "btn";
      toggleBtn.textContent = "Ver comentarios";

      const commentsWrap = document.createElement("div");
      commentsWrap.style.display = "none";
      commentsWrap.style.marginTop = "12px";

      const commentsList = document.createElement("div");
      commentsWrap.appendChild(commentsList);

      const commentForm = document.createElement("form");
      commentForm.style.marginTop = "12px";

      const commentField = document.createElement("div");
      commentField.className = "field";

      const commentLabel = document.createElement("label");
      commentLabel.textContent = "Comentario";

      const commentArea = document.createElement("textarea");
      commentArea.rows = 3;
      commentArea.placeholder = "Escribe un comentario...";
      commentArea.required = true;

      commentField.appendChild(commentLabel);
      commentField.appendChild(commentArea);

      const commentActions = document.createElement("div");
      commentActions.className = "form-actions";

      const sendBtn = document.createElement("button");
      sendBtn.type = "submit";
      sendBtn.className = "btn btn-primary";
      sendBtn.textContent = "Enviar";

      commentActions.appendChild(sendBtn);
      commentForm.appendChild(commentField);
      commentForm.appendChild(commentActions);

      if (!session) {
        commentArea.disabled = true;
        sendBtn.disabled = true;
        commentArea.placeholder = "Inicia sesión para comentar.";
      }

      commentsWrap.appendChild(commentForm);

      toggleBtn.addEventListener("click", async () => {
        hideError();
        const isOpen = commentsWrap.style.display !== "none";
        if (isOpen) {
          commentsWrap.style.display = "none";
          toggleBtn.textContent = "Ver comentarios";
          return;
        }
        toggleBtn.disabled = true;
        try {
          const { data, error } = await client
            .from("comments")
            .select("id,created_at,content,user_id")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true })
            .limit(100);

          if (error) {
            showError(error.message || "No se pudieron cargar los comentarios.");
            return;
          }

          renderComments(commentsList, data || []);
          commentsWrap.style.display = "block";
          toggleBtn.textContent = "Ocultar comentarios";
        } catch {
          showError("Error al cargar comentarios.");
        } finally {
          toggleBtn.disabled = false;
        }
      });

      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError();
        if (!session) {
          showError("Inicia sesión para comentar.");
          redirectTo("login.html");
          return;
        }
        const contentValue = (commentArea.value || "").trim();
        if (!contentValue) return;

        sendBtn.disabled = true;
        try {
          const payload = {
            post_id: post.id,
            user_id: session.user.id,
            content: contentValue,
          };
          const { error } = await client.from("comments").insert(payload);
          if (error) {
            showError(error.message || "No se pudo enviar el comentario.");
            return;
          }
          commentArea.value = "";
          toggleBtn.click();
          toggleBtn.click();
        } catch {
          showError("Error al enviar el comentario.");
        } finally {
          sendBtn.disabled = false;
        }
      });

      actions.appendChild(toggleBtn);

      content.appendChild(title);
      content.appendChild(body);
      content.appendChild(meta);
      content.appendChild(actions);
      content.appendChild(commentsWrap);

      item.appendChild(dot);
      item.appendChild(content);
      list.appendChild(item);
    }
  };

  const loadPosts = async () => {
    hideError();
    try {
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData?.session || null;
      const { data, error } = await client
        .from("posts")
        .select("id,created_at,title,content,user_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        const msg = error.message || "No se pudieron cargar los mensajes.";
        showError(msg);
        return;
      }

      renderPosts(data || [], session);
    } catch {
      showError("Error al cargar el foro.");
    }
  };

  loadPosts();

  if (!form) return;
  const titleInput = form.querySelector('input[name="title"]');
  const bodyInput = form.querySelector('textarea[name="content"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  const setBusy = (busy) => {
    if (submitBtn) submitBtn.disabled = busy;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const title = (titleInput?.value || "").trim();
    const body = (bodyInput?.value || "").trim();
    if (!title) {
      showError("Escribe un título.");
      titleInput?.focus();
      return;
    }
    if (!body) {
      showError("Escribe un mensaje.");
      bodyInput?.focus();
      return;
    }

    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData?.session) {
        showError("Inicia sesión para publicar.");
        redirectTo("login.html");
        return;
      }

      const user = sessionData.session.user;
      const payload = {
        user_id: user.id,
        title,
        content: body,
      };

      const { error } = await client.from("posts").insert(payload);
      if (error) {
        const msg = error.message || "No se pudo publicar.";
        showError(msg);
        return;
      }

      if (titleInput) titleInput.value = "";
      if (bodyInput) bodyInput.value = "";
      await loadPosts();
    } catch {
      showError("Error al publicar.");
    } finally {
      setBusy(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  initCookieGate();
  initSmoothAnchors();
  initLoginForm();
  initRegisterForm();
  initContactForm();
  await initProtectedPage();
  await initAuthLinks();
  initCookieBanner();
  initCookieBlockedPage();
  initSupabaseDownload();
  initOvaDownloads();
  initForum();
});

