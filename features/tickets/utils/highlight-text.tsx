export function highlightText(text: string, search: string) {
  if (!search.trim()) return text;

  const parts = text.split(new RegExp(`(${search})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark key={index} className="rounded bg-yellow-100 px-1">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
