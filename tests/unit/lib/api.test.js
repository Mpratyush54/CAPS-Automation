import { describe, it, expect } from 'vitest';
import { 
  unwrap, getErrorMessage, formatDateInput, formatDateTimeLabel, 
  formatDateTime, formatDurationLabel, titleizeStatus 
} from '../../../src/lib/api';

describe('Unit: lib/api Helpers', () => {
  describe('unwrap', () => {
    it('should extract data property correctly', () => {
      const resp = { data: { data: { name: 'Test' } } };
      expect(unwrap(resp)).toEqual({ name: 'Test' });
    });

    it('should fallback to plain data property', () => {
      const resp = { data: { status: 'success' } };
      expect(unwrap(resp)).toEqual({ status: 'success' });
    });

    it('should return null for invalid inputs', () => {
      expect(unwrap(null)).toBeNull();
      expect(unwrap({})).toBeNull();
    });
  });

  describe('getErrorMessage', () => {
    it('should extract error from data.error', () => {
      const err = { response: { data: { error: 'Invalid token' } } };
      expect(getErrorMessage(err)).toBe('Invalid token');
    });

    it('should extract message from data.message', () => {
      const err = { response: { data: { message: 'Failed save' } } };
      expect(getErrorMessage(err)).toBe('Failed save');
    });

    it('should respect fallback on failure', () => {
      expect(getErrorMessage({}, 'Unknown')).toBe('Unknown');
    });
  });

  describe('formatters', () => {
    it('formatDateInput should return YYYY-MM-DD', () => {
      const val = '2026-03-25T19:42:07.000Z';
      expect(formatDateInput(val)).toBe('2026-03-25');
    });

    it('formatDurationLabel should convert minutes', () => {
      expect(formatDurationLabel(125)).toBe('2h 5m');
      expect(formatDurationLabel(45)).toBe('0h 45m');
    });

    it('titleizeStatus should format machine statuses', () => {
      expect(titleizeStatus('pending_review')).toBe('Pending Review');
      expect(titleizeStatus('needs_revision')).toBe('Needs Revision');
    });

    it('formatDateTime should construct ISO string', () => {
      expect(formatDateTime('2026-03-25', '14:30')).toBe('2026-03-25T14:30:00.000Z');
      expect(formatDateTime('2026-03-25')).toBe('2026-03-25T00:00:00.000Z');
    });
  });
});
