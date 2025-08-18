export function filterValidPathsFromRawYaml(raw: string): string[] {
  // Extract valid '- value' lines from raw YAML
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) => {
      let value = line.substring(1).trim();
      // Remove surrounding quotes if present
      if (
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    })
    .filter((line) => line.length > 0);
}
