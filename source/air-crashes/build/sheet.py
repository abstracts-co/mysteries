import sys, json, glob
from PIL import Image, ImageDraw
d, cols, rows, tw, th = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
fs = sorted(glob.glob(d + '/[0-9]*.jpg')); log = json.load(open(d + '/log.json'))
per = cols * rows
for g in range(0, len(fs), per):
    W = Image.new('RGB', (cols * tw, rows * th), (0, 0, 0)); D = ImageDraw.Draw(W)
    for i, f in enumerate(fs[g:g + per]):
        x, y = (i % cols) * tw, (i // cols) * th
        W.paste(Image.open(f).resize((tw, th)), (x, y)); D.rectangle((x, y, x + 62, y + 13), fill=(0, 0, 0)); D.text((x + 3, y + 1), f"{log[g + i]['story']}s", fill=(255, 220, 120))
    W.save(f"{d}/sheet-{g // per}.jpg", quality=80)
print(len(fs))
