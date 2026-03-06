# templateWithImage

A UiPath Coded Action App template for **Loan Application Review**. Reviewers can assess an applicant's details and view a bundled loan application image, then complete the task with an Accept or Reject decision.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant
- Install the [uipath-uipath-ts-cli-1.0.0-beta.10](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/uipath-uipath-ts-cli-1.0.0-beta.10.tgz) package:
  
  ```bash
  npm i -g <pathToThisPackage>
  ```
  Verify the package has been correctly installed:
  
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

### 2. Update the app routing name

In `vite.config.ts`, update the `base` field to match the routing name of your deployed app:

```ts
base: "your-app-routing-name"
```

This must match the name used when packaging and deploying (`uipath pack ./dist --name <appName>`). If they don't match the app will fail to load in Action Center. For already deployed apps, you can check the routing name in the Orchestrator Apps section.

### 3. Deploy to UiPath Cloud

Build and deploy using the `uipath-ts-cli`:

```bash
npm run build
uipath pack ./dist --name <appName> --version <version>
uipath publish --type Action
uipath deploy
```

If there are any failures in `uipath deploy`, check the error message for the root cause. If there are failures due to non-unique or incorrect routing names, use a different app name and restart.

---

## Action Schema

The action schema that drives this app expects the following inputs and produces the following outputs (defined in `action-schema.json`):

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `applicantName` | string | Yes | Full name of the loan applicant |
| `loanAmount` | number | No | Requested loan amount |
| `creditScore` | number | No | Applicant's credit score |

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

## Viewing the coded action app in Action Center

1. Import the [TestTemplateWithImageAndDoc.uis](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/templateWithImage/TestTemplateWithImageAndDoc.uis) solution in **Studio Web**.

   <img width="3836" height="1977" alt="Screenshot 2026-03-10 174451" src="https://github.com/user-attachments/assets/762acbe4-2647-4274-8e90-224e32c5f1cd" />

2. In the **Properties** panel of the escalation, update the **Action App** field to point to your deployed coded action app.

  <img width="3838" height="1956" alt="Screenshot 2026-03-10 174130" src="https://github.com/user-attachments/assets/044bc09a-a5ff-422d-852e-cf780be91866" />
   
4. Click **Debug** to run the process — this will create an Action Center task backed by your app. [Known Issues](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/README.md#known-issues)
5. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs. These automations can be published to the same tenant and run as unattended jobs in the folder where the app is deployed.

<img width="3839" height="1915" alt="image" src="https://github.com/user-attachments/assets/33d50240-1ee3-46b1-8234-f231fc3a823f" />

---

## Expected Results

When the app loads inside Action Center:

1. **Review Application tab** — Displays the applicant name, loan amount, and credit score from the task inputs (read-only). The reviewer fills in the **Risk Factor** (integer 0–10, required) and optional **Reviewer Comments**, then clicks **Accept** or **Reject** to complete the task.

2. **Attachments tab** — Displays a bundled loan application image for reference.

3. **Theme** — The app initialises in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

4. **Read-only mode** — If the task is already completed or the current user does not have edit access, all input fields are disabled and the Accept / Reject buttons are greyed out.

   

https://github.com/user-attachments/assets/15561e1a-0a46-428a-a90d-81fdf4496bdd


