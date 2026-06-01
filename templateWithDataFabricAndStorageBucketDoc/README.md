# templateWithDataFabricAndStorageBucketDoc

A UiPath Coded Action App template for **Loan Application Review**. Reviewers can assess an applicant's details, view their loan history from a **Data Fabric** entity, preview and download a supporting PDF document from a **Storage Bucket**, and complete the task with an Accept or Reject decision.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant with:
  - A non-confidential **External Application** (OAuth client) registered with the following:
    - Scopes:
        - `OR.Buckets.Read` (for storage buckets)
        - `OR.Users` (for Data Fabric folder entity reads)
        - `DataFabric.Data.Read` (for Data Fabric folder entity reads)
    - Redirect URI `https://cloud.uipath.com/<orgId>/<tenantId>/actions_` (This gets added automatically when your app is deployed, in case it does not please add it manually)
  - A **Data Fabric entity** containing loan history records (fields: `loanType`, `amount`, `processingDate`, `status`, `duration`). Import this [entity schema](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/templateWithDataFabricAndStorageBucketDoc/DataFabricEntitySchema.json) directly in Data Fabric (replace folderId with your app folderKey) and add data records.
  - A **Storage Bucket** accessible from the folder where the action task will run with the document present
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

Open `uipath.json` and update the clientId:

```json
{
  "scope": "OR.Administration.Read OR.Users DataFabric.Data.Read",
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

### 3. Update the Data Fabric entity ID

In `src/components/Form.tsx`, replace the entity ID with your own Data Fabric entity ID:

```ts
const response = await uipath.entityService.getAllRecords('<your-entity-id>', { pageSize: 5, expansionLevel: 1 })
```

### 4. Deploy to UiPath Cloud

Build and deploy using the [`UiPath CLI`](https://uipath.github.io/uipath-typescript/coded-apps/getting-started/#deploy):

```bash
uip login
npm run build
uip codedapp pack dist -n <appName> --version 1.0.0
uip codedapp publish
uip codedapp deploy
```

---

## Action Schema

The action schema that drives this app expects the following inputs and produces the following outputs (defined in `action-schema.json`).:

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `applicantName` | string | Yes | Full name of the loan applicant |
| `loanAmount` | number | No | Requested loan amount |
| `creditScore` | number | No | Applicant's credit score |
| `loanDocumentStorageBucket` | string | No | Name of the Storage Bucket containing the loan document |
| `loanDocumentFilePath` | string | No | Path to the PDF file inside the bucket |

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

1. Import the [TestTemplateWithDataFabricStorageBucketDoc.uis](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/blob/main/templateWithDataFabricAndStorageBucketDoc/TestTemplateWithDataFabricStorageBucketDoc.uis) solution in **Studio Web**.
   
   <img width="3836" height="1977" alt="Screenshot 2026-03-10 174451" src="https://github.com/user-attachments/assets/36046521-a49c-49f6-b103-01164828d6fb" />

3. In the **Properties** panel of the escalation, update the **Action App** field to point to your deployed coded action app.
   
   <img width="3838" height="1963" alt="image" src="https://github.com/user-attachments/assets/afbb81ba-eb5b-4c2d-873b-d8f0f2c0c151" />


4. Click **Debug** and enter the input arguments to run the process — this will create an Action Center task backed by your app.
5. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs.

<img width="3838" height="1875" alt="Screenshot 2026-03-10 182414" src="https://github.com/user-attachments/assets/5c72d051-bb7c-4cb4-a23a-2751ffda3e69" />


---

## Expected Results

When the app loads inside Action Center (or locally via the dev server pointed at a live task):

1. **Review Application tab** — Displays the applicant name, loan amount, and credit score from the task inputs (read-only). The reviewer fills in the **Risk Factor** (integer 0–10, required) and optional **Reviewer Comments**, then clicks **Accept** or **Reject** to complete the task.

2. **Applicant History tab** — On first visit, fetches the last 5 loan history records for the applicant from the configured Data Fabric entity and displays them in a table (Loan Type, Amount, Processing Date, Duration, Status). Shows a loading spinner while fetching and an empty-state message if no records are found.

3. **Attachments tab** — On first visit, resolves the Storage Bucket specified in the task inputs, fetches a signed download URI for the PDF at the given file path, and renders it inline with:
   - Page navigation (previous / next)
   - Zoom controls (40% – 250%)
   - A **Download** button
   - An inline error message if the bucket or file cannot be found

4. **Theme** — The app initialises in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

5. **Read-only mode** — If the task is already completed or the current user does not have edit access, all input fields are disabled and the Accept / Reject buttons are greyed out.



https://github.com/user-attachments/assets/9ae0b4f3-68e9-44ca-92eb-f85b82b51b1b

