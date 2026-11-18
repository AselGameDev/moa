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
 * {{sectorCount}}, {{sectorCountWord}}, or legacy {departmentCount} tokens
 * with correct singular/plural grammar.
 */
export function formatDepartmentCountText(template: string, count: number, sectorCount = count): string {
  if (!template) return '';
  const wordCap = numberToWords(count);
  const wordLower = wordCap.toLowerCase();
  const noun = count === 1 ? 'department' : 'departments';
  const nounCap = count === 1 ? 'Department' : 'Departments';
  const discNoun = count === 1 ? 'Discipline' : 'Disciplines';

  const secWordCap = numberToWords(sectorCount);
  const secWordLower = secWordCap.toLowerCase();
  const secNoun = sectorCount === 1 ? 'sector' : 'sectors';
  const secNounCap = sectorCount === 1 ? 'Sector' : 'Sectors';

  return template
    .replace(/\{\{sectorCount\}\}/gi, sectorCount.toString())
    .replace(/\{\{sectorCountWord\}\}/gi, secWordLower)
    .replace(/\{\{sectorCountWordCap\}\}/gi, secWordCap)
    .replace(/\{\{sectorsNoun\}\}/gi, secNoun)
    .replace(/\{\{sectorsNounCap\}\}/gi, secNounCap)
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
    .replace(/\bone\s+departments\b/g, 'one department')
    .replace(/\bOne\s+departments\b/g, 'One department')
    .replace(/\b1\s+sectors\b/gi, '1 sector')
    .replace(/\bone\s+sectors\b/g, 'one sector')
    .replace(/\bOne\s+sectors\b/g, 'One sector');
}
