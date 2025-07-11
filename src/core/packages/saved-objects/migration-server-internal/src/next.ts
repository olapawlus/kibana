/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/pipeable';
import * as Option from 'fp-ts/Option';
import * as TaskEither from 'fp-ts/TaskEither';
import { omit } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { WaitGroup } from './kibana_migrator_utils';
import type {
  AllActionStates,
  CalculateExcludeFiltersState,
  CheckTargetTypesMappingsState,
  CheckUnknownDocumentsState,
  CleanupUnknownAndExcluded,
  CleanupUnknownAndExcludedWaitForTaskState,
  CloneTempToTarget,
  CreateNewTargetState,
  CreateReindexTempState,
  InitState,
  LegacyCreateReindexTargetState,
  LegacyDeleteState,
  LegacyReindexState,
  LegacyReindexWaitForTaskState,
  LegacySetWriteBlockState,
  MarkVersionIndexReady,
  MarkVersionIndexReadyConflict,
  OutdatedDocumentsRefresh,
  OutdatedDocumentsSearchClosePit,
  OutdatedDocumentsSearchOpenPit,
  OutdatedDocumentsSearchRead,
  OutdatedDocumentsTransform,
  PrepareCompatibleMigration,
  RefreshSource,
  RefreshTarget,
  ReindexSourceToTempClosePit,
  ReindexSourceToTempIndexBulk,
  ReindexSourceToTempOpenPit,
  ReindexSourceToTempRead,
  ReindexSourceToTempTransform,
  SetSourceWriteBlockState,
  SetTempWriteBlock,
  State,
  TransformedDocumentsBulkIndex,
  UpdateSourceMappingsPropertiesState,
  UpdateTargetMappingsMeta,
  UpdateTargetMappingsPropertiesState,
  UpdateTargetMappingsPropertiesWaitForTaskState,
  WaitForMigrationCompletionState,
  WaitForYellowSourceState,
} from './state';
import { createDelayFn } from './common/utils';
import type { TransformRawDocs } from './types';
import * as Actions from './actions';

type ActionMap = ReturnType<typeof nextActionMap>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = Awaited<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

