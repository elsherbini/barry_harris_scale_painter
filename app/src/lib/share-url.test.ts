// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFragment, createFragmentWriter } from './share-url';
import { DEFAULT_SHARE_STATE, encodeState, type ShareState } from './share';

const changed: ShareState = { ...DEFAULT_SHARE_STATE, abc: 'X:1\nK:C\nCDEF|' };

beforeEach(() => { history.replaceState(null, '', '/'); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('readFragment', () => {
	it('returns the s= token from the hash, or null when absent', () => {
		expect(readFragment()).toBeNull();
		history.replaceState(null, '', '/#s=abc_-123');
		expect(readFragment()).toBe('abc_-123');
		history.replaceState(null, '', '/#other=1');
		expect(readFragment()).toBeNull();
	});
});

describe('createFragmentWriter', () => {
	it('writes #s=token after the debounce window, not before', async () => {
		const w = createFragmentWriter(300);
		w.update(changed);
		expect(location.hash).toBe('');
		await vi.advanceTimersByTimeAsync(299);
		expect(location.hash).toBe('');
		await vi.advanceTimersByTimeAsync(1);
		await w.flush();   // the timer has fired; wait for the in-flight encode
		expect(location.hash).toBe('#s=' + (await encodeState(changed)));
	});

	it('coalesces rapid updates into one write of the latest state', async () => {
		const spy = vi.spyOn(history, 'replaceState');
		const w = createFragmentWriter(300);
		w.update(changed);
		await vi.advanceTimersByTimeAsync(100);
		w.update({ ...changed, acc: 'sharp' });
		await vi.advanceTimersByTimeAsync(400);
		await w.flush();
		expect(spy).toHaveBeenCalledTimes(1);
		expect(location.hash).toBe('#s=' + (await encodeState({ ...changed, acc: 'sharp' })));
		spy.mockRestore();
	});

	it('clears the fragment when the state is back to the defaults', async () => {
		history.replaceState(null, '', '/#s=stale');
		const w = createFragmentWriter(300);
		w.update(DEFAULT_SHARE_STATE);
		await vi.advanceTimersByTimeAsync(300);
		await w.flush();
		expect(location.hash).toBe('');
		expect(location.href.endsWith('#')).toBe(false);
	});

	it('flush writes a pending update immediately so a copied link is never stale', async () => {
		const w = createFragmentWriter(300);
		w.update(changed);
		await w.flush();
		expect(location.hash).toBe('#s=' + (await encodeState(changed)));
		await vi.advanceTimersByTimeAsync(300);   // the timer must not fire a second write
	});

	it('does not touch history when nothing has changed', async () => {
		const spy = vi.spyOn(history, 'replaceState');
		const w = createFragmentWriter(300);
		await w.flush();
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});
});
