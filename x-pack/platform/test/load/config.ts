/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { FtrConfigProviderContext } from '@kbn/test';
import { GatlingTestRunner } from './runner';

// These "secret" values are intentionally written in the source.
const APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';
const AGGS_SHARD_DELAY = process.env.LOAD_TESTING_SHARD_DELAY;
const DISABLE_PLUGINS = process.env.LOAD_TESTING_DISABLE_PLUGINS;
const journeyName = process.env.GATLING_SIMULATIONS;
const testBuildId = process.env.BUILD_ID;
const branchName = process.env.KIBANA_BRANCH;

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.ts')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    testRunner: GatlingTestRunner,

    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs')],
      esJavaOpts: '-Xms8g -Xmx8g',
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      sourceArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.sourceArgs'),
        '--no-base-path',
        '--env.name=development',
        ...(!!AGGS_SHARD_DELAY ? ['--data.search.aggs.shardDelay.enabled=true'] : []),
        ...(!!DISABLE_PLUGINS ? ['--plugins.initialize=false'] : []),
      ],
      env: {
        ELASTIC_APM_ACTIVE: process.env.ELASTIC_APM_ACTIVE,
        ELASTIC_APM_CENTRAL_CONFIG: false,
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1',
        ELASTIC_APM_BREAKDOWN_METRICS: false,
        ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES: false,
        ELASTIC_APM_METRICS_INTERVAL: '120s',
        ELASTIC_APM_MAX_QUEUE_SIZE: 20480,
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_GLOBAL_LABELS: Object.entries({
          journeyName,
          testBuildId,
          branchName,
        })
          .flatMap(([key, value]) => (value == null ? [] : `${key}=${value}`))
          .join(','),
      },
      // delay shutdown by 150 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 150_000,
    },
  };
}
