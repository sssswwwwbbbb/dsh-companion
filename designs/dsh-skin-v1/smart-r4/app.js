function SmartCompanion() {
  const P = PetSmartPreview;
  const key = location.search.includes("qa=1") ? "dsh-pet-r4-demo-qa" : "dsh-pet-r4-demo";
  function recover() {
    try {
      const d = JSON.parse(localStorage.getItem(key) || "null");
      return {
        config: P.cleanConfig(d?.config),
        turns: Array.isArray(d?.turns) ? d.turns.filter(t => t && typeof t.input === "string" && ["done", "cancelled"].includes(t.status)).slice(-40) : [],
        stopped: d?.stopped === true
      };
    } catch {
      return {
        config: {
          ...P.defaults
        },
        turns: [],
        stopped: false
      };
    }
  }
  const [initial] = React.useState(recover);
  const [config, setConfig] = React.useState(initial.config);
  const [turns, setTurns] = React.useState(initial.turns);
  const [stopped, setStopped] = React.useState(initial.stopped);
  const [pending, setPending] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [pose, setPose] = React.useState("idle");
  const [bubble, setBubble] = React.useState("");
  const [inspector, setInspector] = React.useState(false);
  const [pane, setPane] = React.useState("dialogue");
  const [sample, setSample] = React.useState("normal");
  const [lastContext, setLastContext] = React.useState(null);
  const [contextMode, setContextMode] = React.useState("next");
  const [notice, setNotice] = React.useState("");
  const [saveProblem, setSaveProblem] = React.useState(false);
  const serial = React.useRef(Math.max(0, ...initial.turns.map(t => Number(t.id) || 0))),
    requestTimer = React.useRef(null),
    poseTimer = React.useRef(null),
    configRef = React.useRef(config),
    scroll = React.useRef(null);
  configRef.current = config;
  const noCapability = !config.allowSpeak && !config.allowActions;
  function update(field, value) {
    setConfig(c => ({
      ...c,
      [field]: value
    }));
  }
  function cancelPending() {
    serial.current++;
    clearTimeout(requestTimer.current);
    requestTimer.current = null;
    setPending(false);
    setTurns(ts => ts.map(t => t.status === "pending" ? {
      ...t,
      status: "cancelled"
    } : t));
  }
  function resetPose() {
    clearTimeout(poseTimer.current);
    setPose("idle");
    setBubble("");
  }
  function stop() {
    cancelPending();
    resetPose();
    setStopped(x => !x);
    setNotice(stopped ? "已恢复，不补播上一条回应。" : "效果已停止，待返回的结果不会继续执行。");
  }
  function commit(id, raw, origin) {
    const caps = P.context(configRef.current, [], "", "message").capabilities,
      result = P.normalize(raw, caps);
    setTurns(ts => ts.map(t => t.id === id ? {
      ...t,
      status: "done",
      say: result.say,
      action: result.action,
      origin,
      notes: result.notes
    } : t));
    setPending(false);
    setPose(result.action || "idle");
    setBubble(result.say);
    if (result.notes.length) setNotice(result.notes.join("；"));
    clearTimeout(poseTimer.current);
    poseTimer.current = setTimeout(() => {
      setPose("idle");
      setBubble("");
    }, {
      react: 1800,
      greet: 2600,
      stretch: 3000
    }[result.action] || 3000);
  }
  function interact(text, event = "message") {
    const input = text.trim();
    if (!input || stopped || pending || noCapability) return;
    resetPose();
    setNotice("");
    const id = ++serial.current,
      time = new Date().toISOString(),
      ctx = P.context(config, turns, input, event, time);
    setLastContext(ctx);
    setDraft("");
    setTurns(ts => [...ts.slice(-39), {
      id,
      time,
      input,
      status: "pending",
      event
    }]);
    if (config.mode === "local") {
      commit(id, {
        say: "嗯，我在。",
        action: "react"
      }, "local");
      return;
    }
    setPending(true);
    requestTimer.current = setTimeout(() => {
      if (id !== serial.current) return;
      try {
        commit(id, P.fixture(ctx, sample), "fixture");
      } catch (e) {
        setNotice(e.message + "；本次使用本地回退。");
        commit(id, {
          say: "我先在这里陪着你，稍后再试一次吧。",
          action: "react"
        }, "fallback");
      }
    }, 900);
  }
  React.useEffect(() => {
    if (config.mode === "local" && pending) {
      cancelPending();
      resetPose();
      setNotice("已回到本地陪伴，上一条示例请求已取消。");
    }
  }, [config.mode]);
  React.useEffect(() => {
    if (!config.allowSpeak) setBubble("");
    if (!config.allowActions) setPose("idle");
  }, [config.allowSpeak, config.allowActions]);
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({
        version: 1,
        config,
        turns: turns.filter(t => t.status !== "pending"),
        stopped
      }));
      setSaveProblem(false);
    } catch {
      setSaveProblem(true);
    }
  }, [config, turns, stopped]);
  React.useEffect(() => {
    scroll.current?.scrollTo({
      top: scroll.current.scrollHeight,
      behavior: "smooth"
    });
  }, [turns]);
  React.useEffect(() => () => {
    serial.current++;
    clearTimeout(requestTimer.current);
    clearTimeout(poseTimer.current);
  }, []);
  const nextContext = P.context(config, turns, draft || "（下一次互动）"),
    shownContext = contextMode === "last" && lastContext ? lastContext : nextContext;
  const labels = {
    fixture: "示例返回",
    local: "本地回应",
    fallback: "本地回退"
  };
  return React.createElement("div", {
    className: "smart-app"
  }, React.createElement("header", {
    className: "smart-header"
  }, React.createElement("a", {
    href: "index.html#settings",
    className: "smart-brand"
  }, React.createElement("span", {
    className: "brand-square"
  }, "\u6863"), React.createElement("span", null, React.createElement("strong", null, "\u9CB8\u9C7C\u5A18 \xB7 \u667A\u80FD\u4E92\u52A8"), React.createElement("small", null, "ARCHIVE WARM / R4"))), React.createElement("div", {
    className: "smart-header-state"
  }, React.createElement(Pill, {
    tone: "blue"
  }, "\u6A21\u578B\u670D\u52A1\u5F85\u63A5\u5165"), React.createElement("span", null, "\u5F53\u524D\u4E3A\u56FA\u5B9A\u6837\u4F8B\u9884\u6F14")), React.createElement("div", {
    className: "row"
  }, React.createElement(Button, {
    small: true,
    icon: "file",
    onClick: () => setInspector(x => !x)
  }, inspector ? "收起上下文" : "查看上下文"), React.createElement(Button, {
    small: true,
    icon: stopped ? "play" : "pause",
    onClick: stop
  }, stopped ? "恢复效果" : "停止效果"))), React.createElement("nav", {
    className: "smart-mobile-tabs",
    "aria-label": "\u667A\u80FD\u4E92\u52A8\u9875\u9762"
  }, React.createElement("button", {
    "aria-pressed": pane === "dialogue",
    onClick: () => setPane("dialogue")
  }, "\u8FDE\u7EED\u4E92\u52A8"), React.createElement("button", {
    "aria-pressed": pane === "settings",
    onClick: () => setPane("settings")
  }, "\u89D2\u8272\u4E0E\u8BB0\u5FC6")), React.createElement("main", {
    className: "smart-layout " + (inspector ? "with-inspector " : "") + "pane-" + pane
  }, React.createElement("aside", {
    className: "smart-settings",
    "aria-label": "\u89D2\u8272\u4E0E\u8BB0\u5FC6\u8BBE\u7F6E"
  }, React.createElement("div", {
    className: "smart-settings-heading"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "CHARACTER / CONTEXT"), React.createElement("h1", null, "\u719F\u6089\u7684\u5979\uFF0C\u8BB0\u5F97\u521A\u624D\u3002"), React.createElement("p", null, "\u914D\u7F6E\u4EBA\u8BBE\u548C\u80FD\u505A\u7684\u4E8B\uFF0C\u56DE\u5E94\u4EA4\u7ED9\u6A21\u578B\u6765\u9009\u62E9\u3002")), React.createElement("section", null, React.createElement("label", {
    className: "smart-field-title"
  }, "\u884C\u4E3A\u6A21\u5F0F"), React.createElement(Segmented, {
    label: "\u884C\u4E3A\u6A21\u5F0F",
    value: config.mode,
    options: [{
      value: "local",
      label: "本地陪伴"
    }, {
      value: "smart",
      label: "智能互动"
    }],
    onChange: v => update("mode", v)
  }), React.createElement("p", {
    className: "smart-help"
  }, "\u667A\u80FD\u6A21\u5F0F\uFF1A\u5F85\u673A\u7531\u672C\u5730\u6267\u884C\uFF0C\u4E92\u52A8\u65F6\u7531\u6A21\u578B\u9009\u62E9\u77ED\u53E5\u4E0E\u52A8\u4F5C\u3002\u6B64\u9875\u5148\u7528\u660E\u786E\u7684\u6837\u4F8B\u670D\u52A1\u9884\u6F14\u3002")), React.createElement("section", null, React.createElement("label", {
    className: "smart-field-title",
    htmlFor: "persona-r4"
  }, "\u884C\u4E3A\u4EBA\u8BBE"), React.createElement("textarea", {
    id: "persona-r4",
    "aria-label": "\u884C\u4E3A\u4EBA\u8BBE",
    maxLength: "500",
    value: config.persona,
    onChange: e => update("persona", e.target.value)
  }), React.createElement("p", {
    className: "smart-help"
  }, "\u51B3\u5B9A\u8BED\u6C14\u3001\u6027\u683C\u4E0E\u966A\u4F34\u65B9\u5F0F\uFF1B\u4E0D\u9700\u8981\u9010\u6761\u5199\u6B7B\u4E8B\u4EF6\u53F0\u8BCD\u3002")), React.createElement("section", null, React.createElement("label", {
    className: "smart-field-title",
    htmlFor: "memory-r4"
  }, "\u5E26\u5165\u6700\u8FD1\u51E0\u8F6E"), React.createElement("select", {
    id: "memory-r4",
    "aria-label": "\u8BB0\u5FC6\u8F6E\u6570",
    value: config.memoryRounds,
    onChange: e => update("memoryRounds", Number(e.target.value))
  }, [0, 3, 5, 10, 20].map(n => React.createElement("option", {
    value: n,
    key: n
  }, n === 0 ? "不带历史" : n + " 轮互动"))), React.createElement("p", {
    className: "smart-help"
  }, "\u5305\u542B\u5F53\u65F6\u8BF4\u7684\u8BDD\u548C\u5B9E\u9645\u9009\u62E9\u7684\u52A8\u4F5C\u3002\u8BBE\u4E3A0\u53EA\u662F\u4E0D\u5E26\u5386\u53F2\uFF0C\u6F14\u793A\u8BB0\u5F55\u4ECD\u4FDD\u7559\u3002")), React.createElement("section", null, React.createElement("label", {
    className: "smart-field-title"
  }, "\u5141\u8BB8\u4F7F\u7528\u7684\u80FD\u529B"), React.createElement("div", {
    className: "smart-capability"
  }, React.createElement("span", null, React.createElement("strong", null, "\u8BF4\u4E00\u53E5\u8BDD"), React.createElement("small", null, "\u7B80\u77ED\u56DE\u5E94\u6216\u4FDD\u6301\u5B89\u9759")), React.createElement(Toggle, {
    label: "\u5141\u8BB8\u8BF4\u8BDD",
    value: config.allowSpeak,
    onChange: v => update("allowSpeak", v)
  })), React.createElement("div", {
    className: "smart-capability"
  }, React.createElement("span", null, React.createElement("strong", null, "\u8868\u6F14\u5DF2\u6709\u52A8\u4F5C"), React.createElement("small", null, "\u4ECE\u672C\u89D2\u8272\u5DF2\u63D0\u4F9B\u7684\u59FF\u6001\u4E2D\u9009\u62E9")), React.createElement(Toggle, {
    label: "\u5141\u8BB8\u52A8\u4F5C",
    value: config.allowActions,
    onChange: v => update("allowActions", v)
  }))), React.createElement("section", null, React.createElement("label", {
    className: "smart-field-title"
  }, "\u51B3\u7B56\u6A21\u578B"), React.createElement("div", {
    className: "smart-model-placeholder"
  }, React.createElement(Icon, {
    name: "link"
  }), React.createElement("span", null, "\u8DDF\u968F DSH \u9ED8\u8BA4\u6A21\u578B"), React.createElement(Pill, null, "\u5F85\u63A5\u5165")), React.createElement("p", {
    className: "smart-help"
  }, "\u590D\u7528\u5DF2\u914D\u7F6E\u7684\u6A21\u578B\u4E0E\u8D26\u53F7\u3002\u771F\u5B9E\u6A21\u578B\u76EE\u5F55\u548C\u8C03\u7528\u7531\u5BF9\u5E94\u6A21\u5757\u63A5\u5165\u3002")), React.createElement("p", {
    className: "smart-storage"
  }, saveProblem ? "本次浏览器未允许保存" : "只保存本地预览设置与演示记录", " \xB7 \u4E0D\u8BFB\u53D6\u771F\u5B9EDSH\u5BF9\u8BDD")), React.createElement("section", {
    className: "smart-dialogue",
    "aria-label": "\u8FDE\u7EED\u4E92\u52A8\u9884\u6F14"
  }, React.createElement("header", {
    className: "smart-dialogue-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "A LITTLE COMPANY"), React.createElement("h2", null, "\u6BCF\u6B21\u56DE\u5E94\uFF0C\u90FD\u63A5\u5F97\u4E0A\u3002")), React.createElement("span", {
    className: "smart-context-count"
  }, turns.filter(t => t.status === "done").length, " \u6B21\u5DF2\u5B8C\u6210\u4E92\u52A8")), React.createElement("div", {
    className: "smart-live",
    "data-state": stopped ? "stopped" : pending ? "waiting" : "ready"
  }, React.createElement("div", {
    className: "smart-live-copy"
  }, React.createElement(Pill, {
    tone: stopped ? "orange" : "blue"
  }, stopped ? "效果已停止" : pending ? "等待样例返回" : config.mode === "local" ? "本地陪伴" : "短句与动作一起选择"), React.createElement("h3", null, stopped ? "暂停，也记得你。" : pending ? "把情景交给模型。" : "我在这里。"), React.createElement("p", null, stopped ? "设置和记录保留；恢复后不补播上一条。" : "点一下角色，或告诉她今天的心情。"), React.createElement("div", {
    className: "smart-available"
  }, config.allowActions ? "待机 · 回应 · 挥手 · 伸懒腰" : "动作能力已关闭")), stopped ? React.createElement("div", {
    className: "smart-stopped"
  }, React.createElement(Icon, {
    name: "pause"
  }), React.createElement("span", null, "\u89D2\u8272\u8868\u6F14\u5DF2\u505C\u6B62")) : React.createElement("button", {
    className: "smart-pet-button",
    "aria-label": "\u70B9\u51FB\u9CB8\u9C7C\u5A18\u9884\u6F14\u4E92\u52A8",
    disabled: pending || noCapability,
    onClick: () => interact("（用户轻轻点了一下你）", "touch")
  }, React.createElement(PetMedia, {
    action: pose,
    reduced: false
  })), !stopped && bubble && React.createElement("div", {
    className: "smart-pet-bubble",
    role: "status"
  }, bubble)), React.createElement("div", {
    className: "smart-history",
    ref: scroll,
    "aria-label": "\u6F14\u793A\u4E92\u52A8\u8BB0\u5F55",
    tabIndex: "0"
  }, turns.length === 0 ? React.createElement("div", {
    className: "smart-empty"
  }, React.createElement(Icon, {
    name: "chat"
  }), React.createElement("p", null, "\u4ECE\u4E00\u53E5\u62DB\u547C\u5F00\u59CB\u3002"), React.createElement("span", null, "\u8BD5\u8BD5\u201C\u4ECA\u5929\u6709\u70B9\u7D2F\u201D\uFF0C\u518D\u8BF4\u201C\u6362\u4E2A\u52A8\u4F5C\u201D\u3002")) : turns.map(t => React.createElement("article", {
    className: "smart-turn",
    key: t.id
  }, React.createElement("div", {
    className: "smart-user"
  }, React.createElement("span", null, "\u4F60"), React.createElement("p", null, t.event === "touch" ? "轻轻点了点桌宠" : t.input)), React.createElement("div", {
    className: "smart-reply " + t.status
  }, React.createElement("div", {
    className: "smart-reply-label"
  }, React.createElement("span", null, "\u9CB8\u9C7C\u5A18"), React.createElement("small", null, t.status === "pending" ? "样例处理中" : t.status === "cancelled" ? "已取消，未执行" : labels[t.origin])), React.createElement("p", null, t.status === "pending" ? "正在预演一次模型决策…" : t.status === "cancelled" ? "这次结果没有继续执行。" : t.say || "安静陪伴，未说话。"), t.status === "done" && React.createElement("small", {
    className: "smart-action-record"
  }, t.action ? "本次姿态：" + (P.actions.find(a => a.id === t.action)?.label || t.action) : "没有调用动作"))))), notice && React.createElement("div", {
    className: "smart-notice",
    role: "status"
  }, notice), noCapability && React.createElement("div", {
    className: "smart-notice"
  }, "\u5F00\u542F\u8BF4\u8BDD\u6216\u52A8\u4F5C\u80FD\u529B\u540E\uFF0C\u53EF\u7EE7\u7EED\u9884\u6F14\u3002"), React.createElement("form", {
    className: "smart-composer",
    onSubmit: e => {
      e.preventDefault();
      interact(draft);
    }
  }, React.createElement("textarea", {
    "aria-label": "\u5BF9\u684C\u5BA0\u8BF4\u7684\u8BDD",
    value: draft,
    placeholder: "\u544A\u8BC9\u5979\u4F60\u7684\u5FC3\u60C5\uFF0C\u6216\u8BA9\u5979\u6362\u4E2A\u52A8\u4F5C\u2026",
    disabled: stopped || pending,
    onChange: e => setDraft(e.target.value)
  }), React.createElement("div", null, React.createElement("span", null, "\u56FA\u5B9A\u6837\u4F8B\u6F14\u793A \xB7 \u5C1A\u672A\u53D1\u9001\u771F\u5B9E\u6A21\u578B\u8BF7\u6C42"), React.createElement(Button, {
    icon: "arrow",
    kind: "primary",
    type: "submit",
    disabled: stopped || pending || noCapability || !draft.trim()
  }, "\u9884\u6F14\u56DE\u5E94"))), React.createElement("footer", {
    className: "smart-demo-controls"
  }, React.createElement("label", null, "\u5BA1\u7A3F\u6837\u4F8B", React.createElement("select", {
    "aria-label": "\u5BA1\u7A3F\u6837\u4F8B",
    value: sample,
    onChange: e => setSample(e.target.value)
  }, React.createElement("option", {
    value: "normal"
  }, "\u6B63\u5E38\u8FD4\u56DE"), React.createElement("option", {
    value: "quiet"
  }, "\u9009\u62E9\u5B89\u9759"), React.createElement("option", {
    value: "failure"
  }, "\u8BF7\u6C42\u5931\u8D25"))), React.createElement("button", {
    onClick: () => {
      cancelPending();
      resetPose();
      setTurns([]);
      setLastContext(null);
      setNotice("演示记录已清除，没有操作真实对话。");
    }
  }, "\u6E05\u9664\u6F14\u793A\u8BB0\u5F55"))), inspector && React.createElement("aside", {
    className: "smart-inspector",
    "aria-label": "\u4E0A\u4E0B\u6587\u5BA1\u7A3F\u9762\u677F"
  }, React.createElement("header", null, React.createElement("div", {
    className: "eyebrow"
  }, "CONTEXT / REVIEW ONLY"), React.createElement("h2", null, "\u6A21\u578B\u4F1A\u770B\u5230\u4EC0\u4E48"), React.createElement("p", null, "\u8FD9\u662F\u62DF\u53D1\u9001\u7684\u4E0A\u4E0B\u6587\u7ED3\u6784\u3002\u5F53\u524D\u7531\u56FA\u5B9A\u6837\u4F8B\u63A5\u66FF\u6A21\u578B\u9636\u6BB5\u3002"), React.createElement(Segmented, {
    label: "\u4E0A\u4E0B\u6587\u5FEB\u7167",
    value: contextMode,
    options: [{
      value: "next",
      label: "下一次"
    }, {
      value: "last",
      label: "上次请求"
    }],
    onChange: setContextMode
  })), React.createElement("pre", {
    "aria-label": "\u6A21\u578B\u4E0A\u4E0B\u6587\u9884\u89C8"
  }, JSON.stringify(shownContext, null, 2)), React.createElement("div", {
    className: "smart-inspector-foot"
  }, "R2\u89D2\u8272\u59FF\u6001\u7528\u4E8E\u903B\u8F91\u9884\u6F14\uFF1B\u5B8C\u6574\u52A8\u753B\u548C\u771F\u5B9E\u6A21\u578B\u63A5\u5165\u5355\u72EC\u9A8C\u6536\u3002"))), React.createElement("footer", {
    className: "smart-footer"
  }, React.createElement("span", null, "\u6863\u6848\u6696\u767D \xB7 \u667A\u80FD\u4E92\u52A8\u589E\u91CF R4"), React.createElement("span", null, "\u6A21\u578B\u9009\u62E9\u80FD\u529B\uFF0C\u672C\u5730\u6267\u884C\u4E0E\u8BB0\u5F55 \xB7 \u8BBE\u8BA1\u9884\u6F14")));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(SmartCompanion, null));
