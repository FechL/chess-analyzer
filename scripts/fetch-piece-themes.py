"""Download the optional Lichess piece themes for the local app."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen

BASE = "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/"

def download(item):
    theme, piece = item
    target = Path("public/pieces") / theme / (piece + ".svg")
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists(): return
    with urlopen(BASE + theme + "/" + piece + ".svg", timeout=20) as response:
        data = response.read()
    if b"<svg" not in data:
        raise ValueError("Invalid SVG: " + piece)
    target.write_bytes(data)

with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(download, [(theme, color + piece) for theme in ("merida", "celtic") for color in "wb" for piece in "KQRBNP"]))
print("Downloaded Merida and Celtic: 24 SVG assets")

for url, target in [
    ("https://raw.githubusercontent.com/lichess-org/lila/master/COPYING.md", "public/pieces/LICHESS-COPYING.md"),
    ("https://raw.githubusercontent.com/maurimo/chess-art/main/LICENSE", "public/pieces/celtic/LICENSE"),
    ("https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt", "public/pieces/merida/LICENSE"),
]:
    target_path = Path(target)
    if target_path.exists():
        continue
    if target.endswith("merida/LICENSE") and Path("/usr/share/common-licenses/GPL-2").exists():
        target_path.write_bytes(Path("/usr/share/common-licenses/GPL-2").read_bytes())
        continue
    with urlopen(url, timeout=20) as response:
        target_path.write_bytes(response.read())
