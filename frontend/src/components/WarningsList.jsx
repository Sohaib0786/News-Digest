export default function WarningsList({ warnings }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <ul className="warnings">
      {warnings.map((warning, index) => (
        <li key={index}>{warning}</li>
      ))}
    </ul>
  );
}
