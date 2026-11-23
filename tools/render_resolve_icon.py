"""Rebuild the provisional Resolve charm icon from the existing sigil art."""
from pathlib import Path
from PIL import Image, ImageDraw
from import_item_art import save_with_maps
root=Path(__file__).resolve().parents[1]/'Hakkai_v7.1.0/ResourcePack/textures/items'
im=Image.open(root/'hakkai_warden_sigil.png').convert('RGBA')
draw=ImageDraw.Draw(im)
draw.polygon([(64,22),(72,51),(100,58),(74,68),(65,99),(56,69),(29,59),(55,51)],fill=(255,224,103,240),outline=(255,255,225,255),width=3)
draw.ellipse((57,52,72,67),fill=(255,255,240,255))
save_with_maps(im,root/'hakkai_resolve_charm.png')
