# Chrome Web Store Listing — Verve Inbox Integrations

> Last Updated: 2026-06-29

## Store Listing

**Extension Name** [REQUIRED]
Verve Inbox Integrations

**Short Description** [REQUIRED]
Send tasks and emails directly to your Verve inbox.

**Detailed Description** [REQUIRED]
Verve Inbox Integrations seamlessly connects your daily browsing with your Verve scheduling ecosystem.

Key Features:
- Save emails directly from Gmail into your Verve inbox as tasks
- Quick-add tasks from any webpage
- Keep your workflow uninterrupted

To use the extension, simply navigate to Gmail or any supported site, click the extension icon, or use the injected buttons to instantly capture tasks directly into your Verve account.

Note: This extension requires a Verve account to function. We prioritize your privacy and do not sell any of your browsing data.

Support: For any issues, contact our support team or visit our website.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Allows users to instantly capture tasks and emails directly into their Verve inbox from their browser.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: Show the Gmail integration button injected into the UI.
- Screenshot 2: Show the quick-capture popup interface in action.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| activeTab | permissions | Used to capture the title and URL of the current page when the user initiates a task capture via the extension action. |
| storage | permissions | Used to persistently store the user's authentication token and local preferences between browser sessions. |
| https://mail.google.com/* | host_permissions | Required to inject the 'Send to Verve' button directly into the Gmail interface for seamless email-to-task conversion. |
| https://verve-backend-4o63.onrender.com/* | host_permissions | Required to securely sync captured tasks directly to the user's Verve backend. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | |
| Health info | No | No | | |
| Financial info | No | No | | |
| Authentication info | Yes | Yes | Used to authenticate the user against the Verve backend APIs. | No |
| Personal communications | Yes | Yes | Email subjects and contents are collected only when the user explicitly clicks "Send to Verve", and are stored as tasks in their account. | No |
| Location | No | No | | |
| Web history | No | No | | |
| User activity | No | No | | |
| Website content | Yes | Yes | Page titles and URLs are captured when the user explicitly saves a webpage as a task. | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED if collecting data, RECOMMENDED otherwise]
https://verve.app/privacy (Update this to your actual privacy policy URL)

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
Verve Team

**Contact Email** [REQUIRED]
hello@verve.app

**Support URL / Email** [RECOMMENDED]
support@verve.app

**Homepage URL** [RECOMMENDED]
https://verve.app

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-06-29 | Initial release | Draft |

## Review Notes

### Known Issues / Limitations
None at this time.
