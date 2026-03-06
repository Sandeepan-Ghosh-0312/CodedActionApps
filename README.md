# CodedActionApps

A collection of starter templates and AI-assisted tooling for building **UiPath Coded Action Apps** — React + TypeScript frontend applications wired to UiPath Action Center.

## Documentation

- [Coded Action Apps SDK — Getting Started](https://uipath.github.io/uipath-typescript/coded-action-apps/getting-started/)
- [UiPath TypeScript SDK — Getting Started](https://uipath.github.io/uipath-typescript/getting-started/) (**Coded Action Apps work only on typescript SDK versions >= [1.1.2](https://github.com/UiPath/uipath-typescript/releases/tag/1.1.2)**)
- [UiPath Typescript CLI](https://github.com/UiPath/uipath-typescript/pkgs/npm/uipath-ts-cli/714399073) (Recommended version >= `1.0.0-beta.10`)

---

## What's in this repo

- **Starter Templates** — plug-and-play solutions ready to deploy
- **Skills installation and usage guide** — Claude skills for AI-assisted scaffolding/updating to latest package

---

## Using the Starter Templates

1. Browse the available templates below and pick one that fits your use case.
2. Additional installation steps are present in the readme of each template.

### Available Templates

| Template | Description |
|---|---|
| [templateWithImage](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/tree/main/templateWithImage) | Coded Action app with image attachments |
| [templateWithDoc](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/tree/main/templateWithDoc) | Coded Action app with document handling |
| [templateWithDataFabricAndStorageBucketDoc](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/tree/main/templateWithDataFabricAndStorageBucketDoc) | Coded Action app with Data Fabric entities and Storage Bucket documents |

---

## Starting from Scratch

Use the **UiPath Coded Apps Claude skills** to scaffold a new action app or migrate an existing one with AI assistance.

### Available Skills

The skills live in the [`feat/codedactionapps-skill`](https://github.com/UiPath/uipath-typescript/tree/feat/codedactionapps-skill) branch of the UiPath TypeScript SDK repo, under [`agent-skills/.claude-plugin/plugins/uipath-coded-apps/skills/`](https://github.com/UiPath/uipath-typescript/tree/feat/codedactionapps-skill/agent-skills/.claude-plugin/plugins/uipath-coded-apps/skills/).

| Skill | Purpose |
|---|---|
| [`create-action-app`](https://github.com/UiPath/uipath-typescript/tree/feat/codedactionapps-skill/agent-skills/.claude-plugin/plugins/uipath-coded-apps/skills/create-action-app) | Scaffold a new Coded Action App from scratch |
| [`update-action-app-new-package`](https://github.com/UiPath/uipath-typescript/tree/feat/codedactionapps-skill/agent-skills/.claude-plugin/plugins/uipath-coded-apps/skills/update-action-app-new-package) | Migrate an existing action app from the old `uipath-uipath-typescript-1.0.0-dev-actionApp.1.tgz` package SDK to use latest `@uipath/uipath-typescript` + `@uipath/uipath-ts-coded-action-apps@1.0.0-beta.1` packages.|

### Steps to Create a New Coded Action App

1. [Install](https://github.com/UiPath/uipath-typescript/tree/feat/codedactionapps-skill/agent-skills#installation) the UiPath Coded Apps Claude plugin from the skill repository.
2. Open Claude Code in your project directory.
3. Run the create skill:
   ```
   /create-action-app
   ```
4. Follow the guided prompts — Claude will ask for your app name, UiPath services to integrate (Data Fabric, Storage Buckets, Processes, etc.), and action schema details.
5. Claude generates all project files automatically for you.
6. Double check or update external client id, scopes and routing name (set as base in vite.config.ts) before deploying.

### Steps to Migrate an Existing Coded Action App to new ```uipath-ts-coded-action-apps``` SDK

If you have an action app built with the old `uipath-uipath-typescript-1.0.0-dev-actionApp.1.tgz` package

1. Open Claude Code in your existing app directory.
2. Run the migration skill:
   ```
   /update-action-app-new-package
   ```
3. Claude will update `package.json`, imports, and configuration to use the latest published `@uipath/uipath-typescript` + `@uipath/uipath-ts-coded-action-apps@1.0.0-beta.1` packages.
4. Review the changes, run `npm install`, and verify the app builds and runs correctly.

---

## Known Issues
- Coded Action Apps are yet to be onboarded to Solutions. Till then, coded action app tasks can only be created in debug mode in Studio Web or in RPA workflows in Studio Desktop.
- Due to this limitation, there are some error messages in Studio Web which can be ignored for debug mode. (Publish and deploying a solution with a coded action app will fail)
  
  <img width="3832" height="1952" alt="Screenshot 2026-03-10 174252" src="https://github.com/user-attachments/assets/cecaa053-bc9b-43ab-ab51-1e18c381b028" />
- `Deploy resources before debugging` setting also needs to be toggled off before debugging the solution

  <img width="3592" height="1774" alt="Screenshot 2026-03-06 020455" src="https://github.com/user-attachments/assets/46665445-c1b4-4ad4-83b6-9a2e223016a1" />
