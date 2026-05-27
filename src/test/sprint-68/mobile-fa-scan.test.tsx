/**
 * Sprint 68 FAR-4 · Block 16 · MobileFAScanPage render smoke
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileFAScanPage from '@/pages/mobile/MobileFAScanPage';

describe('MobileFAScanPage · mobile QR/RFID cockpit', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <MobileFAScanPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
