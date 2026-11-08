# -*- coding: utf-8 -*-
"""从素材包组装「黑焰」无桌宠皮肤：重上色图标 + 复制资源 + 生成 skin.json。

只依赖标准库（PNG 自行解码/编码，避免 PIL 依赖）。
运行：python3 scripts/build-skin.py
"""
import hashlib
import io
import json
import os
import shutil
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # designs/dsh-black-flame-v1
REPO = ROOT.parent.parent                              # 仓库根
PACK = REPO / "素材" / "DSH-烬角黑焰-皮肤素材包-v3.6.zip"
INNER = "烬角-黑焰"
# 本地改动（素材包里没有）：裁掉 9.5 s 起的落版主题字，静帧改用片内干净帧
LOCAL = {
    "exports/opening/opening-film.mp4": ROOT / "assets-src" / "opening-film-notitle.mp4",
    "exports/opening/opening-still.png": ROOT / "assets-src" / "opening-still-clean.png",
}
OUT = ROOT / "skin"          # 主产物（dev.44 基线）
ASSETS = OUT / "assets"

# ------------------------------------------------------------------ 图标
# 宿主把图标当作 CSS background-image 贴到目标元素上（子元素 opacity:0），
# 图标颜色由 PNG 自身决定，token 改不动。所以取素材包 v3.6 新增的中性色成套：
#   · 48 枚中性文字色（浅 #5C423C / 深 #D6BAAD）；
#   · send / stop 近白 #FFF8F2，落在强调色填充按钮上才看得见。
ICON_SET = "neutral"           # neutral（中性色，本套默认）| accent（强调色，仅留档）

ICON_KEYS = """workspace compose conversation search panel-left folder folder-open pin archive more
attachment link copy retry edit branch send stop chevron-down chevron-right plus terminal external
file-code file-table file-image file-text check clock alert info play pause close settings sliders
sun moon palette download shield expand plugin skill model agent question plan inbox git-diff""".split()

# 素材包内 55 枚，其中 5 枚没有替换位
NO_SLOT_KEYS = ["history", "bookmark", "quote", "volume", "mute"]

