"""
The three objects on the landing page's cards, in the hero's light:
a coil of real strands (your curl pattern), an afro pick (a stylist), a jar (what works).

  blender -b -P web/scripts/hero/props.py -- --out <dir> [--size 800] [--samples 128]

Writes <dir>/prop-coil.png, prop-pick.png and prop-jar.png (RGBA, transparent).
"""
import argparse
import math
import os
import sys

import bpy
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from stage import camera, light, principled, setup  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
ap.add_argument('--size', type=int, default=800)
ap.add_argument('--samples', type=int, default=128)
args = ap.parse_args(argv)
rng = np.random.default_rng(5)


def smooth_all(ob):
    for poly in ob.data.polygons:
        poly.use_smooth = True


def bevel(ob, width, segments=6):
    m = ob.modifiers.new('Bevel', 'BEVEL')
    m.width, m.segments, m.limit_method = width, segments, 'ANGLE'
    smooth_all(ob)


def hair_material():
    hm = bpy.data.materials.new('Hair')
    hm.use_nodes = True
    nt = hm.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    hb = nt.nodes.new('ShaderNodeBsdfHairPrincipled')
    hb.model, hb.parametrization = 'CHIANG', 'MELANIN'
    hb.inputs['Melanin'].default_value = 1.0
    hb.inputs['Melanin Redness'].default_value = 0.6
    hb.inputs['Roughness'].default_value = 0.32
    hb.inputs['Radial Roughness'].default_value = 0.4
    hb.inputs['Random Color'].default_value = 0.06
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(hb.outputs[0], out.inputs['Surface'])
    return hm


def coil():
    """A 4C coil: hundreds of strands twisted around a tight helix, springing upward."""
    n, pts = 900, 180
    t = np.linspace(0, 1, pts)
    turns, R, H = 5, 0.024, 0.165
    ang = 2 * np.pi * turns * t
    center = np.stack([R * (1 - 0.25 * t) * np.cos(ang), R * (1 - 0.25 * t) * np.sin(ang), H * t - H / 2], 1)
    tangent = np.gradient(center, axis=0)
    tangent /= np.linalg.norm(tangent, axis=1)[:, None]
    up = np.array([0, 0, 1.0])
    nrm = np.cross(tangent, up)
    nrm /= np.linalg.norm(nrm, axis=1)[:, None]
    bin_ = np.cross(tangent, nrm)
    # the bundle gathers to a point at the root and frays to a fine tip
    ends = np.clip(t / 0.06, 0, 1) ** 0.5 * np.clip((1 - t) / 0.12, 0, 1) ** 0.6
    r = 0.0062 * np.sqrt(rng.random(n))[:, None] * (0.45 + 0.55 * ends[None])
    phi = rng.uniform(0, 2 * np.pi, n)[:, None] + 2 * np.pi * 3 * t[None]   # strands twist around each other
    paths = center[None] + r[..., None] * (np.cos(phi)[..., None] * nrm[None] + np.sin(phi)[..., None] * bin_[None])
    paths += rng.normal(0, 0.0004, paths.shape) * (0.3 + t[None, :, None])     # a little frizz, more toward the tip
    cd = bpy.data.hair_curves.new('Coil')
    cd.add_curves([pts] * n)
    cd.position_data.foreach_set('vector', paths.astype(np.float32).ravel())
    rad = cd.attributes.get('radius') or cd.attributes.new('radius', 'FLOAT', 'POINT')
    rad.data.foreach_set('value', np.tile(np.linspace(0.00028, 0.00012, pts), n).astype(np.float32))
    cd.materials.append(hair_material())
    ob = bpy.data.objects.new('Coil', cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = (math.radians(12), math.radians(-18), 0)
    return [ob]


def pick():
    """An afro pick in Petal acrylic: a rounded handle and long rounded teeth."""
    acrylic, _ = principled('Acrylic', '#FF8FB8', 0.12, **{'Coat Weight': 0.6, 'Coat Roughness': 0.05,
                                                            'Subsurface Weight': 0.25})
    parts = []
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.035))
    handle = bpy.context.active_object
    handle.scale = (0.072, 0.012, 0.05)
    bevel(handle, 0.006)
    parts.append(handle)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.006))
    bar = bpy.context.active_object
    bar.scale = (0.078, 0.014, 0.012)
    bevel(bar, 0.004)
    parts.append(bar)
    for i in range(7):
        x = -0.033 + i * 0.011
        bpy.ops.mesh.primitive_cone_add(radius1=0.0034, radius2=0.0022, depth=0.105, vertices=32,
                                        location=(x, 0, 0.052))
        tooth = bpy.context.active_object
        smooth_all(tooth)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0022, location=(x, 0, 0.1045), segments=24, ring_count=12)
        tip = bpy.context.active_object
        smooth_all(tip)
        parts += [tooth, tip]
    for p in parts:
        p.data.materials.append(acrylic)
    rig = bpy.data.objects.new('Pick', None)
    bpy.context.scene.collection.objects.link(rig)
    for p in parts:
        p.parent = rig
    rig.location.z = -0.012
    rig.rotation_euler = (math.radians(8), math.radians(-16), math.radians(-24))
    return parts


def jar():
    """A jar of something that works: cream ceramic, an aubergine lid, an amber band. No label."""
    ceramic, _ = principled('Ceramic', '#F3D6D6', 0.3, **{'Coat Weight': 0.5, 'Coat Roughness': 0.1})
    lid, _ = principled('Lid', '#2B0E1C', 0.18, **{'Coat Weight': 0.8, 'Coat Roughness': 0.05})
    band, _ = principled('Band', '#F4B860', 0.25, **{'Metallic': 1.0})
    bpy.ops.mesh.primitive_cylinder_add(radius=0.046, depth=0.055, vertices=128, location=(0, 0, -0.012))
    body = bpy.context.active_object
    bevel(body, 0.008, 8)
    body.data.materials.append(ceramic)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.048, depth=0.024, vertices=128, location=(0, 0, 0.028))
    top = bpy.context.active_object
    bevel(top, 0.007, 8)
    top.data.materials.append(lid)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.0468, minor_radius=0.0016, major_segments=128,
                                     minor_segments=16, location=(0, 0, 0.0155))
    ring = bpy.context.active_object
    smooth_all(ring)
    ring.data.materials.append(band)
    rig = bpy.data.objects.new('Jar', None)
    bpy.context.scene.collection.objects.link(rig)
    for p in (body, top, ring):
        p.parent = rig
    rig.scale = (1.3, 1.3, 1.3)
    rig.rotation_euler = (math.radians(14), 0, math.radians(-10))
    return [body, top, ring]


for name, build in (('coil', coil), ('pick', pick), ('jar', jar)):
    scene = setup(args.size, args.samples)
    build()
    light(scene, target=(0, 0, 0), scale=0.45)
    camera(scene, (0, -0.62, 0.05), (0, 0, 0.0))
    scene.render.filepath = os.path.join(args.out, f'prop-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('prop', name, flush=True)
