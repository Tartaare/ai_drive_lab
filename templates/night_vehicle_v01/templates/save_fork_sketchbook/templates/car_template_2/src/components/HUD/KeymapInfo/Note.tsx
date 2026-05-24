export type NoteProps = {
  label: string;
  uuid: string;
};

export const isNote = (props: NoteProps): props is NoteProps => {
  const { label } = props;
  return typeof label === "string";
};

const GroupKeyNote = ({ label }: NoteProps) => {
  if (!label) {
    return null;
  }
  return <div>{label}</div>;
};

export default GroupKeyNote;
