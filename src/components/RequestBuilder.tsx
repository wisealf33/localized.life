"use client";

import { useMemo, useState } from "react";
import {
  Baby,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Check,
  CookingPot,
  DotsThreeCircle,
  Hammer,
  Heart,
  HouseLine,
  Info,
  Leaf,
  MapPin,
  Minus,
  Package,
  PawPrint,
  Plus,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import {
  broadRequestTypes,
  cadenceFrequencyOptions,
  createEmptyRequestDraft,
  generateRequestContent,
  getBroadType,
  getRequestCategory,
  homeHelpCategories,
  isQuestionVisible,
  requestTimingLabel,
  timeWindowOptions,
  validateRequestDraft,
  weekdayOptions,
  type RequestAnswer,
  type RequestBroadTypeId,
  type RequestDraft,
  type RequestQuestion,
} from "@/lib/requestSystem";

const broadIcons = {
  meals: CookingPot,
  home_help: HouseLine,
  items: Package,
  information: Info,
  other_request: DotsThreeCircle,
} as const;

const categoryIcons: Record<string, typeof Sparkle> = {
  cleaning: Sparkle,
  handyman_home_repair: Hammer,
  childcare: Baby,
  pet_care: PawPrint,
  yard_work: Leaf,
  elderly_care: Heart,
  household_helping_hands: UsersThree,
  other_home_help: DotsThreeCircle,
};

const steps = ["Type", "Details", "Timing", "Review"] as const;

type Props = {
  initialDraft?: RequestDraft;
  initialStep?: 0 | 1 | 2 | 3;
  busy?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (draft: RequestDraft) => Promise<void>;
};

function SelectionButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button className={active ? "request-choice active" : "request-choice"} type="button" aria-pressed={active} onClick={onClick}>
      {children}
      {active ? <Check className="request-choice-check" weight="bold" aria-hidden="true" /> : null}
    </button>
  );
}

function OptionField({ question, value, onChange }: { question: RequestQuestion; value: RequestAnswer | undefined; onChange: (value: RequestAnswer) => void }) {
  if (question.kind === "quantity") {
    const minimum = question.min ?? 0;
    const maximum = question.max ?? 99;
    const count = typeof value === "number" ? value : minimum;
    return (
      <div className="request-quantity" role="group" aria-label={question.label}>
        <button type="button" aria-label={`Decrease ${question.label.toLowerCase()}`} disabled={count <= minimum} onClick={() => onChange(Math.max(minimum, count - 1))}><Minus weight="bold" /></button>
        <output aria-live="polite">{count}</output>
        <button type="button" aria-label={`Increase ${question.label.toLowerCase()}`} disabled={count >= maximum} onClick={() => onChange(Math.min(maximum, count + 1))}><Plus weight="bold" /></button>
      </div>
    );
  }

  if (question.kind === "text") {
    return <input className="request-short-input" value={typeof value === "string" ? value : ""} placeholder={question.placeholder} onChange={(event) => onChange(event.target.value)} />;
  }

  if (question.kind === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="request-checkbox-grid">
        {question.options?.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label className={checked ? "request-checkbox active" : "request-checkbox"} key={option.value}>
              <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((entry) => entry !== option.value) : [...selected, option.value])} />
              <span aria-hidden="true">{checked ? <Check weight="bold" /> : null}</span>
              {option.label}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="request-option-grid">
      {question.options?.map((option) => (
        <SelectionButton active={value === option.value} key={option.value} onClick={() => onChange(option.value)}>{option.label}</SelectionButton>
      ))}
    </div>
  );
}

