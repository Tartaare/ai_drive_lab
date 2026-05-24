import { createContext, useEffect, useRef } from "react";
import { useImmer } from "use-immer";

export function useKeyHold(
  targetKeys: string[],
  onEventHandlerSetValue = (value: boolean) => {}
) {
  useEffect(() => {
    if (typeof onEventHandlerSetValue !== "function") {
      throw new Error("onEventHandlerSetValue must be a function");
    }

    const downHandler = ({ key }: KeyboardEvent) =>
      void (targetKeys.indexOf(key) !== -1 && onEventHandlerSetValue(true));

    const upHandler = ({ key }: KeyboardEvent) =>
      void (targetKeys.indexOf(key) !== -1 && onEventHandlerSetValue(false));

    if (
      window?.addEventListener &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("keydown", downHandler);
      window.addEventListener("keyup", upHandler);
    }

    return () => {
      if (
        window?.removeEventListener &&
        typeof window.removeEventListener === "function"
      ) {
        window.removeEventListener("keydown", downHandler);
        window.removeEventListener("keyup", upHandler);
      }
    };
  }, []);
}

export function useKeyToggle(targetKeys: string[], onEventHandler: Function) {
  useEffect(() => {
    const upHandler = ({ key }: KeyboardEvent) =>
      void (targetKeys.indexOf(key) !== -1 && onEventHandler());

    if (
      window?.addEventListener &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("keyup", upHandler);
    }

    return () => {
      if (
        window?.removeEventListener &&
        typeof window.removeEventListener === "function"
      ) {
        window.removeEventListener("keyup", upHandler);
      }
    };
  }, []);
}

// export function useControlsRef() {
//   const keys = useRef({
//     forward: false,
//     backward: false,
//     left: false,
//     right: false,
//     brake: false,
//     reset: false
//   });

//   useKeyHold(["ArrowUp", "w"], (pressed) => (keys.current.forward = pressed));
//   useKeyHold(
//     ["ArrowDown", "s"],
//     (pressed) => (keys.current.backward = pressed)
//   );
//   useKeyHold(["ArrowLeft", "a"], (pressed) => (keys.current.left = pressed));
//   useKeyHold(["ArrowRight", "d"], (pressed) => (keys.current.right = pressed));
//   useKeyHold(
//     [" "], // spacebar key
//     (pressed) => (keys.current.brake = pressed)
//   );
//   useKeyHold(["r"], (pressed) => (keys.current.reset = pressed));

//   return keys;
// }

export function useHotkeysRef() {
  const keys = useRef({
    cannonDebugger: false,
    // cannonDebugger: true,
    cannonDebuggerColorIndex: 1,

    showFPSStats: false,
    showPerfomanceInfo: true,

    showExtendedKeymapInfo: false,
    showCameraInfo: false
  });

  useKeyToggle(
    ["c"],
    () => (keys.current.cannonDebugger = !keys.current.cannonDebugger)
  );

  useKeyToggle(["1"], () => (keys.current.cannonDebuggerColorIndex = 1));
  useKeyToggle(["2"], () => (keys.current.cannonDebuggerColorIndex = 2));
  useKeyToggle(["3"], () => (keys.current.cannonDebuggerColorIndex = 3));

  useKeyToggle(
    ["o"],
    () => (keys.current.showFPSStats = !keys.current.showFPSStats)
  );

  useKeyToggle(
    ["p"],
    () => (keys.current.showPerfomanceInfo = !keys.current.showPerfomanceInfo)
  );

  useKeyToggle(
    ["h"],
    () =>
      (keys.current.showExtendedKeymapInfo = !keys.current
        .showExtendedKeymapInfo)
  );

  useKeyToggle(
    ["i"],
    () => (keys.current.showCameraInfo = !keys.current.showCameraInfo)
  );

  return keys;
}

export const initialControlsState = {
  playerUnit: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
    lightsOn: true
  },

  changeCamera: false,

  // showWireframe: true, // for debug time
  showWireframe: false,

  // isActiveCannonDebugger: false,
  isActiveCannonDebugger: true,
  cannonDebuggerColorIndex: 1,

  showFPSStats: false,
  showPerfomanceInfo: true,

  showExtendedKeymapInfo: 0, // short - 0, default - 1, full - 2
  // showExtendedKeymapInfo: false,
  showCameraInfo: false
};

