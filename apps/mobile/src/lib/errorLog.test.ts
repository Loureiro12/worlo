import Storage from 'expo-sqlite/kv-store';
import { flushErrorReports, pendingErrorReports, recordError } from './errorLog';

const mockInsert = jest.fn();
const mockSession = jest.fn();
jest.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: () => mockSession() },
    from: () => ({ insert: (rows: unknown) => mockInsert(rows) }),
  },
}));

beforeEach(() => {
  Storage.removeItemSync('worlo.errors');
  mockInsert.mockReset().mockResolvedValue({ error: null });
  mockSession.mockReset().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
});

describe('error log', () => {
  it('keeps errors on the device until they are sent', async () => {
    recordError(new TypeError('undefined is not a function'), 'render:RoteiroScreen', true);
    recordError('plain text', 'global');
    expect(pendingErrorReports()).toEqual([
      expect.objectContaining({
        context: 'render:RoteiroScreen',
        fatal: true,
        message: 'undefined is not a function',
      }),
      expect.objectContaining({ context: 'global', fatal: false, message: 'plain text' }),
    ]);

    await flushErrorReports();
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ context: 'render:RoteiroScreen', fatal: true }),
      expect.objectContaining({ context: 'global' }),
    ]);
    expect(pendingErrorReports()).toEqual([]);
  });

  it('keeps them when signed out or the server fails', async () => {
    recordError(new Error('boom'), 'global');
    mockSession.mockResolvedValueOnce({ data: { session: null } });
    await flushErrorReports();
    expect(mockInsert).not.toHaveBeenCalled();
    mockInsert.mockResolvedValueOnce({ error: { message: 'down' } });
    await flushErrorReports();
    expect(pendingErrorReports()).toHaveLength(1);
  });

  it('bounds what it keeps and what it sends', () => {
    for (let i = 0; i < 40; i++) recordError(new Error(`e${i}`), 'global');
    const kept = pendingErrorReports();
    expect(kept).toHaveLength(30);
    expect(kept[0]?.message).toBe('e10');
    recordError(new Error('x'.repeat(5000)), 'c'.repeat(200));
    const last = pendingErrorReports().at(-1);
    expect(last?.message).toHaveLength(2000);
    expect(last?.context).toHaveLength(80);
  });
});
