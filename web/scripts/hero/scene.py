"""
The landing page's hero: a mannequin bust in a bob that turns to look where the cursor is.
Rendered once, offline, as a turntable of frames the page scrubs through (see
web/src/features/home/components/Gaze.tsx), so nothing 3D runs in the visitor's browser.

  blender -b -P web/scripts/hero/scene.py -- --out <dir> [--size 1200] [--samples 160]
                                              [--angles=-60:60:2] [--only=0,60]

Writes <dir>/bob-<index>.png (RGBA, transparent background) for each angle.
Everything is built from code: the head, the strands of the bob, the knit, the light.
"""
import argparse
import math
import os
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True)
ap.add_argument('--size', type=int, default=1200)
ap.add_argument('--samples', type=int, default=160)
ap.add_argument('--angles', default='-60:60:2')
ap.add_argument('--only', default='')
ap.add_argument('--strands', type=int, default=70000)
args = ap.parse_args(argv)

rng = np.random.default_rng(11)

# ------------------------------------------------------------------ scene
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from stage import camera, light, principled, setup, srgb  # noqa: E402

scene = setup(args.size, args.samples)


# ------------------------------------------------------------------ the head
A = np.array([0.078, 0.094, 0.112])  # half width, depth, height


def head_point(d):
    """A unit direction (n,3) from the head's centre -> the surface point. Front is -Y."""
    d = np.atleast_2d(d)
    p = d * A
    x, y, z = d[:, 0], d[:, 1], d[:, 2]
    low = np.clip(-z, 0, 1) ** 1.6
    front = np.clip(-y, 0, 1)
    p[:, 0] *= 1 - 0.30 * low                                   # the jaw narrows
    p[:, 1] *= (1 - 0.10 * low) * (1 + 0.09 * np.clip(y, 0, 1) * np.clip(z + 0.3, 0, 1))  # skull bulges back
    p[:, 1] *= 1 - 0.10 * front ** 2                            # a flatter face
    p[:, 2] -= 0.014 * front * low                              # the chin comes down
    px, pz = p[:, 0], p[:, 2]
    f = front > 0.35
    # nose: a narrow bridge widening to the tip
    w = 0.0065 + 0.007 * np.clip((0.02 - pz) / 0.045, 0, 1)
    nose = 0.021 * np.exp(-(px / w) ** 2 - ((pz + 0.012) / 0.026) ** 2) * np.clip((pz + 0.04) / 0.012, 0, 1)
    lips = 0.006 * np.exp(-(px / 0.017) ** 2 - ((pz + 0.054) / 0.007) ** 2) \
        + 0.005 * np.exp(-(px / 0.015) ** 2 - ((pz + 0.068) / 0.006) ** 2) \
        - 0.0025 * np.exp(-(px / 0.016) ** 2 - ((pz + 0.061) / 0.0018) ** 2)
    chin = 0.006 * np.exp(-(px / 0.02) ** 2 - ((pz + 0.092) / 0.012) ** 2)
    # a sculptural mannequin: nose and chin only, no eyes or mouth to go uncanny
    p[:, 1] -= np.where(f, nose + 0.35 * lips + chin, 0) * front
    return p


def head_normal(d, eps=1e-3):
    d = np.atleast_2d(d)
    t1 = np.cross(d, np.array([0, 0, 1.0]) + 1e-6)
    t1 /= np.linalg.norm(t1, axis=1)[:, None]
    t2 = np.cross(d, t1)
    a = head_point(d + eps * t1) - head_point(d - eps * t1)
    b = head_point(d + eps * t2) - head_point(d - eps * t2)
    n = np.cross(a, b)
    n /= np.linalg.norm(n, axis=1)[:, None]
    return np.where((n * d).sum(1)[:, None] < 0, -n, n)


