function SettingsScreen({
  config,
  defaults,
  setConfig,
  scenario,
  setScenario,
  stopped,
  onReset,
  onStop,
  onPlay,
  onExport,
  saveProblem
}) {
  const changed = Object.keys(defaults).some(k => config[k] !== defaults[k]);
  const tag = key => React.createElement(Pill, {
    tone: config[key] === defaults[key] ? "" : "orange"
  }, config[key] === defaults[key] ? "默认" : "已自定义");
  const unavailable = scenario === "unavailable";
  return React.createElement("section", {
    className: "settings-shell",
    "data-screen-label": "02 \u76AE\u80A4\u8BBE\u7F6E\u4E0E\u72B6\u6001"
  }, React.createElement("nav", {
    className: "settings-nav",
    "aria-label": "\u8BBE\u7F6E\u5BFC\u822A"
  }, React.createElement("h2", null, "\u76AE\u80A4\u4E0E\u966A\u4F34"), React.createElement("button", {
    className: "sideitem selected"
  }, React.createElement(Icon, {
    name: "settings"
  }), "\u5F53\u524D\u76AE\u80A4"), scenario !== "unsupported" && React.createElement("button", {
    className: "sideitem",
    onClick: () => document.getElementById("feedback-section")?.scrollIntoView({
      behavior: "smooth"
    })
  }, React.createElement(Icon, {
    name: "heart"
  }), "\u8F7B\u91CF\u53CD\u9988"), React.createElement("button", {
    className: "sideitem",
    onClick: onStop
  }, React.createElement(Icon, {
    name: stopped ? "play" : "pause"
  }), stopped ? "恢复效果" : "停止效果"), React.createElement("div", {
    className: "navfooter"
  }, "\u7BA1\u7406\u5165\u53E3\u59CB\u7EC8\u53EF\u7528", React.createElement("br", null), "\u8BBE\u7F6E\u53EA\u4FDD\u5B58\u5728\u6B64\u9884\u89C8\u4E2D")), React.createElement("div", {
    className: "settings-main"
  }, React.createElement("header", {
    className: "settings-head"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "APPEARANCE / 01"), React.createElement("h1", null, "\u8BA9\u966A\u4F34\u521A\u521A\u597D\u3002"), React.createElement("p", {
    className: "caption"
  }, "\u8C03\u6574\u672C\u5957\u76AE\u80A4\u3002\u6BCF\u4E00\u5904\u6539\u52A8\uFF0C\u90FD\u6709\u9ED8\u8BA4\u503C\u53EF\u56DE\u5230\u3002")), React.createElement(Pill, {
    tone: changed ? "orange" : ""
  }, changed ? "已自定义" : "使用本套默认")), React.createElement("div", {
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
    v: "unsupported",
    t: "未声明反馈"
  }].map(x => React.createElement("button", {
    key: x.v,
    className: scenario === x.v ? "active" : "",
    "aria-pressed": scenario === x.v,
    onClick: () => setScenario(x.v)
  }, x.t))), React.createElement("div", {
    className: "skin-banner"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "CURRENT SKIN / CHARACTER R2"), React.createElement("h2", null, "\u6863\u6848\u6696\u767D \xB7 \u9CB8\u9C7C\u5A18"), React.createElement("p", null, "\u4ECE\u626B\u63CF\u7741\u773C\uFF0C\u5230\u5B89\u9759\u966A\u4F34\uFF0C\u59CB\u7EC8\u662F\u719F\u6089\u7684\u5979\u3002\u6696\u767D\u627F\u63A5\u5DE5\u4F5C\uFF0C\u94F6\u84DD\u4FDD\u7559\u89D2\u8272\u8BC6\u522B\u3002"), React.createElement("div", {
    className: "row",
    style: {
      marginTop: 12,
      gap: 6
    }
  }, React.createElement(Pill, null, "\u4E3B\u5DE5\u4F5C\u533A"), React.createElement(Pill, null, "\u81EA\u5E26\u80CC\u666F"), React.createElement(Pill, {
    tone: "blue"
  }, "\u7EDF\u4E00\u89D2\u8272"))), React.createElement("div", {
    className: "banner-pet"
  }, React.createElement(PetMedia, {
    reduced: true
  }))), saveProblem && React.createElement("div", {
    className: "notice warning",
    role: "alert"
  }, "\u6B64\u6D4F\u89C8\u5668\u672A\u5141\u8BB8\u4FDD\u5B58\u3002\u5F53\u524D\u6539\u52A8\u4EC5\u5728\u672C\u6B21\u9884\u89C8\u6709\u6548\u3002"), stopped && React.createElement("div", {
    className: "notice warning"
  }, React.createElement(Icon, {
    name: "pause"
  }), React.createElement("span", null, "\u6548\u679C\u5DF2\u505C\u6B62\u3002\u53C2\u6570\u5DF2\u4FDD\u7559\uFF1B\u91CD\u7F6E\u672C\u5957\u4E5F\u4E0D\u4F1A\u81EA\u52A8\u6062\u590D\u3002"), React.createElement(Button, {
    small: true,
    onClick: onStop
  }, "\u6062\u590D\u6548\u679C")), unavailable && React.createElement("div", {
    className: "notice warning"
  }, React.createElement(Icon, {
    name: "warning"
  }), React.createElement("span", null, "\u6B64\u8BBE\u5907\u5C1A\u65E0\u53EF\u7528\u7684\u684C\u9762\u89D2\u8272\u80FD\u529B\u3002\u4E3B\u9898\u53EF\u7EE7\u7EED\u4F7F\u7528\uFF0C\u684C\u5BA0\u53C2\u6570\u5DF2\u4FDD\u7559\u3002")), scenario === "unsupported" && React.createElement("div", {
    className: "notice blue"
  }, "\u5BA1\u7A3F\u7528\u7CBE\u7B80\u58F0\u660E\uFF1A\u6B64\u7248\u672C\u53EA\u5305\u542B\u4E3B\u9898\u3001\u80CC\u666F\u3001\u5F00\u573A\u4E0E\u684C\u5BA0\uFF0C\u672A\u58F0\u660E\u5DE5\u4F5C\u53CD\u9988\u3002"), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u5916\u89C2"), React.createElement("span", {
    className: "caption"
  }, "\u4EC5\u5BF9\u672C\u5957\u751F\u6548")), React.createElement(SettingRow, {
    title: "\u9605\u8BFB\u914D\u8272",
    description: "\u6696\u767D\u4E3A\u9ED8\u8BA4\uFF1B\u591C\u95F4\u914D\u8272\u662F\u672C\u6B21\u8BBE\u8BA1\u5019\u9009\u3002"
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
    title: "\u81EA\u5E26\u6863\u6848\u80CC\u666F",
    description: "\u88C5\u9970\u7559\u5728\u9605\u8BFB\u533A\u5916\uFF0C\u5173\u95ED\u540E\u4F7F\u7528\u7EAF\u8272\u5E95\u3002"
  }, tag("background"), React.createElement(Toggle, {
    label: "\u81EA\u5E26\u6863\u6848\u80CC\u666F",
    value: config.background,
    onChange: v => setConfig("background", v)
  })), React.createElement(SettingRow, {
    title: "\u52A8\u6001\u6548\u679C",
    description: "\u51CF\u5C11\u52A8\u6001\u65F6\u4F7F\u7528\u9759\u6001\u89D2\u8272\uFF0C\u8DF3\u8FC7\u626B\u63CF\u548C\u81EA\u52A8\u8868\u6F14\u3002"
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
  })), React.createElement(SettingRow, {
    title: "\u542F\u52A8\u5F00\u573A",
    description: "\u968F DSH \u7A97\u53E3\u64AD\u653E\uFF0C\u53EF\u968F\u65F6\u8DF3\u8FC7\u3002\u5F53\u524D\u4E3A\u672C\u5730\u53C2\u8003\u6F14\u793A\u3002"
  }, tag("startup"), React.createElement(Toggle, {
    label: "\u542F\u52A8\u5F00\u573A",
    value: config.startup,
    onChange: v => setConfig("startup", v)
  }))), React.createElement("section", {
    className: "setting-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u684C\u9762\u966A\u4F34"), React.createElement(Pill, {
    tone: unavailable ? "orange" : config.pet ? "green" : ""
  }, unavailable ? "能力不可用" : config.pet ? "已启用" : "用户已关闭")), React.createElement(SettingRow, {
    title: "\u9CB8\u9C7C\u5A18\u684C\u5BA0",
    description: unavailable ? "需要底座提供可用的桌面角色模块；安装或更新后重试。" : config.pet ? "沿用扫描形象，默认安静待机。" : "已保留大小和回应设置，随时可以重新开启。"
  }, tag("pet"), React.createElement(Toggle, {
    label: "\u9CB8\u9C7C\u5A18\u684C\u5BA0",
    disabled: unavailable,
    value: config.pet,
    onChange: v => setConfig("pet", v)
  })), config.pet && !unavailable && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u89D2\u8272\u5927\u5C0F",
    description: "\u8C03\u6574\u89D2\u8272\u5728\u9884\u89C8\u4E2D\u7684\u663E\u793A\u5927\u5C0F\u3002"
  }, tag("size"), React.createElement("input", {
    type: "range",
    "aria-label": "\u89D2\u8272\u5927\u5C0F",
    min: "120",
    max: "220",
    step: "10",
    value: config.size,
    onChange: e => setConfig("size", Number(e.target.value))
  }), React.createElement("span", {
    className: "mono"
  }, config.size, "px")), React.createElement(SettingRow, {
    title: "\u70B9\u51FB\u56DE\u5E94",
    description: "\u70B9\u51FB\u540E\u56DE\u5E94\u4E00\u6B21\uFF1B\u8FDE\u7EED\u70B9\u51FB\u5408\u5E76\uFF0C\u4E0D\u53E0\u52A0\u8868\u6F14\u3002"
  }, tag("clickResponse"), React.createElement(Toggle, {
    label: "\u70B9\u51FB\u56DE\u5E94",
    value: config.clickResponse,
    onChange: v => setConfig("clickResponse", v)
  })))), scenario !== "unsupported" && React.createElement("section", {
    className: "setting-section",
    id: "feedback-section"
  }, React.createElement("header", null, React.createElement("h3", null, "\u5DE5\u4F5C\u53CD\u9988"), React.createElement(Pill, {
    tone: "blue"
  }, "\u8BBE\u8BA1\u63D0\u6848 \xB7 \u6A21\u62DF\u72B6\u6001")), React.createElement(SettingRow, {
    title: "\u4EFB\u52A1\u7ED3\u679C\u53CD\u9988",
    description: unavailable ? "桌面能力不可用，反馈不会运行。" : config.completion ? "只跟随当前会话，不在每次输出文字时播放。" : "已关闭；保留动作、气泡和冷却设置。"
  }, tag("completion"), React.createElement(Toggle, {
    label: "\u4EFB\u52A1\u7ED3\u679C\u53CD\u9988",
    value: config.completion,
    disabled: unavailable,
    onChange: v => setConfig("completion", v)
  })), config.completion && !unavailable && React.createElement(React.Fragment, null, React.createElement(SettingRow, {
    title: "\u663E\u793A\u77ED\u6C14\u6CE1",
    description: "\u5B8C\u6210\u65F6\u8F7B\u58F0\u63D0\u9192\uFF1B\u65E0\u58F0\u97F3\u4E5F\u80FD\u7406\u89E3\u53CD\u9988\u3002"
  }, tag("bubbles"), React.createElement(Toggle, {
    label: "\u663E\u793A\u77ED\u6C14\u6CE1",
    value: config.bubbles,
    onChange: v => setConfig("bubbles", v)
  })), React.createElement(SettingRow, {
    title: "\u6700\u77ED\u63D0\u9192\u95F4\u9694",
    description: "\u540C\u7C7B\u4E8B\u4EF6\u5728\u95F4\u9694\u5185\u5408\u5E76\uFF1B\u9700\u8981\u5904\u7406\u7684\u63D0\u793A\u4F18\u5148\u3002"
  }, tag("cooldown"), React.createElement(Segmented, {
    label: "\u6700\u77ED\u63D0\u9192\u95F4\u9694",
    value: config.cooldown,
    options: [{
      value: 15,
      label: "15 秒"
    }, {
      value: 30,
      label: "30 秒"
    }, {
      value: 60,
      label: "60 秒"
    }],
    onChange: v => setConfig("cooldown", v)
  })), React.createElement("div", {
    className: "mapping"
  }, React.createElement("label", null, "\u5B8C\u6210\u65F6\u7684\u52A8\u4F5C", React.createElement("select", {
    "aria-label": "\u5B8C\u6210\u65F6\u7684\u52A8\u4F5C",
    value: config.completionAction,
    onChange: e => setConfig("completionAction", e.target.value)
  }, React.createElement("option", {
    value: "greet"
  }, "\u8F7B\u8F7B\u81F4\u610F \xB7 greet"), React.createElement("option", {
    value: "stretch"
  }, "\u4F38\u4E2A\u61D2\u8170 \xB7 stretch"))), React.createElement("div", null, React.createElement("div", {
    className: "caption",
    style: {
      marginBottom: 8
    }
  }, "\u53CD\u9988\u9884\u89C8"), React.createElement(Button, {
    small: true,
    icon: "play",
    onClick: onPlay
  }, "\u770B\u770B\u6548\u679C")), React.createElement("p", {
    className: "mapping-caption"
  }, "\u672A\u5B8C\u6210\u6216\u5931\u8D25\u4E0D\u4F1A\u5E86\u795D\u3002\u9700\u8981\u4F60\u5904\u7406\u65F6\u4F7F\u7528\u9759\u6001\u63D0\u793A\uFF0C\u56DE\u5230\u4F1A\u8BDD\u67E5\u770B\u539F\u59CB\u4FE1\u606F\u3002", config.completionAction !== "greet" ? " 动作已自定义。" : "")))), React.createElement("div", {
    className: "notice"
  }, React.createElement(Icon, {
    name: "shield"
  }), React.createElement("span", null, "\u672C\u5957\u4E0D\u63D0\u4F9B\u58F0\u97F3\u6216\u6A21\u578B\u4E13\u5C5E\u5F62\u8C61\u3002\u5BF9\u5E94\u8BBE\u7F6E\u4E0D\u663E\u793A\uFF1B\u5168\u5C40\u9759\u97F3\u4E0E\u505C\u6B62\u504F\u597D\u7EE7\u7EED\u4FDD\u7559\u3002")))), React.createElement("footer", {
    className: "settings-foot"
  }, React.createElement("span", {
    className: "caption"
  }, saveProblem ? "本次预览有效" : "修改自动保存在本地预览", " \xB7 ", changed ? "已自定义" : "本套默认"), React.createElement("div", {
    className: "row",
    style: {
      gap: 8
    }
  }, React.createElement(Button, {
    small: true,
    onClick: onExport,
    icon: "download"
  }, "\u5BFC\u51FA\u8BBE\u8BA1\u503C"), React.createElement(Button, {
    small: true,
    onClick: onReset
  }, "\u91CD\u7F6E\u672C\u5957\u53C2\u6570")))));
}
function FlowScreen({
  config,
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
  const disabledPet = stopped || !config.pet;
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
      width: phase === "workspace" ? "100%" : Math.min(elapsed / 8.24 * 100, 100) + "%"
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
    onClick: () => onStep("scan")
  }, "\u626B\u63CF"), React.createElement(Button, {
    small: true,
    onClick: () => onStep("workspace")
  }, "\u5DE5\u4F5C\u533A"), React.createElement("span", {
    className: "caption"
  }, reduced ? "当前：减少动态" : stopped ? "当前：效果已停止" : "1.2 秒档案 → 7.04 秒原片 → 工作区")), React.createElement("div", {
    className: "desktop-preview"
  }, React.createElement("div", {
    className: "desktop-copy"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "DESKTOP COMPANION"), React.createElement("h3", null, stopped ? "暂停，也很自在。" : "我在这里。"), React.createElement("p", null, stopped ? "所有待播反馈已清理，恢复由你决定。" : "点击角色试试回应，或模拟一条任务结果。"), React.createElement("div", {
    className: "row",
    style: {
      gap: 7,
      marginTop: 16,
      flexWrap: "wrap"
    }
  }, React.createElement(Button, {
    small: true,
    onClick: onComplete
  }, "\u4EFB\u52A1\u5B8C\u6210"), React.createElement(Button, {
    small: true,
    onClick: onNeed
  }, "\u9700\u8981\u5904\u7406"), React.createElement(Button, {
    small: true,
    onClick: onIdle
  }, "\u56DE\u5F85\u673A"))), disabledPet ? React.createElement("div", {
    className: "empty-pet"
  }, stopped ? "效果已停止" : "桌宠已关闭", React.createElement("br", null), React.createElement("span", {
    className: "caption"
  }, "\u7BA1\u7406\u5165\u53E3\u4ECD\u7136\u53EF\u7528")) : React.createElement("div", {
    className: "pet-area",
    style: {
      width: config.size + 40,
      height: config.size + 40
    }
  }, React.createElement("button", {
    className: "pet-click",
    "aria-label": "\u70B9\u51FB\u9CB8\u9C7C\u5A18",
    onClick: onReact
  }, React.createElement(PetMedia, {
    action: action,
    reduced: reduced,
    staticPose: action === "idle" && !!bubble,
    onEnd: onIdle,
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
  onTheme
}) {
  const colors = [["阅读底板", "--paper", theme === "dark" ? "#202423" : "#F4F1E9"], ["稳定表面", "--surface", theme === "dark" ? "#292E2C" : "#FFFDF8"], ["正文墨色", "--ink", theme === "dark" ? "#F1EFE6" : "#2B302C"], ["操作强调", "--accent", theme === "dark" ? "#F2AB71" : "#A54C19"], ["角色信号", "--signal", theme === "dark" ? "#91C3D7" : "#35677E"], ["分隔边界", "--line", theme === "dark" ? "#494F46" : "#D9D4C7"]];
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
  }, "R2 \xB7 \u7EDF\u4E00\u89D2\u8272\u7A3F")), React.createElement("div", {
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
