/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability UI - feature flags', function () {
    // add tests that require feature flags, defined in config.feature_flags.ts
    loadTestFile(require.resolve('./role_management'));
    loadTestFile(require.resolve('./rules/custom_threshold_consumer'));
    loadTestFile(require.resolve('./rules/es_query_consumer'));
    loadTestFile(require.resolve('./infra'));
    loadTestFile(require.resolve('./streams'));
  });
}
