import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface ContractorRepairRef {
  id: string;
  title: string;
  status: string;
  costActual?: string | null;
  createdAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  telegram?: string;
  specialty?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  repairs?: ContractorRepairRef[];
}

export const contractorsApi = createApi({
  reducerPath: 'contractorsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Contractor'],
  endpoints: (builder) => ({
    getContractors: builder.query<{ data: Contractor[] }, { search?: string }>({
      query: (params) => ({ url: '/contractors', params }),
      providesTags: ['Contractor'],
    }),
    getContractor: builder.query<{ data: Contractor }, string>({
      query: (id) => `/contractors/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Contractor', id }],
    }),
    createContractor: builder.mutation<{ data: Contractor }, Partial<Contractor>>({
      query: (body) => ({ url: '/contractors', method: 'POST', body }),
      invalidatesTags: ['Contractor'],
    }),
    updateContractor: builder.mutation<
      { data: Contractor },
      { id: string; data: Partial<Contractor> }
    >({
      query: ({ id, data }) => ({ url: `/contractors/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Contractor', id }, 'Contractor'],
    }),
    deleteContractor: builder.mutation<void, string>({
      query: (id) => ({ url: `/contractors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Contractor'],
    }),
  }),
});

export const {
  useGetContractorsQuery,
  useGetContractorQuery,
  useCreateContractorMutation,
  useUpdateContractorMutation,
  useDeleteContractorMutation,
} = contractorsApi;
