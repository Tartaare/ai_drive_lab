import { Fragment as ReactFragment } from "react";

export type MultipeKeyNoteProps = {
  buttons: string[];
  label: string;
  uuid: string;
};

export const isMultipleKeyNote = (
  props: MultipeKeyNoteProps
): props is MultipeKeyNoteProps => {
  const { buttons } = props;
  return buttons instanceof Array && typeof buttons[0] === "string";
};

const MultipleKeyNote = ({ buttons, label }: MultipeKeyNoteProps) => {
  if (!buttons || !buttons.length || !label) {
    return null;
  }

  return (
    <div>
      {buttons.map((button, index) => (
        <ReactFragment key={index}>
          <kbd>{button}</kbd>
          &nbsp;
        </ReactFragment>
      ))}
      {label}
    </div>
  );
};

export default MultipleKeyNote;
