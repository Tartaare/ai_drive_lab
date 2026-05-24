import { useControls } from "hooks/useControls";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState
} from "react";

const cameraIds = {
  static: "static" as const,
  following: "following" as const
};
const cameraIdsAsArray = Object.values(cameraIds);

export type CameraId = keyof typeof cameraIds;

const initialCameraId: CameraId = "static";

const CameraContext = createContext<CameraId>(initialCameraId);
const CameraDispatchContext = createContext<React.Dispatch<CameraAction>>(
  () => initialCameraId
);

type CameraIdActionChange = { type: "changed"; id: CameraId };
type CameraAction = CameraIdActionChange;

function cameraReducer(cameraId: CameraId, action: CameraAction) {
  switch (action.type) {
    case "changed": {
      return action.id;
    }
    // default: {
    //   return cameraId;
    //   //   throw Error("Unknown action: " + action.type);
    // }
  }
}

type CameraProviderProps = { children?: JSX.Element };

export function CameraIdProvider({ children }: CameraProviderProps) {
  const [cameraId, dispatch] = useReducer(cameraReducer, initialCameraId);

  const { changeCamera } = useControls();

  useEffect(() => {
    if (!changeCamera) {
      return;
    }

    let cameraIndex = cameraIdsAsArray.findIndex((id) => id === cameraId);
    if (cameraIndex === -1) {
      cameraIndex = 0;
    }

    cameraIndex++;

    dispatch({ type: "changed", id: cameraIdsAsArray[cameraIndex] });
  }, [changeCamera]);

  return (
    <CameraContext.Provider value={cameraId}>
      <CameraDispatchContext.Provider value={dispatch}>
        {children}
      </CameraDispatchContext.Provider>
    </CameraContext.Provider>
  );
}

export function useCameraId() {
  return useContext(CameraContext);
}

export function useCameraIdDispatch() {
  return useContext(CameraDispatchContext);
}