def sphere_mesh(name, rings=96, segs=192, fn=head_point, keep=None):
    """A UV sphere reshaped by fn; keep(d) -> bool mask of directions to keep."""
    th = np.linspace(0, math.pi, rings + 1)
    ph = np.linspace(0, 2 * math.pi, segs, endpoint=False)
    T, Ph = np.meshgrid(th, ph, indexing='ij')
    d = np.stack([np.sin(T) * np.cos(Ph), np.sin(T) * np.sin(Ph), np.cos(T)], -1).reshape(-1, 3)
    v = fn(d)
    faces = []
    for i in range(rings):
        for j in range(segs):
            a, b = i * segs + j, i * segs + (j + 1) % segs
            faces.append((a, b, b + segs, a + segs))
    if keep is not None:
        ok = keep(d)
        faces = [f for f in faces if all(ok[k] for k in f)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v.tolist(), [], faces)
    me.validate()
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def angles(d):
    """azimuth (0 = front, + = toward +X) and elevation, in degrees"""
    return np.degrees(np.arctan2(d[:, 0], -d[:, 1])), np.degrees(np.arcsin(np.clip(d[:, 2], -1, 1)))


def hairline(theta):
    return np.interp(np.abs(theta), [0, 35, 70, 100, 140, 180], [46, 40, 16, 2, -30, -36])


rig = bpy.data.objects.new('Rig', None)
scene.collection.objects.link(rig)

skin, skin_b = principled('Skin', '#3B2119', 0.42, **{'Subsurface Weight': 0.1, 'Coat Weight': 0.18, 'Coat Roughness': 0.3})
skin_b.inputs['Subsurface Radius'].default_value = (0.9, 0.35, 0.2)
skin_b.inputs['Subsurface Scale'].default_value = 0.004
head = sphere_mesh('Head')
head.data.materials.append(skin)
head.parent = rig

# neck: a lathe from inside the head down into the collar
prof = [(0.046, -0.05), (0.047, -0.11), (0.050, -0.14), (0.055, -0.17), (0.058, -0.20)]
verts, faces, segs = [], [], 96
for r, z in prof:
    for j in range(segs):
        a = 2 * math.pi * j / segs
        verts.append((r * math.cos(a), r * 1.06 * math.sin(a) + 0.014, z))
for i in range(len(prof) - 1):
    for j in range(segs):
        a, b = i * segs + j, i * segs + (j + 1) % segs
        faces.append((a, b, b + segs, a + segs))
me = bpy.data.meshes.new('Neck')
me.from_pydata(verts, [], faces)
for poly in me.polygons:
    poly.use_smooth = True
neck = bpy.data.objects.new('Neck', me)
scene.collection.objects.link(neck)
neck.data.materials.append(skin)
neck.parent = rig

# the cap under the hair: so no gap between strands ever shows skin
capm, _ = principled('Cap', '#0A0605', 0.75)
cap = sphere_mesh('Cap', fn=lambda d: head_point(d) + head_normal(d) * 0.0025,
                  keep=lambda d: angles(d)[1] > hairline(angles(d)[0]) + 2)
cap.data.materials.append(capm)
cap.parent = rig

# ------------------------------------------------------------------ the bob
# Every strand is built from arrays at once: (strands, points, xyz).
P = 30  # points per strand


def dirs(theta, elev):
    t, e = np.radians(theta), np.radians(elev)
    return np.stack([np.cos(e) * np.sin(t), -np.cos(e) * np.cos(t), np.sin(e)], -1)


def surf(theta, elev, lift):
    """Points `lift` metres off the scalp, at azimuths/elevations of any (same) shape."""
    shape = np.shape(elev)
    d = dirs(np.broadcast_to(theta, shape), elev).reshape(-1, 3)
    p = head_point(d) + head_normal(d) * np.broadcast_to(lift, shape).reshape(-1, 1)
    return p.reshape(shape + (3,))


def smooth(paths, passes=3):
    for _ in range(passes):
        inner = (paths[:, :-2] + 2 * paths[:, 1:-1] + paths[:, 2:]) / 4
        paths = np.concatenate([paths[:, :1], inner, paths[:, -1:]], 1)
    return paths


def resample(paths, n=P):
    out = np.empty((len(paths), n, 3))
    seg = np.linalg.norm(np.diff(paths, axis=1), axis=2)
    s = np.concatenate([np.zeros((len(paths), 1)), np.cumsum(seg, 1)], 1)
    for i in range(len(paths)):
        t = np.linspace(0, s[i, -1], n)
        for k in range(3):
            out[i, :, k] = np.interp(t, s[i], paths[i, :, k])
    return out


