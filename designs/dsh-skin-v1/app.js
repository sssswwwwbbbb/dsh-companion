function App({
  design
}) {
  const defaults = design.defaults;
  const skinId = design.skinIdProposal;
  const qa = location.search.includes("qa=1");
  const storageKey = qa ? "dsh-skin-v3-qa" : "dsh-skin-v3-preview";
  function recover() {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (raw?.version === 3) return {
        config: SkinPreview.resolve(design, raw.overrides?.[skinId]),
        stopped: raw.stopped === true
      };
      const old = JSON.parse(localStorage.getItem(qa ? "dsh-skin-v1-qa" : "dsh-skin-v1-preview") || "null");
      return {
        config: SkinPreview.resolve(design, old?.version === 1 ? old.config : {}),
        stopped: old?.stopped === true
      };
    } catch {
      return {
        config: SkinPreview.copy(defaults),
        stopped: false
      };
    }
  }
  const [initial] = React.useState(recover);
  const [config, setConfigState] = React.useState(initial.config);
  const [stopped, setStopped] = React.useState(initial.stopped);
  const [screen, setScreen] = React.useState(["workspace", "settings", "flow", "spec", "assets"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "workspace");
  const [scenario, setScenarioState] = React.useState("default");
  const [toast, setToast] = React.useState("");
  const [saveProblem, setSaveProblem] = React.useState(false);
  const [modal, setModal] = React.useState(null);
  const [menu, setMenu] = React.useState(null);
  const [fileOpen, setFileOpen] = React.useState(false);
  const [sidebar, setSidebar] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [attached, setAttached] = React.useState(false);
  const [empty, setEmpty] = React.useState(false);
  const [sent, setSent] = React.useState([]);
  const [runState, setRunState] = React.useState("complete");
  const [model, setModel] = React.useState("DeepSeek");
  const [complex, setComplex] = React.useState(false);
  const [phase, setPhase] = React.useState("ready");
  const [elapsed, setElapsed] = React.useState(0);
  const [action, setAction] = React.useState("idle");
  const [assetAction, setAssetAction] = React.useState("idle");
  const [bubble, setBubble] = React.useState("");
  const [feedbackKind, setFeedbackKind] = React.useState("idle");
  const [simulatedModel, setSimulatedModel] = React.useState("example-deepseek");
  const [log, setLog] = React.useState([]);
  const [systemReduced, setSystemReduced] = React.useState(matchMedia("(prefers-reduced-motion: reduce)").matches);
  const reduced = config.motion === "reduced" || systemReduced;
  const effective = SkinPreview.effective(config, scenario, stopped, runState === "needs-user" ? "needs-user" : feedbackKind);
  const introSeconds = config.startupStyle === "archive" ? 1.2 : 8.24;
  const timers = React.useRef({
    intro: [],
    response: [],
    pet: [],
    ambient: [],
    toast: null
  });
  const actionPriority = React.useRef(0);
  const lastComplete = React.useRef(-Infinity);
  const lastClick = React.useRef(-Infinity);
  const activeElement = React.useRef(null);
  const modalRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const lastView = React.useRef("workspace");
  function clearGroup(group) {
    timers.current[group].forEach(clearTimeout);
    timers.current[group] = [];
  }
  function schedule(group, fn, ms) {
    const id = setTimeout(fn, ms);
    timers.current[group].push(id);
    return id;
  }
  function notify(message) {
    setToast(message);
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(""), 2800);
  }
  function appendLog(message) {
    setLog(x => [...x.slice(-5), new Date().toLocaleTimeString("zh-CN", {
      hour12: false
    }) + "  " + message]);
  }
  function go(next) {
    setScreen(next);
    location.hash = next;
    setMenu(null);
    if (next !== "flow") {
      clearGroup("intro");
      setPhase("ready");
      setElapsed(0);
    }
  }
  function setConfig(key, value) {
    if (!design.controls[key] || !SkinPreview.valid(design.controls[key], value)) {
      notify(key === "eventRules" ? "规则无效：检查重复模型/事件或静态处理动作。" : "请使用此项允许的值。");
      return;
    }
    setConfigState(x => ({
      ...x,
      [key]: SkinPreview.copy(value)
    }));
  }
  function resetPet() {
    clearGroup("pet");
    setAction("idle");
    setBubble("");
    setFeedbackKind("idle");
    actionPriority.current = 0;
  }
  function resolveAttention() {
    setRunState("complete");
    resetPet();
    appendLog("模拟已处理 → 解除静态状态，回待机");
  }
  function stopToggle() {
    const next = !stopped;
    setStopped(next);
    clearGroup("intro");
    clearGroup("ambient");
    resetPet();
    setPhase("workspace");
    setElapsed(0);
    appendLog(next ? "停止 → 清空反馈队列，原会话状态保留" : "恢复 → 待机/原处理状态，不重播开场");
    notify(next ? "效果已停止，设置和会话状态保留" : "已恢复效果，不重播开场");
  }
  function selectScenario(value) {
    setScenarioState(value);
    if (value === "default") {
      setConfigState(SkinPreview.copy(defaults));
      setRunState("complete");
      resetPet();
    }
    if (value === "custom") setConfigState({
      ...SkinPreview.copy(defaults),
      petScale: 120,
      cooldown: 60,
      background: false,
      profile: "lively",
      completionAction: "stretch"
    });
    if (value === "off") setConfigState(x => ({
      ...x,
      pet: false
    }));
    if (value === "unavailable" || value === "unsupported" || value === "off") {
      resetPet();
      clearGroup("ambient");
    }
  }
  function playPlan(plan) {
    if (!plan.allowed) {
      notify(plan.reason);
      appendLog(plan.reason);
      return false;
    }
    if (plan.priority === 2 && actionPriority.current === 2) {
      appendLog("重复点击 → 合并到当前回应");
      return false;
    }
    if (plan.priority < actionPriority.current) {
      appendLog("低优先级反馈已合并");
      return false;
    }
    clearGroup("pet");
    actionPriority.current = plan.priority;
    setFeedbackKind(plan.kind);
    setAction(reduced || plan.kind === "needs-user" ? "idle" : plan.action);
    setBubble(config.bubbles ? plan.text.trim() : "");
    appendLog(plan.kind === "needs-user" ? "需要处理 → 持续静态，与气泡偏好独立" : (plan.source ? plan.source + " → " : "") + plan.action + " → 统一角色姿态");
    if (plan.kind !== "needs-user") schedule("pet", () => {
      resetPet();
      appendLog("反馈结束 → idle");
    }, reduced ? 4000 : {
      react: 1800,
      greet: 2600,
      stretch: 3000
    }[plan.action] || 1800);
    return true;
  }
  function completeFeedback(modelOverride) {
    const sample = typeof modelOverride === "string" ? modelOverride : simulatedModel;
    const plan = SkinPreview.plan(config, effective, "completed", sample);
    if (!plan.allowed) {
      playPlan(plan);
      return;
    }
    const now = Date.now();
    if (now - lastComplete.current < config.cooldown * 1000) {
      appendLog("完成事件 → 冷却中合并");
      notify("提醒间隔内已合并，没有重复表演");
      return;
    }
    if (playPlan(plan)) lastComplete.current = now;
  }
  function needFeedback(modelOverride) {
    if (!effective.feedbackDeclared) {
      notify("本套未声明工作反馈");
      return;
    }
    setRunState("needs-user");
    clearGroup("pet");
    setAction("idle");
    setFeedbackKind("needs-user");
    setBubble("");
    actionPriority.current = 4;
    const sample = typeof modelOverride === "string" ? modelOverride : simulatedModel;
    const plan = SkinPreview.plan(config, effective, "needs-user", sample);
    if (plan.allowed) playPlan(plan);else appendLog(plan.reason + "；原会话需要处理状态保留");
  }
  function directReaction() {
    const plan = SkinPreview.plan(config, effective, "click", simulatedModel);
    if (!plan.allowed) {
      playPlan(plan);
      return;
    }
    if (actionPriority.current === 2) {
      appendLog("重复点击 → 合并到当前回应");
      return;
    }
    if (Date.now() - lastClick.current < config.clickCooldown * 1000) {
      appendLog("点击 → 冷却内忽略");
      return;
    }
    if (playPlan(plan)) lastClick.current = Date.now();
  }
  function previewRule(rule) {
    const sample = rule.model === "*" ? simulatedModel : rule.model;
    setSimulatedModel(sample);
    go("flow");
    if (rule.event === "needs-user") needFeedback(sample);else playPlan(SkinPreview.plan(config, effective, "completed", sample));
  }
  function switchSimulatedModel(value) {
    setSimulatedModel(value);
    setRunState("complete");
    lastComplete.current = -Infinity;
    lastClick.current = -Infinity;
    resetPet();
    appendLog("切换示例会话/模型 → 旧反馈失效");
  }
  function introStep(next) {
    clearGroup("intro");
    setElapsed(0);
    if (stopped || !config.startup || reduced) {
      setPhase("workspace");
      appendLog("开场跳过 → 停止 / 关闭 / 减少动态");
      return;
    }
    setPhase(next === "scan" && config.startupStyle === "archive" ? "workspace" : next);
    appendLog("审稿定位 → " + next);
  }
  function startIntro() {
    clearGroup("intro");
    setElapsed(0);
    if (stopped || !config.startup || reduced) {
      setPhase("workspace");
      notify(stopped ? "效果已停止" : reduced ? "减少动态：静态进入工作区" : "启动开场已关闭");
      return;
    }
    setPhase("archive");
    appendLog("开场开始 → archive");
    const start = Date.now();
    const tick = () => {
      setElapsed((Date.now() - start) / 1000);
      if (Date.now() - start < introSeconds * 1000) schedule("intro", tick, 100);
    };
    tick();
    if (config.startupStyle === "scan") schedule("intro", () => {
      setPhase("scan");
      appendLog("1.2s → scan 原片");
    }, 1200);
    schedule("intro", () => {
      setPhase("workspace");
      setElapsed(introSeconds);
      appendLog(introSeconds + "s → 工作区 + idle");
    }, introSeconds * 1000);
  }
  function skipIntro() {
    clearGroup("intro");
    setPhase("workspace");
    setElapsed(introSeconds);
    appendLog("用户跳过 → 立即交回工作区");
  }
  function send() {
    if (!draft.trim() || runState === "loading" || runState === "disabled") return;
    const text = draft.trim();
    setSent(x => [...x, {
      question: text,
      answer: null
    }]);
    setDraft("");
    setAttached(false);
    setRunState("loading");
    clearGroup("response");
    schedule("response", () => {
      setSent(x => x.map((v, i) => i === x.length - 1 ? {
        ...v,
        answer: "已收到这条本地示例输入。这里用于检查连续对话与滚动，未发送到模型。可继续试用文件预览、设置和菜单。"
      } : v));
      setRunState("complete");
    }, 1300);
    schedule("response", () => scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight
    }), 40);
  }
  function simulateState(value) {
    clearGroup("response");
    setMenu(null);
    if (value === "needs-user") needFeedback();else {
      resetPet();
      setRunState(value);
    }
  }
  function retry() {
    clearGroup("response");
    setRunState("loading");
    schedule("response", () => {
      setRunState("complete");
      notify("示例回复已恢复");
    }, 1200);
  }
  function cancelResponse() {
    clearGroup("response");
    setRunState("complete");
    setSent(x => x.map(v => v.answer ? v : {
      ...v,
      answer: "已停止这次本地模拟。"
    }));
  }
  function newChat() {
    clearGroup("response");
    resetPet();
    lastComplete.current = -Infinity;
    lastClick.current = -Infinity;
    setEmpty(true);
    setSent([]);
    setDraft("");
    setRunState("complete");
    setFileOpen(false);
    setSearchOpen(false);
    notify("已新建本地示例会话");
  }
  async function copyExample(value) {
    try {
      await navigator.clipboard.writeText(typeof value === "string" ? value : "档案暖白 · 本地示例内容。");
      notify("已复制示例内容");
    } catch {
      notify("浏览器未允许复制，可在正文中选择文本。");
    }
  }
  function exportDesign() {
    const blob = new Blob([JSON.stringify({
      kind: "design-preview-overrides",
      runtimeLoadable: false,
      defaultsVersion: design.version,
      skinId,
      overrides: SkinPreview.overrides(design, config),
      resolvedValues: config,
      globalIntent: {
        stopped,
        muted: true
      },
      note: "仅设计值，不是 DSH 可导入包"
    }, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "archive-warm-design-overrides-r3.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("已导出设计值，不能作为运行包导入");
  }
  function openReset() {
    activeElement.current = document.activeElement;
    setModal("reset");
  }
  function closeModal() {
    setModal(null);
    setTimeout(() => activeElement.current?.focus(), 0);
  }
  React.useEffect(() => {
    if (!menu) return;
    const closeOutside = e => {
      if (e.target.closest(".popover")) return;
      const label = e.target.closest("button")?.getAttribute("aria-label");
      if (label !== "选择模型" && label !== "预览检查选项") setMenu(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menu]);
  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        version: 3,
        selectedSkinId: skinId,
        overrides: {
          [skinId]: SkinPreview.overrides(design, config)
        },
        stopped,
        muted: true
      }));
      setSaveProblem(false);
    } catch {
      setSaveProblem(true);
    }
  }, [config, stopped]);
  React.useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const listener = e => setSystemReduced(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);
  React.useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
    document.documentElement.dataset.reduced = String(reduced);
    document.documentElement.dataset.accent = config.accent;
  }, [config.theme, reduced, config.accent]);
  React.useEffect(() => {
    if (!effective.petRunning) {
      resetPet();
      clearGroup("ambient");
    }
  }, [effective.petRunning]);
  React.useEffect(() => {
    if (reduced) {
      resetPet();
      clearGroup("intro");
      setPhase("workspace");
    }
  }, [reduced]);
  React.useEffect(() => {
    if (!config.completion && feedbackKind === "completed") resetPet();
    if (!config.clickResponse && feedbackKind === "click") resetPet();
    if (!config.bubbles || !config.needsFeedback && feedbackKind === "needs-user") setBubble("");
    if (!config.startup) {
      clearGroup("intro");
      setPhase("workspace");
    }
  }, [config.completion, config.clickResponse, config.bubbles, config.needsFeedback, config.startup]);
  React.useEffect(() => {
    if (runState !== "needs-user" && feedbackKind === "needs-user") resetPet();
  }, [runState]);
  React.useEffect(() => {
    clearGroup("ambient");
    if (screen !== "flow" || !effective.petRunning || effective.attention || reduced || !config.autonomous) return;
    const tick = () => {
      playPlan({
        allowed: true,
        action: config.profile === "lively" ? "greet" : "stretch",
        text: "",
        priority: 1,
        kind: "autonomous",
        source: "本地自主样例"
      });
      schedule("ambient", tick, config.activityFrequency * 1000);
    };
    schedule("ambient", tick, config.activityFrequency * 1000);
    return () => clearGroup("ambient");
  }, [screen, effective.petRunning, effective.attention, reduced, config.autonomous, config.profile, config.activityFrequency]);
  React.useEffect(() => {
    if (modal) modalRef.current?.querySelector("button")?.focus();
  }, [modal]);
  React.useEffect(() => {
    function key(e) {
      if (e.key === "Escape") {
        if (modal) closeModal();else if (menu) setMenu(null);else if (phase === "archive" || phase === "scan") skipIntro();else if (fileOpen) setFileOpen(false);
      }
      if (modal && e.key === "Tab") {
        const f = [...modalRef.current.querySelectorAll("button:not(:disabled)")],
          first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b" && !modal) {
        e.preventDefault();
        setSidebar(x => x === null ? true : !x);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [modal, menu, phase, fileOpen]);
  React.useEffect(() => () => {
    ["intro", "response", "pet", "ambient"].forEach(clearGroup);
    clearTimeout(timers.current.toast);
  }, []);
  React.useEffect(() => {
    const fn = () => {
      const s = location.hash.slice(1);
      if (["workspace", "settings", "flow", "spec", "assets"].includes(s)) setScreen(s);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  const tabs = [["workspace", "工作区"], ["settings", "皮肤设置"], ["flow", "启动与桌宠"], ["spec", "视觉规范"], ["assets", "角色对照"]];
  const sidebarClass = sidebar === false ? "sidebar-closed" : sidebar === true ? "sidebar-manual" : "";
  return React.createElement(React.Fragment, null, React.createElement("div", {
    "aria-hidden": modal ? true : undefined
  }, React.createElement("header", {
    className: "reviewbar"
  }, React.createElement("div", {
    className: "reviewbrand"
  }, React.createElement("span", {
    className: "brand-square"
  }, "\u6863"), React.createElement("div", null, React.createElement("strong", null, "\u6863\u6848\u6696\u767D \xB7 \u9CB8\u9C7C\u5A18"), React.createElement("small", null, "DSH SKIN / DESIGN STUDY 01"))), React.createElement("nav", {
    className: "reviewnav",
    "aria-label": "\u5173\u952E\u7A3F\u5BFC\u822A"
  }, tabs.map(([id, name]) => React.createElement("button", {
    key: id,
    className: screen === id ? "active" : "",
    "aria-current": screen === id ? "page" : undefined,
    onClick: () => go(id)
  }, name))), React.createElement("div", {
    className: "reviewtools"
  }, React.createElement("span", {
    className: "reviewnotice"
  }, "\u4EA4\u4E92\u8BBE\u8BA1\u7A3F"), React.createElement("button", {
    className: "iconbutton",
    "aria-label": config.theme === "light" ? "切换夜间稿" : "切换暖白稿",
    onClick: () => setConfig("theme", config.theme === "light" ? "dark" : "light")
  }, React.createElement(Icon, {
    name: config.theme === "light" ? "moon" : "sun"
  })), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u9884\u89C8\u68C0\u67E5\u9009\u9879",
    "aria-expanded": menu === "review",
    onClick: () => setMenu(menu === "review" ? null : "review")
  }, React.createElement(Icon, {
    name: "settings"
  })), React.createElement("button", {
    className: "iconbutton",
    "aria-label": stopped ? "恢复所有皮肤效果" : "停止所有皮肤效果",
    onClick: stopToggle
  }, React.createElement(Icon, {
    name: stopped ? "play" : "pause"
  }))), menu === "review" && React.createElement("div", {
    className: "popover scenario-menu"
  }, React.createElement("h3", null, "\u9884\u89C8\u68C0\u67E5"), React.createElement("label", null, "\u4F1A\u8BDD\u72B6\u6001"), React.createElement("select", {
    "aria-label": "\u6A21\u62DF\u4F1A\u8BDD\u72B6\u6001",
    value: runState,
    onChange: e => simulateState(e.target.value)
  }, React.createElement("option", {
    value: "complete"
  }, "\u5DF2\u5B8C\u6210"), React.createElement("option", {
    value: "loading"
  }, "\u6B63\u5728\u751F\u6210"), React.createElement("option", {
    value: "error"
  }, "\u8FDE\u63A5\u4E2D\u65AD"), React.createElement("option", {
    value: "disabled"
  }, "\u8F93\u5165\u4E0D\u53EF\u7528"), React.createElement("option", {
    value: "needs-user"
  }, "\u9700\u8981\u7528\u6237\u5904\u7406")), React.createElement("label", null, React.createElement("input", {
    type: "checkbox",
    checked: complex,
    onChange: e => setComplex(e.target.checked)
  }), "\u590D\u6742\u80CC\u666F\u538B\u529B\u573A\u666F"), React.createElement("label", null, React.createElement("input", {
    type: "checkbox",
    checked: config.motion === "reduced",
    onChange: e => setConfig("motion", e.target.checked ? "reduced" : "system")
  }), "\u51CF\u5C11\u52A8\u6001"), React.createElement("p", {
    className: "caption"
  }, "\u4EE5\u4E0A\u4E3A\u5BA1\u7A3F\u6A21\u62DF\uFF0C\u4E0D\u8FDE\u63A5 DSH\u3002"), React.createElement(Button, {
    small: true,
    onClick: () => setMenu(null)
  }, "\u5B8C\u6210"))), React.createElement("main", {
    className: "stage"
  }, React.createElement("div", {
    className: "frame",
    "data-stopped": stopped
  }, screen === "workspace" && React.createElement("section", {
    className: "workspace " + sidebarClass,
    "data-screen-label": "01 \u4E3B\u5DE5\u4F5C\u533A"
  }, React.createElement("aside", {
    className: "sidebar",
    "aria-label": "\u4F1A\u8BDD\u5217\u8868"
  }, React.createElement("div", {
    className: "sidebrand"
  }, React.createElement("div", null, React.createElement("strong", null, "DSH"), React.createElement("span", {
    className: "sub"
  }, "WORKSPACE")), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u6536\u8D77\u4F1A\u8BDD\u5217\u8868",
    onClick: () => setSidebar(false)
  }, React.createElement(Icon, {
    name: "panel"
  }))), React.createElement("div", {
    className: "sideactions"
  }, React.createElement(Button, {
    icon: "plus",
    onClick: newChat
  }, "\u65B0\u5EFA\u4F1A\u8BDD"), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u641C\u7D22\u793A\u4F8B\u4F1A\u8BDD",
    onClick: () => setSearchOpen(x => !x)
  }, React.createElement(Icon, {
    name: "search"
  }))), searchOpen && React.createElement("div", {
    className: "searchbox"
  }, React.createElement(Icon, {
    name: "search"
  }), React.createElement("input", {
    autoFocus: true,
    "aria-label": "\u641C\u7D22\u4F1A\u8BDD",
    placeholder: "\u641C\u7D22\u793A\u4F8B\u4F1A\u8BDD",
    value: query,
    onChange: e => setQuery(e.target.value)
  })), React.createElement("div", {
    className: "sidesection"
  }, React.createElement("h3", null, "\u5DE5\u4F5C\u533A"), React.createElement("div", {
    className: "projectlabel"
  }, React.createElement(Icon, {
    name: "folder"
  }), React.createElement("span", null, "\u6211\u7684\u5DE5\u4F5C\u53F0")), ["整理工作区观察", "一份清晰的阅读记录", "今天的灵感"].filter(s => s.includes(query)).map((s, i) => React.createElement("button", {
    className: "sideitem " + (!empty && i === 0 ? "selected" : ""),
    key: s,
    onClick: () => {
      setEmpty(false);
      setSent([]);
      setRunState("complete");
      notify("已打开本地示例会话");
    }
  }, React.createElement(Icon, {
    name: "chat"
  }), React.createElement("span", {
    className: "label"
  }, s), i === 0 && React.createElement("span", {
    className: "tail"
  }, "\u73B0\u5728")))), React.createElement("div", {
    className: "sidesection"
  }, React.createElement("h3", null, "\u6700\u8FD1"), React.createElement("button", {
    className: "sideitem",
    onClick: () => {
      setEmpty(false);
      notify("此条使用同一份排版样例");
    }
  }, React.createElement(Icon, {
    name: "chat"
  }), React.createElement("span", {
    className: "label"
  }, "\u754C\u9762\u4E0E\u4E92\u52A8\u60F3\u6CD5"), React.createElement("span", {
    className: "tail"
  }, "\u6628\u5929"))), React.createElement("div", {
    className: "sidebar-bottom"
  }, React.createElement("div", {
    className: "skin-mini"
  }, React.createElement("span", null, "\u9CB8"), React.createElement("div", null, React.createElement("p", null, "\u6863\u6848\u6696\u767D"), React.createElement("small", null, stopped ? "效果已停止" : reduced ? "减少动态" : config.pet ? "安静陪伴中" : "桌宠已关闭"))), React.createElement("div", {
    className: "sidebottom-row"
  }, React.createElement("button", {
    className: "sideitem",
    onClick: () => go("settings")
  }, React.createElement(Icon, {
    name: "settings"
  }), "\u76AE\u80A4\u4E0E\u966A\u4F34"), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u76AE\u80A4\u6548\u679C\u7BA1\u7406",
    onClick: stopToggle
  }, React.createElement(Icon, {
    name: stopped ? "play" : "pause"
  }))))), React.createElement("div", {
    className: "mainspace"
  }, React.createElement("header", {
    className: "workspace-header"
  }, React.createElement("div", {
    className: "breadcrumb"
  }, React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u5C55\u5F00\u6216\u6536\u8D77\u4F1A\u8BDD\u5217\u8868",
    onClick: () => setSidebar(x => x === null ? true : !x)
  }, React.createElement(Icon, {
    name: "panel"
  })), React.createElement("span", null, "\u6211\u7684\u5DE5\u4F5C\u53F0"), React.createElement("span", null, "/"), React.createElement("h2", null, empty ? "新建会话" : "整理工作区观察")), React.createElement("div", {
    className: "row",
    style: {
      gap: 5
    }
  }, React.createElement(Pill, {
    tone: runState === "loading" ? "blue" : ""
  }, React.createElement("span", {
    className: "dot"
  }), runState === "loading" ? "进行中" : runState === "error" ? "未完成" : "本地示例"), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u6253\u5F00\u6587\u4EF6\u9884\u89C8",
    onClick: () => setFileOpen(x => !x)
  }, React.createElement(Icon, {
    name: "file"
  })))), stopped && React.createElement("div", {
    className: "stop-banner"
  }, React.createElement("span", null, "\u76AE\u80A4\u6548\u679C\u5DF2\u505C\u6B62 \xB7 \u8BBE\u7F6E\u5DF2\u4FDD\u7559"), React.createElement(Button, {
    small: true,
    onClick: stopToggle
  }, "\u6062\u590D\u6548\u679C")), React.createElement("div", {
    className: "conversation-grid"
  }, React.createElement("div", {
    className: "conversation " + (complex ? "bg-complex" : "")
  }, config.background && !stopped && React.createElement("div", {
    className: "archive-grid background-" + config.backgroundStyle,
    style: {
      opacity: config.backgroundOpacity * 4
    }
  }), React.createElement("div", {
    className: "chat-scroll",
    ref: scrollRef,
    tabIndex: "0",
    "aria-label": "\u804A\u5929\u8BB0\u5F55"
  }, React.createElement("div", {
    className: "reading"
  }, empty && sent.length === 0 ? React.createElement("div", {
    className: "empty-chat"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "A FRESH PAGE"), React.createElement("h2", null, "\u4ECE\u4E00\u4E2A\u60F3\u6CD5\u5F00\u59CB\u3002"), React.createElement("p", null, "\u8F93\u5165\u4E00\u6BB5\u6587\u5B57\uFF0C\u8BD5\u8BD5\u672C\u5730\u5BF9\u8BDD\u548C\u6EDA\u52A8\u3002"), React.createElement(Button, {
    small: true,
    onClick: () => setDraft("帮我整理今天的观察")
  }, "\u6574\u7406\u4ECA\u5929\u7684\u89C2\u5BDF")) : !empty && React.createElement(ChatBody, {
    onFile: () => setFileOpen(true),
    onCopy: copyExample,
    state: sent.length && runState === "loading" ? "complete" : runState,
    onRetry: retry
  }), sent.map((m, i) => React.createElement("div", {
    className: "sent-turn",
    key: i,
    style: {
      marginTop: 30
    }
  }, React.createElement("div", {
    className: "user-row"
  }, React.createElement("div", {
    className: "user-message"
  }, m.question)), React.createElement("div", {
    className: "assistant-label"
  }, React.createElement("span", {
    className: "assistant-mark"
  }, "d"), "DSH"), m.answer ? React.createElement("p", {
    className: "message-body"
  }, m.answer) : React.createElement("div", {
    className: "run-status"
  }, React.createElement("span", {
    className: "loading-dot"
  }), "\u6B63\u5728\u6574\u7406\u672C\u5730\u793A\u4F8B\u2026"))))), React.createElement("div", {
    className: "composer-zone"
  }, React.createElement("div", {
    className: "composer-wrap"
  }, React.createElement("div", {
    className: "composer"
  }, attached && React.createElement("div", {
    className: "attachment-draft"
  }, "\u5DF2\u9644\u793A\u4F8B\u6587\u4EF6\uFF1A\u89C2\u5BDF\u8BB0\u5F55.md ", React.createElement("button", {
    onClick: () => setAttached(false),
    "aria-label": "\u79FB\u9664\u793A\u4F8B\u9644\u4EF6"
  }, "\xD7")), React.createElement("textarea", {
    "aria-label": "\u8F93\u5165\u6D88\u606F",
    placeholder: runState === "disabled" ? "当前输入不可用 · 示例只读状态" : "描述你的想法，或继续这份记录…",
    value: draft,
    disabled: runState === "disabled",
    onChange: e => setDraft(e.target.value),
    onKeyDown: e => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        send();
      }
    }
  }), React.createElement("div", {
    className: "composer-controls"
  }, React.createElement("div", {
    className: "row"
  }, React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u6DFB\u52A0\u793A\u4F8B\u9644\u4EF6",
    disabled: runState === "disabled",
    onClick: () => setAttached(x => !x)
  }, React.createElement(Icon, {
    name: "plus"
  })), React.createElement("button", {
    className: "button quiet small",
    "aria-label": "\u9009\u62E9\u6A21\u578B",
    "aria-expanded": menu === "model",
    onClick: () => setMenu(menu === "model" ? null : "model")
  }, model, React.createElement(Icon, {
    name: "down"
  })), React.createElement(Pill, null, "\u5DE5\u4F5C\u6A21\u5F0F")), runState === "loading" ? React.createElement("button", {
    className: "iconbutton send",
    "aria-label": "\u505C\u6B62\u672C\u5730\u751F\u6210",
    onClick: cancelResponse
  }, React.createElement(Icon, {
    name: "stop"
  })) : React.createElement("button", {
    className: "iconbutton send",
    "aria-label": "\u53D1\u9001\u672C\u5730\u793A\u4F8B",
    disabled: !draft.trim() || runState === "disabled",
    onClick: send
  }, React.createElement(Icon, {
    name: "arrow"
  })))), React.createElement("div", {
    className: "composer-sub"
  }, React.createElement("span", null, runState === "disabled" ? "当前会话为只读，输入已保留" : "示例环境 · 不发送到模型"), React.createElement("span", null, "\u2318 Enter \u53D1\u9001 \xB7 Shift Enter \u6362\u884C")))), menu === "model" && React.createElement("div", {
    className: "popover model-menu",
    role: "menu",
    "aria-label": "\u6A21\u578B\u9009\u62E9"
  }, React.createElement("div", {
    className: "menu-title"
  }, "\u5F53\u524D\u4F1A\u8BDD \xB7 \u6A21\u578B\u9009\u62E9\u793A\u4F8B"), ["DeepSeek", "示例模型 B"].map(x => React.createElement("button", {
    role: "menuitemradio",
    "aria-checked": model === x,
    key: x,
    className: "menu-item " + (model === x ? "selected" : ""),
    onClick: () => {
      setModel(x);
      setMenu(null);
      notify("仅更改本地示例显示，不切换真实模型");
    }
  }, React.createElement(Icon, {
    name: model === x ? "check" : "chat"
  }), x, React.createElement("small", null, model === x ? "当前" : ""))), React.createElement("div", {
    className: "divider"
  }), React.createElement("div", {
    className: "menu-title"
  }, "Esc \u5173\u95ED \xB7 \u4EC5\u672C\u5730\u6A21\u578B\u793A\u4F8B"))), fileOpen && React.createElement(FilePanel, {
    onClose: () => setFileOpen(false)
  })))), screen === "settings" && React.createElement(SettingsScreen, {
    config: config,
    defaults: defaults,
    setConfig: setConfig,
    scenario: scenario,
    setScenario: selectScenario,
    stopped: stopped,
    effective: effective,
    onReset: openReset,
    onStop: stopToggle,
    onPlay: () => {
      lastView.current = "settings";
      go("flow");
      completeFeedback();
    },
    onPreviewRule: previewRule,
    onExport: exportDesign,
    saveProblem: saveProblem
  }), screen === "flow" && React.createElement(FlowScreen, {
    config: config,
    effective: effective,
    feedbackKind: feedbackKind,
    simulatedModel: simulatedModel,
    onSimulatedModel: switchSimulatedModel,
    onResolveAttention: resolveAttention,
    introSeconds: introSeconds,
    reduced: reduced,
    stopped: stopped,
    phase: phase,
    elapsed: elapsed,
    onStart: startIntro,
    onSkip: skipIntro,
    onStep: introStep,
    action: action,
    bubble: bubble,
    onReact: directReaction,
    onComplete: completeFeedback,
    onNeed: needFeedback,
    onIdle: resetPet,
    onStop: stopToggle,
    log: log,
    onMediaError: () => notify("素材无法播放，保留静态回退并记录待检查。")
  }), screen === "spec" && React.createElement(SpecScreen, {
    theme: config.theme,
    accent: config.accent,
    onTheme: v => setConfig("theme", v)
  }), screen === "assets" && React.createElement(AssetsScreen, {
    action: assetAction,
    onAction: v => setAssetAction(v),
    reduced: reduced || !effective.petRunning,
    reviewOnly: !effective.petRunning,
    onMediaError: () => notify("素材无法播放，请检查本地资源。")
  }))), React.createElement("footer", {
    className: "reviewfooter"
  }, React.createElement("span", null, "\u672C\u5730\u8BBE\u8BA1\u9884\u89C8 \xB7 \u6A21\u62DF\u6570\u636E\u4E0E\u4E8B\u4EF6 \xB7 \u672A\u63A5\u5165\u771F\u5B9E DSH"), React.createElement("span", null, reduced ? "减少动态" : "无声音", " \xB7 \u5185\u5BB9\u4E0E\u8BB8\u53EF\u89C1\u89D2\u8272\u5BF9\u7167 \xB7 2026.11.03 / R3"))), modal && React.createElement("div", {
    className: "modal-backdrop",
    onMouseDown: e => {
      if (e.target === e.currentTarget) closeModal();
    }
  }, React.createElement("section", {
    ref: modalRef,
    className: "modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "reset-title",
    "aria-describedby": "reset-desc"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "RESET THIS SKIN"), React.createElement("h2", {
    id: "reset-title"
  }, "\u56DE\u5230\u672C\u5957\u9ED8\u8BA4\uFF1F"), React.createElement("p", {
    id: "reset-desc"
  }, "\u6062\u590D\u6696\u767D\u3001\u9ED8\u8BA4\u5927\u5C0F\u548C\u4E92\u52A8\u8282\u594F\u3002\u5168\u5C40\u505C\u6B62\u3001\u9759\u97F3\u504F\u597D\u548C\u6388\u6743\u72B6\u6001\u4E0D\u53D7\u5F71\u54CD\u3002"), React.createElement("div", {
    className: "modal-actions"
  }, React.createElement(Button, {
    onClick: closeModal
  }, "\u4FDD\u7559\u8C03\u6574"), React.createElement(Button, {
    kind: "primary",
    onClick: () => {
      setConfigState(SkinPreview.copy(defaults));
      resetPet();
      closeModal();
      notify(stopped ? "已重置本套；效果仍处于停止状态" : "已恢复本套默认值");
    }
  }, "\u91CD\u7F6E\u672C\u5957\u53C2\u6570")))), toast && React.createElement("div", {
    className: "toast",
    role: "status"
  }, toast));
}
fetch("content/design-defaults.json").then(r => {
  if (!r.ok) throw new Error("DEFAULTS_UNAVAILABLE");
  return r.json();
}).then(design => ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, {
  design: design
}))).catch(() => {
  document.getElementById("root").textContent = "设计配置未能加载。请通过项目 HTTP 预览地址打开，并检查 content/design-defaults.json。";
});