# ------------------------------------------------------------------ 令牌
# 71 个允许键，取色自素材包 review/色板与排版.md，中间层为派生值。
TOKENS = [
    ("--dsw-alias-bg-base", "#F4EDE6", "#0F0A12"),
    ("--dsw-alias-bg-layer-1", "#FFF8F2", "#1B1118"),
    ("--dsw-alias-bg-layer-2", "#F7EFE9", "#24151C"),
    ("--dsw-alias-bg-layer-3", "#FFFCF8", "#2C1A22"),
    ("--dsw-alias-bg-overlay", "#FFFCF8", "#241A21"),
    ("--dsw-alias-bg-skeleton", "#E9DED5", "#24151C"),
    ("--dsw-alias-bg-mask-1", "#0000000D", "#FFFFFF0A"),
    ("--dsw-alias-bg-mask-2", "#0000001A", "#FFFFFF12"),
    ("--dsw-alias-bg-mask-3", "#0000002E", "#FFFFFF1F"),
    ("--dsw-alias-bg-mask-drop", "#00000026", "#FFFFFF14"),
    ("--dsw-alias-bg-mask-photo", "#00000059", "#FFFFFF2E"),
    ("--dsw-alias-bg-module-platform", "#EFE5DC", "#1F1319"),
    ("--dsw-alias-bg-multi-select", "#F7E3DC", "#3A1E1C"),
    ("--dsw-alias-bg-document-preview", "#FFFCF8", "#241A21"),
    ("--dsw-alias-bg-document-selection", "#F3DAD2", "#3A1E1C"),
    ("--dsw-alias-border-inverted", "#2A1A18", "#F4E3D8"),
    ("--dsw-alias-border-inverted2", "#4A322D", "#D6BAAD"),
    ("--dsw-alias-border-l1", "#E8DAD0", "#241519"),
    ("--dsw-alias-border-l2", "#DCC3B4", "#3B2229"),
    ("--dsw-alias-border-l2-darkmode-thin", "#E8DAD0", "#382027"),
    ("--dsw-alias-border-l3", "#C6A897", "#4E2E36"),
    ("--dsw-alias-border-l4", "#AE8F7E", "#63404A"),
    ("--dsw-alias-label-caption", "#8F7670", "#997C72"),
    ("--dsw-alias-label-deep-diving", "#C0282E", "#FF8A5C"),
    ("--dsw-alias-label-deep-diving-shimmer", "#F0B49C", "#FFC9A8"),
    ("--dsw-alias-label-dimmed", "#A08E88", "#7E6660"),
    ("--dsw-alias-label-document-preview", "#2A1A18", "#F4E3D8"),
    ("--dsw-alias-label-primary", "#2A1A18", "#F4E3D8"),
    ("--dsw-alias-label-primary-bluish", "#2A2228", "#E8D6CC"),
    ("--dsw-alias-label-primary-dimmed", "#3D2A25", "#DCC6BA"),
    ("--dsw-alias-label-primary-foreground", "#FFF8F2", "#0F0A12"),
    ("--dsw-alias-label-primary-inverted", "#FFF8F2", "#0F0A12"),
    ("--dsw-alias-label-secondary", "#5C423C", "#D6BAAD"),
    ("--dsw-alias-label-shimmer", "#E8D7C8", "#3A2A24"),
    ("--dsw-alias-label-tertiary", "#7D615C", "#A98A80"),
    ("--dsw-alias-menu-group-header-fill", "#EFE5DC", "#1F1319"),
    ("--dsw-alias-menu-icon", "#5C423C", "#D6BAAD"),
    ("--dsw-alias-scrollbar-bg-l1", "#E8DAD0", "#2A1A22"),
    ("--dsw-alias-scrollbar-bg-l2", "#EFE5DC", "#241720"),
    ("--dsw-alias-scrollbar-hover-l1", "#D6BFB0", "#4E2E36"),
    ("--dsw-alias-scrollbar-hover-l2", "#DCC3B4", "#3B2229"),
    ("--dsw-alias-state-business-primary", "#C0282E", "#FF6A3C"),
    ("--dsw-alias-state-business-tertiary", "#F7E3DC", "#3A1E1C"),
    ("--dsw-alias-state-error-primary", "#C0282E", "#E6454C"),
    ("--dsw-alias-state-error-secondary", "#F3DAD2", "#3A1E1C"),
    ("--dsw-alias-state-idle-primary", "#8F7670", "#7E6660"),
    ("--dsw-alias-state-success-primary", "#3A7D44", "#46A960"),
    ("--dsw-alias-state-success-secondary", "#E7F0E6", "#1F3A28"),
    ("--dsw-alias-state-success-tertiary", "#EAF3E7", "#1B3A22"),
    ("--dsw-alias-state-warn-label", "#8A5A16", "#FFD08A"),
    ("--dsw-alias-state-warn-primary", "#D48828", "#F2A93B"),
    ("--dsw-alias-state-warn-secondary", "#FBF0DE", "#3A2A12"),
    ("--dsw-alias-state-warn-tertiary", "#FDF7EC", "#2E2411"),
    ("--dsw-alias-switch-thumb", "#FFF8F2", "#F4E3D8"),
    ("--dsw-alias-toast-bg", "#2A1A18", "#2C1A22"),
    ("--dsw-alias-toast-label", "#FFF8F2", "#F4E3D8"),
    ("--dsw-alias-tooltip-bg", "#2A1A18", "#2C1A22"),
    ("--dsw-alias-tooltip-key-bg", "#4A322D", "#3B2229"),
    ("--dsw-alias-turn-trigger-bg", "#EFE5DC", "#241720"),
    ("--dsw-alias-turn-trigger-bg-hover", "#E8DAD0", "#2C1A22"),
    ("--dsw-specific-bubble", "#F7EFE9", "#24151C"),
    ("--dsw-specific-bubble-highlight", "#F7E3DC", "#3A1E1C"),
    ("--dsw-specific-input-major", "#FFF8F2", "#1B1118"),
    ("--dsw-specific-login-input", "#FFF8F2", "#1B1118"),
    ("--dsw-specific-menu", "#FFF8F2", "#1B1118"),
    ("--dsw-specific-selector", "#F7EFE9", "#24151C"),
    ("--dsw-specific-sidebar-fill", "#EFE6DD", "#150D13"),
    ("--dsw-specific-sidebar-nav-item-active", "#F7E3DC", "#3A1E1C"),
    ("--dsw-specific-sidebar-nav-item-active-accent", "#C0282E", "#FF6A3C"),
    ("--dsw-specific-sidebar-nav-item-hover", "#F3E9E1", "#241720"),
    ("--dsw-specific-tip", "#EFE5DC", "#241A21"),
]

