import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export interface FileAsset {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status?: 'PENDING' | 'LIVE' | 'DELETED';
  purpose?: string;
  ownerType?: string;
  ownerId?: string;
  thumbS3Key?: string | null;
  createdAt?: string;
}

export const filesApi = createApi({
  reducerPath: 'filesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Files'],
  endpoints: (builder) => ({
    uploadFile: builder.mutation<{ data: FileAsset }, FormData>({
      query: (formData) => ({ url: '/files/upload', method: 'POST', body: formData }),
      invalidatesTags: ['Files'],
    }),
    getFileUrl: builder.query<{ data: { url: string } }, string>({
      query: (id) => `/files/${id}/url`,
    }),
    getFileThumb: builder.query<{ data: { url: string | null } }, string>({
      query: (id) => `/files/${id}/thumb`,
    }),
    getFilesByOwner: builder.query<{ data: FileAsset[] }, { ownerType: string; ownerId: string }>({
      query: ({ ownerType, ownerId }) => `/files/owner/${ownerType}/${ownerId}`,
      providesTags: ['Files'],
    }),
    deleteFile: builder.mutation<void, string>({
      query: (id) => ({ url: `/files/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Files'],
    }),
  }),
});

export const {
  useUploadFileMutation,
  useGetFileUrlQuery,
  useLazyGetFileUrlQuery,
  useGetFileThumbQuery,
  useLazyGetFileThumbQuery,
  useGetFilesByOwnerQuery,
  useDeleteFileMutation,
} = filesApi;
