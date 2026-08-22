export const REQUEST_SCHEMA_VERSION = 2 as const;

export const broadRequestTypes = [
  { id: "meals", label: "Meals", helper: "Cooking, meal preparation, or a meal exchange" },
  { id: "home_help", label: "Home help", helper: "Practical help in or around the home" },
  { id: "items", label: "Items", helper: "Borrow, receive, buy, rent, or trade an item" },
  { id: "information", label: "Information", helper: "Local information, a recommendation, or a connection" },
  { id: "other_request", label: "Other request", helper: "Something that does not fit the other choices" },
] as const;

export type RequestBroadTypeId = (typeof broadRequestTypes)[number]["id"];
export type ServiceIntent = "one_time" | "ongoing";
export type RequestStatus = "open" | "fulfilled" | "closed" | "cancelled";
export type RequestWorkflowStatus =
  | "finding_right_person"
  | "first_service_scheduled"
  | "waiting_compatibility_decision"
  | "trying_another_provider"
  | "ongoing_relationship_established"
  | "closed"
  | "cancelled";

type Choice = { value: string; label: string };
type VisibilityRule = { field: string; equals?: string | number | boolean; oneOf?: readonly (string | number | boolean)[]; includes?: string };

export type RequestQuestion = {
  id: string;
  label: string;
  helper?: string;
  kind: "single" | "multi" | "quantity" | "text";
  options?: readonly Choice[];
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  showWhen?: VisibilityRule;
};

export type RequestCategoryDefinition = {
  id: string;
  broadType: RequestBroadTypeId;
  label: string;
  shortLabel: string;
  isService: boolean;
  questions: readonly RequestQuestion[];
};

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const cleaningQuestions: readonly RequestQuestion[] = [
  { id: "cleaningType", label: "What kind of cleaning do you need?", kind: "single", required: true, options: [
    { value: "regular", label: "Regular cleaning" },
    { value: "deep", label: "Deep cleaning" },
    { value: "move", label: "Move-in or move-out" },
    { value: "organizing", label: "Help organizing" },
    { value: "specific_task", label: "One specific task" },
  ] },
  { id: "cleaningScope", label: "Whole home or selected areas?", kind: "single", required: true, showWhen: { field: "cleaningType", equals: "regular" }, options: [
    { value: "whole_home", label: "Whole home" }, { value: "selected_areas", label: "Selected areas" },
  ] },
  { id: "areas", label: "Which areas need cleaning?", helper: "Select all that apply", kind: "multi", required: true, showWhen: { field: "cleaningScope", equals: "selected_areas" }, options: [
    { value: "kitchen", label: "Kitchen" }, { value: "main_living_area", label: "Main living area" },
    { value: "bathrooms", label: "Bathrooms" }, { value: "bedrooms", label: "Bedrooms" },
    { value: "laundry_area", label: "Laundry area" }, { value: "other", label: "Other area" },
  ] },
  { id: "otherArea", label: "What other area?", kind: "text", required: true, showWhen: { field: "areas", includes: "other" }, placeholder: "Briefly name the area" },
  { id: "bathrooms", label: "How many bathrooms?", kind: "quantity", min: 0, max: 12, showWhen: { field: "cleaningType", equals: "regular" } },
  { id: "bedrooms", label: "How many bedrooms?", kind: "quantity", min: 0, max: 12, showWhen: { field: "cleaningType", equals: "regular" } },
  { id: "cleaningTasks", label: "Which tasks should be included?", helper: "Select all that apply", kind: "multi", required: true, showWhen: { field: "cleaningType", equals: "regular" }, options: [
    { value: "dusting", label: "Dusting" }, { value: "vacuuming", label: "Vacuuming" },
    { value: "floors", label: "Mopping floors" }, { value: "surfaces", label: "Surface cleaning" },
    { value: "kitchen", label: "Kitchen cleaning" }, { value: "bathrooms", label: "Bathroom cleaning" },
    { value: "linens", label: "Change linens" }, { value: "windows", label: "Inside windows" },
  ] },
  { id: "specificTask", label: "Which specific task?", kind: "single", required: true, showWhen: { field: "cleaningType", equals: "specific_task" }, options: [
    { value: "dishes", label: "Dishes" }, { value: "laundry", label: "Laundry" },
    { value: "floors", label: "Floors" }, { value: "windows", label: "Windows" },
    { value: "refrigerator", label: "Refrigerator" }, { value: "oven", label: "Oven" },
    { value: "bathroom", label: "Bathroom" }, { value: "organization", label: "Organization" },
    { value: "other", label: "Other specific task" },
  ] },
  { id: "otherSpecificTask", label: "What specific task?", kind: "text", required: true, showWhen: { field: "specificTask", equals: "other" }, placeholder: "Briefly describe the task" },
  { id: "suppliesAvailable", label: "Are cleaning supplies available?", kind: "single", required: true, options: yesNo },
  { id: "petsInHome", label: "Are there pets in the home?", kind: "single", required: true, options: yesNo },
];

