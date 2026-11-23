#!/usr/bin/env python3
"""Render the user's Strudel motifs into compact, per-phase battle loops.

This is a deterministic *arrangement*, not Strudel's audio engine: note/@weight
patterns are parsed from the provided originals, sections are reorchestrated
with synths and newly arranged drums, and short loops replace the original long
form. Requires numpy and soundfile (libsndfile Vorbis support).
"""
from pathlib import Path
import re, math, sys
import numpy as np
import soundfile as sf
root=Path(__file__).resolve().parents[1];source=root/'music/warden_sources';out=root/'Hakkai_v7.1.0/ResourcePack/sounds/hakkai'
SR=32000; rng=np.random.default_rng(81025)
files=sorted(source.glob('*.strudel.js'))
assert len(files)==5
note_re=re.compile(r'note\("([^"]+)"\)\.sound\("([^"]+)"\)')
def events(text):
 result=[]
 for word in text.split():
  match=re.fullmatch(r'(~|[a-gA-G](?:#|b)?-?\d+)(?:@(\d+(?:\.\d+)?))?',word)
  if not match:raise ValueError('unknown note token '+word)
  result.append((match.group(1),float(match.group(2) or 1)))
 return result
def hz(n):
 m=re.fullmatch(r'([a-gA-G])([#b]?)(-?\d+)',n);semitones={'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11};v=semitones[m[1].lower()]+({'#':1,'b':-1}.get(m[2],0));return 440*2**((((int(m[3])+1)*12+v)-69)/12)
def tone(freq,duration,instrument):
 length=max(1,round(duration*SR));t=np.arange(length,dtype=np.float32)/SR
 # Harmonic synthesis is band-limited by Nyquist and avoids external samples.
 if instrument=='sawtooth': harmonics=[(1,1),(.50,2),(.25,3),(.16,4)]
 elif instrument=='square':harmonics=[(1,1),(.27,3),(.11,5)]
 elif instrument=='triangle':harmonics=[(1,1),(-.1,3),(.035,5)]
 elif instrument=='piano':harmonics=[(1,1),(.42,2),(.16,3),(.08,4)]
 else:harmonics=[(1,1),(.10,2)]
 wave=np.zeros(length,dtype=np.float32)
 for amp,k in harmonics:
  if freq*k<SR*.44:wave+=amp*np.sin(2*np.pi*freq*k*t)
 wave/=sum(abs(a) for a,k in harmonics if freq*k<SR*.44)
 attack=.012 if instrument not in ('piano','sine') else .006;release=min(.08,duration*.22)
 env=np.minimum(1,t/max(.001,attack))*np.minimum(1,(duration-t)/max(.001,release))
 if instrument in ('piano','sine'):env*=.45+.55*np.exp(-t*4)
 return wave*env

def add_note(buffer,at,freq,duration,instrument,volume,pan):
 start=max(0,int(at*SR));length=min(round(duration*SR),len(buffer)-start)
 if length<=0:return
 wave=tone(freq,length/SR,instrument)[:length]*volume
 buffer[start:start+length,0]+=wave*(1-pan);buffer[start:start+length,1]+=wave*pan

def drums(buf,base,beat,beats,phase):
 # Original rhythm palette (kick, snare, hats, toms and crash) rebuilt as a
 # driving combat groove in each source's original time signature.
 tick=beat/2;n=int(round(8*beats*2))
 for i in range(n):
  at=base+i*tick;slot=i%int(beats*2);kind=[]
  if i%2==0 or phase>=3:kind.append('hat')
  if slot in (0,int(beats)):kind.append('kick')
  if slot in (2,int(beats)+2) and slot<int(beats*2):kind.append('snare')
  if i==0:kind.append('crash')
  for k in kind:
   dur={'kick':.22,'snare':.13,'hat':.038,'crash':.32}[k];tt=np.arange(round(SR*dur),dtype=np.float32)/SR
   if k=='kick':w=np.sin(2*np.pi*(42*tt+35*(1-np.exp(-tt*28))/28))*np.exp(-tt*18)*.25
   elif k=='snare':w=(rng.standard_normal(len(tt)).astype(np.float32)*.6+np.sin(2*np.pi*190*tt)*.4)*np.exp(-tt*23)*.11
   else:
    noise=rng.standard_normal(len(tt)).astype(np.float32);w=np.diff(noise,prepend=0)*np.exp(-tt*(28 if k=='crash' else 80))*(.04 if k=='hat' else .035)
   start=int(at*SR);ncopy=min(len(w),len(buf)-start)
   if ncopy>0:buf[start:start+ncopy,0]+=w[:ncopy]*.5;buf[start:start+ncopy,1]+=w[:ncopy]*.5

def main():
 for idx,path in enumerate(files):
  if len(sys.argv)>1 and int(sys.argv[1])!=idx+1:continue
  code=path.read_text(encoding='utf8');tempo=float(re.search(r'Tempo:\s*(\d+)',code)[1]);beats=float(re.search(r'meter:\s*([\d.]+)/4',code)[1]);cycle=60/tempo*beats*8
  blocks=re.findall(r'const\s+(\w+)\s*=\s*(.*?);',code,re.S);tracks=[]
  for name,block in blocks:
   if name in ('drums','drumsAlt','drumsDry','ride','rideAlt'):continue
   parsed=note_re.findall(block)
   if parsed:
    for notes,inst in parsed:tracks.append((name,events(notes),inst))
  assert len(tracks)>=3,path
  samples=math.ceil(cycle*4*20)*1600;buf=np.zeros((samples,2),np.float32)
  for section in range(4):
   base=section*cycle
   for track,(name,seq,inst) in enumerate(tracks):
    data=list(reversed(seq)) if section==2 and track==0 else seq
    weights=sum(w for _,w in data);position=0
    # Keep the user's melody and harmony while changing registers/timbres.
    for n,w in data:
     dur=cycle*w/weights;at=base+cycle*position/weights;position+=w
     if n=='~':continue
     transpose=(-12 if section==1 and track==0 else 12 if section==3 and track==0 and idx!=4 else 0)
     vol=(.13 if track==0 else .16 if name in ('bass','cello') else .052)
     add_note(buf,at,hz(n)*2**(transpose/12),dur*.88,inst,vol,.4 if track%2==0 else .6)
   drums(buf,base,60/tempo,beats,idx)
  # Soft saturation and a tiny edge fade avoid clipping and loop clicks.
  buf=np.tanh(buf*1.4);peak=float(np.max(np.abs(buf)));buf*=.85/max(peak,.001)
  fade=min(round(.08*SR),len(buf)//2);ramp=np.linspace(0,1,fade,dtype=np.float32)[:,None];buf[:fade]*=ramp;buf[-fade:]*=ramp[::-1]
  dest=out/f'warden_phase_{idx+1}.ogg'
  with sf.SoundFile(dest,'w',SR,channels=2,format='OGG',subtype='VORBIS') as target:
   for offset in range(0,len(buf),16384):target.write(buf[offset:offset+16384])
  print(f'{idx+1}: {path.name} => {dest.name} ticks={samples//1600} duration={samples/SR:.2f}s peak={np.max(np.abs(buf)):.2f}')
if __name__=='__main__':main()
