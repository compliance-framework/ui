import decamelizeKeys from 'decamelize-keys';

// OSCAL's wire format is kebab-case, so records downloaded from these OSCAL-shaped API
// resources are decamelized (recursively) to match before being offered as a file.
export function downloadJson(filename: string, data: object): void {
  const dataStr = JSON.stringify(
    decamelizeKeys(data, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
