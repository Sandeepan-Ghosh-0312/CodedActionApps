# templateWithValidationStation

A UiPath Coded Action App template for **Loan Application Review** with an embedded **Document Understanding Validation Station**. Reviewers assess an applicant's details on one tab and validate the extracted document data on a second tab using the [`@uipath/ui-widgets-validation-station`](https://www.npmjs.com/package/@uipath/ui-widgets-validation-station) widget, then complete the task with a single **Complete** action available from either tab.

This template is the validation-station counterpart of `templateWithFileAttachment`. Instead of previewing a directly attached PDF, the second tab loads the Validation Station and is driven by a `ContentValidationData` input.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- The `@uipath` scope must resolve to **GitHub Packages** (`https://npm.pkg.github.com`) with a token that can read UiPath packages — `@uipath/ui-widgets-validation-station` and its `@uipath/du-validation-station-wc` dependency are published there. Configure once in your user `~/.npmrc`:

  ```
  @uipath:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=<your-token>
  ```

- A **UiPath Automation Cloud** tenant with:
  - A non-confidential **External Application** (OAuth client) registered with scopes covering the validation flow:
    - `OR.Folders.Read` — folder context for the task
    - `OR.Buckets` — read the document artifacts from, and write validated results back to, the Storage Bucket
    - `Du.Validation.Api` — Document Understanding `ProcessExtractedData` call
    - Redirect URI `https://cloud.uipath.com/<orgId>/<tenantId>/actions_` (added automatically on deploy; add manually if missing)
- Install [UiPath CLI](https://github.com/UiPath/cli#installation)

  ```bash
  npm i -g @uipath/cli
  ```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure `uipath.json`

Open `uipath.json` and update the `clientId` (and `scope` if your external app grants a different set):

```json
{
  "scope": "OR.Folders.Read OR.Buckets Du.Validation.Api",
  "clientId": "<your-external-app-client-id>",
  "orgName": "",
  "tenantName": "",
  "baseUrl": "",
  "redirectUri": ""
}
```

`orgName`, `tenantName`, `baseUrl` and `redirectUri` can be left empty — they are auto-injected based on where the app is deployed.

- **`clientId`** — the App ID of your registered External Application in UiPath Cloud
- **`scope`** — must be a subset of the scopes granted to the external client above

### 3. Deploy to UiPath Cloud

```bash
uip login
npm run build
uip codedapp pack dist -n <appName> --version 1.0.0
uip codedapp publish --type Action
uip codedapp deploy
```

---

## Action Schema

Defined in `action-schema.json`.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `applicantName` | string | Yes | Full name of the loan applicant |
| `loanAmount` | number | No | Requested loan amount |
| `creditScore` | number | No | Applicant's credit score |
| `loanDocument` | ContentValidationData | No | Document Understanding validation payload (bucket paths, document ID, folder references) that drives the Validation Station |

### Outputs

| Field | Type | Required | Description |
|---|---|---|---|
| `riskFactor` | integer | Yes | Reviewer-assigned risk score (0–10) |
| `reviewerComments` | string | No | Free-text notes from the reviewer |

### Outcomes

| Outcome | Triggered by |
|---|---|
| `Complete` | Clicking the **Complete** button — completes the task with the current form data (including `loanDocument` unchanged) |

---

## Key Differences from `templateWithFileAttachment`

1. **Second tab** — renders the **Validation Station** widget (`@uipath/ui-widgets-validation-station`) instead of an inline PDF viewer.
2. **Input type** — the `loanDocument` input is `ContentValidationData` instead of `file`.
3. **SDK usage** — the `UiPath` SDK instance is initialized and passed to `<ValidationStation>`; no `attachmentService` is used.
4. **Static assets** — `vite.config.ts` copies the web component's `du-assets/` folder into the build output (and excludes `@uipath/du-validation-station-wc` from dep optimization) so PDF rendering and translations work in production.

---

## Expected Results

When the app loads inside Action Center:

1. **Review Application tab** — Displays the applicant name, loan amount, and credit score from the task inputs (read-only). The reviewer fills in the **Risk Factor** (integer 0–10) and optional **Reviewer Comments**, then clicks **Complete** to complete the task with the current form data.

2. **Document Validation tab** — Renders the Validation Station, fed by the `loanDocument` (`ContentValidationData`) input. The reviewer can correct extracted fields and save the validated data back to the Storage Bucket; `onSaveComplete` surfaces a success or error toast in Action Center.

3. **Theme** — Initializes in light or dark mode based on the Action Center theme preference, propagates the theme to the Validation Station, and supports toggling via the button in the top-right corner.

4. **Read-only mode** — If the task is already completed or the user lacks edit access, the form inputs are disabled and the Validation Station renders read-only.
