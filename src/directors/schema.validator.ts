import { RawDatum, ValidationResult } from '../types';

/**
 * Lightweight schema validator.
 * For production, replace with Joi/zod/ajv and precompiled JSON schemas.
 *
 * This example knows about two example feed types:
 *  - price feed: payload { symbol: string, price: number }
 *  - orderbook snapshot: payload { symbol: string, bids: Array<[price, size]>, asks: Array<[price, size]> }
 *
 * Returns ValidationResult: ok + errors array
 */

export class SchemaValidator {
  validate(d: RawDatum): ValidationResult {
    const errors: string[] = [];
    if (!d.source) errors.push('missing source');
    if (!d.timestamp) errors.push('missing timestamp');
    if (!d.payload) errors.push('missing payload');

    // small heuristic: if payload has price -> price feed
    if (d.payload && typeof d.payload === 'object') {
      if ('price' in d.payload) {
        if (typeof d.payload.price !== 'number') errors.push('price must be number');
        if (!d.payload.symbol || typeof d.payload.symbol !== 'string') errors.push('price feed missing symbol');
      } else if ('bids' in d.payload && 'asks' in d.payload) {
        if (!Array.isArray(d.payload.bids) || !Array.isArray(d.payload.asks)) {
          errors.push('orderbook bids/asks must be arrays');
        }
      } // else: allow free-form for now
    }

    return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
  }
}
