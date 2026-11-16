/**
 * Number to English word converter for clean editorial presentation
 */
export function numberToWords(num: number): string {
  const ones = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  if (num >= 0 && num < 20) {
    return ones[num];
  }
  if (num >= 20 && num < 100) {
    const rem = num % 10;
    return tens[Math.floor(num / 10)] + (rem > 0 ? `-${ones[rem].toLowerCase()}` : '');
  }
  return num.toString();
}

/**
 * Formats a template string containing {{departmentCount}}, {{departmentCountWord}},
 * or legacy {departmentCount} tokens with correct singular/plural grammar.
 */
export function formatDepartmentCountText(template: string, count: number): string {
  if (!template) return '';
  const wordCap = numberToWords(count);
  const wordLower = wordCap.toLowerCase();
  const noun = count === 1 ? 'department' : 'departments';
  const nounCap = count === 1 ? 'Department' : 'Departments';
  const discNoun = count === 1 ? 'Discipline' : 'Disciplines';

  // First determine sentence-start vs inline capitalization for legacy {departmentCount}
  return template
    .replace(/\{\{departmentCount\}\}/gi, count.toString())
    .replace(/\{\{departmentCountNum\}\}/gi, count.toString())
    .replace(/\{\{departmentCountWord\}\}/gi, wordLower)
    .replace(/\{\{departmentCountWordCap\}\}/gi, wordCap)
    .replace(/\{\{departmentWord\}\}/gi, `${wordLower} ${noun}`)
    .replace(/\{\{departmentsNoun\}\}/gi, noun)
    .replace(/\{\{departmentsNounCap\}\}/gi, nounCap)
    .replace(/\{\{disciplinesNoun\}\}/gi, discNoun)
    .replace(/\{departmentCount\}/gi, (_match, offset, full) => {
      const before = full.slice(0, offset).trim();
      const atStart = before.length === 0 || /[.!?]$/.test(before);
      return atStart ? wordCap : wordLower;
    })
    .replace(/\{departmentCountNum\}/gi, count.toString())
    .replace(/\{departmentCountWord\}/gi, wordLower)
    .replace(/\{departmentWord\}/gi, `${wordLower} ${noun}`)
    .replace(/\{departmentsNoun\}/gi, noun)
    .replace(/\{departmentsNounCap\}/gi, nounCap)
    .replace(/\b1\s+departments\b/gi, '1 department')
    .replace(/\bone\s+departments\b/gi, 'one department')
    .replace(/\bOne\s+departments\b/g, 'One department');
}
