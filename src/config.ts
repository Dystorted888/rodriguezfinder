// All the knobs we might tweak live here.
export const CFG = {
  // Firestore write policy
  heartbeatMs: 15_000,
  motionWriteMinMs: 2_500,
  minMoveForWriteM: 3,

  // Distance shaping
  accuracySubtractK: 0.2, // how much of the combined accuracy bubble we subtract
  distMedianWindow: 3,
  distEmaAlpha: 0.65,

  // Arrow smoothing
  angleDeadbandDeg: 6,   // ignore micro jitter under this
  angleMaxStepDeg: 5,    // deg per update max
  angleAlpha: 0.55,

  // Stability thresholds
  headingVarianceStable: 0.12, // circular variance (0 stable … 1 noisy)
  gpsCourseMinSpeed: 0.3,      // m/s to trust GPS course
  unstableFreezeMs: 1500,      // how long to freeze before hinting

  // Hide/fade policy
  fadeOldMs: 30_000,
  dashVeryOldMs: 120_000,
  hideAfterMs: 300_000,
};
