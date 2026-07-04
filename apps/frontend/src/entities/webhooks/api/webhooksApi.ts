import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export const WEBHOOK_EVENTS = [
  'rent.payment.created',
  'rent.payment.voided',
  'rent.period.overdue',
  'lease.created',
  'lease.ended',
  'repair.created',
  'repair.resolved',
  'document.expiring',
  'file.processed',
  'export.ready',
] as const;

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  eventId: string;
  eventType: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  attempts: number;
  responseStatus?: number | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookBody {
  url: string;
  events: string[];
  secret: string;
  active?: boolean;
}

export const webhooksApi = createApi({
  reducerPath: 'webhooksApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Webhook', 'WebhookDelivery'],
  endpoints: (builder) => ({
    getWebhooks: builder.query<{ data: WebhookEndpoint[] }, void>({
      query: () => '/webhooks',
      providesTags: ['Webhook'],
    }),
    getWebhookDeliveries: builder.query<{ data: WebhookDelivery[] }, string>({
      query: (id) => `/webhooks/${id}/deliveries`,
      providesTags: (_r, _e, id) => [{ type: 'WebhookDelivery', id }],
    }),
    createWebhook: builder.mutation<{ data: WebhookEndpoint }, CreateWebhookBody>({
      query: (body) => ({ url: '/webhooks', method: 'POST', body }),
      invalidatesTags: ['Webhook'],
    }),
    updateWebhook: builder.mutation<
      { data: WebhookEndpoint },
      { id: string; data: Partial<CreateWebhookBody> }
    >({
      query: ({ id, data }) => ({ url: `/webhooks/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Webhook'],
    }),
    deleteWebhook: builder.mutation<void, string>({
      query: (id) => ({ url: `/webhooks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Webhook'],
    }),
    testWebhook: builder.mutation<{ data: { deliveryId: string; eventId: string } }, string>({
      query: (id) => ({ url: `/webhooks/${id}/test`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'WebhookDelivery', id }],
    }),
  }),
});

export const {
  useGetWebhooksQuery,
  useGetWebhookDeliveriesQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
} = webhooksApi;
