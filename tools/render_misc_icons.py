#!/usr/bin/env python3
"""Provisional hand-drawn vector-style icons for remaining miscellaneous items.
Requires Pillow; not a substitute for reviewing each icon in Minecraft.
"""
import json, random
from PIL import Image, ImageDraw
from render_gear_icons import ROOT, PACK, ITEMS, TEMPLATES, draw_attribute
from render_extra_item_icons import numbered, recolor, REALM_ATTRS
from import_item_art import save_with_maps

S=3
# Render at 3x for anti-aliased contours. The lightly speckled gradient is
# deliberately clipped to silhouettes rather than placed behind the item.
class Canvas:
 def __init__(self,seed):self.im=Image.new('RGBA',(128*S,128*S));self.r=random.Random(seed)
 def shape(self,pts,c,outline=(61,42,35),width=2):
  d=ImageDraw.Draw(self.im); p=[(int(x*S),int(y*S)) for x,y in pts]
  d.polygon(p,fill=(*c,255));d.line(p+[p[0]],fill=(*outline,255),width=width*S,joint='curve')
 def ellipse(self,box,c,outline=(61,42,35),width=2):
  ImageDraw.Draw(self.im).ellipse(tuple(int(x*S) for x in box),fill=(*c,255),outline=(*outline,255),width=width*S)
 def line(self,pts,c,width=2):ImageDraw.Draw(self.im).line([(int(x*S),int(y*S)) for x,y in pts],fill=(*c,255),width=width*S,joint='curve')
 def texture(self):
  alpha=self.im.getchannel('A');dots=Image.new('RGBA',self.im.size);d=ImageDraw.Draw(dots)
  for _ in range(1800):
   x=self.r.randrange(384);y=self.r.randrange(384)
   if alpha.getpixel((x,y))>128:
    col=(255,238,203,self.r.randrange(5,30)) if x+y<384 else (20,12,23,self.r.randrange(5,28))
    d.ellipse((x,y,x+self.r.randrange(1,5),y+self.r.randrange(1,5)),fill=col)
  self.im=Image.alpha_composite(self.im,dots)
 def finish(self):self.texture();return self.im.resize((128,128),Image.Resampling.LANCZOS)

def fish(c,col):
 c.shape([(20,60),(7,43),(9,76),(21,67)],tuple(max(0,x-35) for x in col))
 c.shape([(16,62),(35,44),(67,39),(93,45),(113,59),(103,73),(76,82),(43,79)],col)
 c.shape([(46,44),(55,30),(73,40)],tuple(max(0,x-25) for x in col))
 c.shape([(50,76),(58,88),(70,79)],tuple(max(0,x-25) for x in col))
 for x in range(35,87,10):
  for y in range(51,72,9):c.line([(x,y),(x+4,y+3),(x+8,y)],tuple(min(255,v+25) for v in col),1)
 c.ellipse((93,53,99,59),(20,22,26));c.ellipse((95,53,97,55),(255,255,245),width=1)
 c.line([(27,56),(40,49),(72,45)],(232,224,203),2)

def medal(c,col,kind):
 c.shape([(38,22),(51,12),(65,30),(78,12),(91,24),(75,50),(53,50)],(126,79,75))
 c.ellipse((21,31,107,117),(100,65,36));c.ellipse((25,35,103,113),(210,170,78));c.ellipse((32,42,96,106),col,(238,206,123),2)
 for x in (43,53,63,73,83):c.ellipse((x,48,x+2,50),(250,231,167),width=1)
 # Attribute motif, rendered separately in main.

def scroll(c,col):
 c.shape([(29,21),(86,26),(98,95),(39,101)],col)
 c.ellipse((21,17,42,32),(220,188,133));c.ellipse((86,91,107,106),(185,143,93))
 for y in (45,55,65,75):c.line([(40,y),(80,y+3)],(139,99,76),2)
 c.line([(30,25),(39,96)],(241,219,173),3)

