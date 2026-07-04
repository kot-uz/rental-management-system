import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface RentPeriod {
  id: string;
  leaseId: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOIDED';
  lease?: {
    apartment?: { address: string; unitNumber?: string };
    parties?: Array<{ isPrimary: boolean; tenant: { firstName: string; lastName: string } }>;
  };
  payments?: Array<{ id: string; amount: number; paymentDate: string; method: string }>;
}

export const rentApi = createApi({
  reducerPath: 'rentApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['RentPeriod'],
  endpoints: (builder) => ({
    getRentPeriods: builder.query<{ data: RentPeriod[] }, { status?: string }>({
      query: (params) => ({ url: '/rent', params }),
      providesTags: ['RentPeriod'],
    }),
    getOverdueRent: builder.query<{ data: RentPeriod[] }, void>({
      query: () => '/rent/overdue',
      providesTags: ['RentPeriod'],
    }),
    getRentByLease: builder.query<{ data: RentPeriod[] }, string>({
      query: (leaseId) => `/rent/lease/${leaseId}`,
      providesTags: ['RentPeriod'],
    }),
    recordPayment: builder.mutation<unknown, { periodId: string; data: unknown }>({
      query: ({ periodId, data }) => ({
        url: `/rent/${periodId}/payments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['RentPeriod'],
    }),
  }),
});

export const {
  useGetRentPeriodsQuery,
  useGetOverdueRentQuery,
  useGetRentByLeaseQuery,
  useRecordPaymentMutation,
} = rentApi;
