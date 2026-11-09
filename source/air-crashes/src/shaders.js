export const COMMON = /* glsl */`
const float R_KM = 6371.0;
const vec3 BR=vec3(5.8e-3,13.5e-3,33.1e-3); const float BM=4e-3; const vec3 BO=vec3(.65e-3,1.881e-3,.085e-3);
float hash12(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y); }
float fbm2(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.3,9.1); a*=.5; } return s; }
float fbmL(vec2 p,float fw){ float a=.5,s=0.; for(int i=0;i<5;i++){ float k=1.-smoothstep(.2,.45,fw); s+=a*mix(.5,vnoise(p),k); p=p*2.03+vec2(17.3,9.1); fw*=2.03; a*=.5; } return s; }
vec3 hash32(vec2 p){ vec3 q=fract(vec3(p.xyx)*vec3(.1031,.103,.0973)); q+=dot(q,q.yxz+33.33); return fract((q.xxy+q.yzz)*q.zyx); }
vec3 gAmb(float ns,float mi){ return mix(vec3(.16,.19,.3),vec3(.12,.23,.45),smoothstep(-.04,.25,ns))*(pow(smoothstep(-.2,.45,ns),1.1)*(1.+1.2*smoothstep(-.14,-.04,ns)*(1.-smoothstep(.02,.09,ns)))+mi*.012)+vec3(.0016,.0022,.004); }
float pn(sampler2D t,vec2 q,vec2 gx,vec2 gy,float k){ return textureGrad(t,q*k,gx*k,gy*k).g-.5; }
float landD(sampler2D t,vec2 lp,vec2 gx,vec2 gy,float sand){
  vec2 q=lp*.25, ax=gx*.25, ay=gy*.25; mat2 r1=mat2(.8,.6,-.6,.8), r2=mat2(.6,-.8,.8,.6);
  float s=pn(t,q,ax,ay,1.)*.55+pn(t,r1*q+.31,r1*ax,r1*ay,5.3)*.4+pn(t,r2*q+.67,r2*ax,r2*ay,29.)*.3+pn(t,q+.13,ax,ay,157.)*.22;
  float fk=max(length(gx),length(gy));
  if(fk<.03){ float v=1.-smoothstep(.006,.03,fk); vec2 qf=fract(q); s+=(pn(t,fract(r1*q),r1*ax,r1*ay,1100.)*.18+pn(t,fract(r2*q),r2*ax,r2*ay,3900.)*.14-sand*.3*smoothstep(.62,.85,textureGrad(t,qf*2300.,ax*2300.,ay*2300.).r))*v; }
  if(sand>.01){ float v=1.-smoothstep(.12,.3,fk*14.); if(v>0.){ vec2 r=mat2(.93,.37,-.37,.93)*lp; s+=sand*v*.05*sin(r.x*88.+pn(t,q,ax,ay,28.)*18.); } }
  return clamp(1.+s*1.05,.3,1.8);
}
float fpl(float x,float w,float N){ w=max(w,1e-4); float a=x+.5*w,b=x-.5*w; return clamp((floor(a)+min(fract(a)*N,1.)-floor(b)-min(fract(b)*N,1.))/(N*w),0.,1.); }
float gUe=1.;
mat2 urbR(sampler2D t,vec2 w,vec2 wx,vec2 wy){ float v=(pn(t,w+.11,wx,wy,2.5)+.5)*7., e=fract(v), a=floor(v)*.45; gUe=smoothstep(0.,.1,e)*smoothstep(1.,.9,e); return mat2(cos(a),sin(a),-sin(a),cos(a)); }
vec3 urbA(vec3 alb,sampler2D t,float nl,vec2 lp,vec2 gx,vec2 gy){
  float fk=max(length(gx),length(gy)), u=smoothstep(.12,.55,nl)*(1.-smoothstep(.075,.3,fk)); if(u<=0.) return alb;
  vec2 w=lp*.0625, wx=gx*.0625, wy=gy*.0625; mat2 R=urbR(t,w,wx,wy);
  vec2 g=R*lp/.15, f=(abs(R*gx)+abs(R*gy))/.15, ci=floor(g); float fp=max(f.x,f.y);
  vec3 h=hash32(mod(ci,512.)), h3=hash32(mod(floor(g*9.),4608.)+.25);
  float l=dot(alb,vec3(.3,.5,.2)), bv=mix(1.,.95+.1*h.x,1.-smoothstep(.1,.3,fp)), sv=mix(1.,.86+.28*h3.x,1.-smoothstep(.03,.08,fp));
  float pk=step(.9,h.z)*smoothstep(.2,.6,pn(t,w+.17,wx,wy,19.)+.3);
  vec3 c=mix(mix(vec3(l),alb,.6)*bv*sv,alb*vec3(.85,1.05,.8),pk);
  float ix=fpl(g.x,f.x,8.), iy=fpl(g.y,f.y,8.), Ax=fpl(g.x/7.,f.x/7.,40.), Ay=fpl(g.y/7.,f.y/7.,40.);
  c=mix(c,vec3(l*.5),(ix+iy-ix*iy)*.6*(1.-pk)*gUe);
  c=mix(c,vec3(l*.62),(Ax+Ay-Ax*Ay)*.5*gUe);
  return mix(alb,c,u);
}
vec4 spkO(vec2 q,float c){
  vec2 p=q/c, b=floor(p-.5); vec4 a=vec4(0.);
  for(int j=0;j<2;j++)for(int i=0;i<2;i++){ vec2 cl=b+vec2(i,j); vec3 h=hash32(mod(cl,4096.)+c*.37); vec2 d=cl+.2+.6*h.xy-p; float e=exp(-dot(d,d)*7.)*(.35+1.3*h.z*h.z)*2.8;
    a+=step(.82,fract(h.z*7.31))>.5?vec4(0.,0.,0.,e):vec4(e,0.,0.,0.); }
  return a;
}
vec2 spk(vec2 q,float fk){ float s=log2(fk*2.6), e=floor(s), bl=s-e; vec4 a=mix(spkO(q,exp2(e)),spkO(q,exp2(e+1.)),bl); return vec2(a.x,a.w); }
vec3 cityR(sampler2D t,float nl,vec2 lp,vec2 gx,vec2 gy,float mapK){
  vec2 w=lp*.0625, wx=gx*.0625, wy=gy*.0625;
  float fk=max(length(gx),length(gy)), dt=abs(gx.x*gy.y-gx.y*gy.x)+1e-12, fs=sqrt(dt), vis=1.-smoothstep(.2,.8,fk);
  float u=smoothstep(.05,.85,nl+(pn(t,w,wx,wy,1.)*.26+pn(t,w+.5,wx,wy,3.3)*.22)*vis); if(u<=0.) return vec3(0.);
  float M=.36*u*u*(1.-.3*mapK);
  vec3 sod=vec3(1.,.5,.17), wht=vec3(1.,.8,.58);
  M*=.55+.9*smoothstep(-.35,.35,pn(t,w+.9,wx,wy,2.3));
  float th=.3-.85*u, phi=clamp(.5-th*1.5,.06,1.), vB=(1.-smoothstep(1.2,3.,fk))*(1.-mapK*.6);
  float bn=pn(t,w+.23,wx,wy,4.)*.7+pn(t,w+.41,wx,wy,15.)*.45*(1.-smoothstep(.12,.4,fk))+pn(t,w+.59,wx,wy,47.)*.3*(1.-smoothstep(.04,.13,fk)), bw_=.07+min(fk,1.5)*.1;
  float B=mix(phi,smoothstep(th-bw_,th+bw_,bn),vB)/phi;
  float sw=smoothstep(.022,.1,fk)*(1.-.65*mapK); vec3 SP=vec3(0.);
  if(sw>0.){ vec2 sp=spk(mod(lp,512.),fk); SP=sw*(sp.x*mix(sod,wht,.1+.35*u)+sp.y*vec3(1.,.93,.85)); }
  if(vis<=0.) return M*mix(.45,1.,B)*(mix(vec3(1.,.5,.18),vec3(1.,.72,.45),u*u*.6)*(1.-.6*sw)+SP*.6);
  mat2 R=urbR(t,w,wx,wy);
  float cs=.15*mix(1.25,.85,smoothstep(.25,.9,u));
  vec2 g=R*lp/cs+vec2(pn(t,w+.13,wx,wy,7.),pn(t,w+.57,wx,wy,7.))*1.6+vec2(pn(t,w+.37,wx,wy,23.),pn(t,w+.71,wx,wy,23.))*.4, f=(abs(R*gx)+abs(R*gy))/cs;
  float ix=fpl(g.x,f.x,12.), iy=fpl(g.y,f.y,12.), sv=.25+1.5*smoothstep(-.28,.3,pn(t,fract(w*4.),wx*4.,wy*4.,11.)), st=(ix+iy-ix*iy)*4.7*sv*gUe;
  float Ax=fpl(g.x/7.,f.x/7.,30.), Ay=fpl(g.y/7.,f.y/7.,30.), av=smoothstep(-.1,.2,pn(t,w+.33,wx,wy,3.)), ar=(Ax*smoothstep(-.15,.15,pn(t,w+.44,wx,wy,5.))+Ay*smoothstep(-.15,.15,pn(t,w+.66,wx,wy,5.)))*15.*av*gUe;
  float hw=1.-abs(2.*pn(t,w+.71,wx,wy,.9)), hf=fwidth(hw)+1e-5, hy=clamp(1.-(1.-hw)/max(.004,hf),0.,1.)*min(1.,.004/hf)*smoothstep(0.,.22,pn(t,w+.81,wx,wy,1.7));
  vec3 dc=mix(sod,wht,smoothstep(.1,.28,pn(t,w+.77,wx,wy,5.))*.85);
  float lk=smoothstep(1.7,3.2,.04/fs)*(1.-mapK), gw=1.-sw*.85;
  float bl=.3+.7*smoothstep(.35,.75,textureGrad(t,fract(w*8.)*13.,wx*104.,wy*104.).r);
  vec3 L=M*B*((dc*((.3+.25*u)*bl*(1.-.6*lk)+.45*st*(1.-.75*lk)*gw)+sod*.22*ar*(1.-.8*lk))*(1.-.6*sw)+SP*.6+sod*hy*4.);
  if(lk>0.){
    float dS=gx.x*gy.y-gx.y*gy.x; dS=dS<0.?min(dS,-1e-12):max(dS,1e-12); mat2 Ji=mat2(gy.y,-gx.y,-gy.x,gx.x)/dS, Rt=transpose(R);
    const float q=.27;
    vec2 c1=vec2(floor(g.x+.445),floor(g.y/q+.5)), c2=vec2(floor(g.x/q+.5),floor(g.y+.445));
    vec2 s1=Ji*(Rt*vec2(g.x-c1.x-.055,g.y-c1.y*q))*cs, s2=Ji*(Rt*vec2(g.x-c2.x*q,g.y-c2.y-.055))*cs;
    vec3 h1=hash32(mod(c1,512.)+vec2(R[0][1]*37.,3.)), h2=hash32(mod(c2,512.)+vec2(7.,R[0][1]*53.));
    float pk=min(M*B*.125*q*cs*cs/(dt*2.1),7.)*lk;
    L+=pk*(step(h1.x,.86)*(.55+.9*h1.y)*exp(-dot(s1,s1)*1.5)*mix(dc,wht*vec3(.95,1.,1.15),step(h1.z,.2))
          +step(h2.x,.86)*(.55+.9*h2.y)*exp(-dot(s2,s2)*1.5)*mix(dc,wht*vec3(.95,1.,1.15),step(h2.z,.2)));
    vec2 hc=floor(g*4.); vec3 hh=hash32(mod(hc,2048.)+vec2(5.,9.)); vec2 s3=Ji*(Rt*(g-(hc+.2+.6*hh.xy)/4.))*cs;
    L+=min(M*B*.5*cs*cs/(16.*dt*2.1),4.)*lk*step(hh.z,.25+.45*u)*(.35+.9*fract(hh.z*13.7))*exp(-dot(s3,s3)*2.)*mix(wht,dc,step(.55,fract(hh.x*7.3)));
  }
  return L;
}
vec3 cityC(vec3 L,float ex){ return (1.-exp(-L))*.75/(.45+.55*ex); }
float bspl(sampler2D t,vec2 uv,vec2 dx,vec2 dy){
  vec2 ts=vec2(textureSize(t,0)), p=uv*ts-.5, f=fract(p), i=p-f, f2=f*f, f3=f2*f;
  vec2 w0=(1.-3.*f+3.*f2-f3)/6., w1=(4.-6.*f2+3.*f3)/6., w2=(1.+3.*f+3.*f2-3.*f3)/6., w3=f3/6.;
  vec2 g0=w0+w1, g1=w2+w3, h0=(i-.5+w1/g0)/ts, h1=(i+1.5+w3/g1)/ts;
  return g0.y*(g0.x*textureGrad(t,h0,dx,dy).r+g1.x*textureGrad(t,vec2(h1.x,h0.y),dx,dy).r)+g1.y*(g0.x*textureGrad(t,vec2(h0.x,h1.y),dx,dy).r+g1.x*textureGrad(t,h1,dx,dy).r);
}
vec3 bsplC(sampler2D t,vec2 uv,vec2 dx,vec2 dy){
  vec2 ts=vec2(textureSize(t,0)), p=uv*ts-.5, f=fract(p), i=p-f, f2=f*f, f3=f2*f;
  vec2 w0=(1.-3.*f+3.*f2-f3)/6., w1=(4.-6.*f2+3.*f3)/6., w2=(1.+3.*f+3.*f2-3.*f3)/6., w3=f3/6.;
  vec2 g0=w0+w1, g1=w2+w3, h0=(i-.5+w1/g0)/ts, h1=(i+1.5+w3/g1)/ts;
  return g0.y*(g0.x*textureGrad(t,h0,dx,dy).rgb+g1.x*textureGrad(t,vec2(h1.x,h0.y),dx,dy).rgb)+g1.y*(g0.x*textureGrad(t,vec2(h0.x,h1.y),dx,dy).rgb+g1.x*textureGrad(t,h1,dx,dy).rgb);
}
float bspL(sampler2D t,vec2 uv,int L){
  vec2 ts=vec2(textureSize(t,L)), p=uv*ts-.5, f=fract(p), i=p-f, f2=f*f, f3=f2*f; float l=float(L);
  vec2 w0=(1.-3.*f+3.*f2-f3)/6., w1=(4.-6.*f2+3.*f3)/6., w2=(1.+3.*f+3.*f2-3.*f3)/6., w3=f3/6.;
  vec2 g0=w0+w1, g1=w2+w3, h0=(i-.5+w1/g0)/ts, h1=(i+1.5+w3/g1)/ts;
  return g0.y*(g0.x*textureLod(t,h0,l).r+g1.x*textureLod(t,vec2(h1.x,h0.y),l).r)+g1.y*(g0.x*textureLod(t,vec2(h0.x,h1.y),l).r+g1.x*textureLod(t,h1,l).r);
}
float gMc;
float maskW(sampler2D t,vec2 uv,vec2 dx,vec2 dy,int L,float isl){
  float ts=float(textureSize(t,0).x), l0=log2(max(max(length(dx),length(dy))*ts,1e-3)), fl=float(L), lv=max(l0,0.)+fl, w=textureLod(t,uv,lv).r; gMc=w;
  if(isl>0.){ if(w>.0005&&w<.9995&&l0<.6){ float li=floor(lv), lf=lv-li; w=bspL(t,uv,int(li)); if(lf>.02) w=mix(w,bspL(t,uv,int(li)+1),lf); gMc=bspL(t,uv,int(li)+2); } }
  else if(l0<0.&&w>.002&&w<.998){ w=mix(bspL(t,uv,L),w,smoothstep(-1.,0.,l0)); gMc=w; }
  float lod=max(l0,0.)+2.5, c=textureLod(t,uv,lod).r, k1=smoothstep(.06,.22,c), k2=smoothstep(.06+.06*isl,.22+.1*isl,1.-c);
  gMc=1.-(1.-gMc*k1)*k2;
  return 1.-(1.-w*k1)*k2;
}
vec3 lAmb(float ns,float mi,vec3 a){ float b=smoothstep(-.13,-.02,ns)*(1.-smoothstep(.03,.16,ns)); return max(gAmb(ns,mi)*(1.+1.7*b),a*.85*smoothstep(-.15,-.03,ns)*(1.-smoothstep(.1,.3,ns))); }
vec3 nightTone(vec3 c,float ns,float sand){ float k=(1.-smoothstep(-.16,-.05,ns))*mix(.75,.5,sand); return mix(c,vec3(dot(c,vec3(.3,.6,.1)))*mix(vec3(.82,.92,1.12),vec3(1.1,.98,.82),sand),k); }
vec3 sunTr(float h,float mu){ return textureLod(tTrans,vec2(sqrt(clamp((mu+.35)/1.35,0.,1.))*.9921875+.00390625,sqrt(clamp(h/100.,0.,1.))*.96875+.015625),0.).rgb; }
`;

