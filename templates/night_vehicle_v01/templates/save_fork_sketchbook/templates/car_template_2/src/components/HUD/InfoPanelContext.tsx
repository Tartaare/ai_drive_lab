import { createContext, useContext, useReducer } from "react";

const InfoRecordsContext = createContext<InfoRecord[]>([]);

const InfoRecordsDispatchContext = createContext<
  React.Dispatch<InfoPanelAction>
>(null);

export type InfoRecord = {
  id: string;
  label?: string;
  text?: string | number;
  isActive?: boolean;
};

type InfoPanelActionAdd = { type: "added"; infoRecord: InfoRecord };
type InfoPanelActionUpdate = { type: "changed"; infoRecord: InfoRecord };
type InfoPanelActionUpdateAttribute = {
  type: "changedAttribute";
  infoRecord: Pick<InfoRecord, "id"> & Partial<Omit<InfoRecord, "id">>;
};

type InfoPanelActionDelete = { type: "deleted"; infoRecord: InfoRecord };
type InfoPanelAction =
  | InfoPanelActionAdd
  | InfoPanelActionUpdate
  | InfoPanelActionUpdateAttribute
  | InfoPanelActionDelete;

function infoRecordsReducer(
  infoRecords: InfoRecord[],
  action: InfoPanelAction
) {
  switch (action.type) {
    case "added": {
      return [...infoRecords, action.infoRecord];
    }
    case "changed": {
      return infoRecords.map((updatedInfoRecord) => {
        if (updatedInfoRecord.id === action.infoRecord.id) {
          return action.infoRecord;
        } else {
          return updatedInfoRecord;
        }
      });
    }
    case "changedAttribute": {
      return infoRecords.map((updatedInfoRecord) => {
        if (updatedInfoRecord.id === action.infoRecord.id) {
          return {
            ...updatedInfoRecord,
            ...action.infoRecord
          };
        } else {
          return updatedInfoRecord;
        }
      });
    }
    case "deleted": {
      return infoRecords.filter(
        (infoRecordForDeletion) =>
          infoRecordForDeletion.id !== action.infoRecord.id
      );
    }
    // default: {
    //   throw Error("Unknown action: " + action.type);
    // }
  }
}

const initialInfoRecords: InfoRecord[] = [
  {
    id: "info-record-id_steering-angle",
    label: "steering angle", // "angle between wheel-front-first-axis-right and the chassis forward direction",
    text: "0.000",
    isActive: false
  }
];

export function InfoRecordsProvider({ children }) {
  const [infoRecords, dispatch] = useReducer(
    infoRecordsReducer,
    initialInfoRecords
  );

  return (
    <InfoRecordsContext.Provider value={infoRecords}>
      <InfoRecordsDispatchContext.Provider value={dispatch}>
        {children}
      </InfoRecordsDispatchContext.Provider>
    </InfoRecordsContext.Provider>
  );
}

export function useInfoRecords() {
  return useContext(InfoRecordsContext);
}

export function useInfoRecordsDispatch() {
  return useContext(InfoRecordsDispatchContext);
}
