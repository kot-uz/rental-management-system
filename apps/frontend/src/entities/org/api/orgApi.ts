import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface OrgSettings {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  locale: string;
  rentDueDay: number;
  lateFeeGraceDays: number;
  lateFeePercent: number;
  createdAt: string;
  updatedAt: string;
}

export type UpdateOrgSettings = Partial<
  Pick<
    OrgSettings,
    | 'name'
    | 'timezone'
    | 'currency'
    | 'locale'
    | 'rentDueDay'
    | 'lateFeeGraceDays'
    | 'lateFeePercent'
  >
>;

export const orgApi = createApi({
  reducerPath: 'orgApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Org'],
  endpoints: (builder) => ({
    getOrg: builder.query<{ data: OrgSettings }, void>({
      query: () => '/org',
      providesTags: ['Org'],
    }),
    updateOrgSettings: builder.mutation<{ data: OrgSettings }, UpdateOrgSettings>({
      query: (body) => ({ url: '/org/settings', method: 'PATCH', body }),
      invalidatesTags: ['Org'],
    }),
  }),
});

export const { useGetOrgQuery, useUpdateOrgSettingsMutation } = orgApi;
