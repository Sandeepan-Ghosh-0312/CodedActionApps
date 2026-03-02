import { BucketService } from '@uipath/uipath-typescript/buckets';
import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities } from '@uipath/uipath-typescript/entities';
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

let sdk = new UiPath({
  baseUrl: 'https://alpha.api.uipath.com',
  orgName: 'pricingtest',
  tenantName: 'testTenant',
  clientId: 'b23b2750-30f2-4176-8f95-318446833a98',
  scope: 'OR.Administration.Read OR.Jobs.Read OR.Users DataFabric.Data.Read DataFabric.Schema.Read offline_access',
  redirectUri: 'http://localhost:5173'
});

let codedActionAppsService = new CodedActionAppsService();

let entityService = new Entities(sdk);

let bucketService = new BucketService(sdk);

export default { sdk, codedActionAppsService, entityService, bucketService };