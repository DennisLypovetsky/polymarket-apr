# Polymarket APR

Chrome extension that adds a native-style APR (Annual Percentage Rate) block to the Polymarket trade widget.

## Preview

<img src="pictures/screenshots/Screenshot.png" alt="Polymarket APR extension preview" width="960" />

## Install

**Get the latest version on [GitHub](https://github.com/DennisLypovetsky/polymarket-apr/releases/latest).** The [Chrome Web Store](https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib) is stuck at **v1.2.9** because further updates were blocked.

### Install the latest release in Chrome

1. Download `polymarket-apr-v*.zip` from the [latest release](https://github.com/DennisLypovetsky/polymarket-apr/releases/latest) → **Assets**, then unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder containing `manifest.json`. Keep this folder.
4. Disable any older copy of the extension, then reload Polymarket.

## Repository Structure

- `polymarket-apr/` - extension source used for development and testing
- `releases/` - release metadata/docs + one current local ZIP artifact (ZIP binaries are not committed)
- `pictures/` - icons, screenshots, and promo assets

## Development Workflow

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development, branching, versioning, and release flow.
