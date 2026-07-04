import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Apartment,
  AttachMoney,
  Warning,
  Build,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useGetSummaryQuery, useGetRevenueQuery } from '../../entities/dashboard/api/dashboardApi';
import { formatMoney } from '../../shared/utils/formatMoney';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, subtitle, icon, color }: KpiCardProps) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
            {subtitle && <Typography color="text.secondary" variant="body2" mt={0.5}>{subtitle}</Typography>}
          </Box>
          <Box sx={{ bgcolor: color, borderRadius: 2, p: 1.5, color: 'white' }}>{icon}</Box>
        </Box>
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

  if (summaryLoading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" mb={3}>{t('dashboard.title')}</Typography>

      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('dashboard.totalApartments')}
            value={summary?.apartments.total ?? 0}
            subtitle={t('dashboard.occupiedVacant', { occupied: summary?.apartments.occupied ?? 0, vacant: summary?.apartments.vacant ?? 0 })}
            icon={<Apartment />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('dashboard.monthlyCollected')}
            value={formatMoney(summary?.rent.monthlyCollected ?? 0)}
            subtitle={t('dashboard.thisMonth')}
            icon={<AttachMoney />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('dashboard.overdueRent')}
            value={summary?.rent.overdueCount ?? 0}
            subtitle={t('dashboard.overdueTotal', { amount: formatMoney(summary?.rent.overdueAmount ?? 0) })}
            icon={<Warning />}
            color={summary?.rent.overdueCount ? '#d32f2f' : '#757575'}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('dashboard.openRepairs')}
            value={summary?.repairs.open ?? 0}
            subtitle={t('dashboard.unpaidUtilities', { count: summary?.utilities.unpaidCount ?? 0 })}
            icon={<Build />}
            color="#f57c00"
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>{t('dashboard.revenueOverview')}</Typography>
        {revenueLoading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatMoney(value as number)} />
              <Legend />
              <Bar dataKey="income" name={t('dashboard.income')} fill="#1976d2" />
              <Bar dataKey="repairExpenses" name={t('dashboard.repairCosts')} fill="#d32f2f" />
              <Bar dataKey="profit" name={t('dashboard.netProfit')} fill="#388e3c" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {summary && summary.rent.overdueCount > 0 ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          {t('dashboard.rentOverdueAlert', {
            count: summary.rent.overdueCount,
            amount: formatMoney(summary.rent.overdueAmount),
          })}
        </Alert>
      ) : null}

      {summary && summary.rent.dueSoonCount > 0 ? (
        <Alert severity="warning" sx={{ mt: 3 }}>
          {t('dashboard.rentDueAlert', {
            count: summary.rent.dueSoonCount,
            today: summary.rent.dueTodayCount,
          })}
        </Alert>
      ) : null}

      {summary?.utilities.unpaidAmount ? (
        <Alert severity="warning" sx={{ mt: 3 }}>
          {t('dashboard.unpaidUtilityAlert', { count: summary.utilities.unpaidCount, amount: formatMoney(summary.utilities.unpaidAmount) })}
        </Alert>
      ) : null}
    </Box>
  );
}
