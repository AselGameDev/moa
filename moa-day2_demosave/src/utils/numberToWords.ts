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
 * Formats a template string containing {departmentCount} or {departmentWord} with correct singular/plural
 */
export function formatDepartmentCountText(template: string, count: number): string {
  const word = numberToWords(count);
  const noun = count === 1 ? 'department' : 'departments';
  const nounCap = count === 1 ? 'Department' : 'Departments';

  return template
    .replace(/{departmentCount}/gi, word)
    .replace(/{departmentCountNum}/gi, count.toString())
    .replace(/{departmentWord}/gi, `${word} ${noun}`)
    .replace(/{departmentsNoun}/gi, noun)
    .replace(/{departmentsNounCap}/gi, nounCap);
}
