import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), redirect: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ getSession: mocks.session }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
import HomePage from './page';

describe('home entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => {
      throw new Error('redirect:/app');
    });
  });
  it('redirects a verified signed-in session to the dashboard', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'signed-in-user' } });
    await expect(HomePage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/app');
    expect(mocks.redirect).toHaveBeenCalledWith('/app');
  });
  it('keeps the landing page for visitors without a session', async () => {
    mocks.session.mockResolvedValue(null);
    expect(await HomePage({ searchParams: Promise.resolve({}) })).toBeDefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it('allows an explicit Home visit without discarding the session', async () => {
    expect(await HomePage({ searchParams: Promise.resolve({ home: '1' }) })).toBeDefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
