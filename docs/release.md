# QuickBox Release

This project uses GitHub Actions to build desktop installers for GitHub Releases. Do not upload the whole `target/release` directory; users only need the installer files attached to the Release.

## Current Targets

- Windows: `.exe` installer and `.msi`
- Linux: `.AppImage` and `.deb`
- macOS: paused for now, because public distribution needs a Mac signing/notarization setup

## Release Steps

1. Keep versions in sync:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. Commit and push your code to GitHub.
3. Create and push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

4. Open the GitHub repository Actions tab and wait for the `Release` workflow to finish.
5. Open GitHub Releases and review the generated draft release.
6. Edit release notes if needed, then publish the release.

You can also run the `Release` workflow manually from the GitHub Actions page for test builds.

## macOS Later

The codebase keeps macOS build configuration and scripts, but the GitHub release workflow does not publish macOS artifacts right now.

When a Mac and Apple Developer account are available, restore macOS jobs in `.github/workflows/release.yml` and configure these GitHub Actions secrets:

- `APPLE_SIGNING_IDENTITY`
- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## Windows Signing

Unsigned Windows installers can still be installed, but browsers and SmartScreen may warn users. For public distribution, consider adding a Windows code signing certificate later.
