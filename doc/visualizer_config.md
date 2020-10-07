# Visualizer Config

The visualizer config is a JSON file. It accepts the following top-level fields: `files`, `schema`, `labels`, and `sensitivity`. All of these fields are optional, and thus, the entire visualizer config is optional. We will describe these fields in later sections. Take a look at an example visualizer config file
[here](https://github.com/uwdata/boba/blob/master/example/mortgage/visualizer_config.json).

The visualizer config must be linked to your multiverse specification before compile time. To link the file, supply its path in the `BOBA_CONFIG` block:

```python
# --- (BOBA_CONFIG)
{
  "visualizer": "visualizer_config.json"
}
```

If you do not link the visualizer config file before compiling the multiverse, or you do not use the Boba DSL, you might manually nest the content of this JSON into a top-level field named `visualizer` in `overview.json`.

## Files

This is an array and it tells the visualizer where to find the outcomes of your multiverse. The array has the following format:

```json
{
  "files": [
    {"id": "ID", "path": "my_dataset.csv"},
    {"id": "ID2", "path": "another_dataset.csv"}
  ]
}
```

Each item in the array has two fields: `id`, which is a unique identifier manually chosen by you, and `path`, which is the path to your dataset file. If you use a relative path, the path is relative to the `-i` argument when invoking `boba-server`.

## Schema

This is an key-value object and it tells the visualizer which columns in your dataset files to find specific types of outcomes. For example:

```json
{
  "schema": {
    "point_estimate": {"file": "est", "field": "coefficient"}
  }
}
```

Apparently, you must have specified at least one entry in `files` to use `schema`. The value in each key-value pair is an object and has two fields: `file`, which is the `id` of a file in your `files` array, and `field`, which is the column name in the CSV. The key in each key-value pair tells the visualizer what type of outcomes this is.

Here are the available keys:
- `point_estimate` (required): point estimate, one number per universe.
- `p_value`: p-value, one number per universe. 
- `fit`: model fit quality, one number per universe.
- `stacking_weight`: weight for the stacking algorithm, one number per universe.
- `annotation`: additional text labels, one string per universe.
- `prediction`: observed and predicted values per data point, one file per universe. The corresponding file must supply a pattern as the `path` and set `multi` to `true`.
- `uncertainty`: draws from the sampling distribution, multiple numbers per universe. Keep each draw as a separate row in the CSV file.
- `null_distribution`: draws from the null distribution, multiple numbers per universe. Keep each draw as a separate row in the CSV file.

## Labels

This is an key-value object. The flags control the appearance and behavior of the visualizer interface. For example:

```json
{
  "labels": {
    "dataset": "my project",
    "x_range": [-30, 40]
  }
}
```

- `dataset`: name of the dataset to display in the header. Example: "hurricane".
- `x_axis`: label of the x-axis of the overview plot, usually the meaning of the point estimate. Example: "Coefficient on Female".
- `x_axis_fit`: label of the x-axis of the model fit plot, usually the meaning of the observed data points. Example: "Number of Deaths".
- `x_range`: default range of the x-axis. Example: [-10, 50]
- `x_range_outer`: possible range of the x-axis. This might be useful to hide extreme outliers and have a better resolution of the remaining data points. Example: [-100, 300].
- `fit_range`: possible range of the x-axis in the model fit plots. This might be useful to hide extreme outliers in order to have a better resolution. Example: [0, 1].

## Sensitivity

This is a string and it determines the algorithm used to compute decision sensitivity. For example:

```json
{
  "sensitivity": "f"
}
```

Available options are:

- `f`: algorithm based on the F-test
- `ks` (default): algorithm based on Kolmogorov–Smirnov statistic

For more details about these algorithms, please refer to the paper.