export const nextActionMap = (
  client: ElasticsearchClient,
  transformRawDocs: TransformRawDocs,
  readyToReindex: WaitGroup<void>,
  doneReindexing: WaitGroup<void>,
  updateRelocationAliases: WaitGroup<Actions.AliasAction[]>,
  removedTypes: string[]
) => {
  return {
    INIT: (state: InitState) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
    WAIT_FOR_MIGRATION_COMPLETION: (state: WaitForMigrationCompletionState) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
    WAIT_FOR_YELLOW_SOURCE: (state: WaitForYellowSourceState) =>
      Actions.waitForIndexStatus({ client, index: state.sourceIndex.value, status: 'yellow' }),
    UPDATE_SOURCE_MAPPINGS_PROPERTIES: (state: UpdateSourceMappingsPropertiesState) =>
      Actions.updateSourceMappingsProperties({
        client,
        indexTypes: state.indexTypes,
        sourceIndex: state.sourceIndex.value,
        indexMappings: state.sourceIndexMappings.value,
        appMappings: state.targetIndexMappings,
        latestMappingsVersions: state.latestMappingsVersions,
        hashToVersionMap: state.hashToVersionMap,
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED: (state: CleanupUnknownAndExcluded) =>
      Actions.cleanupUnknownAndExcluded({
        client,
        indexName: state.sourceIndex.value,
        discardUnknownDocs: state.discardUnknownObjects,
        excludeOnUpgradeQuery: state.excludeOnUpgradeQuery,
        excludeFromUpgradeFilterHooks: state.excludeFromUpgradeFilterHooks,
        knownTypes: state.knownTypes,
        removedTypes,
      }),
    CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK: (
      state: CleanupUnknownAndExcludedWaitForTaskState
    ) =>
      Actions.waitForDeleteByQueryTask({
        client,
        taskId: state.deleteByQueryTaskId,
        timeout: '120s',
      }),
    PREPARE_COMPATIBLE_MIGRATION: (state: PrepareCompatibleMigration) =>
      Actions.updateAliases({ client, aliasActions: state.preTransformDocsActions }),
    REFRESH_SOURCE: (state: RefreshSource) =>
      Actions.refreshIndex({ client, index: state.sourceIndex.value }),
    REINDEX_CHECK_CLUSTER_ROUTING_ALLOCATION: () =>
      Actions.checkClusterRoutingAllocationEnabled(client),
    CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION: () =>
      Actions.checkClusterRoutingAllocationEnabled(client),
    RELOCATE_CHECK_CLUSTER_ROUTING_ALLOCATION: () =>
      Actions.checkClusterRoutingAllocationEnabled(client),
    CHECK_UNKNOWN_DOCUMENTS: (state: CheckUnknownDocumentsState) =>
      Actions.checkForUnknownDocs({
        client,
        indexName: state.sourceIndex.value,
        excludeOnUpgradeQuery: state.excludeOnUpgradeQuery,
        knownTypes: state.knownTypes,
      }),
    SET_SOURCE_WRITE_BLOCK: (state: SetSourceWriteBlockState) =>
      Actions.safeWriteBlock({
        client,
        sourceIndex: state.sourceIndex.value,
        targetIndex: state.targetIndex,
      }),
    CALCULATE_EXCLUDE_FILTERS: (state: CalculateExcludeFiltersState) =>
      Actions.calculateExcludeFilters({
        client,
        excludeFromUpgradeFilterHooks: state.excludeFromUpgradeFilterHooks,
      }),
    CREATE_NEW_TARGET: (state: CreateNewTargetState) =>
      Actions.createIndex({
        client,
        indexName: state.targetIndex,
        mappings: state.targetIndexMappings,
        esCapabilities: state.esCapabilities,
      }),
    CREATE_REINDEX_TEMP: (state: CreateReindexTempState) =>
      Actions.createIndex({
        client,
        indexName: state.tempIndex,
        aliases: [state.tempIndexAlias],
        mappings: state.tempIndexMappings,
        esCapabilities: state.esCapabilities,
      }),
    READY_TO_REINDEX_SYNC: () =>
      Actions.synchronizeMigrators({
        waitGroup: readyToReindex,
      }),
    REINDEX_SOURCE_TO_TEMP_OPEN_PIT: (state: ReindexSourceToTempOpenPit) =>
      Actions.openPit({ client, index: state.sourceIndex.value }),
    REINDEX_SOURCE_TO_TEMP_READ: (state: ReindexSourceToTempRead) =>
      Actions.readWithPit({
        client,
        pitId: state.sourceIndexPitId,
        /* When reading we use a source query to exclude saved objects types which
         * are no longer used. These saved objects will still be kept in the outdated
         * index for backup purposes, but won't be available in the upgraded index.
         */
        query: state.excludeOnUpgradeQuery,
        batchSize: state.batchSize,
        searchAfter: state.lastHitSortValue,
      }),
    REINDEX_SOURCE_TO_TEMP_CLOSE_PIT: (state: ReindexSourceToTempClosePit) =>
      Actions.closePit({ client, pitId: state.sourceIndexPitId }),
    REINDEX_SOURCE_TO_TEMP_TRANSFORM: (state: ReindexSourceToTempTransform) =>
      Actions.transformDocs({ transformRawDocs, outdatedDocuments: state.outdatedDocuments }),
    REINDEX_SOURCE_TO_TEMP_INDEX_BULK: (state: ReindexSourceToTempIndexBulk) =>
      Actions.bulkOverwriteTransformedDocuments({
        client,
        /*
         * Since other nodes can delete the temp index while we're busy writing
         * to it, we use the alias to prevent the auto-creation of the index if
         * it doesn't exist.
         */
        index: state.tempIndexAlias,
        useAliasToPreventAutoCreate: true,
        operations: state.bulkOperationBatches[state.currentBatch],
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * before we reach out to the OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT step.
         * Right now, it's performed during REFRESH_TARGET step.
         */
        refresh: false,
      }),
    DONE_REINDEXING_SYNC: () =>
      Actions.synchronizeMigrators({
        waitGroup: doneReindexing,
      }),
    SET_TEMP_WRITE_BLOCK: (state: SetTempWriteBlock) =>
      Actions.setWriteBlock({ client, index: state.tempIndex }),
    CLONE_TEMP_TO_TARGET: (state: CloneTempToTarget) =>
      Actions.cloneIndex({
        client,
        source: state.tempIndex,
        target: state.targetIndex,
        esCapabilities: state.esCapabilities,
      }),
    REFRESH_TARGET: (state: RefreshTarget) =>
      Actions.refreshIndex({ client, index: state.targetIndex }),
    CHECK_TARGET_MAPPINGS: (state: CheckTargetTypesMappingsState) =>
      Actions.checkTargetTypesMappings({
        indexTypes: state.indexTypes,
        indexMappings: Option.toUndefined(state.sourceIndexMappings),
        appMappings: state.targetIndexMappings,
        latestMappingsVersions: state.latestMappingsVersions,
        hashToVersionMap: state.hashToVersionMap,
      }),
    UPDATE_TARGET_MAPPINGS_PROPERTIES: (state: UpdateTargetMappingsPropertiesState) =>
      Actions.updateAndPickupMappings({
        client,
        index: state.targetIndex,
        mappings: omit(state.targetIndexMappings, ['_meta']), // ._meta property will be updated on a later step
        batchSize: state.batchSize,
        query: Option.toUndefined(state.updatedTypesQuery),
      }),
    UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK: (
      state: UpdateTargetMappingsPropertiesWaitForTaskState
    ) =>
      Actions.waitForPickupUpdatedMappingsTask({
        client,
        taskId: state.updateTargetMappingsTaskId,
        timeout: '60s',
      }),
    UPDATE_TARGET_MAPPINGS_META: (state: UpdateTargetMappingsMeta) => {
      return Actions.updateMappings({
        client,
        index: state.targetIndex,
        mappings: omit(state.targetIndexMappings, ['properties']), // properties already updated on a previous step
      });
    },
    CHECK_VERSION_INDEX_READY_ACTIONS: () => Actions.noop,
    OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: (state: OutdatedDocumentsSearchOpenPit) =>
      Actions.openPit({ client, index: state.targetIndex }),
    OUTDATED_DOCUMENTS_SEARCH_READ: (state: OutdatedDocumentsSearchRead) =>
      Actions.readWithPit({
        client,
        pitId: state.pitId,
        // search for outdated documents only
        query: state.outdatedDocumentsQuery,
        batchSize: state.batchSize,
        searchAfter: state.lastHitSortValue,
        maxResponseSizeBytes: state.maxReadBatchSizeBytes,
      }),
    OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (state: OutdatedDocumentsSearchClosePit) =>
      Actions.closePit({ client, pitId: state.pitId }),
    OUTDATED_DOCUMENTS_REFRESH: (state: OutdatedDocumentsRefresh) =>
      Actions.refreshIndex({ client, index: state.targetIndex }),
    OUTDATED_DOCUMENTS_TRANSFORM: (state: OutdatedDocumentsTransform) =>
      Actions.transformDocs({ transformRawDocs, outdatedDocuments: state.outdatedDocuments }),
    TRANSFORMED_DOCUMENTS_BULK_INDEX: (state: TransformedDocumentsBulkIndex) =>
      Actions.bulkOverwriteTransformedDocuments({
        client,
        index: state.targetIndex,
        operations: state.bulkOperationBatches[state.currentBatch],
        /**
         * Since we don't run a search against the target index, we disable "refresh" to speed up
         * the migration process.
         * Although any further step must run "refresh" for the target index
         * Right now, it's performed during OUTDATED_DOCUMENTS_REFRESH step.
         */
        refresh: false,
      }),
    MARK_VERSION_INDEX_READY: (state: MarkVersionIndexReady) =>
      Actions.updateAliases({ client, aliasActions: state.versionIndexReadyActions.value }),
    MARK_VERSION_INDEX_READY_SYNC: (state: MarkVersionIndexReady) =>
      pipe(
        // First, we wait for all the migrators involved in a relocation to reach this point.
        Actions.synchronizeMigrators<Actions.AliasAction[]>({
          waitGroup: updateRelocationAliases,
          payload: state.versionIndexReadyActions.value,
        }),
        // Then, all migrators will try to update all aliases (from all indices). Only the first one will succeed.
        // The others will receive alias_not_found_exception and cause MARK_VERSION_INDEX_READY_CONFLICT (that's acceptable).
        TaskEither.chainW(({ data }) =>
          Actions.updateAliases({ client, aliasActions: data.flat() })
        )
      ),
    MARK_VERSION_INDEX_READY_CONFLICT: (state: MarkVersionIndexReadyConflict) =>
      Actions.fetchIndices({ client, indices: [state.currentAlias, state.versionAlias] }),
    LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION: () =>
      Actions.checkClusterRoutingAllocationEnabled(client),
    LEGACY_SET_WRITE_BLOCK: (state: LegacySetWriteBlockState) =>
      Actions.setWriteBlock({ client, index: state.legacyIndex }),
    LEGACY_CREATE_REINDEX_TARGET: (state: LegacyCreateReindexTargetState) =>
      Actions.createIndex({
        client,
        indexName: state.sourceIndex.value,
        mappings: state.sourceIndexMappings.value,
        esCapabilities: state.esCapabilities,
      }),
    LEGACY_REINDEX: (state: LegacyReindexState) =>
      Actions.reindex({
        client,
        sourceIndex: state.legacyIndex,
        targetIndex: state.sourceIndex.value,
        reindexScript: state.preMigrationScript,
        requireAlias: false,
        excludeOnUpgradeQuery: state.excludeOnUpgradeQuery,
        batchSize: state.batchSize,
      }),
    LEGACY_REINDEX_WAIT_FOR_TASK: (state: LegacyReindexWaitForTaskState) =>
      Actions.waitForReindexTask({ client, taskId: state.legacyReindexTaskId, timeout: '60s' }),
    LEGACY_DELETE: (state: LegacyDeleteState) =>
      Actions.updateAliases({ client, aliasActions: state.legacyPreMigrationDoneActions }),
  };
};

export const next = (
  client: ElasticsearchClient,
  transformRawDocs: TransformRawDocs,
  readyToReindex: WaitGroup<void>,
  doneReindexing: WaitGroup<void>,
  updateRelocationAliases: WaitGroup<Actions.AliasAction[]>,
  removedTypes: string[]
) => {
  const map = nextActionMap(
    client,
    transformRawDocs,
    readyToReindex,
    doneReindexing,
    updateRelocationAliases,
    removedTypes
  );
  return (state: State) => {
    const delay = createDelayFn(state);

    if (state.controlState === 'DONE' || state.controlState === 'FATAL') {
      // Return null if we're in one of the terminating states
      return null;
    } else {
      // Otherwise return the delayed action
      // We use an explicit cast as otherwise TS infers `(state: never) => ...`
      // here because state is inferred to be the intersection of all states
      // instead of the union.
      const nextAction = map[state.controlState] as (
        state: State
      ) => ReturnType<(typeof map)[AllActionStates]>;
      return delay(nextAction(state));
    }
  };
};
