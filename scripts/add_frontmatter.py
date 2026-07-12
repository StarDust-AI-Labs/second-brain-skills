import os
import re
import datetime

VAULT = r"D:\second-brain\第二大脑"
EXCLUDE_DIRS = {'.obsidian', '.git', '.agents', '.codex', '.trash'}

def infer_para_category(path_rel):
    parts = path_rel.replace('\\', '/').split('/')
    for p in parts:
        if '存档' in p:
            return 'archive'
        if '领域' in p or 'Area' in p:
            return 'area'
        if '项目' in p or 'Project' in p:
            return 'project'
        if '资源' in p or 'Resource' in p:
            return 'resource'
        if '收件箱' in p:
            return 'inbox'
    return 'inbox'

def infer_tags(path_rel, content_preview):
    tags = []
    parts = path_rel.replace('\\', '/').split('/')
    for p in parts:
        p_clean = p.strip()
        if 'AI' in p_clean and '前' in p_clean:
            tags.append('AI前沿')
        if '知识管理' in p_clean:
            tags.append('知识管理')
        if '个人成长' in p_clean:
            tags.append('个人成长')
        if '内容创作' in p_clean or '视频创作' in p_clean:
            tags.append('内容创作')
        if '写作' in p_clean:
            tags.append('写作素材')
        if 'Agent' in p_clean or 'Agent' in p_clean:
            tags.append('AI-Agent')
    if '第二大脑' in path_rel:
        tags.append('第二大脑')
    return tags

def extract_date_from_filename(filename):
    match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1)
    return datetime.date.today().isoformat()

def read_first_heading(content):
    match = re.search(r'^#\s+(.+)', content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return None

def generate_frontmatter(filepath, content, para_cat):
    filename = os.path.basename(filepath)
    captured_date = extract_date_from_filename(filename)
    title = read_first_heading(content) or filename.replace('.md', '')

    tags = infer_tags(filepath, content[:500])
    tags.append(para_cat)

    if '灵感' in filename or '灵感-' in filename:
        note_type = '灵感'
    elif '复盘' in filename or filepath.replace('\\', '/').count('复盘') > 0:
        note_type = '复盘'
    elif '项目总览' in filename or '项目文档' in filename:
        note_type = '项目文档'
    elif para_cat == 'resource':
        note_type = '参考资料'
    elif para_cat == 'inbox':
        note_type = '待处理'
    else:
        note_type = '笔记'

    fm = """---
title: "{}"
created: {}
updated: {}
type: {}
para_category: {}
tags: [{}]
distill_level: 0
---

""".format(title, captured_date, datetime.date.today().isoformat(), note_type, para_cat, ', '.join(tags))
    return fm

def has_frontmatter(lines):
    if not lines:
        return False
    return lines[0].strip() == '---'

def process_file(filepath, para_cat):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        lines = content.split('\n')

        if has_frontmatter(lines):
            return 'skip'

        fm = generate_frontmatter(filepath, content, para_cat)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(fm + content)

        return 'added'

    except Exception as e:
        return 'error: {}'.format(e)

def main():
    stats = {'added': 0, 'skip': 0, 'error': 0}

    for root, dirs, files in os.walk(VAULT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            if not file.endswith('.md'):
                continue

            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, VAULT)
            para_cat = infer_para_category(rel_path)

            result = process_file(filepath, para_cat)
            if result == 'added':
                stats['added'] += 1
                print("OK: {}".format(rel_path.encode('utf-8', errors='replace')))
            elif result == 'skip':
                stats['skip'] += 1
            else:
                stats['error'] += 1
                print("ERR: {} - {}".format(rel_path.encode('utf-8', errors='replace'), result))

    print("\nSummary: {} added, {} skipped, {} errors".format(stats['added'], stats['skip'], stats['error']))

if __name__ == '__main__':
    main()