export const EARTH_VERT = /* glsl */`
uniform float uDisc,uRange; uniform vec3 uNadir, uE0, uN0; uniform float uCamAlt;
varying vec3 vDir; varying vec3 vRel;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){
  vec3 rel;
  if(uDisc>.5){
    float r=position.x*uRange, a=position.y;
    vec2 xy=r*vec2(cos(a),sin(a));
    float Rm=6371000.;
    float d=length(xy)/Rm;
    vec2 tang=xy/max(length(xy),1e-3);
    float sh=sin(d*.5), s=sin(d)*Rm, drop=2.*sh*sh*Rm;
    rel=uE0*(tang.x*s)+uN0*(tang.y*s)-uNadir*(drop+uCamAlt);
    vDir=normalize(uNadir*cos(d)+(uE0*tang.x+uN0*tang.y)*sin(d));
  } else {
    rel=(modelMatrix*vec4(position,1.)).xyz;
    vDir=normalize(position);
  }
  vRel=rel;
  vec4 mv=viewMatrix*vec4(rel,1.);
  gl_Position=projectionMatrix*mv;
  #include <logdepthbuf_vertex>
}`;

export const EARTH_FRAG = /* glsl */`
uniform sampler2D tDay,tNight,tRelief,tWater,tClouds,tWave,tTrans,tPuff; uniform vec3 uSkyZ,uSkyH,uAmb;
uniform vec3 uSun,uMoon,uNadir,uE0,uN0,uAE,uAN; uniform vec2 uOceanOff,uLp0;
uniform float uMoonI,uCamAlt,uTime,uSea,uGlobalClouds,uGlobalCov,uNightLights,uAlbedoBoost,uMapK,uExpo,uUrban; uniform vec4 uSiteBox; uniform sampler2D tSite; uniform float uIce;
varying vec3 vDir; varying vec3 vRel;
#include <common>
#include <logdepthbuf_pars_fragment>
${COMMON}
vec2 gU,gX,gY;
vec4 smp(sampler2D t,vec2 o){ return textureGrad(t,gU+o,gX,gY); }
vec4 smpW(sampler2D t,float gK){
  vec4 c=smp(t,vec2(0.)); if(gK<1.1) return c;
  float w=smoothstep(1.1,1.5,gK); vec2 o=vec2(gK*.36/float(textureSize(t,0).x),0.);
  return (c+w*(smp(t,o)+smp(t,-o)))/(1.+2.*w);
}
void main(){
  #include <logdepthbuf_fragment>
  vec3 n=normalize(vDir);
  float lat=asin(clamp(n.z,-1.,1.)), lon=atan(n.y,n.x);
  vec2 uv=vec2(lon/(2.*PI)+.5, lat/PI+.5), uvb=vec2(fract(uv.x+.5)-.5,uv.y);
  vec2 dxa=dFdx(uv),dya=dFdy(uv),dxb=dFdx(uvb),dyb=dFdy(uvb); bool ub=abs(dxa.x)+abs(dya.x)>abs(dxb.x)+abs(dyb.x);
  gU=ub?uvb:uv; gX=ub?dxb:dxa; gY=ub?dyb:dya;
  float gK=min(max(1.,.85/max(cos(lat),.05)),8.);
  float tpd=1./(min(float(textureSize(tDay,0).x)*max(abs(gX.x),abs(gY.x)),float(textureSize(tDay,0).y)*max(abs(gX.y),abs(gY.y)))+1e-7);
  vec3 alb=smpW(tDay,gK).rgb; if(tpd>1.3) alb=mix(alb,bsplC(tDay,gU,gX,gY),smoothstep(1.3,2.5,tpd));
  float fp=length(fwidth(vRel));
  vec2 lp=uLp0+vec2(dot(vRel,uAE),dot(vRel,uAN))*.001, lx=dFdx(lp), ly=dFdy(lp); float fk=max(length(lx),length(ly));
  vec2 su=vec2((lon*57.29578-uSiteBox.x)/(uSiteBox.z-uSiteBox.x),(lat*57.29578-uSiteBox.y)/(uSiteBox.w-uSiteBox.y)), sdx=dFdx(su), sdy=dFdy(su);
  float bw=uSiteBox.x<900.?smoothstep(0.,.025,min(min(su.x,1.-su.x),min(su.y,1.-su.y))):0.;
  float lum=dot(alb,vec3(.3,.5,.2));
  float wg=0., ws=0., mc=.5; if(bw<1.){ wg=maskW(tWater,gU,gX,gY,0,uMapK); mc=gMc; } if(bw>0.){ ws=maskW(tSite,su,sdx,sdy,2,uMapK); mc=mix(mc,gMc,bw); }
  float tan_=smoothstep(.15,.25,lum)*smoothstep(.01,.05,alb.r-alb.b)*(1.-uIce);
  vec2 ll=vec2(lat,lon)*57.29578;
  float li=step(40.5,ll.x)*step(ll.x,41.25)*step(-74.1,ll.y)*step(ll.y,-71.75)*smoothstep(.007,.013,alb.r+alb.g+alb.b);
  float mo=1.-uMapK; wg*=(1.-tan_*mo)*(1.-li*mo);
  float wv=mix(wg,ws,bw); if(uMapK>0.) wv=clamp(wv+(smoothstep(.55,.68,mc)*(1.-wv)-smoothstep(.55,.68,1.-mc)*wv)*uMapK,0.,1.);
  float tpx=1./((bw>.5?float(textureSize(tSite,0).x)*max(length(sdx),length(sdy)):float(textureSize(tWater,0).x)*max(length(gX),length(gY)))+1e-6);
  float nl=smp(tNight,vec2(0.)).r, cz=smoothstep(.0,.3,wv);
  float shal=smoothstep(.05,.15,alb.b-max(alb.r,alb.g*.9))*smoothstep(.12,.26,lum)*cz*(1.-bw);
  float wcol=smoothstep(.012,.045,alb.b-alb.r)*(1.-smoothstep(.07,.15,lum))*cz*(1.-bw);
  float lk=bw>.5?0.:smoothstep(.14,.32,nl)*(1.-max(wcol,shal))*mo; wv*=1.-lk;
  float fwv=max(fwidth(wv),1e-5), wk=fwv*mix(.8,.5,uMapK)+.012*mo, wm=smoothstep(.5-wk,.5+wk,wv);
  if(uMapK>.001) alb=mix(alb,vec3(.15,.14,.1),smoothstep(.01,.04,alb.b-alb.r)*(1.-smoothstep(.07,.15,lum))*(1.-wm)*uMapK);
  float sand=smoothstep(.1,.25,alb.r-alb.b)*smoothstep(.25,.45,lum);
  float near=smoothstep(260000.,6000.,uCamAlt);
  float water=max(wm,max(wcol,shal)*smoothstep(.2,.5,wv)*mo)*(1.-uIce), wq=water;
  float coast=(1.-smoothstep(.5,1.5,abs(wv-.5)/fwv))*(1.-uIce)*(1.-smoothstep(1.5,3.,tpx))*(1.-4.*bw*(1.-bw))*(1.-smoothstep(.56,.7,mc))*smoothstep(.3,.44,mc);
  float dist=length(vRel);
  vec3 V=-vRel/max(dist,1.);
  vec3 sun=uSun, moon=uMoon;
  float ns=dot(n,sun), nm=max(dot(n,moon),0.);
  vec3 sunCol=sunTr(0.,ns)*vec3(1.06,1.15,1.3);
  vec3 moonL=vec3(.75,.83,1.)*uMoonI*.03;
  if(fk<2.5&&wq<.99){ alb*=mix(1.,landD(tPuff,lp,lx,ly,sand),(1.-smoothstep(1.,2.5,fk))*(1.-wq)*(1.-uMapK)); if(uUrban>0.) alb=mix(alb,urbA(alb,tPuff,nl,lp,lx,ly),(1.-uMapK)*uUrban); }
  float e=.012; vec2 du=vec2(e/4.,0.),dv=vec2(0.,e/2.);
  float hx=smp(tRelief,du).r-smp(tRelief,-du).r;
  float hy=smp(tRelief,dv).r-smp(tRelief,-dv).r;
  vec3 E=normalize(cross(vec3(0.,0.,1.),n)), N=normalize(cross(n,E));
  vec3 ln=normalize(n-(E*hx+N*hy)*2.4*(1.-wq)/gK);
  float lit=max(dot(ln,sun),0.)*smoothstep(-.05,.1,ns);
  vec3 amb=gAmb(ns,uMoonI);
  vec3 landC=nightTone(alb*1.05*uAlbedoBoost*(sunCol*lit*1.15+mix(amb,lAmb(ns,uMoonI,uAmb),near)+moonL*nm),ns,max(sand,smoothstep(.15,.5,nl)));
  vec3 wn=n; float foamA=0., foamH=.3, r2=0., mott=1.;
  if(wq>.02&&near>.002){
    vec2 xy=vec2(dot(vRel,uE0),dot(vRel,uN0))+uOceanOff; float T=uTime;
    float amp=mix(.35,1.5,clamp(uSea,0.,1.))*mix(1.,.8,shal);
    float f1=clamp(1.-fp*6./85.,0.,1.), f2=clamp(1.-fp*6./410.,0.,1.), f3=clamp(1.-fp*6./2600.,0.,1.), f4=clamp(1.-fp*4./9000.,0.,1.);
    float gz=smoothstep(.015,.2,dot(n,V));
    f1*=gz; f2*=mix(.3,1.,gz);
    vec4 a1=texture(tWave,xy/85.+vec2(.011,.006)*T), a2=texture(tWave,xy.yx/133.-vec2(.008,.012)*T);
    vec4 b1=texture(tWave,xy/410.+vec2(.0031,.0017)*T), b2=texture(tWave,xy.yx/630.-vec2(.0021,.0027)*T);
    vec4 c1=texture(tWave,xy/2600.+vec2(.0005,.0003)*T);
    vec2 xr=mat2(.8,-.6,.6,.8)*xy;
    vec4 d1=texture(tWave,xy/9000.), d2=texture(tWave,xr/14300.+.37);
    mott=.82+.36*(d1.a*.6+d2.a*.4);
    vec2 g=((a1.xy+a2.yx-1.)*.42*f1+(b1.xy+b2.yx-1.)*.5*f2+(c1.xy-.5)*.8*f3+(d1.xy+d2.yx-1.)*.32*f4)*amp;
    wn=normalize(n-(uE0*g.x+uN0*g.y)*near*.62*smoothstep(.02,.5,wq));
    r2=amp*(.05*(1.-f1)+.06*(1.-f2)+.03*(1.-f3))*near;
    foamH=(a1.a*f1+b1.a*f2+c1.a+.3*(2.-f1-f2))/3.;
    float wc=smoothstep(.5,1.,uSea);
    float fs=a1.b*.4*f1+b1.b*.75*f2+c1.b*.5+(d1.a+d2.a-1.)*.3;
    float ff=clamp(1.-fp/5.,0.,1.)*(1.-smoothstep(1200.,4000.,uCamAlt))*gz;
    foamA=smoothstep(.78-wc*.2,1.15,fs)*(.15+wc*.75)*near*ff*water*(1.-shal*.7);
  }
  float cosV=max(dot(wn,V),.001);
  float rough=sqrt(mix(.002,.03,clamp(uSea,0.,1.))*near+r2+(1.-near)*.02+pow(1.-max(dot(n,V),0.),6.)*.05*near);
  float fres=.02+(max(1.-rough*1.6,.25)-.02)*pow(1.-cosV,5.)*smoothstep(0.,.08,dot(n,V)+.02);
  vec3 Rv=reflect(-V,wn); float rz=max(dot(Rv,n),0.);
  vec3 skyRefl=min(mix(uSkyH,uSkyZ,pow(rz,.6)),uSkyH*.92+uSkyZ*.08)*clamp(amb.b/max(gAmb(dot(uNadir,sun),uMoonI).b,1e-4),0.,1.3);
  float slopeUp=clamp(foamH*1.4,0.,1.);
  vec3 deep=mix(mix(vec3(.004,.022,.045),vec3(.01,.07,.085),slopeUp*.6+.1),alb*vec3(.55,.68,.74),shal);
  vec3 body=deep*mott*(sunCol*max(ns,0.)*1.1+amb*1.6+moonL*nm);
  float hs=smoothstep(.55,.95,ns);
  vec3 ocean=mix(alb,vec3(dot(alb,vec3(.3,.5,.2))),hs*.35)*vec3(.8,.95,1.1)*.9*(sunCol*max(ns,0.)*.9+amb*1.1+moonL*nm);
  vec3 oceanC=mix(ocean,body,near)+skyRefl*fres*mix(.6,1.,near);
  vec3 H=normalize(sun+V);
  float a2=rough*rough; a2*=a2; a2=max(a2,near*.0012/(1.+dist/6000.)+(1.-near)*.004);
  float dh=max(dot(wn,H),0.);
  float D=a2/(PI*pow(dh*dh*(a2-1.)+1.,2.));
  oceanC+=sunCol*min(D*.05*(.25+fres),6.)*smoothstep(-.02,.06,ns)*step(0.,dot(n,sun))*(1.-uMapK);
  float spb=pow(max(dot(n,H),0.),2600.);
  oceanC+=sunCol*spb*(1.-near)*.035*smoothstep(-.02,.08,ns)*(1.-smoothstep(1.5e6,6e6,uCamAlt)*.7)*(1.-uMapK);
  vec3 Hm=normalize(moon+V); float dm=max(dot(wn,Hm),0.); float am=max(a2,.0015);
  oceanC+=moonL*min(am/(PI*pow(dm*dm*(am-1.)+1.,2.))*.05*(.25+fres),6.)*step(0.,dot(n,moon))*4.*(1.-uMapK);
  if(foamA>.005){ vec3 fc=vec3(.78,.8,.82)*(sunCol*max(ns,0.)*1.05+amb*1.3+moonL*nm); oceanC=mix(oceanC,fc,clamp(foamA,0.,.9)); }
  vec3 col=mix(landC,oceanC,wq);
  float mk=uMapK*1.5/max(uExpo,1.);
  if(uMapK>.001) col=max(col,mix(vec3(.010,.016,.028),alb*.14+vec3(.012,.012,.01),1.-wq)*mk);
  float nk=(1.-water)*smoothstep(-.005,-.1,ns)*uNightLights;
  if(nk>.001) col+=cityC(cityR(tPuff,nl,lp,lx,ly,uMapK)*nk,uExpo);
  if(uGlobalClouds>.002){
    float gv=clamp(uGlobalCov,0.,1.), gc=min(uGlobalClouds/max(gv,.05),1.)*(1.-.15*uMapK), c0=.12+.42*(1.-gv);
    vec2 co=vec2(uTime*2e-6,0.);
    float pol=smoothstep(1.12,1.25,abs(lat));
    float tpc=1./(float(textureSize(tClouds,0).x)*max(abs(gX.x),abs(gY.x))+1e-7);
    float c=smp(tClouds,co).r; if(tpc>1.2) c=mix(c,bspl(tClouds,gU+co,gX,gY),smoothstep(1.2,2.,tpc));
    float pc=fbm2(n.xy*38.+n.z*7.)*fbm2(n.yx*11.-3.)*1.9;
    float det=fbmL(lp*.09,fk*.09);
    c=mix(c,pc,pol);
    c=smoothstep(c0,.92,c*(.75+.5*mix(det,.5,pol)));
    vec2 so=vec2(dot(sun,E),dot(sun,N)*2.)*.0012;
    float shadow=mix(smoothstep(c0,.92,smp(tClouds,co+so).r),c,pol);
    col*=1.-.55*shadow*gc*smoothstep(-.02,.12,ns);
    vec3 cc=vec3(.92,.94,.97)*(sunCol*max(ns+.04,0.)*1.05+amb*2.4+moonL*nm*1.8);
    col=mix(col,max(cc,col*1.04),c*gc*.95);
  }
  if(uMapK>.001){ float lm=dot(col,vec3(.3,.6,.1))*uExpo/1.5; col+=vec3(.13,.16,.2)*coast*mk*(1.-smoothstep(.03,.2,lm)); }
  gl_FragColor=vec4(col,1.);
}`;


