import { RawDatum, DataLineage } from '../types';
import { nowIso } from '../utils';

/**
 * Data lineage tracker: attach simple lineage metadata to each datum.
 * For production, record transforms in DB and provide lineage graph.
 */

export class LineageService {
  attach(datum: RawDatum, transformation?: string): RawDatum {
    const lineage: DataLineage = {
      source: datum.source,
      receivedAt: nowIso(),
      originalId: datum.id,
      transformations: transformation ? [transformation] : [],
    };
    return { ...datum, lineage };
  }

  addTransform(datum: RawDatum, transformation: string): RawDatum {
    const copy = { ...datum };
    copy.lineage = copy.lineage ?? { source: datum.source, receivedAt: nowIso(), transformations: [] };
    copy.lineage.transformations = copy.lineage.transformations ?? [];
    copy.lineage.transformations.push(transformation);
    return copy;
  }
}
