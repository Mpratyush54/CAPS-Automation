const scoring = require('../../src/utils/scoringActions');

describe('Scoring Actions Unit Tests', () => {
    describe('toNum()', () => {
        it('should convert valid inputs to numbers', () => {
            expect(scoring.toNum('10')).toBe(10);
            expect(scoring.toNum(5)).toBe(5);
        });

        it('should return fallback for invalid inputs', () => {
            expect(scoring.toNum('not a number', 0)).toBe(0);
        });
    });

    describe('escapeRegExp()', () => {
        it('should escape special characters', () => {
            expect(scoring.escapeRegExp('a.b*c+d?e^f$g{h}i|j[k]l\\m')).toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\|j\\[k\\]l\\\\m');
        });
    });

    describe('applyReverse()', () => {
        it('should reverse a value within range', () => {
            expect(scoring.applyReverse(1, 5, 1)).toBe(5);
            expect(scoring.applyReverse(2, 5, 1)).toBe(4);
            expect(scoring.applyReverse(3, 5, 1)).toBe(3);
            expect(scoring.applyReverse(5, 5, 1)).toBe(1);
        });

        it('should return null for invalid values', () => {
            expect(scoring.applyReverse('invalid')).toBeNull();
        });
    });

    describe('compute_raw_scores()', () => {
        it('should group answers by trait', () => {
            const test = { categories: ['extroversion', 'introversion'] };
            const questions = [
                { questionId: 'q1', trait: 'extroversion' },
                { questionId: 'q2', trait: 'introversion' }
            ];
            const answers = [
                { questionId: 'q1', value: 4 },
                { questionId: 'q2', value: 2 }
            ];

            const ctx = scoring.compute_raw_scores({}, {}, test, answers, questions);
            expect(ctx.raw.extroversion).toEqual([4]);
            expect(ctx.raw.introversion).toEqual([2]);
        });

        it('should handle missing categories', () => {
            const ctx = scoring.compute_raw_scores({}, {}, {}, [], []);
            expect(ctx.raw).toEqual({});
        });
    });

    describe('apply_scoring_key()', () => {
        it('should apply specific scores from q.scoringKey', () => {
            const questions = [
                { questionId: 'q1', trait: 'T1', scoringKey: { "1": 10, "2": 20 } }
            ];
            const answers = [
                { questionId: 'q1', value: 1 }
            ];
            const ctx = scoring.apply_scoring_key({}, {}, {}, answers, questions);
            expect(ctx.rawAfterKey.T1).toEqual([10]);
        });

        it('should default to raw value if no key provided', () => {
            const questions = [{ questionId: 'q1', trait: 'T1' }];
            const answers = [{ questionId: 'q1', value: 5 }];
            const ctx = scoring.apply_scoring_key({}, {}, {}, answers, questions);
            expect(ctx.rawAfterKey.T1).toEqual([5]);
        });
    });

    describe('binary_score()', () => {
        it('should convert values to 0/1 based on threshold', () => {
            const answers = [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 2 }];
            const step = { threshold: 3 };
            const ctx = scoring.binary_score({}, step, {}, answers, []);
            expect(ctx.binaryAnswers[0].value).toBe(1);
            expect(ctx.binaryAnswers[1].value).toBe(0);
        });
    });

    describe('apply_reverse_scoring()', () => {
        it('should reverse items flagged with reversedScore', () => {
            const questions = [
                { questionId: 'q1', trait: 'T1', reversedScore: true, scaleMax: 5, scaleMin: 1 }
            ];
            const answers = [
                { questionId: 'q1', value: 1 }
            ];
            const ctx = scoring.apply_reverse_scoring({}, {}, {}, answers, questions);
            expect(ctx.rawAfterReverse.T1).toEqual([5]);
        });
    });

    describe('sumTraits() and avgTraits()', () => {
        const ctx = {
            raw: {
                T1: [10, 20],
                T2: [5]
            }
        };

        it('should sum trait values', () => {
            const result = scoring.sumTraits({ ...ctx }, {});
            expect(result.summed.T1).toBe(30);
            expect(result.summed.T2).toBe(5);
        });

        it('should average trait values', () => {
            const result = scoring.avgTraits({ ...ctx }, {});
            expect(result.averaged.T1).toBe(15);
            expect(result.averaged.T2).toBe(5);
        });
    });

    describe('addConstants()', () => {
        it('should add constants to trait scores', () => {
            const ctx = { summed: { T1: 10 } };
            const step = { constants: { T1: 5 } };
            const result = scoring.addConstants(ctx, step);
            expect(result.final.T1).toBe(15);
        });
    });

    describe('zScore() and percentileFromZ()', () => {
        it('should compute z-score and percentile', () => {
            const ctx = { final: { T1: 110 } };
            const step = { norms: { T1: { mean: 100, sd: 10 } } };
            
            scoring.zScore(ctx, step);
            expect(ctx.z.T1).toBe(1);

            scoring.percentileFromZ(ctx);
            // Z=1 is approx 84.13 percentile
            expect(ctx.percentile.T1).toBeCloseTo(84.13, 1);
        });
    });

    describe('apply_formula()', () => {
        it('should evaluate simple math expressions using trait values', () => {
            const ctx = { final: { A: 10, B: 20 } };
            const step = { formulas: { Result: "A + B * 2" } };
            const result = scoring.apply_formula(ctx, step);
            expect(result.formulaResults.Result).toBe(50);
        });

        it('should return null on evaluation error', () => {
            const step = { formulas: { Result: "Invalid + 1" } };
            const result = scoring.apply_formula({}, step);
            expect(result.formulaResults.Result).toBeNull();
        });
    });

    describe('kolb_score()', () => {
        it('should compute Kolb modes and dominant quadrant', () => {
            const answers = [
                { value: JSON.stringify([{ optionId: 'AC', rank: 4 }, { optionId: 'AE', rank: 3 }]) },
                { value: JSON.stringify([{ optionId: 'AC', rank: 2 }, { optionId: 'RO', rank: 1 }]) }
            ];
            const ctx = scoring.kolb_score({}, {}, {}, answers, []);
            expect(ctx.kolb.modes.AC).toBe(6);
            expect(ctx.kolb.modes.AE).toBe(3);
            expect(ctx.kolb.modes.RO).toBe(1);
            expect(ctx.kolb.modes.CE).toBe(0);
            expect(ctx.kolb.dominant).toBe('Convergent'); // AC + AE = 9
        });
    });

    describe('ei_score()', () => {
        it('should compute EI avgs and total', () => {
            const ctx = { raw: { T1: [2, 4], T2: [5] } };
            const result = scoring.ei_score(ctx, {}, {}, [], []);
            expect(result.final.T1).toBe(3);
            expect(result.final.T2).toBe(5);
            expect(result.final.totalEI).toBe(11);
        });
    });

    describe('sumAllTraits()', () => {
        it('should sum all raw items across all traits', () => {
            const ctx = { raw: { T1: [1, 2], T2: [3, 4] } };
            const result = scoring.sum_all_traits(ctx, {});
            expect(result.total).toBe(10);
        });
    });
});
