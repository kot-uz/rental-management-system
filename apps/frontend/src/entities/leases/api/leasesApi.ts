import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface Lease {
  id: string;
  apartmentId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  startDate: string;
  endDate: string;
  monthlyRent: number;
  currency: string;
  depositAmount: number;
  depositBalance: number;
  depositStatus: 'HELD' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'FORFEITED';
  depositReturnedAmount?: number | null;
  depositSettledAt?: string | null;
  depositSettlementNote?: string | null;
  rentDueDay: number;
  terminatedAt?: string;
  terminationNote?: string;
  penaltyAmount?: number;
  apartment?: { id?: string; address: string; unitNumber?: string };
  parties?: Array<{ isPrimary: boolean; tenant: { id: string; firstName: string; lastName: string } }>;
  rentPeriods?: Array<{
    id: string;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    expectedAmount: number;
    paidAmount: number;
    status: string;
  }>;
  deductions?: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
}

export const leasesApi = createApi({
  reducerPath: 'leasesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Lease'],
  endpoints: (builder) => ({
    getLeases: builder.query<{ data: Lease[] }, { apartmentId?: string; status?: string }>({
      query: (params) => ({ url: '/leases', params }),
      providesTags: ['Lease'],
    }),
    getLease: builder.query<{ data: Lease }, string>({
      query: (id) => `/leases/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Lease', id }],
    }),
    createLease: builder.mutation<{ data: Lease }, unknown>({
      query: (body) => ({ url: '/leases', method: 'POST', body }),
      invalidatesTags: ['Lease'],
    }),
    terminateLease: builder.mutation<{ data: Lease }, { id: string; data: unknown }>({
      query: ({ id, data }) => ({ url: `/leases/${id}/terminate`, method: 'PATCH', body: data }),
      invalidatesTags: ['Lease'],
    }),
    addDeduction: builder.mutation<unknown, { id: string; amount: number; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/leases/${id}/deductions`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Lease', id }],
    }),
    settleDeposit: builder.mutation<{ data: Lease }, { id: string; returnAmount: number; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/leases/${id}/deposit/settle`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Lease', id }],
    }),
  }),
});

export const {
  useGetLeasesQuery,
  useGetLeaseQuery,
  useCreateLeaseMutation,
  useTerminateLeaseMutation,
  useAddDeductionMutation,
  useSettleDepositMutation,
} = leasesApi;
