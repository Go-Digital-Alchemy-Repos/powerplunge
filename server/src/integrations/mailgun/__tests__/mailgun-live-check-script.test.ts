import { describe, expect, it } from "vitest";

import {
  classifyMailgunEvents,
  parseArgs,
  shouldPollMailgunEvents,
} from "../../../../../scripts/mailgun-live-check";

describe("mailgun-live-check options", () => {
  it("supports no-delivery Mailgun probes and event polling", () => {
    expect(
      parseArgs([
        "--send-to",
        "review@example.com",
        "--test-mode",
        "--poll-events",
        "--poll-timeout-ms",
        "15000",
      ]),
    ).toMatchObject({
      sendTo: "review@example.com",
      testMode: true,
      pollEvents: true,
      pollTimeoutMs: 15000,
    });
  });

  it("only polls events for an actual send probe", () => {
    expect(shouldPollMailgunEvents({ sendTo: null, pollEvents: true })).toBe(false);
    expect(shouldPollMailgunEvents({ sendTo: "review@example.com", pollEvents: true })).toBe(true);
  });
});

describe("classifyMailgunEvents", () => {
  it("passes when a tagged probe is accepted", () => {
    expect(classifyMailgunEvents([{ event: "accepted" }])).toEqual({
      status: "pass",
      detail: "Mailgun reported accepted for the tagged probe.",
    });
  });

  it("requires delivery when acceptance is not enough for the probe", () => {
    expect(classifyMailgunEvents([{ event: "accepted" }], { successEvents: ["delivered"] })).toEqual({
      status: "fail",
      detail: "Mailgun reported accepted, but no delivered event appeared before the polling timeout.",
    });
  });

  it("passes when a tagged real-send probe is delivered", () => {
    expect(classifyMailgunEvents([{ event: "accepted" }, { event: "delivered" }], { successEvents: ["delivered"] })).toEqual({
      status: "pass",
      detail: "Mailgun reported delivered for the tagged probe.",
    });
  });

  it("fails when Mailgun reports a delivery failure", () => {
    expect(classifyMailgunEvents([{ event: "accepted" }, { event: "failed" }])).toEqual({
      status: "fail",
      detail: "Mailgun reported failed for the tagged probe.",
    });
  });

  it("fails when no event appears before the polling timeout", () => {
    expect(classifyMailgunEvents([])).toEqual({
      status: "fail",
      detail: "No Mailgun delivered/accepted/failed event appeared before the polling timeout.",
    });
  });

  it("can downgrade event timeout for Mailgun test-mode probes", () => {
    expect(classifyMailgunEvents([], { emptyStatus: "warn" })).toEqual({
      status: "warn",
      detail: "No Mailgun delivered/accepted/failed event appeared before the polling timeout.",
    });
  });
});
