export const CATEGORIES = {
  'Salary & Income': { icon: '💰', color: '#22c55e', isFixed: true },
  'Loan Repayment': { icon: '🏦', color: '#ef4444', isFixed: true },
  'Rent': { icon: '🏠', color: '#f97316', isFixed: true },
  'Credit Card Payment': { icon: '💳', color: '#8b5cf6', isFixed: true },
  'Groceries': { icon: '🛒', color: '#84cc16', isFixed: false },
  'Dining & Restaurants': { icon: '🍽️', color: '#f59e0b', isFixed: false },
  'Transport': { icon: '🚗', color: '#3b82f6', isFixed: false },
  'Utilities': { icon: '⚡', color: '#06b6d4', isFixed: true },
  'Shopping': { icon: '🛍️', color: '#ec4899', isFixed: false },
  'ATM Withdrawal': { icon: '🏧', color: '#6b7280', isFixed: false },
  'Transfer': { icon: '↔️', color: '#64748b', isFixed: false },
  'Family Support': { icon: '👨‍👩‍👧', color: '#d97706', isFixed: false },
  'Insurance': { icon: '🛡️', color: '#7c3aed', isFixed: true },
  'Subscription': { icon: '📱', color: '#0891b2', isFixed: true },
  'Charity': { icon: '❤️', color: '#dc2626', isFixed: false },
  'Bank Charges': { icon: '🏛️', color: '#9ca3af', isFixed: false },
  'Investment': { icon: '📈', color: '#16a34a', isFixed: false },
  'Travel': { icon: '✈️', color: '#0284c7', isFixed: false },
  'Healthcare': { icon: '🏥', color: '#b91c1c', isFixed: false },
  'Food Delivery': { icon: '🍕', color: '#ea580c', isFixed: false },
  'Entertainment': { icon: '🎬', color: '#7c3aed', isFixed: false },
  'Uncategorized': { icon: '📋', color: '#6b7280', isFixed: false },
} as const;

export type CategoryName = keyof typeof CATEGORIES;

const CATEGORY_RULES: Array<{ pattern: RegExp; category: CategoryName; isFixed?: boolean }> = [
  { pattern: /\bwps salary\b|wps.*salary/i, category: 'Salary & Income', isFixed: true },
  { pattern: /acwps-\d{2}-\d{2}-/i, category: 'Salary & Income', isFixed: true },
  { pattern: /\[sly\]|salary\s*\]/i, category: 'Salary & Income', isFixed: true },
  { pattern: /inward.*\bsalary\b|\bsalary\b.*inward/i, category: 'Salary & Income', isFixed: true },
  { pattern: /finance repayment|to loan:/i, category: 'Loan Repayment', isFixed: true },
  { pattern: /loan repayment|loan payment|emi payment/i, category: 'Loan Repayment', isFixed: true },
  { pattern: /deferment fees|postponement/i, category: 'Loan Repayment', isFixed: true },
  { pattern: /mb fund transfer.*:rent\b|transfer.*001523219125401/i, category: 'Rent', isFixed: true },
  { pattern: /\brent payment\b|\bpay rent\b/i, category: 'Rent', isFixed: true },
  { pattern: /\bvisa card payment\b/i, category: 'Credit Card Payment', isFixed: true },
  { pattern: /agency commissions.*dibipp|visa card payment.*dibipp/i, category: 'Credit Card Payment', isFixed: true },
  { pattern: /mob-crdpay|crdpay\d/i, category: 'Credit Card Payment', isFixed: true },
  { pattern: /\bcredit card payment\b/i, category: 'Credit Card Payment', isFixed: true },
  { pattern: /restaurant|catering|kitopi|green chillies|juice n bites/i, category: 'Dining & Restaurants' },
  { pattern: /\bnoon food\b|noon minutes/i, category: 'Dining & Restaurants' },
  { pattern: /\bgrocery\b|groceries|supermarket|lulu|carrefour|spinneys/i, category: 'Groceries' },
  { pattern: /remit-to-atm|atm cash withdrawal|atm withdrawal|\bcdm cash\b/i, category: 'ATM Withdrawal' },
  { pattern: /\[utl\]|utility bill payment/i, category: 'Utilities', isFixed: true },
  { pattern: /dewa|etisalat|\bdu telecom\b/i, category: 'Utilities', isFixed: true },
  { pattern: /\bnoon one\b|\bamazon now\b|\bnoon dubai\b/i, category: 'Shopping' },
  { pattern: /\buber\b|\bcareem\b|\bnol card\b|\brta\b/i, category: 'Transport' },
  { pattern: /family support.*inward|\[fsu\]/i, category: 'Family Support' },
  { pattern: /takaful charges|credit shield/i, category: 'Insurance', isFixed: true },
  { pattern: /agency commissions.*\b(cb|dib)\b charges/i, category: 'Bank Charges' },
  { pattern: /iloe takaful|billed finance|billed profit|vat on/i, category: 'Bank Charges' },
  { pattern: /annual membership fee/i, category: 'Bank Charges', isFixed: true },
  { pattern: /airport companion|\[str\]/i, category: 'Travel' },
  { pattern: /charitable contribution|\[chc\]/i, category: 'Charity' },
  { pattern: /inward uae funds transfer ipi/i, category: 'Investment' },
  { pattern: /mb fund transfer|inward funds transfer|own account trnsfer/i, category: 'Transfer' },
  { pattern: /financial services.*inward/i, category: 'Transfer' },
];

export function categorizeTransaction(description: string, type: 'credit' | 'debit'): { category: CategoryName; isFixed: boolean } {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) {
      const cat = CATEGORIES[rule.category];
      return { category: rule.category, isFixed: rule.isFixed !== undefined ? rule.isFixed : cat.isFixed };
    }
  }
  if (type === 'credit') return { category: 'Transfer', isFixed: false };
  return { category: 'Uncategorized', isFixed: false };
}

export function getCategoryMeta(category: string) {
  return CATEGORIES[category as CategoryName] || CATEGORIES['Uncategorized'];
}