def plate(c,col):
 c.ellipse((13,34,115,102),(100,73,56));c.ellipse((17,32,111,95),(208,182,132));c.ellipse((25,37,103,88),col,(112,75,45))
 for i in range(12):
  x=c.r.randrange(34,93);y=c.r.randrange(45,78);c.ellipse((x,y,x+7,y+5),c.r.choice([(234,172,75),(105,139,72),(197,100,62),(234,214,152)]),width=1)

def food_pouch(c,col):
 c.shape([(25,42),(34,25),(89,25),(104,43),(96,103),(32,103)],col)
 c.line([(32,40),(96,40)],(222,190,132),3);c.line([(38,31),(45,101)],(150,101,61),2)
 c.shape([(56,28),(67,34),(77,27),(70,43),(59,42)],(216,184,122),width=1)

def plant(c,col,typ):
 c.line([(64,105),(64,44)],(68,111,66),6)
 c.shape([(62,83),(35,68),(35,60),(62,71)],(88,151,75));c.shape([(67,72),(91,56),(96,58),(70,81)],(97,158,82))
 if typ=='corn':
  c.ellipse((45,20,82,80),(232,186,60));
  for y in range(28,72,8):
   for x in range(50,79,8):c.ellipse((x,y,x+4,y+4),(255,219,111),width=1)
 elif typ=='pumpkin':
  c.ellipse((25,48,103,101),(196,106,43));c.ellipse((39,48,90,101),(225,135,47));c.ellipse((53,49,77,100),(238,155,54));c.line([(62,47),(66,35)],(76,107,56),5)
 else:
  for dx,dy in [(0,-20),(18,-7),(12,14),(-12,14),(-18,-7)]:c.ellipse((55+dx,36+dy,73+dx,54+dy),col)
  c.ellipse((57,38,71,52),(232,192,80))

def cloth(c,bandage=False):
 c.shape([(22,32),(87,24),(104,47),(93,101),(24,103),(33,74)],(222,210,184))
 c.shape([(31,40),(88,35),(94,53),(36,61)],(246,235,207),width=1)
 c.line([(28,80),(86,70),(92,56)],(178,161,139),3);c.line([(30,91),(88,83)],(183,165,146),2)
 if bandage:
  c.shape([(57,46),(68,46),(68,53),(75,53),(75,64),(68,64),(68,72),(57,72),(57,64),(49,64),(49,53),(57,53)],(166,75,68),width=1)

def horn(c):
 c.shape([(21,99),(27,71),(43,52),(66,44),(87,28),(98,18),(105,22),(98,42),(85,59),(57,68),(43,82),(41,99)],(167,119,64))
 c.line([(29,92),(35,74),(53,59),(74,52),(93,35)],(235,196,125),4)
 c.ellipse((18,91,44,109),(111,78,49));c.ellipse((22,94,40,105),(48,34,31))

def mapping():
 return {
 'autumn_squash_produce':('pumpkin',12),'bandage':('bandage',5),'barn_token':('medal',13),
 'camp_herbal_tea':('tea',13),'camp_mushroom_wrap':('wrap',13),'camp_supply_pack':('pouch',3),
 'chronicle_fragment':('fragment',7),'cloth':('cloth',3),'dodge_scroll':('scroll',0),
 'dried_meat':('meat',2),'dried_sweet_berries':('berries',2),'expedition_bento':('bento',3),
 'farm_fiber':('fiber',13),'festival_0':('medal',0),'festival_1':('medal',5),
 'festival_2':('medal',12),'festival_3':('medal',11),'festival_fish_0':('fish',0),
 'festival_fish_1':('fish',2),'festival_fish_2':('fish',5),'festival_fish_3':('fish',11),
 'fish_token':('medal',1),'forager_nut_mix':('pouch',13),'gathered_herb_bundle':('herb',13),
 'ice_blossom_produce':('flower',11),'preserved_ration':('pouch',3),'relic_key':('compass',7),
 'roasted_root_plate':('plate',3),'smoked_fish_strip':('smoked',2),'spring_tulip_produce':('flower',0),
 'summer_corn_produce':('corn',5),'summer_sunflower_produce':('flower',5),'taunt_scroll':('scroll',2),
 'toki_crystal':('crystal',2),'trail_ration':('pouch',0),'travel_pass':('scroll',15),
 'village_badge':('medal',3),'war_horn':('horn',4),'wind_legacy_memorial':('medal',9),
 }

