/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EventEmitter } from 'events';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type UseEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { Vis } from '@kbn/visualizations-plugin/public';
import { SavedSearch, getSavedSearchUrl } from '@kbn/saved-search-plugin/public';
import { ApplicationStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const titleContainerStyle = ({ euiTheme }: UseEuiTheme) =>
  css({
    padding: `${euiTheme.size.s} ${euiTheme.size.xl} ${euiTheme.size.s} ${euiTheme.size.s}`, // Extra padding on the right for the collapse button
  });

const sideBarTitleStyles = {
  titleContainer: titleContainerStyle,
  indexPatternPlaceholder: ({ euiTheme }: UseEuiTheme) =>
    css({
      minHeight: euiTheme.size.xxl,
      borderBottom: euiTheme.border.thin,
    }),
};

const linkedSearchStyles = {
  titleContainer: titleContainerStyle,
  linkedSearch: css({
    flexGrow: 0,
  }),
};

interface LinkedSearchProps {
  savedSearch: SavedSearch;
  eventEmitter: EventEmitter;
}

interface SidebarTitleProps {
  isLinkedSearch: boolean;
  savedSearch?: SavedSearch;
  vis: Vis;
  eventEmitter: EventEmitter;
}

export function LinkedSearch({ savedSearch, eventEmitter }: LinkedSearchProps) {
  const styles = useMemoCss(linkedSearchStyles);
  const [showPopover, setShowPopover] = useState(false);
  const {
    services: { application },
  } = useKibana<{ application: ApplicationStart }>();

  const closePopover = useCallback(() => setShowPopover(false), []);
  const onClickButtonLink = useCallback(() => setShowPopover((v) => !v), []);
  const onClickUnlikFromSavedSearch = useCallback(() => {
    setShowPopover(false);
    eventEmitter.emit('unlinkFromSavedSearch');
  }, [eventEmitter]);
  const onClickViewInDiscover = useCallback(() => {
    application.navigateToApp('discover', {
      path: getSavedSearchUrl(savedSearch.id),
    });
  }, [application, savedSearch.id]);

  const linkButtonAriaLabel = i18n.translate(
    'visDefaultEditor.sidebar.savedSearch.linkButtonAriaLabel',
    {
      defaultMessage: 'Link to Discover session. Click to learn more or break link.',
    }
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      className="visEditorSidebar__titleContainer visEditorSidebar__linkedSearch"
      gutterSize="xs"
      responsive={false}
      css={[styles.titleContainer, styles.linkedSearch]}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="search" />
      </EuiFlexItem>

      <EuiFlexItem grow={false} className="eui-textTruncate">
        <EuiTitle size="xs" className="eui-textTruncate">
          <h2
            title={i18n.translate('visDefaultEditor.sidebar.savedSearch.titleAriaLabel', {
              defaultMessage: 'Discover session: {title}',
              values: {
                title: savedSearch.title,
              },
            })}
          >
            {savedSearch.title}
          </h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          button={
            <EuiToolTip content={linkButtonAriaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={linkButtonAriaLabel}
                data-test-subj="showUnlinkSavedSearchPopover"
                iconType="link"
                onClick={onClickButtonLink}
              />
            </EuiToolTip>
          }
          isOpen={showPopover}
          closePopover={closePopover}
          panelPaddingSize="s"
        >
          <EuiPopoverTitle>
            <FormattedMessage
              id="visDefaultEditor.sidebar.savedSearch.popoverTitle"
              defaultMessage="Linked to Discover session"
            />
          </EuiPopoverTitle>
          <div css={{ width: 260 }}>
            <EuiText size="s">
              <p>
                <EuiButtonEmpty
                  data-test-subj="viewSavedSearch"
                  flush="left"
                  onClick={onClickViewInDiscover}
                  size="xs"
                >
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.savedSearch.goToDiscoverButtonText"
                    defaultMessage="View this session in Discover"
                  />
                </EuiButtonEmpty>
              </p>
              <p>
                <FormattedMessage
                  id="visDefaultEditor.sidebar.savedSearch.popoverHelpText"
                  defaultMessage="Subsequent modifications to this Discover session are reflected in the visualization. To disable automatic updates, remove the link."
                />
              </p>
              <p>
                <EuiButton
                  color="danger"
                  data-test-subj="unlinkSavedSearch"
                  fullWidth
                  onClick={onClickUnlikFromSavedSearch}
                  size="s"
                >
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.savedSearch.unlinkSavedSearchButtonText"
                    defaultMessage="Remove link to Discover session"
                  />
                </EuiButton>
              </p>
            </EuiText>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SidebarTitle({ savedSearch, vis, isLinkedSearch, eventEmitter }: SidebarTitleProps) {
  const styles = useMemoCss(sideBarTitleStyles);
  return isLinkedSearch && savedSearch ? (
    <LinkedSearch savedSearch={savedSearch} eventEmitter={eventEmitter} />
  ) : vis.type.options.showIndexSelection ? (
    <EuiTitle
      size="xs"
      className="visEditorSidebar__titleContainer eui-textTruncate"
      css={styles.titleContainer}
    >
      <h2
        title={i18n.translate('visDefaultEditor.sidebar.indexPatternAriaLabel', {
          defaultMessage: 'Index pattern: {title}',
          values: {
            title: vis.data?.indexPattern?.getName(),
          },
        })}
      >
        {vis.data?.indexPattern?.getName()}
      </h2>
    </EuiTitle>
  ) : (
    <div
      className="visEditorSidebar__indexPatternPlaceholder"
      css={styles.indexPatternPlaceholder}
    />
  );
}

export { SidebarTitle };
