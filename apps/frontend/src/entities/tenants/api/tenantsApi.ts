import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  idType: 'PASSPORT' | 'NATIONAL_ID' | 'OTHER';
  idNumber: string;
  telegram?: string;
  telegramChatId?: string | null;
  emergencyContact?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  leaseParties?: Array<{
    id: string;
    isPrimary: boolean;
    lease: {
      id: string;
      status: string;
      startDate: string;
      endDate: string;
      monthlyRent: number;
      currency: string;
      apartment?: { address: string; unitNumber?: string };
    };
  }>;
}

export const tenantsApi = createApi({
  reducerPath: 'tenantsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Tenant'],
  endpoints: (builder) => ({
    getTenants: builder.query<{ data: Tenant[] }, { search?: string }>({
      query: (params) => ({ url: '/tenants', params }),
      providesTags: ['Tenant'],
    }),
    getTenant: builder.query<{ data: Tenant }, string>({
      query: (id) => `/tenants/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Tenant', id }],
    }),
    createTenant: builder.mutation<{ data: Tenant }, Partial<Tenant>>({
      query: (body) => ({ url: '/tenants', method: 'POST', body }),
      invalidatesTags: ['Tenant'],
    }),
    updateTenant: builder.mutation<{ data: Tenant }, { id: string; data: Partial<Tenant> }>({
      query: ({ id, data }) => ({ url: `/tenants/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Tenant', id }, 'Tenant'],
    }),
    deleteTenant: builder.mutation<void, string>({
      query: (id) => ({ url: `/tenants/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tenant'],
    }),
  }),
});

export const {
  useGetTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
} = tenantsApi;