export const FS_VERT = /* glsl */`
out vec2 vUv;
void main(){ vUv=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }`;

export const ATMOS_FRAG = /* glsl */`
precision highp sampler3D;
in vec2 vUv; layout(location=0) out vec4 outC; layout(location=1) out vec4 outD;
uniform sampler2D tDepth,tBlue,tTrans; uniform sampler3D tNoise;
uniform vec4 uProjK; uniform mat3 uCamRot; uniform vec3 uCam,uSun,uMoon,uCenter,uCE,uCN,uFlashPos,uNoiseOff,uAmb,uGlowPos,uGlowCol;
uniform float uLogFar,uMoonI,uMoonS,uHiFade,uGAlb,uTime,uFrame,uCloudRadius,uFogVis,uFogTop,uFlash,uMapK,uExpo;
uniform vec2 uAS2; uniform int uLayerN,uSteps; uniform vec4 uLayers[4]; uniform vec4 uLayerB[4];
const float Ra=6451.0; const float SIG=22.;
${COMMON}
float oz(float h){ return max(0.,1.-abs(h-25.)/15.); }
vec2 sph(vec3 o,vec3 d,float r){ float b=dot(o,d),c=dot(o,o)-r*r,h=b*b-c; if(h<0.)return vec2(1e9,-1e9); h=sqrt(h); return vec2(-b-h,-b+h); }
float hg(float mu,float g){ float g2=g*g; return .0796*(1.-g2)/pow(max(1.+g2-2.*g*mu,1e-4),1.5); }
float msA(float mu,float h){ float m=mu+sqrt(2.*h/R_KM); return m>0.?mix(.2,1.,smoothstep(0.,.6,m)):.2*exp(80.*m); }
void atm(vec3 o,vec3 d,float t0,float t1,float pw,inout vec3 S,out vec3 Tv){
  const int N=10; float L=t1-t0, tp=0.; vec3 od=vec3(0.), ss=vec3(0.), sm=vec3(0.), ms=vec3(0.), mf=vec3(0.);
  float mu=dot(d,uSun), mv=dot(d,uMoon);
  float pr=.0597*(1.+mu*mu), pm=hg(mu,.76), prm=.0597*(1.+mv*mv), pmm=hg(mv,.76);
  for(int i=0;i<N;i++){
    float tn=L*pow(float(i+1)/float(N),pw), ds=tn-tp;
    vec3 p=o+d*(t0+(tp+tn)*.5); tp=tn; float r=length(p), h=max(r-R_KM,0.); float rr=exp(-h/8.),rm=exp(-h/1.2);
    vec3 ext=BR*rr+BM*1.1*rm+BO*oz(h);
    vec3 seg=exp(-od)*(1.-exp(-ext*ds))/max(ext,vec3(1e-7));
    od+=ext*ds;
    float ms_=dot(p,uSun)/r; vec3 ts=sunTr(h,ms_);
    ss+=(rr*BR*pr+rm*BM*pm)*seg*ts;
    if(uMoonS>.001) sm+=(rr*BR*prm+rm*BM*pmm)*seg*dot(sunTr(h,dot(p,uMoon)/r),vec3(.25,.6,.15));
    vec3 sc=(rr*BR+rm*BM)*seg; ms+=sc*msA(ms_,h); mf+=sc;
  }
  vec3 nt=sm*uMoonS*.42+mf*(.008+uMoonS*.02); float ln=dot(nt,vec3(.05,.55,.4));
  S+=ss*14.+ms*vec3(.42,.5,.62)+mix(nt,ln*vec3(.5,.75,1.35),.7)*1.6/(1.+ln/(.002+uMoonS*.009));
  Tv=exp(-od);
}
vec3 pglow(vec3 o,vec3 d,float tEnd,vec3 P,float k){
  vec3 q=P-o; float tc=dot(q,d); float D=sqrt(max(dot(q,q)-tc*tc,.04));
  return vec3((atan((min(tEnd,4e3)-tc)/D)-atan(-tc/D))/D*k);
}
vec4 gCov=vec4(.5), gTop=vec4(1.); float gNear=0., gAbv=0., gGz=1., gH0=0., gPx=0., gFr=.5, gFl=1.;
float nLod(float f){ return log2(max(gPx*f*64.,1.)); }
float cloudD(vec3 p,float lod,float ek){
  float h=length(p)-R_KM; vec3 q=p-uCenter;
  float region=1.-smoothstep(uCloudRadius*.5,uCloudRadius*.97,length(q));
  if(region<=0.) return 0.;
  float dsum=0.; if(lod<1.5){ gAbv=0.; gFr=.5; gFl=1.; }
  for(int i=0;i<4;i++){
    if(i>=uLayerN) break;
    vec4 a=uLayers[i], b=uLayerB[i];
    float thick=a.y-a.x;
    if(h<a.x-.2||h>=a.y) continue;
    float fl=smoothstep(.45,.95,b.x);
    vec3 w=vec3((vec2(dot(q,uCE),dot(q,uCN))+uNoiseOff.xy)*b.y+b.z,h*b.y);
    float c=gCov[i], tp=gTop[i];
    if(lod<1.5){ vec4 lo=textureLod(tNoise,w*.27+vec3(.084,.179,.963)+float(i)*vec3(.31,.17,.53),0.); float cov=(a.z+.3*smoothstep(5.,9.,thick)*(1.-smoothstep(uCloudRadius*.1,uCloudRadius*.5,length(q))))*region*uHiFade, u=smoothstep(.28,.72,lo.b*.62+lo.a*.46);
      c=clamp(cov*(.72+.4*cov*cov)+.05+(u-.5)*mix(.5,.85,smoothstep(5.,9.,thick)*(1.-fl)),0.,1.); tp=clamp(.3+lo.a*.75+u*.25,.35,1.); gCov[i]=c; gTop[i]=tp; gAbv+=c*sqrt(a.w)*max(a.y-h,0.)*mix(1.,.6,fl); }
    if(c<.02) continue;
    vec4 nz=textureLod(tNoise,vec3(w.xy,w.z*mix(clamp(.7/(thick*b.y),.55,.85),1.,max(fl,smoothstep(.05,.2,gPx)))),nLod(b.y));
    float bs=(nz.b-.48)*mix(min(.4,thick*.2),min(.3,thick*.12),fl), hb=0.;
    if(lod<1.5&&fl>.05){ hb=(textureLod(tNoise,vec3(w.xy/b.y*.55,h*.4)+vec3(.47,.13,.71),nLod(.55)).b-.48)*.34*fl; bs+=hb*.6; }
    float fr=(h-a.x-bs)/(thick-bs); if(fr<=0.||fr>=1.) continue;
    float gb=smoothstep(0.,mix(.06,.22,fl),fr);
    float gt=mix(1.-smoothstep(tp*.3,tp,fr),smoothstep(1.,.62,fr+(nz.a-.45)*.45-hb/thick),fl);
    float anv=(1.-fl)*smoothstep(5.,9.,thick)*smoothstep(.76,.9,fr)*smoothstep(1.,.93,fr);
    float cc=clamp(c*gb*gt+anv*c*.7,0.,1.);
    float base=clamp((nz.r*.8+nz.g*.3-.07)/.6,0.,1.), sol=smoothstep(.98,1.2,a.z)*fl;
    if(base+.13*ek<1.-cc&&sol<.01) continue;
    if(ek>.01){ float e=textureLod(tNoise,w*3.6+vec3(.3,.7,.1),nLod(b.y*3.6)).g; if(ek>.7) e=mix(e,1.-textureLod(tNoise,w*9.1+vec3(.6,.2,.9),nLod(b.y*9.1)).r,.3); if(gNear>.01) e=mix(e,textureLod(tNoise,w*29.+vec3(.1,.5,.3),nLod(b.y*29.)).r,.18*gNear); base+=(clamp((e-.28)/.4,0.,1.)-.5)*ek*mix(.44,.24,fl)*(clamp(fr*4.,0.,1.)*2.-1.); }
    float dn=clamp((base-(1.-cc))/max(cc*.8,.15),0.,1.);
    dn=max(dn,sol*gb*smoothstep(1.,.85,fr)*(.35+.65*base)*(1.-smoothstep(12.,35.,length(uCam)-R_KM-a.y)));
    dn=clamp((dn-.15)/.85,0.,1.);
    if(fl>.5&&(gH0<a.x||gH0>a.y)) dn*=mix(1.,gGz,fl);
    if(dn<=0.) continue;
    float dd=dn*sqrt(a.w)*mix(.8,1.,fl)*uHiFade; if(lod<1.5&&dd>dsum){ gFr=fr; gFl=fl; } dsum=max(dsum,dd);
  }
  return dsum;
}
void main(){
  vec2 ndc=vUv*2.-1.;
  vec3 vd=normalize(vec3((ndc.x+uProjK.z)*uProjK.x,(ndc.y+uProjK.w)*uProjK.y,-1.));
  vec3 d=normalize(uCamRot*vd);
  float z=texelFetch(tDepth,ivec2(gl_FragCoord.xy/uAS2*vec2(textureSize(tDepth,0))),0).r;
  float tScene=1e9;
  if(z<.99999){ float w=exp2(z*uLogFar)-1.; tScene=w/max(-vd.z,1e-3)/1000.; }
  if(tScene<.015){ outC=vec4(0.,0.,0.,1.); return; }
  vec3 o=uCam; float r0=length(o); vec3 up=o/r0; float h0=r0-R_KM;
  vec2 ga=sph(o,d,Ra), gg=sph(o,d,R_KM);
  float tg=(gg.x>0.&&gg.x<1e8)?gg.x:1e9;
  if(tScene>tg-tg*.004-.3) tScene=1e9;
  float tEnd=min(tScene,tg); bool sky=tEnd>1e8;
  vec3 S=vec3(0.), Tv=vec3(1.);
  float t0=max(ga.x,0.), t1=min(ga.y,tEnd);
  if(t1>t0) atm(o,d,t0,t1,h0<60.?2.:1.,S,Tv);
  float T=dot(Tv,vec3(.3,.4,.3));
  if(!sky) S*=mix(.38,1.,smoothstep(.15,.9,1.-T));
  if(!sky&&uMapK>0.){ vec3 Pg=o+d*tEnd; float mk=uMapK*smoothstep(.05,.45,-dot(d,normalize(Pg))); S*=1.-.85*mk; T=mix(T,1.,.85*mk); }
  float haze=exp(-max(h0,0.)/1.2)*BM*1.1+exp(-max(h0,0.)/8.)*BR.g;
  if(uFlash>.001) S+=vec3(.75,.82,1.)*pglow(o,d,tEnd,uFlashPos,uFlash*haze*14.);
  if(uGlowCol.r>.001) S+=uGlowCol*pglow(o,d,tEnd,uGlowPos,haze*2.5);
  if(uFogVis>0.){
    float dist=min(tEnd,400.), k=3./uFogVis, slope=dot(d,up), h1=max(h0+slope*dist,0.);
    float od=abs(slope)>.002?k*uFogTop*abs(exp(-h0/uFogTop)-exp(-h1/uFogTop))/abs(slope):k*dist*exp(-h0/uFogTop);
    float ab=smoothstep(uFogTop*.9,uFogTop*1.4,h0); od=mix(od,min(od*.4,.8),ab*smoothstep(.01,-.06,slope));
    float f=(1.-exp(-od))*(1.-smoothstep(25.,110.,h0)), su=dot(up,uSun);
    vec3 fc=mix(uAmb,vec3(dot(uAmb,vec3(.3,.5,.2))),.6)*1.3+sunTr(.5,su)*max(su,0.)*(.22+.6*hg(dot(d,uSun),.6));
    S=mix(S,fc,f); T*=1.-f;
  }
  float cd=sky?6e4:tEnd; float trN=1., trF=1.;
  vec3 front=vec3(0.), ff=vec3(0.); float ca=0., shd=1.;
  if(uLayerN>0){
    float lo=1e9,hi=-1e9;
    for(int i=0;i<4;i++){ if(i>=uLayerN) break; lo=min(lo,uLayers[i].x); hi=max(hi,uLayers[i].y); }
    if(!sky&&tEnd<90.){ vec3 P=o+d*tEnd; float rP=length(P), su=dot(P,uSun)/rP, hP=rP-R_KM, l0=max(lo,hP);
      if(su>.03&&hP<hi){ float od=0.;
        for(int k=0;k<2;k++) od+=cloudD(P+uSun*((mix(l0,min(hi,l0+4.),(float(k)+.5)/2.)-hP)/su),1.,0.);
        shd=mix(1.,exp(-od*SIG*.35*(min(hi,l0+4.)-l0)/(2.*su)),smoothstep(.03,.15,su)*.6); } }
    gGz=smoothstep(.0,.06,abs(dot(d,up))); gH0=h0;
    float a=1e9,b=-1.;
    for(int i=0;i<4;i++){ if(i>=uLayerN) break; float l0=uLayers[i].x-.2, l1=uLayers[i].y; vec2 tp=sph(o,d,R_KM+l1), bt=sph(o,d,R_KM+l0); bool hb=bt.x>0.&&bt.x<1e8;
      if(h0>l1){ if(tp.x>0.&&tp.x<1e8){ a=min(a,tp.x); b=max(b,hb?bt.x:tp.y); } }
      else if(h0<l0){ a=min(a,bt.y); b=max(b,tp.y); }
      else { a=0.; b=max(b,hb?bt.x:tp.y); } }
    vec2 rg=sph(o-uCenter,d,uCloudRadius);
    bool low=h0<hi+2.;
    a=max(max(a,rg.x),0.); b=min(min(b,rg.y),min(tEnd,low?125.:a+900.));
    if(b>a){
      float len=b-a;
      int n=int(min(float(uSteps),ceil(len/.05)+6.));
      float s0=.05+a*.012;
      float pw=clamp(log(s0/len)/log(1./float(n)),1.,2.2);
      float j=fract(texelFetch(tBlue,ivec2(gl_FragCoord.xy)&63,0).r+uFrame*.618034);
      vec3 pm=o+d*a, pf=o+d*b; float rpm=length(pm), rpf=length(pf);
      vec3 sI=sunTr(rpm-R_KM,dot(pm,uSun)/rpm)*14., sF=sunTr(rpf-R_KM,dot(pf,uSun)/rpf)*14.;
      bool useSun=dot(sI+sF,vec3(.3,.6,.1))>uMoonI*.24;
      vec3 L=useSun?uSun:uMoon; float mu=dot(d,L);
      float ph=mix(hg(mu,.78),hg(mu,-.25),.3), ph2=mix(hg(mu,.4),hg(mu,-.1),.3);
      if(!useSun){ ph=min(ph,.32); ph2=min(ph2,.2); }
      vec3 mI=vec3(.62,.72,.95)*uMoonI*.24, cAmb=mix(uAmb,vec3(dot(uAmb,vec3(.3,.5,.2))),.55), gB=(sI*max(dot(up,uSun),0.)*.1+uAmb*.5)*uGAlb;
      vec3 acc=vec3(0.); float tr=1., ds_=0., ws=0., pxA=2.*uProjK.y/uAS2.y; trN=1.; trF=1.;
      float fn=float(n);
      for(int i=0;i<128;i++){
        if(i>=n) break;
        float t=a+len*pow((float(i)+j)/fn,pw), tn=a+len*pow((float(i)+1.+j)/fn,pw);
        if(t>=b) break;
        float ds=min(tn,b)-t;
        vec3 p=o+d*t;
        gNear=1.-smoothstep(.6,2.5,t); gPx=t*pxA; float dens=cloudD(p,0.,1.-smoothstep(20.,55.,t)), abv=gAbv; gNear=0.; gPx=0.;
        float frL=gFr, flL=gFl;
        if(low){ float fd=smoothstep(40.,120.,t); trF*=exp(-dens*fd*SIG*ds); dens*=1.-fd; }
        if(dens>.002){
          float r=length(p), hh=r-R_KM, fr=clamp((hh-lo)/max(hi-lo,.1),0.,1.);
          float od=0., sl=.04+t*.0015, tl=0.;
          int nl=flL>.5||t>25.?3:4; float sg=nl==3?5.:3.4;
          for(int k=0;k<4;k++){ if(k>=nl) break; tl+=sl*.5; od+=cloudD(p+L*tl,2.,0.)*sl; tl+=sl*.5; sl*=sg; }
          od*=SIG*mix(.8,.55,flL);
          float msc=ph*exp(-od)+ph2*.5*exp(-od*.3)+.016*exp(-od*.1);
          float pw2=1.-exp(-dens*SIG*.35);
          vec3 li=useSun?mix(sI,sF,(t-a)/len):mI; li=mix(li,vec3(dot(li,vec3(.3,.55,.15))),.22);
          float ao=mix(.3+.7*smoothstep(0.,.75,frL),1.,flL*.6);
          vec3 col=li*msc*mix(1.,pw2,.55*(1.-mu))*.7*mix(.7+.3*ao,1.,flL)+cAmb*(.4+.6*fr)*ao*exp(-abv*.15)*(.3+.7*exp(-od*.12))+gB*(1.-fr)*exp(-abv*.08);
          if(uFlash>.001){ float fd=length(p-uFlashPos); col+=vec3(.78,.84,1.)*uFlash*4.5*exp(-fd*.3)/(1.+fd*fd*.08); }
          if(uGlowCol.r>.001){ vec3 gq=p-uGlowPos; float gd=length(gq), lm=textureLod(tNoise,(p-uCenter)*.45+vec3(.2,.6,.4),0.).r*.6+textureLod(tNoise,(p-uCenter)*1.4+vec3(.7,.1,.3),1.).r*.5-.05; col+=uGlowCol*1.6*exp(-gd*1.3)/(.03+gd*gd)*(.08+.92*pw2)*smoothstep(.3,.85,lm+.25*(1.-smoothstep(.2,.7,gd))); }
          if(uMapK>.001) col=max(col,vec3(.012,.018,.031)*uMapK*1.5/max(uExpo,1.));
          float st=exp(-dens*SIG*ds);
          float dt=tr*(1.-st);
          acc+=col*dt; ds_+=t*dt; ws+=dt; tr*=st; if(t<.4) trN=tr;
          if(tr<.03){ float k=1./(1.-tr); acc*=k; ds_*=k; ws=1.; tr=0.; break; }
        }
      }
      if(ws>.002){
        float tc=ds_/ws; cd=mix(cd,tc,clamp(ws*3.,0.,1.));
        float hm=max((h0+max(length(o+d*tc)-R_KM,0.))*.5,0.);
        vec3 Tc=exp(-(BR*exp(-hm/8.)+BM*1.1*exp(-hm/1.2))*tc);
        ff=clamp((1.-Tc)/max(1.-Tv,.02),0.,1.);
        front=acc*Tc+S*ff; ca=1.-tr;
      }
    }
    if(!sky&&tEnd<60.&&h0<lo+.2){ vec3 P=o+d*tEnd; float hP=length(P)-R_KM, su=dot(normalize(P),uSun), ev=0.;
      for(int i=0;i<4;i++){ if(i>=uLayerN) break; vec4 a=uLayers[i]; if(h0>a.x) continue; ev=max(ev,smoothstep(a.x,a.x+.3,hP)*(1.-smoothstep(a.y-.3,a.y,hP))*smoothstep(.5,.7,a.z)*sqrt(a.w)*smoothstep(.45,.95,uLayerB[i].x)); }
      if(ev>.01){ vec3 ec=mix(uAmb,vec3(dot(uAmb,vec3(.3,.5,.2))),.55)*.6+sunTr(max(hP,0.),su)*max(su,0.)*.5; front+=ec*ev*(1.-ca); ca+=ev*(1.-ca); } }
  }
  if(uLayerN>0&&tEnd>.025&&h0<20.){ float ci=smoothstep(.1,.6,1.-trN);
    if(ci>.01){ vec3 q=o-uCenter; float m1=textureLod(tNoise,(q+d*.03)*13.+vec3(.3,.1,.7),0.).r, m2=textureLod(tNoise,(q+d*.09)*4.7+vec3(.6,.9,.2),0.).g, m3=textureLod(tNoise,(q+d*.3)*1.3+vec3(.2,.4,.8),0.).b;
      float mk=ci*(.45*smoothstep(.25,.8,m1)+.3*smoothstep(.2,.85,m2)+.25*smoothstep(.3,.75,m3))*smoothstep(.02,.05,tEnd);
      float su=max(dot(up,uSun),0.); vec3 mc=mix(uAmb,vec3(dot(uAmb,vec3(.3,.5,.2))),.55)*.8+sunTr(h0,dot(up,uSun))*su*.45+vec3(.62,.72,.95)*uMoonI*.012;
      front=mc*(.6+.6*m1+.3*m3)*mk+front*(1.-mk); ca=mk+ca*(1.-mk); } }
  outC=vec4(front+S*(1.-ff)*(1.-ca),T*(1.-ca)*shd*(sky?trF:1.));
  outD=vec4(cd,0.,0.,1.);
}`;