def bob(theta, elev, layer):
    """Hair falling from (theta, elev): over the skull at its layer, down to a blunt line, ends tucked."""
    th, ly = theta[:, None], layer[:, None]
    s = np.linspace(0, 1, 18)[None]
    E = elev[:, None] + (-8 - elev[:, None]) * s
    lift = 0.0025 + (0.004 + 0.018 * ly) * (0.35 + 0.65 * np.clip((80 - E) / 60, 0, 1))
    over = surf(th, E, lift)
    top = over[:, -1]
    rho0 = np.hypot(top[:, 0], top[:, 1] - 0.006)
    ux, uy = top[:, 0] / rho0, (top[:, 1] - 0.006) / rho0
    a = np.abs(theta)
    z_end = -0.112 - 0.016 * np.cos(np.radians(theta)) ** 2 * (a < 90) + 0.022 * (a > 120) * (a - 120) / 60
    s2 = np.linspace(0, 1, 13)[1:][None]
    rho = rho0[:, None] + 0.006 * np.sin(np.pi * s2) * (1 - s2) - 0.008 * s2 ** 3
    z = top[:, 2:3] + (z_end[:, None] - top[:, 2:3]) * s2
    k = np.linspace(0, 1, 5)[1:][None]
    rt = rho[:, -1:] - 0.009 * k ** 1.5
    zt = z_end[:, None] + 0.004 * k ** 2
    drop = np.stack([rho * ux[:, None], rho * uy[:, None] + 0.006, z], -1)
    tuck = np.stack([rt * ux[:, None], rt * uy[:, None] + 0.006, zt], -1)
    return np.concatenate([over, drop, tuck], 1)


def fringe(theta, elev, layer):
    """Front hair: forward over the crown, down the forehead, a blunt fringe at the brows."""
    th, ly = theta[:, None], layer[:, None]
    s = np.linspace(0, 1, 12)[None]
    E1 = elev[:, None] + (44 - elev[:, None]) * s
    over = surf(th * (1 - 0.1 * s), E1, 0.003 + 0.008 * ly)
    z_end = 0.030 + 0.042 * (theta / 62) ** 2
    e_end = np.degrees(np.arcsin(np.clip((z_end - 0.004) / 0.104, -1, 1)))[:, None]
    s2 = np.linspace(0, 1, 9)[1:][None]
    E2 = 44 + (e_end - 44) * s2
    down = surf(th * 0.9, E2, 0.004 + 0.007 * ly + 0.002 * s2)
    tip = down[:, -1:] + np.array([0, 0.0008, -0.001])
    return np.concatenate([over, down, tip], 1)


def scatter(m, seed):
    """m directions spread evenly over the sphere (a jittered Fibonacci spiral)."""
    i = np.arange(m) + 0.5
    phi = np.arccos(1 - 2 * i / m)
    gold = np.pi * (1 + 5 ** 0.5) * i + seed
    d = np.stack([np.sin(phi) * np.cos(gold), np.sin(phi) * np.sin(gold), np.cos(phi)], 1)
    d += rng.normal(0, 0.004, d.shape)
    return d / np.linalg.norm(d, axis=1)[:, None]


# roots over the scalp, twice as dense where the fringe grows
th, el = angles(scatter(int(args.strands * 2.1), 0))
keep = el > hairline(th)
th, el = th[keep], el[keep]
in_fringe = (np.abs(th) < 62) & (el > 36)
t2, e2 = angles(scatter(int(args.strands * 1.2), 1.7))
k2 = (np.abs(t2) < 62) & (e2 > 36)
fth, fel = np.concatenate([th[in_fringe], t2[k2]]), np.concatenate([el[in_fringe], e2[k2]])
bth, bel = th[~in_fringe], el[~in_fringe]
# strands rooted beside the fringe sweep back to the sides, never down the face
bth = np.where(np.abs(bth) < 60, np.sign(bth) * (60 + (np.abs(bth) - 56).clip(0) * 0.6), bth)
print('strands', len(fth) + len(bth), 'fringe', len(fth))

blayer = np.clip((bel - hairline(bth)) / (90 - hairline(bth)), 0, 1)
flayer = np.clip((fel - 38) / 52, 0, 1)
paths = np.concatenate([resample(smooth(bob(bth, bel, blayer))), resample(smooth(fringe(fth, fel, flayer)))])

# clumps: neighbouring strands gather toward their clump's guide, more toward the ends
C = 1200
centers = rng.choice(len(paths), C, replace=False)
roots = paths[:, 0]
cr = roots[centers]
owner = np.concatenate([((roots[k:k + 4000, None] - cr[None]) ** 2).sum(-1).argmin(1)
                        for k in range(0, len(roots), 4000)])
