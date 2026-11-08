# -*- coding: utf-8 -*-
"""按主题盒子 1.0 的三张表格模板，导出本套的资产 / 音频 / 动作表。

模板见制作交接包：asset-register.csv、audio-cues.csv、action-catalog.csv。
输出到 review/kit-*.csv，可直接并入交付。

运行：python3 scripts/export-kit-registers.py
"""
import csv
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIN = ROOT / "skin"
OUT = ROOT / "review"

AUTHOR = "Dr.S"
CREDIT = "Dr.S"
SCOPE = "仅作者 Dr.S 分发；获取者仅可自用"

# 与 build-skin.py 保持一致的用途映射
def purpose(asset_id, asset):
    if asset["mime"] == "video/mp4":
        return ("开场成片", "startup.video")
    if asset_id == "library-cover":
        return ("皮肤库封面", "cover")
    if asset_id == "chat-bg":
        return ("工作区聊天背景", "theme.background")
    if asset_id == "opening-poster":
        return ("开场静帧", "startup.poster")
    if asset_id.startswith("mark-"):
        return ("主题盒子入口徽记", f"theme.entryMarks.{asset_id.split('-')[1]}")
    if asset_id.startswith("scene-"):
        return ("模型场景徽记", f"scenePresets.model.*.badge")
    key, mode = asset_id[5:].rsplit("-", 1)
    return ("工作区语义图标", f"theme.semanticIcons.{key}.{mode}")


def mp4_seconds(path):
    data = path.read_bytes()
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
    return max(durations) if durations else 0


def main():
    manifest = json.loads((SKIN / "skin.json").read_text(encoding="utf-8"))
    film = mp4_seconds(SKIN / manifest["assets"][manifest["modules"]["startup"]["config"]["video"]]["path"])

    # ---------- 资产表 ----------
    rows = []
    for asset_id, asset in manifest["assets"].items():
        use, config = purpose(asset_id, asset)
        is_video = asset["mime"] == "video/mp4"
        rows.append({
            "资源ID": asset_id,
            "文件名": asset["path"],
            "用途或触发": use,
            "对应配置": config,
            "状态(运行/源稿/规划)": "运行",
            "格式": asset["mime"],
            "宽px": asset.get("width", ""),
            "高px": asset.get("height", ""),
            "帧率": "" if is_video else "-",
            "帧数": "",
            "实际时长秒": round(film, 2) if is_video else "",
            "真实Alpha": ("是" if asset.get("alpha") else "否") if not is_video else "否",
            "循环": "",
            "脚点或锚点": "",
            "作者": AUTHOR,
            "来源": asset.get("source", ""),
            "许可": "Dr.S 授权使用，禁止转发",
            "署名": CREDIT,
            "可分发范围": SCOPE,
            "bytes": asset["bytes"],
            "sha256": asset["sha256"],
            "备注": "画面裁到 9.35 s（去掉落版主题字）；容器 mvhd 9.35 s，音轨含 AAC priming 至 9.43 s" if is_video else "",
        })
    (OUT / "kit-asset-register.csv").write_text(
        "\ufeff" + "\n".join(csv.DictWriter(rows[0].keys(), delimiter=",").writerow(r) if False else ""), encoding="utf-8") if False else None
    with open(OUT / "kit-asset-register.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    # ---------- 声音表 ----------
    # 运行包里没有独立事件音，全部混在开场成片里；时间点取自素材包 copy/台词表与时间码.csv
    audio = [
        ("VO-T01", "台词「封印碎了。」", "混入开场成片", 2.40, 4.19, True),
        ("VO-T02", "台词「火……我只有火记得我。」", "混入开场成片", 4.64, 6.66, True),
        ("VO-T03", "台词「手给我。火认得你。」", "混入开场成片", 7.26, 8.84, True),
        ("SFX-LOCK", "容器锁扣解除", "混入开场成片", 0.55, 2.45, True),
        ("SFX-IGNITE", "火焰点燃", "混入开场成片", 3.95, 5.84, True),
        ("SFX-TICK", "界面提示", "混入开场成片", 6.81, 7.31, True),
        ("AMB-BED", "环境底噪（循环铺底）", "混入开场成片", 0.00, round(film, 2), True),
    ]
    with open(OUT / "kit-audio-cues.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "声音ID", "文件名", "台词或声音含义", "触发场景", "起始秒", "结束秒", "采样率", "位深",
            "声道", "LUFS-I", "dBTP", "是否混入开场", "是否循环", "打断规则", "作者", "许可", "接入状态"])
        w.writeheader()
        for aid, meaning, scene, start, end, mixed in audio:
            w.writerow({
                "声音ID": aid, "文件名": "opening-film.mp4（AAC 音轨）", "台词或声音含义": meaning,
                "触发场景": scene, "起始秒": f"{start:.2f}", "结束秒": f"{end:.2f}",
                "采样率": "48000", "位深": "AAC 有损（母版 24-bit）", "声道": "2",
                "LUFS-I": "", "dBTP": "", "是否混入开场": "是" if mixed else "否",
                "是否循环": "是" if aid == "AMB-BED" else "否", "打断规则": "随开场结束",
                "作者": AUTHOR, "许可": "Dr.S 授权使用，禁止转发",
                "接入状态": "已混入开场成片；独立事件音为规划，1.0 无播放字段",
            })

    # ---------- 动作表 ----------
    with open(OUT / "kit-action-catalog.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[
            "动作ID", "中文语义", "资源ID", "开始姿态", "结束姿态", "循环或单次", "时长秒", "朝向",
            "位移参考", "脚点", "手部接触点", "道具及遮挡", "可打断点", "取消收尾", "回待机方式",
            "适合场景", "不适合场景", "关联声音ID", "当前驱动可执行", "备注"])
        w.writeheader()
        w.writerow({k: "" for k in w.fieldnames} | {
            "动作ID": "n/a", "中文语义": "不适用", "备注": "无桌宠版，未声明 pet 模块与动作素材"})

    # ---------- 简化台账（交付说明里一直引用的那份） ----------
    with open(OUT / "运行资源台账.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["资源ID", "路径", "用途", "格式", "宽", "高",
                                          "Alpha", "字节", "SHA256", "来源", "作者", "许可"])
        w.writeheader()
        for r in rows:
            w.writerow({
                "资源ID": r["资源ID"], "路径": r["文件名"], "用途": r["用途或触发"],
                "格式": r["格式"], "宽": r["宽px"], "高": r["高px"],
                "Alpha": r["真实Alpha"], "字节": r["bytes"], "SHA256": r["sha256"],
                "来源": r["来源"], "作者": AUTHOR, "许可": "Dr.S 授权使用，禁止转发",
            })

    print(f"资产表 {len(rows)} 行 / 声音表 {len(audio)} 行 / 动作表 1 行（不适用）")
    print(f"开场成片实测 {film:.3f} s")


if __name__ == "__main__":
    main()
