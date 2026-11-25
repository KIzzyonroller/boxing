"""Procedurally model, rig and export a boxer with headless Blender (bpy).
Character faces -Y in Blender (=> +Z in glTF/three.js). Character's left is +X.
"""
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "assets"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, rgb, rough=0.6, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
    return m

M_SKIN = mat("Skin", (0.32, 0.16, 0.095), 0.5, 0.15)
M_TRUNK = mat("Trunks", (0.30, 0.008, 0.012), 0.45)
M_BAND = mat("Waistband", (0.75, 0.75, 0.72), 0.5)
M_SHOE = mat("Shoes", (0.06, 0.06, 0.07), 0.4)
M_GLOVE = mat("Gloves", (0.38, 0.006, 0.01), 0.22)
M_HAIR = mat("Hair", (0.03, 0.02, 0.02), 0.8)

# ---------------- body via skin modifier ----------------
J = {
    "pelvis": ((0, 0.0, 0.98), (0.155, 0.11)),
    "spine": ((0, 0.0, 1.14), (0.14, 0.10)),
    "chest": ((0, -0.005, 1.32), (0.175, 0.115)),
    "neck": ((0, 0.0, 1.53), (0.06, 0.06)),
    "neck2": ((0, 0.0, 1.60), (0.055, 0.055)),
    "sh_L": ((0.19, 0.0, 1.44), (0.065, 0.065)),
    "el_L": ((0.24, 0.02, 1.16), (0.048, 0.048)),
    "wr_L": ((0.27, 0.0, 0.93), (0.037, 0.035)),
    "sh_R": ((-0.19, 0.0, 1.44), (0.065, 0.065)),
    "el_R": ((-0.24, 0.02, 1.16), (0.048, 0.048)),
    "wr_R": ((-0.27, 0.0, 0.93), (0.037, 0.035)),
    "hip_L": ((0.095, 0.0, 0.93), (0.085, 0.085)),
    "kn_L": ((0.105, -0.01, 0.52), (0.058, 0.058)),
    "an_L": ((0.11, 0.02, 0.09), (0.042, 0.042)),
    "toe_L": ((0.11, -0.13, 0.04), (0.042, 0.035)),
    "hip_R": ((-0.095, 0.0, 0.93), (0.085, 0.085)),
    "kn_R": ((-0.105, -0.01, 0.52), (0.058, 0.058)),
    "an_R": ((-0.11, 0.02, 0.09), (0.042, 0.042)),
    "toe_R": ((-0.11, -0.13, 0.04), (0.042, 0.035)),
}
EDGES = [("pelvis", "spine"), ("spine", "chest"), ("chest", "neck"), ("neck", "neck2"),
         ("chest", "sh_L"), ("sh_L", "el_L"), ("el_L", "wr_L"),
         ("chest", "sh_R"), ("sh_R", "el_R"), ("el_R", "wr_R"),
         ("pelvis", "hip_L"), ("hip_L", "kn_L"), ("kn_L", "an_L"), ("an_L", "toe_L"),
         ("pelvis", "hip_R"), ("hip_R", "kn_R"), ("kn_R", "an_R"), ("an_R", "toe_R")]
names = list(J)
me = bpy.data.meshes.new("BodySkel")
me.from_pydata([J[n][0] for n in names], [(names.index(a), names.index(b)) for a, b in EDGES], [])
body = bpy.data.objects.new("Body", me)
scene.collection.objects.link(body)
sk = body.modifiers.new("Skin", "SKIN")
sk.use_smooth_shade = True
for i, n in enumerate(names):
    sv = me.skin_vertices[0].data[i]
    sv.radius = J[n][1]
    sv.use_root = (n == "pelvis")
sub = body.modifiers.new("Sub", "SUBSURF")
sub.levels = 2
sub.render_levels = 2
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.modifier_apply(modifier="Skin")
bpy.ops.object.modifier_apply(modifier="Sub")
bpy.ops.object.shade_smooth()

# a little muscle shaping: broaden lats/chest, narrow waist
for v in body.data.vertices:
    x, y, z = v.co
    if 1.22 < z < 1.48 and abs(x) < 0.24:  # chest / lats
        f = math.sin((z - 1.22) / 0.26 * math.pi)
        v.co.x *= 1 + 0.10 * f
        if y < 0: v.co.y -= 0.012 * f  # pecs
    if 1.02 < z < 1.2 and abs(x) < 0.2:  # waist
        v.co.x *= 0.95
    if 0.55 < z < 0.85 and abs(x) < 0.2:  # quads
        v.co.y -= 0.008 * math.sin((z - 0.55) / 0.3 * math.pi)
    if 0.2 < z < 0.48 and y > 0:  # calves
        v.co.y += 0.012 * math.sin((z - 0.2) / 0.28 * math.pi)

