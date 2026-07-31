export function getJsStarterTemplate(pageName: string): string {
  return `// ${pageName}

const numbers = [8, 3, 5, 1, 9, 2];

const sorted = [...numbers].sort((a, b) => a - b);

console.log("Original:", numbers);
console.log("Sorted:", sorted);
`
}