export const requestCategories: readonly RequestCategoryDefinition[] = [
  { id: "meals", broadType: "meals", label: "Meals", shortLabel: "Meals", isService: true, questions: [
    { id: "mealType", label: "What kind of meal help?", kind: "single", required: true, options: [
      { value: "prepared_meal", label: "Prepared meal" }, { value: "meal_prep_help", label: "Meal prep help" }, { value: "meal_exchange", label: "Meal exchange" },
    ] },
    { id: "peopleCount", label: "How many people?", kind: "quantity", required: true, min: 1, max: 30 },
    { id: "dietaryNeeds", label: "Dietary needs", helper: "Select all that apply", kind: "multi", options: [
      { value: "vegetarian", label: "Vegetarian" }, { value: "gluten_free", label: "Gluten-free" },
      { value: "dairy_free", label: "Dairy-free" }, { value: "vegan", label: "Vegan" },
      { value: "nut_free", label: "Nut-free" }, { value: "none", label: "No dietary restrictions" },
    ] },
    { id: "hasAllergies", label: "Any food allergies?", kind: "single", required: true, options: yesNo },
    { id: "allergyDetails", label: "Tell us about the allergy", kind: "text", required: true, showWhen: { field: "hasAllergies", equals: "yes" }, placeholder: "List the allergy or allergies" },
    { id: "mealFulfillment", label: "Pickup or delivery?", kind: "single", required: true, options: [
      { value: "pickup", label: "Pickup" }, { value: "delivery", label: "Delivery" }, { value: "either", label: "Either works" },
    ] },
  ] },
  { id: "cleaning", broadType: "home_help", label: "Cleaning", shortLabel: "Cleaning", isService: true, questions: cleaningQuestions },
  { id: "handyman_home_repair", broadType: "home_help", label: "Handyman or home repair", shortLabel: "Handyman", isService: true, questions: [
    { id: "projectType", label: "What kind of project?", kind: "single", required: true, options: [
      { value: "repair", label: "Repair" }, { value: "assembly", label: "Assembly" }, { value: "mounting", label: "Mounting" },
      { value: "painting", label: "Painting" }, { value: "installation", label: "Installation" }, { value: "other", label: "Other project" },
    ] },
    { id: "otherProject", label: "What kind of project?", kind: "text", required: true, showWhen: { field: "projectType", equals: "other" }, placeholder: "Briefly name the project" },
    { id: "affectedArea", label: "What area is affected?", kind: "multi", required: true, options: [
      { value: "kitchen", label: "Kitchen" }, { value: "bathroom", label: "Bathroom" }, { value: "bedroom", label: "Bedroom" },
      { value: "living_area", label: "Living area" }, { value: "garage", label: "Garage" }, { value: "exterior", label: "Exterior" }, { value: "other", label: "Other area" },
    ] },
    { id: "otherAffectedArea", label: "What other area?", kind: "text", required: true, showWhen: { field: "affectedArea", includes: "other" }, placeholder: "Briefly name the area" },
    { id: "urgency", label: "How urgent is it?", kind: "single", required: true, options: [
      { value: "routine", label: "Routine" }, { value: "soon", label: "Within a few days" }, { value: "urgent", label: "Urgent" },
    ] },
    { id: "materials", label: "What about materials?", kind: "single", required: true, options: [
      { value: "available", label: "Materials are available" }, { value: "need_help", label: "Need help choosing them" }, { value: "not_needed", label: "No materials needed" },
    ] },
    { id: "photosAvailable", label: "Are photos available?", kind: "single", required: true, options: yesNo },
  ] },
  { id: "childcare", broadType: "home_help", label: "Childcare", shortLabel: "Childcare", isService: true, questions: [
    { id: "childCount", label: "How many children?", kind: "quantity", required: true, min: 1, max: 12 },
    { id: "ageGroups", label: "What are their ages?", helper: "Select all that apply", kind: "multi", required: true, options: [
      { value: "infant", label: "Infant" }, { value: "toddler", label: "Toddler" }, { value: "preschool", label: "Preschool" },
      { value: "school_age", label: "School age" }, { value: "teen", label: "Teen" },
    ] },
    { id: "requestedTimes", label: "What kind of time is needed?", kind: "multi", required: true, options: [
      { value: "daytime", label: "Daytime" }, { value: "evening", label: "Evening" }, { value: "overnight", label: "Overnight" },
      { value: "school_pickup", label: "School pickup" }, { value: "weekend", label: "Weekend" },
    ] },
    { id: "careLocation", label: "Where should care happen?", kind: "single", required: true, options: [
      { value: "requester_home", label: "Our home" }, { value: "provider_home", label: "Caregiver's home" }, { value: "flexible", label: "Flexible" },
    ] },
    { id: "careRequirements", label: "Relevant care needs", kind: "multi", options: [
      { value: "meals", label: "Meals" }, { value: "homework", label: "Homework" }, { value: "bedtime", label: "Bedtime" },
      { value: "transportation", label: "Transportation" }, { value: "accessibility", label: "Accessibility support" }, { value: "other", label: "Other requirement" },
    ] },
    { id: "otherCareRequirement", label: "What other care requirement?", kind: "text", required: true, showWhen: { field: "careRequirements", includes: "other" }, placeholder: "Briefly explain" },
  ] },
  { id: "pet_care", broadType: "home_help", label: "Pet care or pet sitting", shortLabel: "Pet care", isService: true, questions: [
    { id: "animalTypes", label: "What kind of animals?", kind: "multi", required: true, options: [
      { value: "dog", label: "Dog" }, { value: "cat", label: "Cat" }, { value: "bird", label: "Bird" },
      { value: "small_animal", label: "Small animal" }, { value: "other", label: "Other animal" },
    ] },
    { id: "otherAnimal", label: "What kind of animal?", kind: "text", required: true, showWhen: { field: "animalTypes", includes: "other" }, placeholder: "Briefly name the animal" },
    { id: "animalCount", label: "How many animals?", kind: "quantity", required: true, min: 1, max: 20 },
    { id: "petCareType", label: "What care is needed?", kind: "multi", required: true, options: [
      { value: "walking", label: "Walking" }, { value: "drop_in", label: "Drop-in visit" }, { value: "feeding", label: "Feeding" },
      { value: "overnight", label: "Overnight sitting" }, { value: "boarding", label: "Boarding" }, { value: "transport", label: "Transportation" }, { value: "other", label: "Other care" },
    ] },
    { id: "otherPetCare", label: "What other care?", kind: "text", required: true, showWhen: { field: "petCareType", includes: "other" }, placeholder: "Briefly explain" },
    { id: "petCareLocation", label: "Where should care happen?", kind: "single", required: true, options: [
      { value: "requester_home", label: "At our home" }, { value: "provider_home", label: "At the caregiver's home" }, { value: "flexible", label: "Flexible" },
    ] },
    { id: "feedingMedication", label: "Feeding or medication needs?", kind: "single", required: true, options: [
      { value: "none", label: "None" }, { value: "feeding", label: "Feeding instructions" }, { value: "medication", label: "Medication" }, { value: "both", label: "Both" },
    ] },
    { id: "petInstructions", label: "What should the caregiver know?", kind: "text", required: true, showWhen: { field: "feedingMedication", oneOf: ["feeding", "medication", "both"] }, placeholder: "Brief feeding or medication instructions" },
  ] },
  { id: "yard_work", broadType: "home_help", label: "Yard work", shortLabel: "Yard work", isService: true, questions: [
    { id: "yardTasks", label: "What work is needed?", kind: "multi", required: true, options: [
      { value: "mowing", label: "Mowing" }, { value: "weeding", label: "Weeding" }, { value: "leaf_cleanup", label: "Leaf cleanup" },
      { value: "trimming", label: "Trimming" }, { value: "planting", label: "Planting" }, { value: "snow", label: "Snow removal" }, { value: "other", label: "Other task" },
    ] },
    { id: "otherYardTask", label: "What other yard task?", kind: "text", required: true, showWhen: { field: "yardTasks", includes: "other" }, placeholder: "Briefly explain" },
    { id: "workArea", label: "Approximate work area", kind: "single", required: true, options: [
      { value: "small", label: "Small area" }, { value: "medium", label: "Average yard" }, { value: "large", label: "Large area" }, { value: "unsure", label: "Not sure" },
    ] },
    { id: "yardTools", label: "What tools are available?", kind: "single", required: true, options: [
      { value: "available", label: "Tools are available" }, { value: "bring_tools", label: "Please bring tools" }, { value: "mix", label: "Some are available" },
    ] },
    { id: "debrisRemoval", label: "Should debris be removed?", kind: "single", required: true, options: yesNo },
  ] },
  { id: "elderly_care", broadType: "home_help", label: "Elderly care", shortLabel: "Elderly care", isService: true, questions: [
    { id: "assistanceTypes", label: "What assistance is needed?", kind: "multi", required: true, options: [
      { value: "companionship", label: "Companionship" }, { value: "meal_help", label: "Meal help" }, { value: "errands", label: "Errands" },
      { value: "household_tasks", label: "Household tasks" }, { value: "appointment_support", label: "Appointment support" },
      { value: "respite", label: "Family respite" }, { value: "other", label: "Other assistance" },
    ] },
    { id: "otherAssistance", label: "What other assistance?", kind: "text", required: true, showWhen: { field: "assistanceTypes", includes: "other" }, placeholder: "Briefly explain" },
    { id: "careSchedule", label: "What length of help is expected?", kind: "single", required: true, options: [
      { value: "few_hours", label: "A few hours" }, { value: "half_day", label: "Half day" }, { value: "full_day", label: "Full day" },
      { value: "overnight", label: "Overnight" }, { value: "flexible", label: "Flexible" },
    ] },
    { id: "mobilityNeeds", label: "Any mobility or accessibility needs?", kind: "single", required: true, options: yesNo },
    { id: "accessibilityNotes", label: "What support is needed?", kind: "text", required: true, showWhen: { field: "mobilityNeeds", equals: "yes" }, placeholder: "Briefly explain the access or mobility need" },
    { id: "transportationNeeded", label: "Is transportation part of the request?", kind: "single", required: true, options: yesNo },
  ] },
  { id: "household_helping_hands", broadType: "home_help", label: "Household helping hands", shortLabel: "Helping hands", isService: true, questions: [
    { id: "helpingTasks", label: "What kind of help?", kind: "multi", required: true, options: [
      { value: "moving", label: "Moving things" }, { value: "organizing", label: "Organizing" }, { value: "errands", label: "Errands" },
      { value: "lifting", label: "Lifting" }, { value: "delivery", label: "Pickup or delivery" }, { value: "setup", label: "Setup" },
      { value: "cleanup", label: "Cleanup" }, { value: "other", label: "Other help" },
    ] },
    { id: "otherHelpingTask", label: "What other help?", kind: "text", required: true, showWhen: { field: "helpingTasks", includes: "other" }, placeholder: "Briefly explain" },
    { id: "peopleNeeded", label: "How many helping hands?", kind: "quantity", required: true, min: 1, max: 12 },
    { id: "liftingRequired", label: "Is lifting involved?", kind: "single", required: true, options: yesNo },
    { id: "householdTools", label: "Are the needed supplies or tools available?", kind: "single", required: true, options: [
      { value: "available", label: "Yes" }, { value: "bring", label: "Please bring them" }, { value: "not_needed", label: "Not needed" },
    ] },
  ] },
  { id: "other_home_help", broadType: "home_help", label: "Other home help", shortLabel: "Other home help", isService: true, questions: [
    { id: "homeHelpName", label: "What kind of home help?", kind: "text", required: true, placeholder: "Briefly name the help you need" },
    { id: "homeHelpScope", label: "How large is the task?", kind: "single", required: true, options: [
      { value: "small", label: "Small task" }, { value: "medium", label: "A few hours" }, { value: "large", label: "Larger project" }, { value: "unsure", label: "Not sure" },
    ] },
    { id: "homeHelpTools", label: "Are tools or supplies available?", kind: "single", required: true, options: [
      { value: "available", label: "Yes" }, { value: "bring", label: "Please bring them" }, { value: "not_needed", label: "Not needed" },
    ] },
  ] },
  { id: "items", broadType: "items", label: "Items", shortLabel: "Items", isService: false, questions: [
    { id: "itemAction", label: "What would you like to do?", kind: "single", required: true, options: [
      { value: "borrow", label: "Borrow" }, { value: "receive", label: "Receive" }, { value: "buy", label: "Buy" },
      { value: "rent", label: "Rent" }, { value: "trade", label: "Trade" },
    ] },
    { id: "itemCategory", label: "What kind of item?", kind: "single", required: true, options: [
      { value: "tools", label: "Tools" }, { value: "furniture", label: "Furniture" }, { value: "kitchen", label: "Kitchen item" },
      { value: "baby_kids", label: "Baby or kids item" }, { value: "yard", label: "Yard item" }, { value: "transportation", label: "Transportation item" }, { value: "other", label: "Other item" },
    ] },
    { id: "otherItemCategory", label: "What kind of item category?", kind: "text", required: true, showWhen: { field: "itemCategory", equals: "other" }, placeholder: "Briefly name the item category" },
    { id: "itemName", label: "What item do you need?", kind: "text", required: true, placeholder: "For example, a folding table" },
    { id: "quantity", label: "How many?", kind: "quantity", required: true, min: 1, max: 100 },
    { id: "acceptableCondition", label: "Acceptable condition", kind: "single", required: true, options: [
      { value: "any", label: "Any usable condition" }, { value: "good", label: "Good condition" }, { value: "like_new", label: "Like new" }, { value: "new", label: "New" },
    ] },
    { id: "itemFulfillment", label: "Pickup or delivery?", kind: "single", required: true, options: [
      { value: "pickup", label: "I can pick it up" }, { value: "delivery", label: "Delivery needed" }, { value: "either", label: "Either works" },
    ] },
  ] },
  { id: "information", broadType: "information", label: "Information", shortLabel: "Information", isService: false, questions: [
    { id: "informationType", label: "What kind of information?", kind: "single", required: true, options: [
      { value: "recommendation", label: "Recommendation" }, { value: "local_guidance", label: "Local guidance" }, { value: "how_to", label: "How-to information" },
      { value: "connection", label: "The right connection" }, { value: "contact", label: "Contact information" }, { value: "other", label: "Other information" },
    ] },
    { id: "otherInformationType", label: "What kind of information?", kind: "text", required: true, showWhen: { field: "informationType", equals: "other" }, placeholder: "Briefly name the kind of information" },
    { id: "informationTopic", label: "What do you want to know?", kind: "text", required: true, placeholder: "Briefly name the information or recommendation" },
    { id: "locationSpecific", label: "Is this location-specific?", kind: "single", required: true, options: yesNo },
  ] },
  { id: "other_request", broadType: "other_request", label: "Other request", shortLabel: "Other request", isService: false, questions: [
    { id: "otherCategory", label: "What is this request about?", kind: "text", required: true, placeholder: "Briefly name the kind of request" },
    { id: "otherRequestType", label: "What are you looking for?", kind: "single", required: true, options: [
      { value: "help", label: "Help with a task" }, { value: "item", label: "An item" }, { value: "information", label: "Information" },
      { value: "exchange", label: "A trade or exchange" }, { value: "other", label: "Something else" },
    ] },
    { id: "otherRequestTypeDetails", label: "What kind of request is it?", kind: "text", required: true, showWhen: { field: "otherRequestType", equals: "other" }, placeholder: "Briefly explain the request type" },
    { id: "locationRelevant", label: "Does location matter?", kind: "single", required: true, options: yesNo },
  ] },
] as const;

