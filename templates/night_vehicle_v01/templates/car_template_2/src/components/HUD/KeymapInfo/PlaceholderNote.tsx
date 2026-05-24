export type PlaceholderNoteProps = { placeholder: boolean; uuid: string };

export const isPlaceholderNote = (
  props: PlaceholderNoteProps
): props is PlaceholderNoteProps =>
  "placeholder" in props && props.placeholder === true;

const PlaceholderNote = (props: PlaceholderNoteProps) => (
  <div
    style={{
      lineHeight: "1em"
    }}
  >
    &nbsp;
  </div>
);

export default PlaceholderNote;
