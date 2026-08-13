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

const CATEGORY_RULES: Array<{
  pattern: RegExp;
  category: CategoryName;
  isFixed?: boolean;
}> = [
  // Income patterns
  { pattern: /salary|wps salary|payroll/i, category: 'Salary & Income', isFixed: true },
  { pattern: /utility bill payments.*inward|npss.*salary|allowance.*inward|overtime.*inward/i, category: 'Salary & Income', isFixed: true },
  
  // Loan repayments
  { pattern: /finance repayment|to loan:|loan repayment|loan payment/i, category: 'Loan Repayment', isFixed: true },
  
  // Rent
  { pattern: /rent|:rent|to.*rent/i, category: 'Rent', isFixed: true },
  
  // Credit card
  { pattern: /visa card payment|credit card payment|card payment|crdpay|dibipp/i, category: 'Credit Card Payment', isFixed: true },
  { pattern: /agency commissions.*dibipp|visa card payment.*dibipp/i, category: 'Credit Card Payment', isFixed: true },
  
  // Dining
  { pattern: /restaurant|catering|kitopi|green chillies|juice n bites|food.*dubai/i, category: 'Dining & Restaurants' },
  { pattern: /noon.*food|american|americana|kuwait food/i, category: 'Dining & Restaurants' },
  
  // Groceries
  { pattern: /grocery|groceries|supermarket|lulu|carrefour|spinneys|waitrose|geant/i, category: 'Groceries' },
  
  // ATM
  { pattern: /atm cash|remit-to-atm|atm withdrawal|cash withdrawal/i, category: 'ATM Withdrawal' },
  
  // Utilities
  { pattern: /utility bill|dewa|telecom|etisalat|du telecom|internet|phone bill/i, category: 'Utilities', isFixed: true },
  
  // Shopping / E-commerce
  { pattern: /noon|amazon|noon one|noon minutes|noon dubai/i, category: 'Shopping' },
  { pattern: /tabby|shein|zara|h&m/i, category: 'Shopping' },
  
  // Transport
  { pattern: /taxi|uber|careem|nol|rta|petrol|fuel|parking|transport/i, category: 'Transport' },
  
  // Family support
  { pattern: /family support|family.*inward/i, category: 'Family Support' },
  
  // Insurance / Takaful
  { pattern: /takaful|insurance|credit shield/i, category: 'Insurance', isFixed: true },
  
  // Bank charges
  { pattern: /bank charge|agency commission.*cb charges|agency commission.*dib charges|fee|charges/i, category: 'Bank Charges' },
  { pattern: /iloe takaful charges|deferment fees|billed finance|billed profit/i, category: 'Bank Charges', isFixed: true },
  
  // Subscriptions
  { pattern: /subscription fee|netflix|spotify|apple|microsoft|google|noon one/i, category: 'Subscription', isFixed: true },
  
  // Charity
  { pattern: /charitable contribution|charity|donation/i, category: 'Charity' },
  
  // Travel
  { pattern: /airport|travel|airline|hotel|booking\.com|airbnb/i, category: 'Travel' },
  
  // Investment
  { pattern: /investment|trading|stocks?|brokerage|saving/i, category: 'Investment' },
  
  // Transfers (generic - last resort)
  { pattern: /mb fund transfer|inward funds transfer|own account/i, category: 'Transfer' },
];

export function categorizeTransaction(description: string, type: 'credit' | 'debit'): {
  category: CategoryName;
  isFixed: boolean;
} {
  const upper = description.toUpperCase();
  
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) {
      const cat = CATEGORIES[rule.category];
      return {
        category: rule.category,
        isFixed: rule.isFixed !== undefined ? rule.isFixed : cat.isFixed,
      };
    }
  }

  if (type === 'credit') {
    return { category: 'Salary & Income', isFixed: false };
  }

  return { category: 'Uncategorized', isFixed: false };
}

export function getCategoryMeta(category: string) {
  return CATEGORIES[category as CategoryName] || CATEGORIES['Uncategorized'];
}
