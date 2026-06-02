import { Component, inject, computed, OnInit } from '@angular/core';
import { NgxApexchartsModule } from 'ngx-apexcharts';
import { TransactionService } from '../../core/services/transaction.service';
import { CATEGORY_LABELS } from '../../core/models/transaction.model';

@Component({
  selector: 'app-reports',
  imports: [NgxApexchartsModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  private txService = inject(TransactionService);

  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;
  readonly balance = this.txService.balance;

  monthlyChartOptions: any = {};
  categoryChartOptions: any = {};

  ngOnInit(): void {
    this.buildMonthlyChart();
    this.buildCategoryChart();
  }

  private buildMonthlyChart(): void {
    const data = this.txService.getByMonth();
    const months = data.map(d => {
      const [year, month] = d.month.split('-');
      return new Date(+year, +month - 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    });

    this.monthlyChartOptions = {
      series: [
        { name: 'Ingresos', data: data.map(d => d.income) },
        { name: 'Egresos', data: data.map(d => d.expenses) },
      ],
      chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
      colors: ['#28B463', '#CB4335'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', borderRadiusApplication: 'end' } },
      dataLabels: { enabled: false },
      stroke: { show: false },
      xaxis: { categories: months, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: '#9CA3AF', fontSize: '11px' } } },
      yaxis: { labels: { formatter: (v: number) => `$${(v / 1000000).toFixed(1)}M`, style: { colors: '#9CA3AF', fontSize: '11px' } } },
      grid: { borderColor: '#F3F4F6', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
      legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', markers: { radius: 4 } },
      tooltip: { y: { formatter: (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) } },
    };
  }

  private buildCategoryChart(): void {
    const data = this.txService.getByCategory();
    const labels = data.map(d => CATEGORY_LABELS[d.category as keyof typeof CATEGORY_LABELS] || d.category);
    const amounts = data.map(d => d.amount);
    const colors = data.map(d => d.type === 'income' ? '#28B463' : '#CB4335');

    this.categoryChartOptions = {
      series: [{ name: 'Monto', data: amounts }],
      chart: { type: 'bar', height: 320, toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
      colors: ['#2E4057'],
      plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '60%', borderRadiusApplication: 'end' } },
      dataLabels: { enabled: false },
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { formatter: (v: number) => `$${(v / 1000000).toFixed(1)}M`, style: { colors: '#9CA3AF', fontSize: '11px' } } },
      yaxis: { labels: { style: { colors: '#6B7280', fontSize: '12px' } } },
      grid: { borderColor: '#F3F4F6', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
      tooltip: { y: { formatter: (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) } },
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  get savingsRate(): number {
    const inc = this.totalIncome();
    return inc > 0 ? Math.round(((inc - this.totalExpenses()) / inc) * 100) : 0;
  }

  get topExpenseCategories() {
    return this.txService.getByCategory()
      .filter(d => d.type === 'expense')
      .slice(0, 3);
  }
}
