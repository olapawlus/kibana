/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METADATA_FIELDS } from '@kbn/esql-ast';
import * as helpers from '../helpers';

export const validationFromCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('FROM <sources> [ METADATA <indices> ]', () => {
        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('f', [
            "SyntaxError: mismatched input 'f' expecting {'row', 'from', 'show'}",
          ]);
          await expectErrors('from ', [
            "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
          ]);
        });

        describe('... <sources> ...', () => {
          test('no errors on correct indices usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index', []);
            await expectErrors('FROM index', []);
            await expectErrors('FROM "index"', []);
            await expectErrors('FROM """index"""', []);
            await expectErrors('FrOm index', []);
            await expectErrors('from index, other_index', []);
            await expectErrors('from index, other_index,.secret_index', []);
            await expectErrors('from .secret_index', []);
            await expectErrors('from .secret_index', []);
            await expectErrors('from .secret_index', []);
            await expectErrors('from ind*, other*', []);
            await expectErrors('from index*', []);
            await expectErrors('FROM *a_i*dex*', []);
            await expectErrors('FROM in*ex*', []);
            await expectErrors('FROM *n*ex', []);
            await expectErrors('FROM *n*ex*', []);
            await expectErrors('FROM i*d*x*', []);
            await expectErrors('FROM i*d*x', []);
            await expectErrors('FROM i***x*', []);
            await expectErrors('FROM i****', []);
            await expectErrors('FROM i**', []);
            await expectErrors('fRoM index**', []);
            await expectErrors('fRoM *ex', []);
            await expectErrors('fRoM *ex*', []);
            await expectErrors('fRoM in*ex', []);
            await expectErrors('fRoM ind*ex', []);
            await expectErrors('fRoM *,-.*', []);
            await expectErrors('fRoM .secret_index', []);
            await expectErrors('from my-index', []);

            await expectErrors('FROM index, missingIndex*', []);
            await expectErrors('FROM index, lol*catz', []);
            await expectErrors('FROM index*, lol*catz', []);
            await expectErrors('FROM missingIndex*, index', []);
            await expectErrors('FROM missingIndex*, missingIndex2*, index', []);
          });

          test('errors on trailing comma', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index,', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);
            await expectErrors(`FROM index\n, \tother_index\t,\n \t `, [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, UNQUOTED_SOURCE}",
            ]);

            await expectErrors(`from assignment = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
              'Unknown index [assignment]',
            ]);
          });

          test('errors on invalid syntax', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM `index`', ['Unknown index [`index`]']);
            await expectErrors(`from assignment = 1`, [
              "SyntaxError: mismatched input '=' expecting <EOF>",
              'Unknown index [assignment]',
            ]);
          });

          test('errors on unknown index', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`FROM index, missingIndex`, ['Unknown index [missingIndex]']);
            await expectErrors(`from average()`, ['Unknown index [average()]']);
            await expectErrors(`fRom custom_function()`, ['Unknown index [custom_function()]']);
            await expectErrors(`FROM indexes*`, ['Unknown index [indexes*]']);
            await expectErrors('from numberField', ['Unknown index [numberField]']);
            await expectErrors('FROM policy', ['Unknown index [policy]']);

            await expectErrors('FROM index, missingIndex', ['Unknown index [missingIndex]']);
            await expectErrors('FROM missingIndex, index', ['Unknown index [missingIndex]']);
            await expectErrors('FROM *missingIndex, missingIndex2, index', [
              'Unknown index [missingIndex2]',
            ]);
            await expectErrors('FROM missingIndex*', ['Unknown index [missingIndex*]']);
            await expectErrors('FROM *missingIndex, missing*Index2', [
              'Unknown index [*missingIndex]',
              'Unknown index [missing*Index2]',
            ]);
          });
        });

        describe('... METADATA <indices>', () => {
          test('no errors on correct METADATA ... usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from index metadata _id', []);
            await expectErrors('from index metadata _id, \t\n _index\n ', []);
          });

          test('errors when wrapped in parentheses', async () => {
            const { expectErrors } = await setup();

            await expectErrors(`from index (metadata _id)`, [
              "SyntaxError: mismatched input '(metadata' expecting <EOF>",
            ]);
          });

          describe('validates fields', () => {
            test('validates fields', async () => {
              const { expectErrors } = await setup();

              await expectErrors(`from index METADATA _id, _source2`, [
                `Metadata field [_source2] is not available. Available metadata fields are: [${METADATA_FIELDS.join(
                  ', '
                )}]`,
              ]);
              await expectErrors(`from index metadata _id, _source METADATA _id2`, [
                "SyntaxError: mismatched input 'METADATA' expecting <EOF>",
              ]);
            });
          });
        });
      });
    });
  });
};
