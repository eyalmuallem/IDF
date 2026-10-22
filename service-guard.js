
(() => {
  "use strict";

  const URL = String(
    window.DIGICARE_MASTER_CONTROL_URL || ""
  ).trim();

  const VALID_URL =
    /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/i.test(URL);

  const POLL_MS = 10000;
  const TIMEOUT_MS = 8000;
  const LOCK_ID = "digicare-master-lock";
  const LOCK_CLASS = "digicare-master-locked";

  let locked = true;
  let requestId = 0;

  // Block the screen immediately, including on refresh.
  document.documentElement.classList.add(LOCK_CLASS);

  const style = document.createElement("style");

  style.textContent = `
    html.${LOCK_CLASS},
    html.${LOCK_CLASS} body {
      overflow: hidden !important;
    }

    html.${LOCK_CLASS} body > :not(#${LOCK_ID}) {
      visibility: hidden !important;
      pointer-events: none !important;
    }

    #${LOCK_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #07111f;
      color: white;
      font-family: Arial, sans-serif;
      direction: rtl;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }

    #${LOCK_ID} .lock-card {
      background: #111827;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 35px;
      width: min(500px, 100%);
      box-sizing: border-box;
    }

    #${LOCK_ID} h1 {
      font-size: 28px;
      margin: 0 0 15px;
    }

    
#${LOCK_ID} p {
  font-size: 18px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 100%;
}

#${LOCK_ID} a {
  color: #93c5fd;
  text-decoration: underline;
  overflow-wrap: anywhere;
  word-break: break-word;
}

#${LOCK_ID} .lock-card {
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
}

  `;

  (document.head || document.documentElement)
    .appendChild(style);

  function showLock(message) {
    if (!document.body) return;

    let overlay = document.getElementById(LOCK_ID);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = LOCK_ID;

      overlay.innerHTML = `
        <div class="lock-card">
          <h1>השירות הושבת זמנית</h1>
          <p class="lock-message"></p>
          <p>לפרטים יש לפנות למנהל המערכת.</p>
        </div>
      `;

      document.body.appendChild(overlay);
    }

    
const messageElement =
  overlay.querySelector(".lock-message");

const messageText =
  message ||
  "הגישה למערכת נחסמה על ידי מנהל המערכת.";

messageElement.replaceChildren();

const parts = messageText.split(
  /(https?:\/\/[^\s<>"']+)/gi
);

parts.forEach(part => {
  if (/^https?:\/\//i.test(part)) {
    const link = document.createElement("a");
    link.href = part;
    link.textContent = part;
    link.className = "lock-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    messageElement.appendChild(link);
  } else {
    messageElement.appendChild(
      document.createTextNode(part)
    );
  }
});

  }

  function setLocked(value, message) {
    locked = Boolean(value);

    if (locked) {
      document.documentElement.classList.add(LOCK_CLASS);
      showLock(message);
    } else {
      document.getElementById(LOCK_ID)?.remove();
      document.documentElement.classList.remove(LOCK_CLASS);
    }
  }

  async function checkStatus() {
    const currentRequest = ++requestId;

    if (!VALID_URL) {
      setLocked(true, "שרת הבקרה אינו מוגדר.");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TIMEOUT_MS
    );

    try {
      const response = await fetch(
        URL + "?action=status&_=" + Date.now(),
        {
          cache: "no-store",
          credentials: "omit",
          redirect: "follow",
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error("Status check failed");
      }

      const data = await response.json();

      if (currentRequest !== requestId) return;

      // Only an explicit approval from the server unlocks.
      if (data && data.enabled === true) {
        setLocked(false);
      } else {
        setLocked(true, data?.message);
      }

    } catch (error) {
      if (currentRequest !== requestId) return;

      setLocked(
        true,
        "לא ניתן לאמת את מצב המערכת. הגישה חסומה."
      );

      console.warn("Master Control:", error);

    } finally {
      clearTimeout(timeout);
    }
  }

  // Block ordinary interactions while locked.
  ["click", "submit", "keydown", "pointerdown"].forEach(
    eventName => {
      document.addEventListener(
        eventName,
        event => {
         
if (locked) {
  const isLockLink =
    event.target instanceof Element &&
    event.target.closest(
      `#${LOCK_ID} a.lock-link`
    );

  if (
    isLockLink &&
    (
      eventName !== "keydown" ||
      event.key === "Enter"
    )
  ) {
    return;
  }

  if (
    eventName === "keydown" &&
    event.key === "Tab"
  ) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
}

        },
        true
      );
    }
  );

  function initialize() {
    setLocked(true);
    checkStatus();
    setInterval(checkStatus, POLL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

  window.addEventListener("pageshow", checkStatus);
  window.addEventListener("focus", checkStatus);
  window.addEventListener("online", checkStatus);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkStatus();
  });

})();
