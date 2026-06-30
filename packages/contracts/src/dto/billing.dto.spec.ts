import { describe, expect, it } from "vitest";
import { hourlyRateScopeSchema, listHourlyRatesQuerySchema } from "./billing.dto";

describe("listHourlyRatesQuerySchema", () => {
  it("accepts scope filter values", () => {
    for (const scope of hourlyRateScopeSchema.options) {
      expect(listHourlyRatesQuerySchema.parse({ page: 1, limit: 25, scope })).toEqual({
        page: 1,
        limit: 25,
        scope
      });
    }
  });
});