export const ACCUM_FRAG = /* glsl */`
in vec2 vUv; out vec4 outC; uniform sampler2D tC,tD,tH; uniform float uA; uniform vec4 uProjK,uPrevK; uniform mat3 uCamRot,uPrevInv; uniform vec3 uDelta;
void main(){
  ivec2 ip=ivec2(gl_FragCoord.xy), sz=textureSize(tC,0)-1;
  vec4 c=texelFetch(tC,ip,0), m1=c, m2=c*c;
  for(int k=0;k<8;k++){ ivec2 o=ivec2(k<3?k-1:k<5?(k==3?-1:1):k-6,k<3?-1:k<5?0:1); vec4 s=texelFetch(tC,clamp(ip+o,ivec2(0),sz),0); m1+=s; m2+=s*s; }
  m1/=9.; vec4 sd=sqrt(max(m2/9.-m1*m1,0.));
  vec2 ndc=vUv*2.-1.;
  vec3 v=normalize(vec3((ndc.x+uProjK.z)*uProjK.x,(ndc.y+uProjK.w)*uProjK.y,-1.));
  vec3 P=uPrevInv*(uCamRot*v*texelFetch(tD,ip,0).r+uDelta);
  vec2 pu=vec2(P.x/(-P.z)/uPrevK.x-uPrevK.z,P.y/(-P.z)/uPrevK.y-uPrevK.w)*.5+.5;
  bool ok=P.z<0.&&all(greaterThan(pu,vec2(0.)))&&all(lessThan(pu,vec2(1.)));
  float mv=ok?length((pu-vUv)*vec2(sz)):9.;
  vec4 cf=mix(c,m1,clamp(.2+mv*.12,.2,.75));
  vec4 h=ok?texture(tH,pu):cf;
  float lh=dot(h.rgb,vec3(.3,.6,.1)), lm=dot(m1.rgb,vec3(.3,.6,.1));
  cf=mix(cf,m1,smoothstep(.25,1.,abs(lm-lh)/(lm+lh+.002))*.7);
  h=clamp(h,m1-sd*1.4-.003,m1+sd*1.4+.003);
  outC=mix(h,cf,ok?clamp(uA+mv*.01,0.,1.):1.);
}`;

