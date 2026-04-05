const getRouteLabel = require('../../src/utils/routeLabel');

describe('Route Label Utility', () => {
    it('should return baseUrl + route path if both exist', () => {
        const req = { baseUrl: '/api', route: { path: '/users' } };
        expect(getRouteLabel(req)).toBe('/api/users');
    });

    it('should return route path if baseUrl is missing', () => {
        const req = { route: { path: '/users' } };
        expect(getRouteLabel(req)).toBe('/users');
    });

    it('should return baseUrl if route is missing', () => {
        const req = { baseUrl: '/api' };
        expect(getRouteLabel(req)).toBe('/api');
    });

    it('should return /unknown if both are missing', () => {
        const req = {};
        expect(getRouteLabel(req)).toBe('/unknown');
    });
});
