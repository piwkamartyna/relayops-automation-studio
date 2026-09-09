const processedEvents = new Set();

function validateEvent(event) {
  const required = [
    event.event_id,
    event.idempotency_key,
    event.event_type,
    event.contact?.email,
    event.company?.name
  ];

  if (required.some(value => !value)) {
    throw new Error("VALIDATION_ERROR: required field missing");
  }
}

function calculateScore(signals) {
  return Object.values(signals).reduce((total, value) => total + value, 0);
}

async function retry(operation, maxAttempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (!error.transient || attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** (attempt - 1) * 250));
    }
  }

  throw lastError;
}

export async function handleLeadEvent(event, adapters) {
  validateEvent(event);

  if (processedEvents.has(event.idempotency_key)) {
    return { status: "skipped", reason: "duplicate_event" };
  }

  const company = await retry(() => adapters.enrichment.lookup(event.company.name));
  const score = calculateScore(event.signals);
  const route = score >= 70 ? "priority" : "nurture";

  await adapters.crm.upsert({ ...event, company, score, route, rule_version: "1.0.0" });

  if (route === "priority") {
    await adapters.slack.sendPriorityAlert({ event, company, score });
    await adapters.tasks.createOwnerTask({ event, due_in_minutes: 30 });
  } else if (event.contact.consent) {
    await adapters.email.startNurtureSequence(event.contact);
  }

  processedEvents.add(event.idempotency_key);
  return { status: "completed", route, score };
}
