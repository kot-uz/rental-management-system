import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface TelegramLink {
  configured: boolean;
  url: string | null;
  token: string;
}

export interface TelegramStatus {
  botConfigured: boolean;
  linked: boolean;
}

export const telegramApi = createApi({
  reducerPath: 'telegramApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['TgStatus'],
  endpoints: (builder) => ({
    getTelegramStatus: builder.query<{ data: TelegramStatus }, void>({
      query: () => '/telegram/status',
      providesTags: ['TgStatus'],
    }),
    linkMyTelegram: builder.mutation<{ data: TelegramLink }, void>({
      query: () => ({ url: '/telegram/link/me', method: 'POST' }),
    }),
    linkTenantTelegram: builder.mutation<{ data: TelegramLink }, string>({
      query: (tenantId) => ({ url: `/telegram/link/tenant/${tenantId}`, method: 'POST' }),
    }),
  }),
});

export const {
  useGetTelegramStatusQuery,
  useLinkMyTelegramMutation,
  useLinkTenantTelegramMutation,
} = telegramApi;
