"""Small, per-creature geometry refinements after atlas generation.

Keep approved textures/UV rectangles unchanged and reuse each existing cube
exactly once. Runtime AI, collision and animation tracks are not modified.
"""
import json


def refine_model(name, model):
    bones=model['bones']
    by={bone['name']:bone for bone in bones}
    if name=='wild_2_0':
        # A lean desert runner rather than the compact station hare: extend
        # its existing torso and separate the long hind feet at the hock.
        body=by['w2_0_body']['cubes'][0]
        body['origin']=[-2.3,2.8,-2.8];body['size']=[4.6,4.2,7.5]
        for i,x in ((2,-1.9),(3,1.9)):
            leg=by[f'w2_0_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-.9,0,1.3];foot['size']=[1.8,.8,2.5]
            bones.append({'name':f'w2_0_hock_{i}','parent':leg['name'],
                          'pivot':[x,.7,2.7],'cubes':[foot]})
    elif name=='wild_3_0':
        # Snow fox: short muzzle, broad winter brush and heavier feet; the
        # copper-tailed station fox instead has a long, narrow plated tail.
        muzzle=by['w3_0_head']['cubes'][1]
        muzzle['origin']=[-1.15,5,-7];muzzle['size']=[2.3,1.4,1.5]
        plume=by['w3_0_tail_plume']['cubes']
        plume[0]['origin']=[-2.7,3.8,6.8];plume[0]['size']=[5.4,4.6,3]
        plume[1]['origin']=[-2.2,4.1,9.4];plume[1]['size']=[4.4,4,1.5]
        for i,x in ((0,-1.7),(1,1.7)):
            foot=by[f'w3_0_leg_{i}']['cubes'][1]
            foot['origin']=[x-1,0,-3];foot['size']=[2,.7,2]
    elif name=='wild_6_0':
        # Cloud bird: compact outer wings and a wide shallow tail fan, not the
        # long-winged forest bird or the broad inner wings of the spore bird.
        for side,x in (('l',-7.9),('r',5.5)):
            tip=by[f'w6_0_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,5,-1.1];tip[0]['size']=[2.4,.8,4]
            tip[1]['origin']=[x,4.8,2.5];tip[1]['size']=[1.2,.5,1.2]
            tip[2]['origin']=[x+1.1,4.8,2.5];tip[2]['size']=[1.3,.5,.9]
        tail=by['w6_0_tail']['cubes'][1]
        tail['origin']=[-3,4,5.6];tail['size']=[6,.7,2]
    elif name=='wild_6_1':
        # The young sky goat has a short, deep body and broad muzzle, distinct
        # in proportion from the long-legged adult ridge goat.
        body=by['w6_1_body']['cubes'][0]
        body['origin']=[-3,4.5,-2.7];body['size']=[6,5,6.9]
        muzzle=by['w6_1_head']['cubes'][1]
        muzzle['origin']=[-1.3,7,-7];muzzle['size']=[2.6,1.3,1.7]
    elif name=='wild_7_0':
        # Station hare: compact broad haunches and separate hind feet.
        body=by['w7_0_body']['cubes'][0]
        body['origin']=[-3,2.7,-2.7];body['size']=[6,4,6.2]
        tail=by['w7_0_tail'];tail['pivot']=[0,5,3.5]
        tail['cubes'][0]['origin']=[-.9,4,3.4]
        for i,x in ((2,-1.8),(3,1.8)):
            leg=by[f'w7_0_leg_{i}'];foot=leg['cubes'].pop()
            leg['cubes'][0]['origin']=[x-1.05,.5,2.15]
            leg['cubes'][0]['size']=[2.1,2.8,1.5]
            foot['origin']=[x-1,0,1.3];foot['size']=[2,.7,2.5]
            bones.append({'name':f'w7_0_hock_{i}','parent':leg['name'],
                          'pivot':[x,.7,2.8],'cubes':[foot]})
    elif name=='wild_7_1':
        # Copper fox: long narrow articulated plated tail and low front paws,
        # contrasting with the winter fox's thick brush and broad muzzle.
        tail=by['w7_1_tail_plate']['cubes']
        tail[0]['origin']=[-1.5,4.6,6.8];tail[0]['size']=[3,2.9,4]
        tail[1]['origin']=[-1,4.8,10.5];tail[1]['size']=[2,2.5,2]
        for i,x in ((0,-1.7),(1,1.7)):
            foot=by[f'w7_1_leg_{i}']['cubes'][1]
            foot['origin']=[x-.85,0,-3];foot['size']=[1.7,.8,2]
    elif name=='wild_7_2':
        # Clockwork sentry: wide chest and substantial separate forearms,
        # rather than the similar sandstone and storm upright silhouettes.
        body=by['w7_2_body']['cubes'][0]
        body['origin']=[-4.7,6,-2.8];body['size']=[9.4,8,5.6]
        for side,x in (('l',-7.4),('r',4.1)):
            hand=by[f'w7_2_forearm_{side}']['cubes']
            hand[0]['origin']=[x,3.8,-2.4];hand[0]['size']=[3.3,3.4,4.8]
            hand[1]['origin']=[x-.1,3.6,-2.5];hand[1]['size']=[3.5,1.1,5]
    elif name=='foe_1_1':
        # Forest spore sentinel: a broad, two-lobed moth wing, not the
        # narrow swept wing of the luminous bird. Keep both wing hinges.
        for side,x in (('l',-6.4),('r',1.9)):
            wing=by[f'f1_1_wing_{side}']['cubes']
            wing[0]['origin']=[x,5.3,-3.3];wing[0]['size']=[4.5,1,6.5]
            wing[1]['origin']=[x,5,2.6];wing[1]['size']=[4.5,.6,1.4]
            tip=by[f'f1_1_wing_{side}_tip'];tip['pivot']=[-6.1 if side=='l' else 6.1,5.8,0]
            xx=-9.4 if side=='l' else 6
            tip['cubes'][0]['origin']=[xx,5.2,-2.5];tip['cubes'][0]['size']=[3.4,.8,5.8]
            tip['cubes'][1]['origin']=[xx,5,2.8];tip['cubes'][1]['size']=[3.4,.5,1.5]
    elif name=='foe_1_2':
        # Bridge guardian braces with slab-like forearms and splayed feet.
        for side,x in (('l',-7.7),('r',4.1)):
            arm=by[f'f1_2_forearm_{side}']['cubes']
            arm[0]['origin']=[x,3.4,-2.7];arm[0]['size']=[3.6,4.3,5.4]
            arm[1]['origin']=[x-.1,3.2,-2.9];arm[1]['size']=[3.8,1.2,5.8]
        for i,x in ((0,-2.2),(1,2.2)):
            foot=by[f'f1_2_leg_{i}']['cubes'][1]
            foot['origin']=[x-1.9,0,-2.6];foot['size']=[3.8,1.4,4.8]
    elif name=='foe_1_3':
        # Moss shell king: distinct broad split carapace and articulated
        # six feet, instead of another short six-legged rectangular beetle.
        for side,x in (('l',-4.7),('r',0)):
            shell=by[f'f1_3_shell_{side}']['cubes']
            shell[0]['origin']=[x,6.8,-2.7];shell[0]['size']=[4.7,1.6,7.2]
            shell[1]['origin']=[x+.4,8,-1.9];shell[1]['size']=[4.3,1,5.9]
        for i in range(6):
            leg=by[f'f1_3_leg_{i}'];foot=leg['cubes'].pop();x=-3 if i%2==0 else 3;z=(-1.8,.8,3.4)[i//2]
            bones.append({'name':f'f1_3_foot_{i}','parent':leg['name'],
                          'pivot':[x,.6,z],'cubes':[foot]})
    elif name=='foe_1_4':
        # Indigo tail-hunter uses a long segmented taper rather than the
        # short broad brush of the mist fox or the lost hunter's blade tail.
        mid=by['f1_4_tail_mid']['cubes'][0]
        mid['origin']=[-1.2,5.3,8];mid['size']=[2.4,2.4,4.3]
        tip=by['f1_4_tail_tip'];tip['pivot']=[0,6.3,12]
        tip['cubes'][0]['origin']=[-1,5.4,12];tip['cubes'][0]['size']=[2,2.2,3.1]
        tip['cubes'][1]['origin']=[-.8,5.5,14.8];tip['cubes'][1]['size']=[1.6,2,1.2]
    elif name=='foe_1_5':
        # Luminous forest wing: long, narrow outer wings sweep backwards.
        for side,x in (('l',-10.2),('r',6)):
            tip=by[f'f1_5_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,5.9,-.3];tip[0]['size']=[4.2,.9,3.6]
            tip[1]['origin']=[x,5.7,2.7];tip[1]['size']=[3.8,.5,1.2]
    elif name=='foe_1_7':
        # Wooden hare: unequal ears and blocky hindquarters with jointed,
        # long hind feet. Preserve every atlas face and animation parent.
        ear=by['f1_7_ear_r']['cubes']
        ear[0]['size'][1]=3.1;ear[1]['size'][1]=1.8
        for i,x in ((2,-1.6),(3,1.6)):
            leg=by[f'f1_7_leg_{i}'];upper=leg['cubes'][0];foot=leg['cubes'].pop()
            upper['origin']=[x-1,0.4,1.95];upper['size']=[2,2.4,1.5]
            foot['origin']=[x-.85,0,1.2];foot['size']=[1.7,.6,2.4]
            bones.append({'name':f'f1_7_hock_{i}','parent':leg['name'],
                          'pivot':[x,.5,2.7],'cubes':[foot]})
    elif name=='foe_1_8':
        # Masked guard: narrow torso and a long hanging mantle, distinct
        # from the heavy bridge keeper and the clockwork armored sentry.
        body=by['f1_8_body']['cubes'][0]
        body['origin']=[-3.2,5.4,-2.3];body['size']=[6.4,8,4.6]
        mantle=by['f1_8_mantle']['cubes'][0]
        mantle['origin']=[-3.4,2.1,2];mantle['size']=[6.8,10.4,.9]
    elif name=='foe_1_9':
        # Marsh lantern bird walks with folded, hanging segmented wings;
        # the two forest moths hold their wings horizontally.
        for side,x in (('l',-4),('r',2.1)):
            wing=by[f'f1_9_wing_{side}']['cubes']
            wing[0]['origin']=[x,2.6,-1.7];wing[0]['size']=[1.9,3.9,4.6]
            wing[1]['origin']=[x,2.5,2.3];wing[1]['size']=[1.9,3.5,1.3]
            tip=by[f'f1_9_wing_{side}_tip'];tip['pivot']=[-3.3 if side=='l' else 3.3,3,0]
            xx=-4.1 if side=='l' else 2.8
            tip['cubes'][0]['origin']=[xx,1.5,-.5];tip['cubes'][0]['size']=[1.3,2.3,3.9]
            tip['cubes'][1]['origin']=[xx,1.3,2.8];tip['cubes'][1]['size']=[1.3,1,1]
    elif name=='foe_1_10':
        # Lost hunter: a heavy forequarters gait and shorter hind paws.
        for i,x in ((0,-1.8),(1,1.8)):
            leg=by[f'f1_10_leg_{i}']['cubes'][0]
            leg['origin']=[x-.9,2.1,-3.1];leg['size']=[1.8,3.3,1.6]
            paw=by[f'f1_10_hock_{i}']['cubes']
            paw[0]['origin']=[x-.75,.5,-3];paw[0]['size']=[1.5,1.8,1.4]
            paw[1]['origin']=[x-.9,0,-3.5];paw[1]['size']=[1.8,.7,2.1]
    elif name=='foe_6_0':
        # Airborne glider: long broad wings, extended fan and jointed rear
        # pads, unlike the narrower wings of the thunder-needle glider.
        for side,x in (('l',-11.1),('r',6.2)):
            tip=by[f'f6_0_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,6.6,-1.4];tip[0]['size']=[4.9,.5,4.9]
            tip[1]['origin']=[x,6.4,2.8];tip[1]['size']=[4.9,.5,1.1]
        for i,x in ((2,-1.7),(3,1.7)):
            leg=by[f'f6_0_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f6_0_hock_{i}','parent':leg['name'],
                          'pivot':[x,.6,3.5],'cubes':[foot]})
    elif name=='foe_6_3':
        # Floating stone shell guard: broad short shell, distinct from the
        # station beetle's longer narrow clock-bearing plates.
        for side,x in (('l',-4),('r',0)):
            shell=by[f'f6_3_shell_{side}']['cubes']
            shell[0]['origin']=[x,6,-2.5];shell[0]['size']=[4,1.2,6.9]
            shell[1]['origin']=[x+.4 if side=='l' else .3,7,-1.9];shell[1]['size']=[3.6,.8,5.5]
    elif name=='foe_6_9':
        # Ground hunter has a long segmented tail and stronger front feet,
        # different from the broad-winged quadruped glider.
        tail=by['f6_9_tail_tip']['cubes'][0]
        tail['origin']=[-1.4,5.1,10.3];tail['size']=[2.8,1.8,3.2]
        for i,x in ((0,-1.5),(1,1.5)):
            foot=by[f'f6_9_leg_{i}']['cubes'][1]
            foot['origin']=[x-.85,0,-3.2];foot['size']=[1.7,.7,2.1]
    elif name=='foe_7_3':
        # Station beetle's longer stepped shell contrasts with the broad
        # floating stone guard, while preserving its clock-bearing bone.
        for side,x in (('l',-3.5),('r',0)):
            shell=by[f'f7_3_shell_{side}']['cubes']
            shell[0]['origin']=[x,6,-2.8];shell[0]['size']=[3.5,1.1,7.8]
            shell[1]['origin']=[x+.3 if side=='l' else .3,6.9,-2];shell[1]['size']=[2.9,.7,6.4]
    elif name=='foe_7_4':
        # Station fox has a long slender plated tail, rather than the thick
        # three-section brush of the underground shadow hunter.
        tail=by['f7_4_tail_tip']['cubes']
        tail[0]['origin']=[-1.6,5.1,9.9];tail[0]['size']=[3.2,2.5,3.5]
        tail[1]['origin']=[-1.2,5.4,13];tail[1]['size']=[2.4,1.9,1.4]
    elif name=='foe_7_9':
        # The hourglass hare is longer and narrower than the low stopping-line
        # hare, with longer narrow hock pads for its running stance.
        for i,x in ((2,-1.5),(3,1.5)):
            foot=by[f'f7_9_hock_{i}']['cubes'][1]
            foot['origin']=[x-.65,0,1.5];foot['size']=[1.3,.7,2.4]
    elif name=='foe_5_0':
        # Narrow mining larva with a long tapering segmented rear; the king
        # has a wider head and paired mandibles instead of a boring snout.
        abdomen=by['f5_0_abdomen']['cubes'][0]
        abdomen['origin']=[-2.1,2.1,3.5];abdomen['size']=[4.2,3.4,3.8]
        tail=by['f5_0_tail'];tail['pivot'][2]=7.1
        for c in tail['cubes']:c['origin'][2]+=.4
    elif name=='foe_5_1':
        # Low, broad spore-carrier rather than the tall deep-pit spider;
        # cap and stalk stay on their existing independent bone.
        abdomen=by['f5_1_body']['cubes'][1]
        abdomen['origin']=[-4,2,2];abdomen['size']=[8,4.1,5.5]
        for i in (0,1):
            leg=by[f'f5_1_leg_{i}'];tip=by[f'f5_1_tip_{i}'];sign=-1 if i==0 else 1
            c=leg['cubes'][0];c['origin'][0]+=min(0,sign*.6);c['size'][0]+=.6
            tip['pivot'][0]+=sign*.6
            for c in tip['cubes']:c['origin'][0]+=sign*.6
    elif name=='foe_5_5':
        # Broad two-stage moth wings differ from the folded wings of the
        # mineral bat. Keep the existing wing joints and UV rectangles.
        for side,x in (('l',-9.8),('r',5.8)):
            tip=by[f'f5_5_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,6.5,-1.3];tip[0]['size']=[4,.6,5]
            tip[1]['origin']=[x,6.3,2.7];tip[1]['size']=[4,.45,1.8]
    elif name=='foe_5_6':
        # High, narrow body and long rear legs emphasize the deep-pit spider
        # instead of the low broad mushroom spider and eye-faced weaver.
        for i in (6,7):
            leg=by[f'f5_6_leg_{i}'];tip=by[f'f5_6_tip_{i}'];sign=-1 if i==6 else 1
            c=leg['cubes'][0];c['origin'][0]+=min(0,sign*.8);c['size'][0]+=.8
            tip['pivot'][0]+=sign*.8
            for c in tip['cubes']:c['origin'][0]+=sign*.8
    elif name=='foe_5_8':
        # Paired, wide mining jaws and broad head stand apart from the narrow
        # snout of the tunnel larva and high shell of the crystal beetle.
        for side in ('l','r'):
            jaw=by[f'f5_8_jaw_{side}']['cubes']
            jaw[0]['origin'][0]=-3.8 if side=='l' else 1.8
            jaw[0]['size'][0]=2
            jaw[1]['origin'][0]=-3.9 if side=='l' else 2.5
    elif name=='foe_5_11':
        # Lower, long folded tips and broad feet for the mineral bat.
        for side in ('l','r'):
            tip=by[f'f5_11_wing_{side}_tip']['cubes'][0]
            tip['origin'][1]=2.3;tip['size'][1]=2.4
        for i,x in ((0,-1),(1,1)):
            leg=by[f'f5_11_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f5_11_talon_{i}','parent':leg['name'],
                          'pivot':[x,.6,.5],'cubes':[foot]})
    elif name=='foe_4_1':
        # Broad, long outer flight feathers; the conducting bird has shorter,
        # swept wings and the discharge owl has vertically folded wings.
        for side,x in (('l',-10.4),('r',5.7)):
            tip=by[f'f4_1_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,5.7,-1.2];tip[0]['size']=[4.7,.8,4.3]
            tip[1]['origin']=[x,5.4,2.5];tip[1]['size']=[4.2,.5,1.3]
    elif name=='foe_4_3':
        # Flatten and widen the magnetic shell compared with the tall crystal
        # beetle. The magnet and feet remain attached to their original bones.
        for side,x in (('l',-4.2),('r',0)):
            shell=by[f'f4_3_shell_{side}']['cubes']
            shell[0]['origin']=[x,6,-2.5];shell[0]['size']=[4.2,.8,6.9]
            shell[1]['origin']=[x+.5 if side=='l' else .2,6.7,-1.9];shell[1]['size']=[3.5,.6,5.4]
    elif name=='foe_4_4':
        # A fast hunter with extended muzzle and enlarged front paw pads.
        muzzle=by['f4_4_head']['cubes'][1]
        muzzle['origin']=[-1,7,-9.5];muzzle['size']=[2,1.4,3.3]
        for i,x in ((0,-1.8),(1,1.8)):
            foot=by[f'f4_4_paw_{i}']['cubes'][1]
            foot['origin']=[x-1,0,-3.6];foot['size']=[2,.7,2.2]
    elif name=='foe_4_8':
        # Horned lightning soldier's horizontal steel horns differ from the
        # taller ice horns; keep each tip joined to its existing parent.
        for side,sign in (('l',-1),('r',1)):
            horn=by[f'f4_8_horn_{side}']['cubes']
            x=-4.8 if sign<0 else 2
            horn[1]['origin'][0]=x;horn[1]['size'][0]=2.8
            horn[2]['origin'][0]=-4.8 if sign<0 else 4
    elif name=='foe_4_9':
        # Distinctive wide fan and independently hinged feet on the upright
        # discharge owl, rather than the two horizontal-winged birds.
        fan=by['f4_9_tail']['cubes'][1]
        fan['origin']=[-2.9,3.5,5];fan['size']=[5.8,.6,1.7]
        for i,x in ((0,-1.2),(1,1.2)):
            leg=by[f'f4_9_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f4_9_talon_{i}','parent':leg['name'],
                          'pivot':[x,.6,.4],'cubes':[foot]})
    elif name=='foe_4_10':
        # Wide wall shield, unlike the unshielded horns and rock-breaker.
        shield=by['f4_10_shield']['cubes']
        shield[0]['origin']=[-3.8,6.8,-3.7];shield[0]['size']=[7.6,4,.8]
        shield[1]['origin']=[-3,7.4,-4];shield[1]['size']=[6,2.8,.5]
    elif name=='foe_4_11':
        # Narrow swept wings and a long tail distinguish the quadruped glider
        # from birds; separate the rear pads for subsequent animation work.
        for side,x in (('l',-9.4),('r',5.6)):
            tip=by[f'f4_11_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,6.6,-.4];tip[0]['size']=[3.8,.5,3.9]
            tip[1]['origin']=[x,6.4,-.5];tip[1]['size']=[3.8,.5,.7]
        for i,x in ((2,-1.6),(3,1.6)):
            leg=by[f'f4_11_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f4_11_hock_{i}','parent':leg['name'],
                          'pivot':[x,.6,3.5],'cubes':[foot]})
    elif name=='foe_3_0':
        # Crystal owl has a broad round breast, short folded wings and
        # independently hinged talons, unlike the narrow frost bird.
        body=by['f3_0_body']['cubes'][0]
        body['origin']=[-3.5,3,-2.6];body['size']=[7,5.6,5.6]
        for side,x in (('l',-4.2),('r',2.8)):
            wing=by[f'f3_0_wing_{side}']['cubes']
            wing[0]['origin']=[x,3.3,-2];wing[0]['size']=[1.4,4.5,4.6]
        for i,x in ((0,-1.4),(1,1.4)):
            leg=by[f'f3_0_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-.85,0,-.7];foot['size']=[1.7,.8,2.1]
            bones.append({'name':f'f3_0_talon_{i}','parent':leg['name'],
                          'pivot':[x,.7,.7],'cubes':[foot]})
    elif name=='foe_3_1':
        # Mirror-lake bird: long pointed wings and an extended narrow fan.
        # Its neck remains an independent animated child of the body.
        for side,x in (('l',-10.4),('r',5.8)):
            tip=by[f'f3_1_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,6,-1.3];tip[0]['size']=[4.6,.8,3.6]
            tip[1]['origin']=[x,5.7,1.8];tip[1]['size']=[4.2,.5,1.2]
        tail=by['f3_1_tail']['cubes'][1]
        tail['origin']=[-1.6,4.9,6.5];tail['size']=[3.2,.6,2.6]
    elif name=='foe_3_2':
        # Ice-prison brute has thick low fists and a wide caged chest,
        # structurally distinct from the lighter horned ice soldier.
        for side,x in (('l',-7.6),('r',4)):
            fist=by[f'f3_2_fist_{side}']['cubes']
            fist[0]['origin']=[x,3.5,-2.5];fist[0]['size']=[3.6,3.7,5]
            fist[1]['origin']=[x-.15,3.3,-2.7];fist[1]['size']=[3.9,1.2,5.4]
    elif name=='foe_3_5':
        # Pillar carrier: compact, broad wing lobes support the heavy back
        # crystal; its shorter span contrasts with the mirror-lake bird.
        for side,x in (('l',-8.4),('r',5.6)):
            tip=by[f'f3_5_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,5.7,-2.1];tip[0]['size']=[2.8,.8,5.4]
            tip[1]['origin']=[x,5.4,2.6];tip[1]['size']=[2.8,.5,1.4]
        tail=by['f3_5_tail']['cubes'][1]
        tail['origin']=[-2.8,4.4,5.4];tail['size']=[5.6,.6,1.8]
    elif name=='foe_3_9':
        # Frost bird: tall narrow upright body and long close-folded wing
        # tips, in contrast to the heavy, short-winged owl.
        body=by['f3_9_body']['cubes'][0]
        body['origin']=[-2.4,2.5,-2.3];body['size']=[4.8,6,5.5]
        for side,dx in (('l',.3),('r',-.3)):
            for suffix in ('wing_'+side,'wing_'+side+'_tip'):
                b=by['f3_9_'+suffix];b['pivot'][0]+=dx
                for cube in b['cubes']:cube['origin'][0]+=dx
            tip=by[f'f3_9_wing_{side}_tip']['cubes'][0]
            tip['origin'][1]=2.1;tip['size'][1]=2.2
    elif name=='foe_2_0':
        # Burrowing beetle: narrow, long plough shell, forward drill and
        # wide front digging claws rather than the red breaker's paired horns.
        for side,x in (('l',-3.1),('r',0)):
            shell=by[f'f2_0_shell_{side}']['cubes']
            shell[0]['origin']=[x,5.4,-2.5];shell[0]['size']=[3.1,.9,7.2]
            shell[1]['origin']=[x+.3 if side=='l' else 0,6,-1.8];shell[1]['size']=[2.8,.6,5.6]
        drill=by['f2_0_drill']['cubes']
        drill[0]['origin']=[-1.2,2.8,-7];drill[0]['size']=[2.4,1.4,2.6]
        drill[1]['origin']=[-.7,3,-9];drill[1]['size']=[1.4,1,2.3]
        for i in (0,1):
            claw=by[f'f2_0_claw_{i}']['cubes'][1];x=-5.4 if i==0 else 5.4
            claw['origin']=[x-1.15,0,-3.3];claw['size']=[2.3,.5,2.1]
    elif name=='foe_2_2':
        # A charging, forward-pointing horn and articulated narrow bracers
        # distinguish this lancer from the broad, heavy stone-breaker.
        horn=by['f2_2_nose_horn']['cubes']
        horn[0]['origin']=[-.7,14.4,-4.5];horn[0]['size']=[1.4,1.6,2.5]
        horn[1]['origin']=[-.35,14.7,-6.4];horn[1]['size']=[.7,1,2.1]
        for side,x in (('l',-6.4),('r',3.7)):
            arm=by[f'f2_2_forearm_{side}']['cubes']
            arm[0]['origin']=[x,3.9,-2];arm[0]['size']=[2.7,3.3,4]
            arm[1]['origin']=[x-.1,3.7,-2.3];arm[1]['size']=[2.9,1,4.6]
    elif name=='foe_2_3':
        # Red layer-breaker: broad domed shell, paired forward horns and
        # heavier middle legs, contrasting with the narrow drilling beetle.
        for side,x in (('l',-4.4),('r',0)):
            shell=by[f'f2_3_shell_{side}']['cubes']
            shell[0]['origin']=[x,6,-2.3];shell[0]['size']=[4.4,1.2,6.4]
            shell[1]['origin']=[x+.5 if side=='l' else 0,7,-1.4];shell[1]['size']=[3.9,1,4.6]
        for i in (2,3):
            sign=-1 if i==2 else 1
            leg=by[f'f2_3_leg_{i}'];claw=by[f'f2_3_claw_{i}']
            leg['cubes'][0]['origin'][0]=-6.3 if sign<0 else 3.1
            leg['cubes'][0]['size'][0]=3.2;claw['pivot'][0]+=sign*.9
            for cube in claw['cubes']:cube['origin'][0]+=sign*.9
    elif name=='foe_2_4':
        # Low sand runner: long narrow body, a three-joint tail and four
        # separately hinged pads for the small lizard-like stance.
        body=by['f2_4_body']['cubes'][0]
        body['origin']=[-2.1,2.5,-3.2];body['size']=[4.2,2.8,7.9]
        for i,(x,z) in enumerate(((-1.8,-1.7),(1.8,-1.7),(-1.8,3),(1.8,3))):
            leg=by[f'f2_4_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f2_4_pad_{i}','parent':leg['name'],
                          'pivot':[x,.5,z],'cubes':[foot]})
    elif name=='foe_2_5':
        # Hot-wind spore bird carries broad rounded wing panels and a fan;
        # the other desert flier keeps its narrow swept rear wings.
        for side,x in (('l',-6.3),('r',2)):
            wing=by[f'f2_5_wing_{side}']['cubes']
            wing[0]['origin']=[x,5.2,-2.8];wing[0]['size']=[4.3,1,6]
            wing[1]['origin']=[x,4.9,2.6];wing[1]['size']=[4.3,.5,1.2]
            tip=by[f'f2_5_wing_{side}_tip'];tip['pivot'][0]=-6 if side=='l' else 6
            xx=-9.2 if side=='l' else 5.9
            tip['cubes'][0]['origin']=[xx,5.1,-2];tip['cubes'][0]['size']=[3.3,.8,5.4]
            tip['cubes'][1]['origin']=[xx,4.9,2.9];tip['cubes'][1]['size']=[3.2,.5,1.1]
    elif name=='foe_2_6':
        # Dune web spider: flat wide abdomen, long central legs, two jaws
        # and a shorter stout spinner. Each jaw keeps its painted face UVs.
        abdomen=by['f2_6_body']['cubes'][1]
        abdomen['origin']=[-4,2.4,2];abdomen['size']=[8,3.7,5.5]
        for i in (2,3,4,5):
            sign=-1 if i%2==0 else 1
            leg=by[f'f2_6_leg_{i}'];tip=by[f'f2_6_leg_tip_{i}']
            leg['cubes'][0]['origin'][0]=-6.1 if sign<0 else 2.7
            leg['cubes'][0]['size'][0]=3.4;tip['pivot'][0]+=sign
            for cube in tip['cubes']:cube['origin'][0]+=sign
        head=by['f2_6_head'];right=head['cubes'].pop();left=head['cubes'].pop()
        for side,cube,x in (('l',left,-1.9),('r',right,.9)):
            bones.append({'name':f'f2_6_jaw_{side}','parent':head['name'],
                          'pivot':[x+.5,2.8,-4.7],'cubes':[cube]})
    elif name=='foe_2_9':
        # Mirage tracker: narrow legs with jointed paws, a pointed head and
        # a two-part narrow brush, unlike the flat four-pad sand runner.
        for i,(x,z) in enumerate(((-1.8,-1.8),(1.8,-1.8),(-1.8,3.5),(1.8,3.5))):
            leg=by[f'f2_9_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f2_9_paw_{i}','parent':leg['name'],
                          'pivot':[x,.7,z],'cubes':[foot]})
    elif name=='foe_2_11':
        # The rock-breaking brute has broad low hammer fists, rather than
        # the charging lancer's narrower bracers and central forward horn.
        for side,x in (('l',-7.5),('r',4.1)):
            fore=by[f'f2_11_forearm_{side}']['cubes']
            fore[0]['origin']=[x,3.6,-2.6];fore[0]['size']=[3.4,3.6,5.2]
            fore[1]['origin']=[x-.15,3.4,-2.8];fore[1]['size']=[3.7,1.2,5.6]
    elif name=='foe_3_6':
        # Frozen lake web-spinner: narrow extended abdomen, spread rear legs,
        # ice-claw feet and paired independently hinged jaws.
        body=by['f3_6_body']['cubes'][1]
        body['origin']=[-2.8,2.5,2];body['size']=[5.6,3.8,6.8]
        spindle=by['f3_6_spindle'];spindle['pivot'][2]+=1.1
        for cube in spindle['cubes']:cube['origin'][2]+=1.1
        for i in (4,5,6,7):
            sign=-1 if i%2==0 else 1
            leg=by[f'f3_6_leg_{i}'];tip=by[f'f3_6_leg_tip_{i}']
            leg['cubes'][0]['origin'][0]=-6.4 if sign<0 else 2.8
            leg['cubes'][0]['size'][0]=3.6;tip['pivot'][0]+=sign*1.2
            for cube in tip['cubes']:cube['origin'][0]+=sign*1.2
            foot=tip['cubes'][1];foot['origin'][2]-=.25;foot['size'][2]=1.9
        head=by['f3_6_head'];right=head['cubes'].pop();left=head['cubes'].pop()
        for side,cube,x in (('l',left,-2),('r',right,1)):
            bones.append({'name':f'f3_6_jaw_{side}','parent':head['name'],
                          'pivot':[x+.5,2.9,-4.6],'cubes':[cube]})
    elif name=='foe_4_6':
        # Thunder web-spinner: broad low body and extended front limbs;
        # split the rear electrode from the spinner so it can articulate.
        body=by['f4_6_body']['cubes'][1]
        body['origin']=[-4.1,2.4,2];body['size']=[8.2,3.9,4.8]
        for i in (0,1,2,3):
            sign=-1 if i%2==0 else 1
            leg=by[f'f4_6_leg_{i}'];tip=by[f'f4_6_leg_tip_{i}']
            leg['cubes'][0]['origin'][0]=-6.6 if sign<0 else 2.8
            leg['cubes'][0]['size'][0]=3.8;tip['pivot'][0]+=sign*1.4
            for cube in tip['cubes']:cube['origin'][0]+=sign*1.4
        spinner=by['f4_6_spinner'];spinner['pivot'][2]-=.3
        spinner['cubes'][0]['origin'][2]-=.3;electrode=spinner['cubes'].pop()
        electrode['origin']=[-.65,3.5,8.4];electrode['size']=[1.3,1,2.5]
        bones.append({'name':'f4_6_electrode','parent':spinner['name'],
                      'pivot':[0,4,8.5],'cubes':[electrode]})
    elif name=='foe_3_7':
        # Snow hare: compact deep body, short wide ears and broad snowshoe
        # hind feet, each on its own child joint.
        body=by['f3_7_body']['cubes'][0]
        body['origin']=[-3,2.5,-2.5];body['size']=[6,4.3,6.3]
        tail=by['f3_7_tail'];tail['pivot'][2]=3.8
        tail['cubes'][0]['origin'][2]=3.7
        for side,x in (('l',-1.9),('r',.5)):
            ear=by[f'f3_7_ear_{side}']['cubes']
            ear[0]['origin'][0]=x;ear[0]['size']=[1.4,3.3,1.4]
            ear[1]['origin'][0]=x+.2;ear[1]['size']=[1,2.2,.3]
        for i,x in ((2,-1.9),(3,1.9)):
            leg=by[f'f3_7_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-1.2,0,1.4];foot['size']=[2.4,.8,2.7]
            bones.append({'name':f'f3_7_hock_{i}','parent':leg['name'],'pivot':[x,.8,2.8],'cubes':[foot]})
    elif name=='foe_4_7':
        # Ridge hare: slender body and swept ears, with long runner feet
        # hinged separately from the thick thighs of the snow hare.
        body=by['f4_7_body']['cubes'][0]
        body['origin']=[-2.3,2.5,-2.9];body['size']=[4.6,4.3,7.6]
        for side,angle in (('l',18),('r',-18)):
            by[f'f4_7_ear_{side}']['rotation']=[0,0,angle]
        for i,x in ((2,-1.9),(3,1.9)):
            leg=by[f'f4_7_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-.8,0,1.1];foot['size']=[1.6,.8,3]
            bones.append({'name':f'f4_7_hock_{i}','parent':leg['name'],'pivot':[x,.8,2.8],'cubes':[foot]})
    elif name=='foe_5_7':
        # Crystal burrower: squat body, asymmetric short ears and substantial
        # digging forefeet. Hind feet articulate separately from the thighs.
        body=by['f5_7_body']['cubes'][0]
        body['origin']=[-3,2,-2.7];body['size']=[6,4.2,6.8]
        for side,height in (('l',3.7),('r',2.9)):
            ear=by[f'f5_7_ear_{side}']['cubes']
            ear[0]['size'][1]=height;ear[1]['size'][1]=height-1
        for i,x in ((0,-1.5),(1,1.5)):
            foot=by[f'f5_7_leg_{i}']['cubes'][1]
            foot['origin']=[x-1,0,-2.7];foot['size']=[2,.7,2.3]
        for i,x in ((2,-1.7),(3,1.7)):
            leg=by[f'f5_7_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-.9,0,1.4];foot['size']=[1.8,.7,2.3]
            bones.append({'name':f'f5_7_hock_{i}','parent':leg['name'],'pivot':[x,.7,2.8],'cubes':[foot]})
    elif name in ('foe_0_3','foe_0_6'):
        # Feet were added at y=0 before the legacy +/-18 degree bone tilt.
        # That tilt drives the new outer feet below ground in the rest pose.
        # Level the existing leg bones instead; keep their UVs and animation IDs.
        count=6 if name=='foe_0_3' else 8
        for i in range(count):by[f'f0_{name.rsplit("_",1)[1]}_leg_{i}']['rotation']=[0,0,0]
    elif name=='foe_0_10':
        # Give the blade beast actual articulated forearms, distinct from the
        # bramble soldier's single-piece arms. Reuse two redundant body cubes
        # (and their existing atlas rectangles) for the lower arms.
        body=by['f0_10_body'];assert len(body['cubes'])==4
        donor=[body['cubes'].pop(),body['cubes'].pop()]
        for side,cube in zip(('l','r'),donor):
            arm=by[f'f0_10_arm_{side}'];blade=by[f'f0_10_arm_{side}_detail_blade']
            x=-8 if side=='l' else 5
            upper=arm['cubes'][0];upper['origin']=[x,9,-2];upper['size']=[3,5,4]
            cube['origin']=[x,5,-2];cube['size']=[3,4.2,4]
            forearm={'name':f'f0_10_forearm_{side}','parent':arm['name'],
                     'pivot':[-6.5 if side=='l' else 6.5,9,0],'cubes':[cube]}
            blade['parent']=forearm['name'];bones.insert(bones.index(blade),forearm)
    elif name=='foe_0_11':
        # Slender legs for the thin-wing creature, instead of the shadow
        # runner's inherited broad square legs. Existing leg tracks still bind.
        for i,(x,z) in enumerate(((-1.2,-1.25),(1.2,-1.25),(-1.2,2.25),(1.2,2.25))):
            leg=by[f'f0_11_leg_{i}'];width=.9 if i<2 else 1.1
            leg['pivot']=[x,3,z]
            leg['cubes'][0]['origin']=[x-width/2,0,z-width/2]
            leg['cubes'][0]['size']=[width,3.2,width]
    elif name=='foe_1_0':
        # Mist fox: compact chest, a longer pointed muzzle and a two-part tail;
        # the indigo hunter has a longer, three-part taper.
        muzzle=by['f1_0_head']['cubes'][1]
        muzzle['origin']=[-.8,5,-7.8];muzzle['size']=[1.6,1.3,2.2]
        fan=by['f1_0_tail_fan']['cubes']
        fan[0]['origin']=[-1.6,4.6,6.8];fan[0]['size']=[3.2,2.8,3.6]
        fan[1]['origin']=[-1.2,4.8,10.1];fan[1]['size']=[2.4,2.4,2]
        for i,x in ((0,-1.7),(1,1.7)):
            foot=by[f'f1_0_leg_{i}']['cubes'][1]
            foot['origin']=[x-.9,0,-3];foot['size']=[1.8,.9,1.9]
    elif name=='foe_1_6':
        # The white web spider reaches forward with a much wider first pair;
        # keep each animated leg and tip, moving their pivots with the joint.
        for i,sign in ((0,-1),(1,1)):
            leg=by[f'f1_6_leg_{i}'];tip=by[f'f1_6_leg_tip_{i}']
            leg['cubes'][0]['origin'][0]=-6.2 if sign<0 else 2.7
            leg['cubes'][0]['size'][0]=3.5
            tip['pivot'][0]=sign*6
            for cube in tip['cubes']:cube['origin'][0]+=sign*1.2
        spindle=by['f1_6_spindle']['cubes']
        spindle[0]['origin']=[-1.8,3.1,6.7];spindle[0]['size']=[3.6,2,2.3]
        spindle[1]['origin']=[-1.1,3.5,8.5];spindle[1]['size']=[2.2,1.2,2.1]
    elif name=='foe_1_11':
        # The sewing spider has a narrow long abdomen and a wide rear stance,
        # unlike the white web spider's broad abdomen and extended front pair.
        abdomen=by['f1_11_body']['cubes'][1]
        abdomen['origin']=[-2.6,2.5,2];abdomen['size']=[5.2,3.9,6.5]
        needle=by['f1_11_needle'];needle['pivot'][2]+=1.2
        for cube in needle['cubes']:cube['origin'][2]+=1.2
        for i in (6,7):
            sign=-1 if i==6 else 1
            leg=by[f'f1_11_leg_{i}'];tip=by[f'f1_11_leg_tip_{i}']
            leg['cubes'][0]['origin'][0]=-6.6 if sign<0 else 2.6
            leg['cubes'][0]['size'][0]=4
            tip['pivot'][0]+=sign*1.4
            for cube in tip['cubes']:cube['origin'][0]+=sign*1.4
        # Separate the sewing spider's fangs from its head as paired jaws.
        head=by['f1_11_head'];assert len(head['cubes'])==3
        right=head['cubes'].pop();left=head['cubes'].pop()
        for side,cube,x in (('l',left,-1.6),('r',right,.8)):
            cube['origin']=[x,1.8,-5.7];cube['size']=[1.4,1.4,1.8]
            bones.append({'name':f'f1_11_fang_{side}','parent':head['name'],
                          'pivot':[x+.7,2.8,-4.3],'cubes':[cube]})
    elif name=='foe_2_1':
        # Pursuit hare is a slim long-bodied runner with individually hinged
        # hind feet, contrasted with the low, broad hourglass burrower.
        body=by['f2_1_body']['cubes'][0]
        body['origin']=[-2.25,2.5,-2.8];body['size']=[4.5,4.3,7.6]
        for i,x in ((2,-1.8),(3,1.8)):
            leg=by[f'f2_1_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-.9,0,1.4];foot['size']=[1.8,.8,2.4]
            bones.append({'name':f'f2_1_hock_{i}','parent':leg['name'],
                          'pivot':[x,.7,2.6],'cubes':[foot]})
    elif name=='foe_2_7':
        # Burrowing hourglass hare: a low, broad digging stance and paired
        # articulated hind feet, rather than the pursuit hare's same four legs.
        body=by['f2_7_body']['cubes'][0]
        body['origin']=[-3.1,2.5,-2.5];body['size']=[6.2,4.2,6.9]
        for i,x in ((2,-1.8),(3,1.8)):
            leg=by[f'f2_7_leg_{i}'];foot=leg['cubes'].pop()
            leg['cubes'][0]['origin']=[x-1.1,.6,2.1]
            leg['cubes'][0]['size']=[2.2,2.5,1.6]
            foot['origin']=[x-1.25,0,1.2];foot['size']=[2.5,.8,2.8]
            bones.append({'name':f'f2_7_hock_{i}','parent':leg['name'],
                          'pivot':[x,.7,2.5],'cubes':[foot]})
        for i,x in ((0,-1.7),(1,1.7)):
            foot=by[f'f2_7_leg_{i}']['cubes'][1]
            foot['origin']=[x-.9,0,-2.9];foot['size']=[1.8,.8,2.3]
    elif name=='foe_2_8':
        # The crowned shell king has a broad, hinged shovel-like jaw rather
        # than another fixed narrow beetle snout.
        head=by['f2_8_head'];assert len(head['cubes'])==2
        jaw=head['cubes'].pop();jaw['origin']=[-1.6,3,-8.2];jaw['size']=[3.2,1.5,3]
        bones.append({'name':'f2_8_jaw','parent':head['name'],
                      'pivot':[0,3.8,-5.6],'cubes':[jaw]})
    elif name=='foe_2_10':
        # The scorching sand wing has a shorter, deeper wing with a swept
        # rear edge rather than the spore bird's nearly identical long wing.
        for side,x in (('l',-8.8),('r',5.9)):
            tip=by[f'f2_10_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,5.5,-.5];tip[0]['size']=[2.9,.9,5.2]
            tip[1]['origin']=[x,5.2,3.8];tip[1]['size']=[2.9,.5,1.3]
        tail=by['f2_10_tail']['cubes']
        tail[0]['origin']=[-1.5,4.6,3.2];tail[0]['size']=[3,.8,4]
        tail[1]['origin']=[-1.8,4.3,6.5];tail[1]['size']=[3.6,.6,2.5]
    elif name=='foe_3_3':
        # Ice breaker has a wide low chisel rather than the core beetle's
        # narrow pointed snout. Reuse the original snout's UV allocation.
        head=by['f3_3_head'];chisel=head['cubes'].pop()
        chisel['origin']=[-2.2,2.7,-7.4];chisel['size']=[4.4,1.1,2.3]
        bones.append({'name':'f3_3_chisel','parent':head['name'],
                      'pivot':[0,3.3,-5.3],'cubes':[chisel]})
    elif name=='foe_3_4':
        # Mirror fox: broad front stance and narrow, extended muzzle rather
        # than a recolored neutral fox; keep the existing three tail joints.
        muzzle=by['f3_4_head']['cubes'][1]
        muzzle['origin']=[-.8,5.5,-8.1];muzzle['size']=[1.6,1.3,2.3]
        for i,x in ((0,-1.7),(1,1.7)):
            foot=by[f'f3_4_leg_{i}']['cubes'][1]
            foot['origin']=[x-1,0,-3.1];foot['size']=[2,.8,2.1]
        tail=by['f3_4_tail_tip']['cubes']
        tail[0]['origin']=[-1.7,4.5,9.4];tail[0]['size']=[3.4,3.1,2.5]
        tail[1]['origin']=[-1.4,4.7,11.5];tail[1]['size']=[2.8,2.7,1.3]
    elif name=='foe_3_10':
        # Avalanche claw beast: heavier front paws make its stance distinct
        # from the similarly built neutral ice wolf without changing its box.
        for i,x in ((0,-2),(1,2)):
            foot=by[f'f3_10_paw_{i}']['cubes'][1]
            foot['origin']=[x-1.4,0,-4.8];foot['size']=[2.8,.9,3.3]
    elif name=='foe_3_11':
        # The crystal-core beetle has a longer faceted shell and a broad,
        # low core, contrasting with the compact ice-breaking beetle.
        body=by['f3_11_body']['cubes'][0]
        body['origin']=[-3.5,2,-3.5];body['size']=[7,3.6,9.2]
        for side,x in (('l',-3.8),('r',0)):
            shell=by[f'f3_11_shell_{side}']['cubes']
            shell[0]['origin']=[x,6,-3];shell[0]['size']=[3.8,1,8]
            shell[1]['origin']=[-3.3 if side=='l' else .1,6.8,-2.5]
            shell[1]['size']=[3.2,.7,6.5]
        core=by['f3_11_core']['cubes']
        core[0]['origin']=[-1.8,7.3,-.8];core[0]['size']=[3.6,1.7,3.6]
        core[1]['origin']=[-1,8.8,-.1];core[1]['size']=[2,1.5,2.2]
    elif name=='foe_4_0':
        # Long low fists and separately hinged feet distinguish the storm rock
        # giant's anatomy from the neutral stone statue of the same realm.
        for side in ('l','r'):
            fist=by[f'f4_0_fist_{side}']
            fist['cubes'][0]['origin'][1]=2.5;fist['cubes'][0]['size'][1]=4.8
            fist['cubes'][1]['origin'][1]=2.4
        for i,x in ((0,-2.3),(1,2.3)):
            leg=by[f'f4_0_leg_{i}'];foot=leg['cubes'].pop()
            bones.append({'name':f'f4_0_foot_{i}','parent':leg['name'],
                          'pivot':[x,1,0],'cubes':[foot]})
    elif name=='foe_4_2':
        # Rock-breaker carries asymmetrically heavy fists: unlike the neutral
        # rock soldier, both arms have separate hands and the left is broader.
        fist=by['f4_2_fist_l']['cubes']
        fist[0]['origin']=[-9,3.2,-2.8];fist[0]['size']=[4.7,4.2,5.6]
        fist[1]['origin']=[-9.1,3.1,-2.9];fist[1]['size']=[4.9,1.2,5.8]
        foot=by['f4_2_leg_0']['cubes'][1]
        foot['origin']=[-4,0,-2.4];foot['size']=[3.3,1,4.2]
    elif name=='foe_4_5':
        # Shorter, swept-back outer wings and a deeper body make the
        # conductor bird distinct from the long-winged discharge bird.
        body=by['f4_5_body']['cubes'][0]
        body['origin']=[-2.5,3.1,-2.6];body['size']=[5,5.3,6.4]
        for side,x in (('l',-8.5),('r',5.8)):
            tip=by[f'f4_5_wing_{side}_tip']['cubes']
            tip[0]['origin']=[x,5.7,-.5];tip[0]['size']=[2.7,.8,4.5]
            tip[1]['origin']=[x,5.4,3.2];tip[1]['size']=[2.7,.5,1.2]
    elif name=='foe_5_3':
        # A shell king needs a broad paired mandible, not the wild beetle's
        # small single snout. Retain the two original UV allocations.
        head=by['f5_3_head'];right=head['cubes'].pop();left=head['cubes'].pop()
        for side,cube,x in (('l',left,-2.4),('r',right,.8)):
            cube['origin']=[x,2,-8];cube['size']=[1.6,1.4,2.8]
            bones.append({'name':f'f5_3_mandible_{side}','parent':head['name'],
                          'pivot':[x+.8,2.8,-5.6],'cubes':[cube]})
        for side,x in (('l',-4.3),('r',0)):
            panel=by[f'f5_3_shell_{side}']['cubes'][0]
            panel['origin']=[x,6,-2.6];panel['size']=[4.3,1.2,7.5]
    elif name=='foe_5_9':
        # The eye spider's head and turret form a low, wide viewing face,
        # instead of the taller mushroom spider's similar overall silhouette.
        head=by['f5_9_head']['cubes']
        head[0]['origin']=[-3.2,2.1,-5.4];head[0]['size']=[6.4,3.3,3.2]
        head[1]['origin']=[-2.5,2.6,-5.9];head[1]['size']=[5,2.3,.7]
        turret=by['f5_9_eye_turret']['cubes']
        turret[0]['origin']=[-2.1,5.2,-.2];turret[0]['size']=[4.2,1.4,2.8]
        turret[1]['origin']=[-1.3,6.4,.4];turret[1]['size']=[2.6,1.3,1.6]
    elif name=='foe_6_4':
        # The wind-ring hunter is a ground stalker, not the cloud glider with
        # its wings removed: longer forelegs, narrow hind legs and a tapered tail.
        for i,x in ((0,-1.7),(1,1.7)):
            leg=by[f'f6_4_leg_{i}'];leg['cubes'][0]['origin']=[x-.8,.5,-2.55]
            leg['cubes'][0]['size']=[1.6,4.2,1.4]
            leg['cubes'][1]['origin']=[x-1,0,-3.3];leg['cubes'][1]['size']=[2,.7,2.3]
        for i,x in ((2,-1.7),(3,1.7)):
            leg=by[f'f6_4_leg_{i}'];leg['cubes'][0]['origin']=[x-.45,.5,3.15]
            leg['cubes'][0]['size']=[.9,4.2,1.1]
        tail=by['f6_4_tail_tip']['cubes']
        tail[0]['origin']=[-1.1,5.6,7.4];tail[0]['size']=[2.2,1.4,3.4]
        tail[1]['origin']=[-.6,5.4,10.5];tail[1]['size']=[1.2,.8,2]
    elif name=='foe_6_5':
        # The spore carrier has broad, deep inboard wings and short outer
        # feathers; the neutral cloud bird retains long narrow wings.
        for side,x in (('l',-6.2),('r',2)):
            wing=by[f'f6_5_wing_{side}']['cubes']
            wing[0]['origin']=[x,5.9,-2.4];wing[0]['size']=[4.2,.8,6.1]
            wing[1]['origin']=[x,5.6,3];wing[1]['size']=[4.2,.5,1.4]
            tip=by[f'f6_5_wing_{side}_tip']['cubes']
            tip[0]['origin']=[-8.5 if side=='l' else 5.7,5.8,-.8]
            tip[0]['size']=[2.8,.7,4.9]
            tip[1]['origin']=[-8.5 if side=='l' else 5.7,5.5,3.5]
            tip[1]['size']=[2.8,.5,1.2]
    elif name=='foe_6_7':
        # Wind-running hare: slim long body and swept, asymmetric ears rather
        # than the compact, upright-eared stopping-line station hare.
        body=by['f6_7_body']['cubes'][0]
        body['origin']=[-2.25,2,-2.6];body['size']=[4.5,4.1,7.1]
        for side,angle in (('l',12),('r',-9)):
            by[f'f6_7_ear_{side}']['rotation']=[0,0,angle]
        # Long hind feet and higher haunches distinguish the running hare
        # from the similarly proportioned wind beast and its short paws.
        for i,x in ((2,-1.7),(3,1.7)):
            leg=by[f'f6_7_leg_{i}'];foot=leg['cubes'].pop()
            leg['cubes'][0]['origin']=[x-.85,.5,2.05]
            leg['cubes'][0]['size']=[1.7,2.6,1.6]
            foot['origin']=[x-.95,0,1.25];foot['size']=[1.9,.7,2.5]
            bones.append({'name':f'f6_7_hock_{i}','parent':leg['name'],
                          'pivot':[x,.7,2.6],'cubes':[foot]})
    elif name=='foe_6_11':
        # Compact wind beast: distinct hind hocks and broad hind feet, using
        # its existing foot cubes instead of generating any new texture.
        for i,x in ((2,-1.5),(3,1.5)):
            leg=by[f'f6_11_leg_{i}'];foot=leg['cubes'].pop()
            foot['origin']=[x-.9,0,1.25];foot['size']=[1.8,.7,2.2]
            bones.append({'name':f'f6_11_hock_{i}','parent':leg['name'],
                          'pivot':[x,.5,2.6],'cubes':[foot]})
    elif name=='foe_7_8':
        # The faceless defender is low and broad with heavy articulated hands,
        # rather than the silent station soldier's tall rectangular outline.
        body=by['f7_8_body']['cubes'][0]
        body['origin']=[-3.9,4,-2.6];body['size']=[7.8,7,5.2]
        for side,x in (('l',-6),('r',3.5)):
            hand=by[f'f7_8_hand_{side}']['cubes'][0]
            hand['origin']=[x,3.5,-1.7];hand['size']=[2.5,1.6,3.4]
    elif name=='foe_7_11':
        # A broad folded wing with a pointed lower tip gives the station bird
        # an upright silhouette distinct from the airborne station spore wing.
        for side,x in (('l',-4.4),('r',2.3)):
            wing=by[f'f7_11_wing_{side}']['cubes'][0]
            wing['origin']=[x,3.7,-1.7];wing['size']=[2.1,3.8,4.2]
            tip=by[f'f7_11_wing_{side}_tip']['cubes'][0]
            tip['origin']=[-4.1 if side=='l' else 2.7,2.3,-.2]
            tip['size']=[1.4,1.8,3.3]
    elif name=='foe_7_7':
        # The hostile station hare gets heavier hindquarters and a real hock
        # joint, rather than the same four simple legs as the neutral rabbit.
        for i,x in ((2,-1.7),(3,1.7)):
            leg=by[f'f7_7_leg_{i}'];foot=leg['cubes'].pop();upper=leg['cubes'][0]
            upper['origin']=[x-.9,.5,2.05];upper['size']=[1.8,2.6,1.5]
            foot['origin']=[x-1.1,0,1.0];foot['size']=[2.2,.7,2.6]
            bones.append({'name':f'f7_7_hock_{i}','parent':leg['name'],
                          'pivot':[x,.5,2.8],'cubes':[foot]})
    return model


def refine_baked(name, outputs):
    """Refine only the geometry payload, leaving every PNG byte untouched."""
    path=next(p for p in outputs if p.name==name+'.geo.json')
    obj=json.loads(outputs[path]);refine_model(name,obj['minecraft:geometry'][0])
    outputs[path]=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
    return outputs