body.data.materials.append(M_SKIN)
body.data.materials.append(M_TRUNK)
body.data.materials.append(M_BAND)
body.data.materials.append(M_SHOE)
for p in body.data.polygons:
    c = p.center
    if c.z < 0.17:
        p.material_index = 3
    elif 1.06 < c.z < 1.12 and abs(c.x) < 0.2:
        p.material_index = 2
    elif 0.66 < c.z <= 1.06 and abs(c.x) < 0.2:
        p.material_index = 1
    else:
        p.material_index = 0

# ---------------- head ----------------
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=1, location=(0, -0.012, 1.705))
head = bpy.context.active_object
head.name = "HeadMesh"
head.data.name = "HeadMesh"
head.scale = (0.092, 0.105, 0.118)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.shade_smooth()
for v in head.data.vertices:  # jaw taper + brow
    lz = v.co.z
    if lz < -0.02:
        k = min(1, (-0.02 - lz) / 0.09)
        v.co.x *= 1 - 0.18 * k
        v.co.y *= 1 - 0.08 * k
    if 0.0 < lz < 0.04 and v.co.y < -0.08:
        v.co.y -= 0.008
head.data.materials.append(M_SKIN)
head.data.materials.append(M_HAIR)
for p in head.data.polygons:
    c = p.center
    if c.z > 0.05 or (c.y > 0.035 and c.z > -0.03):
        p.material_index = 1

# ears + nose
def blob(name, loc, scale, parent_mesh_mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(parent_mesh_mat)
    return o
ears = [blob("EarL", (0.09, 0.0, 1.70), (0.012, 0.02, 0.03), M_SKIN),
        blob("EarR", (-0.09, 0.0, 1.70), (0.012, 0.02, 0.03), M_SKIN),
        blob("Nose", (0, -0.112, 1.69), (0.014, 0.018, 0.022), M_SKIN)]
bpy.ops.object.select_all(action="DESELECT")
for o in ears: o.select_set(True)
head.select_set(True)
bpy.context.view_layer.objects.active = head
bpy.ops.object.join()

# ---------------- gloves ----------------
def glove(side):
    s = 1 if side == "L" else -1
    wr = Vector(J["wr_" + side][0])
    el = Vector(J["el_" + side][0])
    d = (wr - el).normalized()
    c = wr + d * 0.075
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1, location=(0, 0, 0))
    g = bpy.context.active_object
    g.name = "Glove" + side
    g.scale = (0.068, 0.078, 0.095)  # long axis along arm (local Z)
    bpy.ops.object.transform_apply(scale=True)
    for v in g.data.vertices:  # flatten palm side, puff knuckles
        if v.co.y > 0.02: v.co.y *= 0.8
        if v.co.z < -0.04 and v.co.y < 0: v.co.y *= 1.08
    # thumb
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1, location=(-s * 0.045, -0.02, 0.01))
    t = bpy.context.active_object
    t.scale = (0.024, 0.026, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    # cuff
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.05, depth=0.07, location=(0, 0, 0.09))
    cuff = bpy.context.active_object
    bpy.ops.object.select_all(action="DESELECT")
    t.select_set(True); cuff.select_set(True); g.select_set(True)
    bpy.context.view_layer.objects.active = g
    bpy.ops.object.join()
    bpy.ops.object.shade_smooth()
    g.data.materials.append(M_GLOVE)
    # orient: local -Z along arm direction d
    rot = (-d).to_track_quat("Z", "Y")
    g.rotation_mode = "QUATERNION"
    g.rotation_quaternion = rot
    g.location = c
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return g
gL, gR = glove("L"), glove("R")

# ---------------- armature ----------------
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm = bpy.context.active_object
arm.name = "Rig"
arm.data.name = "Rig"
eb = arm.data.edit_bones
eb.remove(eb[0])
def bone(name, h, t, parent=None, connect=False):
    b = eb.new(name)
    b.head, b.tail = Vector(h), Vector(t)
    b.roll = 0
    if parent:
        b.parent = eb[parent]
        b.use_connect = connect
    return b
