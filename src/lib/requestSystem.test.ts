import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyRequestDraft,
  getRequestCategory,
  homeHelpCategories,
  isQuestionVisible,
  parseRequestDraft,
  recordTimingLabel,
  requestCategories,
  requestDatabasePayload,
  requestDisplayStatus,
  requestDraftFromRecord,
  requestNextStep,
  requestTimingLabel,
  validateRequestDraft,
  type RequestAnswer,
  type RequestCategoryId,
  type RequestDraft,
  type StructuredRequestRecord,
} from "./requestSystem.ts";

function completeDraft(categoryId: RequestCategoryId, intent: "one_time" | "ongoing" = "one_time") {
  const category = getRequestCategory(categoryId)!;
  const draft: RequestDraft = {
    ...createEmptyRequestDraft({ broadType: category.broadType, categoryId, city: "Peotone", state: "IL" }),
    serviceIntent: category.isService ? intent : null,
  };
  for (let pass = 0; pass < 5; pass += 1) {
    for (const question of category.questions) {
      if (!isQuestionVisible(question, draft.answers) || !question.required || draft.answers[question.id] !== undefined) continue;
      let answer: RequestAnswer;
      if (question.kind === "multi") answer = [question.options![0].value];
      else if (question.kind === "single") answer = question.options![0].value;
      else if (question.kind === "quantity") answer = question.min ?? 1;
      else answer = "A brief answer";
      draft.answers[question.id] = answer;
    }
  }
  if (intent === "ongoing" && category.isService) {
    draft.cadenceFrequency = "every_other_week";
    draft.cadenceDays = ["tuesday"];
    draft.cadenceTimeWindows = ["morning"];
    draft.desiredStartPeriod = "within_two_weeks";
    draft.scheduleFlexibility = "somewhat_flexible";
  }
  return draft;
}

function recordFromDraft(draft: RequestDraft): StructuredRequestRecord {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    post_type: "request",
    owner_state: "active",
    status: "pending",
    admin_notes: null,
    created_at: "2026-08-22T12:00:00Z",
    updated_at: "2026-08-22T12:00:00Z",
    ...requestDatabasePayload(draft),
  };
}

test("category registry has stable, unique IDs and every requested home-help category", () => {
  assert.equal(requestCategories.length, 12);
  assert.equal(new Set(requestCategories.map((category) => category.id)).size, requestCategories.length);
  assert.deepEqual(homeHelpCategories.map((category) => category.id), [
    "cleaning", "handyman_home_repair", "childcare", "pet_care", "yard_work", "elderly_care", "household_helping_hands", "other_home_help",
  ]);
});

test("every supported category validates, serializes, and restores for editing", () => {
  for (const category of requestCategories) {
    const draft = completeDraft(category.id as RequestCategoryId);
    assert.deepEqual(validateRequestDraft(draft), [], category.id);
    const parsed = parseRequestDraft(draft);
    const payload = requestDatabasePayload(parsed);
    assert.equal(payload.request_category_id, category.id);
    assert.ok(payload.title.length > 0);
    assert.ok(payload.generated_summary.length > 0);
    const restored = requestDraftFromRecord(recordFromDraft(parsed));
    assert.ok(restored, category.id);
    assert.equal(restored!.categoryId, category.id);
    assert.deepEqual(restored!.answers, parsed.answers);
  }
});

test("cleaning conditional branches require only the answers they reveal", () => {
  const selectedAreas = completeDraft("cleaning");
  selectedAreas.answers.cleaningScope = "selected_areas";
  delete selectedAreas.answers.areas;
  assert.ok(validateRequestDraft(selectedAreas, "details").some((error) => error.includes("Which areas")));
  selectedAreas.answers.areas = ["kitchen"];
  assert.deepEqual(validateRequestDraft(selectedAreas, "details"), []);

  const specific = completeDraft("cleaning");
  specific.answers = { cleaningType: "specific_task", specificTask: "other", suppliesAvailable: "yes", petsInHome: "no" };
  assert.ok(validateRequestDraft(specific, "details").some((error) => error.includes("specific task")));
  specific.answers.otherSpecificTask = "Clean the pantry shelves";
  assert.deepEqual(validateRequestDraft(specific, "details"), []);
});

test("ongoing intent stores desired cadence without creating recurring appointments", () => {
  const draft = completeDraft("cleaning", "ongoing");
  const payload = requestDatabasePayload(parseRequestDraft(draft));
  assert.equal(payload.service_intent, "ongoing");
  assert.equal(payload.cadence_frequency, "every_other_week");
  assert.deepEqual(payload.cadence_days, ["tuesday"]);
  assert.equal(payload.requested_date, null);
  assert.equal(payload.workflow_status, "finding_right_person");
  assert.match(recordTimingLabel(recordFromDraft(draft)), /Every other week/);
});

test("one-time requests preserve preferred time windows and quantity controls start with a real value", () => {
  const meal = completeDraft("meals");
  meal.timingPreference = "within_week";
  meal.timeWindows = ["evening"];
  assert.equal(meal.answers.peopleCount, 1);
  assert.equal(requestTimingLabel(meal), "Within a week · Evening");
});

test("dashboard status and next-step labels combine moderation and workflow state", () => {
  const record = recordFromDraft(completeDraft("meals"));
  assert.equal(requestDisplayStatus(record), "In review");
  assert.equal(requestNextStep(record), "Waiting for review");
  const approved = { ...record, status: "approved" as const, workflow_status: "waiting_compatibility_decision" as const };
  assert.equal(requestDisplayStatus(approved), "Waiting for compatibility decision");
  assert.equal(requestNextStep(approved), "Decide whether the fit is right");
});

test("legacy generic requests remain readable without pretending they are structured", () => {
  const legacy: StructuredRequestRecord = {
    ...recordFromDraft(completeDraft("items")),
    title: "Help assembling shelves",
    category: "Furniture assembly",
    description: "Looking for help assembling two shelving units.",
    request_schema_version: null,
    request_broad_type: null,
    request_category_id: null,
    request_subcategory_id: null,
    generated_summary: null,
    service_intent: null,
    timing_preference: null,
    requested_date: null,
    requested_date_end: null,
    request_status: null,
    workflow_status: null,
  };
  assert.equal(requestDraftFromRecord(legacy), null);
  assert.equal(recordTimingLabel(legacy), "Timing not structured");
});
