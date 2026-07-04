import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  usageCount?: number;
  createdAt?: string;
}

interface EntityRef {
  entityType: string;
  entityId: string;
}

export const tagsApi = createApi({
  reducerPath: 'tagsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Tag', 'EntityTags'],
  endpoints: (builder) => ({
    getTags: builder.query<{ data: Tag[] }, void>({
      query: () => '/tags',
      providesTags: ['Tag'],
    }),
    getEntityTags: builder.query<{ data: Tag[] }, EntityRef>({
      query: (params) => ({ url: '/tags/entity', params }),
      providesTags: (_r, _e, { entityId }) => [{ type: 'EntityTags', id: entityId }],
    }),
    createTag: builder.mutation<{ data: Tag }, { name: string; color?: string }>({
      query: (body) => ({ url: '/tags', method: 'POST', body }),
      invalidatesTags: ['Tag'],
    }),
    updateTag: builder.mutation<{ data: Tag }, { id: string; name?: string; color?: string }>({
      query: ({ id, ...body }) => ({ url: `/tags/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Tag'],
    }),
    deleteTag: builder.mutation<void, string>({
      query: (id) => ({ url: `/tags/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Tag'],
    }),
    assignTag: builder.mutation<unknown, { id: string } & EntityRef>({
      query: ({ id, ...body }) => ({ url: `/tags/${id}/assign`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { entityId }) => ['Tag', { type: 'EntityTags', id: entityId }],
    }),
    unassignTag: builder.mutation<void, { id: string } & EntityRef>({
      query: ({ id, ...body }) => ({ url: `/tags/${id}/unassign`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { entityId }) => ['Tag', { type: 'EntityTags', id: entityId }],
    }),
  }),
});

export const {
  useGetTagsQuery,
  useGetEntityTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useAssignTagMutation,
  useUnassignTagMutation,
} = tagsApi;
