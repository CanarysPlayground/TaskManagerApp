const MAX_FACTORIAL_INPUT = 18; // factorial(18) is within JavaScript's safe integer range

/**
 * Computes the factorial of a non-negative integer.
 * Supports inputs from 0 to 18 (factorial values within Number.MAX_SAFE_INTEGER).
 * @param {number} n - A non-negative integer (0–18)
 * @returns {number} The factorial of n
 */
function factorial(n) {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
    throw new Error('Input must be a non-negative integer');
  }
  if (n > MAX_FACTORIAL_INPUT) {
    throw new Error(`Input must not exceed ${MAX_FACTORIAL_INPUT} to ensure precise integer results`);
  }
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

module.exports = { factorial };