export type RequestCategoryId = (typeof requestCategories)[number]["id"];
export type RequestAnswer = string | number | boolean | string[] | null;

export type RequestDraft = {
  schemaVersion: typeof REQUEST_SCHEMA_VERSION;
  broadType: RequestBroadTypeId | "";
  categoryId: RequestCategoryId | "";
  subcategoryId: string | null;
  answers: Record<string, RequestAnswer>;
  serviceIntent: ServiceIntent | null;
  timingPreference: "specific_date" | "date_range" | "within_week" | "as_soon_as_possible" | "flexible";
  requestedDate: string;
  requestedDateEnd: string;
  timeWindows: string[];
  cadenceFrequency: string;
  cadenceDays: string[];
  cadenceTimeWindows: string[];
  desiredStartPeriod: string;
  scheduleFlexibility: string;
  city: string;
  state: string;
  additionalDetails: string;
};

export type StructuredRequestRecord = {
  id: string;
  post_type: "request";
  owner_state: "active" | "paused" | "closed" | "removed";
  title: string;
  category: string | null;
  city: string | null;
  state: string | null;
  description: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  request_schema_version: number | null;
  request_broad_type: string | null;
  request_category_id: string | null;
  request_subcategory_id: string | null;
  request_answers: Record<string, RequestAnswer> | null;
  service_intent: ServiceIntent | null;
  timing_preference: RequestDraft["timingPreference"] | null;
  requested_date: string | null;
  requested_date_end: string | null;
  time_windows: string[] | null;
  cadence_frequency: string | null;
  cadence_days: string[] | null;
  cadence_time_windows: string[] | null;
  desired_start_period: string | null;
  schedule_flexibility: string | null;
  generated_summary: string | null;
  request_status: RequestStatus | null;
  workflow_status: RequestWorkflowStatus | null;
};

