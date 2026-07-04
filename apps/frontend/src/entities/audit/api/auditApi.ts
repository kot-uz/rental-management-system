import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  createdAt: string;
}

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Audit'],
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      { data: AuditLogEntry[] },
      { entityType?: string; limit?: number }
    >({
      query: (params) => ({ url: '/audit', params }),
      providesTags: ['Audit'],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;
