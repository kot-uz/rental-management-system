import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../../shared/api/baseQuery';

export const DOCUMENT_TYPES = ['LEASE', 'INSURANCE', 'OTHER'] as const;

export interface DocumentFileRef {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
}

export interface DocumentItem {
  id: string;
  ownerType: string;
  ownerId: string;
  fileId: string;
  title: string;
  documentType: string;
  expiresAt?: string | null;
  version: number;
  createdAt: string;
  file: DocumentFileRef;
}

export const documentsApi = createApi({
  reducerPath: 'documentsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Document'],
  endpoints: (builder) => ({
    getDocuments: builder.query<{ data: DocumentItem[] }, { ownerType?: string; ownerId?: string }>({
      query: (params) => ({ url: '/documents', params }),
      providesTags: ['Document'],
    }),
    // body is a FormData (file + ownerType + ownerId + title + documentType + expiresAt)
    uploadDocument: builder.mutation<{ data: DocumentItem }, FormData>({
      query: (body) => ({ url: '/documents', method: 'POST', body }),
      invalidatesTags: ['Document'],
    }),
    updateDocument: builder.mutation<
      { data: DocumentItem },
      { id: string; data: { title?: string; documentType?: string; expiresAt?: string | null } }
    >({
      query: ({ id, data }) => ({ url: `/documents/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Document'],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Document'],
    }),
    getDocumentUrl: builder.query<{ data: { url: string } }, string>({
      query: (id) => `/documents/${id}/url`,
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useLazyGetDocumentUrlQuery,
} = documentsApi;
