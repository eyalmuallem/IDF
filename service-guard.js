(() => {
  "use strict";

  const POLL_MS = 30000;
  const url = String(window.DIGICARE_MASTER_CONTROL_URL || "").trim();
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i.test(url);
  if (!configured) return; // Fail open until the owner finishes one-time setup.

  let overlay = null;
  let lastLocked = false;

  function buildOverlay(message) {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "digicare-master-lock";
    overlay.setAttribute("role", "alert");
    overlay.innerHTML = `
      <div class="digicare-master-lock-card">
        <div class="digicare-master-lock-icon">🔒</div>
        <h1>השירות הושבת זמנית</h1>
        <p class="digicare-master-lock-message"></p>
        <p class="digicare-master-lock-note">לפרטים יש לפנות למנהל המערכת.</p>
      </div>`;
    const style = document.createElement("style");
    style.textContent = `
      #digicare-master-lock{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,10,20,.96);font-family:Arial,sans-serif;direction:rtl;text-align:center;color:#fff}
      #digicare-master-lock .digicare-master-lock-card{width:min(520px,100%);padding:36px 28px;border-radius:24px;background:#111827;border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 70px rgba(0,0,0,.45)}
      #digicare-master-lock .digicare-master-lock-icon{font-size:46px;margin-bottom:12px}
      #digicare-master-lock h1{margin:0 0 14px;font-size:30px}
      #digicare-master-lock p{margin:8px 0;line-height:1.6}
      #digicare-master-lock .digicare-master-lock-message{font-size:18px}
      #digicare-master-lock .digicare-master-lock-note{opacity:.7;font-size:14px}
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    return overlay;
  }

  function setLocked(locked, message) {
    lastLocked = !!locked;
    if (locked) {
      const el = buildOverlay(message);
      el.querySelector('.digicare-master-lock-message').textContent = message || 'הגישה למערכת נחסמה על ידי מנהל המערכת.';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else if (overlay) {
      overlay.remove();
      overlay = null;
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  }

  async function check() {
    try {
      const res = await fetch(url + '?action=status&_=' + Date.now(), { cache: 'no-store', redirect: 'follow' });
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json();
      setLocked(data.enabled === false, data.message);
    } catch (err) {
      // Network/control-service failures do not lock the product automatically.
      console.warn('[Master Control] status check failed:', err);
      if (lastLocked) setLocked(true, 'הגישה למערכת נחסמה על ידי מנהל המערכת.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check, { once: true });
  } else {
    check();
  }
  setInterval(check, POLL_MS);
})();
