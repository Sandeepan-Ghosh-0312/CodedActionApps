import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionAppService } from '@uipath/coded-action-app';

const sdk = new UiPath();

const codedActionAppsService = new CodedActionAppService();

export default { sdk, codedActionAppsService };