def icon(name,kind,a):
 c=Canvas(name);col=[(219,147,142),(104,167,205),(196,111,89),(216,195,131),(174,146,208),(232,196,77),(122,105,174),(196,173,133),(156,171,221),(222,162,207),(145,183,174),(181,221,234),(227,166,85),(108,162,101),(88,153,194),(153,205,219),(193,160,212),(224,169,186),(183,154,113),(107,189,183)][a]
 if kind=='fish':fish(c,col)
 elif kind=='medal':medal(c,col,a)
 elif kind=='scroll':scroll(c,(225,205,165))
 elif kind=='compass':
  c.ellipse((21,21,107,107),(169,135,71));c.ellipse((27,27,101,101),(35,65,75));c.shape([(64,32),(74,64),(64,96),(54,64)],(224,198,134));c.shape([(64,32),(64,64),(54,64)],(214,104,83));c.ellipse((60,60,68,68),(250,233,170))
 elif kind in ('pumpkin','flower','corn','herb'):plant(c,col,kind)
 elif kind in ('cloth','bandage','fiber'):cloth(c,kind=='bandage')
 elif kind=='horn':horn(c)
 elif kind in ('pouch','berries'):food_pouch(c,(160,119,78) if kind=='pouch' else (161,82,82))
 elif kind=='tea':
  c.ellipse((32,34,96,102),(133,96,65));c.shape([(33,53),(94,53),(86,94),(43,94)],(184,143,96));c.ellipse((33,43,94,66),(96,77,39));c.line([(52,42),(48,32),(54,20)],(219,228,215),2);c.line([(69,42),(73,32),(69,22)],(219,228,215),2)
 elif kind in ('plate','bento'):plate(c,(154,104,63))
 elif kind in ('meat','smoked','wrap'):
  fill=(165,85,58) if kind!='wrap' else (215,186,127)
  c.shape([(22,51),(36,34),(88,42),(105,61),(94,89),(43,98),(22,78)],fill)
  for y in (48,59,70,81):c.line([(34,y),(85,y+5)],(231,173,124),3)
 elif kind=='fragment':c.shape([(26,23),(94,19),(99,87),(76,105),(57,91),(35,103)],(219,204,171));c.line([(41,45),(82,42)],(127,106,96),2);c.line([(42,58),(79,56)],(127,106,96),2);c.line([(42,71),(70,69)],(127,106,96),2)
 elif kind=='crystal':
  c.shape([(64,9),(96,43),(88,84),(64,113),(37,93),(30,45)],(191,100,94));c.shape([(64,12),(64,59),(35,45)],(246,173,151),width=1);c.line([(64,12),(64,101),(90,46)],(255,214,178),2)
 else:raise ValueError(kind)
 im=c.finish(); im.alpha_composite(draw_attribute(a,20),(3,3))
 # Small distinct symbols preserve item identity when the same shape is used.
 if name in ('camp_supply_pack','preserved_ration','forager_nut_mix'):
  secondary={'camp_supply_pack':1,'preserved_ration':7,'forager_nut_mix':12}[name];im.alpha_composite(draw_attribute(secondary,16),(108,106))
 return im

def main():
 pp=ROOT/'texture_progress.json';j=json.loads(pp.read_text(encoding='utf8'));protected=set(j['redrawn_existing']+j['derived_existing']+j['derived_extra_existing']);made={}
 for name,(kind,a) in mapping().items():made[name]=icon(name,kind,a)
 # Refined icons must never be overwritten by this provisional renderer.
 for name in j.get('refined_misc_existing',[]): made.pop(name,None)
 assert not set(made)&protected
 for name,image in made.items():
  assert (PACK/'BehaviorPack/items'/(name+'.json')).exists(),name
  save_with_maps(image,ITEMS/('hakkai_'+name+'.png'))
 j['provisional_misc_existing']=sorted(made)
 pp.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(f'{len(made)} provisional miscellaneous icons prepared')
if __name__=='__main__':main()
