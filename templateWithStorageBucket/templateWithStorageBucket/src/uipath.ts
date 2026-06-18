import { BucketService } from '@uipath/uipath-typescript/buckets';
import { UiPath } from '@uipath/uipath-typescript/core';
import { CodedActionAppService } from '@uipath/coded-action-app';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionAppService();

let bucketService = new BucketService(sdk);

export default { codedActionAppsService, bucketService };
