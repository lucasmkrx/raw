# Contributing

Suggestions for asset formats, export corrections, and documentation improvements are welcome. Use the asset-request or correction issue template. Include the intended use, required dimensions and file type, and a public-safe example when useful. Do not include credentials, private customer material, or confidential company information in public issues.

For changes:

1. Read the [brand guide](docs/BRAND-GUIDELINES.md) and [license scope](docs/LICENSING.md).
2. Change the source, configuration, generator, or written guides as appropriate. Do not edit generated exports by hand.
3. Run `npm ci`, `npm run build`, and `npm run verify`.
4. Inspect the overview; check small icons and the profile crop.
5. Include all affected generated files and a brief explanation in the pull request.

Original artwork changes require approval from RAW Technologies LLC or its authorized representative. Contributors must have the right to submit their material. Tooling and prose contributions are accepted under `LICENSE-CODE`. For brand artwork, contributors must explicitly state that RAW Technologies LLC is authorized to reproduce, modify, and distribute the submission under the repository's brand terms; maintainers must confirm that authorization before merging. A pull request does not by itself transfer copyright or establish brand ownership.

Formatting conventions: UTF-8, LF line endings, lowercase hyphenated asset filenames, and dimensions in filenames for raster exports. Keep the complete original logo and its geometry intact unless an authorized redesign is part of the change.
