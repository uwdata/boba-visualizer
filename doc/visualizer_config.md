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

## Labels

These flags control the appearance and behavior of the visualizer interface.

- `dataset`: name of the dataset to display in the header. Example: "hurricane".
- `x_axis`: label of the x-axis of the overview plot, usually the meaning of the point estimate. Example: "Coefficient on Female".
- `x_axis_fit`: label of the x-axis of the model fit plot, usually the meaning of the observed data points. Example: "Number of Deaths".
- `x_range`: default range of the x-axis. Example: [-10, 50]
- `x_range_outer`: possible range of the x-axis. This might be useful to hide extreme outliers and have a better resolution of the remaining data points. Example: [-100, 300].
- `fit_range`: possible range of the x-axis in the model fit plots. This might be useful to hide extreme outliers in order to have a better resolution. Example: [0, 1].

Take a look at an example visualizer config file
[here](https://github.com/uwdata/boba/blob/master/example/mortgage/visualizer_config.json).