export const BLEND_FRAG = /* glsl */`
in vec2 vUv; out vec4 outC; uniform sampler2D tA,tD,tTrans; uniform vec2 uAS; uniform float uLogFar,uSunK,uHalo; uniform vec4 uProjK; uniform mat3 uCamRot; uniform vec3 uSun,uCam;
float lz(float z){ return z>=.99999?40.:z*uLogFar; }
vec3 sunTr(float h,float mu){ return textureLod(tTrans,vec2(sqrt(clamp((mu+.35)/1.35,0.,1.))*.9921875+.00390625,sqrt(clamp(h/100.,0.,1.))*.96875+.015625),0.).rgb; }
vec3 sunD(float occA){
  vec2 ndc=vUv*2.-1.;
  vec3 d=normalize(uCamRot*vec3((ndc.x+uProjK.z)*uProjK.x,(ndc.y+uProjK.w)*uProjK.y,-1.));
  float c=dot(d,uSun); if(c<.99) return vec3(0.);
  float a=c>.9999?length(cross(d,uSun)):acos(c), rs=.004625, r=a/rs, px=2.*uProjK.y/float(textureSize(tD,0).y)/rs;
  float r0=length(uCam), h0=r0-6371., b=dot(uCam,d);
  vec3 Ts=h0<80.?sunTr(h0,b/r0):(b<0.?pow(sunTr(sqrt(max(r0*r0-b*b,0.))-6371.,0.),vec3(2.)):vec3(1.));
  float tl=dot(Ts,vec3(.3,.4,.3)), occ=clamp(occA/max(tl,1e-3)*1.08,0.,1.); occ*=occ;
  float disc=clamp((1.-r)/max(px,.05)+.5,0.,1.), mu=sqrt(max(1.-r*r,0.)), lim=1.-.62*(1.-mu)-.1*(1.-mu*mu);
  vec3 tc=Ts/max(max(Ts.r,Ts.g),max(Ts.b,1e-4));
  float L=min(20.*max(max(Ts.r,Ts.g),Ts.b),mix(4.,14.,smoothstep(.12,.55,tl)));
  float g=(exp(-a/.0075)*.9+exp(-a/.022)*.18)*(1.-smoothstep(.06,.135,a));
  return tc*(disc*lim*L+g*L*.15*uHalo)*occ*uSunK;
}
void main(){
  vec2 p=vUv*uAS-.5, c0=floor(p+.5);
  float zc=lz(texture(tD,vUv).r);
  vec4 sum=vec4(0.); float ws=0., bd=1e9; vec4 bc=vec4(0.);
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec2 tc=c0+vec2(i,j), uv=(tc+.5)/uAS;
    float dz=abs(lz(texture(tD,uv).r)-zc);
    vec4 a=texture(tA,uv);
    vec2 dd=tc-p;
    float w=exp(-dot(dd,dd)*1.6)*exp(-dz*22.);
    sum+=a*w; ws+=w;
    float sc=dz+dot(dd,dd)*.01; if(sc<bd){ bd=sc; bc=a; }
  }
  outC=ws>.02?sum/ws:bc;
  if(zc>39.&&uSunK>0.) outC.rgb+=sunD(outC.a);
}`;

