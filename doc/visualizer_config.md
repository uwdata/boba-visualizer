# Visualizer Config

This document describes available fields in the visualizer config.

## Files and Schemas

Available schemas:
- `point_estimate` (required): point estimate
- `p_value`: p-value, one number per universe. It will be used as a coloring option.
- `fit`: model fit quality, one number per universe. It will be a color option and might be used to prune universes.
- `stacking_weight`: weight for the stacking algorithm, one number per universe.
- `prediction`: observed and predicted values per data point, one file per universe. The corresponding file must supply a pattern as the `path` and set `multi` to `true`.
- `uncertainty`: draws from the sampling distribution, multiple numbers per universe. Keep each draw as a separate row in the CSV file.
- `null_distribution`: draws from the null distribution, multiple numbers per universe. Keep each draw as a separate row in the CSV file.
