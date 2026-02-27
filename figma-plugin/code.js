// QueenBee UI Flow Generator — Figma Plugin
// Paste this into Plugins > Development > Open Console (no UI needed)
// OR load as a local plugin via manifest.json

(async () => {
  // ─── Font loading ──────────────────────────────────────────────────────────
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });

  // ─── Design tokens ─────────────────────────────────────────────────────────
  const C = {
    bg:          { r: 0.071, g: 0.071, b: 0.090, a: 1 }, // #121217
    surface:     { r: 0.110, g: 0.110, b: 0.141, a: 1 }, // #1C1C24
    elevated:    { r: 0.145, g: 0.145, b: 0.188, a: 1 }, // #252530
    border:      { r: 0.200, g: 0.200, b: 0.267, a: 1 }, // #333344
    accent:      { r: 0.482, g: 0.310, b: 1.000, a: 1 }, // #7B4FFF
    accentDim:   { r: 0.482, g: 0.310, b: 1.000, a: 0.18 },
    green:       { r: 0.200, g: 0.831, b: 0.490, a: 1 }, // #33D47D
    greenDim:    { r: 0.200, g: 0.831, b: 0.490, a: 0.15 },
    orange:      { r: 1.000, g: 0.647, b: 0.000, a: 1 }, // #FFA500
    red:         { r: 1.000, g: 0.337, b: 0.337, a: 1 }, // #FF5656
    yellow:      { r: 1.000, g: 0.843, b: 0.286, a: 1 }, // #FFD749
    txtPrimary:  { r: 0.953, g: 0.953, b: 0.969, a: 1 }, // #F3F3F7
    txtSecondary:{ r: 0.553, g: 0.553, b: 0.647, a: 1 }, // #8D8DA5
    txtMuted:    { r: 0.353, g: 0.353, b: 0.420, a: 1 }, // #5A5A6B
    arrow:       { r: 0.482, g: 0.310, b: 1.000, a: 0.55 },
    sectionBg:   { r: 0.102, g: 0.102, b: 0.129, a: 1 },
  };

  // ─── Low-level helpers ─────────────────────────────────────────────────────
  function fill(color) { return [{ type: "SOLID", color }]; }
  function stroke(color, weight = 1) {
    return [{ type: "SOLID", color, opacity: color.a ?? 1 }];
  }

  function rect(x, y, w, h, color, parent, opts = {}) {
    const r = figma.createRectangle();
    r.x = x; r.y = y; r.resize(w, h);
    r.fills = fill(color);
    r.cornerRadius = opts.radius ?? 0;
    if (opts.stroke) { r.strokes = stroke(opts.stroke, opts.strokeW ?? 1); r.strokeWeight = opts.strokeW ?? 1; }
    if (opts.name) r.name = opts.name;
    parent.appendChild(r);
    return r;
  }

  function txt(content, x, y, fontSize, color, parent, opts = {}) {
    const t = figma.createText();
    t.x = x; t.y = y;
    t.fontSize = fontSize;
    t.fontName = { family: "Inter", style: opts.weight ?? "Regular" };
    t.fills = fill(color);
    t.characters = content;
    if (opts.width) t.textAutoResize = "HEIGHT", t.resize(opts.width, t.height);
    if (opts.align) t.textAlignHorizontal = opts.align;
    if (opts.name) t.name = opts.name;
    parent.appendChild(t);
    return t;
  }

  function frame(name, x, y, w, h, color) {
    const f = figma.createFrame();
    f.name = name; f.x = x; f.y = y;
    f.resize(w, h);
    f.fills = fill(color);
    f.clipsContent = true;
    return f;
  }

  function badge(label, x, y, bgColor, textColor, parent, radius = 4) {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.fontSize = 10;
    t.characters = label;
    t.fills = fill(textColor);
    const tw = t.width, th = t.height;
    const bg = figma.createRectangle();
    bg.resize(tw + 12, th + 4);
    bg.fills = fill(bgColor);
    bg.cornerRadius = radius;
    bg.x = x; bg.y = y;
    t.x = x + 6; t.y = y + 2;
    parent.appendChild(bg);
    parent.appendChild(t);
    return { bg, t, w: tw + 12, h: th + 4 };
  }

  function divider(x, y, w, parent) {
    const l = figma.createLine();
    l.x = x; l.y = y;
    l.resize(w, 0);
    l.strokes = [{ type: "SOLID", color: C.border }];
    l.strokeWeight = 1;
    parent.appendChild(l);
    return l;
  }

  function arrowLine(x1, y1, x2, y2, parent) {
    const vec = figma.createVector();
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    // arrowhead triangle
    const ax = x2 - ux * 12 - uy * 6;
    const ay = y2 - uy * 12 + ux * 6;
    const bx = x2 - ux * 12 + uy * 6;
    const by = y2 - uy * 12 - ux * 6;
    vec.vectorNetwork = {
      vertices: [
        { x: x1, y: y1 }, { x: x2, y: y2 },
        { x: ax, y: ay }, { x: bx, y: by },
      ],
      segments: [
        { start: 0, end: 1 },
        { start: 1, end: 2 },
        { start: 1, end: 3 },
      ],
      regions: [],
    };
    vec.strokes = [{ type: "SOLID", color: C.arrow }];
    vec.strokeWeight = 2;
    vec.fills = [];
    parent.appendChild(vec);
    return vec;
  }

  function sectionTitle(label, x, y, parent) {
    const bg = figma.createRectangle();
    bg.x = x - 8; bg.y = y - 4;
    bg.fills = [{ type: "SOLID", color: C.accent, opacity: 0.12 }];
    bg.cornerRadius = 6;
    const t = txt(label, x, y, 13, C.yellow, parent, { weight: "Semi Bold" });
    bg.resize(t.width + 16, t.height + 8);
    parent.insertChild(parent.children.indexOf(t), bg);
    return { bg, t };
  }

  // ─── Reusable UI patterns ──────────────────────────────────────────────────
  function inputField(x, y, w, label, placeholder, parent) {
    rect(x, y, w, 36, C.elevated, parent, { radius: 6, stroke: C.border, strokeW: 1 });
    txt(label, x, y - 18, 11, C.txtSecondary, parent, { weight: "Medium" });
    txt(placeholder, x + 10, y + 10, 12, C.txtMuted, parent);
  }

  function buttonPrimary(x, y, w, label, parent) {
    rect(x, y, w, 38, C.accent, parent, { radius: 8 });
    txt(label, x + w / 2 - 30, y + 11, 13, C.txtPrimary, parent, { weight: "Semi Bold" });
  }

  function buttonOutline(x, y, w, label, parent) {
    rect(x, y, w, 38, C.surface, parent, { radius: 8, stroke: C.border, strokeW: 1 });
    txt(label, x + w / 2 - 30, y + 11, 13, C.txtPrimary, parent, { weight: "Medium" });
  }

  function iconBox(x, y, size, color, parent) {
    rect(x, y, size, size, color, parent, { radius: size * 0.25 });
  }

  function pill(label, x, y, color, textColor, parent) {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Medium" };
    t.fontSize = 10;
    t.characters = label;
    t.fills = fill(textColor);
    const tw = t.width;
    const bg = figma.createRectangle();
    bg.resize(tw + 16, 20);
    bg.fills = [{ type: "SOLID", color, opacity: 0.2 }];
    bg.cornerRadius = 10;
    bg.strokes = [{ type: "SOLID", color }];
    bg.strokeWeight = 1;
    bg.x = x; bg.y = y;
    t.x = x + 8; t.y = y + 4;
    parent.appendChild(bg);
    parent.appendChild(t);
    return tw + 16;
  }

  // ─── Page setup ───────────────────────────────────────────────────────────
  const page = figma.currentPage;
  page.name = "QueenBee – Full UI Flow";

  // Root container
  const root = frame("🐝 QueenBee UI Flow", 0, 0, 6400, 4800, C.sectionBg);
  page.appendChild(root);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — AUTHENTICATION FLOW (y=80)
  // ═══════════════════════════════════════════════════════════════════════════
  sectionTitle("AUTH FLOW  ·  LoginPage → AuthCallback → OnboardingFlow (4 steps) → Dashboard", 60, 48, root);

  // ── 1A. LoginPage ──────────────────────────────────────────────────────────
  const login = frame("LoginPage", 60, 100, 390, 780, C.bg);
  root.appendChild(login);
  // top bar
  rect(0, 0, 390, 3, C.accent, login);
  // logo
  rect(155, 64, 80, 80, C.accentDim, login, { radius: 20, name: "Logo" });
  txt("🐝", 183, 82, 36, C.accent, login);
  txt("QueenBee", 127, 156, 22, C.txtPrimary, login, { weight: "Bold" });
  txt("AI-native development platform", 82, 184, 12, C.txtSecondary, login, { width: 226, align: "CENTER" });

  divider(40, 220, 310, login);

  // offline badge
  badge("● Backend Online", 130, 234, C.greenDim, C.green, login);

  // GitHub OAuth button
  rect(40, 270, 310, 48, C.surface, login, { radius: 10, stroke: C.border });
  txt("🐙", 56, 285, 20, C.txtPrimary, login);
  txt("Sign in with GitHub", 88, 287, 14, C.txtPrimary, login, { weight: "Medium" });
  badge("Recommended", 240, 281, C.accentDim, C.accent, login);

  // Device flow note
  txt("Device flow for Electron", 90, 322, 10, C.txtMuted, login);

  // Google button
  rect(40, 336, 310, 44, C.surface, login, { radius: 10, stroke: C.border });
  txt("G", 62, 348, 18, C.red, login, { weight: "Bold" });
  txt("Continue with Google", 88, 350, 14, C.txtPrimary, login, { weight: "Medium" });

  // divider
  txt("─────────── or ───────────", 60, 394, 11, C.txtMuted, login);

  // Manual token
  inputField(40, 430, 310, "Personal Access Token", "Paste your token here…", login);
  rect(40, 430, 310, 36, C.elevated, login, { radius: 6, stroke: C.border });
  txt("Paste your token…", 52, 441, 12, C.txtMuted, login);
  buttonPrimary(40, 478, 310, "Authenticate with Token", login);

  divider(40, 534, 310, login);

  // Dev bypass
  rect(40, 548, 310, 32, { r: 0.2, g: 0.83, b: 0.49, a: 0.1 }, login, { radius: 6, stroke: C.greenDim });
  txt("⚡ Dev bypass (skip auth)", 80, 558, 11, C.green, login, { weight: "Medium" });

  // footer
  txt("QueenBee v2.0  ·  Secure local auth", 82, 720, 10, C.txtMuted, login);
  txt("● Built on Claude claude-sonnet-4-6", 112, 738, 10, C.accent, login);

  // frame label
  txt("LoginPage.tsx", 60, 886, 11, C.txtSecondary, root, { weight: "Medium" });

  // ── 1B. AuthCallback ───────────────────────────────────────────────────────
  const callback = frame("AuthCallback", 510, 100, 390, 780, C.bg);
  root.appendChild(callback);
  rect(0, 0, 390, 3, C.accent, callback);

  rect(155, 64, 80, 80, C.accentDim, callback, { radius: 20 });
  txt("🐝", 183, 82, 36, C.accent, callback);
  txt("Authenticating…", 105, 162, 18, C.txtPrimary, callback, { weight: "Bold" });

  // spinner placeholder
  rect(167, 210, 56, 56, C.surface, callback, { radius: 28, stroke: C.accent, strokeW: 3 });
  txt("↻", 183, 225, 22, C.accent, callback, { weight: "Bold" });

  txt("Processing OAuth response", 78, 280, 12, C.txtSecondary, callback, { width: 234, align: "CENTER" });

  divider(40, 330, 310, callback);

  // Success state (shown below)
  txt("Success state:", 40, 350, 11, C.txtMuted, callback, { weight: "Medium" });
  rect(40, 368, 310, 80, C.elevated, callback, { radius: 10, stroke: { r: 0.2, g: 0.83, b: 0.49, a: 0.4 }, strokeW: 1 });
  rect(52, 380, 44, 44, C.greenDim, callback, { radius: 22 });
  txt("👤", 65, 395, 18, C.green, callback);
  txt("Authentication successful", 104, 378, 12, C.green, callback, { weight: "Semi Bold" });
  txt("Welcome back, @username", 104, 396, 11, C.txtSecondary, callback);
  txt("Redirecting to dashboard…", 104, 414, 10, C.txtMuted, callback);

  divider(40, 466, 310, callback);

  txt("Error state:", 40, 486, 11, C.txtMuted, callback, { weight: "Medium" });
  rect(40, 504, 310, 64, C.elevated, callback, { radius: 10, stroke: { r: 1, g: 0.34, b: 0.34, a: 0.4 }, strokeW: 1 });
  txt("⚠", 60, 520, 18, C.red, callback);
  txt("Authorization failed", 88, 518, 12, C.red, callback, { weight: "Semi Bold" });
  txt("Invalid or expired OAuth code.", 88, 536, 11, C.txtSecondary, callback);
  buttonOutline(40, 586, 310, "↩ Try Again", callback);

  txt("AuthCallback.tsx", 510, 886, 11, C.txtSecondary, root, { weight: "Medium" });

  // ── 1C–1F. OnboardingFlow (4 steps) ───────────────────────────────────────
  const onboardSteps = [
    {
      label: "Welcome",
      subtitle: "What you get",
      body: (f) => {
        rect(40, 240, 310, 60, C.elevated, f, { radius: 10 });
        txt("🤖  AI Models", 60, 255, 13, C.txtPrimary, f, { weight: "Medium" });
        txt("Claude, GPT-4, Gemini, Ollama", 60, 273, 11, C.txtSecondary, f);
        rect(40, 310, 310, 60, C.elevated, f, { radius: 10 });
        txt("🔀  Git Forges", 60, 325, 13, C.txtPrimary, f, { weight: "Medium" });
        txt("GitHub, GitLab, Bitbucket", 60, 343, 11, C.txtSecondary, f);
        rect(40, 380, 310, 60, C.elevated, f, { radius: 10 });
        txt("🔒  Security", 60, 395, 13, C.txtPrimary, f, { weight: "Medium" });
        txt("Local keys, zero telemetry", 60, 413, 11, C.txtSecondary, f);
      }
    },
    {
      label: "Providers",
      subtitle: "Connect AI providers",
      body: (f) => {
        const providers = ["Claude (Anthropic)", "OpenAI GPT-4", "Gemini Pro", "Ollama (local)"];
        providers.forEach((p, i) => {
          const y = 240 + i * 78;
          rect(40, y, 310, 64, C.elevated, f, { radius: 10, stroke: C.border, strokeW: 1 });
          iconBox(52, y + 12, 40, C.accentDim, f);
          txt(p, 100, y + 10, 13, C.txtPrimary, f, { weight: "Medium" });
          txt(i < 2 ? "OAuth  /  API Key" : i === 2 ? "OAuth flow" : "Base URL  ·  Local", 100, y + 28, 10, C.txtSecondary, f);
          // test button
          rect(276, y + 20, 62, 24, C.accentDim, f, { radius: 6 });
          txt("Test ✓", 283, y + 26, 10, C.accent, f, { weight: "Medium" });
          // drag handle
          txt("⠿", 46, y + 24, 14, C.txtMuted, f);
        });
      }
    },
    {
      label: "Forges",
      subtitle: "Connect repositories",
      body: (f) => {
        rect(40, 240, 310, 72, C.elevated, f, { radius: 10 });
        txt("🐙  GitHub", 70, 255, 14, C.txtPrimary, f, { weight: "Semi Bold" });
        txt("Connect your repositories & PRs", 70, 275, 11, C.txtSecondary, f);
        buttonPrimary(40, 296, 310, "Authorize GitHub", f);
        rect(40, 330, 310, 72, C.elevated, f, { radius: 10 });
        txt("G  Google", 70, 345, 14, C.txtPrimary, f, { weight: "Semi Bold" });
        txt("Workspace & Drive integration", 70, 365, 11, C.txtSecondary, f);
        buttonOutline(40, 386, 310, "Connect Google", f);
      }
    },
    {
      label: "Complete",
      subtitle: "You're all set!",
      body: (f) => {
        rect(155, 230, 80, 80, C.greenDim, f, { radius: 40 });
        txt("✓", 183, 250, 36, C.green, f, { weight: "Bold" });
        txt("Setup complete", 120, 326, 16, C.txtPrimary, f, { weight: "Bold" });
        const items = ["3 AI providers connected", "GitHub repositories linked", "Secure key vault ready"];
        items.forEach((item, i) => {
          txt("✔ " + item, 110, 360 + i * 22, 12, C.green, f);
        });
        buttonPrimary(40, 450, 310, "Enter QueenBee →", f);
      }
    }
  ];

  onboardSteps.forEach((step, i) => {
    const xOff = 960 + i * 450;
    const f = frame(`Onboarding — ${step.label}`, xOff, 100, 390, 780, C.bg);
    root.appendChild(f);
    rect(0, 0, 390, 3, C.accent, f);

    // Step dots
    for (let d = 0; d < 4; d++) {
      const dot = figma.createEllipse();
      dot.x = 157 + d * 20; dot.y = 32;
      dot.resize(10, 10);
      dot.fills = fill(d === i ? C.accent : C.border);
      f.appendChild(dot);
    }

    txt(`Step ${i + 1} of 4`, 157, 48, 10, C.txtMuted, f, { weight: "Medium" });
    txt(step.label, 40, 76, 22, C.txtPrimary, f, { weight: "Bold" });
    txt(step.subtitle, 40, 104, 13, C.txtSecondary, f);
    divider(40, 128, 310, f);

    // Progress bar
    rect(40, 140, 310, 6, C.border, f, { radius: 3 });
    rect(40, 140, Math.round(310 * (i + 1) / 4), 6, C.accent, f, { radius: 3 });

    step.body(f);

    // Nav buttons
    if (i > 0) buttonOutline(40, 690, 148, "← Back", f);
    buttonPrimary(i > 0 ? 202 : 40, 690, i > 0 ? 148 : 310, i < 3 ? "Next →" : "Launch →", f);

    txt(`OnboardingFlow.tsx  ·  step ${i + 1}`, xOff, 886, 11, C.txtSecondary, root, { weight: "Medium" });
  });

  // ─── Auth flow arrows ──────────────────────────────────────────────────────
  // Login → AuthCallback
  arrowLine(454, 490, 508, 490, root);
  // AuthCallback → Onboard step 1
  arrowLine(904, 490, 958, 490, root);
  // Onboard steps
  for (let i = 0; i < 3; i++) {
    arrowLine(1348 + i * 450, 490, 1402 + i * 450, 490, root);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — MAIN DASHBOARD: CodexLayout (y=1000)
  // ═══════════════════════════════════════════════════════════════════════════
  sectionTitle("MAIN DASHBOARD  ·  CodexLayout.tsx", 60, 960, root);

  const dashY = 1000;
  const dash = frame("CodexLayout — Full Dashboard", 60, dashY, 1440, 900, C.bg);
  root.appendChild(dash);

  // ── Sidebar (240px) ──────────────────────────────────────────────────────
  const sidebar = frame("Sidebar", 0, 0, 240, 900, C.surface);
  dash.appendChild(sidebar);
  rect(0, 0, 240, 900, C.surface, sidebar);

  // Sidebar header
  rect(0, 0, 240, 52, C.elevated, sidebar, { name: "SidebarHeader" });
  rect(12, 14, 28, 28, C.accentDim, sidebar, { radius: 6 });
  txt("🐝", 16, 18, 16, C.accent, sidebar);
  txt("QueenBee", 48, 18, 13, C.txtPrimary, sidebar, { weight: "Bold" });
  // project picker
  rect(160, 16, 68, 24, C.elevated, sidebar, { radius: 6, stroke: C.border, strokeW: 1 });
  txt("Project ▾", 164, 22, 9, C.txtSecondary, sidebar);

  divider(0, 52, 240, sidebar);

  // Tab strip: Build / Automations / Skills / Triage
  const sidebarTabs = ["Build", "Auto", "Skills", "Triage"];
  sidebarTabs.forEach((tab, i) => {
    const tx = i * 60;
    if (i === 0) rect(tx, 54, 60, 28, C.accentDim, sidebar, { name: `Tab_${tab}` });
    txt(tab, tx + 8, 61, 9, i === 0 ? C.accent : C.txtSecondary, sidebar, { weight: i === 0 ? "Semi Bold" : "Regular" });
  });

  divider(0, 82, 240, sidebar);

  // New thread button
  rect(12, 90, 216, 32, C.accentDim, sidebar, { radius: 7, stroke: C.accent, strokeW: 1 });
  txt("+ New Thread", 74, 99, 11, C.accent, sidebar, { weight: "Semi Bold" });

  // Thread list
  const threads = ["Refactor AgentSession.ts", "Fix ProposalService bug", "Add socket events", "Review PR #142"];
  threads.forEach((t, i) => {
    const ty = 134 + i * 52;
    if (i === 0) rect(12, ty, 216, 44, C.elevated, sidebar, { radius: 7 });
    rect(18, ty + 10, 6, 24, i === 0 ? C.accent : "transparent", sidebar, { radius: 3 });
    txt(t, 30, ty + 8, 11, i === 0 ? C.txtPrimary : C.txtSecondary, sidebar, { weight: i === 0 ? "Medium" : "Regular", width: 190 });
    txt(i === 0 ? "Active" : ["2 hrs ago", "Yesterday", "3 days ago"][i - 1], 30, ty + 26, 9, C.txtMuted, sidebar);
  });

  divider(0, 360, 240, sidebar);

  // Settings link
  rect(12, 860, 216, 32, C.elevated, sidebar, { radius: 6 });
  txt("⚙  Settings", 70, 869, 11, C.txtSecondary, sidebar);

  // ── Top toolbar ─────────────────────────────────────────────────────────
  rect(240, 0, 1200, 48, C.elevated, dash, { name: "Toolbar" });
  divider(240, 48, 1200, dash);
  // Breadcrumb
  txt("Projects  /  QueenBee  /  Refactor AgentSession.ts", 256, 16, 11, C.txtSecondary, dash);
  // Toolbar icons
  const tbIcons = ["⌘K", "🔍", "⚡", "🧬", "👁", "⚙"];
  tbIcons.forEach((ic, i) => {
    rect(1388 - i * 34, 10, 28, 28, C.border, dash, { radius: 6 });
    txt(ic, 1393 - i * 34, 17, 11, C.txtSecondary, dash);
  });

  // ── Main content area ────────────────────────────────────────────────────
  const mainArea = frame("AgenticWorkbench", 240, 48, 1200, 804, C.bg);
  dash.appendChild(mainArea);

  // Message thread area (top 680px)
  rect(0, 0, 1200, 680, C.bg, mainArea, { name: "MessageArea" });

  // User message bubble
  rect(600, 40, 580, 60, C.elevated, mainArea, { radius: 12 });
  txt("Refactor AgentSession.ts to use async/await throughout", 620, 52, 12, C.txtPrimary, mainArea, { width: 540 });
  txt("You  ·  2:14 PM", 1040, 88, 9, C.txtMuted, mainArea);

  // Agent plan block
  rect(20, 120, 760, 130, C.surface, mainArea, { radius: 12, stroke: C.border, strokeW: 1 });
  txt("📋  Execution Plan", 40, 134, 13, C.accent, mainArea, { weight: "Semi Bold" });
  const steps = ["Read AgentSession.ts ·  identify sync points", "Rewrite with async/await ·  preserve types", "Run tsc to verify no errors", "Commit changes"];
  steps.forEach((s, i) => {
    const ic = i < 2 ? "✓" : i === 2 ? "●" : "○";
    const col = i < 2 ? C.green : i === 2 ? C.accent : C.txtMuted;
    txt(`${ic}  ${s}`, 40, 160 + i * 22, 11, col, mainArea);
  });

  // Tool call block
  rect(20, 270, 580, 80, C.elevated, mainArea, { radius: 10 });
  txt("🔧  Tool: read_file", 40, 284, 12, C.orange, mainArea, { weight: "Semi Bold" });
  txt("path:  proxy-bridge/src/lib/AgentSession.ts", 40, 305, 11, C.txtSecondary, mainArea);
  badge("✓ Success  ·  342 lines read", 40, 322, C.greenDim, C.green, mainArea);

  // Agent response
  rect(20, 370, 1140, 80, C.surface, mainArea, { radius: 12 });
  txt("🤖  QueenBee Agent", 40, 380, 12, C.accent, mainArea, { weight: "Semi Bold" });
  txt("I've identified 14 synchronous patterns in AgentSession.ts. Proceeding with async/await refactor…", 40, 400, 11, C.txtSecondary, mainArea, { width: 1100 });
  badge("claude-sonnet-4-6", 960, 380, C.accentDim, C.accent, mainArea);

  // Plan approval card
  rect(20, 470, 760, 100, C.elevated, mainArea, { radius: 12, stroke: C.accent, strokeW: 1 });
  txt("⚡  Plan Approval Required", 40, 484, 13, C.yellow, mainArea, { weight: "Semi Bold" });
  txt("Agent proposes: Run `tsc --noEmit` to verify types. Approve?", 40, 508, 11, C.txtSecondary, mainArea, { width: 700 });
  buttonPrimary(40, 532, 120, "✓ Approve", mainArea);
  buttonOutline(172, 532, 120, "✗ Reject", mainArea);
  buttonOutline(304, 532, 140, "✏ Modify Plan", mainArea);

  // ── Composer bar ────────────────────────────────────────────────────────
  rect(0, 680, 1200, 4, C.border, mainArea);
  rect(0, 684, 1200, 120, C.surface, mainArea, { name: "ComposerBar" });
  // attach / mention
  rect(12, 700, 32, 32, C.elevated, mainArea, { radius: 8 });
  txt("📎", 17, 706, 16, C.txtSecondary, mainArea);
  rect(52, 700, 32, 32, C.elevated, mainArea, { radius: 8 });
  txt("@", 59, 707, 16, C.txtSecondary, mainArea, { weight: "Bold" });
  // input
  rect(92, 696, 1000, 40, C.elevated, mainArea, { radius: 8, stroke: C.border, strokeW: 1 });
  txt("Message QueenBee… (⌘K for commands)", 104, 708, 12, C.txtMuted, mainArea);
  // send button
  rect(1104, 696, 80, 40, C.accent, mainArea, { radius: 8 });
  txt("Send ↑", 1116, 708, 12, C.txtPrimary, mainArea, { weight: "Semi Bold" });
  // voice / stop
  rect(12, 748, 32, 28, C.elevated, mainArea, { radius: 7 });
  txt("🎤", 16, 753, 14, C.txtSecondary, mainArea);
  txt("⌘+Shift+V for voice  ·  @ to mention files  ·  ⌘K for commands", 56, 753, 10, C.txtMuted, mainArea);

  txt("CodexLayout.tsx  ·  AgenticWorkbench.tsx", 60, dashY + 908, 11, C.txtSecondary, root, { weight: "Medium" });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — SLIDE-IN PANELS (y=2100)
  // ═══════════════════════════════════════════════════════════════════════════
  sectionTitle("SLIDE-IN PANELS  ·  All overlay & side panels", 60, 2060, root);

  const panelsY = 2100;
  const panelW = 380;
  const panelGap = 420;
  const panelH = 760;

  // Helper to create a panel shell
  function panelShell(name, ix, iy, label, accent) {
    const p = frame(name, 60 + ix * panelGap, panelsY + iy * (panelH + 80), panelW, panelH, C.surface);
    root.appendChild(p);
    rect(0, 0, panelW, 3, accent, p);
    rect(0, 3, panelW, 52, C.elevated, p, { name: "PanelHeader" });
    txt(label, 16, 18, 14, C.txtPrimary, p, { weight: "Bold" });
    txt("×", panelW - 28, 16, 18, C.txtSecondary, p, { weight: "Bold" });
    divider(0, 55, panelW, p);
    txt(name, 60 + ix * panelGap, panelsY + iy * (panelH + 80) + panelH + 10, 10, C.txtSecondary, root, { weight: "Medium" });
    return p;
  }

  // ── Panel 1: Sidebar (left-side) — annotated separately ───────────────────
  const pSidebar = panelShell("Sidebar.tsx", 0, 0, "🗂  Sidebar", C.accent);
  const sbTabs2 = ["Build", "Automations", "Skills", "Triage"];
  sbTabs2.forEach((t, i) => {
    rect(14 + i * 87, 64, 82, 26, i === 0 ? C.accentDim : C.elevated, pSidebar, { radius: 5 });
    txt(t, 22 + i * 87, 71, 10, i === 0 ? C.accent : C.txtSecondary, pSidebar, { weight: i === 0 ? "Semi Bold" : "Regular" });
  });
  divider(0, 96, panelW, pSidebar);
  rect(14, 106, panelW - 28, 30, C.accentDim, pSidebar, { radius: 6, stroke: C.accent, strokeW: 1 });
  txt("+ New Thread", 130, 115, 11, C.accent, pSidebar, { weight: "Semi Bold" });
  ["Refactor session", "Fix proxy bug", "Add voice cmd"].forEach((t, i) => {
    rect(14, 146 + i * 54, panelW - 28, 46, i === 0 ? C.elevated : C.surface, pSidebar, { radius: 8 });
    txt(t, 30, 156 + i * 54, 11, C.txtPrimary, pSidebar, { weight: i === 0 ? "Medium" : "Regular" });
    txt(["Active", "2h ago", "Yesterday"][i], 30, 173 + i * 54, 9, C.txtMuted, pSidebar);
    if (i === 0) badge("Active", 260, 158, C.greenDim, C.green, pSidebar);
  });
  txt("PROJECTS", 14, 316, 9, C.txtMuted, pSidebar, { weight: "Semi Bold" });
  ["QueenBee", "VoxYZ", "OpenClaw"].forEach((p, i) => {
    rect(14, 330 + i * 38, panelW - 28, 32, C.elevated, pSidebar, { radius: 6 });
    txt("📁  " + p, 26, 340 + i * 38, 11, C.txtPrimary, pSidebar);
  });
  rect(14, 690, panelW - 28, 32, C.elevated, pSidebar, { radius: 6 });
  txt("⚙  Settings & Preferences", 60, 699, 10, C.txtSecondary, pSidebar);

  // ── Panel 2: EvolutionPanel ────────────────────────────────────────────────
  const pEvo = panelShell("EvolutionPanel.tsx", 1, 0, "🧬  Evolution", C.green);
  const evoTabs = ["Archive", "Config", "Directives", "MCTS"];
  evoTabs.forEach((t, i) => {
    rect(14 + i * 87, 64, 82, 26, i === 0 ? C.greenDim : C.elevated, pEvo, { radius: 5 });
    txt(t, 22 + i * 87, 71, 10, i === 0 ? C.green : C.txtSecondary, pEvo, { weight: i === 0 ? "Semi Bold" : "Regular" });
  });
  divider(0, 96, panelW, pEvo);
  txt("EXPERIENCE ARCHIVE", 14, 106, 9, C.txtMuted, pEvo, { weight: "Semi Bold" });
  const evoEntries = ["Session 041  ·  score 0.87", "Session 040  ·  score 0.81", "Session 039  ·  score 0.74"];
  evoEntries.forEach((e, i) => {
    rect(14, 120 + i * 54, panelW - 28, 46, C.elevated, pEvo, { radius: 8 });
    txt(e, 26, 130 + i * 54, 11, C.txtPrimary, pEvo, { weight: "Medium" });
    const scores = [0.87, 0.81, 0.74];
    const sc = scores[i];
    txt(`Perf ${(sc * 0.7).toFixed(2)}  ·  Novelty ${(sc * 0.3).toFixed(2)}`, 26, 148 + i * 54, 9, C.txtSecondary, pEvo);
    badge("Top-K", 304, 132 + i * 54, C.greenDim, C.green, pEvo);
  });
  txt("DIRECTIVES", 14, 290, 9, C.txtMuted, pEvo, { weight: "Semi Bold" });
  ["Prefer async tool chains", "Increase batch size → 8", "Use ensemble on ambiguous tasks"].forEach((d, i) => {
    rect(14, 304 + i * 38, panelW - 28, 32, C.elevated, pEvo, { radius: 6 });
    txt("→  " + d, 26, 314 + i * 38, 10, C.txtPrimary, pEvo);
  });
  txt("MCTS STATE", 14, 430, 9, C.txtMuted, pEvo, { weight: "Semi Bold" });
  rect(14, 444, panelW - 28, 60, C.elevated, pEvo, { radius: 8 });
  txt("Nodes: 12  ·  Depth: 4  ·  Rollouts: 84", 26, 454, 10, C.txtSecondary, pEvo);
  txt("Best path score: 0.91", 26, 472, 11, C.green, pEvo, { weight: "Medium" });
  txt("sequential → review_revise → ensemble", 26, 490, 9, C.txtMuted, pEvo);

  // ── Panel 3: InspectorPanel ────────────────────────────────────────────────
  const pInspect = panelShell("InspectorPanel.tsx", 2, 0, "👁  Inspector", C.yellow);
  rect(14, 64, panelW - 28, 32, C.elevated, pInspect, { radius: 6, stroke: C.yellow, strokeW: 1 });
  txt("🎯  Pick Element", 100, 72, 12, C.yellow, pInspect, { weight: "Semi Bold" });
  divider(0, 102, panelW, pInspect);
  txt("COMPONENT TREE", 14, 112, 9, C.txtMuted, pInspect, { weight: "Semi Bold" });
  const compTree = [
    { label: "CodexLayout", depth: 0 },
    { label: "Sidebar", depth: 1 },
    { label: "AgenticWorkbench", depth: 1 },
    { label: "ComposerBar", depth: 2 },
    { label: "PlanApprovalCard", depth: 2 },
    { label: "EvolutionPanel [hidden]", depth: 1 },
  ];
  compTree.forEach((c, i) => {
    rect(14, 126 + i * 30, panelW - 28, 26, i === 2 ? C.accentDim : "transparent", pInspect, { radius: 4 });
    txt("  ".repeat(c.depth) + (c.depth > 0 ? "└ " : "") + c.label, 22 + c.depth * 8, 133 + i * 30, 11, i === 2 ? C.accent : C.txtSecondary, pInspect, { weight: i === 2 ? "Medium" : "Regular" });
  });
  divider(0, 318, panelW, pInspect);
  txt("SOURCE MAPPING", 14, 328, 9, C.txtMuted, pInspect, { weight: "Semi Bold" });
  rect(14, 342, panelW - 28, 44, C.elevated, pInspect, { radius: 8 });
  txt("AgenticWorkbench.tsx  :  142", 26, 352, 11, C.accent, pInspect, { weight: "Medium" });
  txt("dashboard/src/components/layout/", 26, 370, 9, C.txtMuted, pInspect);
  txt("PROPS INSPECTOR", 14, 402, 9, C.txtMuted, pInspect, { weight: "Semi Bold" });
  rect(14, 416, panelW - 28, 100, C.elevated, pInspect, { radius: 8 });
  [["onMessage", "fn(content: string)"], ["isAutonomous", "boolean → true"], ["threadId", "string → 'thr_042'"], ["agentCount", "number → 3"]].forEach(([k, v], i) => {
    txt(k + ":", 26, 426 + i * 22, 10, C.txtSecondary, pInspect);
    txt(v, 130, 426 + i * 22, 10, C.txtPrimary, pInspect);
  });

  // ── Panel 4: UniversalAuthModal ────────────────────────────────────────────
  const pAuth = panelShell("UniversalAuthModal.tsx", 3, 0, "🔑  Vault Identity", C.accent);
  const authTabs = ["Identity", "Forges"];
  authTabs.forEach((t, i) => {
    rect(14 + i * 172, 64, 168, 28, i === 0 ? C.accentDim : C.elevated, pAuth, { radius: 6 });
    txt(t, 82 + i * 172, 72, 12, i === 0 ? C.accent : C.txtSecondary, pAuth, { weight: i === 0 ? "Semi Bold" : "Regular" });
  });
  divider(0, 98, panelW, pAuth);
  txt("MASTER API KEY", 14, 108, 9, C.txtMuted, pAuth, { weight: "Semi Bold" });
  rect(14, 122, panelW - 28, 36, C.elevated, pAuth, { radius: 6, stroke: C.border, strokeW: 1 });
  txt("sk-ant-••••••••••••••••••••••", 24, 133, 12, C.txtMuted, pAuth);
  rect(316, 128, 50, 24, C.accentDim, pAuth, { radius: 5 });
  txt("Copy", 325, 134, 10, C.accent, pAuth, { weight: "Medium" });
  txt("MODEL TIERS", 14, 170, 9, C.txtMuted, pAuth, { weight: "Semi Bold" });
  const tiers = [
    { name: "Primary", model: "claude-sonnet-4-6", color: C.accent },
    { name: "Fallback 1", model: "gpt-4o", color: C.orange },
    { name: "Fallback 2", model: "gemini-pro", color: C.green },
    { name: "Local", model: "ollama/llama3", color: C.txtMuted },
  ];
  tiers.forEach((t, i) => {
    rect(14, 184 + i * 56, panelW - 28, 48, C.elevated, pAuth, { radius: 8 });
    txt("⠿", 22, 200 + i * 56, 12, C.txtMuted, pAuth);
    txt(t.name, 38, 190 + i * 56, 10, C.txtSecondary, pAuth, { weight: "Medium" });
    txt(t.model, 38, 206 + i * 56, 12, t.color, pAuth, { weight: "Semi Bold" });
    badge("Active", 290, 196 + i * 56, { r: t.color.r, g: t.color.g, b: t.color.b, a: 0.15 }, t.color, pAuth);
  });
  buttonPrimary(14, 640, panelW - 28, "Save Vault Configuration", pAuth);

  // ROW 2 OF PANELS

  // ── Panel 5: InboxPanel ────────────────────────────────────────────────────
  const pInbox = panelShell("InboxPanel.tsx", 0, 1, "📥  Triage Inbox", C.orange);
  badge("3 unread", 136, 18, { r: 1, g: 0.65, b: 0, a: 0.15 }, C.orange, pInbox);
  divider(0, 55, panelW, pInbox);
  const findings = [
    { sev: "HIGH", title: "AgentSession stuck in loop", status: "unread" },
    { sev: "MED", title: "ProposalService timeout (3s)", status: "fixing" },
    { sev: "LOW", title: "Memory growth in MemoryStore", status: "unread" },
  ];
  const sevColors = { HIGH: C.red, MED: C.orange, LOW: C.yellow };
  findings.forEach((f, i) => {
    rect(14, 70 + i * 96, panelW - 28, 84, C.elevated, pInbox, { radius: 10 });
    badge(f.sev, 26, 82 + i * 96, { ...sevColors[f.sev], a: 0.15 }, sevColors[f.sev], pInbox);
    txt(f.title, 26, 104 + i * 96, 12, C.txtPrimary, pInbox, { weight: "Medium", width: 280 });
    badge(f.status === "unread" ? "● Unread" : "🔧 Fixing", 220, 82 + i * 96,
      f.status === "fixing" ? C.accentDim : { r: 0.5, g: 0.5, b: 0.5, a: 0.1 },
      f.status === "fixing" ? C.accent : C.txtMuted, pInbox);
    rect(26, 130 + i * 96, 56, 18, C.elevated, pInbox, { radius: 4 });
    txt("Archive", 30, 134 + i * 96, 9, C.txtSecondary, pInbox);
    rect(90, 130 + i * 96, 40, 18, C.accentDim, pInbox, { radius: 4 });
    txt("Fix", 99, 134 + i * 96, 9, C.accent, pInbox, { weight: "Semi Bold" });
  });

  // ── Panel 6: CustomizationPanel ───────────────────────────────────────────
  const pCustom = panelShell("CustomizationPanel.tsx", 1, 1, "⚙  Settings", C.accent);
  const settingsTabs = ["Appear", "Skills", "Code", "Plugins", "Integr.", "Config", "Usage", "Secur."];
  settingsTabs.forEach((t, i) => {
    const col = i < 4 ? (i % 4) * 87 : (i % 4) * 87;
    const row = i < 4 ? 0 : 1;
    rect(14 + (i % 4) * 87, 64 + row * 30, 82, 26, i === 0 ? C.accentDim : C.elevated, pCustom, { radius: 5 });
    txt(t, 22 + (i % 4) * 87, 71 + row * 30, 9, i === 0 ? C.accent : C.txtSecondary, pCustom, { weight: i === 0 ? "Semi Bold" : "Regular" });
  });
  divider(0, 126, panelW, pCustom);
  txt("APPEARANCE", 14, 136, 9, C.txtMuted, pCustom, { weight: "Semi Bold" });
  txt("Theme color", 14, 152, 11, C.txtSecondary, pCustom);
  const themeColors = [C.accent, C.green, C.orange, C.red, C.yellow];
  themeColors.forEach((c, i) => {
    const dot = figma.createEllipse();
    dot.x = 14 + i * 28; dot.y = 168;
    dot.resize(20, 20);
    dot.fills = fill(c);
    if (i === 0) { dot.strokes = [{ type: "SOLID", color: C.txtPrimary }]; dot.strokeWeight = 2; }
    pCustom.appendChild(dot);
  });
  txt("Font size", 14, 200, 11, C.txtSecondary, pCustom);
  rect(14, 214, panelW - 28, 24, C.elevated, pCustom, { radius: 4 });
  rect(14, 217, 100, 18, C.accent, pCustom, { radius: 4 });
  txt("13px", 146, 218, 10, C.txtMuted, pCustom);
  txt("Density", 14, 248, 11, C.txtSecondary, pCustom);
  ["Compact", "Default", "Comfortable"].forEach((d, i) => {
    rect(14 + i * 116, 262, 110, 26, i === 1 ? C.accentDim : C.elevated, pCustom, { radius: 5 });
    txt(d, 30 + i * 116, 270, 10, i === 1 ? C.accent : C.txtSecondary, pCustom, { weight: i === 1 ? "Semi Bold" : "Regular" });
  });
  divider(0, 298, panelW, pCustom);
  txt("USAGE STATS", 14, 308, 9, C.txtMuted, pCustom, { weight: "Semi Bold" });
  rect(14, 322, panelW - 28, 64, C.elevated, pCustom, { radius: 8 });
  txt("Today: $0.42  ·  MTD: $12.80", 26, 334, 11, C.txtPrimary, pCustom, { weight: "Medium" });
  txt("claude-sonnet-4-6: 82%  ·  gpt-4o: 18%", 26, 354, 10, C.txtSecondary, pCustom);
  txt("Tools: read_file 34%  ·  bash 28%  ·  write 18%", 26, 372, 10, C.txtSecondary, pCustom);

  // ── Panel 7: DictationOverlay ──────────────────────────────────────────────
  const pDictate = panelShell("DictationOverlay.tsx", 2, 1, "🎤  Voice Input", C.green);
  txt("Listening…", 140, 80, 14, C.green, pDictate, { weight: "Semi Bold" });
  // mic ring animation placeholders
  for (let ring = 3; ring >= 1; ring--) {
    const el = figma.createEllipse();
    el.x = panelW / 2 - ring * 36; el.y = 160 - ring * 36;
    el.resize(ring * 72, ring * 72);
    el.fills = [{ type: "SOLID", color: C.green, opacity: 0.04 * (4 - ring) }];
    el.strokes = [{ type: "SOLID", color: C.green, opacity: 0.15 }];
    el.strokeWeight = 1;
    pDictate.appendChild(el);
  }
  rect(panelW / 2 - 28, 196, 56, 56, C.greenDim, pDictate, { radius: 28 });
  txt("🎤", panelW / 2 - 12, 212, 22, C.green, pDictate);
  txt("Speak your command or message", 56, 276, 11, C.txtSecondary, pDictate, { width: 270, align: "CENTER" });
  divider(0, 314, panelW, pDictate);
  txt("TRANSCRIPTION", 14, 324, 9, C.txtMuted, pDictate, { weight: "Semi Bold" });
  rect(14, 338, panelW - 28, 80, C.elevated, pDictate, { radius: 8 });
  txt('"Refactor the agent session to use async await throughout the file and make sure types are preserved"', 26, 348, 11, C.txtPrimary, pDictate, { width: 340 });
  txt("Processing…", 26, 406, 10, C.green, pDictate);
  rect(14, 440, panelW - 28, 30, C.elevated, pDictate, { radius: 6, stroke: C.border, strokeW: 1 });
  txt("ESC to cancel  ·  ↵ to send", 104, 449, 10, C.txtMuted, pDictate);

  // ── Panel 8: RoundtablePanel ───────────────────────────────────────────────
  const pRound = panelShell("RoundtablePanel.tsx", 3, 1, "🤝  Roundtable", C.accent);
  badge("4 agents", 160, 18, C.accentDim, C.accent, pRound);
  divider(0, 55, panelW, pRound);
  const messages = [
    { agent: "QueenBee-α", msg: "Proposing: Use async iterator for tool streaming", time: "2:14" },
    { agent: "QueenBee-β", msg: "Challenge: Async iterators add 12% overhead. Prefer Promise.all chain", time: "2:15" },
    { agent: "QueenBee-α", msg: "Score: 78. Accepting mutation — will use Promise.all", time: "2:15" },
    { agent: "Orchestrator", msg: "Consensus reached. Score 84. Proceeding.", time: "2:16" },
  ];
  messages.forEach((m, i) => {
    const isOrch = m.agent === "Orchestrator";
    rect(14, 70 + i * 100, panelW - 28, 88, C.elevated, pRound, { radius: 10 });
    badge(m.agent, 26, 80 + i * 100, isOrch ? C.greenDim : C.accentDim, isOrch ? C.green : C.accent, pRound);
    txt(m.msg, 26, 104 + i * 100, 11, C.txtPrimary, pRound, { width: 320 });
    txt(m.time, 320, 80 + i * 100, 9, C.txtMuted, pRound);
  });
  txt("CONSENSUS SCORE", 14, 484, 9, C.txtMuted, pRound, { weight: "Semi Bold" });
  rect(14, 498, panelW - 28, 44, C.elevated, pRound, { radius: 8 });
  rect(26, 510, 220, 10, C.border, pRound, { radius: 5 });
  rect(26, 510, 196, 10, C.green, pRound, { radius: 5 });
  txt("84 / 100  →  Approved to ship", 26, 526, 11, C.green, pRound, { weight: "Semi Bold" });

  // ROW 3 OF PANELS

  // ── Panel 9: AgentStepsPanel ──────────────────────────────────────────────
  const pSteps = panelShell("AgentStepsPanel.tsx", 0, 2, "📋  Agent Steps", C.accent);
  txt("CURRENT PLAN", 14, 64, 9, C.txtMuted, pSteps, { weight: "Semi Bold" });
  txt("Goal: Refactor AgentSession.ts", 14, 78, 11, C.txtPrimary, pSteps, { weight: "Medium", width: panelW - 28 });
  const stepList = [
    { label: "Read AgentSession.ts", status: "success" },
    { label: "Identify sync patterns", status: "success" },
    { label: "Rewrite with async/await", status: "running" },
    { label: "Run tsc --noEmit", status: "pending" },
    { label: "Commit & push", status: "pending" },
  ];
  const stIcons = { success: "✓", running: "●", pending: "○" };
  const stColors = { success: C.green, running: C.accent, pending: C.txtMuted };
  stepList.forEach((s, i) => {
    rect(14, 100 + i * 60, panelW - 28, 52, s.status === "running" ? C.elevated : C.surface, pSteps, { radius: 8, stroke: s.status === "running" ? C.accent : C.border, strokeW: s.status === "running" ? 1 : 0 });
    rect(22, 116 + i * 60, 8, 8, stColors[s.status], pSteps, { radius: 4 });
    txt(stIcons[s.status] + "  " + s.label, 36, 108 + i * 60, 12, stColors[s.status], pSteps, { weight: s.status === "running" ? "Semi Bold" : "Regular" });
    if (s.status === "running") {
      badge("In progress", 240, 110 + i * 60, C.accentDim, C.accent, pSteps);
      txt("Rewriting 14 functions…", 36, 126 + i * 60, 10, C.txtMuted, pSteps);
    }
  });
  divider(0, 412, panelW, pSteps);
  buttonOutline(14, 424, 172, "Pause Agent", pSteps);
  rect(14 + 180, 424, 172, 36, C.red, pSteps, { radius: 8 });
  txt("Abort Plan", 14 + 210, 436, 12, C.txtPrimary, pSteps, { weight: "Semi Bold" });

  // ── Panel 10: GlobalCommandBar ────────────────────────────────────────────
  const pCmd = panelShell("GlobalCommandBar.tsx", 1, 2, "⌘K  Command Bar", C.accent);
  rect(14, 64, panelW - 28, 40, C.elevated, pCmd, { radius: 8, stroke: C.accent, strokeW: 1 });
  txt("🔍  Search commands, files, agents…", 26, 76, 12, C.txtMuted, pCmd);
  txt("⌘K", 334, 76, 11, C.accent, pCmd, { weight: "Semi Bold" });
  divider(0, 110, panelW, pCmd);
  txt("QUICK ACTIONS", 14, 120, 9, C.txtMuted, pCmd, { weight: "Semi Bold" });
  const cmdActions = [
    { icon: "⚡", label: "Spawn New Agent", key: "⌘N" },
    { icon: "📁", label: "Switch Project Workspace", key: "⌘P" },
    { icon: "🏥", label: "Run Health Check", key: "⌘H" },
    { icon: "🎤", label: "Voice Input Mode", key: "⌘⇧V" },
    { icon: "🧬", label: "Open Evolution Panel", key: "⌘E" },
    { icon: "🔍", label: "Inspect Element", key: "⌘⇧I" },
  ];
  cmdActions.forEach((a, i) => {
    rect(14, 134 + i * 44, panelW - 28, 38, i === 0 ? C.accentDim : C.surface, pCmd, { radius: 7 });
    txt(a.icon + "  " + a.label, 26, 145 + i * 44, 12, i === 0 ? C.accent : C.txtPrimary, pCmd, { weight: i === 0 ? "Medium" : "Regular" });
    txt(a.key, 310, 145 + i * 44, 10, C.txtMuted, pCmd);
  });
  divider(0, 404, panelW, pCmd);
  txt("THREAD SEARCH", 14, 414, 9, C.txtMuted, pCmd, { weight: "Semi Bold" });
  ["Refactor session", "Fix proxy bug", "Auth flow"].forEach((r, i) => {
    txt("🔗  " + r, 22, 428 + i * 22, 11, C.txtSecondary, pCmd);
  });

  // ── Panel 11: SwarmMetricsPanel ──────────────────────────────────────────
  const pSwarm = panelShell("SwarmMetricsPanel.tsx", 2, 2, "📊  Swarm Metrics", C.orange);
  txt("AGENTS ACTIVE", 14, 64, 9, C.txtMuted, pSwarm, { weight: "Semi Bold" });
  rect(14, 78, panelW - 28, 64, C.elevated, pSwarm, { radius: 10 });
  txt("3 / 8  agents running", 26, 88, 13, C.txtPrimary, pSwarm, { weight: "Semi Bold" });
  rect(26, 108, 300, 8, C.border, pSwarm, { radius: 4 });
  rect(26, 108, 112, 8, C.green, pSwarm, { radius: 4 });
  txt("37% utilization", 26, 122, 9, C.txtMuted, pSwarm);
  txt("CIRCUIT BREAKERS", 14, 158, 9, C.txtMuted, pSwarm, { weight: "Semi Bold" });
  const cbStates = [
    { name: "QueenBee-α", state: "CLOSED" },
    { name: "QueenBee-β", state: "CLOSED" },
    { name: "QueenBee-γ", state: "OPEN" },
  ];
  cbStates.forEach((cb, i) => {
    rect(14, 172 + i * 44, panelW - 28, 38, C.elevated, pSwarm, { radius: 7 });
    txt(cb.name, 26, 182 + i * 44, 11, C.txtPrimary, pSwarm, { weight: "Medium" });
    const stColor = cb.state === "CLOSED" ? C.green : C.red;
    badge(cb.state, 260, 182 + i * 44, { ...stColor, a: 0.15 }, stColor, pSwarm);
    txt(cb.state === "CLOSED" ? "0 faults" : "5 faults — tripped", 26, 198 + i * 44, 9, C.txtMuted, pSwarm);
  });
  txt("COSTS TODAY", 14, 316, 9, C.txtMuted, pSwarm, { weight: "Semi Bold" });
  rect(14, 330, panelW - 28, 60, C.elevated, pSwarm, { radius: 10 });
  txt("$0.42  today  ·  $12.80  MTD", 26, 340, 12, C.txtPrimary, pSwarm, { weight: "Medium" });
  txt("Input tokens: 840k  ·  Output: 220k", 26, 360, 10, C.txtSecondary, pSwarm);
  txt("TASK QUEUE", 14, 406, 9, C.txtMuted, pSwarm, { weight: "Semi Bold" });
  ["Pending: 2", "Running: 3", "Completed: 18", "Failed: 1"].forEach((s, i) => {
    const cols = [C.txtMuted, C.accent, C.green, C.red];
    txt("● " + s, 14 + (i % 2) * 172, 420 + Math.floor(i / 2) * 20, 11, cols[i], pSwarm);
  });

  // ── Panel 12: XtermTerminal ───────────────────────────────────────────────
  const pTerm = panelShell("XtermTerminal.tsx", 3, 2, "⬛  Terminal", { r: 0.4, g: 0.9, b: 0.4, a: 1 });
  rect(0, 55, panelW, panelH - 55, { r: 0.04, g: 0.04, b: 0.04, a: 1 }, pTerm);
  const termLines = [
    { t: "$ tsc --noEmit", c: { r: 0.4, g: 0.9, b: 0.4, a: 1 } },
    { t: "Checking proxy-bridge/src/lib/AgentSession.ts…", c: C.txtSecondary },
    { t: "No errors in 342 lines.", c: C.green },
    { t: "$ git add proxy-bridge/src/lib/AgentSession.ts", c: { r: 0.4, g: 0.9, b: 0.4, a: 1 } },
    { t: '$ git commit -m "refactor: async/await in AgentSession"', c: { r: 0.4, g: 0.9, b: 0.4, a: 1 } },
    { t: "[main 1a2b3c4] refactor: async/await in AgentSession", c: C.txtSecondary },
    { t: " 1 file changed, 87 insertions(+), 94 deletions(-)", c: C.txtSecondary },
    { t: "$", c: { r: 0.4, g: 0.9, b: 0.4, a: 1 } },
  ];
  termLines.forEach((l, i) => {
    txt(l.t, 12, 68 + i * 20, 11, l.c, pTerm, { weight: l.t.startsWith("$") ? "Medium" : "Regular" });
  });
  // cursor blink placeholder
  rect(18, 228, 8, 14, { r: 0.4, g: 0.9, b: 0.4, a: 0.8 }, pTerm);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — FLOW LEGEND (y=4200)
  // ═══════════════════════════════════════════════════════════════════════════
  sectionTitle("FLOW LEGEND  ·  Navigation routes", 60, 4220, root);

  const legendY = 4260;
  const legend = frame("Legend", 60, legendY, 1500, 400, C.surface);
  root.appendChild(legend);

  const routes = [
    { from: "App.tsx", cond: "isCallback=true", to: "AuthCallback.tsx" },
    { from: "App.tsx", cond: "!isAuthenticated", to: "LoginPage.tsx" },
    { from: "App.tsx", cond: "!isOnboarded", to: "OnboardingFlow.tsx" },
    { from: "App.tsx", cond: "isAuth + isOnboarded", to: "CodexLayout.tsx" },
    { from: "LoginPage", cond: "GitHub OAuth", to: "AuthCallback.tsx" },
    { from: "AuthCallback", cond: "success", to: "OnboardingFlow.tsx" },
    { from: "OnboardingFlow", cond: "all steps done", to: "CodexLayout.tsx" },
  ];

  txt("ROUTING TABLE  (App.tsx → conditional render)", 16, 16, 12, C.txtPrimary, legend, { weight: "Semi Bold" });
  divider(0, 36, 1500, legend);
  routes.forEach((r, i) => {
    const row = i < 4 ? i : i - 4;
    const col = i < 4 ? 0 : 1;
    const x = 16 + col * 740;
    const y = 50 + row * 52;
    rect(x, y, 700, 44, C.elevated, legend, { radius: 8 });
    txt(r.from, x + 12, y + 10, 12, C.accent, legend, { weight: "Semi Bold" });
    txt("→", x + 140, y + 10, 14, C.txtSecondary, legend);
    txt("if " + r.cond, x + 160, y + 10, 11, C.yellow, legend, { weight: "Medium" });
    txt("→  " + r.to, x + 400, y + 10, 12, C.green, legend, { weight: "Semi Bold" });
  });

  txt("PANEL TRIGGER MAP", 16, 256, 12, C.txtPrimary, legend, { weight: "Semi Bold" });
  divider(0, 274, 1500, legend);
  const panelTriggers = [
    { trigger: "⌘K", panel: "GlobalCommandBar" },
    { trigger: "🧬 toolbar btn", panel: "EvolutionPanel" },
    { trigger: "👁 toolbar btn", panel: "InspectorPanel" },
    { trigger: "🎤 btn / ⌘⇧V", panel: "DictationOverlay" },
    { trigger: "🔑 toolbar btn", panel: "UniversalAuthModal" },
    { trigger: "📥 Triage tab", panel: "InboxPanel" },
    { trigger: "🤝 agent event", panel: "RoundtablePanel" },
    { trigger: "📋 plan emit", panel: "AgentStepsPanel" },
  ];
  panelTriggers.forEach((p, i) => {
    const col = Math.floor(i / 4);
    const row = i % 4;
    rect(16 + col * 740, 286 + row * 28, 700, 24, C.surface, legend, { radius: 4 });
    txt(p.trigger, 24 + col * 740, 291 + row * 28, 11, C.yellow, legend, { weight: "Medium" });
    txt("→  " + p.panel, 180 + col * 740, 291 + row * 28, 11, C.txtPrimary, legend);
  });

  // ─── Zoom to fit ──────────────────────────────────────────────────────────
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.closePlugin("✅ QueenBee UI Flow generated! All screens and panels are ready.");
})();
