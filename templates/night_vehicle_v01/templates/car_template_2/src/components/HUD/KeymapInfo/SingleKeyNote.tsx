export type SingleKeyNoteProps = {
  button: string;
  label: string;
  uuid: string;
};

export const isSingleKeyNote = (
  props: SingleKeyNoteProps
): props is SingleKeyNoteProps => {
  const { button } = props;
  return typeof button === "string";
};

const SingleKeyNote = (props: SingleKeyNoteProps) => {
  const { button, label } = props;
  if (!button || !label) {
    return null;
  }

  return (
    <div>
      <kbd>{button}</kbd>&nbsp;{label}
    </div>
  );
};

export default SingleKeyNote;
