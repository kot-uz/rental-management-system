import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface LockedPeriod {
  id: string;
  yearMonth: string;
  lockedAt: string;
  lockedByUserId: string;
  unlockedAt?: string | null;
  unlockedByUserId?: string | null;
  note?: string | null;
}

export const accountingApi = createApi({
  reducerPath: 'accountingApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['LockedPeriod'],
  endpoints: (builder) => ({
    getLocks: builder.query<{ data: LockedPeriod[] }, void>({
      query: () => '/accounting/locks',
      providesTags: ['LockedPeriod'],
    }),
    lockPeriod: builder.mutation<{ data: LockedPeriod }, { yearMonth: string; note?: string }>({
      query: (body) => ({ url: '/accounting/locks', method: 'POST', body }),
      invalidatesTags: ['LockedPeriod'],
    }),
    unlockPeriod: builder.mutation<{ data: LockedPeriod }, string>({
      query: (yearMonth) => ({ url: `/accounting/locks/${yearMonth}`, method: 'DELETE' }),
      invalidatesTags: ['LockedPeriod'],
    }),
  }),
});

export const { useGetLocksQuery, useLockPeriodMutation, useUnlockPeriodMutation } = accountingApi;
