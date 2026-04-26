# templateWithFileAttachment

A UiPath Coded Action App template for **Loan Application Review** with direct file attachments. Reviewers can assess an applicant's details, preview and download a directly attached PDF document, and complete the task with an Accept or Reject decision.

This template demonstrates how to handle direct file attachments in coded action apps, as opposed to referencing files from Storage Buckets.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant with:
  - A non-confidential **External Application** (OAuth client) registered with the following:
    - Scopes:
        - `OR.Folders.Read` (for file attachments)
    - Redirect URI `https://cloud.uipath.com/<orgId>/<tenantId>/actions_` (This gets added automatically when app is deployed, in case it does not please add it manually)
- Install the [uipath-uipath-ts-cli-1.0.0-beta.10](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/uipath-uipath-ts-cli-1.0.0-beta.10.tgz) package.
  
  ```bash
  npm i -g <pathToThisPackage>
  ```
  Verify the package has been correctly installed
  
  ```bash
  uipath --version
  ```
  The output of the above command should be `uipath-ts-cli version 1.0.0-beta.10`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure `uipath.json`

Open `uipath.json` and update the clientId:

```json
{
  "scope": "OR.Folders.Read",
  "clientId": "<your-external-app-client-id>",
  "orgName": "",
  "tenantName": "",
  "baseUrl": "",
  "redirectUri": ""
}
```
orgName, tenantName, baseUrl and redirectUri can be left as empty strings here. They are auto-injected into the app based on where the app is deployed.

- **`clientId`** — the App ID of your registered External Application in UiPath Cloud
- **`scope`** - the scopes required by the app. This must be a subset of the scopes granted to the external client above.

### 3. Update the app routing name

In `vite.config.ts`, update the `base` field to match the routing name of your deployed app:

```ts
base: "/your-app-routing-name"
```

This must match the name used when packaging and deploying (`uipath pack ./dist --name <appName>`). If they don't match the app will fail to load in Action Center. For already deployed apps, you can check the routing name of your app in Orchestrator Apps section.

### 4. Deploy to UiPath Cloud

Build and deploy using the `uipath-ts-cli`:

```bash
npm run build
uipath pack ./dist --name <appName> --version <version>
uipath publish --type Action
uipath deploy
```

If there are any failures in `uipath deploy` command, check the error message for the root cause. If there are failures due to non-unique or incorrect routing names, please use a different app name and restart.

---

## Action Schema

The action schema that drives this app expects the following inputs and produces the following outputs (defined in `action-schema.json`).

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `applicantName` | string | Yes | Full name of the loan applicant |
| `loanAmount` | number | No | Requested loan amount |
| `creditScore` | number | No | Applicant's credit score |
| `loanDocument` | file | No | Direct file attachment containing the loan document (PDF) |

### Outputs

| Field | Type | Required | Description |
|---|---|---|---|
| `riskFactor` | integer | Yes | Reviewer-assigned risk score (0–10) |
| `reviewerComments` | string | No | Free-text notes from the reviewer |

### Outcomes

| Outcome | Triggered by |
|---|---|
| `Approve` | Clicking the **Accept** button |
| `Reject` | Clicking the **Reject** button |

---

## Key Differences from Storage Bucket Template

This template differs from the `templateWithDataFabricAndStorageBucketDoc` in the following ways:

1. **File Input Method**: Uses direct file attachment (`file` type) instead of Storage Bucket name and file path (string inputs)
2. **Direct File Access**: Uses `uipath.attachmentService.getById()` instead of Storage Bucket APIs

---

## Viewing the coded action app in Action Center

1. Import the **TestTemplateWithFileAttachment.uis** solution in **Studio Web**.
   
   <img width="3836" height="1977" alt="Screenshot 2026-03-10 174451" src="https://github.com/user-attachments/assets/36046521-a49c-49f6-b103-01164828d6fb" />

3. In the **Properties** panel of the escalation, update the **Action App** field to point to your deployed coded action app.
   
   <img width="3839" height="1952" alt="Screenshot 2026-04-27 024249" src="https://github.com/user-attachments/assets/60ebf5c7-e094-450d-9d41-559209e3284b" />


5. Click **Debug** and enter the input arguments to run the process — this will create an Action Center task backed by your app. [Known Issues](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/README.md#known-issues)
6. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs. These automations can be published to the same tenant and run as unattended jobs in the folder where the app is deployed.

<img width="3838" height="1875" alt="Screenshot 2026-03-10 182414" src="https://github.com/user-attachments/assets/5c72d051-bb7c-4cb4-a23a-2751ffda3e69" />

---

## Expected Results

When the app loads inside Action Center:

1. **Review Application tab** — Displays the applicant name, loan amount, and credit score from the task inputs (read-only). The reviewer fills in the **Risk Factor** (integer 0–10, required) and optional **Reviewer Comments**, then clicks **Accept** or **Reject** to complete the task.

2. **Attachments tab** — On first visit, retrieves the attached file using the attachment service, fetches a signed download URI for the PDF, and renders it inline with:
   - Page navigation (previous / next)
   - Zoom controls (40% – 250%)
   - A **Download** button
   - An inline error message if the file cannot be found or accessed

3. **Theme** — The app initializes in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

4. **Read-only mode** — If the task is already completed or the current user does not have edit access, all input fields are disabled and the Accept / Reject buttons are greyed out.


https://github.com/user-attachments/assets/ac1b896b-1b52-421b-ae2d-1886920bb492


---

## File Attachment Handling

This template demonstrates the recommended approach for handling direct file attachments in coded action apps:

1. **Input Schema**: Define a `file` type input in `action-schema.json`
2. **Attachment Service**: Use `uipath.attachmentService.getById()` to retrieve file metadata and access URIs
3. **Authentication**: Handle both authenticated and non-authenticated file access patterns
4. **Blob Management**: Properly create and cleanup blob URLs for in-browser file display
5. **Download Support**: Provide download functionality using the file's original name
