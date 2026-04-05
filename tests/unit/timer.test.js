const startFunctionTimer = require('../../src/utils/timer');
const { functionDuration } = require('../../config/metrics');

jest.mock('../../config/metrics', () => ({
    functionDuration: {
        startTimer: jest.fn().mockReturnValue(jest.fn())
    }
}));

describe('Timer Utility', () => {
    it('should start a timer with the correct function name', () => {
        const name = 'test-function';
        const stopTimer = startFunctionTimer(name);
        
        expect(functionDuration.startTimer).toHaveBeenCalledWith({ function: name });
        expect(typeof stopTimer).toBe('function');
    });

    it('should return a no-op function if an error occurs', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        functionDuration.startTimer.mockImplementationOnce(() => {
            throw new Error('Test Error');
        });
        
        const stopTimer = startFunctionTimer('error-test');
        
        expect(typeof stopTimer).toBe('function');
        // Calling it shouldn't throw
        expect(() => stopTimer()).not.toThrow();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
