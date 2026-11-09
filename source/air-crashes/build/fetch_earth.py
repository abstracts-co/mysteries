import io, os, sys, urllib.request, concurrent.futures as cf
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
raw=sys.argv[1]
def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':'abstracts-build'})
    for i in range(4):
        try:
            return urllib.request.urlopen(r,timeout=40).read()
        except Exception as e:
            err=e
    raise err
def gibs(layer,date,level,ext,outw,name):
    out=f'{raw}/{name}.png'
    if os.path.exists(out): return
    nx=20 if level==4 else 10 if level==3 else 5
    ny=nx//2
    W=int(360/(0.5625/2**level)); H=W//2
    im=Image.new('RGB',(W,H))
    def f(a):
        x,y=a
        u=f'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{date}/500m/{level}/{y}/{x}.{ext}'
        return a,Image.open(io.BytesIO(get(u))).convert('RGB')
    with cf.ThreadPoolExecutor(6) as ex:
        for (x,y),t in ex.map(f,[(x,y) for y in range(ny) for x in range(nx)]):
            im.paste(t,(x*512,y*512))
    im=im.resize((outw,outw//2),Image.LANCZOS); im.save(out); print(name,im.size)
gibs('BlueMarble_NextGeneration','2004-08-01',4,'jpeg',8192,'day')
gibs('VIIRS_Black_Marble','2016-01-01',3,'png',4096,'night')
