import KeymapNotes, { KeymapItem } from "./KeymapNotes";

export type GroupKeyNoteProps = {
  groupTitle: string;
  keymap: KeymapItem[];
  uuid: string;
};

export const isGroupKeyNote = (
  props: GroupKeyNoteProps
): props is GroupKeyNoteProps => {
  const { groupTitle } = props;
  return typeof groupTitle === "string";
};

const GroupKeyNote = ({ groupTitle, keymap = [] }: GroupKeyNoteProps) => {
  if (!groupTitle || !keymap || !keymap.length) {
    return null;
  }
  return (
    <div>
      <div>{groupTitle}</div>
      <div>
        <KeymapNotes keymap={keymap} />
      </div>
    </div>
  );
};

export default GroupKeyNote;