export function RequestBuilder({ initialDraft, initialStep = 0, busy = false, submitLabel = "Submit request for review", onCancel, onSubmit }: Props) {
  const [draft, setDraft] = useState<RequestDraft>(() => initialDraft || createEmptyRequestDraft());
  const [step, setStep] = useState<number>(initialStep);
  const [errors, setErrors] = useState<string[]>([]);
  const category = getRequestCategory(draft.categoryId);
  const broadType = getBroadType(draft.broadType);
  const generated = useMemo(() => generateRequestContent(draft), [draft]);

  function chooseBroadType(broadTypeId: RequestBroadTypeId) {
    const directCategory = broadTypeId === "home_help" ? null : getRequestCategory(broadTypeId);
    setDraft((current) => ({
      ...createEmptyRequestDraft({ broadType: broadTypeId, categoryId: directCategory?.id, city: current.city, state: current.state }),
      broadType: broadTypeId,
    }));
    setErrors([]);
  }

  function chooseCategory(categoryId: string) {
    const nextCategory = getRequestCategory(categoryId);
    if (!nextCategory) return;
    setDraft((current) => ({
      ...createEmptyRequestDraft({ broadType: nextCategory.broadType, categoryId, city: current.city, state: current.state }),
      broadType: nextCategory.broadType,
      categoryId: nextCategory.id,
    }));
    setErrors([]);
  }

  function updateAnswer(field: string, value: RequestAnswer) {
    setDraft((current) => {
      const nextAnswers = { ...current.answers, [field]: value };
      const currentCategory = getRequestCategory(current.categoryId);
      for (const question of currentCategory?.questions || []) {
        if (!isQuestionVisible(question, nextAnswers)) delete nextAnswers[question.id];
      }
      return { ...current, answers: nextAnswers };
    });
    setErrors([]);
  }

  function toggleList(field: "timeWindows" | "cadenceDays" | "cadenceTimeWindows", value: string) {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value) ? current[field].filter((entry) => entry !== value) : [...current[field], value],
    }));
    setErrors([]);
  }

  function continueForward() {
    const through = step === 0 ? "type" : step === 1 ? "details" : "timing";
    const nextErrors = validateRequestDraft(draft, through);
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit() {
    const nextErrors = validateRequestDraft(draft, "all");
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    await onSubmit(draft);
  }

  const showLocation = draft.categoryId === "information"
    ? draft.answers.locationSpecific === "yes"
    : draft.categoryId === "other_request"
      ? draft.answers.locationRelevant === "yes"
      : true;
  const singleService = category?.isService && draft.serviceIntent !== "ongoing";

  return (
    <div className="request-builder">
      <ol className="request-stepper" aria-label="Request progress">
        {steps.map((label, index) => (
          <li className={index === step ? "active" : index < step ? "complete" : ""} key={label}>
            <button type="button" disabled={index > step} onClick={() => index <= step && setStep(index)} aria-current={index === step ? "step" : undefined}>
              <span>{index < step ? <Check weight="bold" /> : index + 1}</span>{label}
            </button>
          </li>
        ))}
      </ol>

      {errors.length ? <div className="notice bad request-errors" role="alert"><strong>Please check this step.</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}

      {step === 0 ? (
        <div className="request-builder-step">
          <div className="request-step-heading"><h3>What do you need?</h3><p>Choose one kind of request. Separate needs can be added as separate requests.</p></div>
          <div className="request-broad-grid">
            {broadRequestTypes.map((entry) => {
              const Icon = broadIcons[entry.id];
              return <SelectionButton active={draft.broadType === entry.id} key={entry.id} onClick={() => chooseBroadType(entry.id)}><Icon weight="duotone" /><span><strong>{entry.label}</strong><small>{entry.helper}</small></span></SelectionButton>;
            })}
          </div>
          {draft.broadType === "home_help" ? (
            <div className="request-category-section">
              <h4>What kind of home help?</h4>
              <div className="request-category-grid">
                {homeHelpCategories.map((entry) => {
                  const Icon = categoryIcons[entry.id] || DotsThreeCircle;
                  return <SelectionButton active={draft.categoryId === entry.id} key={entry.id} onClick={() => chooseCategory(entry.id)}><Icon weight="duotone" />{entry.label}</SelectionButton>;
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 1 && category ? (
        <div className="request-builder-step">
          <div className="request-step-heading"><h3>{category.label} details</h3><p>Only the questions that help someone understand this request are shown.</p></div>
          <div className="request-question-layout">
            {category.questions.filter((question) => isQuestionVisible(question, draft.answers)).map((question) => (
              <fieldset className={`request-question request-question-${question.kind}`} key={question.id}>
                <legend>{question.label}{question.helper ? <small>{question.helper}</small> : null}</legend>
                <OptionField question={question} value={draft.answers[question.id]} onChange={(value) => updateAnswer(question.id, value)} />
              </fieldset>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 && category ? (
        <div className="request-builder-step">
          <div className="request-step-heading"><h3>Timing and location</h3><p>Share the arrangement you are hoping for. Nothing is scheduled when this request is submitted.</p></div>
          {category.isService ? (
            <fieldset className="request-question request-intent-question">
              <legend>What kind of help are you looking for?</legend>
              <div className="request-option-grid request-intent-grid">
                <SelectionButton active={draft.serviceIntent === "one_time"} onClick={() => setDraft((current) => ({ ...current, serviceIntent: "one_time", cadenceFrequency: "", cadenceDays: [], cadenceTimeWindows: [], desiredStartPeriod: "", scheduleFlexibility: "" }))}><CalendarBlank weight="duotone" />One-time help</SelectionButton>
                <SelectionButton active={draft.serviceIntent === "ongoing"} onClick={() => setDraft((current) => ({ ...current, serviceIntent: "ongoing", timingPreference: "flexible", requestedDate: "", requestedDateEnd: "", timeWindows: [] }))}><UsersThree weight="duotone" />Looking for ongoing help</SelectionButton>
              </div>
              {draft.serviceIntent === "ongoing" ? <p className="request-intent-note">This describes the ongoing help you are looking for. The first service allows both people to determine whether the arrangement is a good fit.</p> : null}
            </fieldset>
          ) : null}

          {draft.serviceIntent === "ongoing" ? (
            <div className="request-timing-grid">
              <label>Desired frequency<select value={draft.cadenceFrequency} onChange={(event) => setDraft((current) => ({ ...current, cadenceFrequency: event.target.value }))}><option value="">Choose frequency</option>{cadenceFrequencyOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              <fieldset className="request-question request-days-question"><legend>Preferred days</legend><div className="request-compact-options">{weekdayOptions.map((option) => <button className={draft.cadenceDays.includes(option.value) ? "active" : ""} type="button" aria-pressed={draft.cadenceDays.includes(option.value)} key={option.value} onClick={() => toggleList("cadenceDays", option.value)}>{option.label}</button>)}</div></fieldset>
              <fieldset className="request-question request-time-question"><legend>Preferred time windows</legend><div className="request-option-grid">{timeWindowOptions.map((option) => <SelectionButton active={draft.cadenceTimeWindows.includes(option.value)} key={option.value} onClick={() => toggleList("cadenceTimeWindows", option.value)}>{option.label}</SelectionButton>)}</div></fieldset>
              <label>Desired start period<select value={draft.desiredStartPeriod} onChange={(event) => setDraft((current) => ({ ...current, desiredStartPeriod: event.target.value }))}><option value="">Choose a start period</option><option value="as_soon_as_possible">As soon as possible</option><option value="within_two_weeks">Within two weeks</option><option value="within_month">Within a month</option><option value="flexible">Flexible</option></select></label>
              <label>Schedule flexibility<select value={draft.scheduleFlexibility} onChange={(event) => setDraft((current) => ({ ...current, scheduleFlexibility: event.target.value }))}><option value="">Choose flexibility</option><option value="fixed">Prefer consistent days and times</option><option value="somewhat_flexible">Somewhat flexible</option><option value="very_flexible">Very flexible</option></select></label>
            </div>
          ) : (
            <div className="request-timing-grid">
              <fieldset className="request-question request-timing-preference"><legend>When do you need this?</legend><div className="request-option-grid">{[
                { value: "specific_date", label: "Specific date" }, { value: "date_range", label: "Date range" },
                { value: "within_week", label: "Within a week" }, { value: "as_soon_as_possible", label: "As soon as possible" }, { value: "flexible", label: "Flexible" },
              ].map((option) => <SelectionButton active={draft.timingPreference === option.value} key={option.value} onClick={() => setDraft((current) => ({ ...current, timingPreference: option.value as RequestDraft["timingPreference"], requestedDateEnd: option.value === "date_range" ? current.requestedDateEnd : "" }))}>{option.label}</SelectionButton>)}</div></fieldset>
              {draft.timingPreference === "specific_date" || draft.timingPreference === "date_range" ? <label>Start date<input type="date" value={draft.requestedDate} onChange={(event) => setDraft((current) => ({ ...current, requestedDate: event.target.value }))} /></label> : null}
              {draft.timingPreference === "date_range" ? <label>End date<input type="date" value={draft.requestedDateEnd} min={draft.requestedDate || undefined} onChange={(event) => setDraft((current) => ({ ...current, requestedDateEnd: event.target.value }))} /></label> : null}
              {singleService || !category.isService ? <fieldset className="request-question request-time-question"><legend>Preferred time window</legend><div className="request-option-grid">{timeWindowOptions.map((option) => <SelectionButton active={draft.timeWindows.includes(option.value)} key={option.value} onClick={() => toggleList("timeWindows", option.value)}>{option.label}</SelectionButton>)}</div></fieldset> : null}
            </div>
          )}

          {showLocation ? <div className="request-location-grid"><label>Town or city<input value={draft.city} autoComplete="address-level2" onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} /></label><label>State<input value={draft.state} maxLength={2} autoComplete="address-level1" onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value.toUpperCase() }))} /></label></div> : <p className="request-location-note"><MapPin weight="duotone" /> This request is not location-specific.</p>}
          <label className="request-additional-details">Anything else someone should know? <span>Optional</span><textarea rows={2} value={draft.additionalDetails} maxLength={1200} placeholder="Add a brief note only if the choices above did not cover something important." onChange={(event) => setDraft((current) => ({ ...current, additionalDetails: event.target.value }))} /></label>
        </div>
      ) : null}

      {step === 3 && category && broadType ? (
        <div className="request-builder-step request-review-step">
          <div className="request-step-heading"><h3>Review your request</h3><p>Make sure this describes what you need before sending it for review.</p></div>
          {draft.serviceIntent === "ongoing" ? <p className="request-intent-note">This describes the ongoing help you are looking for. The first service allows both people to determine whether the arrangement is a good fit.</p> : null}
          <div className="request-review-rows">
            <div><HouseLine weight="duotone" /><span><strong>{broadType.label === category.label ? category.label : `${broadType.label} · ${category.label}`}</strong><small>Request category</small></span></div>
            <div><UsersThree weight="duotone" /><span><strong>{draft.serviceIntent === "ongoing" ? "Looking for ongoing help" : category.isService ? "One-time help" : "Single request"}</strong><small>Type of help</small></span></div>
            <div><CalendarBlank weight="duotone" /><span><strong>{requestTimingLabel(draft)}</strong><small>Timing</small></span></div>
            <div><MapPin weight="duotone" /><span><strong>{showLocation ? [draft.city, draft.state].filter(Boolean).join(", ") : "Not location-specific"}</strong><small>Location</small></span></div>
          </div>
          <div className="request-generated-summary"><span>Generated request</span><h4>{generated.title}</h4><p>{generated.summary}</p></div>
        </div>
      ) : null}

      <div className="request-builder-actions">
        <button className="button compact-button" type="button" onClick={step === 0 ? onCancel : () => { setErrors([]); setStep((current) => Math.max(0, current - 1)); }}><CaretLeft /> {step === 0 ? "Cancel" : "Back"}</button>
        {step < 3 ? <button className="button primary" type="button" onClick={continueForward}>Continue <CaretRight /></button> : <button className="button primary" type="button" disabled={busy} onClick={() => void submit()}>{busy ? "Saving…" : submitLabel}</button>}
      </div>
    </div>
  );
}
