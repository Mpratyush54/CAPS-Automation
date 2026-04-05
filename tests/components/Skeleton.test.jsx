import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonText, SkeletonTitle, SkeletonAvatar, TableSkeleton, CardSkeleton } from '../../src/components/Skeleton';

describe('Component: Skeleton Components', () => {
  it('Skeleton renders basic div with correct class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('skeleton');
  });

  it('SkeletonText respects width and height props', () => {
    const { container } = render(<SkeletonText width="50%" height="2rem" />);
    expect(container.firstChild).toHaveClass('skeleton-text');
    expect(container.firstChild).toHaveStyle({ width: '50%', height: '2rem' });
  });

  it('SkeletonAvatar renders correctly', () => {
    const { container } = render(<SkeletonAvatar size="3rem" />);
    expect(container.firstChild).toHaveClass('skeleton-avatar');
    expect(container.firstChild).toHaveStyle({ width: '3rem', height: '3rem' });
  });

  it('TableSkeleton renders multiple rows and cells in table shell', () => {
    const rows = 3;
    const cols = 2;
    render(
      <table>
        <tbody>
          <TableSkeleton rows={rows} cols={cols} />
        </tbody>
      </table>
    );
    const trElements = screen.getAllByRole('row');
    expect(trElements).toHaveLength(rows);
    const tdElements = screen.getAllByRole('cell');
    expect(tdElements).toHaveLength(rows * cols);
  });

  it('CardSkeleton renders correct number of grid cards', () => {
    const count = 4;
    const { container } = render(<CardSkeleton count={count} />);
    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(count);
  });
});
