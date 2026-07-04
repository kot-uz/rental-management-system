import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../../entities/auth/api/authApi';
import { apartmentsApi } from '../../entities/apartments/api/apartmentsApi';
import { tenantsApi } from '../../entities/tenants/api/tenantsApi';
import { leasesApi } from '../../entities/leases/api/leasesApi';
import { rentApi } from '../../entities/rent/api/rentApi';
import { utilitiesApi } from '../../entities/utilities/api/utilitiesApi';
import { repairsApi } from '../../entities/repairs/api/repairsApi';
import { contractorsApi } from '../../entities/contractors/api/contractorsApi';
import { notificationsApi } from '../../entities/notifications/api/notificationsApi';
import { dashboardApi } from '../../entities/dashboard/api/dashboardApi';
import { filesApi } from '../../entities/files/api/filesApi';
import { searchApi } from '../../entities/search/api/searchApi';
import { auditApi } from '../../entities/audit/api/auditApi';
import { orgApi } from '../../entities/org/api/orgApi';
import { webhooksApi } from '../../entities/webhooks/api/webhooksApi';
import { documentsApi } from '../../entities/documents/api/documentsApi';
import { tagsApi } from '../../entities/tags/api/tagsApi';
import { accountingApi } from '../../entities/accounting/api/accountingApi';
import { telegramApi } from '../../entities/telegram/api/telegramApi';
import authReducer from '../../entities/auth/model/authSlice';
import uiReducer from './uiSlice';
import { socketMiddleware } from './socketMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [authApi.reducerPath]: authApi.reducer,
    [apartmentsApi.reducerPath]: apartmentsApi.reducer,
    [tenantsApi.reducerPath]: tenantsApi.reducer,
    [leasesApi.reducerPath]: leasesApi.reducer,
    [rentApi.reducerPath]: rentApi.reducer,
    [utilitiesApi.reducerPath]: utilitiesApi.reducer,
    [repairsApi.reducerPath]: repairsApi.reducer,
    [contractorsApi.reducerPath]: contractorsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [filesApi.reducerPath]: filesApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [orgApi.reducerPath]: orgApi.reducer,
    [webhooksApi.reducerPath]: webhooksApi.reducer,
    [documentsApi.reducerPath]: documentsApi.reducer,
    [tagsApi.reducerPath]: tagsApi.reducer,
    [accountingApi.reducerPath]: accountingApi.reducer,
    [telegramApi.reducerPath]: telegramApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      apartmentsApi.middleware,
      tenantsApi.middleware,
      leasesApi.middleware,
      rentApi.middleware,
      utilitiesApi.middleware,
      repairsApi.middleware,
      contractorsApi.middleware,
      notificationsApi.middleware,
      dashboardApi.middleware,
      filesApi.middleware,
      searchApi.middleware,
      auditApi.middleware,
      orgApi.middleware,
      webhooksApi.middleware,
      documentsApi.middleware,
      tagsApi.middleware,
      accountingApi.middleware,
      telegramApi.middleware,
      socketMiddleware,
    ),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
