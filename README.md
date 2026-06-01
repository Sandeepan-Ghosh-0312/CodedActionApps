# CodedActionApps

A collection of starter templates and AI-assisted tooling for building **UiPath Coded Action Apps** — React + TypeScript frontend applications wired to UiPath Action Center.

## Documentation

- [Coded Action Apps SDK — Getting Started](https://uipath.github.io/uipath-typescript/coded-action-apps/getting-started/)
- [UiPath TypeScript SDK — Getting Started](https://uipath.github.io/uipath-typescript/getting-started/) (**Coded Action Apps work only on typescript SDK versions >= [1.1.2](https://github.com/UiPath/uipath-typescript/releases/tag/1.1.2)**)
- [UiPath CLI](https://www.npmjs.com/package/@uipath/cli)

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
| [templateWithFileAttachment](https://github.com/Sandeepan-Ghosh-0312/CodedActionApps/tree/main/templateWithFileAttachment) | Coded Action app with direct file attachments |

---

## Starting from Scratch

Use the **UiPath Coded Apps Claude skills** to scaffold a new action app or migrate an existing one with AI assistance.

### Available Skills

[`Coded Apps Skill`](https://github.com/UiPath/skills/blob/main/skills/uipath-coded-apps/SKILL.md) lives in the [`UiPath Skills`](https://github.com/UiPath/skills) repo.

[Quick Start](https://github.com/UiPath/skills/tree/main#quick-start)

### Steps to Create a New Coded Action App

1. Follow the quick start guide above to install the skills.
2. Open Claude Code in your project directory.
3. Run the create skill:
   ```
   /uipath-coded-apps
   ```
4. Follow the guided prompts — Claude will ask for app type: Web or Action (use Action for coded action app), your app name, UiPath services to integrate (Data Fabric, Storage Buckets, Processes, etc.), and action schema details.
5. Claude generates all project files automatically for you.
6. Double check or update external client id, scopes in `uipath.json` before deploying.

---
