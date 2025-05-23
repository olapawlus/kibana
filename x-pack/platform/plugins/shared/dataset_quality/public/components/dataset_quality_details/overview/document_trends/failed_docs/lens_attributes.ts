/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GenericIndexPatternColumn, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { v4 as uuidv4 } from 'uuid';

import { DATA_SELECTOR, FAILURE_STORE_SELECTOR } from '../../../../../../common/constants';
import {
  flyoutFailedDocsTrendText,
  flyoutFailedDocsPercentageText,
} from '../../../../../../common/translations';

enum DatasetQualityLensColumn {
  Date = 'date_column',
  FailedDocs = 'failed_docs_column',
  CountFailed = 'count_failed',
  CountTotal = 'count_total',
  Math = 'math_column',
  Breakdown = 'breakdown_column',
}

const MAX_BREAKDOWN_SERIES = 5;
const FAILED_DOCS_QUERY = `_index: "*${FAILURE_STORE_SELECTOR}"`;

interface GetLensAttributesParams {
  color: string;
  dataStream: string;
  datasetTitle: string;
  breakdownFieldName?: string;
}

export function getLensAttributes({
  color,
  dataStream,
  datasetTitle,
  breakdownFieldName,
}: GetLensAttributesParams) {
  const dataViewId = uuidv4();

  const columnOrder = [
    DatasetQualityLensColumn.Date,
    DatasetQualityLensColumn.CountFailed,
    DatasetQualityLensColumn.CountTotal,
    DatasetQualityLensColumn.Math,
    DatasetQualityLensColumn.FailedDocs,
  ];

  if (breakdownFieldName) {
    columnOrder.unshift(DatasetQualityLensColumn.Breakdown);
  }

  const columns = getChartColumns(breakdownFieldName);
  return {
    visualizationType: 'lnsXY',
    title: flyoutFailedDocsTrendText,
    references: [],
    state: {
      ...getAdHocDataViewState(dataViewId, dataStream, datasetTitle),
      datasourceStates: {
        formBased: {
          layers: {
            layer1: {
              columnOrder,
              columns,
              indexPatternId: dataViewId,
            },
          },
        },
      },
      filters: [],
      query: {
        language: 'kuery',
        query: '',
      },
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
        },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        layers: [
          {
            accessors: [DatasetQualityLensColumn.FailedDocs],
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'line',
            xAccessor: DatasetQualityLensColumn.Date,
            ...(breakdownFieldName
              ? { splitAccessor: DatasetQualityLensColumn.Breakdown }
              : {
                  yConfig: [
                    {
                      forAccessor: DatasetQualityLensColumn.FailedDocs,
                      color,
                    },
                  ],
                }),
          },
        ],
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: 'large',
          shouldTruncate: true,
        },
        preferredSeriesType: 'line',
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        valueLabels: 'hide',
        yLeftExtent: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: undefined,
        },
      },
    },
  } as TypedLensByValueInput['attributes'];
}

function getAdHocDataViewState(id: string, dataStream: string, title: string) {
  return {
    internalReferences: [
      {
        id,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    adHocDataViews: {
      [id]: {
        id,
        title: `${dataStream}${DATA_SELECTOR},${dataStream}${FAILURE_STORE_SELECTOR}`,
        timeFieldName: '@timestamp',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        name: `${dataStream}${DATA_SELECTOR},${dataStream}${FAILURE_STORE_SELECTOR}`,
      },
    },
  };
}

function getChartColumns(breakdownField?: string): Record<string, GenericIndexPatternColumn> {
  return {
    [DatasetQualityLensColumn.Date]: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: {
        interval: 'auto',
      },
      scale: 'interval',
      sourceField: '@timestamp',
    } as GenericIndexPatternColumn,
    [DatasetQualityLensColumn.CountFailed]: {
      label: '',
      dataType: 'number',
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio',
      sourceField: '___records___',
      filter: {
        query: FAILED_DOCS_QUERY,
        language: 'kuery',
      },
      params: {
        emptyAsNull: false,
      },
      customLabel: true,
    } as GenericIndexPatternColumn,
    [DatasetQualityLensColumn.CountTotal]: {
      label: '',
      dataType: 'number',
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio',
      sourceField: '___records___',
      params: {
        emptyAsNull: false,
      },
      customLabel: true,
    } as GenericIndexPatternColumn,
    [DatasetQualityLensColumn.Math]: {
      label: '',
      dataType: 'number',
      operationType: 'math',
      isBucketed: false,
      scale: 'ratio',
      params: {
        tinymathAst: {
          type: 'function',
          name: 'divide',
          args: ['count_failed', 'count_total'],
          location: {
            min: 0,
            max: 34,
          },
          text: `count(kql='${FAILED_DOCS_QUERY}') / count()`,
        },
      },
      references: ['count_failed', 'count_total'],
      customLabel: true,
    } as GenericIndexPatternColumn,
    [DatasetQualityLensColumn.FailedDocs]: {
      label: flyoutFailedDocsPercentageText,
      customLabel: true,
      operationType: 'formula',
      dataType: 'number',
      references: [DatasetQualityLensColumn.Math],
      isBucketed: false,
      params: {
        formula: `count(kql='${FAILED_DOCS_QUERY}') / count()`,
        format: {
          id: 'percent',
          params: {
            decimals: 3,
          },
        },
        isFormulaBroken: false,
      },
    } as GenericIndexPatternColumn,
    ...(breakdownField
      ? {
          [DatasetQualityLensColumn.Breakdown]: {
            dataType: 'number',
            isBucketed: true,
            label: getFlyoutFailedDocsTopNText(MAX_BREAKDOWN_SERIES, breakdownField),
            operationType: 'terms',
            scale: 'ordinal',
            sourceField: breakdownField,
            params: {
              size: MAX_BREAKDOWN_SERIES,
              orderBy: {
                type: 'alphabetical',
                fallback: true,
              },
              orderDirection: 'desc',
              otherBucket: true,
              missingBucket: false,
              parentFormat: {
                id: 'terms',
              },
            },
          } as GenericIndexPatternColumn,
        }
      : {}),
  };
}

const getFlyoutFailedDocsTopNText = (count: number, fieldName: string) =>
  i18n.translate('xpack.datasetQuality.details.failedDocsTopNValues', {
    defaultMessage: 'Top {count} values of {fieldName}',
    values: { count, fieldName },
    description:
      'Tooltip label for the top N values of a field in the failed documents trend chart.',
  });
