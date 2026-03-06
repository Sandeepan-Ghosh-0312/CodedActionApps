import { BucketService } from '@uipath/uipath-typescript/buckets';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

let sdk = new UiPath();

let codedActionAppsService = new CodedActionAppsService();

let entityService = new Entities(sdk);

let bucketService = new BucketService(sdk);

export default { codedActionAppsService, entityService, bucketService };