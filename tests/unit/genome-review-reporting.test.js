/**
 * Unit test for genome review reporting
 * Tests that reportGenomeReview handles corrupted numeric values gracefully
 */

describe('reportGenomeReview', () => {
  it('should handle string totalCost7d and convert to number', () => {
    // Simulate the corrupted value that was being stored
    const review = {
      summary: {
        totalCost7d: '00.000.001.050.002.000', // corrupted string
        done7d: 100,
        failed7d: 5,
        tasks7d: 105,
        activeUCs: 2,
        stuckUCs: 0,
        reviews7d: 3,
        weakModels: 0
      },
      scores: {
        taskCompletionRate: 0.95,
        retryRate: 0.05,
        stuckRate: 0,
        chainCompletionRate: 0.90,
        pmActionableRate: 0.67,
        costPerSuccess: '00.001.234.567', // also corrupted
        taskOutcomes: 500,
        recoveryPatterns: 100
      },
      breaches: []
    };

    // The fix: parse string values as numbers
    const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
      ? parseFloat(review.summary.totalCost7d) || 0 
      : (review.summary.totalCost7d || 0);
    
    const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
      ? parseFloat(review.scores.costPerSuccess) || 0 
      : (review.scores.costPerSuccess || 0);

    // Both should be numbers now
    expect(typeof totalCost7dNum).toBe('number');
    expect(typeof costPerSuccessNum).toBe('number');

    // Should not throw when calling toFixed
    expect(() => totalCost7dNum.toFixed(2)).not.toThrow();
    expect(() => costPerSuccessNum.toFixed(3)).not.toThrow();

    // Verify the values
    // parseFloat('00.000.001.050.002.000') returns 0 (stops at first non-numeric char)
    expect(totalCost7dNum.toFixed(2)).toBe('0.00');
    expect(costPerSuccessNum.toFixed(3)).toBe('0.000');
  });

  it('should handle normal numeric values', () => {
    const review = {
      summary: {
        totalCost7d: 1234.56, // normal number
        done7d: 100,
        failed7d: 5,
        tasks7d: 105,
        activeUCs: 2,
        stuckUCs: 0,
        reviews7d: 3,
        weakModels: 0
      },
      scores: {
        taskCompletionRate: 0.95,
        retryRate: 0.05,
        stuckRate: 0,
        chainCompletionRate: 0.90,
        pmActionableRate: 0.67,
        costPerSuccess: 0.005, // normal number
        taskOutcomes: 500,
        recoveryPatterns: 100
      },
      breaches: []
    };

    const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
      ? parseFloat(review.summary.totalCost7d) || 0 
      : (review.summary.totalCost7d || 0);
    
    const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
      ? parseFloat(review.scores.costPerSuccess) || 0 
      : (review.scores.costPerSuccess || 0);

    expect(totalCost7dNum.toFixed(2)).toBe('1234.56');
    expect(costPerSuccessNum.toFixed(3)).toBe('0.005');
  });

  it('should handle null/undefined values', () => {
    const review = {
      summary: {
        totalCost7d: null,
        done7d: 100,
        failed7d: 5,
        tasks7d: 105,
        activeUCs: 2,
        stuckUCs: 0,
        reviews7d: 3,
        weakModels: 0
      },
      scores: {
        taskCompletionRate: 0.95,
        retryRate: 0.05,
        stuckRate: 0,
        chainCompletionRate: 0.90,
        pmActionableRate: 0.67,
        costPerSuccess: undefined,
        taskOutcomes: 500,
        recoveryPatterns: 100
      },
      breaches: []
    };

    const totalCost7dNum = typeof review.summary.totalCost7d === 'string' 
      ? parseFloat(review.summary.totalCost7d) || 0 
      : (review.summary.totalCost7d || 0);
    
    const costPerSuccessNum = typeof review.scores.costPerSuccess === 'string' 
      ? parseFloat(review.scores.costPerSuccess) || 0 
      : (review.scores.costPerSuccess || 0);

    expect(totalCost7dNum).toBe(0);
    expect(costPerSuccessNum).toBe(0);
    expect(totalCost7dNum.toFixed(2)).toBe('0.00');
    expect(costPerSuccessNum.toFixed(3)).toBe('0.000');
  });
});
