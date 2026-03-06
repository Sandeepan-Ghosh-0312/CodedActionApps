---
name: uipath-sdk-migrate
description: Migrate a UiPath coded action app from the old monolithic SDK (@uipath/uipath-typescript dev/local build) to the new split SDK (@uipath/uipath-typescript published + @uipath/uipath-ts-coded-action-apps). Use when the user asks to migrate from the old UiPath SDK, update uipath-typescript, or replace a dev SDK build with the published packages.
tools: Read, Edit, Write, Glob, Grep, Bash
---

# UiPath SDK Migration

Migrate a UiPath coded action app from the old monolithic SDK to the new split SDK.

## Steps

### 1. Update `package.json`

**Remove** the local `.tgz` reference:
```json
"@uipath/uipath-typescript": "file:../uipath-uipath-typescript-*.tgz"
```

**Add** the published packages:
```json
"@uipath/uipath-typescript": "<latest-version>",
"@uipath/uipath-ts-coded-action-apps": "<latest-version-or-local-tgz>"
```

Also update `zod` to v4 — it is now a peer dependency of the new SDK rather than a direct dependency.

Run `npm install` after updating.

---

### 2. Rewrite the UiPath setup file (`src/uipath.ts`)

**Old pattern** — monolithic import, required manual config passed at runtime, exported a reinit function:
```typescript
import { UiPath } from '@uipath/uipath-typescript';

let sdk = new UiPath({ baseUrl, orgName, tenantName, secret });

export const initializeSdk = (config) => { sdk = new UiPath({ ...config }); };
export default sdk;
```

**New pattern** — split subpath imports, no config required, services instantiated from the core client:
```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { <ServiceClass> } from '@uipath/uipath-typescript/<service-subpath>';
// ... repeat for each service the app uses
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

const sdk = new UiPath();                          // no config needed
const codedActionAppsService = new CodedActionAppsService();
const <serviceName> = new <ServiceClass>(sdk);    // pass sdk to each service
// ... repeat for each service used

export default { codedActionAppsService, <serviceName>, ... };
```

Key points:
- `UiPath` is now imported from `@uipath/uipath-typescript/core`, not the package root.
- Each SDK service has its own subpath import — check the new SDK's package exports for the correct subpath for each service you need.
- `CodedActionAppsService` comes entirely from `@uipath/uipath-ts-coded-action-apps`.
- The `initializeSdk` export and any manual token-refresh logic (`sdk.updateToken`) are no longer needed — remove them.

---

### 3. Update component imports

**Remove:**
- `import sdk, { initializeSdk } from '../uipath'`
- Any utility functions that were workarounds for old SDK limitations (e.g., asset URL resolution helpers)

**Add:**
```typescript
import uipath from '../uipath';
import { Theme, MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';
```

---

### 4. Replace task initialization pattern

**Old — callback-based, requires manual SDK re-init inside callback:**
```typescript
useEffect(() => {
  sdk.taskEvents.getTaskDetailsFromActionCenter((data) => {
    initializeSdk({ baseUrl: data.baseUrl, ... });
    if (data.newToken) sdk.updateToken(data.newToken);
    setFormData(data.data);
    setActionCenterData(data);
  });
  sdk.taskEvents.initializeInActionCenter();
}, []);
```

**New — promise-based, SDK self-configures:**
```typescript
const [isReadOnly, setIsReadOnly] = useState(false);
const [folderId, setFolderId] = useState<any>(null);

useEffect(() => {
  uipath.codedActionAppsService.getTask().then((task) => {
    if (task.data) setFormData(task.data as FormData);
    setFolderId(task.folderId);          // replaces actionCenterData.organizationUnitId
    setIsReadOnly(task.isReadOnly);
    // optional: propagate theme to parent
    // onInitTheme(isDarkTheme(task.theme));
  });
}, []);
```

- Replace all uses of `actionCenterData.organizationUnitId` with the `folderId` state.
- Remove the `actionCenterData` state entirely.

---

### 5. Replace task event methods

| Old | New |
|-----|-----|
| `sdk.taskEvents.completeTask(action, data)` | `await uipath.codedActionAppsService.completeTask(action, data)` |
| `sdk.taskEvents.dataChanged(data)` | `uipath.codedActionAppsService.setTaskData(data)` |
| *(no equivalent)* | `uipath.codedActionAppsService.showMessage(msg, MessageSeverity.Error\|Info\|Warning)` |

Make action handlers async since `completeTask` is now a promise.

---

### 6. Update SDK service call sites

For each SDK service used in the app:

1. Update the call site to use the new service instance from `uipath.<serviceName>` instead of `sdk.<oldNamespace>`.
2. Check the new SDK's TypeScript definitions for any methods marked `@deprecated` — if the method you were calling is deprecated, switch to its documented replacement.
3. The method signatures are generally the same unless deprecated; only the access path changes.

---

### 7. Handle theme from task (optional)

If the app supports light/dark theming:

```typescript
import { Theme } from '@uipath/uipath-ts-coded-action-apps';

const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

// Inside getTask().then():
onInitTheme(isDarkTheme(task.theme));
```

Remove any `ThemeContext` / `localStorage`-based theme logic and drive the theme from `task.theme` instead.

---

### 8. Apply `isReadOnly` to form inputs

The new SDK exposes `task.isReadOnly`. Guard mutations and mark inputs accordingly:

```typescript
const handleChange = (e) => {
  if (isReadOnly) return;
  // ... existing logic
  uipath.codedActionAppsService.setTaskData(updatedData);
};

// In JSX:
<input readOnly={isReadOnly} ... />
<textarea readOnly={isReadOnly} ... />
```

Also gate action buttons on `!isReadOnly` in your form-valid check.

---

### 9. Remove SDK workaround utilities

The old SDK required runtime helpers to work around its limitations (e.g., resolving bundled asset base URLs). These are no longer needed. Delete them and use direct bundler asset imports instead:

```typescript
// Old — runtime workaround
<img src={someHelperFn(assetPath)} />

// New — direct import, bundler handles it
import assetFile from '../assets/file.svg';
<img src={assetFile} />
```

---

### 10. Update `vite.config.ts`

Add the `base` path matching the app's routing name in UiPath Action Center:
```typescript
base: "/your-app-routing-name"  // replace with actual routing name
```

---

## Checklist

- [ ] `package.json`: local tgz replaced with published packages; zod updated to v4
- [ ] `src/uipath.ts`: rewritten with subpath imports, no config, services exported as named properties
- [ ] `initializeSdk` export and `sdk.updateToken` calls removed
- [ ] Task init: callback pattern replaced with `codedActionAppsService.getTask()` promise
- [ ] `actionCenterData` state removed; `folderId` state added in its place
- [ ] Action handlers made async; `completeTask` awaited
- [ ] `dataChanged` → `setTaskData`
- [ ] All service call sites updated to new access path; deprecated methods replaced per SDK type definitions
- [ ] `isReadOnly` state wired to inputs and action buttons
- [ ] SDK workaround utilities removed; direct bundler asset imports used
- [ ] `ThemeContext` removed if present; theme driven by `task.theme`
- [ ] `vite.config.ts`: `base` path added
- [ ] `npm install` run after package changes
