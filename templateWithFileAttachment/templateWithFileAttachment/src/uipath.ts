import { Attachments } from '@uipath/uipath-typescript/attachments';
import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionAppService } from '@uipath/coded-action-app';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionAppService();

let attachmentService = new Attachments(sdk);

export default { codedActionAppsService, attachmentService };