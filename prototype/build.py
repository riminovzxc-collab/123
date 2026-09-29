"""Собирает прототип в один HTML-файл без <html>/<head>/<body> — для публикации как Artifact.

    python3 build.py dist/sozvezdie.html
"""
import re
import sys
from pathlib import Path

root = Path(__file__).parent
out = Path(sys.argv[1] if len(sys.argv) > 1 else root / 'dist' / 'sozvezdie.html')
html = (root / 'index.html').read_text(encoding='utf-8')

head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
head = re.sub(r'\s*<meta[^>]*>', '', head)
head = head.replace('<link rel="stylesheet" href="styles.css">',
                    '<style>\n' + (root / 'styles.css').read_text(encoding='utf-8') + '</style>')
for name in ('sky-data.js', 'data.js', 'scenes.js', 'app.js'):
    tag = f'<script src="{name}"></script>'
    assert tag in body, name
    body = body.replace(tag, '<script>\n' + (root / name).read_text(encoding='utf-8') + '</script>')

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(head.strip() + '\n' + body.strip() + '\n', encoding='utf-8')
print(f'{out} · {out.stat().st_size // 1024} КБ')
