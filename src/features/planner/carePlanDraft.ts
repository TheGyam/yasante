import type { CarePlan, CarePlanDraft, CarePlanFrequency, TimeOfDay } from './types';

/** What the form holds while it's being filled in: steps are plain text, blanks allowed. */
export interface PlanForm {
  name: string;
  frequency: CarePlanFrequency;
  specificDays: number[];
  timeOfDay: TimeOfDay;
  remindersOn: boolean;
  steps: string[];
}

export function formFromPlan(plan?: CarePlan): PlanForm {
  return {
    name: plan?.name ?? '',
    frequency: plan?.frequency ?? 'weekly',
    specificDays: plan?.specificDays ?? [],
    timeOfDay: plan?.timeOfDay ?? 'evening',
    remindersOn: plan?.remindersOn ?? false,
    // One empty line to type into, so a new plan isn't a blank wall.
    steps: plan?.steps.length ? plan.steps.map(step => step.text) : [''],
  };
}

/** Field errors, keyed by field. Empty when the form can be saved. */
export function validatePlan(form: PlanForm): Partial<Record<keyof PlanForm, string>> {
  const errors: Partial<Record<keyof PlanForm, string>> = {};
  if (!form.name.trim()) errors.name = 'Give your plan a name';
  if (form.frequency === 'specific-days' && form.specificDays.length === 0)
    errors.specificDays = 'Pick at least one day';
  if (!form.steps.some(step => step.trim())) errors.steps = 'Add at least one step';
  return errors;
}

export function planFromForm(form: PlanForm): CarePlanDraft {
  return {
    name: form.name.trim(),
    frequency: form.frequency,
    // Days only mean anything for that one frequency; anything else drops them.
    specificDays: form.frequency === 'specific-days' ? [...form.specificDays].sort() : undefined,
    timeOfDay: form.timeOfDay,
    remindersOn: form.remindersOn,
    steps: form.steps.map(step => step.trim()).filter(Boolean),
  };
}
