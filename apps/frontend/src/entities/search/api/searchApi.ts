import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface SearchResult {
  type: 'apartment' | 'tenant' | 'repair' | 'contractor';
  id: string;
  title: string;
  subtitle?: string;
}

export const searchApi = createApi({
  reducerPath: 'searchApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    search: builder.query<{ data: SearchResult[] }, string>({
      query: (q) => ({ url: '/search', params: { q } }),
    }),
  }),
});

export const { useSearchQuery } = searchApi;
