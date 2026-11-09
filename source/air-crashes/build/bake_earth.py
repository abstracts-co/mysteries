import io, json, math, re, struct, sys, urllib.request, concurrent.futures as cf
import numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS=None
raw,out=sys.argv[1],sys.argv[2]
day=Image.open(f'{raw}/day.png').convert('RGB')
day.resize((6144,3072),Image.LANCZOS).save(f'{out}/day.webp',quality=70,method=6)
n=Image.open(f'{raw}/night.png').convert('L')
a=np.asarray(n,dtype=float)
# keep lights, drop the faint land glow so day/night blends cleanly
a=np.clip((a-18)/235,0,1)**1.4*255
Image.fromarray(a.astype('uint8')).resize((3072,1536),Image.LANCZOS).save(f'{out}/night.webp',quality=60,method=6)
# terrarium mosaic, z4, mercator -> equirect
def tile(a):
    z,x,y=a
    r=urllib.request.Request(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',headers={'User-Agent':'abstracts-build'})
    return x,y,np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(r,timeout=40).read())).convert('RGB'),dtype=float)
z=4;N=2**z;M=np.zeros((N*256,N*256))
with cf.ThreadPoolExecutor(6) as ex:
    for x,y,t in ex.map(tile,[(z,x,y) for x in range(N) for y in range(N)]):
        M[y*256:(y+1)*256,x*256:(x+1)*256]=t[...,0]*256+t[...,1]+t[...,2]/256-32768
W,H=4096,2048
lat=(0.5-(np.arange(H)+.5)/H)*180
merc=(1-np.log(np.tan(np.pi/4+np.clip(np.radians(lat),-1.48,1.48)/2))/np.pi)/2*M.shape[0]
row=np.clip(merc,0,M.shape[0]-1).astype(int)
col=((np.arange(W)+.5)/W*M.shape[1]).astype(int)
E=M[row][:,col]
np.save(f'{raw}/elev_equirect.npy',E.astype('float32'))
land=np.clip(np.sqrt(np.maximum(E,0)/8800),0,1)*255
sea=np.clip(np.sqrt(np.maximum(-E,0)/9500),0,1)*255
water=(E<=0)*255.0
# day-image water mask is sharper at coasts
d=np.asarray(day.resize((W,H),Image.BOX),dtype=float)
blueish=(d[...,2]>d[...,0]*1.08)&(d[...,2]>d[...,1]*1.02)&(d.sum(-1)<230)
water=np.where(blueish&(E<30),255.0,np.where(E>30,0.0,water))
rgb=np.dstack([land,sea,water]).astype('uint8')
Image.fromarray(rgb).resize((2048,1024),Image.LANCZOS).save(f'{out}/relief.webp',quality=80,method=6)
Image.fromarray(water.astype('uint8')).save(f'{out}/water.png',optimize=True)
c=Image.open(f'{raw}/clouds.png').convert('RGBA'); ca=np.asarray(c)
print('cloud',ca.shape,ca[...,3].mean(),ca[...,0].mean())
ch=ca[...,3]
Image.fromarray(ch).resize((2048,1024),Image.BICUBIC).save(f'{out}/clouds.webp',quality=60,method=6)
# stars: compact binary ra,dec,mag,ci (hr-ish k temp)
s=json.load(open(f'{raw}/bsc.json'))
def dms(t):
    n=re.findall(r'[\d.]+',t); return float(n[0])+float(n[1])/60+float(n[2])/3600
rows=[]
for r in s:
    try:
        v=float(r['V']); 
        if v>6.0: continue
        ra=dms(r['RA'])*15; d=dms(r['Dec'])*(-1 if r['Dec'].strip()[0] in '-−' else 1); k=float(r.get('K') or 5800)
        rows.append((ra,d,v,k))
    except Exception: pass
print('stars',len(rows))
import base64
buf=b''.join(struct.pack('<HhBB',int(ra/360*65535),int(d/90*32767),int((v+2)*30),int(min(k,25500)/100)) for ra,d,v,k in rows)
open(f'{out}/stars.txt','w').write(base64.b64encode(buf).decode())
