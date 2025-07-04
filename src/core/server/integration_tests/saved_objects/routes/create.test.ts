/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import {
  setupServer,
  createHiddenTypeVariants,
  SetupServerReturn,
} from '@kbn/core-test-helpers-test-utils';
import {
  registerCreateRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { loggerMock } from '@kbn/logging-mocks';
import { deprecationMock, setupConfig } from './routes_test_utils';

const testTypes = [
  { name: 'index-pattern', hide: false },
  { name: 'hidden-type', hide: true },
  { name: 'hidden-from-http', hide: false, hideFromHttpApis: true },
];
describe('POST /api/saved_objects/{type}', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
  let loggerWarnSpy: jest.SpyInstance;
  let registrationSpy: jest.SpyInstance;

  const clientResponse = {
    id: 'logstash-*',
    type: 'index-pattern',
    title: 'logstash-*',
    version: 'foo',
    references: [],
    attributes: {},
  };

  beforeEach(async () => {
    ({ server, createRouter, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.create.mockImplementation(() => Promise.resolve(clientResponse));

    const router = createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsCreate.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    const logger = loggerMock.create();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();
    registrationSpy = jest.spyOn(router, 'post');

    const config = setupConfig();
    const access = 'public';

    registerCreateRoute(router, {
      config,
      coreUsageData,
      logger,
      access,
      deprecationInfo: deprecationMock,
    });

    handlerContext.savedObjects.typeRegistry.getType.mockImplementation((typename: string) => {
      return testTypes
        .map((typeDesc) => createHiddenTypeVariants(typeDesc))
        .find((fullTest) => fullTest.name === typename);
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const result = await supertest(server.listener)
      .post('/api/saved_objects/index-pattern')
      .set('x-elastic-internal-origin', 'kibana')
      .send({
        attributes: {
          title: 'Testing',
        },
      })
      .expect(200);

    expect(result.body).toEqual(clientResponse);
    expect(coreUsageStatsClient.incrementSavedObjectsCreate).toHaveBeenCalledWith({
      request: expect.anything(),
      types: ['index-pattern'],
    });
  });

  it('requires attributes', async () => {
    const result = await supertest(server.listener)
      .post('/api/saved_objects/index-pattern')
      .set('x-elastic-internal-origin', 'kibana')
      .send({})
      .expect(400);

    // expect(response.validation.keys).toContain('attributes');
    expect(result.body.message).toMatchInlineSnapshot(
      `"[request body.attributes]: expected value of type [object] but got [undefined]"`
    );
  });

  it('calls upon savedObjectClient.create', async () => {
    await supertest(server.listener)
      .post('/api/saved_objects/index-pattern')
      .set('x-elastic-internal-origin', 'kibana')
      .send({
        attributes: {
          title: 'Testing',
        },
      })
      .expect(200);

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'index-pattern',
      { title: 'Testing' },
      {
        overwrite: false,
        id: undefined,
        migrationVersion: undefined,
        migrationVersionCompatibility: 'compatible',
      }
    );
  });

  it('can specify an id', async () => {
    await supertest(server.listener)
      .post('/api/saved_objects/index-pattern/logstash-*')
      .set('x-elastic-internal-origin', 'kibana')
      .send({
        attributes: {
          title: 'Testing',
        },
      })
      .expect(200);

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);

    const args = savedObjectsClient.create.mock.calls[0];
    expect(args).toEqual([
      'index-pattern',
      { title: 'Testing' },
      { overwrite: false, id: 'logstash-*', migrationVersionCompatibility: 'compatible' },
    ]);
  });

  it('returns with status 400 if the type is hidden from the HTTP APIs', async () => {
    const result = await supertest(server.listener)
      .post('/api/saved_objects/hidden-from-http')
      .set('x-elastic-internal-origin', 'kibana')
      .send({
        attributes: {
          properties: {},
        },
      })
      .expect(400);

    expect(result.body.message).toContain("Unsupported saved object type: 'hidden-from-http'");
  });

  it('logs a warning message when called', async () => {
    await supertest(server.listener)
      .post('/api/saved_objects/index-pattern')
      .set('x-elastic-internal-origin', 'kibana')
      .send({
        attributes: {
          title: 'Logging test',
        },
      })
      .expect(200);
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
  });

  it('passes deprecation configuration to the router arguments', async () => {
    await supertest(server.listener)
      .post('/api/saved_objects/index-pattern')
      .set('x-elastic-internal-origin', 'kibana')
      .send({
        attributes: {
          title: 'Logging test',
        },
      })
      .expect(200);
    expect(registrationSpy.mock.calls[0][0]).toMatchObject({
      options: { deprecated: deprecationMock },
    });
  });
});