export const BRIGHT_FRAG = /* glsl */`
in vec2 vUv; out vec4 outC; uniform sampler2D tS; uniform vec2 uPx; uniform float uK,uE;
void main(){
  vec3 c=vec3(0.); float w=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec3 s=texture(tS,vUv+vec2(x,y)*uPx).rgb*uE; float g=4.-float(abs(x)+abs(y));
    if(uK>0.){ float l=dot(s,vec3(.3,.6,.1)); float q=clamp(l-uK*.75,0.,uK*.5); q=q*q/(uK*2.); s*=max(q,l-uK)/max(l,1e-4); s=min(s,vec3(10.)); }
    c+=s*g; w+=g; }
  outC=vec4(c/w,1.);
}`;

export const FINAL_FRAG = /* glsl */`
in vec2 vUv; out vec4 outC; uniform sampler2D tS,tB1,tB2; uniform float uExp,uFade,uBloom,uTime; uniform vec3 uTint;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
vec3 bsp(sampler2D t,vec2 uv){
  vec2 ts=vec2(textureSize(t,0)), p=uv*ts-.5, f=fract(p), i=p-f, f2=f*f, f3=f2*f;
  vec2 w0=(1.-3.*f+3.*f2-f3)/6., w1=(4.-6.*f2+3.*f3)/6., w2=(1.+3.*f+3.*f2-3.*f3)/6., w3=f3/6., g0=w0+w1, g1=w2+w3, h0=(i-.5+w1/g0)/ts, h1=(i+1.5+w3/g1)/ts;
  return g0.y*(g0.x*textureLod(t,h0,0.).rgb+g1.x*textureLod(t,vec2(h1.x,h0.y),0.).rgb)+g1.y*(g0.x*textureLod(t,vec2(h0.x,h1.y),0.).rgb+g1.x*textureLod(t,h1,0.).rgb);
}
void main(){
  vec3 c=texture(tS,vUv).rgb*uExp;
  if(uBloom>0.) c+=(bsp(tB1,vUv)*.55+bsp(tB2,vUv)*.65)*uBloom;
  float l0=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,vec3(l0),.12*smoothstep(1.,6.,l0));
  c=aces(c);
  c=pow(c,vec3(1./2.2));
  float lum=dot(c,vec3(.3,.59,.11)); c=mix(vec3(lum),c,1.06); c=mix(c,c*c*(3.-2.*c),.18);
  float vg=1.-.26*pow(length(vUv-.5)*1.28,2.4); c*=vg;
  float n=fract(sin(dot(gl_FragCoord.xy+uTime,vec2(12.9898,78.233)))*43758.5453)+fract(sin(dot(gl_FragCoord.yx-uTime,vec2(39.346,11.135)))*23421.631);
  c+=(n-1.)/255.;
  c=mix(c,uTint,uFade);
  outC=vec4(c,1.);
}`;

