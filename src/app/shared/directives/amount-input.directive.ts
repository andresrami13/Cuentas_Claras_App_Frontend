import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// Formatea un número con puntos de miles y apóstrofo en millones
// Ej: 1000 → "1.000"   |   1000000 → "1'000.000"   |   12500000 → "12'500.000"
function formatAmount(value: number): string {
  const str = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
  if (value >= 1_000_000) {
    const idx = str.indexOf('.');
    return str.slice(0, idx) + "'" + str.slice(idx + 1);
  }
  return str;
}

// Elimina puntos y apóstrofos y devuelve el número, o null si está vacío
function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[.'\s]/g, '').replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return isNaN(n) ? null : n;
}

@Directive({
  selector: 'input[appAmountInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AmountInputDirective),
      multi: true,
    },
  ],
  host: { inputmode: 'numeric' },
})
export class AmountInputDirective implements ControlValueAccessor {
  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly el: ElementRef<HTMLInputElement>) {}

  writeValue(value: number | null | undefined): void {
    const num = value != null && !isNaN(Number(value)) ? Number(value) : null;
    this.el.nativeElement.value = num !== null ? formatAmount(num) : '';
  }

  registerOnChange(fn: (v: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.el.nativeElement.disabled = disabled; }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const caret = target.selectionStart ?? target.value.length;
    const oldLen = target.value.length;

    const numeric = parseAmount(target.value);
    const formatted = numeric !== null ? formatAmount(numeric) : '';
    target.value = formatted;

    // Ajustar posición del cursor según el delta de caracteres añadidos por el formato
    const newCaret = Math.max(0, caret + (formatted.length - oldLen));
    try { target.setSelectionRange(newCaret, newCaret); } catch { /* noop */ }

    this.onChange(numeric);
  }

  @HostListener('blur')
  onBlur(): void { this.onTouched(); }
}
