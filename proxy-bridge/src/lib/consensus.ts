/**
 * P17-02: Geometric Median Consensus
 * Byzantine-robust aggregation using Weiszfeld's algorithm.
 * Based on DecentLLMs (arXiv:2507.14928).
 *
 * Resistant to Byzantine manipulation with >50% honest agents
 * (vs classical 2/3 threshold for majority voting).
 */

/**
 * Compute the geometric median of a set of 1D score values via Weiszfeld's algorithm.
 * For scalar scores (like 0-100 proposal scores), this reduces to the weighted median.
 * @param scores - array of numeric scores (e.g. [85, 90, 20, 88] where 20 is Byzantine)
 * @param maxIter - Weiszfeld iterations (50 is sufficient for convergence)
 */
export function geometricMedian1D(scores: number[], maxIter = 50): number {
  if (scores.length === 0) {
    throw new Error('geometricMedian1D: scores array must be non-empty');
  }
  if (scores.length === 1) {
    return scores[0];
  }

  // Init guess = mean of scores
  let guess = scores.reduce((a, b) => a + b, 0) / scores.length;

  for (let iter = 0; iter < maxIter; iter++) {
    const weights: number[] = scores.map((s) => {
      const dist = Math.abs(s - guess);
      // Avoid division by zero: if distance < 1e-10, use weight 1e10
      return dist < 1e-10 ? 1e10 : 1 / dist;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const newGuess = scores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight;

    // Convergence check
    if (Math.abs(newGuess - guess) < 1e-10) {
      return newGuess;
    }

    guess = newGuess;
  }

  return guess;
}

/**
 * Compute geometric median of 2D+ vectors (for future multi-dimensional scoring).
 * Each element of `points` is a numeric vector of the same length.
 * @param points - array of numeric vectors
 * @param maxIter - Weiszfeld iterations
 */
export function geometricMedianND(points: number[][], maxIter = 50): number[] {
  if (points.length === 0) {
    throw new Error('geometricMedianND: points array must be non-empty');
  }
  if (points.length === 1) {
    return [...points[0]];
  }

  const dim = points[0].length;

  // Validate uniform dimensionality
  for (const p of points) {
    if (p.length !== dim) {
      throw new Error('geometricMedianND: all points must have the same dimension');
    }
  }

  // Init guess = coordinate-wise mean
  let guess: number[] = new Array(dim).fill(0);
  for (const p of points) {
    for (let d = 0; d < dim; d++) {
      guess[d] += p[d];
    }
  }
  for (let d = 0; d < dim; d++) {
    guess[d] /= points.length;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const weights: number[] = points.map((p) => {
      // Euclidean distance from point to current guess
      let dist = 0;
      for (let d = 0; d < dim; d++) {
        const diff = p[d] - guess[d];
        dist += diff * diff;
      }
      dist = Math.sqrt(dist);
      return dist < 1e-10 ? 1e10 : 1 / dist;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const newGuess: number[] = new Array(dim).fill(0);
    for (let i = 0; i < points.length; i++) {
      for (let d = 0; d < dim; d++) {
        newGuess[d] += points[i][d] * weights[i];
      }
    }
    for (let d = 0; d < dim; d++) {
      newGuess[d] /= totalWeight;
    }

    // Convergence check: max coordinate delta
    let maxDelta = 0;
    for (let d = 0; d < dim; d++) {
      maxDelta = Math.max(maxDelta, Math.abs(newGuess[d] - guess[d]));
    }
    guess = newGuess;
    if (maxDelta < 1e-10) {
      break;
    }
  }

  return guess;
}

/**
 * Aggregate proposal scores from multiple evaluators using geometric median.
 * Filters out outliers more robustly than mean/majority.
 * @param evaluatorScores - array of 0-100 confidence scores from individual evaluators
 * @returns single aggregated score, rounded to two decimal places
 */
export function aggregateScores(evaluatorScores: number[]): number {
  if (evaluatorScores.length === 0) {
    throw new Error('aggregateScores: evaluatorScores must be non-empty');
  }
  const result = geometricMedian1D(evaluatorScores);
  // Clamp to [0, 100] to stay within the proposal scoring range
  return Math.min(100, Math.max(0, Math.round(result * 100) / 100));
}
