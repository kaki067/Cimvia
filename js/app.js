const SESSION_KEY = "cimvia_session_v1";
const COOKIE_KEY = "cimvia_cookie_consent_v1";
const THEME_KEY = "cimvia_theme_v1";
const RETURN_TO_KEY = "cimvia_return_to_v1";

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

function isAllowedWhenRejected(pathname) {
  const allow = new Set(["/cookies.html", "/privacidad.html", "/cookies-bloqueado.html"]);
  return allow.has(pathname);
}

function initCookieGate() {
  const consent = getCookieConsent();
  if (consent !== "rejected") return;

  const pathname = window.location.pathname.endsWith("/")
    ? "/index.html"
    : window.location.pathname;

  if (isAllowedWhenRejected(pathname)) return;

  storeReturnTo(window.location.href);
  redirectTo("cookies-bloqueado.html");
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

    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passInput?.value || "";

    if (!email || !email.includes("@")) {
      showError("Introduce un correo válido.");
      emailInput?.focus();
      return;
    }
    if (!password || password.length < 4) {
      showError("Introduce una contraseña válida.");
      passInput?.focus();
      return;
    }

    setSession(email);
    redirectTo("panel.html");
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

function initProtectedPage() {
  const requiresAuth = document.body?.getAttribute("data-requires-auth") === "true";
  if (!requiresAuth) return;
  const session = getSession();
  if (!session) redirectTo("login.html");

  const emailSlot = document.querySelector("[data-session-email]");
  if (emailSlot && session?.email) emailSlot.textContent = session.email;

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      redirectTo("index.html");
    });
  }
}

function initAuthLinks() {
  const session = getSession();
  const loginLinks = document.querySelectorAll("[data-auth-link]");
  for (const link of loginLinks) {
    const mode = link.getAttribute("data-auth-link");
    if (mode === "login") {
      link.setAttribute("href", session ? "panel.html" : "login.html");
      link.textContent = session ? "Panel" : "Iniciar sesión";
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
    redirectTo("cookies-bloqueado.html");
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
      window.location.href = back || "index.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initCookieGate();
  initSmoothAnchors();
  initLoginForm();
  initContactForm();
  initProtectedPage();
  initAuthLinks();
  initCookieBanner();
  initCookieBlockedPage();
});