# ------------------------------------------------------------ PNG 尺寸


def mp4_track_seconds(data):
    """读出 mp4 各轨时长，返回最大值（播放器的 video.duration 取它）。"""
    durations = []
    pos = 0
    while True:
        j = data.find(b"mdhd", pos)
        if j < 0:
            break
        version = data[j + 4]
        if version == 0:
            timescale, duration = struct.unpack(">II", data[j + 16:j + 24])
        else:
            timescale, duration = struct.unpack(">IQ", data[j + 24:j + 36])
        durations.append(duration / timescale)
        pos = j + 4
    if not durations:
        raise SystemExit("成片缺少 mdhd")
    return max(durations)


def png_size(data):
    w, h = struct.unpack(">II", data[16:24])
    return w, h


def webp_size(data):
    chunk = data[12:16]
    if chunk == b"VP8X":
        w = int.from_bytes(data[24:27], "little") + 1
        h = int.from_bytes(data[27:30], "little") + 1
        return w, h
    if chunk == b"VP8 ":
        w = int.from_bytes(data[26:28], "little") & 0x3FFF
        h = int.from_bytes(data[28:30], "little") & 0x3FFF
        return w, h
    if chunk == b"VP8L":
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    raise SystemExit("无法识别的 WebP 头")


# ------------------------------------------------------------ 组装
def main():
    # 目标基线：本机 dev.44（支持 cover 与 workspaceCues）。
    # 需要给 dev.35 验收用的兼容包时加 --compat-dev35，去掉这两项顶层字段。
    global OUT, ASSETS
    compat_dev35 = "--compat-dev35" in sys.argv[1:]
    if compat_dev35:
        OUT, ASSETS = ROOT / "skin-dev35", ROOT / "skin-dev35" / "assets"
    if not PACK.exists():
        raise SystemExit(f"找不到素材包：{PACK}")
    if OUT.exists():
        shutil.rmtree(OUT)
    ASSETS.mkdir(parents=True)

    import zipfile
    archive = zipfile.ZipFile(PACK)
    names = set(archive.namelist())

    def read(rel):
        local = LOCAL.get(rel)
        if local is not None and local.exists():
            return local.read_bytes()
        inner = f"{INNER}/{rel}"
        if inner not in names:
            raise SystemExit(f"素材包缺文件：{inner}")
        return archive.read(inner)

    assets = {}

    def add(asset_id, data, mime, **extra):
        filename = asset_id + {"image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4"}[mime]
        (ASSETS / filename).write_bytes(data)
        record = {
            "path": f"assets/{filename}",
            "mime": mime,
            "sha256": hashlib.sha256(data).hexdigest(),
            "bytes": len(data),
        }
        if mime == "image/png":
            w, h = png_size(data)
            record["width"], record["height"] = w, h
        elif mime == "image/webp":
            w, h = webp_size(data)
            record["width"], record["height"] = w, h
        record.update(extra)
        assets[asset_id] = record

    SRC = {"image/png": "随素材包提供（烬角 · 黑焰 v3.6）",
           "image/webp": "随素材包提供（烬角 · 黑焰 v3.6）",
           "video/mp4": "随素材包提供（烬角 · 黑焰 v3.6，H.264/AAC 立体声）"}
    # 清单有 64 KiB 上限，逐项授权用短串；完整许可见 licenses/README.md
    LIC = "Dr.S 授权，禁止转发"

    # 49 枚可替换图标，取素材包的中性色成套。
    # 排除 send：引擎的 send 选择器里有 svg[data-icon="dsw-icon-send-outline-regular"]，
    # 会同时命中队列面板的「插话发送」按钮；那里的底是透明的，近白图标等于隐形。
    # 与其让两处共用一张图，不如让 send 回到宿主原生图标（主发送键与插话键都正常）。
    icon_dir = {"neutral": "{mode}-neutral", "accent": "{mode}"}[ICON_SET]
    semantic_icons = {}
    for key in [k for k in ICON_KEYS if k != "send"]:
        for mode in ("light", "dark"):
            raw = read(f"exports/icons/{icon_dir.format(mode=mode)}/{key}.png")
            add(f"icon-{key}-{mode}", raw, "image/png", alpha=True,
                source=f"素材包 exports/icons/{icon_dir.format(mode=mode)}/{key}.png", license=LIC)
        semantic_icons[key] = {"light": f"icon-{key}-light", "dark": f"icon-{key}-dark"}

    add("mark-light", read("exports/brand/entry-mark-light-96x96.png"), "image/png",
        alpha=True, source=SRC["image/png"], license=LIC)
    add("mark-dark", read("exports/brand/entry-mark-dark-96x96.png"), "image/png",
        alpha=True, source=SRC["image/png"], license=LIC)
    add("chat-bg", read("exports/backgrounds/chat-bg-1440x900.png"), "image/png",
        source=SRC["image/png"], license=LIC)
    poster_source = SRC["image/png"]
    if LOCAL["exports/opening/opening-still.png"].exists():
        poster_source = "取自素材包 v3.6 成片 9.0 s 的干净帧（1280×720），无落版主题字"
    add("opening-poster", read("exports/opening/opening-still.png"), "image/png",
        source=poster_source, license=LIC)
    film = read("exports/opening/opening-film.mp4")
    film_source = SRC["video/mp4"]
    if LOCAL["exports/opening/opening-film.mp4"].exists():
        film_source = "素材包 v3.6 成片本地裁切：9.35 s 处截断（原 10.495 s），去掉 9.5 s 起的落版主题字，音频尾 0.35 s 淡出"
    track_seconds = mp4_track_seconds(film)
    startup_seconds = round(track_seconds, 1)
    if abs(track_seconds - startup_seconds) > 0.09:
        raise SystemExit(f"成片时长 {track_seconds:.3f}s 与 seconds={startup_seconds} 相差超过容差")
    add("opening-film", film, "video/mp4",
        width=1280, height=720, source=film_source, license=LIC)
    if not compat_dev35:
        add("library-cover", read("exports/backgrounds/cover-960x600.webp"), "image/webp",
            source=SRC["image/webp"], license=LIC)

    # 场景预设的模型徽记：本地生成，见 scripts/make-scene-badges.py
    BADGE_DIR = ROOT / "assets-src" / "scene-badges"
    if not compat_dev35 and BADGE_DIR.exists():
        for badge_id in ("scene-flare", "scene-ember", "scene-seal"):
            path = BADGE_DIR / f"{badge_id}.png"
            if not path.exists():
                raise SystemExit(f"缺少徽记 {path}，先跑 scripts/make-scene-badges.py")
            add(badge_id, path.read_bytes(), "image/png", alpha=True,
                source="本地生成（角族徽记 + 场景色圆盘，scripts/make-scene-badges.py）", license=LIC)

    token_map = {key: {"light": light, "dark": dark} for key, light, dark in TOKENS}
    if len(token_map) != 71:
        raise SystemExit(f"令牌数应为 71，实际 {len(token_map)}")

    manifest = {
        "formatVersion": 2,
        "id": "black-flame",
        "version": "0.2.3",
        "name": "黑焰",
        "description": "无桌宠版：烬色与封存舱两套配色、49 枚中性色工作区图标、入口徽记、去掉落版主题字的 9.4 秒立体声开场与回复风格。作者 Dr.S，仅本人分发。按主题盒子 1.0 契约制作。",
        "dshVersions": ["0.2.2-rc.1"],
        "replyStyle": {
            "address": "契约者",
            "tone": "一句话不超过 25 字。冷淡、句子短，先给结论再补一句必要的条件或后果，不做情绪铺垫。不用感叹号、语气词和表情符号。一律用第一人称「我」，正式报状态时可带编号 07，不说「本单元」这类机号口吻。承认不知道时直说，不编。用户要求展开时分层说明，否则只给最直接的一步。",
        },
        "assets": assets,
        "modules": {
            "theme": {
                "interfaceVersion": 1,
                "configVersion": 3,
                "required": True,
                "config": {
                    "tokens": token_map,
                    "background": "chat-bg",
                    "workspacePreset": "commander-v1",
                    "semanticIcons": semantic_icons,
                    "entryMarks": {"light": "mark-light", "dark": "mark-dark"},
                },
                "settings": {
                    "backgroundOpacity": {"label": "背景浓度", "default": 0.04},
                    "entryMarkEnabled": {"label": "入口标识", "default": True},
                    "workspaceDetailsEnabled": {"label": "工作区细节", "default": True},
                    "workspaceMotionEnabled": {"label": "界面动效", "default": True},
                    "workFeedbackEnabled": {"label": "工作反馈", "default": True},
                },
            },
            "startup": {
                "interfaceVersion": 1,
                "configVersion": 3,
                "required": False,
                "config": {
                    "poster": "opening-poster",
                    "video": "opening-film",
                    "seconds": startup_seconds,
                    "handoffSeconds": 0.35,
                    "stillSeconds": 1.2,
                    "greeting": "黑焰",
                    "subtitle": "封存体解除 · 单元苏醒",
                },
                "settings": {
                    "reducedMotion": {"label": "减少开场动态", "default": False},
                    "soundEnabled": {"label": "开场声音", "default": True},
                },
            },
        },
    }

    if not compat_dev35:
        # 1.0：每个场景可声明时长、位置、入场效果与明暗配色。
        # 三个场景共用一套底色与字色（同一套皮肤的「提示容器」），只用描边区分发生了什么：
        # 欢迎=火的强调红，切会话=中性描边，切工作区=余烬金。
        cue_base = {
            "background": {"light": "#FFF8F2", "dark": "#2C1A22"},
            "text": {"light": "#2A1A18", "dark": "#F4E3D8"},
        }
        def cue_colors(border_light, border_dark):
            colors = dict(cue_base)
            colors["border"] = {"light": border_light, "dark": border_dark}
            return colors
        manifest["cover"] = "library-cover"
        manifest["workspaceCues"] = {
            # 离开 ≥15 s 回来：这句是「她注意到你回来了」，留久一点
            "welcome": {"text": "你回来了。火还在。", "default": True,
                        "seconds": 6, "position": "above-input", "effect": "fade",
                        "colors": cue_colors("#C0282E", "#FF6A3C")},
            # 同工作区切会话：一句话交代，不打断
            "session": {"text": "换了一页。", "default": False,
                        "seconds": 2.5, "position": "bottom-right", "effect": "fade",
                        "colors": cue_colors("#C6A897", "#7D615C")},
            # 跨工作区：动作性更强，用轻移入场
            "workspace": {"text": "我跟着过来了。", "default": False,
                          "seconds": 3, "position": "top-right", "effect": "slide",
                          "colors": cue_colors("#C98A4B", "#E7A45C")},
        }
        # 1.0：工作区共用角色身份（不带 petContext，故不声明 petEnabledDefault）
        manifest["character"] = {
            "name": "阿斯特",
            "identity": "你是阿斯特，封存舱里醒来的角族少女，封存编号 07。角是你的燃料表，火弱的时候角会发暗。你不擅长客套，也不擅长撒谎；对火有本能的亲近，对光和人群不适应。",
            "workContext": "在工作区里准确完成当前任务：先给结论，再补一句必要的条件或后果。拿不准时直说不知道。",
        }
        # 1.0：场景预设。模型徽记走 assets，工作区只用明暗强调色
        manifest["scenePresets"] = {
            "model": {
                "flare": {"label": "炽焰", "badge": "scene-flare", "notice": "炽焰档。烧得快。"},
                "ember": {"label": "余烬", "badge": "scene-ember", "notice": "余烬档。省着火。"},
                "seal": {"label": "封存", "badge": "scene-seal", "notice": "封存档。没动火。"},
            },
            "workspace": {
                "chamber": {"label": "封存舱",
                            "accent": {"light": "#C0282E", "dark": "#FF6A3C"},
                            "notice": "封存舱。冷。"},
                "emberfield": {"label": "余烬层",
                               "accent": {"light": "#8A5A16", "dark": "#E7A45C"},
                               "notice": "余烬层。脚下是热的。"},
                "watch": {"label": "警戒层",
                          "accent": {"light": "#B2541E", "dark": "#F2A93B"},
                          "notice": "警戒层。别出声。"},
            },
        }
        # 让新增字段排在 description 与 assets 之间，顺序固定
        ordered = {}
        for key in ("formatVersion", "id", "version", "name", "description", "dshVersions",
                    "cover", "replyStyle", "character", "workspaceCues", "scenePresets",
                    "assets", "modules"):
            ordered[key] = manifest[key]
        manifest.clear()
        manifest.update(ordered)

    (OUT / "skin.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(a["bytes"] for a in assets.values())
    print(f"skin/        资源 {len(assets)} 项 / {total / 1048576:.2f} MiB")
    print(f"icons        50 枚 × 2 色（中性 48 / 强调底 2）")
    print(f"tokens       {len(token_map)} 个")
    print(f"skin.json    {os.path.getsize(OUT / 'skin.json')} bytes")


if __name__ == "__main__":
    main()
