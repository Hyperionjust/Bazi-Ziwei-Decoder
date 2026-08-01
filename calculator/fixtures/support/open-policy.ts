import * as fs from 'fs';
import * as path from 'path';
import { enrichBazi } from '../../bazi-enrich/enrich';
import { judgeWangShuai } from '../../bazi-enrich/wang-shuai';
import { adjudicateInteractions, assertInteractionPolicy, InteractionPolicy } from '../../bazi-enrich/interactions';

const lineages = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'lineages.json'), 'utf-8'));

export const OPEN_INTERACTION_POLICY: InteractionPolicy = assertInteractionPolicy(
  lineages?.lineages?.open?.interaction_policy,
  'fixtures.open.interaction_policy',
);

export function adjudicateOpen(siZhu: any) {
  return adjudicateInteractions(siZhu, OPEN_INTERACTION_POLICY);
}

export function enrichOpen(siZhu: any) {
  return enrichBazi(siZhu, { interactionPolicy: OPEN_INTERACTION_POLICY });
}

export function judgeOpen(siZhu: any) {
  return judgeWangShuai(siZhu, { interactions: adjudicateOpen(siZhu).items });
}
