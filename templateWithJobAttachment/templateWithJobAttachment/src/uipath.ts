import { Attachments } from '@uipath/uipath-typescript/attachments';
import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionAppsService();

let attachmentService = new Attachments(sdk);

export default { codedActionAppsService, attachmentService };