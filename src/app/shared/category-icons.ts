// Catálogo curado de iconos (lucide) para las categorías de presupuesto.
// Guardamos el nombre kebab (p. ej. "shopping-cart") y renderizamos el dato del
// icono con <lucide-icon [img]="...">, sin necesidad de registro global.
import {
  House, Lightbulb, Zap, Droplets, Wifi, Sofa, Bath, Wrench, Hammer,
  ShoppingCart, ShoppingBag, Utensils, Coffee, Wine, Beer, Cake,
  Car, Bus, Fuel, Bike, TrainFront, Plane,
  Pill, HeartPulse, Stethoscope, Dumbbell, Heart,
  Shirt, Scissors, Sparkles, GraduationCap, BookOpen, Baby, Smartphone,
  Gamepad2, Film, Music, Tv, Gift,
  Dog, Cat, PawPrint,
  PiggyBank, CreditCard, Landmark, Wallet, Banknote, Receipt, Briefcase,
  Folder,
  LucideIconData,
} from 'lucide-angular';

export interface CategoryIconDef {
  /** Nombre kebab que se persiste, p. ej. "shopping-cart". */
  name: string;
  /** Etiqueta para tooltip/accesibilidad. */
  label: string;
  icon: LucideIconData;
}

export interface CategoryIconGroup {
  group: string;
  icons: CategoryIconDef[];
}

export const DEFAULT_CATEGORY_ICON = 'folder';

export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  {
    group: 'Hogar',
    icons: [
      { name: 'house', label: 'Hogar', icon: House },
      { name: 'lightbulb', label: 'Luz', icon: Lightbulb },
      { name: 'zap', label: 'Energía', icon: Zap },
      { name: 'droplets', label: 'Agua', icon: Droplets },
      { name: 'wifi', label: 'Internet', icon: Wifi },
      { name: 'sofa', label: 'Muebles', icon: Sofa },
      { name: 'bath', label: 'Baño', icon: Bath },
      { name: 'wrench', label: 'Mantenimiento', icon: Wrench },
      { name: 'hammer', label: 'Reparaciones', icon: Hammer },
    ],
  },
  {
    group: 'Comida',
    icons: [
      { name: 'shopping-cart', label: 'Mercado', icon: ShoppingCart },
      { name: 'shopping-bag', label: 'Compras', icon: ShoppingBag },
      { name: 'utensils', label: 'Restaurante', icon: Utensils },
      { name: 'coffee', label: 'Café', icon: Coffee },
      { name: 'wine', label: 'Salidas', icon: Wine },
      { name: 'beer', label: 'Bebidas', icon: Beer },
      { name: 'cake', label: 'Antojos', icon: Cake },
    ],
  },
  {
    group: 'Transporte',
    icons: [
      { name: 'car', label: 'Carro', icon: Car },
      { name: 'bus', label: 'Transporte público', icon: Bus },
      { name: 'fuel', label: 'Gasolina', icon: Fuel },
      { name: 'bike', label: 'Bicicleta', icon: Bike },
      { name: 'train-front', label: 'Tren', icon: TrainFront },
      { name: 'plane', label: 'Viajes', icon: Plane },
    ],
  },
  {
    group: 'Salud',
    icons: [
      { name: 'pill', label: 'Medicinas', icon: Pill },
      { name: 'heart-pulse', label: 'Salud', icon: HeartPulse },
      { name: 'stethoscope', label: 'Médico', icon: Stethoscope },
      { name: 'dumbbell', label: 'Gimnasio', icon: Dumbbell },
      { name: 'heart', label: 'Cuidado', icon: Heart },
    ],
  },
  {
    group: 'Personal',
    icons: [
      { name: 'shirt', label: 'Ropa', icon: Shirt },
      { name: 'scissors', label: 'Peluquería', icon: Scissors },
      { name: 'sparkles', label: 'Belleza', icon: Sparkles },
      { name: 'graduation-cap', label: 'Educación', icon: GraduationCap },
      { name: 'book-open', label: 'Estudio', icon: BookOpen },
      { name: 'baby', label: 'Bebé', icon: Baby },
      { name: 'smartphone', label: 'Celular', icon: Smartphone },
    ],
  },
  {
    group: 'Ocio',
    icons: [
      { name: 'gamepad-2', label: 'Juegos', icon: Gamepad2 },
      { name: 'film', label: 'Cine', icon: Film },
      { name: 'music', label: 'Música', icon: Music },
      { name: 'tv', label: 'Streaming', icon: Tv },
      { name: 'gift', label: 'Regalos', icon: Gift },
    ],
  },
  {
    group: 'Mascotas',
    icons: [
      { name: 'dog', label: 'Perro', icon: Dog },
      { name: 'cat', label: 'Gato', icon: Cat },
      { name: 'paw-print', label: 'Mascotas', icon: PawPrint },
    ],
  },
  {
    group: 'Dinero',
    icons: [
      { name: 'piggy-bank', label: 'Ahorro', icon: PiggyBank },
      { name: 'credit-card', label: 'Tarjeta', icon: CreditCard },
      { name: 'landmark', label: 'Banco / impuestos', icon: Landmark },
      { name: 'wallet', label: 'Billetera', icon: Wallet },
      { name: 'banknote', label: 'Efectivo', icon: Banknote },
      { name: 'receipt', label: 'Facturas', icon: Receipt },
      { name: 'briefcase', label: 'Trabajo', icon: Briefcase },
    ],
  },
  {
    group: 'Otros',
    icons: [
      { name: 'folder', label: 'General', icon: Folder },
    ],
  },
];

const ICON_MAP = new Map<string, LucideIconData>();
for (const g of CATEGORY_ICON_GROUPS) {
  for (const i of g.icons) ICON_MAP.set(i.name, i.icon);
}

/** Devuelve el dato del icono para un nombre guardado; cae al icono por defecto. */
export function getCategoryIconData(name: string | undefined | null): LucideIconData {
  return (name ? ICON_MAP.get(name) : undefined) ?? ICON_MAP.get(DEFAULT_CATEGORY_ICON)!;
}