export const STAR_VERT = /* glsl */`
attribute float aSize; attribute vec3 aColor; varying vec3 vC; varying float vS; uniform mat3 uRot; uniform float uPx,uDim;
void main(){ vec3 d=uRot*position; vC=aColor; vS=aSize; vec4 mv=viewMatrix*vec4(d*1e9,1.); gl_Position=projectionMatrix*mv; gl_Position.z=gl_Position.w*.99999; gl_PointSize=max(1.,aSize)*uPx; vC*=min(aSize,1.)*uDim; }`;
export const STAR_FRAG = /* glsl */`
varying vec3 vC; void main(){ float r=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.2,r); gl_FragColor=vec4(vC*a,1.); }`;

export const TERRAIN_VERT = /* glsl */`
varying vec2 vU; varying vec3 vN; varying vec3 vP; varying vec3 vRel; uniform vec3 uCamE,uNadir; uniform float uCamK,uCamR;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ vU=uv; vN=normal; vec4 w=modelMatrix*vec4(position,1.); vec3 g=uCamE+w.xyz; float al=(uCamK+2.*uCamR*dot(uNadir,w.xyz)+dot(w.xyz,w.xyz))/(length(g)+6371000.); if(al<1.5) w.xyz+=normalize(g)*(1.5-al); vRel=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;
#include <logdepthbuf_vertex>
}`;
export const TERRAIN_FRAG = /* glsl */`
uniform sampler2D tMap,tDay,tNight,tTrans,tSite,tPuff; uniform vec2 uLp0; uniform vec3 uSun,uMoon,uNadir,uSkyH,uSkyZ,uCamE,uAE,uAN,uAmb; uniform vec4 uSiteBox; uniform float uMoonI,uFlat,uEdge,uNightLights,uExpo,uMapK,uUrban,uA2C,uCamR;
varying vec2 vU; varying vec3 vN; varying vec3 vRel;
#include <common>
#include <logdepthbuf_pars_fragment>
${COMMON}
void main(){
#include <logdepthbuf_fragment>
  vec3 G=uCamE+vRel, P=normalize(G); float hgt=length(G)-6371000.;
  vec3 n=normalize(vN); if(dot(n,P)<0.) n=-n; n=normalize(mix(P,n,smoothstep(1.2,30.,hgt)));
  float lat=asin(clamp(P.z,-1.,1.)), lon=atan(P.y,P.x);
  vec2 su=vec2((lon*57.29578-uSiteBox.x)/(uSiteBox.z-uSiteBox.x),(lat*57.29578-uSiteBox.y)/(uSiteBox.w-uSiteBox.y)), sx=dFdx(su), sy=dFdy(su);
  vec2 g=vec2(lon/(2.*PI)+.5,lat/PI+.5), gx=dFdx(g), gy=dFdy(g);
  vec2 lp=uLp0+vec2(dot(vRel,uAE),dot(vRel,uAN))*.001, lx=dFdx(lp), ly=dFdy(lp); float fk=max(length(lx),length(ly));
  bool sb=uSiteBox.x<900.&&su.x>0.&&su.x<1.&&su.y>0.&&su.y<1.;
  float wv=0.; if(sb) wv=maskW(tSite,su,sx,sy,2,0.);
  float wm=sb?smoothstep(.5-fwidth(wv)*.8-.01,.5+fwidth(wv)*.8+.01,wv):0.;
  float cov=hgt<12.?1.-wm:1.; if(cov<(uA2C>.5?.02:.5)) discard;
  float e=min(min(vU.x,1.-vU.x),min(vU.y,1.-vU.y)), ek=uEdge>.5?smoothstep(.0,.2,e):1.;
  vec2 ux=dFdx(vU), uy=dFdy(vU); float tpm=1./(float(textureSize(tMap,0).x)*max(length(ux),length(uy))+1e-7);
  vec3 alb=texture2D(tMap,vU,1.1*(1.-smoothstep(.5,1.2,tpm))).rgb; if(tpm>1.7) alb=mix(alb,bsplC(tMap,vU,ux,uy),smoothstep(1.7,3.,tpm)); if(ek<1.) alb=mix(bsplC(tDay,g,gx,gy)*.72,alb,ek);
  if(uEdge<.5) n=normalize(mix(n,P,uMapK*(1.-smoothstep(.002,.007,e))));
  float nl=textureGrad(tNight,g,gx,gy).r, lum=dot(alb,vec3(.3,.5,.2)), ns=dot(P,uSun);
  float sand=smoothstep(.1,.25,alb.r-alb.b)*smoothstep(.25,.45,lum);
  if(fk<2.5){ alb*=mix(1.,landD(tPuff,lp,lx,ly,sand),(1.-smoothstep(1.,2.5,fk))*(1.-smoothstep(.75,.95,lum)*(1.-sand))*(1.-uMapK)); if(uUrban>0.) alb=mix(alb,urbA(alb,tPuff,nl,lp,lx,ly),(1.-uMapK)*uUrban); }
  vec3 sunCol=sunTr(max(hgt,0.)*.001,ns)*vec3(1.06,1.15,1.3);
  float lit=max(mix(dot(n,uSun),ns,.3),0.)*smoothstep(-.02,.08,ns);
  lit=mix(lit,max(ns,0.)*.85+.1*smoothstep(-.1,.1,ns),uFlat);
  float up=dot(n,P);
  vec3 sh=normalize(uSun-P*ns+P*.02);
  float tw=smoothstep(-.16,-.04,ns)*(1.-smoothstep(-.01,.05,ns));
  vec3 sk=mix(uSkyH,vec3(dot(uSkyH,vec3(.3,.6,.1))),.5);
  vec3 sky=lAmb(ns,uMoonI,uAmb)*(.55+.45*up)+sk*(.3+.7*max(dot(n,sh),0.))*tw*.8;
  float nm=max(dot(n,uMoon),0.);
  vec3 col=nightTone(alb*1.45*(sunCol*lit*1.15+sky+vec3(.75,.83,1.)*uMoonI*.03*nm+vec3(.0016,.0022,.004)),ns,max(sand,smoothstep(.15,.5,nl)));
  if(wm>.01){ vec3 V=-normalize(vRel); float cv=max(dot(P,V),0.), fr=.02+.98*pow(1.-cv,5.);
    vec3 wc=vec3(.004,.02,.03)*(sunCol*max(ns,0.)+gAmb(ns,uMoonI)*1.6)+mix(uSkyH,uSkyZ,.3)*fr*.9+sunCol*pow(max(dot(reflect(-V,P),uSun),0.),300.)*1.5*smoothstep(-.02,.06,ns);
    col=mix(col,wc,wm); }
  col*=1.-.22*max(uMapK,smoothstep(15e3,50e3,uCamR-6371000.))*smoothstep(.5,.8,lum);
  if(uMapK>.001) col=max(col,mix(textureGrad(tDay,g,gx,gy).rgb*.14+vec3(.012,.012,.01),vec3(.010,.016,.028),wm)*uMapK*1.5/max(uExpo,1.));
  float nk=(1.-wm)*smoothstep(-.005,-.1,ns)*uNightLights;
  if(nk>.001) col+=cityC(cityR(tPuff,nl,lp,lx,ly,uMapK)*nk,uExpo);
  gl_FragColor=vec4(col,cov);
}`;
