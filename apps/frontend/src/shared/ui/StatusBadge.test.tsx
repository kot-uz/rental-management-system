import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

// Stub i18n so the test asserts on the component's own label/colour logic, not
// on translation content. `t(key, { defaultValue })` returns the default value,
// mirroring how the real i18next behaves for a missing key.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

describe('StatusBadge', () => {
  it('falls back to a humanised label when no translation exists', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    // defaultValue replaces underscores with spaces.
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });

  it('applies the success colour for a positive status', () => {
    const { container } = render(<StatusBadge status="PAID" />);
    expect(container.querySelector('.MuiChip-colorSuccess')).not.toBeNull();
  });

  it('applies the error colour for a negative status', () => {
    const { container } = render(<StatusBadge status="OVERDUE" />);
    expect(container.querySelector('.MuiChip-colorError')).not.toBeNull();
  });

  it('falls back to the default colour for an unknown status', () => {
    const { container } = render(<StatusBadge status="SOMETHING_NEW" />);
    expect(container.querySelector('.MuiChip-colorDefault')).not.toBeNull();
  });

  it('renders a small chip by default', () => {
    const { container } = render(<StatusBadge status="ACTIVE" />);
    expect(container.querySelector('.MuiChip-sizeSmall')).not.toBeNull();
  });
});
