import { UiPath } from '@uipath/uipath-typescript';

let sdk = new UiPath({
  baseUrl: 'https://alpha.uipath.com',
  orgName: 'pricingtest',
  tenantName: 'testTenant',
  secret: 'dummy',
});

export default sdk;