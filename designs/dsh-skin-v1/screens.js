function RuleEditor({
  rules,
  onChange,
  onPreview,
  disabled
}) {
  const events = [{
    value: "completed",
    label: "任务完成"
  }, {
    value: "needs-user",
    label: "需要处理"
  }];
  const models = [{
    value: "*",
    label: "任意示例模型"
  }, {
    value: "example-deepseek",
    label: "DeepSeek（示例）"
  }, {
    value: "example-other",
    label: "模型 B（示例）"
  }];
  function update(index, patch) {
    onChange(rules.map((r, i) => i === index ? {
      ...r,
      ...patch,
      ...(patch.event === "needs-user" ? {
        action: "idle"
      } : {})
    } : r));
  }
  function add() {
    const pairs = models.flatMap(m => events.map(e => ({
      model: m.value,
      event: e.value
    })));
    const next = pairs.find(p => !rules.some(r => r.enabled && r.model === p.model && r.event === p.event));
    onChange([...rules, {
      id: "rule-" + Date.now().toString(36),
      enabled: !!next,
      ...(next || pairs[0]),
      action: next?.event === "needs-user" ? "idle" : "greet",
      text: ""
    }]);
  }
  return React.createElement("div", {
    className: "rule-editor",
    "aria-label": "\u6A21\u578B\u4E0E\u72B6\u6001\u89C4\u5219\u7F16\u8F91\u5668"
  }, React.createElement("div", {
    className: "rule-explanation"
  }, React.createElement("strong", null, "\u7CBE\u786E\u6A21\u578B \u2192 \u4EFB\u610F\u6A21\u578B \u2192 \u672C\u5957\u9ED8\u8BA4"), React.createElement("p", null, "\u793A\u4F8B ID \u53EA\u7528\u4E8E\u6B64\u9875\u9884\u6F14\u3002\u9700\u8981\u5904\u7406\u56FA\u5B9A\u4E3A\u9759\u6001\u5F85\u673A\uFF1B\u6CA1\u6709\u5339\u914D\u65F6\u4F7F\u7528\u672C\u5957\u9ED8\u8BA4\u53CD\u9988\u3002\u89C4\u5219\u6587\u672C\u53EA\u4F5C\u6587\u5B57\u663E\u793A\u3002")), rules.length === 0 && React.createElement("div", {
    className: "notice"
  }, "\u8FD8\u6CA1\u6709\u4E13\u5C5E\u89C4\u5219\uFF0C\u5F53\u524D\u4F7F\u7528\u672C\u5957\u9ED8\u8BA4\u52A8\u4F5C\u548C\u77ED\u53E5\u3002"), rules.map((r, i) => React.createElement("fieldset", {
    className: "rule-card",
    key: r.id
  }, React.createElement("legend", null, "\u89C4\u5219 ", i + 1), React.createElement("div", {
    className: "rule-card-head"
  }, React.createElement(Toggle, {
    label: "启用规则 " + (i + 1),
    value: r.enabled,
    onChange: v => update(i, {
      enabled: v
    })
  }), React.createElement("span", null, r.enabled ? "规则已启用" : "规则已关闭，内容保留"), React.createElement("button", {
    className: "button small quiet",
    "aria-label": "删除规则 " + (i + 1),
    onClick: () => onChange(rules.filter((_, n) => n !== i))
  }, "\u5220\u9664")), React.createElement("div", {
    className: "rule-fields"
  }, React.createElement("label", null, "\u793A\u4F8B\u6A21\u578B", React.createElement("select", {
    "aria-label": "规则 " + (i + 1) + " 模型",
    value: r.model,
    onChange: e => update(i, {
      model: e.target.value
    })
  }, models.map(m => React.createElement("option", {
    key: m.value,
    value: m.value
  }, m.label)))), React.createElement("label", null, "\u89E6\u53D1\u72B6\u6001", React.createElement("select", {
    "aria-label": "规则 " + (i + 1) + " 状态",
    value: r.event,
    onChange: e => update(i, {
      event: e.target.value
    })
  }, events.map(e => React.createElement("option", {
    key: e.value,
    value: e.value
  }, e.label)))), React.createElement("label", null, "\u89D2\u8272\u52A8\u4F5C", React.createElement("select", {
    "aria-label": "规则 " + (i + 1) + " 动作",
    value: r.action,
    onChange: e => update(i, {
      action: e.target.value
    })
  }, (r.event === "needs-user" ? [{
    v: "idle",
    t: "静态待机"
  }] : [{
    v: "greet",
    t: "轻轻挥手"
  }, {
    v: "stretch",
    t: "伸个懒腰"
  }, {
    v: "idle",
    t: "静态待机"
  }]).map(a => React.createElement("option", {
    key: a.v,
    value: a.v
  }, a.t)))), React.createElement("label", {
    className: "rule-text"
  }, "\u53EF\u9009\u77ED\u53E5", React.createElement("input", {
    type: "text",
    "aria-label": "规则 " + (i + 1) + " 短句",
    maxLength: "60",
    value: r.text,
    placeholder: "\u7559\u7A7A\u5219\u4E0D\u663E\u793A\u53EF\u9009\u6C14\u6CE1",
    onChange: e => update(i, {
      text: e.target.value
    })
  }))), React.createElement("div", {
    className: "rule-test"
  }, React.createElement("span", {
    className: "caption"
  }, r.event === "needs-user" ? "静态状态独立于气泡开关" : "仅使用本套已提供的姿态"), React.createElement(Button, {
    small: true,
    icon: "play",
    disabled: disabled || !r.enabled,
    onClick: () => onPreview(r)
  }, "\u6D4B\u8BD5\u89C4\u5219")))), React.createElement("div", {
    className: "row",
    style: {
      gap: 10,
      flexWrap: "wrap"
    }
  }, React.createElement(Button, {
    small: true,
    icon: "plus",
    disabled: rules.length >= 8,
    onClick: add
  }, "\u6DFB\u52A0\u89C4\u5219"), React.createElement("span", {
    className: "caption"
  }, "\u6700\u591A 8 \u6761\uFF1B\u540C\u6A21\u578B\u4E0E\u4E8B\u4EF6\u7684\u542F\u7528\u89C4\u5219\u4E0D\u80FD\u91CD\u590D\u3002")));
}
function SettingsScreen({
  config,
  defaults,
  setConfig,
  scenario,
  setScenario,
  stopped,
  effective,
  onReset,
  onStop,
  onPlay,
  onPreviewRule,
  onExport,
  saveProblem
}) {
  const [page, setPage] = React.useState("common");
  const changed = !SkinPreview.same(config, defaults);
  const tag = key => React.createElement(Pill, {
    tone: SkinPreview.same(config[key], defaults[key]) ? "" : "orange"
  }, SkinPreview.same(config[key], defaults[key]) ? "默认" : "已自定义");
  const unavailable = !effective.capabilityAvailable;
  const petEditable = config.pet && !unavailable;
  const select = (key, label, options) => React.createElement("select", {
    "aria-label": label,
    value: config[key],
    onChange: e => setConfig(key, e.target.value)
  }, options.map(o => React.createElement("option", {
    key: o[0],
    value: o[0]
  }, o[1])));
  const text = (key, label, max) => React.createElement("input", {
    type: "text",
    "aria-label": label,
    value: config[key],
    maxLength: max,
    onChange: e => setConfig(key, e.target.value)
  });
  const tabs = React.createElement("div", {
    className: "settings-subtabs",
    role: "tablist",
    "aria-label": "\u8BBE\u7F6E\u5C42\u7EA7"
  }, React.createElement("button", {
    role: "tab",
    "aria-selected": page === "common",
    onClick: () => setPage("common")
  }, "\u5E38\u7528"), React.createElement("button", {
    role: "tab",
    "aria-selected": page === "more",
    onClick: () => setPage("more")
  }, "\u66F4\u591A"));
  return React.createElement("section", {
    className: "settings-shell settings-r3",
    "data-screen-label": "02 \u53EF\u81EA\u5B9A\u4E49\u8BBE\u7F6E R3"
  }, React.createElement("nav", {
    className: "settings-nav",
    "aria-label": "\u8BBE\u7F6E\u5BFC\u822A"
  }, React.createElement("h2", null, "\u76AE\u80A4\u4E0E\u966A\u4F34"), React.createElement("button", {
    className: "sideitem " + (page === "common" ? "selected" : ""),
    onClick: () => setPage("common")
  }, React.createElement(Icon, {
    name: "settings"
  }), "\u5E38\u7528\u8BBE\u7F6E"), React.createElement("button", {
    className: "sideitem " + (page === "more" ? "selected" : ""),
    onClick: () => setPage("more")
  }, React.createElement(Icon, {
    name: "dots"
  }), "\u66F4\u591A\u8BBE\u7F6E"), effective.feedbackDeclared && React.createElement("button", {
    className: "sideitem",
    onClick: () => {
      setPage("more");
      requestAnimationFrame(() => document.getElementById("feedback-section")?.scrollIntoView({
        behavior: "smooth"
      }));
    }
  }, React.createElement(Icon, {
    name: "heart"
  }), "\u53CD\u9988\u4E0E\u89C4\u5219"), React.createElement("button", {
    className: "sideitem",
    onClick: onStop
  }, React.createElement(Icon, {
    name: stopped ? "play" : "pause"
  }), stopped ? "恢复效果" : "停止效果"), React.createElement("div", {
    className: "navfooter"
  }, "\u4FEE\u6539\u6309\u672C\u76AE\u80A4\u4FDD\u5B58\u8986\u5199", React.createElement("br", null), "\u6A21\u62DF\u9879\u4E0D\u5199\u5165\u8FD0\u884C\u5305")), React.createElement("div", {
    className: "settings-main"
  }, React.createElement("header", {
    className: "settings-head"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "APPEARANCE / CONFIGURATION R3"), React.createElement("h1", null, "\u6309\u4F60\u7684\u4E60\u60EF\uFF0C\u521A\u521A\u597D\u3002"), React.createElement("p", {
    className: "caption"
  }, "\u5E38\u7528\u9879\u76F4\u63A5\u8C03\u6574\uFF0C\u66F4\u591A\u89C4\u5219\u6309\u9700\u5C55\u5F00\u3002\u6BCF\u9879\u90FD\u6709\u9ED8\u8BA4\u503C\u3002")), React.createElement(Pill, {
    tone: changed ? "orange" : ""
  }, changed ? "已自定义" : "使用本套默认")), React.createElement("div", {
    className: "settings-tabs-bar"
  }, tabs), React.createElement("div", {
    className: "settings-body"
  }, React.createElement("div", {
    className: "settings-inner"
  }, React.createElement("div", {
    className: "state-review",
    role: "group",
    "aria-label": "\u5BA1\u7A3F\u72B6\u6001"
  }, React.createElement("span", null, "\u5BA1\u7A3F\u72B6\u6001"), [{
    v: "default",
    t: "首次默认"
  }, {
    v: "custom",
    t: "已自定义"
  }, {
    v: "off",
    t: "用户关闭"
  }, {
    v: "unavailable",
    t: "能力不可用"
  }, {
    v: "available",
    t: "恢复能力"
  }, {
    v: "unsupported",
    t: "未声明反馈"
  }].map(x => React.createElement("button", {
    key: x.v,
    className: scenario === x.v ? "active" : "",
    "aria-pressed": scenario === x.v,
    onClick: () => setScenario(x.v)
  }, x.t))), saveProblem && React.createElement("div", {
    className: "notice warning",
    role: "alert"
  }, "\u6B64\u6D4F\u89C8\u5668\u672A\u5141\u8BB8\u4FDD\u5B58\u3002\u5F53\u524D\u6539\u52A8\u4EC5\u5728\u672C\u6B21\u9884\u89C8\u6709\u6548\u3002"), stopped && React.createElement("div", {
    className: "notice warning"
  }, React.createElement(Icon, {
    name: "pause"
  }), React.createElement("span", null, "\u6548\u679C\u5DF2\u505C\u6B62\uFF0C\u53C2\u6570\u5DF2\u4FDD\u7559\u3002\u91CD\u7F6E\u672C\u5957\u4E0D\u4F1A\u81EA\u52A8\u6062\u590D\u3002"), React.createElement(Button, {
    small: true,
    onClick: onStop
  }, "\u6062\u590D\u6548\u679C")), unavailable && React.createElement("div", {
    className: "notice warning"
  }, React.createElement(Icon, {
    name: "warning"
  }), React.createElement("span", null, "\u684C\u9762\u89D2\u8272\u80FD\u529B\u4E0D\u53EF\u7528\u3002\u4E3B\u9898\u4ECD\u53EF\u8C03\u6574\uFF0C\u89D2\u8272\u8868\u6F14\u505C\u6B62\uFF0C\u539F\u53C2\u6570\u548C\u5173\u95ED\u610F\u56FE\u4FDD\u7559\u3002")), !effective.feedbackDeclared && React.createElement("div", {
    className: "notice blue"
  }, "\u5F53\u524D\u5BA1\u7A3F\u58F0\u660E\u672A\u63D0\u4F9B\u5DE5\u4F5C\u53CD\u9988\uFF1B\u76F8\u5173\u8BBE\u7F6E\u3001\u89C4\u5219\u4E0E\u6F14\u793A\u5165\u53E3\u9690\u85CF\u3002"), page === "common" ? React.createElement(React.Fragment, null, React.createElement("div", {
    className: "skin-banner"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "ARCHIVE WARM / UNIFIED CHARACTER"), React.createElement("h2", null, "\u6863\u6848\u6696\u767D \xB7 \u9CB8\u9C7C\u5A18"), React.createElement("p", null, "\u94F6\u84DD\u89D2\u8272\u4E0E\u6696\u767D\u5DE5\u4F5C\u533A\u4FDD\u6301\u540C\u4E00\u5957\u8BC6\u522B\u3002\u5168\u8EAB\u670D\u88C5\u4E3A\u5019\u9009\uFF0C\u5F53\u524D\u53EA\u6709\u4E00\u5957\u5F62\u8C61\u3002"), React.createElement("div", {
    className: "row",
    style: {
      marginTop: 12,
      gap: 6
    }
  }, React.createElement(Pill, null, "\u5E38\u7528\u504F\u597D"), React.createElement(Pill, {
    tone: "blue"
  }, "\u7EDF\u4E00\u89D2\u8272\u5019\u9009"))), React.createElement("div", {
    className: "banner-pet"
  }, React.createElement(PetMedia, {
    reduced: true
  }))), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u9605\u8BFB\u4E0E\u8868\u9762"), React.createElement(Pill, null, "\u672C\u5730\u65B9\u6848\u9884\u89C8")), React.createElement(SettingRow, {
    title: "\u9605\u8BFB\u914D\u8272",
    description: "\u53EA\u6539\u672C\u5957\u9884\u89C8\uFF0C\u4E0D\u5199\u5BBF\u4E3B\u4E3B\u9898\u504F\u597D\u3002"
  }, tag("theme"), React.createElement(Segmented, {
    label: "\u9605\u8BFB\u914D\u8272",
    value: config.theme,
    options: [{
      value: "light",
      label: "暖白"
    }, {
      value: "dark",
      label: "夜间"
    }],
    onChange: v => setConfig("theme", v)
  })), React.createElement(SettingRow, {
    title: "\u5F3A\u8C03\u8272\u65B9\u6848",
    description: "\u4E24\u5957\u5DF2\u7EA6\u675F\u5BF9\u6BD4\u5EA6\u7684\u65B9\u6848\uFF1B\u4EFB\u610F\u989C\u8272\u8F93\u5165\u6682\u4E0D\u5F00\u653E\u3002"
  }, tag("accent"), React.createElement(Segmented, {
    label: "\u5F3A\u8C03\u8272\u65B9\u6848",
    value: config.accent,
    options: [{
      value: "copper",
      label: "铜橙"
    }, {
      value: "marine",
      label: "海蓝"
    }],
    onChange: v => setConfig("accent", v)
  })), React.createElement(SettingRow, {
    title: "\u81EA\u5E26\u6863\u6848\u80CC\u666F",
    description: "\u5173\u95ED\u540E\u56DE\u5230\u7EAF\u8272\uFF1B\u4FDD\u7559\u56FE\u6848\u548C\u6D53\u5EA6\u3002"
  }, tag("background"), React.createElement(Toggle, {
    label: "\u81EA\u5E26\u6863\u6848\u80CC\u666F",
    value: config.background,
    onChange: v => setConfig("background", v)
  })), config.background && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u80CC\u666F\u56FE\u6848",
    description: "\u672C\u5957\u81EA\u5E26\u51E0\u4F55\u80CC\u666F\uFF1B\u56FE\u6848\u5207\u6362\u4ECD\u4E3A\u8BBE\u8BA1\u63D0\u6848\u3002"
  }, tag("backgroundStyle"), select("backgroundStyle", "背景图案", [["grid", "档案网格"], ["contour", "环形线稿"]])), React.createElement(SettingRow, {
    title: "\u80CC\u666F\u6D53\u5EA6",
    description: "0 \u5373\u7EAF\u8272\u3002\u5F53\u524D\u5408\u540C\u5141\u8BB8 0\u201315%\u3002"
  }, tag("backgroundOpacity"), React.createElement("input", {
    type: "range",
    "aria-label": "\u80CC\u666F\u6D53\u5EA6",
    min: "0",
    max: "0.15",
    step: "0.01",
    value: config.backgroundOpacity,
    onChange: e => setConfig("backgroundOpacity", Number(e.target.value))
  }), React.createElement("span", {
    className: "mono"
  }, Math.round(config.backgroundOpacity * 100), "%")))), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u684C\u9762\u966A\u4F34"), React.createElement(Pill, {
    tone: unavailable ? "orange" : config.pet ? "green" : ""
  }, unavailable ? "能力不可用" : config.pet ? "已启用" : "用户已关闭")), React.createElement(SettingRow, {
    title: "\u9CB8\u9C7C\u5A18\u684C\u5BA0",
    description: unavailable ? "恢复能力后仍沿用你的大小、行为与启停选择。" : "关闭后保留参数，随时可重新开启。"
  }, tag("pet"), React.createElement(Toggle, {
    label: "\u9CB8\u9C7C\u5A18\u684C\u5BA0",
    disabled: unavailable,
    value: config.pet,
    onChange: v => setConfig("pet", v)
  })), petEditable && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u89D2\u8272\u5927\u5C0F",
    description: "\u767E\u5206\u6BD4\u4E0E\u8FD0\u884C\u5408\u540C\u4E00\u81F4\uFF1B\u539F\u751F\u663E\u793A\u51E0\u4F55\u4ECD\u5F85\u6838\u5BF9\u3002"
  }, tag("petScale"), React.createElement("input", {
    type: "range",
    "aria-label": "\u89D2\u8272\u5927\u5C0F",
    min: "70",
    max: "140",
    step: "5",
    value: config.petScale,
    onChange: e => setConfig("petScale", Number(e.target.value))
  }), React.createElement("span", {
    className: "mono"
  }, config.petScale, "%")), React.createElement(SettingRow, {
    title: "\u884C\u4E3A\u98CE\u683C",
    description: "\u5408\u540C\u5DF2\u652F\u6301\uFF1B\u5F53\u524D\u59FF\u6001\u9884\u89C8\u4E0D\u4EE3\u66FF\u539F\u751F\u884C\u4E3A\u5B9E\u6D4B\u3002"
  }, tag("profile"), select("profile", "行为风格", [["gentle", "安静陪伴"], ["free", "自由活动"], ["lively", "活泼一点"]])))), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u52A8\u6001\u4E0E\u5E72\u6270")), React.createElement(SettingRow, {
    title: "\u52A8\u6001\u6548\u679C",
    description: "\u51CF\u5C11\u52A8\u6001\u65F6\u8DF3\u8FC7\u5F00\u573A\u3001\u81EA\u52A8\u52A8\u4F5C\u4E0E\u9F20\u6807\u8DDF\u968F\u3002"
  }, tag("motion"), React.createElement(Segmented, {
    label: "\u52A8\u6001\u6548\u679C",
    value: config.motion,
    options: [{
      value: "system",
      label: "跟随系统"
    }, {
      value: "reduced",
      label: "减少动态"
    }],
    onChange: v => setConfig("motion", v)
  }))), React.createElement("div", {
    className: "notice"
  }, React.createElement(Icon, {
    name: "settings"
  }), React.createElement("span", null, "\u81EA\u4E3B\u6D3B\u52A8\u3001\u9F20\u6807\u8DDF\u968F\u3001\u53CD\u9988\u6587\u6848\u53CA\u6A21\u578B/\u72B6\u6001\u89C4\u5219\u5728\u201C\u66F4\u591A\u201D\u4E2D\u3002\u6CA1\u6709\u63D0\u4F9B\u7684\u670D\u88C5\u4E0E\u58F0\u97F3\u9009\u9879\u9690\u85CF\u3002"))) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "config-scope-note"
  }, React.createElement(Pill, {
    tone: "blue"
  }, "\u6A21\u62DF\u4E0E\u5408\u540C\u5206\u5F00"), React.createElement("p", null, "\u884C\u4E3A\u98CE\u683C\u3001\u81EA\u4E3B\u6D3B\u52A8\u3001\u8DDF\u968F\u9F20\u6807\u5DF2\u6709\u5408\u540C\u5B57\u6BB5\uFF0C\u5C1A\u5F85\u65B0\u5BBF\u4E3B\u884C\u4E3A\u590D\u9A8C\u3002\u70B9\u51FB\u3001\u4E8B\u4EF6\u89C4\u5219\u3001\u65B0\u5F00\u573A\u53CA\u9759\u6001\u56DE\u9000\u4ECD\u4E3A\u672C\u5730\u6A21\u62DF\u3002")), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u884C\u4E3A\u4E0E\u6D3B\u52A8\u9891\u7387"), React.createElement(Pill, null, "\u5408\u540C\u53EF\u8868\u8FBE")), !petEditable ? React.createElement("div", {
    className: "notice"
  }, unavailable ? "能力不可用" : "桌宠已关闭", "\uFF0C\u884C\u4E3A\u53C2\u6570\u5DF2\u4FDD\u7559\u3002\u53EF\u5728\u5E38\u7528\u8BBE\u7F6E\u6062\u590D\u540E\u8C03\u6574\u3002") : React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u81EA\u4E3B\u6D3B\u52A8",
    description: "\u9ED8\u8BA4\u5173\u95ED\u3002\u5728\u6B64\u6F14\u793A\u6846\u5185\u6309\u95F4\u9694\u5207\u6362\u59FF\u6001\uFF0C\u4E0D\u8C03\u7528\u6A21\u578B\u3002"
  }, tag("autonomous"), React.createElement(Toggle, {
    label: "\u81EA\u4E3B\u6D3B\u52A8",
    value: config.autonomous,
    onChange: v => setConfig("autonomous", v)
  })), config.autonomous && React.createElement(SettingRow, {
    title: "\u81EA\u4E3B\u6D3B\u52A8\u95F4\u9694",
    description: "\u95F4\u9694\u5B57\u6BB5\u5C1A\u672A\u8FDB\u5165\u8FD0\u884C\u5408\u540C\uFF1B\u524D\u53F0\u6F14\u793A\u4F1A\u9075\u5B88\u5F53\u524D\u9009\u62E9\u3002"
  }, tag("activityFrequency"), React.createElement("select", {
    "aria-label": "\u81EA\u4E3B\u6D3B\u52A8\u95F4\u9694",
    value: config.activityFrequency,
    onChange: e => setConfig("activityFrequency", Number(e.target.value))
  }, [30, 60, 90].map(n => React.createElement("option", {
    key: n,
    value: n
  }, n, " \u79D2")))), React.createElement(SettingRow, {
    title: "\u8DDF\u968F\u9F20\u6807",
    description: "\u53EA\u5728\u684C\u5BA0\u6F14\u793A\u6846\u8F7B\u5FAE\u4F4D\u79FB\uFF1B\u539F\u751F\u684C\u9762\u8DDF\u968F\u672A\u5728\u672C\u8F6E\u5B9E\u6D4B\u3002"
  }, tag("followMouse"), React.createElement(Toggle, {
    label: "\u8DDF\u968F\u9F20\u6807",
    value: config.followMouse,
    onChange: v => setConfig("followMouse", v)
  })))), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u70B9\u51FB\u4E0E\u6587\u5B57"), React.createElement(Pill, {
    tone: "blue"
  }, "\u8BBE\u8BA1\u6A21\u62DF")), React.createElement(SettingRow, {
    title: "\u663E\u793A\u77ED\u6C14\u6CE1",
    description: "\u53EA\u5F71\u54CD\u53EF\u9009\u6587\u5B57\uFF1B\u9700\u8981\u5904\u7406\u7684\u9759\u6001\u72B6\u6001\u4E0E\u56FA\u5B9A\u63D0\u793A\u4E0D\u53D7\u5F71\u54CD\u3002"
  }, tag("bubbles"), React.createElement(Toggle, {
    label: "\u663E\u793A\u77ED\u6C14\u6CE1",
    value: config.bubbles,
    onChange: v => setConfig("bubbles", v)
  })), React.createElement(SettingRow, {
    title: "\u70B9\u51FB\u56DE\u5E94",
    description: "\u6D3B\u52A8\u4E2D\u7684\u91CD\u590D\u70B9\u51FB\u5408\u5E76\uFF0C\u4E0D\u53E0\u52A0\u961F\u5217\u3002"
  }, tag("clickResponse"), React.createElement(Toggle, {
    label: "\u70B9\u51FB\u56DE\u5E94",
    disabled: !petEditable,
    value: config.clickResponse,
    onChange: v => setConfig("clickResponse", v)
  })), petEditable && config.clickResponse && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u70B9\u51FB\u52A8\u4F5C"
  }, tag("clickAction"), select("clickAction", "点击动作", [["react", "侧头回应"], ["greet", "轻轻挥手"], ["idle", "静态待机"]])), React.createElement(SettingRow, {
    title: "\u70B9\u51FB\u51B7\u5374",
    description: "\u51B7\u5374\u5185\u7684\u518D\u6B21\u89E6\u53D1\u5FFD\u7565\uFF1B\u6B63\u5728\u8868\u6F14\u65F6\u5408\u5E76\u3002"
  }, tag("clickCooldown"), React.createElement(NumberField, {
    label: "\u70B9\u51FB\u51B7\u5374",
    value: config.clickCooldown,
    min: 0,
    max: 10,
    step: 1,
    onCommit: v => setConfig("clickCooldown", v)
  }), React.createElement("span", null, "\u79D2")), config.bubbles && React.createElement(SettingRow, {
    title: "\u70B9\u51FB\u77ED\u53E5",
    description: "\u6700\u591A 40 \u5B57\uFF0C\u53EF\u7559\u7A7A\u3002"
  }, tag("clickText"), text("clickText", "点击短句", 40)))), effective.feedbackDeclared && React.createElement(React.Fragment, null, React.createElement("section", {
    className: "setting-section",
    id: "feedback-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u5DE5\u4F5C\u53CD\u9988"), React.createElement(Pill, {
    tone: "blue"
  }, "\u5F53\u524D\u4F1A\u8BDD\u6A21\u62DF")), React.createElement(SettingRow, {
    title: "\u4EFB\u52A1\u5B8C\u6210\u53CD\u9988",
    description: "\u9ED8\u8BA4\u53EA\u63D0\u793A\u5F53\u524D\u793A\u4F8B\u4F1A\u8BDD\uFF1B\u771F\u5B9E\u4E8B\u4EF6\u6E90\u672A\u63A5\u5165\u3002"
  }, tag("completion"), React.createElement(Toggle, {
    label: "\u4EFB\u52A1\u5B8C\u6210\u53CD\u9988",
    value: config.completion,
    disabled: unavailable,
    onChange: v => setConfig("completion", v)
  })), config.completion && !unavailable && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u5B8C\u6210\u65F6\u7684\u52A8\u4F5C"
  }, tag("completionAction"), select("completionAction", "完成时的动作", [["greet", "轻轻挥手"], ["stretch", "伸个懒腰"], ["idle", "静态待机"]])), React.createElement(SettingRow, {
    title: "\u6700\u77ED\u63D0\u9192\u95F4\u9694",
    description: "\u5B8C\u6210\u4E8B\u4EF6\u53BB\u91CD\uFF1B\u9700\u8981\u5904\u7406\u4E0D\u53D7\u6B64\u51B7\u5374\u963B\u62E6\u3002"
  }, tag("cooldown"), React.createElement(NumberField, {
    label: "\u6700\u77ED\u63D0\u9192\u95F4\u9694",
    value: config.cooldown,
    min: 5,
    max: 300,
    step: 5,
    onCommit: v => setConfig("cooldown", v)
  }), React.createElement("span", null, "\u79D2")), config.bubbles && React.createElement(SettingRow, {
    title: "\u5B8C\u6210\u77ED\u53E5",
    description: "\u6700\u591A 60 \u5B57\uFF0C\u53EF\u7559\u7A7A\u3002"
  }, tag("completionText"), text("completionText", "完成短句", 60)), React.createElement(Button, {
    small: true,
    icon: "play",
    disabled: !effective.petRunning,
    onClick: onPlay
  }, "\u770B\u770B\u5B8C\u6210\u6548\u679C")), React.createElement(SettingRow, {
    title: "\u9700\u8981\u5904\u7406\u63D0\u793A",
    description: "\u63D0\u793A\u53EF\u5173\u95ED\uFF1B\u539F\u4F1A\u8BDD\u7684\u5904\u7406\u72B6\u6001\u4FDD\u7559\uFF0C\u5E76\u51BB\u7ED3\u89D2\u8272\u76F4\u5230\u6A21\u62DF\u89E3\u9664\u3002"
  }, tag("needsFeedback"), React.createElement(Toggle, {
    label: "\u9700\u8981\u5904\u7406\u63D0\u793A",
    value: config.needsFeedback,
    disabled: unavailable,
    onChange: v => setConfig("needsFeedback", v)
  })), config.needsFeedback && config.bubbles && !unavailable && React.createElement(SettingRow, {
    title: "\u5904\u7406\u77ED\u53E5",
    description: "\u4E0D\u4EE3\u66FF\u539F\u4F1A\u8BDD\u4FE1\u606F\uFF0C\u6700\u591A 60 \u5B57\u3002"
  }, tag("needsText"), text("needsText", "处理短句", 60))), React.createElement("section", {
    className: "setting-section",
    id: "mapping-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u6A21\u578B\u4E0E\u72B6\u6001\u89C4\u5219"), React.createElement(Pill, {
    tone: "blue"
  }, "\u793A\u4F8B\u7F16\u8F91\u5668")), React.createElement(SettingRow, {
    title: "\u542F\u7528\u4E13\u5C5E\u89C4\u5219",
    description: "\u6309\u6A21\u578B/\u72B6\u6001\u8986\u76D6\u672C\u5957\u9ED8\u8BA4\u52A8\u4F5C\u4E0E\u77ED\u53E5\uFF1B\u672A\u6620\u5C04\u65F6\u56DE\u9ED8\u8BA4\u3002\u4E0D\u63D0\u4F9B\u4E0D\u5B58\u5728\u7684\u5F62\u8C61\u53D8\u4F53\u3002"
  }, tag("mappingEnabled"), React.createElement(Toggle, {
    label: "\u542F\u7528\u4E13\u5C5E\u89C4\u5219",
    value: config.mappingEnabled,
    disabled: unavailable,
    onChange: v => setConfig("mappingEnabled", v)
  })), config.mappingEnabled && !unavailable && React.createElement(RuleEditor, {
    rules: config.eventRules,
    onChange: v => setConfig("eventRules", v),
    onPreview: onPreviewRule,
    disabled: !effective.petRunning
  }))), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u5F00\u573A"), React.createElement(Pill, {
    tone: "blue"
  }, "\u672C\u5730\u53C2\u8003")), React.createElement(SettingRow, {
    title: "\u542F\u52A8\u5F00\u573A",
    description: "\u51CF\u5C11\u52A8\u6001\u6216\u505C\u6B62\u65F6\u8DF3\u8FC7\uFF1B\u6062\u590D\u6548\u679C\u4E0D\u91CD\u64AD\u3002"
  }, tag("startup"), React.createElement(Toggle, {
    label: "\u542F\u52A8\u5F00\u573A",
    value: config.startup,
    onChange: v => setConfig("startup", v)
  })), config.startup && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u5F00\u573A\u65B9\u6848"
  }, tag("startupStyle"), select("startupStyle", "开场方案", [["scan", "档案＋扫描（参考）"], ["archive", "纯档案底板"]])), React.createElement(SettingRow, {
    title: "\u81EA\u52A8\u64AD\u653E\u6761\u4EF6",
    description: "\u624B\u52A8\u9884\u89C8\u59CB\u7EC8\u53EF\u7528\uFF1B\u771F\u5B9E\u51B7\u542F\u52A8\u63A5\u5165\u5F85\u6A21\u5757\u9A8C\u8BC1\u3002"
  }, tag("startupPolicy"), select("startupPolicy", "自动播放条件", [["cold", "只在冷启动"], ["manual", "仅手动播放"]]))))))), React.createElement("footer", {
    className: "settings-foot"
  }, React.createElement("span", {
    className: "caption"
  }, saveProblem ? "仅本次有效" : "按本套保存覆写", " \xB7 ", changed ? "已自定义" : "本套默认"), React.createElement("div", {
    className: "row",
    style: {
      gap: 8
    }
  }, React.createElement(Button, {
    small: true,
    onClick: onExport,
    icon: "download"
  }, "\u5BFC\u51FA\u8BBE\u8BA1\u8986\u5199"), React.createElement(Button, {
    small: true,
    onClick: onReset
  }, "\u91CD\u7F6E\u672C\u5957\u53C2\u6570")))));
}
function FlowScreen({
  config,
  effective,
  feedbackKind,
  simulatedModel,
  onSimulatedModel,
  onResolveAttention,
  introSeconds,
  reduced,
  stopped,
  phase,
  elapsed,
  onStart,
  onSkip,
  onStep,
  action,
  bubble,
  onReact,
  onComplete,
  onNeed,
  onIdle,
  onStop,
  log,
  onMediaError
}) {
  const disabledPet = !effective.petRunning;
  const [pointer, setPointer] = React.useState({
    x: 0,
    y: 0
  });
  const follows = config.followMouse && effective.petRunning && !effective.attention && !reduced;
  const canvas = 200 * config.petScale / 100;
  const profileName = {
    gentle: "安静陪伴",
    free: "自由活动",
    lively: "活泼一点"
  }[config.profile];
  function follow(e) {
    if (!follows) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPointer({
      x: Math.max(-5, Math.min(5, (e.clientX - r.left - r.width / 2) / r.width * 10)),
      y: Math.max(-3, Math.min(3, (e.clientY - r.top - r.height / 2) / r.height * 6))
    });
  }
  return React.createElement("section", {
    className: "flow-page",
    "data-screen-label": "03 \u542F\u52A8\u3001\u5DE5\u4F5C\u533A\u4E0E\u684C\u5BA0"
  }, React.createElement("div", {
    className: "flow-main"
  }, React.createElement("header", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "CONTINUITY / 03"), React.createElement("h1", null, "\u4ECE\u8FDB\u5165\uFF0C\u5230\u966A\u4F34\u3002")), React.createElement(Pill, {
    tone: "blue"
  }, "\u672C\u5730\u65F6\u5E8F\u6A21\u62DF")), React.createElement("div", {
    className: "startup-preview"
  }, phase === "scan" && !reduced && !stopped ? React.createElement(React.Fragment, null, React.createElement("video", {
    key: "scan",
    className: "startup-video",
    src: "assets/reference/whale-girl-scan.mp4",
    autoPlay: true,
    muted: true,
    playsInline: true,
    onEnded: () => onStep("workspace"),
    onError: onMediaError
  }), React.createElement("span", {
    className: "scan-credit"
  }, "NativeDog1 / dsh-boot-animation \xB7 \u4E0A\u6E38\u6807\u6CE8 BSD-3-Clause\uFF0C\u539F\u4F5C\u8005\u5F85\u786E\u8BA4")) : React.createElement("div", {
    className: "startup-inner"
  }, React.createElement("div", {
    className: "archive-kicker"
  }, React.createElement("span", null, "DSH / PERSONAL WORKSPACE"), React.createElement("span", null, "ARCHIVE \u2014 001")), React.createElement("div", null, React.createElement("div", {
    className: "eyebrow",
    style: {
      marginBottom: 15
    }
  }, phase === "workspace" ? "WORKSPACE READY" : phase === "archive" ? "OPENING YOUR WORKSPACE" : "WELCOME BACK"), React.createElement("h2", {
    className: "startup-title"
  }, phase === "workspace" ? "继续，把事情做好。" : phase === "archive" ? "翻开今天的档案。" : "欢迎回来。"), React.createElement("p", {
    className: "startup-sub"
  }, phase === "workspace" ? "开场交给工作区，角色回到桌面待机。" : reduced ? "减少动态已启用。以静态画面进入工作区。" : "一张暖白底板，一段安静的开场。")), React.createElement("div", {
    className: "startup-bottom"
  }, React.createElement("div", null, React.createElement("span", {
    className: "mono"
  }, phase === "archive" ? "01 / 03 · 档案" : phase === "workspace" ? "03 / 03 · 工作区" : "LOCAL PREVIEW"), React.createElement("span", {
    className: "caption"
  }, "\u65E0\u58F0 \xB7 \u7A97\u53E3\u8303\u56F4 \xB7 \u968F\u65F6\u8DF3\u8FC7")), React.createElement("span", {
    className: "archive-stamp"
  }, phase === "workspace" ? "READY" : "ARCHIVE"))), (phase === "archive" || phase === "scan") && React.createElement("button", {
    className: "button small skip-intro",
    onClick: onSkip
  }, "\u8DF3\u8FC7\u5F00\u573A ", React.createElement("span", {
    className: "mono"
  }, "ESC")), React.createElement("div", {
    className: "progress-line"
  }, React.createElement("span", {
    style: {
      width: phase === "workspace" ? "100%" : Math.min(elapsed / introSeconds * 100, 100) + "%"
    }
  }))), React.createElement("div", {
    className: "sequence-controls"
  }, React.createElement(Button, {
    icon: "play",
    kind: "primary",
    onClick: onStart
  }, "\u64AD\u653E\u5B8C\u6574\u8854\u63A5"), React.createElement(Button, {
    small: true,
    onClick: () => onStep("archive")
  }, "\u6863\u6848"), React.createElement(Button, {
    small: true,
    disabled: config.startupStyle === "archive",
    onClick: () => onStep("scan")
  }, "\u626B\u63CF"), React.createElement(Button, {
    small: true,
    onClick: () => onStep("workspace")
  }, "\u5DE5\u4F5C\u533A"), React.createElement("span", {
    className: "caption"
  }, reduced ? "当前：减少动态" : stopped ? "当前：效果已停止" : config.startupStyle === "archive" ? "1.2 秒纯档案 → 工作区" : "1.2 秒档案 → 7.04 秒原片 → 工作区")), React.createElement("div", {
    className: "simulation-model"
  }, React.createElement("label", null, "\u793A\u4F8B\u4F1A\u8BDD\u6A21\u578B", React.createElement("select", {
    "aria-label": "\u793A\u4F8B\u4F1A\u8BDD\u6A21\u578B",
    value: simulatedModel,
    onChange: e => onSimulatedModel(e.target.value)
  }, React.createElement("option", {
    value: "example-deepseek"
  }, "DeepSeek\uFF08\u793A\u4F8B\uFF09"), React.createElement("option", {
    value: "example-other"
  }, "\u6A21\u578B B\uFF08\u793A\u4F8B\uFF09"))), React.createElement("span", {
    className: "caption"
  }, "\u4EC5\u9884\u6F14\u6620\u5C04\uFF1B\u5207\u6362\u793A\u4F8B\u4F1A\u8BDD\u4F1A\u4F7F\u65E7\u53CD\u9988\u5931\u6548\u3002")), effective.attention && React.createElement("div", {
    className: "attention-status",
    role: "status",
    "data-feedback-state": "needs-user"
  }, React.createElement(Icon, {
    name: "flag"
  }), React.createElement("div", null, React.createElement("strong", null, "\u9700\u8981\u4F60\u5904\u7406"), React.createElement("p", null, "\u539F\u4F1A\u8BDD\u4E8B\u9879\u4ECD\u5728\u3002\u89D2\u8272\u4FDD\u6301\u9759\u6001\uFF0C\u6C14\u6CE1\u5F00\u5173\u4E0D\u6539\u53D8\u6B64\u72B6\u6001\u3002")), React.createElement(Button, {
    small: true,
    onClick: onResolveAttention
  }, "\u6A21\u62DF\u5DF2\u5904\u7406")), React.createElement("div", {
    className: "desktop-preview",
    "data-pet-status": effective.petStatus,
    "data-profile": config.profile,
    "data-feedback-kind": effective.attention ? "needs-user" : feedbackKind,
    onPointerMove: follow,
    onPointerLeave: () => setPointer({
      x: 0,
      y: 0
    })
  }, React.createElement("div", {
    className: "desktop-copy"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "DESKTOP COMPANION / LOCAL SIMULATION"), React.createElement("h3", null, disabledPet ? effective.reason : effective.attention ? "等你处理，安静在旁。" : "我在这里。"), React.createElement("p", null, disabledPet ? "大小、行为与关闭意图均保留，管理入口可继续使用。" : effective.attention ? "先回到会话查看原始事项，解除后再继续互动。" : "点击角色试试回应，或模拟一条任务结果。"), React.createElement("p", {
    className: "companion-summary"
  }, config.petScale, "% \xB7 ", profileName, " \xB7 \u81EA\u4E3B", config.autonomous ? "开启" : "关闭", " \xB7 \u8DDF\u968F", config.followMouse ? "开启" : "关闭"), React.createElement("div", {
    className: "row",
    style: {
      gap: 7,
      marginTop: 16,
      flexWrap: "wrap"
    }
  }, effective.feedbackDeclared && React.createElement(React.Fragment, null, React.createElement(Button, {
    small: true,
    disabled: disabledPet || !config.completion,
    onClick: onComplete
  }, "\u4EFB\u52A1\u5B8C\u6210"), React.createElement(Button, {
    small: true,
    disabled: disabledPet,
    onClick: onNeed
  }, "\u9700\u8981\u5904\u7406")), React.createElement(Button, {
    small: true,
    disabled: disabledPet,
    onClick: onIdle
  }, "\u56DE\u5F85\u673A"))), disabledPet ? React.createElement("div", {
    className: "empty-pet",
    role: "status"
  }, React.createElement(Icon, {
    name: effective.petStatus === "unavailable" ? "warning" : "pause"
  }), React.createElement("strong", null, effective.reason), React.createElement("span", {
    className: "caption"
  }, effective.petStatus === "unavailable" ? "恢复能力后保留原参数与关闭意图" : "管理入口仍然可用")) : React.createElement("div", {
    className: "pet-area",
    style: {
      width: canvas,
      height: canvas,
      transform: follows ? "translate(" + pointer.x + "px," + pointer.y + "px)" : "none"
    }
  }, React.createElement("button", {
    className: "pet-click",
    "aria-label": "\u70B9\u51FB\u9CB8\u9C7C\u5A18",
    onClick: onReact
  }, React.createElement(PetMedia, {
    action: action,
    reduced: reduced,
    staticPose: effective.freezePose || action === "idle" && feedbackKind !== "idle",
    onError: onMediaError
  })), bubble && config.bubbles && React.createElement("div", {
    className: "pet-bubble",
    role: "status"
  }, bubble)), React.createElement("button", {
    className: "iconbutton pet-menu",
    "aria-label": stopped ? "恢复皮肤效果" : "停止皮肤效果",
    onClick: onStop
  }, React.createElement(Icon, {
    name: stopped ? "play" : "pause"
  })))), React.createElement("aside", {
    className: "flow-side"
  }, React.createElement("h3", null, "\u4E00\u6B21\u8854\u63A5\uFF0C\u4E09\u4E2A\u5C42\u6B21"), React.createElement("div", {
    className: "step"
  }, React.createElement("span", {
    className: "stepnum"
  }, "01"), React.createElement("div", null, React.createElement("h4", null, "\u6863\u6848 / 1.2 \u79D2"), React.createElement("p", null, "\u6696\u767D\u4E0E\u6A59\u8272\u5EFA\u7ACB\u5F00\u573A\u8BC6\u522B\u3002\u6587\u5B57\u53EA\u53D9\u8FF0\u8FDB\u5165\uFF0C\u4E0D\u4F2A\u9020\u6388\u6743\u6216\u8EAB\u4EFD\u6838\u9A8C\u3002"))), React.createElement("div", {
    className: "step"
  }, React.createElement("span", {
    className: "stepnum"
  }, "02"), React.createElement("div", null, React.createElement("h4", null, "\u626B\u63CF / 7.04 \u79D2"), React.createElement("p", null, "\u539F\u7247\u6309\u7A97\u53E3\u5BB9\u7EB3\uFF0C\u4E0D\u88C1\u5173\u952E\u5185\u5BB9\u3002\u51B7\u542F\u52A8\u53EF\u64AD\u653E\uFF0C\u8FD0\u884C\u4E2D\u542F\u7528\u4E0D\u5F3A\u5236\u91CD\u64AD\u3002"))), React.createElement("div", {
    className: "step"
  }, React.createElement("span", {
    className: "stepnum"
  }, "03"), React.createElement("div", null, React.createElement("h4", null, "\u5DE5\u4F5C\u533A / \u6301\u7EED"), React.createElement("p", null, "\u6B63\u6587\u4F7F\u7528\u7A33\u5B9A\u8868\u9762\uFF1B\u89D2\u8272\u56DE\u5230\u684C\u9762\uFF0C\u4E0D\u8986\u76D6\u804A\u5929\u8F93\u5165\u533A\u3002"))), React.createElement("div", {
    className: "notice"
  }, "\u540C\u4E00\u89D2\u8272\uFF0C\u4ECE\u626B\u63CF\u8FD1\u666F\u5EF6\u4F38\u4E3A\u684C\u9762 Q \u7248\u3002\u59FF\u6001\u4E0E\u8F7B\u52A8\u6001\u4E3A\u672C\u8F6E\u8BBE\u8BA1\u7A3F\uFF0C\u5B8C\u6574\u52A8\u4F5C\u4ECD\u5F85\u5236\u4F5C\u3002"), React.createElement("div", {
    className: "timeline-log",
    "aria-live": "polite"
  }, log.join("\n") || "等待预览事件…")));
}
function SpecScreen({
  theme,
  accent,
  onTheme
}) {
  const colors = [["阅读底板", "--paper", theme === "dark" ? "#202423" : "#F4F1E9"], ["稳定表面", "--surface", theme === "dark" ? "#292E2C" : "#FFFDF8"], ["正文墨色", "--ink", theme === "dark" ? "#F1EFE6" : "#2B302C"], ["操作强调", "--accent", accent === "marine" ? theme === "dark" ? "#91C3D7" : "#35677E" : theme === "dark" ? "#F2AB71" : "#A54C19"], ["角色信号", "--signal", theme === "dark" ? "#91C3D7" : "#35677E"], ["分隔边界", "--line", theme === "dark" ? "#494F46" : "#D9D4C7"]];
  return React.createElement("section", {
    className: "spec-page",
    "data-screen-label": "04 \u89C6\u89C9\u89C4\u8303"
  }, React.createElement("div", {
    className: "spec-top"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "ARCHIVE WARM / VISUAL NOTES 01"), React.createElement("h1", null, "\u6709\u6E29\u5EA6\uFF0C\u4E5F\u6709\u79E9\u5E8F\u3002"), React.createElement("p", null, "\u6CBF\u7528\u6863\u6848\u6696\u767D\u4E0E\u6A59\u8272\u8BC6\u522B\uFF0C\u5C06\u5F00\u573A\u7684\u53D9\u4E8B\u611F\u6536\u8FDB\u65E5\u5E38\u5DE5\u4F5C\u3002\u89D2\u8272\u8D1F\u8D23\u77ED\u6682\u56DE\u5E94\uFF0C\u9605\u8BFB\u59CB\u7EC8\u5360\u636E\u4E2D\u5FC3\u3002")), React.createElement(Segmented, {
    label: "\u89C4\u8303\u6A21\u5F0F",
    value: theme,
    options: [{
      value: "light",
      label: "暖白"
    }, {
      value: "dark",
      label: "夜间稿"
    }],
    onChange: onTheme
  })), React.createElement("div", {
    className: "spec-grid"
  }, React.createElement("section", {
    className: "spec-section"
  }, React.createElement("header", null, React.createElement("span", null, "01"), React.createElement("h2", null, "\u989C\u8272\u6709\u5404\u81EA\u7684\u804C\u8D23")), React.createElement("div", {
    className: "swatches"
  }, colors.map(c => React.createElement("div", {
    className: "swatch",
    key: c[1]
  }, React.createElement("div", {
    className: "swatch-color",
    style: {
      background: "var(" + c[1] + ")"
    }
  }), React.createElement("b", null, c[0]), React.createElement("small", null, c[2])))), React.createElement("p", {
    className: "spec-text"
  }, "\u53C2\u8003\u6A59 #FF7500 \u7559\u7ED9\u5927\u5757\u8BC6\u522B\u4E0E\u88C5\u9970\uFF1B\u5C0F\u5B57\u53F7\u64CD\u4F5C\u6587\u5B57\u52A0\u6DF1\u4E3A #A54C19\u3002\u84DD\u8272\u7528\u4E8E\u89D2\u8272\u4E0E\u72B6\u6001\uFF0C\u4E0D\u66FF\u4EE3\u64CD\u4F5C\u5F3A\u8C03\u3002\u9519\u8BEF\u53E6\u7528\u7EA2\u8272\uFF0C\u5E76\u9644\u6587\u5B57\u3002")), React.createElement("section", {
    className: "spec-section"
  }, React.createElement("header", null, React.createElement("span", null, "02"), React.createElement("h2", null, "\u5148\u8BFB\u6E05\u695A\uFF0C\u518D\u6709\u6027\u683C")), React.createElement("div", {
    className: "type-sample"
  }, React.createElement("span", {
    className: "display"
  }, "\u7FFB\u5F00\u4ECA\u5929\u7684\u6863\u6848\u3002"), React.createElement("small", null, "\u5C55\u793A / 30\u201352")), React.createElement("div", {
    className: "type-sample"
  }, React.createElement("span", null, "\u8BBE\u7F6E\u4E0E\u65E5\u5E38\u64CD\u4F5C"), React.createElement("small", null, "\u7CFB\u7EDF\u65E0\u886C\u7EBF / 13\u201315")), React.createElement("div", {
    className: "type-sample"
  }, React.createElement("span", {
    className: "reading-type"
  }, "\u628A\u91CD\u8981\u7684\u5185\u5BB9\uFF0C\u7559\u5728\u6E05\u6670\u7684\u8868\u9762\u3002"), React.createElement("small", null, "\u6B63\u6587 / 15 \xB7 1.85")), React.createElement("div", {
    className: "type-sample"
  }, React.createElement("span", {
    className: "mono"
  }, "const state = \"ready\";"), React.createElement("small", null, "\u7B49\u5BBD / 12 \xB7 1.8")), React.createElement("p", {
    className: "spec-text"
  }, "\u4E2D\u6587\u7CFB\u7EDF\u5B57\u4F53 PingFang SC\uFF0C\u5C55\u793A\u6587\u5B57 Songti SC\uFF1BLatin \u4E0E\u4E2D\u6587\u5206\u522B\u56DE\u9000\u3002\u4E0D\u643A\u5E26\u5916\u90E8\u5B57\u4F53\uFF0C\u4E0D\u4FEE\u6539\u7528\u6237\u5B57\u53F7\u504F\u597D\u3002")), React.createElement("section", {
    className: "spec-section"
  }, React.createElement("header", null, React.createElement("span", null, "03"), React.createElement("h2", null, "\u72B6\u6001\u4E0D\u53EA\u9760\u989C\u8272")), React.createElement("div", {
    className: "component-samples"
  }, React.createElement(Button, {
    kind: "primary"
  }, "\u4E3B\u8981\u64CD\u4F5C"), React.createElement(Button, null, "\u666E\u901A\u64CD\u4F5C"), React.createElement(Button, {
    disabled: true
  }, "\u4E0D\u53EF\u7528"), React.createElement(Button, {
    kind: "quiet"
  }, "\u6B21\u8981\u64CD\u4F5C")), React.createElement("div", {
    className: "component-samples",
    style: {
      marginTop: 18
    }
  }, React.createElement("button", {
    className: "button focus-demo"
  }, "\u952E\u76D8\u7126\u70B9"), React.createElement(Pill, {
    tone: "orange"
  }, "\u5DF2\u9009\u4E2D"), React.createElement(Pill, {
    tone: "green"
  }, "\u5DF2\u5B8C\u6210"), React.createElement(Pill, {
    tone: "red"
  }, "\u8FDE\u63A5\u4E2D\u65AD")), React.createElement("div", {
    className: "notice blue",
    style: {
      marginTop: 18
    }
  }, React.createElement(Icon, {
    name: "flag"
  }), "\u9700\u8981\u4F60\u5904\u7406\uFF1A\u4FDD\u7559\u539F\u59CB\u8BF7\u6C42\u5165\u53E3\u3002"), React.createElement("p", {
    className: "spec-text"
  }, "\u60AC\u505C\u52A0\u5E95\u8272\uFF1B\u9009\u4E2D\u6709\u6587\u6848\u6216\u6807\u8BB0\uFF1B\u7126\u70B9\u4E3A 2px \u5916\u63CF\u8FB9\uFF1B\u7981\u7528\u4FDD\u7559\u539F\u56E0\u3002\u70B9\u51FB\u533A\u57DF\u684C\u9762\u81F3\u5C11 32px\uFF0C\u5C0F\u7A97\u53E3\u5173\u952E\u64CD\u4F5C\u81F3\u5C11 36px\u3002")), React.createElement("section", {
    className: "spec-section"
  }, React.createElement("header", null, React.createElement("span", null, "04"), React.createElement("h2", null, "\u4E00\u81F4\u7684\u8868\u9762\u4E0E\u8282\u594F")), React.createElement("div", {
    className: "spec-space"
  }, [4, 8, 12, 16, 24, 32].map(n => React.createElement("div", {
    className: "space-item",
    key: n
  }, React.createElement("span", {
    style: {
      height: n * 2
    }
  }), n))), React.createElement("p", {
    className: "spec-text"
  }, "4px \u57FA\u7840\u95F4\u8DDD\u3002\u63A7\u4EF6\u5706\u89D2 6px\u3001\u8F93\u5165\u533A 14px\u3001\u7A97\u53E3 18px\uFF1B\u5361\u7247\u53EA\u7528\u4E8E\u72EC\u7ACB\u5185\u5BB9\uFF0C\u5E38\u89C4\u8BBE\u7F6E\u4EE5\u5206\u9694\u7EBF\u7EC4\u7EC7\u3002"), React.createElement("p", {
    className: "spec-text"
  }, "\u8FB9\u6846 1px\u3002\u7126\u70B9\u4E0E\u6587\u5B57\u4E0D\u900F\u660E\uFF1B\u9634\u5F71\u53EA\u7528\u4E8E\u6D6E\u5C42\u548C\u7A97\u53E3\uFF0C\u4E0D\u7ED9\u6BCF\u4E2A\u533A\u5757\u52A0\u5361\u7247\u3002")), React.createElement("section", {
    className: "spec-section"
  }, React.createElement("header", null, React.createElement("span", null, "05"), React.createElement("h2", null, "\u80CC\u666F\u6B62\u4E8E\u9605\u8BFB\u4E4B\u5916")), React.createElement("div", {
    className: "notice"
  }, React.createElement(Icon, {
    name: "file"
  }), "\u6B63\u6587\u3001\u4EE3\u7801\u3001\u8868\u683C\u3001\u83DC\u5355\u59CB\u7EC8\u6709\u7A33\u5B9A\u5E95\u8272\u3002"), React.createElement("p", {
    className: "spec-text"
  }, "\u81EA\u5E26\u7F51\u683C\u53EA\u5728\u4E24\u4FA7\u7559\u767D\u53EF\u89C1\u3002\u89D2\u8272\u4E0D\u8FDB\u5165\u8F93\u5165\u4E0E\u6B63\u6587\u70ED\u533A\u3002\u957F\u4EE3\u7801\u548C\u5BBD\u8868\u683C\u5C40\u90E8\u6EDA\u52A8\uFF1B\u9875\u9762\u6EDA\u52A8\u53EA\u5F52\u5C5E\u804A\u5929\u533A\u3002")), React.createElement("section", {
    className: "spec-section"
  }, React.createElement("header", null, React.createElement("span", null, "06"), React.createElement("h2", null, "\u52A8\u6001\u53EF\u4EE5\u88AB\u5173\u6389")), React.createElement("div", {
    className: "row"
  }, React.createElement(Pill, null, "140ms \u60AC\u505C"), React.createElement(Pill, null, "220ms \u9762\u677F"), React.createElement(Pill, null, "30s \u53CD\u9988\u51B7\u5374")), React.createElement("p", {
    className: "spec-text"
  }, "\u51CF\u5C11\u52A8\u6001\u65F6\uFF1A\u65E0\u626B\u63CF\u3001\u65E0\u81EA\u52A8\u89D2\u8272\u89C6\u9891\u3001\u65E0\u8109\u51B2\u4E0E\u5E73\u6ED1\u6EDA\u52A8\u3002\u72B6\u6001\u4E0E\u6587\u5B57\u4ECD\u4FDD\u7559\u3002\u505C\u6B62\u6548\u679C\u6E05\u7A7A\u961F\u5217\uFF0C\u4E0D\u88AB\u65E7\u56DE\u8C03\u6062\u590D\u3002"), React.createElement("p", {
    className: "spec-text"
  }, "\u6696\u767D\u4E3A\u8BBE\u8BA1\u9ED8\u8BA4\uFF0C\u591C\u95F4\u53EA\u4F5C\u4E3A\u672C\u5957\u5019\u9009\u7A3F\uFF1B\u672A\u5B8C\u6210\u5B9E\u9645\u5BBF\u4E3B\u63A5\u5165\u524D\uFF0C\u4E0D\u627F\u8BFA\u4EFB\u4F55\u5B98\u65B9\u754C\u9762\u5DF2\u8986\u76D6\u3002"))));
}
function AssetsScreen({
  action,
  onAction,
  reduced,
  reviewOnly,
  onMediaError
}) {
  const poses = [{
    key: "idle",
    name: "安静待机",
    note: "默认 · 轻微呼吸"
  }, {
    key: "react",
    name: "侧头回应",
    note: "点击 · 1.8 秒"
  }, {
    key: "greet",
    name: "轻轻挥手",
    note: "完成 · 2.6 秒"
  }, {
    key: "stretch",
    name: "伸个懒腰",
    note: "可选 · 3 秒"
  }];
  const current = poses.find(p => p.key === action) || poses[0];
  return React.createElement("section", {
    className: "asset-page character-r2",
    "data-screen-label": "05 \u7EDF\u4E00\u89D2\u8272\u8BBE\u5B9A R2"
  }, React.createElement("header", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "ONE CHARACTER / TWO SCALES"), React.createElement("h1", null, "\u4ECE\u5F00\u573A\u5230\u684C\u9762\uFF0C\u90FD\u662F\u5979\u3002"), React.createElement("p", {
    className: "caption"
  }, "\u4EE5\u626B\u63CF\u5F62\u8C61\u4E3A\u57FA\u51C6\uFF0C\u7EDF\u4E00\u4E94\u5B98\u3001\u5934\u9970\u4E0E\u914D\u8272\u3002\u753B\u5E45\u53D8\u5C0F\uFF0C\u89D2\u8272\u4E0D\u53D8\u3002")), React.createElement(Pill, {
    tone: "blue"
  }, "R2 \xB7 \u7EDF\u4E00\u89D2\u8272\u7A3F")), reviewOnly && React.createElement("div", {
    className: "notice blue"
  }, "\u5F53\u524D\u4E3A\u9759\u6001\u89D2\u8272\u5BA1\u7A3F\u7D20\u6750\u3002\u8FD0\u884C\u6F14\u793A\u5DF2\u505C\u6B62\u6216\u4E0D\u53EF\u7528\uFF0C\u4E0B\u9762\u7684\u8BBE\u8BA1\u5BF9\u7167\u4E0D\u4EE3\u8868\u684C\u5BA0\u6B63\u5728\u8FD0\u884C\u3002"), React.createElement("div", {
    className: "character-board"
  }, React.createElement("div", {
    className: "character-sample scan-study"
  }, React.createElement("div", {
    className: "character-image scan-reference"
  }, action === "scan" && !reduced ? React.createElement("video", {
    src: "assets/reference/whale-girl-scan.mp4",
    poster: "assets/reference/scan-poster.png",
    controls: true,
    autoPlay: true,
    muted: true,
    playsInline: true,
    onEnded: () => onAction("idle"),
    onError: onMediaError
  }) : React.createElement("img", {
    src: "assets/reference/scan-poster.png",
    alt: "\u89D2\u8272\u57FA\u51C6\uFF1A\u626B\u63CF\u5F00\u573A\u4E2D\u7684\u94F6\u84DD\u957F\u53D1\u3001\u84DD\u9752\u773C\u775B\u3001\u767D\u8272\u8936\u8FB9\u548C\u6DF1\u84DD\u8774\u8776\u7ED3"
  }), React.createElement("span", {
    className: "study-label"
  }, "01 / \u89D2\u8272\u57FA\u51C6")), React.createElement("h3", null, "\u626B\u63CF\u8FD1\u666F"), React.createElement("p", null, "\u4FDD\u7559\u5DF2\u786E\u8BA4\u7684\u626B\u63CF\u7741\u773C\u65B9\u5411\uFF0C\u4F5C\u4E3A\u8138\u90E8\u3001\u53D1\u8272\u548C\u5934\u9970\u7684\u5171\u540C\u4F9D\u636E\u3002"), React.createElement("div", {
    className: "asset-controls"
  }, React.createElement(Button, {
    small: true,
    icon: "play",
    onClick: () => onAction("scan"),
    disabled: reduced
  }, "\u64AD\u653E\u626B\u63CF\u5F00\u573A"), reduced && React.createElement("span", {
    className: "caption"
  }, "\u5F53\u524D\u4FDD\u7559\u9759\u6001\u753B\u9762"))), React.createElement("div", {
    className: "character-sample companion-study"
  }, React.createElement("div", {
    className: "character-image companion-stage"
  }, React.createElement("div", {
    className: "character-orbit",
    "aria-hidden": "true"
  }), React.createElement(PetMedia, {
    action: action === "scan" ? "idle" : action,
    reduced: reduced,
    onError: onMediaError
  }), React.createElement("span", {
    className: "study-label"
  }, "02 / \u540C\u89D2\u8272\u684C\u5BA0"), React.createElement("span", {
    className: "pose-label"
  }, reduced ? "静态待机" : current.name)), React.createElement("h3", null, "\u684C\u9762 Q \u7248"), React.createElement("p", null, "\u540C\u6B3E\u94F6\u84DD\u957F\u53D1\u4E0E\u5934\u9970\uFF0C\u7528\u67D4\u548C\u7ACB\u4F53\u6750\u8D28\u627F\u63A5\u626B\u63CF\u8FD1\u666F\uFF0C\u907F\u514D\u6362\u6210\u53E6\u4E00\u4F4D\u89D2\u8272\u3002"), React.createElement("div", {
    className: "asset-controls pose-buttons"
  }, poses.map(p => React.createElement("button", {
    key: p.key,
    className: "button small " + (action === p.key ? "selected-pose" : ""),
    "aria-pressed": action === p.key,
    onClick: () => onAction(p.key)
  }, p.name))))), React.createElement("div", {
    className: "identity-strip",
    "aria-label": "\u7EDF\u4E00\u89D2\u8272\u8BC6\u522B\u70B9"
  }, React.createElement("div", null, React.createElement("span", {
    className: "identity-color hair"
  }), React.createElement("strong", null, "\u94F6\u84DD\u957F\u53D1"), React.createElement("small", null, "\u7EDF\u4E00\u53D1\u8272\u4E0E\u957F\u53D1\u8F6E\u5ED3")), React.createElement("div", null, React.createElement("span", {
    className: "identity-color eyes"
  }), React.createElement("strong", null, "\u84DD\u9752\u77B3\u8272"), React.createElement("small", null, "\u4FDD\u7559\u51B7\u8272\u7684\u773C\u90E8\u8BC6\u522B")), React.createElement("div", null, React.createElement("span", {
    className: "identity-color headband"
  }), React.createElement("strong", null, "\u767D\u8272\u8936\u8FB9"), React.createElement("small", null, "\u5934\u9970\u9020\u578B\u4FDD\u6301\u4E00\u81F4")), React.createElement("div", null, React.createElement("span", {
    className: "identity-color bow"
  }), React.createElement("strong", null, "\u6DF1\u84DD\u8774\u8776\u7ED3"), React.createElement("small", null, "\u5934\u90E8\u4F4D\u7F6E\u4E0E\u8272\u5F69\u5BF9\u5E94"))), React.createElement("div", {
    className: "pose-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "EXPRESSION / 04 POSES"), React.createElement("h2", null, "\u8868\u60C5\u6709\u53D8\u5316\uFF0C\u8BBE\u5B9A\u4E0D\u6F02\u79FB\u3002")), React.createElement("span", {
    className: "caption"
  }, "\u59FF\u6001\u7A3F + \u8F7B\u52A8\u6001\u9884\u89C8")), React.createElement("div", {
    className: "pose-lineup"
  }, poses.map((p, i) => React.createElement("button", {
    className: "pose-card " + (action === p.key ? "active" : ""),
    key: p.key,
    onClick: () => onAction(p.key),
    "aria-label": "预览" + p.name,
    "aria-pressed": action === p.key
  }, React.createElement("span", {
    className: "pose-number"
  }, "0", i + 1), React.createElement(PetMedia, {
    action: p.key,
    staticPose: true
  }), React.createElement("strong", null, p.name), React.createElement("small", null, p.note)))), React.createElement("div", {
    className: "character-design-note"
  }, React.createElement(Icon, {
    name: "file"
  }), React.createElement("div", null, React.createElement("strong", null, "\u540C\u4E00\u89D2\u8272\u7684\u8BBE\u8BA1\u5EF6\u4F38"), React.createElement("p", null, "\u5168\u8EAB\u5973\u4EC6\u88D9\u3001\u9886\u7ED3\u548C\u978B\u5C65\u662F\u672C\u8F6E\u8865\u5145\u8BBE\u8BA1\uFF0C\u626B\u63CF\u539F\u7247\u672A\u5C55\u793A\u8FD9\u4E9B\u7EC6\u8282\u3002\u56DB\u4E2A\u59FF\u6001\u5171\u7528\u540C\u4E00\u670D\u88C5\uFF1B\u5F53\u524D\u4EE5\u59FF\u6001\u5207\u6362\u548C\u8F7B\u5FAE\u4F4D\u79FB\u52A8\u6548\u6F14\u793A\uFF0C\u5B8C\u6574\u9010\u5E27\u52A8\u4F5C\u5C1A\u5F85\u5236\u4F5C\u3002"))), React.createElement("details", {
    className: "resource-details"
  }, React.createElement("summary", null, "\u7D20\u6750\u6765\u6E90\u4E0E\u8FD0\u884C\u63A5\u5165\u8BF4\u660E"), React.createElement("div", null, React.createElement("p", null, "\u684C\u5BA0\u59FF\u6001\uFF1A\u672C\u8F6E\u7531 imagegen \u6839\u636E\u626B\u63CF\u53C2\u8003\u751F\u6210\uFF0C\u4FDD\u6301\u76F8\u540C\u89D2\u8272\u8BC6\u522B\u70B9\uFF0C\u672A\u4F7F\u7528\u65E7\u684C\u5BA0\u89C6\u9891\u3002\u626B\u63CF\u7247\u6765\u6E90\u4E3A LeeRolling \u2192 NativeDog1\uFF1B\u539F\u4F5C\u8005\u4E0E NOTICE \u6458\u8981\u5DEE\u5F02\u4ECD\u5F85\u6838\u5BF9\uFF0C\u5F53\u524D\u4EC5\u4F5C\u672C\u5730\u53C2\u8003\u3002"), React.createElement("p", null, "\u65E7\u7248\u4E0E\u539F\u7D20\u6750\u4FDD\u7559\u5728 index-r1.html \u548C assets/whale-maid/\u3002\u73B0\u6709 formatVersion 2 \u5185\u5BB9\u5305\u662F R1 \u6280\u672F\u9A8C\u8BC1\u5305\uFF0C\u4ECD\u5F15\u7528\u65E7\u684C\u5BA0\uFF0C\u4E0D\u4EE3\u8868\u672C\u8F6E R2 \u89D2\u8272\u5DF2\u63A5\u5165\u5B9E\u9645 DSH\u3002\u65B0\u89D2\u8272\u5C1A\u672A\u8FDB\u5165\u8FD0\u884C\u5305\u3002"))));
}
Object.assign(window, {
  SettingsScreen,
  FlowScreen,
  SpecScreen,
  AssetsScreen
});
