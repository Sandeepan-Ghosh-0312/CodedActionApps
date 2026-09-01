import { UiPath } from '@uipath/uipath-typescript/core';
import { Attachments } from '@uipath/uipath-typescript/attachments';
import { CodedActionApp } from '@uipath/coded-action-app';

// Never call `sdk.initialize()` in an action app - Action Center's iframe injects the session.
const sdk = new UiPath();

const codedActionApps = new CodedActionApp();
const attachments = new Attachments(sdk);

export { codedActionApps, attachments };