export type Controls = typeof initialControlsState;

export const ControlsContext = createContext<Controls>(initialControlsState);

export function useControls() {
  const [keys, setKeysState] = useImmer<Controls>(initialControlsState);

  const useKeysStateToggleHandler = (
    targetKeys: string[],
    onDraftStateChange = (draftKeys: typeof keys) => {}
  ) => useKeyToggle(targetKeys, () => setKeysState(onDraftStateChange));

  const useKeysStateHoldHandler = (
    targetKeys: string[],
    onDraftStateChange = (draftKeys: typeof keys, pressed: boolean) => {}
  ) =>
    useKeyHold(targetKeys, (pressed) =>
      setKeysState((draftKeys) => void onDraftStateChange(draftKeys, pressed))
    );

  useKeysStateHoldHandler(
    ["ArrowUp", "w"],
    (draftKeys, pressed) => void (draftKeys.playerUnit.forward = pressed)
  );
  useKeysStateHoldHandler(
    ["ArrowDown", "s"],
    (draftKeys, pressed) => void (draftKeys.playerUnit.backward = pressed)
  );
  useKeysStateHoldHandler(
    ["ArrowLeft", "a"],
    (draftKeys, pressed) => void (draftKeys.playerUnit.left = pressed)
  );
  useKeysStateHoldHandler(
    ["ArrowRight", "d"],
    (draftKeys, pressed) => void (draftKeys.playerUnit.right = pressed)
  );
  useKeysStateHoldHandler(
    [" "], // spacebar key
    (draftKeys, pressed) => void (draftKeys.playerUnit.brake = pressed)
  );
  useKeysStateHoldHandler(
    ["r"],
    (draftKeys, pressed) => void (draftKeys.playerUnit.reset = pressed)
  );

  useKeysStateHoldHandler(
    // useKeysStateToggleHandler(
    ["v"],
    (draftKeys, pressed) => void (draftKeys.changeCamera = pressed)
    // (draftKeys) => void (draftKeys.changeCamera = !draftKeys.changeCamera)
  );

  useKeysStateToggleHandler(
    ["l"],
    (draftKeys) =>
      void (draftKeys.playerUnit.lightsOn = !draftKeys.playerUnit.lightsOn)
  );

  useKeysStateToggleHandler(
    ["c"],
    (draftKeys) =>
      void (draftKeys.isActiveCannonDebugger = !draftKeys.isActiveCannonDebugger)
  );

  useKeysStateToggleHandler(
    ["1"],
    (draftKeys) => void (draftKeys.cannonDebuggerColorIndex = 1)
  );
  useKeysStateToggleHandler(
    ["2"],
    (draftKeys) => void (draftKeys.cannonDebuggerColorIndex = 2)
  );
  useKeysStateToggleHandler(
    ["3"],
    (draftKeys) => void (draftKeys.cannonDebuggerColorIndex = 3)
  );

  useKeysStateToggleHandler(
    ["o"],
    (draftKeys) => void (draftKeys.showFPSStats = !draftKeys.showFPSStats)
  );

  useKeysStateToggleHandler(
    ["p"],
    (draftKeys) =>
      void (draftKeys.showPerfomanceInfo = !draftKeys.showPerfomanceInfo)
  );

  useKeysStateToggleHandler(["h"], (draftKeys) => {
    if (
      draftKeys.showExtendedKeymapInfo < 0 ||
      draftKeys.showExtendedKeymapInfo > 2
    ) {
      draftKeys.showExtendedKeymapInfo = 0;
    }

    draftKeys.showExtendedKeymapInfo++;
  });

  useKeysStateToggleHandler(
    ["i"],
    (draftKeys) => void (draftKeys.showCameraInfo = !draftKeys.showCameraInfo)
  );

  useKeysStateToggleHandler(
    ["f"],
    (draftKeys) => void (draftKeys.showWireframe = !draftKeys.showWireframe)
  );

  return keys;
}
