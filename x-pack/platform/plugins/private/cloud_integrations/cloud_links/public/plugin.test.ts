/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maybeAddCloudLinksMock } from './plugin.test.mocks';
import { CloudLinksPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

describe('Cloud Links Plugin - public', () => {
  let plugin: CloudLinksPlugin;

  beforeEach(() => {
    plugin = new CloudLinksPlugin(coreMock.createPluginInitializerContext());
  });

  afterEach(() => {
    maybeAddCloudLinksMock.mockReset();
  });

  describe('start', () => {
    beforeEach(() => {
      plugin.setup(coreMock.createSetup());
    });

    afterEach(() => {
      plugin.stop();
    });

    describe('maybeAddCloudLinks', () => {
      test('calls maybeAddCloudLinks when cloud and security are enabled and it is an authenticated page', () => {
        const coreStart = coreMock.createStart();
        coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);
        const cloud = { ...cloudMock.createStart(), isCloudEnabled: true };
        const security = securityMock.createStart();
        plugin.start(coreStart, { cloud, security, share: sharePluginMock.createStartContract() });
        expect(maybeAddCloudLinksMock).toHaveBeenCalledTimes(1);
      });

      test('does not call maybeAddCloudLinks when security is disabled', () => {
        const coreStart = coreMock.createStart();
        coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);
        const cloud = { ...cloudMock.createStart(), isCloudEnabled: true };
        plugin.start(coreStart, { cloud, share: sharePluginMock.createStartContract() });
        expect(maybeAddCloudLinksMock).toHaveBeenCalledTimes(0);
      });

      test('does not call maybeAddCloudLinks when the page is anonymous', () => {
        const coreStart = coreMock.createStart();
        coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
        const cloud = { ...cloudMock.createStart(), isCloudEnabled: true };
        const security = securityMock.createStart();
        plugin.start(coreStart, { cloud, security, share: sharePluginMock.createStartContract() });
        expect(maybeAddCloudLinksMock).toHaveBeenCalledTimes(0);
      });

      test('does not call maybeAddCloudLinks when cloud is disabled', () => {
        const coreStart = coreMock.createStart();
        coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);
        const security = securityMock.createStart();
        plugin.start(coreStart, { security, share: sharePluginMock.createStartContract() });
        expect(maybeAddCloudLinksMock).toHaveBeenCalledTimes(0);
      });

      test('does not call maybeAddCloudLinks when isCloudEnabled is false', () => {
        const coreStart = coreMock.createStart();
        coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(false);
        const cloud = { ...cloudMock.createStart(), isCloudEnabled: false };
        const security = securityMock.createStart();
        plugin.start(coreStart, { cloud, security, share: sharePluginMock.createStartContract() });
        expect(maybeAddCloudLinksMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
