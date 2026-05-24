import GroupKeyNote, { GroupKeyNoteProps } from "./GroupKeyNote";
import MultipleKeyNote, { MultipeKeyNoteProps } from "./MultipleKeyNote";
import PlaceholderNote, { PlaceholderNoteProps } from "./PlaceholderNote";
import SingleKeyNote, { SingleKeyNoteProps } from "./SingleKeyNote";
import Note, { NoteProps } from "./Note";

export type KeymapItem =
  | PlaceholderNoteProps
  | SingleKeyNoteProps
  | MultipeKeyNoteProps
  | GroupKeyNoteProps
  | NoteProps;

export type KeymapProps = { keymap: KeymapItem[] };

const KeymapNotes = ({ keymap }: KeymapProps) => {
  if (!keymap || !keymap.length) {
    return null;
  }

  return (
    <>
      {keymap.map((keymapItemArgs: KeymapItem) => {
        if ("placeholder" in keymapItemArgs) {
          // if (isPlaceholderNote(keymapItem as PlaceholderNoteProps)) {
          return (
            <PlaceholderNote {...keymapItemArgs} key={keymapItemArgs.uuid} />
          );
        } else if ("button" in keymapItemArgs) {
          // } else if (isSingleKeyNote(keymapItem as SingleKeyNoteProps)) {
          return (
            <SingleKeyNote {...keymapItemArgs} key={keymapItemArgs.uuid} />
          );
        } else if ("buttons" in keymapItemArgs) {
          // } else if (isMultipleKeyNote(keymapItem)) {
          return (
            <MultipleKeyNote {...keymapItemArgs} key={keymapItemArgs.uuid} />
          );
        } else if ("groupTitle" in keymapItemArgs) {
          // } else if (isGroupKeyNote(keymapItem)) {
          return <GroupKeyNote {...keymapItemArgs} key={keymapItemArgs.uuid} />;
        } else if ("label" in keymapItemArgs) {
          // } else if (isNote(keymapItem)) {
          return <Note {...keymapItemArgs} key={keymapItemArgs.uuid} />;
        } else {
          return null;
        }
      })}
    </>
  );
};

export default KeymapNotes;