export const homeHelpCategories = requestCategories.filter((category) => category.broadType === "home_help");
export const timeWindowOptions = [
  { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" }, { value: "flexible", label: "Flexible" },
] as const;
export const weekdayOptions = [
  { value: "monday", label: "Mon" }, { value: "tuesday", label: "Tue" }, { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" }, { value: "friday", label: "Fri" }, { value: "saturday", label: "Sat" }, { value: "sunday", label: "Sun" },
] as const;
export const cadenceFrequencyOptions = [
  { value: "weekly", label: "Every week" }, { value: "every_other_week", label: "Every other week" },
  { value: "monthly", label: "Monthly" }, { value: "custom", label: "Another pattern" },
] as const;

export function getBroadType(id: string | null | undefined) {
  return broadRequestTypes.find((type) => type.id === id) || null;
}

export function getRequestCategory(id: string | null | undefined) {
  return requestCategories.find((category) => category.id === id) || null;
}

export function createEmptyRequestDraft(options: { broadType?: string; categoryId?: string; city?: string | null; state?: string | null } = {}): RequestDraft {
  const broad = getBroadType(options.broadType) ? options.broadType as RequestBroadTypeId : "";
  const directCategory = getRequestCategory(options.categoryId);
  const categoryFromBroad = broad && broad !== "home_help" ? requestCategories.find((entry) => entry.broadType === broad) : null;
  const category = directCategory || categoryFromBroad || null;
  const quantityDefaults = Object.fromEntries(
    (category?.questions || [])
      .filter((question) => question.kind === "quantity")
      .map((question) => [question.id, question.min ?? 0]),
  );
  return {
    schemaVersion: REQUEST_SCHEMA_VERSION,
    broadType: category?.broadType || broad,
    categoryId: (category?.id as RequestCategoryId) || "",
    subcategoryId: null,
    answers: quantityDefaults,
    serviceIntent: null,
    timingPreference: "flexible",
    requestedDate: "",
    requestedDateEnd: "",
    timeWindows: [],
    cadenceFrequency: "",
    cadenceDays: [],
    cadenceTimeWindows: [],
    desiredStartPeriod: "",
    scheduleFlexibility: "",
    city: options.city || "",
    state: options.state || "IL",
    additionalDetails: "",
  };
}

function stringValue(value: unknown, maximum = 240) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function stringList(value: unknown, allowed?: readonly Choice[], maximum = 20) {
  if (!Array.isArray(value)) return [];
  const allowedValues = allowed ? new Set(allowed.map((option) => option.value)) : null;
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string" && (!allowedValues || allowedValues.has(entry))).slice(0, maximum)));
}

export function parseRequestDraft(value: unknown): RequestDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The request details are invalid.");
  const input = value as Record<string, unknown>;
  const broadType = stringValue(input.broadType, 40);
  const categoryId = stringValue(input.categoryId, 80);
  const category = getRequestCategory(categoryId);
  const broad = getBroadType(broadType);
  if (!category || !broad || category.broadType !== broad.id) throw new Error("Choose one valid request category.");
  const rawAnswers = input.answers && typeof input.answers === "object" && !Array.isArray(input.answers)
    ? input.answers as Record<string, unknown>
    : {};
  const answers: Record<string, RequestAnswer> = {};
  for (const question of category.questions) {
    const answer = rawAnswers[question.id];
    if (question.kind === "quantity") {
      const parsed = typeof answer === "number" ? answer : Number(answer);
      if (Number.isFinite(parsed)) answers[question.id] = Math.min(question.max ?? 99, Math.max(question.min ?? 0, Math.round(parsed)));
    } else if (question.kind === "multi") {
      answers[question.id] = stringList(answer, question.options);
    } else if (question.kind === "single") {
      const next = stringValue(answer, 120);
      if (question.options?.some((option) => option.value === next)) answers[question.id] = next;
    } else {
      const next = stringValue(answer, 500);
      if (next) answers[question.id] = next;
    }
  }
  const intent = stringValue(input.serviceIntent, 20);
  const timing = stringValue(input.timingPreference, 40);
  const allowedTiming: RequestDraft["timingPreference"][] = ["specific_date", "date_range", "within_week", "as_soon_as_possible", "flexible"];
  const draft: RequestDraft = {
    schemaVersion: REQUEST_SCHEMA_VERSION,
    broadType: broad.id,
    categoryId: category.id as RequestCategoryId,
    subcategoryId: null,
    answers,
    serviceIntent: category.isService && (intent === "one_time" || intent === "ongoing") ? intent : null,
    timingPreference: allowedTiming.includes(timing as RequestDraft["timingPreference"]) ? timing as RequestDraft["timingPreference"] : "flexible",
    requestedDate: stringValue(input.requestedDate, 10),
    requestedDateEnd: stringValue(input.requestedDateEnd, 10),
    timeWindows: stringList(input.timeWindows, timeWindowOptions),
    cadenceFrequency: stringValue(input.cadenceFrequency, 40),
    cadenceDays: stringList(input.cadenceDays, weekdayOptions, 7),
    cadenceTimeWindows: stringList(input.cadenceTimeWindows, timeWindowOptions, 4),
    desiredStartPeriod: stringValue(input.desiredStartPeriod, 60),
    scheduleFlexibility: stringValue(input.scheduleFlexibility, 60),
    city: stringValue(input.city, 120),
    state: stringValue(input.state, 2).toUpperCase(),
    additionalDetails: stringValue(input.additionalDetails, 1200),
  };
  if (draft.cadenceFrequency && !cadenceFrequencyOptions.some((option) => option.value === draft.cadenceFrequency)) draft.cadenceFrequency = "";
  const errors = validateRequestDraft(draft, "all");
  if (errors.length) throw new Error(errors[0]);
  return draft;
}

export function isQuestionVisible(question: RequestQuestion, answers: RequestDraft["answers"]) {
  if (!question.showWhen) return true;
  const current = answers[question.showWhen.field];
  if (question.showWhen.includes) return Array.isArray(current) && current.includes(question.showWhen.includes);
  if (question.showWhen.oneOf) return question.showWhen.oneOf.includes(current as string | number | boolean);
  return current === question.showWhen.equals;
}

function hasAnswer(value: RequestAnswer | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "boolean" || (typeof value === "string" && value.trim().length > 0);
}

export function validateRequestDraft(draft: RequestDraft, through: "type" | "details" | "timing" | "all" = "all") {
  const errors: string[] = [];
  const category = getRequestCategory(draft.categoryId);
  if (!getBroadType(draft.broadType)) errors.push("Choose what kind of request this is.");
  if (!category || category.broadType !== draft.broadType) errors.push("Choose one request category.");
  if (through === "type") return errors;

  if (category) {
    for (const question of category.questions) {
      if (question.required && isQuestionVisible(question, draft.answers) && !hasAnswer(draft.answers[question.id])) {
        errors.push(`Answer “${question.label}”.`);
      }
    }
  }
  if (through === "details") return errors;

  if (category?.isService && !draft.serviceIntent) errors.push("Choose one-time help or ongoing help.");
  if (category?.isService && draft.serviceIntent === "ongoing") {
    if (!draft.cadenceFrequency) errors.push("Choose how often you would like help.");
    if (!draft.cadenceDays.length) errors.push("Choose at least one preferred day.");
    if (!draft.cadenceTimeWindows.length) errors.push("Choose at least one preferred time window.");
    if (!draft.desiredStartPeriod) errors.push("Choose when you would like the arrangement to start.");
    if (!draft.scheduleFlexibility) errors.push("Choose how flexible the schedule can be.");
  } else if (draft.timingPreference === "specific_date" && !draft.requestedDate) {
    errors.push("Choose the requested date.");
  } else if (draft.timingPreference === "date_range" && (!draft.requestedDate || !draft.requestedDateEnd)) {
    errors.push("Choose the beginning and end of the date range.");
  }
  if (draft.requestedDate && draft.requestedDateEnd && draft.requestedDateEnd < draft.requestedDate) {
    errors.push("The end date must be on or after the beginning date.");
  }
  const locationRequired = draft.categoryId === "information"
    ? draft.answers.locationSpecific === "yes"
    : draft.categoryId === "other_request"
      ? draft.answers.locationRelevant === "yes"
      : true;
  if (locationRequired && !draft.city.trim()) errors.push("Add the town or city.");
  if (locationRequired && !draft.state.trim()) errors.push("Add the state.");
  return errors;
}

function choiceLabel(questionId: string, value: RequestAnswer | undefined, category: RequestCategoryDefinition | null) {
  const question = category?.questions.find((entry) => entry.id === questionId);
  const option = question?.options?.find((entry) => entry.value === value);
  return option?.label || (typeof value === "string" ? value : "");
}

function choiceLabels(questionId: string, value: RequestAnswer | undefined, category: RequestCategoryDefinition | null) {
  if (!Array.isArray(value)) return [];
  const question = category?.questions.find((entry) => entry.id === questionId);
  return value.map((answer) => question?.options?.find((entry) => entry.value === answer)?.label || answer);
}

function naturalList(values: string[]) {
  if (values.length < 2) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function dateLabel(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export function requestTimingLabel(draft: RequestDraft) {
  if (draft.serviceIntent === "ongoing") {
    const frequency = cadenceFrequencyOptions.find((entry) => entry.value === draft.cadenceFrequency)?.label || "Ongoing";
    const days = draft.cadenceDays.map((day) => day.charAt(0).toUpperCase() + day.slice(1)).join(", ");
    const windows = draft.cadenceTimeWindows.map((window) => timeWindowOptions.find((entry) => entry.value === window)?.label || window).join(", ");
    return [frequency, days, windows].filter(Boolean).join(" · ");
  }
  const windows = draft.timeWindows.map((window) => timeWindowOptions.find((entry) => entry.value === window)?.label || window).join(", ");
  let timing = "Flexible timing";
  if (draft.timingPreference === "specific_date") timing = dateLabel(draft.requestedDate);
  else if (draft.timingPreference === "date_range") timing = `${dateLabel(draft.requestedDate)}–${dateLabel(draft.requestedDateEnd)}`;
  else if (draft.timingPreference === "within_week") timing = "Within a week";
  else if (draft.timingPreference === "as_soon_as_possible") timing = "As soon as possible";
  return [timing, windows].filter(Boolean).join(" · ");
}

function ongoingTitleTiming(draft: RequestDraft) {
  const days = draft.cadenceDays.map((day) => day.charAt(0).toUpperCase() + day.slice(1));
  const windows = draft.cadenceTimeWindows.map((window) => timeWindowOptions.find((entry) => entry.value === window)?.label.toLowerCase() || window);
  const dayText = naturalList(days);
  const windowText = naturalList(windows);
  if (draft.cadenceFrequency === "every_other_week" && days.length === 1) return `every other ${dayText}${windowText ? ` ${windowText}` : ""}`;
  if (draft.cadenceFrequency === "weekly" && days.length === 1) return `every ${dayText}${windowText ? ` ${windowText}` : ""}`;
  const frequency = cadenceFrequencyOptions.find((entry) => entry.value === draft.cadenceFrequency)?.label.toLowerCase() || "ongoing";
  return [frequency, dayText ? `on ${dayText}` : "", windowText].filter(Boolean).join(" ");
}

export function generateRequestContent(draft: RequestDraft) {
  const category = getRequestCategory(draft.categoryId);
  if (!category) return { title: "Local request", summary: draft.additionalDetails || "A local request." };
  const timing = requestTimingLabel(draft);
  const ongoing = draft.serviceIntent === "ongoing";
  let title = `${category.label} needed`;
  let summary = `Looking for ${ongoing ? "ongoing" : "one-time"} ${category.label.toLowerCase()} help${timing ? ` with ${timing.toLowerCase()}` : ""}.`;

  if (category.id === "cleaning") {
    const cleaningType = choiceLabel("cleaningType", draft.answers.cleaningType, category) || "Cleaning";
    const selectedAreas = choiceLabels("areas", draft.answers.areas, category);
    const areas = draft.answers.cleaningScope === "whole_home" ? ["the whole home"] : selectedAreas;
    const bathroomCount = Number(draft.answers.bathrooms || 0);
    const bedroomCount = Number(draft.answers.bedrooms || 0);
    const placeParts = [...areas.filter((area) => area !== "Bathrooms" && area !== "Bedrooms")];
    if (bathroomCount > 0) placeParts.push(`${bathroomCount} ${bathroomCount === 1 ? "bathroom" : "bathrooms"}`);
    if (bedroomCount > 0) placeParts.push(`${bedroomCount} ${bedroomCount === 1 ? "bedroom" : "bedrooms"}`);
    if (draft.answers.cleaningType === "specific_task") {
      const task = draft.answers.specificTask === "other" ? String(draft.answers.otherSpecificTask || "Specific cleaning task") : choiceLabel("specificTask", draft.answers.specificTask, category);
      title = `${task || "Specific cleaning task"} help needed`;
      summary = `Looking for help with ${String(task || "a specific cleaning task").toLowerCase()}.`;
    } else {
      title = ongoing ? `${cleaningType} ${ongoingTitleTiming(draft)}` : `${cleaningType} needed${draft.requestedDate ? ` ${dateLabel(draft.requestedDate)}` : ""}`;
      summary = `${cleaningType} needed${placeParts.length ? ` for ${naturalList(placeParts.map((part) => part.toLowerCase()))}` : ""}.`;
    }
    summary += ` Cleaning supplies are ${draft.answers.suppliesAvailable === "yes" ? "available at the home" : "not available at the home"}.`;
    if (draft.answers.petsInHome === "yes") summary += " There are pets in the home.";
  } else if (category.id === "meals") {
    const mealType = choiceLabel("mealType", draft.answers.mealType, category) || "Meal help";
    const people = Number(draft.answers.peopleCount || 1);
    title = `${mealType}${ongoing ? ` ${ongoingTitleTiming(draft)}` : " needed"}`;
    summary = `${mealType} requested for ${people} ${people === 1 ? "person" : "people"}.`;
    const needs = choiceLabels("dietaryNeeds", draft.answers.dietaryNeeds, category).filter((entry) => entry !== "No dietary restrictions");
    if (needs.length) summary += ` Dietary needs: ${naturalList(needs)}.`;
    if (draft.answers.hasAllergies === "yes") summary += ` Allergy information: ${String(draft.answers.allergyDetails || "provided")}.`;
    summary += ` Pickup or delivery: ${choiceLabel("mealFulfillment", draft.answers.mealFulfillment, category).toLowerCase() || "can be arranged"}.`;
  } else if (category.id === "items") {
    const action = choiceLabel("itemAction", draft.answers.itemAction, category) || "Find";
    const item = String(draft.answers.itemName || "an item");
    title = `${action} ${item}`;
    summary = `Looking to ${action.toLowerCase()} ${Number(draft.answers.quantity || 1)} ${item}. ${choiceLabel("acceptableCondition", draft.answers.acceptableCondition, category)}. ${choiceLabel("itemFulfillment", draft.answers.itemFulfillment, category)}.`;
  } else if (category.id === "information") {
    const topic = String(draft.answers.informationTopic || "local information");
    title = `${choiceLabel("informationType", draft.answers.informationType, category) || "Information"}: ${topic}`;
    summary = `Looking for ${choiceLabel("informationType", draft.answers.informationType, category).toLowerCase() || "information"} about ${topic}.`;
    if (draft.answers.locationSpecific === "yes") summary += ` The request is specific to ${[draft.city, draft.state].filter(Boolean).join(", ")}.`;
  } else if (category.id === "other_request") {
    const subject = String(draft.answers.otherCategory || "Local request");
    title = subject;
    summary = `${choiceLabel("otherRequestType", draft.answers.otherRequestType, category) || "Request"}: ${subject}.`;
  } else if (category.id === "other_home_help") {
    const subject = String(draft.answers.homeHelpName || category.label);
    title = `${subject} needed`;
    summary = `Looking for ${ongoing ? "ongoing" : "one-time"} help with ${subject.toLowerCase()}.`;
  } else {
    const firstQuestion = category.questions[0];
    const primary = choiceLabel(firstQuestion.id, draft.answers[firstQuestion.id], category) || category.label;
    title = `${primary} help needed`;
    summary = `Looking for ${ongoing ? "ongoing" : "one-time"} ${category.label.toLowerCase()} help. ${firstQuestion.label} ${primary}.`;
  }

  if (draft.serviceIntent === "ongoing") summary += ` Preferred arrangement: ${timing}.`;
  else if (timing) summary += ` Preferred timing: ${timing}.`;
  const location = [draft.city, draft.state].filter(Boolean).join(", ");
  if (location && !(category.id === "information" && draft.answers.locationSpecific !== "yes")) summary += ` Location: ${location}.`;
  if (draft.additionalDetails.trim()) summary += ` ${draft.additionalDetails.trim()}`;
  return { title: title.slice(0, 180), summary: summary.replace(/\s+/g, " ").trim().slice(0, 5000) };
}

export function requestDraftFromRecord(record: StructuredRequestRecord): RequestDraft | null {
  const category = getRequestCategory(record.request_category_id);
  const broadType = getBroadType(record.request_broad_type);
  if (!record.request_schema_version || !category || !broadType || category.broadType !== broadType.id) return null;
  const storedAnswers = { ...(record.request_answers || {}) };
  const additionalDetails = typeof storedAnswers.additionalDetails === "string" ? storedAnswers.additionalDetails : "";
  delete storedAnswers.additionalDetails;
  return {
    schemaVersion: REQUEST_SCHEMA_VERSION,
    broadType: broadType.id,
    categoryId: category.id as RequestCategoryId,
    subcategoryId: record.request_subcategory_id,
    answers: storedAnswers,
    serviceIntent: record.service_intent,
    timingPreference: record.timing_preference || "flexible",
    requestedDate: record.requested_date || "",
    requestedDateEnd: record.requested_date_end || "",
    timeWindows: record.time_windows || [],
    cadenceFrequency: record.cadence_frequency || "",
    cadenceDays: record.cadence_days || [],
    cadenceTimeWindows: record.cadence_time_windows || [],
    desiredStartPeriod: record.desired_start_period || "",
    scheduleFlexibility: record.schedule_flexibility || "",
    city: record.city || "",
    state: record.state || "",
    additionalDetails,
  };
}

export function requestDatabasePayload(draft: RequestDraft) {
  const category = getRequestCategory(draft.categoryId);
  if (!category) throw new Error("Choose one request category.");
  const generated = generateRequestContent(draft);
  return {
    title: generated.title,
    category: category.label,
    description: generated.summary,
    city: draft.city.trim() || null,
    state: draft.state.trim().toUpperCase() || null,
    request_schema_version: REQUEST_SCHEMA_VERSION,
    request_broad_type: draft.broadType,
    request_category_id: category.id,
    request_subcategory_id: typeof draft.answers[category.questions[0]?.id] === "string" ? draft.answers[category.questions[0].id] as string : draft.subcategoryId || null,
    request_answers: { ...draft.answers, additionalDetails: draft.additionalDetails.trim() },
    service_intent: category.isService ? draft.serviceIntent : null,
    timing_preference: draft.timingPreference,
    requested_date: draft.requestedDate || null,
    requested_date_end: draft.requestedDateEnd || null,
    time_windows: draft.timeWindows,
    cadence_frequency: draft.serviceIntent === "ongoing" ? draft.cadenceFrequency : null,
    cadence_days: draft.serviceIntent === "ongoing" ? draft.cadenceDays : [],
    cadence_time_windows: draft.serviceIntent === "ongoing" ? draft.cadenceTimeWindows : [],
    desired_start_period: draft.serviceIntent === "ongoing" ? draft.desiredStartPeriod : null,
    schedule_flexibility: draft.serviceIntent === "ongoing" ? draft.scheduleFlexibility : null,
    generated_summary: generated.summary,
    request_status: "open" as const,
    workflow_status: "finding_right_person" as const,
  };
}

const moderationLabels = { pending: "In review", reviewed: "Reviewed", approved: "Active", rejected: "Needs changes" } as const;
const workflowLabels: Record<RequestWorkflowStatus, string> = {
  finding_right_person: "Finding the right person",
  first_service_scheduled: "First service scheduled",
  waiting_compatibility_decision: "Waiting for compatibility decision",
  trying_another_provider: "Trying another provider",
  ongoing_relationship_established: "Ongoing relationship established",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function requestDisplayStatus(record: Pick<StructuredRequestRecord, "status" | "owner_state" | "workflow_status">) {
  if (record.owner_state === "closed" || record.workflow_status === "closed") return "Closed";
  if (record.owner_state === "removed" || record.workflow_status === "cancelled") return "Cancelled";
  if (record.owner_state === "paused") return "Paused";
  if (record.status !== "approved") return moderationLabels[record.status];
  return record.workflow_status ? workflowLabels[record.workflow_status] : "Active";
}

export function requestNextStep(record: Pick<StructuredRequestRecord, "status" | "owner_state" | "workflow_status">) {
  if (record.owner_state === "closed" || record.owner_state === "removed") return "No next step";
  if (record.status === "pending" || record.status === "reviewed") return "Waiting for review";
  if (record.status === "rejected") return "Review the requested changes";
  switch (record.workflow_status) {
    case "first_service_scheduled": return "Prepare for the first service";
    case "waiting_compatibility_decision": return "Decide whether the fit is right";
    case "trying_another_provider": return "Keep the request open";
    case "ongoing_relationship_established": return "Manage the ongoing relationship";
    case "closed":
    case "cancelled": return "No next step";
    default: return "Connector is helping with next steps";
  }
}

export function recordTimingLabel(record: StructuredRequestRecord) {
  const draft = requestDraftFromRecord(record);
  if (draft) return requestTimingLabel(draft);
  return record.requested_date ? dateLabel(record.requested_date) : "Timing not structured";
}

export function isStructuredRequest(record: Pick<StructuredRequestRecord, "request_schema_version" | "request_category_id">) {
  return Boolean(record.request_schema_version && getRequestCategory(record.request_category_id));
}
