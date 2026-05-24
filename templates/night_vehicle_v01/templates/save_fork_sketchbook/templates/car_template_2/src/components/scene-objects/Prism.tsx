export function createTetra() {
  const vertices = [
    new Vec3(0, 0, 0),
    new Vec3(2, 0, 0),
    new Vec3(0, 2, 0),
    new Vec3(0, 0, 2)
  ];
  const offset = -0.35;
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    v.x += offset;
    v.y += offset;
    v.z += offset;
  }
  return new ConvexPolyhedron({
    vertices,
    faces: [
      [0, 3, 2], // -x
      [0, 1, 3], // -y
      [0, 2, 1], // -z
      [1, 2, 3] // +xyz
    ]
  });
}

const Prism = ({ width = 1, height = 1, depth = 1, mass = 1 }) => {
  // ConvexPolyhedron tetra shape
  const polyhedronShape = createTetra();
  const polyhedronBody = new Body({ mass });
  polyhedronBody.addShape(polyhedronShape);
  polyhedronBody.position.set(-size * 2, size + 1, -size * 2);
  // world.addBody(polyhedronBody);
  // demo.addVisual(polyhedronBody);

  return <></>;
};
