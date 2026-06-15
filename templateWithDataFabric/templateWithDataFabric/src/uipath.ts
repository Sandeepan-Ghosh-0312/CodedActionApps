import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';
import { CodedActionAppService } from '@uipath/coded-action-app';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionAppService();

let entityService = new Entities(sdk);

export default { codedActionAppsService, entityService };
