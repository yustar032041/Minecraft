#!/usr/bin/env python3
"""Replace selected provisional illustrations with reusable painted templates.

The variants share drawings and corner symbols; they are not individually
hand-painted assets, and small-game-scale legibility needs testing.
"""
import json
from PIL import Image, ImageDraw, ImageChops
from render_gear_icons import ROOT, PACK, ITEMS, TEMPLATES, draw_attribute
from render_extra_item_icons import recolor
from import_item_art import save_with_maps

FISH={'festival_fish_0':11,'festival_fish_1':2,'festival_fish_2':12,'festival_fish_3':1}
MEDALS={'festival_0':0,'festival_1':5,'festival_2':12,'festival_3':11,'fish_token':1,'village_badge':3,'wind_legacy_memorial':9}
SCROLLS={'dodge_scroll':0,'taunt_scroll':2,'travel_pass':15}

def painted_icon(base,attr,secondary=None,strength=.55):
    im=recolor(base,attr,strength)
    im.alpha_composite(draw_attribute(attr,22),(3,3))
    if secondary is not None:im.alpha_composite(draw_attribute(secondary,18),(106,105))
    return im

def render_all():
    names=['fish','medal','scroll','meat','fur','feather','antler','shell','mushroom','horn','pumpkin','linen','tea','wrap','provisions','bento','herbs','blossom','corn','compass','berries','roots','fish_strip']
    art={n:Image.open(TEMPLATES/(n+'.png')).convert('RGBA') for n in names}
    result={}
    for name,a in FISH.items():result[name]=painted_icon(art['fish'],a,strength=.7)
    for name,a in MEDALS.items():
        result[name]=painted_icon(art['medal'],a,strength=.35)
        # On the medal face the large motif also functions as a badge design.
        result[name].alpha_composite(draw_attribute(a,33),(48,60))
    for name,a in SCROLLS.items():result[name]=painted_icon(art['scroll'],a,strength=.18)
    result['dried_meat']=painted_icon(art['meat'],2,strength=.12)
    result['war_horn']=painted_icon(art['horn'],4,strength=.18)
    crystal=Image.open(ITEMS/'hakkai_crystal_0.png').convert('RGBA')
    result['toki_crystal']=painted_icon(crystal,2,strength=.8)
    # Torn parchment fragment cut out of the painted scroll.
    fragment=art['scroll'].crop((28,26,101,102)).resize((128,128),Image.Resampling.LANCZOS)
    mask=Image.new('L',(128,128));d=ImageDraw.Draw(mask)
    d.polygon([(17,8),(48,14),(62,7),(83,13),(107,9),(111,31),(104,44),(116,62),(106,77),(111,98),(89,105),(70,100),(53,115),(37,104),(16,108),(21,86),(9,69),(19,53),(13,32)],fill=255)
    fragment.putalpha(ImageChops.multiply(fragment.getchannel('A'),mask))
    result['chronicle_fragment']=painted_icon(fragment,7,strength=.1)
    # Newly painted food, fabric, foraging and navigation items.
    singles={'autumn_squash_produce':('pumpkin',12),
             'camp_herbal_tea':('tea',13),'camp_mushroom_wrap':('wrap',13),
             'expedition_bento':('bento',3),'gathered_herb_bundle':('herbs',13),
             'summer_corn_produce':('corn',5),'relic_key':('compass',7),
             'dried_sweet_berries':('berries',2),'roasted_root_plate':('roots',3),
             'smoked_fish_strip':('fish_strip',2)}
    for name,(base,attr) in singles.items():
        result[name]=painted_icon(art[base],attr,strength=0)
    # The icy flower is a colored version of the blossom, not a bespoke flower.
    result['ice_blossom_produce']=painted_icon(art['blossom'],11,strength=.85)
    result['spring_tulip_produce']=painted_icon(art['blossom'],0,strength=.05)
    result['summer_sunflower_produce']=painted_icon(art['blossom'],5,strength=.92)
    for name,attr in {'bandage':5}.items():
        im=painted_icon(art['linen'],attr,strength=.08)
        if name=='bandage':
            d=ImageDraw.Draw(im)
            d.rounded_rectangle((62,44,70,68),radius=1,fill=(160,42,45,240))
            d.rounded_rectangle((54,52,78,60),radius=1,fill=(160,42,45,240))
        result[name]=im
    for name,attr,secondary in [('camp_supply_pack',3,1),('preserved_ration',7,3),
                                ('forager_nut_mix',13,12),('trail_ration',0,5)]:
        result[name]=painted_icon(art['provisions'],attr,secondary,strength=.08)
    return result

def main():
    path=ROOT/'texture_progress.json';j=json.loads(path.read_text(encoding='utf8'))
    images=render_all(); protected=set(j['redrawn_existing']+j['derived_existing']+j['derived_extra_existing'])
    assert not protected.intersection(images)
    assert set(images).issubset(set(j['provisional_misc_existing'])|set(j.get('refined_misc_existing',[])))
    for name,im in images.items():
        assert (PACK/'BehaviorPack/items'/(name+'.json')).exists()
        save_with_maps(im,ITEMS/('hakkai_'+name+'.png'))
    j['provisional_misc_existing']=sorted(set(j['provisional_misc_existing'])-set(images))
    j['refined_misc_existing']=sorted(images)
    path.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(f'{len(images)} icons refined with reusable paintings; {len(j["provisional_misc_existing"])} simple vector designs remain')
if __name__=='__main__':main()
