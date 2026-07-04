import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../entities/auth/model/authSlice';
import { Can } from './Can';

/**
 * Builds an isolated store containing only the auth slice — enough for
 * usePermissions, which reads `s.auth.user?.role`. Avoids importing the full
 * app store (and its socket/RTK-Query middleware) into the test.
 */
function renderWithRole(role: string | null, ui: React.ReactElement) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: role ? { id: 'u1', email: 'a@b.c', firstName: 'A', lastName: 'B', role, orgId: 'o1' } : null,
        accessToken: null,
        refreshToken: null,
      },
    },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('Can', () => {
  it('renders children when the role has the permission', () => {
    renderWithRole('OWNER', <Can permission="apartments:delete">secret</Can>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('renders nothing when the role lacks the permission', () => {
    renderWithRole('ACCOUNTANT', <Can permission="apartments:delete">secret</Can>);
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders the fallback when denied', () => {
    renderWithRole(null, <Can permission="apartments:read" fallback={<span>denied</span>}>secret</Can>);
    expect(screen.getByText('denied')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('allows when ANY listed permission matches (default)', () => {
    renderWithRole('ACCOUNTANT', <Can permission={['apartments:delete', 'apartments:read']}>secret</Can>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });

  it('requires ALL listed permissions when requireAll is set', () => {
    // ACCOUNTANT can read but cannot delete, so requireAll must deny.
    renderWithRole(
      'ACCOUNTANT',
      <Can permission={['apartments:read', 'apartments:delete']} requireAll>
        secret
      </Can>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});
