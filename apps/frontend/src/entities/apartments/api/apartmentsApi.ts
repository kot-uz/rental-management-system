import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface Apartment {
  id: string;
  address: string;
  unitNumber?: string;
  floor?: number;
  rooms?: number;
  areaSqm?: number;
  status: 'VACANT' | 'OCCUPIED' | 'ARCHIVED';
  notes?: string;
  createdAt: string;
  leases?: Array<{
    id: string;
    monthlyRent: number;
    endDate: string;
    parties: Array<{ tenant: { firstName: string; lastName: string } }>;
  }>;
}

export const apartmentsApi = createApi({
  reducerPath: 'apartmentsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Apartment'],
  endpoints: (builder) => ({
    getApartments: builder.query<{ data: Apartment[] }, { search?: string; status?: string; tagId?: string }>({
      query: (params) => ({ url: '/apartments', params }),
      providesTags: ['Apartment'],
    }),
    getApartment: builder.query<{ data: Apartment }, string>({
      query: (id) => `/apartments/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Apartment', id }],
    }),
    getApartmentStats: builder.query<{ data: { total: number; occupied: number; vacant: number } }, void>({
      query: () => '/apartments/stats',
    }),
    createApartment: builder.mutation<{ data: Apartment }, Partial<Apartment>>({
      query: (body) => ({ url: '/apartments', method: 'POST', body }),
      invalidatesTags: ['Apartment'],
    }),
    updateApartment: builder.mutation<{ data: Apartment }, { id: string; data: Partial<Apartment> }>({
      query: ({ id, data }) => ({ url: `/apartments/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Apartment', id }, 'Apartment'],
    }),
    deleteApartment: builder.mutation<void, string>({
      query: (id) => ({ url: `/apartments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Apartment'],
    }),
  }),
});

export const {
  useGetApartmentsQuery,
  useGetApartmentQuery,
  useGetApartmentStatsQuery,
  useCreateApartmentMutation,
  useUpdateApartmentMutation,
  useDeleteApartmentMutation,
} = apartmentsApi;
