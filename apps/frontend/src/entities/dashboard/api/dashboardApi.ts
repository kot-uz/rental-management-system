import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface DashboardSummary {
  apartments: { total: number; occupied: number; vacant: number; archived: number };
  rent: {
    overdueCount: number;
    overdueAmount: number;
    monthlyCollected: number;
    dueTodayCount: number;
    dueSoonCount: number;
  };
  leases: { active: number };
  repairs: { open: number };
  utilities: { unpaidCount: number; unpaidAmount: number };
}

export interface MonthlyRevenue {
  year: number;
  month: number;
  label: string;
  income: number;
  repairExpenses: number;
  profit: number;
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getSummary: builder.query<{ data: DashboardSummary }, void>({
      query: () => '/dashboard',
    }),
    getRevenue: builder.query<{ data: MonthlyRevenue[] }, { months?: number }>({
      query: (params) => ({ url: '/dashboard/revenue', params }),
    }),
    getProfitability: builder.query<{ data: unknown[] }, void>({
      query: () => '/dashboard/profitability',
    }),
  }),
});

export const {
  useGetSummaryQuery,
  useGetRevenueQuery,
  useGetProfitabilityQuery,
} = dashboardApi;