P = lambda n: J[n][0]
bone("Hips", (0, 0, 0.95), (0, 0, 1.10))
bone("Spine", (0, 0, 1.10), (0, 0, 1.30), "Hips", True)
bone("Chest", (0, 0, 1.30), (0, 0, 1.50), "Spine", True)
bone("Neck", (0, 0, 1.50), (0, 0, 1.61), "Chest", True)
bone("Head", (0, 0, 1.61), (0, 0, 1.84), "Neck", True)
for s, sx in (("L", 1), ("R", -1)):
    bone("Shoulder" + s, (sx * 0.03, 0, 1.44), P("sh_" + s), "Chest")
    bone("UpperArm" + s, P("sh_" + s), P("el_" + s), "Shoulder" + s, True)
    bone("ForeArm" + s, P("el_" + s), P("wr_" + s), "UpperArm" + s, True)
    w = Vector(P("wr_" + s)); d = (w - Vector(P("el_" + s))).normalized()
    bone("Hand" + s, w, w + d * 0.15, "ForeArm" + s, True)
    bone("Thigh" + s, P("hip_" + s), P("kn_" + s), "Hips")
    bone("Shin" + s, P("kn_" + s), P("an_" + s), "Thigh" + s, True)
    bone("Foot" + s, P("an_" + s), P("toe_" + s), "Shin" + s, True)
bpy.ops.object.mode_set(mode="OBJECT")

# skin the body with heat weights
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
missing = [v.index for v in body.data.vertices if len(v.groups) == 0]
print("unweighted verts:", len(missing), "of", len(body.data.vertices))

# rigid-parent head and gloves to bones
def bone_parent(o, bname):
    mw = o.matrix_world.copy()
    o.parent = arm
    o.parent_type = "BONE"
    o.parent_bone = bname
    o.matrix_world = mw
bone_parent(head, "Head")
bone_parent(gL, "HandL")
bone_parent(gR, "HandR")

# ---------------- export ----------------
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(filepath=OUT + "/boxer.glb", export_format="GLB", export_yup=True,
                          export_skins=True, export_animations=False, export_apply=False,
                          export_materials="EXPORT")
print("exported", OUT + "/boxer.glb")
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/boxer.blend")

if "--norender" in sys.argv: raise SystemExit(0)
# ---------------- preview: guard pose via IK, render ----------------
def empty(name, loc):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    scene.collection.objects.link(e)
    return e
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="POSE")
pb = arm.pose.bones
pb["Hips"].location = (0, 0, 0)
for s, sx in (("L", 1), ("R", -1)):
    # lead (left) hand a bit further forward, rear hand at chin
    tgt = empty("T" + s, (sx * 0.12, -0.30 if s == "L" else -0.16, 1.58 if s == "L" else 1.55))
    pole = empty("P" + s, (sx * 0.45, -0.25, 0.7))
    c = pb["ForeArm" + s].constraints.new("IK")
    c.target = tgt; c.pole_target = pole; c.chain_count = 2; c.pole_angle = 0
    pb["Chest"].rotation_mode = "XYZ"
pb["Chest"].rotation_euler = (math.radians(8), 0, math.radians(-12))
pb["Spine"].rotation_mode = "XYZ"; pb["Spine"].rotation_euler = (math.radians(6), 0, math.radians(-8))
pb["Head"].rotation_mode = "XYZ"; pb["Head"].rotation_euler = (math.radians(-10), 0, math.radians(10))
bpy.ops.object.mode_set(mode="OBJECT")

# floor, lights, camera
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
fl = bpy.context.active_object
fl.data.materials.append(mat("Canvas", (0.42, 0.42, 0.45), 0.85))
def light(kind, loc, energy, size=1.0, rot=(0, 0, 0)):
    l = bpy.data.lights.new(kind + "L", kind)
    l.energy = energy
    if kind == "AREA": l.size = size
    o = bpy.data.objects.new(kind, l)
    o.location = loc; o.rotation_euler = rot
    scene.collection.objects.link(o)
    return o
light("AREA", (1.5, -2.5, 3.2), 600, 2.0, (math.radians(45), 0, math.radians(30)))
light("AREA", (-2.0, 1.5, 2.5), 400, 1.0, (math.radians(-60), 0, math.radians(-130)))
light("AREA", (0, 0, 4.0), 300, 3.0)
cam_d = bpy.data.cameras.new("Cam"); cam_d.lens = 50
cam = bpy.data.objects.new("Cam", cam_d)
scene.collection.objects.link(cam)
cam.location = (1.9, -3.4, 1.35)
dirv = Vector((0, 0, 0.95)) - cam.location
cam.rotation_euler = dirv.to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
world = bpy.data.worlds.new("W"); scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.02, 0.025, 1)
scene.render.engine = "CYCLES"
scene.view_settings.view_transform = "Standard"
scene.cycles.device = "CPU"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 640, 800
scene.render.filepath = OUT + "/preview.png"
bpy.ops.render.render(write_still=True)
print("rendered", scene.render.filepath)
