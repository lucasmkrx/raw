# Maintenance

## Build

Use Node.js 22 or later:

```sh
npm ci --ignore-scripts
npm run build
npm run verify
```

`raw.svg` is the source of truth. `brand.config.json` defines the three colors, one logo PNG width, one avatar size, and square-canvas spacing. The generator preserves both original paths in every SVG export. It never extracts the claws or separates the lettering.

The generator expects two self-closing paths and the supplied viewBox. A redesigned source may require updating that validation, color mapping, and layout settings. Review the full output after any artwork change.

PNG rendering uses Sharp at four times the output size before downsampling to sRGB. SVG lettering is outlined, so fonts are not required. The ICO includes 32-bit bitmap frames and transparency masks.

The build replaces `assets/`, `docs/previews/`, and `docs/ASSET-CATALOG.md`. Keep manual source files elsewhere. The generated inventory records source, configuration, generator, and asset hashes. No build timestamp is added; identical builds on the same renderer/platform should produce stable hashes. Different renderer or OS versions can change raster output.

## Review

Verification checks hashes, inventory, full-logo SVG paths, image dimensions, transparency, monochrome colors, circular profile crops, maskable safe areas, ICO structure, manifest references, and catalog links. Also inspect `docs/previews/brand-overview.png` and the favicon at its final display size.

Keep the set minimal: three full-logo variants, one square color profile image, and the six-file favicon kit. Add another asset only for a concrete requirement. Include source changes and regenerated exports in the same commit, and update `CHANGELOG.md` for meaningful changes.

## Public repository

Preserve RAW Technologies LLC's rights notices and the permission policy described in [licensing](LICENSING.md). Keep private material, credentials, and machine-specific files out of public commits and issues. See [contributing](../CONTRIBUTING.md) for change instructions.

## GitHub validation

The `Verify brand assets` workflow runs on pushes to `main`, pull requests, and manual dispatch. It uses read-only repository permissions and pins official actions by commit SHA. It first checks the committed assets, then builds and verifies a temporary copy so that platform-specific renderer differences do not rewrite shipped files.

`CODEOWNERS` routes reviews to the repository maintainer. Changes to the brand artwork also require authorization from RAW Technologies LLC; a code review alone does not grant brand rights.

## Release a version

1. Update `package.json` and `CHANGELOG.md`, refresh the lockfile if needed, regenerate affected exports, and run verification.
2. Commit the reviewed files and wait for GitHub Actions to pass.
3. Create an annotated tag such as `v1.0.0` on that commit and push the tag.
4. With Python 3 installed, run `npm run release:bundle` to create a ZIP and `SHA256SUMS.txt` in ignored `dist/`.
5. Create a GitHub release for the tag and upload both files. Include the asset scope, changes, validation, and brand-use restrictions in the release notes.

The packager verifies assets before bundling. It includes the master logo, exported assets, inventory, preview, relevant guides, and rights notices. The ZIP uses stable entry ordering and metadata, and contains no dependencies or machine-specific files. GitHub also supplies source archives for each tag. Published releases should remain tied to their original reviewed commit; ship subsequent changes under a new version.
