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
  }, "CURRENT SKIN"), React.createElement("h2", null, "\u6863\u6848\u6696\u767D \xB7 \u9CB8\u9C7C\u5A18"), React.createElement("p", null, "\u7EB8\u611F\u5E95\u8272\u3001\u6E05\u6670\u7684\u9605\u8BFB\u5C42\u6B21\u3002\u5DE5\u4F5C\u65F6\u5B89\u9759\u5F85\u673A\uFF0C\u5728\u6070\u5F53\u7684\u65F6\u523B\u56DE\u5E94\u3002"), React.createElement("div", {
    className: "row",
    style: {
      marginTop: 12,
      gap: 6
    }
  }, React.createElement(Pill, null, "\u4E3B\u5DE5\u4F5C\u533A"), React.createElement(Pill, null, "\u81EA\u5E26\u80CC\u666F"), React.createElement(Pill, null, "\u73B0\u6709\u684C\u5BA0"))), React.createElement("img", {
    src: "assets/whale-maid/idle-poster.png",
    alt: "\u9CB8\u9C7C\u5A18\u89D2\u8272\u9884\u89C8"
  })), saveProblem && React.createElement("div", {
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
    description: unavailable ? "需要底座提供可用的桌面角色模块；安装或更新后重试。" : config.pet ? "复用现有角色动作，默认安静待机。" : "已保留大小和回应设置，随时可以重新开启。"
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
  }, "\u539F\u7247\u4E0E\u684C\u5BA0\u753B\u98CE\u4E0D\u540C\uFF1B\u5168\u8EAB\u670D\u9970\u4E0E\u9CB8\u5C3E\u5C1A\u7F3A\u540C\u89C6\u89D2\u5BF9\u7167\u3002\u6B64\u5904\u9A8C\u8BC1\u8854\u63A5\u3002"), React.createElement("div", {
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
  return React.createElement("section", {
    className: "asset-page",
    "data-screen-label": "05 \u89D2\u8272\u4E0E\u8D44\u6E90\u5BF9\u7167"
  }, React.createElement("header", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "CHARACTER / RESOURCE REVIEW"), React.createElement("h1", null, "\u540C\u4E00\u89D2\u8272\u611F\uFF0C\u9700\u8981\u8BC1\u636E\u3002")), React.createElement(Pill, {
    tone: "orange"
  }, "\u672C\u5730\u53C2\u8003 \xB7 \u5206\u53D1\u6761\u4EF6\u672A\u9F50")), React.createElement("div", {
    className: "character-board"
  }, React.createElement("div", {
    className: "character-sample"
  }, React.createElement("div", {
    className: "character-image"
  }, React.createElement("img", {
    src: "assets/reference/scan-poster.png",
    alt: "\u626B\u63CF\u7741\u773C\u53C2\u8003\u7247\u5173\u952E\u5E27"
  })), React.createElement("h3", null, "\u626B\u63CF\u7247 / \u5173\u952E\u5E27"), React.createElement("p", null, "LeeRolling \u2192 NativeDog1\u3002\u4E0A\u6E38\u6807\u6CE8 BSD-3-Clause\uFF0C\u539F\u59CB\u52A8\u753B\u4F5C\u8005\u5F85\u786E\u8BA4\u3002\u56FA\u5B9A\u63D0\u4EA4\u4E0E\u6458\u8981\u89C1\u7D20\u6750\u8868\u3002"), React.createElement("div", {
    className: "asset-controls"
  }, React.createElement(Button, {
    small: true,
    onClick: () => onAction("scan")
  }, "\u64AD\u653E\u539F\u7247"))), React.createElement("div", {
    className: "character-sample"
  }, React.createElement("div", {
    className: "character-image checker"
  }, action === "scan" && reduced ? React.createElement("img", {
    src: "assets/reference/scan-poster.png",
    alt: "\u51CF\u5C11\u52A8\u6001\uFF1A\u626B\u63CF\u7247\u9759\u6001\u5173\u952E\u5E27"
  }) : action === "scan" ? React.createElement("video", {
    src: "assets/reference/whale-girl-scan.mp4",
    controls: true,
    autoPlay: true,
    muted: true,
    playsInline: true,
    onError: onMediaError
  }) : React.createElement(PetMedia, {
    action: action,
    reduced: reduced,
    onEnd: () => onAction("idle"),
    onError: onMediaError
  })), React.createElement("h3", null, "\u73B0\u6709 Q \u7248\u684C\u5BA0 / ", action), React.createElement("p", null, "PC2005-cloud / dsh-pet\u3002\u975E\u5546\u4E1A\u672C\u5730\u9A8C\u8BC1\uFF1B\u516C\u5F00\u5206\u53D1\u987B\u53E6\u6838\u5BF9\u4F7F\u7528\u8303\u56F4\u3002"), React.createElement("div", {
    className: "asset-controls"
  }, React.createElement(Button, {
    small: true,
    onClick: () => onAction("idle")
  }, "\u5F85\u673A"), React.createElement(Button, {
    small: true,
    onClick: () => onAction("react")
  }, "\u56DE\u5E94"), React.createElement(Button, {
    small: true,
    onClick: () => onAction("greet")
  }, "\u81F4\u610F"))), React.createElement("div", {
    className: "character-sample"
  }, React.createElement("div", {
    className: "character-image",
    style: {
      position: "relative",
      isolation: "isolate"
    }
  }, React.createElement("div", {
    className: "archive-grid"
  }), React.createElement("span", {
    className: "archive-stamp"
  }, "ARCHIVE / ORIGINAL")), React.createElement("h3", null, "\u81EA\u5E26\u80CC\u666F / \u539F\u521B\u7F51\u683C"), React.createElement("p", null, "\u4E0D\u5F15\u5165\u7B2C\u4E09\u5F20\u89D2\u8272\u58C1\u7EB8\uFF0C\u51CF\u5C11\u89D2\u8272\u5DEE\u5F02\u3002\u539F\u578B\u4FDD\u7559\u80CC\u666F\u5F00\u5173\u548C\u7EAF\u8272\u56DE\u9000\u3002"), React.createElement("div", {
    className: "asset-controls"
  }, React.createElement(Pill, null, "\u65E0\u9700\u5916\u90E8\u58C1\u7EB8")))), React.createElement("div", {
    className: "notice warning"
  }, React.createElement(Icon, {
    name: "warning"
  }), React.createElement("span", null, "\u84DD\u53D1\u3001\u767D\u8272\u5934\u9970\u4E0E\u84DD\u773C\u63D0\u4F9B\u5171\u540C\u7EBF\u7D22\uFF1B\u626B\u63CF\u7247\u4E3B\u8981\u662F\u9762\u90E8\u7279\u5199\uFF0C\u65E0\u6CD5\u786E\u8BA4\u5168\u8EAB\u670D\u9970\u4E0E\u9CB8\u5C3E\u3002\u5199\u5B9E\u6750\u8D28\u4E0E Q \u7248\u6BD4\u4F8B\u660E\u663E\u4E0D\u540C\uFF0C\u5F53\u524D\u662F\u201C\u53C2\u8003\u7EC4\u5408\u201D\uFF0C\u5C1A\u975E\u7EDF\u4E00\u89D2\u8272\u5B9A\u7A3F\u3002")), React.createElement("div", {
    className: "table-wrap",
    style: {
      marginTop: 24
    }
  }, React.createElement("table", {
    className: "asset-table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u8D44\u6E90 / \u52A8\u4F5C"), React.createElement("th", null, "\u539F\u59CB\u65F6\u957F"), React.createElement("th", null, "\u9996\u8F6E\u7528\u9014"), React.createElement("th", null, "\u56DE\u9000\u4E0E\u9650\u5236"))), React.createElement("tbody", null, React.createElement("tr", null, React.createElement("td", null, "idle \xB7 \u5F85\u673A"), React.createElement("td", null, "10.042s"), React.createElement("td", null, "\u9ED8\u8BA4\u5FAA\u73AF\uFF0C\u9759\u6001\u9996\u5E27\u56DE\u9000"), React.createElement("td", null, "\u900F\u660E\u8FB9\u7F18\u3001\u811A\u5E95\u951A\u70B9\u89C1\u5B9E\u6D4B\u8868")), React.createElement("tr", null, React.createElement("td", null, "react \xB7 \u70B9\u51FB\u56DE\u5E94"), React.createElement("td", null, "10.042s"), React.createElement("td", null, "\u76F4\u63A5\u4E92\u52A8\uFF0C\u5141\u8BB8\u4E2D\u65AD"), React.createElement("td", null, "\u6CA1\u6709\u72EC\u7ACB\u77ED\u52A8\u4F5C\uFF0C\u4E0D\u786C\u5207\u4F5C 1 \u79D2\u52A8\u4F5C")), React.createElement("tr", null, React.createElement("td", null, "greet / stretch"), React.createElement("td", null, "\u5404 10.042s"), React.createElement("td", null, "\u5B8C\u6210\u53CD\u9988\u53EF\u9009\u52A8\u4F5C"), React.createElement("td", null, "\u9700\u7528\u6237\u5904\u7406\u6216\u505C\u6B62\u53EF\u62A2\u5360")), React.createElement("tr", null, React.createElement("td", null, "look / sleep / wake"), React.createElement("td", null, "\u5404 10.042s"), React.createElement("td", null, "\u8D44\u6E90\u5BF9\u7167\u5907\u7528"), React.createElement("td", null, "\u4E0D\u589E\u52A0\u9ED8\u8BA4\u81EA\u4E3B\u884C\u4E3A")), React.createElement("tr", null, React.createElement("td", null, "\u63D0\u8D77 / \u843D\u5730 / \u4E13\u6CE8"), React.createElement("td", null, "\u7F3A\u5931"), React.createElement("td", null, "\u4E0D\u5BA3\u79F0\u5DF2\u6709\u4E13\u5C5E\u52A8\u753B"), React.createElement("td", null, "\u4EA4\u4E92\u4E2D\u51BB\u7ED3\u5F85\u673A\uFF1B\u4E0D\u65B0\u589E\u7D20\u6750\u5408\u540C"))))), React.createElement("p", {
    className: "caption"
  }, "\u7F72\u540D\uFF1A\u4E0A\u5584\u65E0\u5F62\uFF08\u6E9F\u6708\u539F\u578B\uFF09\u3001ZipZipPipe\uFF08\u9CB8\u9C7C\u5A18\u793E\u533A\u5F62\u8C61\uFF09\u3001PC2005-cloud\uFF08\u52A8\u4F5C\u7D20\u6750\uFF09\u3002\u89D2\u8272\u4E3A\u793E\u533A\u4E8C\u521B\uFF0C\u975E DeepSeek \u5B98\u65B9\u5F62\u8C61\u3002\u539F\u7247\u4EC5\u4F5C\u672C\u5730\u8BBE\u8BA1\u53C2\u8003\uFF0C\u4E0D\u968F\u53EF\u8FD0\u884C\u9ED8\u8BA4\u5185\u5BB9\u5206\u53D1\u3002"));
}
Object.assign(window, {
  SettingsScreen,
  FlowScreen,
  SpecScreen,
  AssetsScreen
});
