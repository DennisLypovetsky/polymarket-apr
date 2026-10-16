# Polymarket APR

Chrome extension that adds a native-style APR (Annual Percentage Rate) block to the Polymarket trade widget.

## Preview

<img src="pictures/screenshots/Screenshot.png" alt="Polymarket APR extension preview" width="960" />

## Install

**[Download the latest version from GitHub Releases](https://github.com/DennisLypovetsky/polymarket-apr/releases/latest)** — install it manually using the steps below. This link always opens the latest release.

As of October 16, 2026, GitHub has **v1.3.0**, while the [Chrome Web Store](https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib) still offers **v1.2.9**. Use GitHub for the newer version.

### Install the latest release in Chrome

1. Open the **[latest release](https://github.com/DennisLypovetsky/polymarket-apr/releases/latest)** and expand **Assets** if needed.
2. Download the extension ZIP named `polymarket-apr-v<version>.zip` (for example, `polymarket-apr-v1.3.0.zip`), rather than the automatically generated **Source code** archives.
3. Extract the ZIP into a permanent folder on your computer. The extracted folder contains `manifest.json`, `content.js`, and `icon.png`. Keep this folder after installation.
4. Open `chrome://extensions` in Chrome and enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the extracted folder containing `manifest.json` — not the ZIP file.
6. If you already have the Chrome Web Store version installed, disable it so only one copy of Polymarket APR is active.
7. Open or reload Polymarket to use the extension.

**Updating a manual installation:** download the latest release, extract its files into the same folder (replacing the old files), then click **Reload** on the extension's card at `chrome://extensions`. Reload your Polymarket tabs as well. Manual installations do not update automatically through the Chrome Web Store.

**Installing from this repository instead:** select its `polymarket-apr/` folder at step 5.

## Repository Structure

- `polymarket-apr/` - extension source used for development and testing
- `releases/` - release metadata/docs + one current local ZIP artifact (ZIP binaries are not committed)
- `pictures/` - icons, screenshots, and promo assets

## Development Workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development, branching, versioning, and release flow.
