export type AccountType = 'BANK' | 'WALLET' | 'CASH' | 'OTHER';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Banco',
  WALLET: 'Billetera digital',
  CASH: 'Efectivo',
  OTHER: 'Otra',
};

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  provider: string | null;
  initialBalance: number;
  color: string;
  icon: string;
  archived: boolean;
}

export interface AccountForm {
  name: string;
  type: AccountType;
  provider: string | null;
  initialBalance: number | null;
  color: string;
  icon: string;
}

export interface AccountPreset {
  provider: string;
  name: string;
  type: AccountType;
  color: string;
  icon: string;
}

/** Cuentas frecuentes en Colombia. El usuario elige una y solo pone su saldo. */
export const ACCOUNT_PRESETS: AccountPreset[] = [
  { provider: 'bancolombia', name: 'Bancolombia', type: 'BANK', color: '#FDDA24', icon: '🏦' },
  { provider: 'nequi', name: 'Nequi', type: 'WALLET', color: '#DA0081', icon: '📱' },
  { provider: 'daviplata', name: 'Daviplata', type: 'WALLET', color: '#ED1C27', icon: '📲' },
  { provider: 'davivienda', name: 'Davivienda', type: 'BANK', color: '#ED1C27', icon: '🏦' },
  { provider: 'bbva', name: 'BBVA', type: 'BANK', color: '#004481', icon: '🏦' },
  { provider: 'banco-bogota', name: 'Banco de Bogotá', type: 'BANK', color: '#B5121B', icon: '🏦' },
  { provider: 'nu', name: 'Nu', type: 'BANK', color: '#820AD1', icon: '💳' },
  { provider: 'lulo', name: 'Lulo Bank', type: 'BANK', color: '#13C1A3', icon: '🏦' },
  { provider: 'scotiabank', name: 'Scotiabank Colpatria', type: 'BANK', color: '#EC111A', icon: '🏦' },
  { provider: 'banco-occidente', name: 'Banco de Occidente', type: 'BANK', color: '#00953B', icon: '🏦' },
  { provider: 'banco-caja-social', name: 'Banco Caja Social', type: 'BANK', color: '#00599D', icon: '🏦' },
  { provider: 'rappipay', name: 'RappiPay', type: 'WALLET', color: '#FF441F', icon: '📱' },
  { provider: 'efectivo', name: 'Efectivo', type: 'CASH', color: '#16A34A', icon: '💵' },
];

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  BANK: '🏦',
  WALLET: '📱',
  CASH: '💵',
  OTHER: '💳',
};

/** Paleta para cuentas personalizadas. */
export const ACCOUNT_COLORS: string[] = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
  '#CA8A04', '#16A34A', '#0D9488', '#0891B2', '#475569',
];
