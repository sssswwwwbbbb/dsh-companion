function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Icon({
  name = "plus"
}) {
  const paths = {
    plus: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M12 5v14M5 12h14"
    })),
    search: React.createElement(React.Fragment, null, React.createElement("circle", {
      cx: "10.5",
      cy: "10.5",
      r: "6.5"
    }), React.createElement("path", {
      d: "m16 16 4.5 4.5"
    })),
    panel: React.createElement(React.Fragment, null, React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "16",
      rx: "2"
    }), React.createElement("path", {
      d: "M9 4v16"
    })),
    folder: React.createElement("path", {
      d: "M3 7V5h6l2 2h10v12H3Z"
    }),
    chat: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M4 4h16v13H9l-5 4Z"
    }), React.createElement("path", {
      d: "M8 8h8M8 12h5"
    })),
    chevron: React.createElement("path", {
      d: "m9 5 7 7-7 7"
    }),
    down: React.createElement("path", {
      d: "m5 9 7 7 7-7"
    }),
    check: React.createElement("path", {
      d: "m5 12 4 4 10-10"
    }),
    close: React.createElement("path", {
      d: "m6 6 12 12M6 18 18 6"
    }),
    copy: React.createElement(React.Fragment, null, React.createElement("rect", {
      x: "8",
      y: "8",
      width: "12",
      height: "13",
      rx: "2"
    }), React.createElement("path", {
      d: "M15 8V3H3v13h5"
    })),
    file: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h6"
    })),
    arrow: React.createElement("path", {
      d: "M12 20V4m-6 6 6-6 6 6"
    }),
    bolt: React.createElement("path", {
      d: "m13 2-9 12h7l-1 8 10-13h-7Z"
    }),
    sun: React.createElement(React.Fragment, null, React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "4"
    }), React.createElement("path", {
      d: "M12 1v2M12 21v2M1 12h2M21 12h2M4 4l1 1M19 19l1 1M4 20l1-1M19 5l1-1"
    })),
    moon: React.createElement("path", {
      d: "M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"
    }),
    settings: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M4 6h16M4 12h16M4 18h16"
    }), React.createElement("circle", {
      cx: "9",
      cy: "6",
      r: "2"
    }), React.createElement("circle", {
      cx: "16",
      cy: "12",
      r: "2"
    }), React.createElement("circle", {
      cx: "8",
      cy: "18",
      r: "2"
    })),
    play: React.createElement("path", {
      d: "m8 4 12 8-12 8Z"
    }),
    pause: React.createElement("path", {
      d: "M8 5v14M16 5v14"
    }),
    reset: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M4 9a8 8 0 1 1 0 7M4 3v6h6"
    })),
    dots: React.createElement(React.Fragment, null, React.createElement("circle", {
      cx: "5",
      cy: "12",
      r: "1"
    }), React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "1"
    }), React.createElement("circle", {
      cx: "19",
      cy: "12",
      r: "1"
    })),
    shield: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6Z"
    }), React.createElement("path", {
      d: "m8 12 3 3 5-6"
    })),
    warning: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "m12 3 10 18H2Z"
    }), React.createElement("path", {
      d: "M12 9v5M12 17v1"
    })),
    link: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "m9 15 6-6M9 6l2-2a5 5 0 0 1 7 7l-2 2M8 11l-2 2a5 5 0 0 0 7 7l2-2"
    })),
    stop: React.createElement("rect", {
      x: "5",
      y: "5",
      width: "14",
      height: "14",
      rx: "2"
    }),
    download: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"
    })),
    heart: React.createElement("path", {
      d: "M12 21 3 12A6 6 0 0 1 12 4a6 6 0 0 1 9 8Z"
    }),
    flag: React.createElement(React.Fragment, null, React.createElement("path", {
      d: "M5 22V3h13l-2 5 2 5H5"
    }))
  };
  return React.createElement("span", {
    className: "icon",
    "aria-hidden": "true"
  }, React.createElement("svg", {
    viewBox: "0 0 24 24"
  }, paths[name] || paths.plus));
}
function Button({
  children,
  icon,
  kind = "",
  small = false,
  ...props
}) {
  return React.createElement("button", _extends({
    className: "button " + kind + (small ? " small" : "")
  }, props), icon && React.createElement(Icon, {
    name: icon
  }), children);
}
function Toggle({
  label,
  value,
  onChange,
  disabled = false
}) {
  return React.createElement("button", {
    type: "button",
    className: "toggle" + (value ? " on" : ""),
    role: "switch",
    "aria-label": label,
    "aria-checked": value,
    disabled: disabled,
    onClick: () => onChange(!value)
  }, React.createElement("span", null));
}
function Pill({
  children,
  tone = ""
}) {
  return React.createElement("span", {
    className: "pill " + tone
  }, children);
}
function SettingRow({
  title,
  description,
  children
}) {
  return React.createElement("div", {
    className: "setting-row"
  }, React.createElement("div", null, React.createElement("strong", null, title), description && React.createElement("p", null, description)), React.createElement("div", {
    className: "setting-control"
  }, children));
}
function Segmented({
  label,
  value,
  options,
  onChange,
  disabled = false
}) {
  return React.createElement("div", {
    className: "segmented",
    role: "group",
    "aria-label": label
  }, options.map(o => React.createElement("button", {
    key: o.value,
    disabled: disabled,
    type: "button",
    className: value === o.value ? "active" : "",
    "aria-pressed": value === o.value,
    onClick: () => onChange(o.value)
  }, o.label)));
}
function PetMedia({
  action = "idle",
  reduced = false,
  staticPose = false,
  className = "",
  onEnd,
  onError
}) {
  const pose = reduced ? "idle" : ["idle", "react", "greet", "stretch"].includes(action) ? action : "idle";
  const frames = {
    idle: [0, 0],
    react: [1, 0],
    greet: [0, 1],
    stretch: [1, 1]
  };
  const labels = {
    idle: "安静待机",
    react: "侧头回应",
    greet: "轻轻挥手",
    stretch: "伸个懒腰"
  };
  const [column, row] = frames[pose];
  return React.createElement("span", {
    className: "unified-pet " + (reduced || staticPose ? "is-still" : "has-motion") + " " + className,
    "data-character": "scan-whale-r2",
    "data-pose": pose,
    role: "img",
    "aria-label": "统一鲸鱼娘 · " + labels[pose]
  }, React.createElement("span", {
    key: pose,
    className: "unified-pet-frame pose-" + pose
  }, React.createElement("img", {
    className: "unified-pet-atlas",
    src: "assets/whale-unified-r2/character-atlas-r2.png",
    style: {
      left: column * -100 + "%",
      top: row * -100 + "%"
    },
    alt: "",
    "aria-hidden": "true",
    draggable: "false",
    onError: onError
  })));
}
function ChatBody({
  onFile,
  onCopy,
  state = "complete",
  onRetry
}) {
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "chat-date"
  }, "\u672C\u5730\u793A\u4F8B\u4F1A\u8BDD \xB7 11 \u6708 3 \u65E5"), React.createElement("div", {
    className: "user-row"
  }, React.createElement("div", {
    className: "user-message"
  }, "\u5E2E\u6211\u628A\u8FD9\u4EFD\u89C2\u5BDF\u6574\u7406\u6210\u4E00\u4EFD\u6E05\u6670\u7684\u5B9E\u65BD\u8BB0\u5F55\u3002\u4FDD\u7559\u72B6\u6001\u3001\u9ED8\u8BA4\u914D\u7F6E\u548C\u9700\u8981\u7EE7\u7EED\u9A8C\u8BC1\u7684\u90E8\u5206\u3002"), React.createElement("button", {
    className: "attachment",
    onClick: onFile
  }, React.createElement(Icon, {
    name: "file"
  }), "\u89C2\u5BDF\u8BB0\u5F55.md ", React.createElement("small", null, "2.4 KB"))), React.createElement("div", {
    className: "assistant-label"
  }, React.createElement("span", {
    className: "assistant-mark"
  }, "d"), React.createElement("span", null, "DSH")), React.createElement("details", {
    className: "process"
  }, React.createElement("summary", null, React.createElement("span", {
    className: "chevron"
  }, React.createElement(Icon, {
    name: "chevron"
  })), "\u67E5\u770B\u5DE5\u4F5C\u8FC7\u7A0B", React.createElement("span", {
    className: "summary-end"
  }, "2 \u4E2A\u6B65\u9AA4 \xB7 \u5DF2\u5B8C\u6210")), React.createElement("div", {
    className: "process-steps"
  }, React.createElement("div", null, React.createElement(Icon, {
    name: "check"
  }), React.createElement("span", null, "\u8BFB\u53D6\u6587\u4EF6"), React.createElement("button", {
    className: "file-inline",
    onClick: onFile
  }, "\u89C2\u5BDF\u8BB0\u5F55.md")), React.createElement("div", null, React.createElement(Icon, {
    name: "check"
  }), React.createElement("span", null, "\u6574\u7406\u72B6\u6001\u4E0E\u914D\u7F6E\u793A\u4F8B")))), React.createElement("article", {
    className: "message-body"
  }, React.createElement("h2", null, "\u8BA9\u5DE5\u4F5C\u5B89\u9759\u5730\u5411\u524D\u3002"), React.createElement("p", null, "\u5DF2\u628A\u89C2\u5BDF\u6574\u7406\u4E3A\u4E09\u90E8\u5206\uFF1A\u65E5\u5E38\u9605\u8BFB\u3001\u8F7B\u91CF\u53CD\u9988\u548C\u53EF\u6062\u590D\u7684\u8BBE\u7F6E\u3002\u4E0B\u9762\u662F\u4E00\u4EFD\u7528\u4E8E\u68C0\u67E5", React.createElement("strong", null, "\u957F\u56DE\u590D\u3001\u8868\u683C\u548C\u4EE3\u7801\u6392\u7248"), "\u7684\u793A\u4F8B\u8BB0\u5F55\u3002"), React.createElement("h3", null, "01 / \u5148\u4FDD\u62A4\u9605\u8BFB"), React.createElement("p", null, "\u6696\u767D\u80CC\u666F\u4FDD\u7559\u6863\u6848\u611F\u3002\u6B63\u6587\u3001\u5DE5\u5177\u7ED3\u679C\u4E0E\u8F93\u5165\u533A\u4F7F\u7528\u7A33\u5B9A\u8868\u9762\uFF1B\u88C5\u9970\u7559\u5728\u4E24\u4FA7\u7A7A\u767D\u3002\u5373\u4F7F\u5207\u6362\u5230\u590D\u6742\u80CC\u666F\uFF0C\u4FE1\u606F\u4ECD\u7136\u6709\u660E\u786E\u7684\u5C42\u6B21\u3002"), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u533A\u57DF"), React.createElement("th", null, "\u5904\u7406\u65B9\u5F0F"), React.createElement("th", null, "\u72B6\u6001"))), React.createElement("tbody", null, React.createElement("tr", null, React.createElement("td", null, "\u6B63\u6587\u4E0E\u6587\u4EF6\u5F15\u7528"), React.createElement("td", null, "\u7A33\u5B9A\u5E95\u8272\uFF0C\u6E05\u6670\u7684\u94FE\u63A5\u4E0E\u7126\u70B9"), React.createElement("td", null, React.createElement(Pill, {
    tone: "green"
  }, "\u5DF2\u8BBE\u8BA1"))), React.createElement("tr", null, React.createElement("td", null, "\u4EE3\u7801\u4E0E\u8868\u683C"), React.createElement("td", null, "\u72EC\u7ACB\u6EDA\u52A8\uFF0C\u4FDD\u7559\u5B8C\u6574\u5185\u5BB9"), React.createElement("td", null, React.createElement(Pill, {
    tone: "green"
  }, "\u5DF2\u8BBE\u8BA1"))), React.createElement("tr", null, React.createElement("td", null, "\u4EFB\u52A1\u5B8C\u6210\u53CD\u9988"), React.createElement("td", null, "\u77ED\u6C14\u6CE1\uFF0C\u56DE\u5230\u5B89\u9759\u5F85\u673A"), React.createElement("td", null, React.createElement(Pill, {
    tone: "blue"
  }, "\u6A21\u62DF\u5C55\u793A")))))), React.createElement("h3", null, "02 / \u8BA9\u9ED8\u8BA4\u503C\u53EF\u4EE5\u88AB\u7406\u89E3"), React.createElement("p", null, "\u9996\u6B21\u4F7F\u7528\u91C7\u7528\u672C\u5957\u9ED8\u8BA4\u503C\u3002\u7528\u6237\u8C03\u6574\u540E\u663E\u793A\u201C\u5DF2\u81EA\u5B9A\u4E49\u201D\uFF1B\u5173\u95ED\u6548\u679C\u4FDD\u7559\u5F00\u542F\u5165\u53E3\uFF1B\u8BBE\u5907\u4E0D\u53EF\u7528\u65F6\u8BF4\u660E\u539F\u56E0\u3002"), React.createElement("div", {
    className: "codeblock"
  }, React.createElement("div", {
    className: "codebar"
  }, React.createElement("span", null, "JSON \xB7 \u8BBE\u8BA1\u503C\u793A\u610F"), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u590D\u5236\u914D\u7F6E\u793A\u4F8B",
    onClick: e => onCopy(e.currentTarget.closest(".codeblock").querySelector("code").textContent)
  }, React.createElement(Icon, {
    name: "copy"
  }))), React.createElement("pre", null, React.createElement("code", null, '{\n  "appearance": "archive-warm",\n  "background": true,\n  "companion": { "enabled": true, "size": 160 },\n  "feedback": { "sound": false, "cooldownSeconds": 30 }\n}'))), React.createElement("h3", null, "03 / \u4FDD\u7559\u4E0B\u4E00\u6B65\u7684\u4F9D\u636E"), React.createElement("p", null, "\u89C6\u89C9\u7A3F\u9A8C\u8BC1\u7684\u662F\u9605\u8BFB\u4E0E\u64CD\u4F5C\u4F53\u9A8C\u3002\u771F\u5B9E\u4E3B\u9898\u63A5\u5165\u3001\u7CFB\u7EDF\u684C\u9762\u89D2\u8272\u548C\u4EFB\u52A1\u72B6\u6001\u8BA2\u9605\uFF0C\u9700\u8981\u5728\u5BF9\u5E94\u8FD0\u884C\u80FD\u529B\u5C31\u7EEA\u540E\u5355\u72EC\u68C0\u67E5\u3002"), React.createElement("p", null, "\u5B8C\u6574\u5185\u5BB9\u89C1 ", React.createElement("button", {
    className: "file-inline",
    onClick: onFile
  }, "\u89C2\u5BDF\u8BB0\u5F55.md"), "\u3002\u70B9\u51FB\u6587\u4EF6\u53EF\u6253\u5F00\u53F3\u4FA7\u9884\u89C8\uFF0C\u5173\u95ED\u540E\u56DE\u5230\u5F53\u524D\u9605\u8BFB\u4F4D\u7F6E\u3002")), state === "loading" && React.createElement("div", {
    className: "run-status",
    role: "status"
  }, React.createElement("span", {
    className: "loading-dot"
  }), "\u6B63\u5728\u6574\u7406\u4E0B\u4E00\u6BB5\u5185\u5BB9\u2026", React.createElement("span", {
    className: "caption"
  }, "\u672C\u5730\u6A21\u62DF")), state === "error" && React.createElement("div", {
    className: "error-banner",
    role: "alert"
  }, React.createElement(Icon, {
    name: "warning"
  }), React.createElement("div", null, React.createElement("strong", null, "\u672C\u6B21\u56DE\u590D\u672A\u5B8C\u6210"), React.createElement("p", null, "\u793A\u4F8B\u8FDE\u63A5\u4E2D\u65AD\uFF0C\u5DF2\u4FDD\u7559\u8F93\u5165\u5185\u5BB9\u3002")), React.createElement(Button, {
    small: true,
    onClick: onRetry
  }, "\u91CD\u8BD5")), state === "needs-user" && React.createElement("div", {
    className: "notice blue"
  }, React.createElement(Icon, {
    name: "flag"
  }), React.createElement("span", null, "\u6709\u4E00\u9879\u64CD\u4F5C\u9700\u8981\u4F60\u5904\u7406\u3002\u8BF7\u67E5\u770B\u4F1A\u8BDD\u4E2D\u7684\u539F\u59CB\u8BF7\u6C42\u3002")), React.createElement("div", {
    className: "message-actions"
  }, React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u590D\u5236\u56DE\u590D",
    onClick: e => onCopy(e.currentTarget.closest(".reading").querySelector(".message-body").innerText)
  }, React.createElement(Icon, {
    name: "copy"
  })), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u91CD\u65B0\u751F\u6210\u793A\u4F8B",
    onClick: onRetry
  }, React.createElement(Icon, {
    name: "reset"
  })), React.createElement("span", {
    className: "end"
  }, "\u793A\u4F8B\u5185\u5BB9 \xB7 \u672A\u8C03\u7528\u6A21\u578B")));
}
function FilePanel({
  onClose
}) {
  return React.createElement("aside", {
    className: "filepanel",
    "aria-label": "\u6587\u4EF6\u9884\u89C8"
  }, React.createElement("header", {
    className: "filepanel-header"
  }, React.createElement("span", {
    className: "row"
  }, React.createElement(Icon, {
    name: "file"
  }), "\u89C2\u5BDF\u8BB0\u5F55.md"), React.createElement("button", {
    className: "iconbutton",
    "aria-label": "\u5173\u95ED\u6587\u4EF6\u9884\u89C8",
    onClick: onClose
  }, React.createElement(Icon, {
    name: "close"
  }))), React.createElement("div", {
    className: "filepanel-content"
  }, React.createElement("div", {
    className: "eyebrow"
  }, "PREVIEW / LOCAL SAMPLE"), React.createElement("h2", null, "\u5DE5\u4F5C\u533A\u89C2\u5BDF\u8BB0\u5F55"), React.createElement(Pill, null, "\u53EA\u8BFB\u793A\u4F8B"), React.createElement("h3", null, "\u9605\u8BFB"), React.createElement("p", null, "\u4FDD\u6301\u6B63\u6587\u5E95\u8272\u3002\u5BC6\u96C6\u8868\u683C\u4E0D\u7F29\u5C0F\u6587\u5B57\uFF0C\u5141\u8BB8\u6A2A\u5411\u6EDA\u52A8\u3002"), React.createElement("h3", null, "\u8BBE\u7F6E"), React.createElement("p", null, "\u6BCF\u4E2A\u663E\u793A\u7684\u76AE\u80A4\u9009\u9879\u90FD\u6709\u9ED8\u8BA4\u503C\u3002\u8C03\u6574\u540E\u663E\u793A\u6765\u6E90\uFF1B\u505C\u6B62\u6548\u679C\u540E\u4ECD\u53EF\u8FDB\u5165\u7BA1\u7406\u9875\u6062\u590D\u3002"), React.createElement("h3", null, "\u53CD\u9988"), React.createElement("p", null, "\u5B8C\u6210\u53CD\u9988\u53EA\u63D0\u793A\u7ED3\u679C\uFF0C\u4E0D\u4EE3\u66FF\u539F\u59CB\u4F1A\u8BDD\u8BB0\u5F55\u3002\u9700\u8981\u7528\u6237\u5904\u7406\u65F6\uFF0C\u4FDD\u7559\u660E\u786E\u5165\u53E3\u3002"), React.createElement("h3", null, "\u63A5\u5165\u68C0\u67E5"), React.createElement("p", null, "\u4E3B\u9898 token\u3001\u8D44\u6E90\u8DEF\u5F84\u3001\u751F\u547D\u5468\u671F\u4E0E\u684C\u5BA0\u6865\u63A5\u6309\u5171\u4EAB\u5408\u540C\u6D88\u8D39\u3002\u8FD9\u4EFD\u793A\u4F8B\u4E0D\u5305\u542B\u771F\u5B9E\u4E1A\u52A1\u6587\u4EF6\u3002")));
}
Object.assign(window, {
  Icon,
  Button,
  Toggle,
  Pill,
  SettingRow,
  Segmented,
  PetMedia,
  ChatBody,
  FilePanel
});
