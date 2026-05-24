import { createContext, useContext } from "react";
import type {
  BodyProps,
  BodyShapeType
} from "use-cannon";

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void;
  remove(id: string): void;
};

export const debugContext = createContext<DebugApi | null>(null);

export const useDebugContext = () => useContext(debugContext);