s = np.linspace(0, 1, P)[None, :, None]
paths = paths + (paths[centers[owner]] - paths) * 0.22 * s ** 1.4
# a little life: smooth waviness growing toward the tips, and a few flyaways
phase = rng.uniform(0, 2 * np.pi, (len(paths), 1, 3))
amp = 0.0005 + 0.0008 * (rng.random((len(paths), 1, 1)) < 0.01)
paths += amp * np.sin(s * np.pi * 2.2 + phase) * s

cd = bpy.data.hair_curves.new('Bob')
cd.add_curves([P] * len(paths))
cd.position_data.foreach_set('vector', paths.astype(np.float32).ravel())
rad = cd.attributes.get('radius') or cd.attributes.new('radius', 'FLOAT', 'POINT')
rad.data.foreach_set('value', np.tile(np.linspace(0.00013, 0.00007, P), len(paths)).astype(np.float32))
hair = bpy.data.objects.new('Bob', cd)
scene.collection.objects.link(hair)
hair.parent = rig

hm = bpy.data.materials.new('Hair')
hm.use_nodes = True
nt = hm.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
hb = nt.nodes.new('ShaderNodeBsdfHairPrincipled')
hb.model = 'CHIANG'
hb.parametrization = 'MELANIN'
hb.inputs['Melanin'].default_value = 1.0
hb.inputs['Melanin Redness'].default_value = 0.45
hb.inputs['Roughness'].default_value = 0.24
hb.inputs['Radial Roughness'].default_value = 0.35
hb.inputs['Coat'].default_value = 0.05
hb.inputs['Random Roughness'].default_value = 0.1
hb.inputs['Random Color'].default_value = 0.06
out = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(hb.outputs[0], out.inputs['Surface'])
cd.materials.append(hm)

# ------------------------------------------------------------------ shoulders and turtleneck (they stay still)
knit, kb = principled('Knit', '#4A0B26', 0.9, **{'Sheen Weight': 0.12, 'Sheen Roughness': 0.5})
kb.inputs['Sheen Tint'].default_value = srgb('#FF8FB8')
tex = knit.node_tree.nodes.new('ShaderNodeTexWave')
tex.wave_type = 'BANDS'
tex.bands_direction = 'X'
tex.inputs['Scale'].default_value = 55
tex.inputs['Distortion'].default_value = 1.2
bump = knit.node_tree.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.3
knit.node_tree.links.new(tex.outputs['Fac'], bump.inputs['Height'])
knit.node_tree.links.new(bump.outputs['Normal'], kb.inputs['Normal'])

body = sphere_mesh('Body', fn=lambda d: d * np.array([0.25, 0.12, 0.15]) + np.array([0, 0.012, -0.385]))
body.data.materials.append(knit)
bpy.ops.mesh.primitive_torus_add(major_radius=0.064, minor_radius=0.03, major_segments=128, minor_segments=48,
                                 location=(0, 0.014, -0.19))
collar = bpy.context.active_object
collar.scale = (1, 1.06, 1.2)
bpy.ops.mesh.primitive_cylinder_add(radius=0.074, depth=0.08, vertices=128, location=(0, 0.014, -0.235))
tube = bpy.context.active_object
tube.scale = (1, 1.06, 1)
for ob in (collar, tube):
    ob.data.materials.append(knit)
    for poly in ob.data.polygons:
        poly.use_smooth = True


# ------------------------------------------------------------------ light and camera
light(scene)
camera(scene, (0, -1.52, -0.07), (0, 0, -0.105))

# ------------------------------------------------------------------ render
scene.render.use_persistent_data = True   # only the rig turns between frames: keep the hair's BVH
a0, a1, step = (float(x) for x in args.angles.split(':'))
angs = np.arange(a0, a1 + 1e-6, step)
only = {float(x) for x in args.only.split(',') if x}
for idx, ang in enumerate(angs):
    if only and ang not in only:
        continue
    rig.rotation_euler = (math.radians(-0.03 * abs(ang)), math.radians(0.07 * ang), math.radians(ang))
    scene.render.filepath = f'{args.out}/bob-{idx:02d}.png'
    bpy.ops.render.render(write_still=True)
    print('frame', idx, ang, flush=True)
