#!/usr/bin/env python3
"""Archive the user's selected Jimeng original and make review-only crops."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import shutil

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
SOURCE = ROOT / '素材/jimeng-2026-11-04-1900-请仅依据上传的开场动画原帧，重建画面中同一位蓝发女孩的一张完整全身角色母版。以原....png'
MASTER = BASE / 'assets/character/jimeng-flash-master-04-source.png'


def relative(path):
    return str(path.relative_to(ROOT))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def update_json(path, changes):
    value = json.loads(path.read_text())
    value.update(changes)
    write_json(path, value)


MASTER.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(SOURCE, MASTER)
digest = hashlib.sha256(MASTER.read_bytes()).hexdigest()
assert digest == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
with Image.open(MASTER) as image:
    image.verify()
with Image.open(MASTER) as image:
    master = image.convert('RGB')
assert master.size == (1664, 2496)

# Crops retain source pixels. These are review views, not transparent pet assets.
portrait = master.crop((480, 20, 1200, 830))
portrait_path = BASE / 'assets/character/jimeng-flash-master-04-portrait-review.png'
portrait.resize((384, 432), Image.Resampling.LANCZOS).save(portrait_path)
font_path = '/System/Library/Fonts/STHeiti Medium.ttc'


def font(size):
    return ImageFont.truetype(font_path, size)


board = Image.new('RGB', (1440, 1020), '#f3f0e8')
draw = ImageDraw.Draw(board)
draw.text((44, 30), '同一角色 · 用户选定母版 04', font=font(32), fill='#253344')
draw.text((44, 79), '开场原帧直接参考 / 即梦 Seedream 5.0 Flash / 原图按原样保留', font=font(19), fill='#6d7479')


def fit(image, box):
    x, y, width, height = box
    image = image.copy()
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    board.paste(image, (x + (width - image.width) // 2, y + (height - image.height) // 2))


draw.text((44, 134), '开场人物可见部分', font=font(22), fill='#253344')
with Image.open(ROOT / 'designs/dsh-skin-v1/assets/reference/scan-middle.png') as opening:
    fit(opening.crop((1120, 0, 2560, 1440)), (44, 178, 380, 380))
draw.text((44, 581), '发束 · 眼睑 · 蓝灰材质 · 缎带', font=font(18), fill='#586773')
draw.text((44, 620), '原片为局部镜头；完整身体和服装', font=font(17), fill='#6d7479')
draw.text((44, 648), '由第四张作本套设计延展。', font=font(17), fill='#6d7479')
draw.text((477, 134), '第四张完整原图', font=font(22), fill='#253344')
fit(master, (470, 178, 500, 750))
draw.text((1015, 134), '同源头像裁切', font=font(22), fill='#253344')
fit(portrait, (1015, 178, 380, 428))
draw.text((1015, 638), '缩小后的头像识别检查', font=font(20), fill='#253344')
head = master.crop((545, 20, 1135, 610))
for x, size in [(1020, 96), (1145, 64), (1240, 40)]:
    board.paste(head.resize((size, size), Image.Resampling.LANCZOS), (x, 690))
    draw.text((x, 806), f'{size} px', font=font(16), fill='#6d7479')
draw.line((44, 949, 1395, 949), fill='#d5d2c9', width=1)
draw.text((44, 969), '母版原图 1664 × 2496 · RGB | 去背、动作和实际桌宠运行仍需制作与验证', font=font(18), fill='#6d7479')
board_path = BASE / 'review/selected-master-04-board.jpg'
board.save(board_path, quality=92)

now = datetime.now(timezone.utc).isoformat()
record = {
    'character_id': 'archive-whale-opening-continuity-v3',
    'status': 'user-selected-working-master',
    'selected_on': '2026-11-04',
    'human_decision': {'selection': 4, 'quote': '我喜欢第四张', 'source_file_provided_by_user': relative(SOURCE), 'scope': '后续同角色资产的工作母版；不是动画、透明素材或正式安装包验收'},
    'formal_canon_frozen': False,
    'master_reference': relative(MASTER), 'master_sha256': digest,
    'size': list(master.size), 'mode': 'RGB', 'native_alpha': False, 'source_brand_mark_preserved': True,
    'provider': {'name': '即梦官方网页版', 'model': 'Seedream 5.0 Flash', 'ratio': '2:3', 'resolution': '2K', 'batch_images': 4, 'observed_credits_per_image': 3, 'observed_batch_credit_delta': 12, 'balance_before': 40, 'balance_after': 28, 'model_and_batch_adjusted_by_user': True, 'generation_state': '4 completed images observed in official result UI'},
    'source_reference': 'designs/dsh-skin-v1/assets/reference/scan-middle.png',
    'excluded_generation_reference': 'MOSS master-01 fullbody was removed before this accepted batch',
    'identity': {
        'face': '偏窄的柔和脸部，细长眼睑、青蓝眼神、淡色鼻唇；以选中原图几何为准',
        'hair': '深蓝紫长发，冷银蓝细发束高光，侧分刘海及两侧长鬓发；不能漂成浅白发',
        'anchor': '画面左侧深蓝缎带、白色扇褶头饰和白边深蓝片状侧饰的组合',
        'body': '以本图头身比例、肩腰关系、四肢与手脚几何为准；不改回旧大头Q版',
    },
    'costume': {
        'upper': '深蓝高领长袖工作裙，白褶边领口、肩胸褶边和袖口，前中小扣',
        'waist_and_skirt': '白色束腰及短围裙，深蓝裙摆与白色下摆褶边',
        'hosiery_and_footwear': '深蓝及膝长袜、深蓝系带低跟鞋',
        'human_selection_overrides_prompt': '第四张白围裙与完整褶饰按用户选择保留；不因先前提示词曾排除围裙而擅自删改',
    },
    'material_hierarchy': ['发丝与皮肤的细腻CG层次', '深蓝裙与缎带的克制布料高光', '珍珠白褶边与围裙的布褶', '深蓝鞋与袜的不同材质'],
    'must_preserve': ['脸型和五官几何', '蓝紫发色、刘海和长发结构', '头饰与缎带位置', '白围裙及整套服装色块位置', '身体比例、袜与鞋的设计', '同一套精细CG画风'],
    'may_vary': ['表情、注视与同源裁切', '姿势、步幅与动作节奏', '随动作产生的头发和衣褶变化', '可拆卸且符合主题的临时小道具'],
    'must_not_invent': ['新脸、新发色或旧Q版比例', '新兽耳、角、翼、尾巴或永久武器', '未经选择的永久服装改版', '把开场扫描字符固定进虹膜', '用旧A2动作和新母版静图拼成已统一的整套资产'],
    'lineage': {'opening_reference_preserved': True, 'old_moss_candidates_retained': True, 'old_r2_preserved': True, 'old_moss_rig_is_not_selected_master_rig': True},
    'outputs': {'review_board': relative(board_path), 'portrait_review': relative(portrait_path)},
    'technical_review': {'file_integrity': 'Pillow verify passed; copied file matches source SHA256', 'full_body': 'headpiece, hair ends, both hands, legs and shoes visible; no canvas-edge crop', 'hands_and_feet': 'visual review: no obvious duplicated limbs or severe hand/foot connection defects; articulated poses still need their own review', 'production_alpha': 'not created; original is RGB', 'animations': 'not created from this selected master'},
    'updated_at': now,
}
record_path = BASE / 'identity/selected-master.json'
write_json(record_path, record)
update_json(BASE / 'identity/identity_summary.json', {
    'status': record['status'], 'selected_master': 'identity/selected-master.json',
    'production_approach': '用户选择的即梦Flash第四张是唯一新母版；同源裁切与后续参考派生均从它制作，旧MOSS分层及A2动作不混用。',
    'actions_scope': '本轮继续包含走/跑节奏、爬、坐/躺与主题道具。当前新母版已由用户选定，基于它的动作尚未完成，动作素材与自主行为接入分开验收。',
})
update_json(BASE / 'identity/dreamina-master-01-request.json', {
    'status': 'web-flash-batch-completed-user-selected-image-4',
    'execution': {'initial_pro_attempt': 'rejected: membership required for Seedream 5.0 Pro and 2K; no image generated', 'actual_model': 'Seedream 5.0 Flash', 'actual_generate_num': 4, 'observed_credits_per_image': 3, 'observed_batch_credit_delta': 12, 'model_and_batch_adjusted_by_user': True, 'result': 'selected-master.json'},
})
update_json(BASE / 'review/dreamina-cli-validation.json', {
    'web_fallback': {'status': 'generation-completed', 'model': 'Seedream 5.0 Flash', 'reference_upload_completed': True, 'only_opening_reference_used': True, 'generation_submitted': True, 'generation_via': 'official web UI; user adjusted Flash and batch size', 'completed_images_observed': 4, 'observed_credits_per_image': 3, 'observed_batch_credit_delta': 12, 'balance_after': 28, 'user_selected_image': 4, 'selected_source': relative(MASTER), 'receipt': relative(record_path)},
    'credits_consumed_by_this_validation': 12, 'generation_submitted': True,
    'generation_channel': 'official web UI; CLI creation remains denied',
})
progress_path = ROOT / 'reports/first-skin/progress.json'
progress = json.loads(progress_path.read_text())
owned = progress['skinAssetsV3']
owned.update({'status': 'user-selected-jimeng-flash-master-04; same-character-assets-in-progress', 'adoptedCharacterSource': relative(MASTER), 'selectedMasterReceipt': relative(record_path), 'oldMossRigStatus': 'retained comparison only; not used with new selected master', 'next': 'derive same-character portrait/cutout and pose candidates from selected master 04, then combined preview and review', 'updatedAt': now})
owned['dreaminaValidation'].update({'generationSubmitted': True, 'generationChannel': 'official web UI', 'actualModel': 'Seedream 5.0 Flash', 'completedImages': 4, 'creditsConsumed': 12, 'observedCredits': 28, 'selectedImage': 4, 'sampleRequest': relative(BASE / 'identity/dreamina-master-01-request.json')})
write_json(progress_path, progress)
print(json.dumps({'archived': relative(MASTER), 'sha256': digest, 'size': list(master.size), 'selected': 4, 'review_board': relative(board_path), 'old_sources_preserved': True}, ensure_ascii=False, indent=2))
