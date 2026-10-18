"""The look every hero render shares: Cycles on the GPU, the plum world, the light, AgX."""
import bpy
from mathutils import Vector


def setup(size, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Punchy'
    cy = scene.cycles
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.01
    cy.use_denoising = True
    cy.max_bounces = 8
    cy.transparent_max_bounces = 16
    scene.cycles_curves.shape = 'THICK'
    scene.cycles_curves.subdivisions = 2

    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            if any(d.type == backend for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == backend
                cy.device = 'GPU'
                print('rendering on', backend)
                break
        except TypeError:
            pass

    world = bpy.data.worlds.new('Plum')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.055, 0.012, 0.028, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    return scene


def srgb(h):
    """'#RRGGBB' -> linear RGBA"""
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1,)


def principled(name, color, rough, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color)
    b.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m, b


def area(scene, name, loc, power, color, size, target=(0, 0, -0.02)):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.color, light.size = power, color, size
    o = bpy.data.objects.new(name, light)
    o.location = loc
    scene.collection.objects.link(o)
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


def light(scene, target=(0, 0, -0.02), scale=1.0):
    """Warm key high left, pink fill, Petal and Amber rims behind, a soft top light."""
    t = Vector(target)
    for name, loc, power, color, size in (
        ('Key', (-0.6, -0.65, 0.4), 45, (1.0, 0.9, 0.82), 0.7),
        ('Fill', (0.7, -0.6, -0.15), 12, (1.0, 0.72, 0.84), 1.2),
        ('RimPetal', (0.5, 0.45, 0.25), 60, (1.0, 0.56, 0.72), 0.5),
        ('RimAmber', (-0.5, 0.42, 0.18), 45, (1.0, 0.74, 0.42), 0.5),
        ('Top', (0.0, 0.05, 0.65), 18, (1.0, 0.95, 0.92), 0.6),
    ):
        area(scene, name, t + Vector(loc) * scale, power * scale ** 2, color, size * scale, target)


def camera(scene, location, target, lens=70):
    cam_d = bpy.data.cameras.new('Cam')
    cam_d.lens = lens
    cam_d.sensor_fit = 'VERTICAL'   # the 24mm sensor height
    cam = bpy.data.objects.new('Cam', cam_d)
    cam.location = location
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam
