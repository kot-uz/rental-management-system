import React from 'react';
import { AlertTriangle, Banknote, Building2, Wrench } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useGetSummaryQuery, useGetRevenueQuery } from '../../entities/dashboard/api/dashboardApi';
import { formatMoney } from '../../shared/utils/formatMoney';
import { PageSpinner, Spinner } from '../../shared/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconClassName: string;
}

function KpiCard({ title, value, subtitle, icon, iconClassName }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5 text-white', iconClassName)}>{icon}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: summaryData, isLoading: summaryLoading } = useGetSummaryQuery();
  const { data: revenueData, isLoading: revenueLoading } = useGetRevenueQuery({ months: 6 });

  const summary = summaryData?.data;
  const revenue = revenueData?.data ?? [];

  if (summaryLoading) return <PageSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t('dashboard.totalApartments')}
          value={summary?.apartments.total ?? 0}
          subtitle={t('dashboard.occupiedVacant', {
            occupied: summary?.apartments.occupied ?? 0,
            vacant: summary?.apartments.vacant ?? 0,
          })}
          icon={<Building2 className="h-5 w-5" />}
          iconClassName="bg-blue-600"
        />
        <KpiCard
          title={t('dashboard.monthlyCollected')}
          value={formatMoney(summary?.rent.monthlyCollected ?? 0)}
          subtitle={t('dashboard.thisMonth')}
          icon={<Banknote className="h-5 w-5" />}
          iconClassName="bg-emerald-600"
        />
        <KpiCard
          title={t('dashboard.overdueRent')}
          value={summary?.rent.overdueCount ?? 0}
          subtitle={t('dashboard.overdueTotal', {
            amount: formatMoney(summary?.rent.overdueAmount ?? 0),
          })}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconClassName={summary?.rent.overdueCount ? 'bg-red-600' : 'bg-zinc-500'}
        />
        <KpiCard
          title={t('dashboard.openRepairs')}
          value={summary?.repairs.open ?? 0}
          subtitle={t('dashboard.unpaidUtilities', { count: summary?.utilities.unpaidCount ?? 0 })}
          icon={<Wrench className="h-5 w-5" />}
          iconClassName="bg-orange-500"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('dashboard.revenueOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  formatter={(value) => formatMoney(value as number)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend />
                <Bar dataKey="income" name={t('dashboard.income')} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="repairExpenses" name={t('dashboard.repairCosts')} fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="profit" name={t('dashboard.netProfit')} fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {summary && summary.rent.overdueCount > 0 ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard.rentOverdueAlert', {
              count: summary.rent.overdueCount,
              amount: formatMoney(summary.rent.overdueAmount),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {summary && summary.rent.dueSoonCount > 0 ? (
        <Alert className="mt-4 border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard.rentDueAlert', {
              count: summary.rent.dueSoonCount,
              today: summary.rent.dueTodayCount,
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {summary?.utilities.unpaidAmount ? (
        <Alert className="mt-4 border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard.unpaidUtilityAlert', {
              count: summary.utilities.unpaidCount,
              amount: formatMoney(summary.utilities.unpaidAmount),
            })}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
