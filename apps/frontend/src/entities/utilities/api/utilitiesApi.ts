import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface UtilityRecord {
  id: string;
  apartmentId: string;
  type: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'CONFIRMED';
  notes?: string;
  receiptFileId?: string;
  readingFrom?: number;
  readingTo?: number;
  apartment?: { address: string; unitNumber?: string };
}

export const utilitiesApi = createApi({
  reducerPath: 'utilitiesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Utility'],
  endpoints: (builder) => ({
    getUtilities: builder.query<{ data: UtilityRecord[] }, { apartmentId?: string; type?: string; status?: string }>({
      query: (params) => ({ url: '/utilities', params }),
      providesTags: ['Utility'],
    }),
    getUtilityById: builder.query<{ data: UtilityRecord }, string>({
      query: (id) => `/utilities/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Utility' as const, id }],
    }),
    createUtility: builder.mutation<{ data: UtilityRecord }, unknown>({
      query: (body) => ({ url: '/utilities', method: 'POST', body }),
      invalidatesTags: ['Utility'],
    }),
    updateUtility: builder.mutation<{ data: UtilityRecord }, { id: string; data: unknown }>({
      query: ({ id, data }) => ({ url: `/utilities/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Utility'],
    }),
    markUtilityPaid: builder.mutation<{ data: UtilityRecord }, string>({
      query: (id) => ({ url: `/utilities/${id}/pay`, method: 'PATCH' }),
      invalidatesTags: ['Utility'],
    }),
    deleteUtility: builder.mutation<void, string>({
      query: (id) => ({ url: `/utilities/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Utility'],
    }),
  }),
});

export const {
  useGetUtilitiesQuery,
  useGetUtilityByIdQuery,
  useCreateUtilityMutation,
  useUpdateUtilityMutation,
  useMarkUtilityPaidMutation,
  useDeleteUtilityMutation,
} = utilitiesApi;
