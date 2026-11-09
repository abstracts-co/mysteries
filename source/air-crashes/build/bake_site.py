import io, json, math, sys, urllib.request, concurrent.futures as cf, os
import numpy as np
from PIL import Image
sid,w,s,e,n=sys.argv[1],*map(float,sys.argv[2:6]); out=sys.argv[6]; zi=int(sys.argv[7]) if len(sys.argv)>7 else 11; zo=zi-3
snow=len(sys.argv)>8 and sys.argv[8]=='snow'
def fetch(u):
    r=urllib.request.Request(u,headers={'User-Agent':'abstracts-build'})
    for i in range(4):
        try: return urllib.request.urlopen(r,timeout=30).read()
        except Exception as ex: err=ex
    return None
def x2t(lon,z): return (lon+180)/360*2**z
def y2t(lat,z):
    l=math.radians(max(min(lat,85.05),-85.05)); return (1-math.log(math.tan(l)+1/math.cos(l))/math.pi)/2*2**z
def mosaic(kind,w,s,e,n,z):
    x0,x1=int(x2t(w,z)),int(x2t(e,z)); y0,y1=int(y2t(n,z)),int(y2t(s,z))
    def f(a):
        x,y=a
        if kind=='h': u=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        else: u=f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
        b=fetch(u)
        if not b: return a,None
        try: return a,np.asarray(Image.open(io.BytesIO(b)).convert('RGB'),dtype=np.float32)
        except Exception: return a,None
    T=256
    M=np.zeros(((y1-y0+1)*T,(x1-x0+1)*T,3),dtype=np.float32)
    with cf.ThreadPoolExecutor(6) as ex:
        for (x,y),t in ex.map(f,[(x,y) for x in range(x0,x1+1) for y in range(y0,y1+1)]):
            if t is not None: M[(y-y0)*T:(y-y0+1)*T,(x-x0)*T:(x-x0+1)*T]=t
    return M,x0,y0,z
def sample(M,x0,y0,z,w,s,e,n,W,H):
    lons=w+(e-w)*(np.arange(W)+.5)/W; lats=n+(s-n)*(np.arange(H)+.5)/H
    tx=(np.array([x2t(a,z) for a in lons])-x0)*256; ty=(np.array([y2t(a,z) for a in lats])-y0)*256
    xx,yy=np.meshgrid(tx,ty); xi=np.clip(xx.astype(int),0,M.shape[1]-2); yi=np.clip(yy.astype(int),0,M.shape[0]-2); fx=(xx-xi)[...,None]; fy=(yy-yi)[...,None]
    return (M[yi,xi]*(1-fx)+M[yi,xi+1]*fx)*(1-fy)+(M[yi+1,xi]*(1-fx)+M[yi+1,xi+1]*fx)*fy
def layer(name,box,z,hs,cs):
    w,s,e,n=box
    Mh=mosaic('h',w,s,e,n,z); Hr=sample(*Mh,w,s,e,n,hs,hs); elev=Hr[...,0]*256+Hr[...,1]+Hr[...,2]/256-32768
    hv=np.clip(elev+1000,0,65535).astype('uint16')
    Image.fromarray(np.dstack([hv>>8,hv&255,np.zeros_like(hv)]).astype('uint8')).save(f'{out}/{sid}-{name}-h.png',optimize=True)
    if snow:
        C=np.ones((cs,cs,3))*np.array([236,241,247])
        el2=np.asarray(Image.fromarray(elev).resize((cs,cs),Image.BICUBIC))
        sea=el2<=1
        nz=np.random.RandomState(4).rand(cs,cs,1)
        C=np.where(sea[...,None],np.array([205,216,226])+nz*10,C+nz*6)
        col=C
    else:
        Mc=mosaic('c',w,s,e,n,z+1); col=sample(*Mc,w,s,e,n,cs,cs)
    Image.fromarray(np.clip(col,0,255).astype('uint8')).save(f'{out}/{sid}-{name}.webp',quality=72,method=6)
    return {'h':f'{sid}-{name}-h.png','c':f'{sid}-{name}.webp','w':w,'s':s,'e':e,'n':n,'hOff':-1000}, elev
cx,cy=(w+e)/2,(s+n)/2; dx,dy=(e-w)*2.6,(n-s)*2.6
outerB=(cx-dx,cy-dy,cx+dx,cy+dy)
meta={}
meta['outer'],elo=layer('outer',outerB,zo,384,768)
meta['inner'],_=layer('inner',(w,s,e,n),zi,512,1024)
water=(np.asarray(Image.fromarray(elo).resize((768,768),Image.BICUBIC))<=0.5)*255
Image.fromarray(water.astype('uint8')).save(f'{out}/{sid}-water.png',optimize=True); meta['water']=f'{sid}-water.png'
json.dump(meta,open(f'{out}/{sid}.json','w'))
print(sid,{f:os.path.getsize(f'{out}/{f}')//1024 for f in os.listdir(out) if f.startswith(sid)})
