/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';
import type { BulkOperationResponse, BulkOperationAttributes } from '../../../types';

export const bulkDeleteRules = async ({
  filter,
  ids,
  http,
}: BulkOperationAttributes): Promise<BulkOperationResponse> => {
  try {
    const body = JSON.stringify({
      ...(ids?.length ? { ids } : {}),
      ...(filter ? { filter: JSON.stringify(filter) } : {}),
    });
    return http.patch(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_delete`, { body });
  } catch (e) {
    throw new Error(`Unable to parse bulk delete params: ${e}`);
  }
};
