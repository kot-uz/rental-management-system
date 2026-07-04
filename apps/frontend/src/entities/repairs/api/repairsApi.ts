import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface Repair {
  id: string;
  apartmentId: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'CANCELED';
  costEstimate?: number;
  costActual?: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  contractorName?: string;
  createdAt: string;
  apartment?: { address: string; unitNumber?: string };
  comments?: Array<{ id: string; body: string; userId: string; createdAt: string }>;
}

export const repairsApi = createApi({
  reducerPath: 'repairsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Repair'],
  endpoints: (builder) => ({
    getRepairs: builder.query<{ data: Repair[] }, { apartmentId?: string; status?: string; tagId?: string }>({
      query: (params) => ({ url: '/repairs', params }),
      providesTags: ['Repair'],
    }),
    getRepair: builder.query<{ data: Repair }, string>({
      query: (id) => `/repairs/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Repair', id }],
    }),
    createRepair: builder.mutation<{ data: Repair }, unknown>({
      query: (body) => ({ url: '/repairs', method: 'POST', body }),
      invalidatesTags: ['Repair'],
    }),
    updateRepair: builder.mutation<{ data: Repair }, { id: string; data: unknown }>({
      query: ({ id, data }) => ({ url: `/repairs/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Repair', id }, 'Repair'],
    }),
    transitionRepair: builder.mutation<{ data: Repair }, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/repairs/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Repair', id }, 'Repair'],
    }),
    addRepairComment: builder.mutation<unknown, { id: string; body: string }>({
      query: ({ id, body }) => ({ url: `/repairs/${id}/comments`, method: 'POST', body: { body } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Repair', id }],
    }),
    deleteRepair: builder.mutation<void, string>({
      query: (id) => ({ url: `/repairs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Repair'],
    }),
  }),
});

export const {
  useGetRepairsQuery,
  useGetRepairQuery,
  useCreateRepairMutation,
  useUpdateRepairMutation,
  useTransitionRepairMutation,
  useAddRepairCommentMutation,
  useDeleteRepairMutation,
} = repairsApi;
