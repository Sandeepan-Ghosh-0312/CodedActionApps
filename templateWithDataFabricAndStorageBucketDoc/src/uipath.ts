import { BucketService } from '@uipath/uipath-typescript/buckets';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';
import { TaskEventsService } from '@uipath/uipath-typescript/tasks';

let sdk = new UiPath({
  baseUrl: 'https://alpha.api.uipath.com',
  orgName: 'pricingtest',
  tenantName: 'testTenant',
  secret: 'dummy',
});

let taskEventsService = new TaskEventsService(sdk);

let entityService = new Entities(sdk);

let bucketService = new BucketService(sdk);

export default { sdk, taskEventsService, entityService, bucketService };