const { ok, created, fail, parsePagination } = require('../../src/utils/api');

describe('API Utility Unit Tests', () => {
    let mockRes;

    beforeEach(() => {
        mockRes = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis()
        };
    });

    describe('ok()', () => {
        it('should send a 200 JSON response with data', () => {
            const data = { user: 'test' };
            ok(mockRes, data);
            expect(mockRes.json).toHaveBeenCalledWith({ data });
        });

        it('should handle array data correctly', () => {
            const data = [1, 2, 3];
            ok(mockRes, data);
            expect(mockRes.json).toHaveBeenCalledWith({ data });
        });

        it('should handle nested object data', () => {
            const data = { profile: { name: 'Test', tags: ['a', 'b'] } };
            ok(mockRes, data);
            expect(mockRes.json).toHaveBeenCalledWith({ data });
        });

        it('should include meta in response if provided', () => {
            const data = [{ id: 1 }];
            const meta = { total: 1 };
            ok(mockRes, data, meta);
            expect(mockRes.json).toHaveBeenCalledWith({ data, meta });
        });

        it('should handle null data gracefully if passed', () => {
            ok(mockRes, null);
            expect(mockRes.json).toHaveBeenCalledWith({ data: null });
        });
    });

    describe('created()', () => {
        it('should send a 201 status with data', () => {
            const data = { id: 'new' };
            created(mockRes, data);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ data });
        });
    });

    describe('fail()', () => {
        it('should send the specified status and error object', () => {
            fail(mockRes, 400, 'BAD_REQUEST', 'Invalid input');
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: { code: 'BAD_REQUEST', message: 'Invalid input' }
            });
        });

        it('should handle complex validation field errors', () => {
            const fields = { email: 'Required' };
            fail(mockRes, 422, 'VALIDATION_ERROR', 'Input invalid', fields);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: { code: 'VALIDATION_ERROR', message: 'Input invalid', fields }
            });
        });

        it('should handle 500 server errors', () => {
            fail(mockRes, 500, 'SERVER_ERROR', 'Internal disaster');
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('parsePagination()', () => {
        it('should parse page and pageSize from query', () => {
            const query = { page: '2', pageSize: '10' };
            const result = parsePagination(query);
            expect(result.page).toBe(2);
            expect(result.pageSize).toBe(10);
            expect(result.skip).toBe(10);
        });

        it('should handle non-numeric strings by falling back to defaults', () => {
            const query = { page: 'abc', pageSize: 'xyz' };
            const result = parsePagination(query);
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(20);
        });

        it('should enforce minimum and maximum limits', () => {
            const result = parsePagination({ page: '-1', pageSize: '200' });
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(100);
        });

        it('should cap extremely large pageSize to 100', () => {
            const result = parsePagination({ pageSize: '1000000' });
            expect(result.pageSize).toBe(100);
        });

        it('should work with different default limits passed as second argument', () => {
            const result = parsePagination({}, { page: 5, pageSize: 50 });
            expect(result.page).toBe(5);
            expect(result.pageSize).toBe(50);
        });
    });
});
