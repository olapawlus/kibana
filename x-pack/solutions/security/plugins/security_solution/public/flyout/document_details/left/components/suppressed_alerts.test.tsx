/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import {
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID,
  SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID,
} from './test_ids';
import { SuppressedAlerts } from './suppressed_alerts';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { isSuppressionRuleInGA } from '../../../../../common/detection_engine/utils';

jest.mock('../../../../../common/detection_engine/utils', () => ({
  isSuppressionRuleInGA: jest.fn().mockReturnValue(false),
}));

const isSuppressionRuleInGAMock = isSuppressionRuleInGA as jest.Mock;

const mockDataAsNestedObject = {
  _id: 'testId',
};

const TOGGLE_ICON = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID
);
const TITLE_ICON = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID
);
const TITLE_TEXT = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID
);
const INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID = `${CORRELATIONS_DETAILS_SUPPRESSED_ALERTS_SECTION_TEST_ID}InvestigateInTimeline`;

const renderSuppressedAlerts = (
  alertSuppressionCount: number,
  showInvestigateInTimeline: boolean = true
) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <SuppressedAlerts
          alertSuppressionCount={alertSuppressionCount}
          dataAsNestedObject={mockDataAsNestedObject}
          showInvestigateInTimeline={showInvestigateInTimeline}
        />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<SuppressedAlerts />', () => {
  it('should render zero component correctly', () => {
    const { getByTestId, queryByTestId } = renderSuppressedAlerts(0);

    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toHaveTextContent('0 suppressed alert');
    expect(queryByTestId(INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(TOGGLE_ICON)).not.toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should render single component correctly', () => {
    const { getByTestId, queryByTestId } = renderSuppressedAlerts(1);

    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toHaveTextContent('1 suppressed alert');
    expect(getByTestId(INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TOGGLE_ICON)).not.toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should render multiple component correctly', () => {
    const { getByTestId, queryByTestId } = renderSuppressedAlerts(2);

    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toHaveTextContent('2 suppressed alerts');
    expect(getByTestId(INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TOGGLE_ICON)).not.toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should not render Technical Preview badge if rule type is in GA', () => {
    isSuppressionRuleInGAMock.mockReturnValueOnce(true);
    const { queryByTestId } = renderSuppressedAlerts(2);

    expect(
      queryByTestId(SUPPRESSED_ALERTS_SECTION_TECHNICAL_PREVIEW_TEST_ID)
    ).not.toBeInTheDocument();
  });

  it('should not render investigate in timeline if showInvestigateInTimeline is false', () => {
    const { getByTestId, queryByTestId } = renderSuppressedAlerts(5, false);

    expect(getByTestId(TITLE_ICON)).toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT)).toHaveTextContent('5 suppressed alert');
    expect(queryByTestId(INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(TOGGLE_ICON)).not.toBeInTheDocument();
  });
});
