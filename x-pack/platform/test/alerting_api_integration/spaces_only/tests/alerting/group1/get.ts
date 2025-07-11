/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Agent as SuperTestAgent } from 'supertest';
import { Spaces } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const getTestUtils = (
  describeType: 'internal' | 'public',
  objectRemover: ObjectRemover,
  supertest: SuperTestAgent
) => {
  describe(describeType, () => {
    afterEach(() => objectRemover.removeAll());
    describe('handle get alert request', function () {
      this.tags('skipFIPS');
      it('should handle get alert request appropriately', async () => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData())
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/${createdAlert.id}`
        );

        expect(response.status).to.eql(200);
        expect(response.body).to.eql({
          id: createdAlert.id,
          name: 'abc',
          tags: ['foo'],
          rule_type_id: 'test.noop',
          revision: 0,
          running: false,
          consumer: 'alertsFixture',
          schedule: { interval: '1m' },
          enabled: true,
          actions: [],
          params: {},
          created_by: null,
          scheduled_task_id: response.body.scheduled_task_id,
          updated_by: null,
          api_key_owner: null,
          ...(describeType === 'internal'
            ? {
                artifacts: {
                  dashboards: [],
                  investigation_guide: { blob: '' },
                },
              }
            : {}),
          api_key_created_by_user: null,
          throttle: '1m',
          notify_when: 'onThrottleInterval',
          mute_all: false,
          muted_alert_ids: [],
          created_at: response.body.created_at,
          updated_at: response.body.updated_at,
          execution_status: response.body.execution_status,
          ...(response.body.next_run ? { next_run: response.body.next_run } : {}),
          ...(response.body.last_run ? { last_run: response.body.last_run } : {}),
          ...(describeType === 'internal'
            ? {
                monitoring: response.body.monitoring,
                snooze_schedule: response.body.snooze_schedule,
                is_snoozed_until: response.body.is_snoozed_until,
              }
            : {}),
        });
        expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
        expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
        if (response.body.next_run) {
          expect(Date.parse(response.body.next_run)).to.be.greaterThan(0);
        }
      });
    });

    it(`shouldn't find alert from another space`, async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData())
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      await supertest
        .get(
          `${getUrlPrefix(Spaces.other.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/${createdAlert.id}`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
    });

    it(`should handle get alert request appropriately when alert doesn't exist`, async () => {
      await supertest
        .get(
          `${getUrlPrefix(Spaces.space1.id)}/${
            describeType === 'public' ? 'api' : 'internal'
          }/alerting/rule/1`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });
  });

  describe('Artifacts', () => {
    it('should return the artifacts correctly', async () => {
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            enabled: true,
            ...(describeType === 'internal'
              ? {
                  artifacts: {
                    dashboards: [
                      {
                        id: 'dashboard-1',
                      },
                      {
                        id: 'dashboard-2',
                      },
                    ],
                    investigation_guide: {
                      blob: '# Summary',
                    },
                  },
                }
              : {}),
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/${
          describeType === 'public' ? 'api' : 'internal'
        }/alerting/rule/${createdAlert.id}`
      );

      if (describeType === 'public') {
        expect(response.body.artifacts).to.be(undefined);
      } else if (describeType === 'internal') {
        expect(response.body.artifacts).to.eql({
          dashboards: [
            {
              id: 'dashboard-1',
            },
            {
              id: 'dashboard-2',
            },
          ],
          investigation_guide: {
            blob: '# Summary',
          },
        });
      }
    });
  });
};

export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);
    afterEach(() => objectRemover.removeAll());

    getTestUtils('public', objectRemover, supertest);
    getTestUtils('internal', objectRemover, supertest);
  });
}
