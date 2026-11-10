export const firstUnansweredIndex = (nominations, choices) =>
  nominations.findIndex((nomination) => choices[nomination.id] == null);

export const unansweredCount = (nominations, choices) =>
  nominations.reduce((count, nomination) => count + Number(choices[nomination.id] == null), 0);
