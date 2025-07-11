/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../../src/setup_node_env');
const { merge } = require('@kbn/openapi-bundler');
const { REPO_ROOT } = require('@kbn/repo-info');

(async () => {
  await merge({
    sourceGlobs: [
      `${REPO_ROOT}/oas_docs/bundle.serverless.json`,
      `${REPO_ROOT}/src/platform/plugins/shared/data_views/docs/openapi/bundled.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/ml/common/openapi/ml_apis_serverless.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/task_manager/docs/openapi/bundled_serverless.yaml`,

      // Observability Solution
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/apm/docs/openapi/apm/bundled.yaml`,
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/slo/docs/openapi/slo/bundled.yaml`,
      `${REPO_ROOT}/x-pack/solutions/observability/plugins/observability_ai_assistant_app/docs/openapi/observability_ai_assistant_app_apis.yaml`,

      // Security solution
      `${REPO_ROOT}/x-pack/solutions/security/plugins/security_solution/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/solutions/security/packages/kbn-securitysolution-lists-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/solutions/security/packages/kbn-securitysolution-endpoint-exceptions-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/platform/packages/shared/kbn-elastic-assistant-common/docs/openapi/serverless/*.schema.yaml`,
      `${REPO_ROOT}/x-pack/platform/plugins/shared/osquery/docs/openapi/serverless/*.schema.yaml`,
    ],
    outputFilePath: `${REPO_ROOT}/oas_docs/output/kibana.serverless.yaml`,
    options: {
      prototypeDocument: `${REPO_ROOT}/oas_docs/kibana.info.serverless.yaml`,
    },
  });
})();
