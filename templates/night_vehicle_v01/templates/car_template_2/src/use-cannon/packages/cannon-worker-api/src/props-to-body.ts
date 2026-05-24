import {
  Body as CannonBody,
  Box,
  ConvexPolyhedron,
  Cylinder,
  Heightfield,
  Material,
  Particle,
  Plane,
  Quaternion,
  Sphere,
  Trimesh,
  Vec3
} from "cannon-es";
import type { MaterialOptions } from "cannon-es";

import { BodyProps, BodyShapeType, CompoundBodyProps, ShapeType } from "./body";
import type { Triplet } from "./types";

export class Body extends CannonBody {
  uuid: string;
}

const makeVec3 = ([x, y, z]: Triplet) => new Vec3(x, y, z);

const prepareSphere = (args: number | number[]) =>
  Array.isArray(args) ? args : [args];

const prepareConvexPolyhedron = ([
  v,
  faces,
  n,
  a,
  boundingSphereRadius
]): ConvexPolyhedronProps => [
  {
    axes: a ? a.map(makeVec3) : undefined,
    boundingSphereRadius,
    faces,
    normals: n ? n.map(makeVec3) : undefined,
    vertices: v ? v.map(makeVec3) : undefined
  }
];

type BoxProps = ConstructorParameters<typeof Box>;
type ConvexPolyhedronProps = ConstructorParameters<typeof ConvexPolyhedron>;
type CylinderProps = ConstructorParameters<typeof Cylinder>;
type HeightfieldProps = ConstructorParameters<typeof Heightfield>;
type ParticleProps = ConstructorParameters<typeof Particle>;
type PlaneProps = ConstructorParameters<typeof Plane>;
type SphereProps = ConstructorParameters<typeof Sphere>;
type TrimeshProps = ConstructorParameters<typeof Trimesh>;

function createShape(type: ShapeType, args: any) {
  switch (type) {
    case "Box":
      return new Box(new Vec3(...args.map((v: number) => v / 2))); // extents => halfExtents
    case "ConvexPolyhedron":
      return new ConvexPolyhedron(...prepareConvexPolyhedron(args));
    case "Cylinder":
      return new Cylinder(...(args as CylinderProps)); // [ radiusTop, radiusBottom, height, numSegments ] = args
    case "Heightfield":
      return new Heightfield(...(args as HeightfieldProps)); // [ Array data, options: {minValue, maxValue, elementSize}  ] = args
    case "Particle":
      return new Particle(); // no args
    case "Plane":
      return new Plane(); // no args, infinite x and y
    case "Sphere":
      return new Sphere(...(prepareSphere(args) as SphereProps)); // radius = args
    case "Trimesh":
      return new Trimesh(...(args as TrimeshProps)); // [vertices, indices] = args
  }
}

export type CannonBodyType = BodyProps["type"];

export type PropsToBody = {
  uuid: string;
  props: CompoundBodyProps;
  type: BodyShapeType;
  createMaterial?: (materialOptions: MaterialOptions) => Material;
};

export const propsToBody = (options: PropsToBody): Body => {
  const {
    uuid,
    props,
    type,
    createMaterial = (
      materialOptions: string | { friction?: number; restitution?: number }
    ) => new Material(materialOptions)
  } = options;

  const {
    angularFactor = [1, 1, 1],
    angularVelocity = [0, 0, 0],
    args = [],
    collisionResponse,
    linearFactor = [1, 1, 1],
    mass,
    material,
    onCollide,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    shapes,
    velocity = [0, 0, 0],
    quaternion = [0, 0, 0, 0],
    ...extra
  } = props;

  const bodyType = props.type;

  const body = new Body({
    ...extra,
    mass: bodyType === "Static" ? 0 : mass,
    material: material ? createMaterial(material) : undefined,
    type: bodyType ? Body[bodyType.toUpperCase()] : undefined,
    quaternion: new Quaternion(...quaternion)
  });
  body.uuid = uuid;

  if (collisionResponse !== undefined) {
    body.collisionResponse = collisionResponse;
  }

  if (type === "Compound") {
    shapes.forEach((shape) => {
      const {
        type,
        args,
        position,
        rotation,
        material,
        ...extra
      }: BodyProps = (shape as unknown) as BodyProps;

      const shapeBody = body.addShape(
        createShape(type as ShapeType, args),
        position ? new Vec3(...position) : undefined,
        rotation ? new Quaternion().setFromEuler(...rotation) : undefined
      );
      if (material) shapeBody.material = createMaterial(material);
      Object.assign(shapeBody, extra);
    });
  } else {
    body.addShape(createShape(type, args));
  }

  body.position.set(position[0], position[1], position[2]);
  body.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2]);
  body.velocity.set(velocity[0], velocity[1], velocity[2]);
  body.angularVelocity.set(
    angularVelocity[0],
    angularVelocity[1],
    angularVelocity[2]
  );
  body.linearFactor.set(linearFactor[0], linearFactor[1], linearFactor[2]);
  body.angularFactor.set(angularFactor[0], angularFactor[1], angularFactor[2]);

  return body;
};
