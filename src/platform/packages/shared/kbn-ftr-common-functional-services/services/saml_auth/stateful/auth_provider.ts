/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readRolesDescriptorsFromResource, STATEFUL_ROLES_ROOT_PATH } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import { AuthProvider } from '../get_auth_provider';
import {
  getStatefulInternalRequestHeaders,
  COMMON_REQUEST_HEADERS,
} from '../default_request_headers';

export class StatefulAuthProvider implements AuthProvider {
  private readonly rolesDefinitionPath = resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH, 'roles.yml');

  isServerless() {
    return false;
  }

  getProjectType() {
    return undefined;
  }

  getSupportedRoleDescriptors() {
    const roleDescriptors = new Map<string, any>(
      Object.entries(
        readRolesDescriptorsFromResource(this.rolesDefinitionPath) as Record<string, unknown>
      )
    );
    // no privileges set by default
    roleDescriptors.set(this.getCustomRole(), null);

    return roleDescriptors;
  }

  getDefaultRole() {
    return 'editor';
  }

  isCustomRoleEnabled() {
    return true;
  }

  // For compatibility with the Scout test framework we use the same name for the custom role
  getCustomRole() {
    return 'custom_role_worker_1';
  }

  getRolesDefinitionPath() {
    return this.rolesDefinitionPath;
  }

  getCommonRequestHeader() {
    return COMMON_REQUEST_HEADERS;
  }

  getInternalRequestHeader() {
    return getStatefulInternalRequestHeaders();
  }
}
